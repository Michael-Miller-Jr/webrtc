const KEYS = {
    enabled: "webrtcBlockerEnabled",
    theme: "webrtcBlockerTheme",
    policy: "webrtcBlockerPolicy",
    counter: "webrtcBlockerCounter",
    log: "webrtcBlockerLog",
    allowlist: "webrtcBlockerAllowlist",
    rules: "webrtcBlockerRules",
    toggles: "webrtcBlockerToggles"
};

const DEFAULT_TOGGLES = {
    webrtc: true,
    media: true,
    canvas: false,
    webgl: false,
    timezone: false
};

const MAX_LOG = 50;

async function getState() {
    const s = await chrome.storage.sync.get({
        [KEYS.enabled]: true,
        [KEYS.theme]: "auto",
        [KEYS.policy]: "disable_non_proxied_udp",
        [KEYS.allowlist]: [],
        [KEYS.rules]: "",
        [KEYS.toggles]: DEFAULT_TOGGLES
    });
    return s;
}

async function applyPolicy(enabled, policy) {
    const value = enabled ? policy : "default";
    return new Promise((resolve) => {
        chrome.privacy.network.webRTCIPHandlingPolicy.set({ value }, () => {
            if (chrome.runtime.lastError) {
                console.error("[WebRTC Blocker] policy error:", chrome.runtime.lastError);
            }
            resolve();
        });
    });
}

async function syncPolicyFromStorage() {
    const { [KEYS.enabled]: enabled, [KEYS.policy]: policy } = await getState();
    await applyPolicy(enabled, policy);
}

/* ---------------- Counter & log ---------------- */

async function incrementCounter(host, kind) {
    const { [KEYS.counter]: counter = 0 } = await chrome.storage.local.get({
        [KEYS.counter]: 0
    });
    await chrome.storage.local.set({ [KEYS.counter]: counter + 1 });

    const { [KEYS.log]: log = [] } = await chrome.storage.local.get({
        [KEYS.log]: []
    });
    log.unshift({ host, kind, ts: Date.now() });
    if (log.length > MAX_LOG) log.length = MAX_LOG;
    await chrome.storage.local.set({ [KEYS.log]: log });
}

/* ---------------- Notifications ---------------- */

const notifiedHosts = new Set();

async function notifyFirstBlock(host, kind) {
    if (notifiedHosts.has(host)) return;
    notifiedHosts.add(host);
    const { [KEYS.enabled]: enabled } = await getState();
    if (!enabled) return;
    try {
        chrome.notifications.create(`wrtcb-${host}-${Date.now()}`, {
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: "WebRTC blocked",
            message: `${kind} blocked on ${host}`,
            silent: true
        });
    } catch (e) { }
}

/* ---------------- Message handler ---------------- */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "blocked" && sender.tab?.url) {
        try {
            const host = new URL(sender.tab.url).hostname;
            incrementCounter(host, msg.kind || "webrtc");
            notifyFirstBlock(host, msg.kind || "webrtc");
        } catch (e) { }
        sendResponse({ ok: true });
    }
    if (msg?.type === "get-config") {
        getState().then((s) => {
            sendResponse({
                enabled: s[KEYS.enabled],
                allowlist: s[KEYS.allowlist],
                rules: s[KEYS.rules],
                toggles: s[KEYS.toggles]
            });
        });
        return true; // keep channel open
    }
    return false;
});

/* ---------------- Lifecycle ---------------- */

async function init() {
    await syncPolicyFromStorage();
}

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && (changes[KEYS.enabled] || changes[KEYS.policy])) {
        syncPolicyFromStorage();
    }
    // Push updated config to all tabs so they can reapply without reload
    if (area === "sync") {
        chrome.tabs.query({}, (tabs) => {
            for (const t of tabs) {
                if (!t.id) continue;
                chrome.tabs
                    .sendMessage(t.id, { type: "config-changed" })
                    .catch(() => { });
            }
        });
    }
});

/* ---------------- Keyboard shortcut ---------------- */

chrome.commands.onCommand.addListener(async (cmd) => {
    if (cmd === "toggle-blocker") {
        const { [KEYS.enabled]: enabled } = await getState();
        await chrome.storage.sync.set({ [KEYS.enabled]: !enabled });
    }
});