const KEYS = {
    enabled: "webrtcBlockerEnabled",
    counter: "webrtcBlockerCounter",
    allowlist: "webrtcBlockerAllowlist"
};

const toggle = document.getElementById("toggle");
const statusText = document.getElementById("statusText");
const indicator = document.getElementById("indicator");
const footerText = document.getElementById("footerText");
const stateChip = document.getElementById("stateChip");
const counterEl = document.getElementById("counter");
const ipValue = document.getElementById("ipValue");
const themeBtn = document.getElementById("themeToggle");
const allowBtn = document.getElementById("allowSite");
const allowLabel = document.getElementById("allowLabel");

// Theme is handled by theme.js
window.WRTCBTheme.init();

themeBtn.addEventListener("click", async () => {
    const next = await window.WRTCBTheme.cycle();
    themeBtn.title = `Theme: ${next[0].toUpperCase() + next.slice(1)} (click to cycle)`;
});

function render(enabled) {
    toggle.checked = enabled;
    if (enabled) {
        statusText.textContent = "Protection is on";
        statusText.classList.add("on"); statusText.classList.remove("off");
        indicator.classList.remove("off");
        footerText.textContent = "Active on all sites";
        stateChip.textContent = "Active";
        stateChip.classList.add("chip-on"); stateChip.classList.remove("chip-off");
    } else {
        statusText.textContent = "Protection is off";
        statusText.classList.add("off"); statusText.classList.remove("on");
        indicator.classList.add("off");
        footerText.textContent = "WebRTC is allowed";
        stateChip.textContent = "Disabled";
        stateChip.classList.add("chip-off"); stateChip.classList.remove("chip-on");
    }
}

async function refreshCounter() {
    const { [KEYS.counter]: c = 0 } = await chrome.storage.local.get({ [KEYS.counter]: 0 });
    counterEl.textContent = c.toLocaleString();
}

async function refreshIP() {
    try {
        const res = await fetch("https://api.ipify.org?format=json", { cache: "no-store" });
        const data = await res.json();
        ipValue.textContent = data.ip || "—";
    } catch (e) {
        ipValue.textContent = "unavailable";
    }
}

async function initAllowButton() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url || tab.url.startsWith("chrome://")) {
        allowBtn.disabled = true;
        allowLabel.textContent = "Unavailable here";
        return;
    }
    let host = "";
    try { host = new URL(tab.url).hostname; } catch (e) { }
    if (!host) {
        allowBtn.disabled = true;
        allowLabel.textContent = "Unavailable here";
        return;
    }

    const { [KEYS.allowlist]: list = [] } = await chrome.storage.sync.get({ [KEYS.allowlist]: [] });
    const isAllowed = list.includes(host);

    allowLabel.textContent = isAllowed ? `Remove allow for ${host}` : `Allow on ${host}`;
    allowBtn.classList.toggle("active", isAllowed);

    allowBtn.addEventListener("click", async () => {
        const { [KEYS.allowlist]: cur = [] } = await chrome.storage.sync.get({ [KEYS.allowlist]: [] });
        const next = cur.includes(host) ? cur.filter((h) => h !== host) : [...cur, host];
        await chrome.storage.sync.set({ [KEYS.allowlist]: next });
        window.close();
    });
}

async function init() {
    const { [KEYS.enabled]: enabled = true } = await chrome.storage.sync.get({ [KEYS.enabled]: true });
    render(enabled);
    refreshCounter();
    refreshIP();
    initAllowButton();

    toggle.addEventListener("change", async () => {
        await chrome.storage.sync.set({ [KEYS.enabled]: toggle.checked });
        render(toggle.checked);
    });

    document.getElementById("openOptions").addEventListener("click", (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });
    document.getElementById("openLog").addEventListener("click", (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: chrome.runtime.getURL("log.html") });
    });
    document.getElementById("openTest").addEventListener("click", (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: chrome.runtime.getURL("test.html") });
    });
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[KEYS.counter]) refreshCounter();
});

init();