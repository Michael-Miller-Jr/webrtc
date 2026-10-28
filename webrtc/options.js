const KEYS = {
    policy: "webrtcBlockerPolicy",
    rules: "webrtcBlockerRules",
    allowlist: "webrtcBlockerAllowlist",
    toggles: "webrtcBlockerToggles"
};

const DEFAULT_TOGGLES = {
    webrtc: true, media: true, canvas: false, webgl: false, timezone: false
};

const PRESETS = {
    paranoid: { toggles: { webrtc: true, media: true, canvas: true, webgl: true, timezone: true }, policy: "disable_non_proxied_udp" },
    balanced: { toggles: { webrtc: true, media: true, canvas: true, webgl: false, timezone: false }, policy: "disable_non_proxied_udp" },
    compat: { toggles: { webrtc: true, media: false, canvas: false, webgl: false, timezone: false }, policy: "default_public_interface_only" }
};

const toast = document.getElementById("toast");

const els = {
    themeToggle: document.getElementById("themeToggle"),
    policySelect: document.getElementById("policySelect"),
    rulesText: document.getElementById("rulesText"),
    allowText: document.getElementById("allowText"),
    ioText: document.getElementById("ioText"),
    presetHint: document.getElementById("presetHint"),
    tWebrtc: document.getElementById("t-webrtc"),
    tMedia: document.getElementById("t-media"),
    tCanvas: document.getElementById("t-canvas"),
    tWebgl: document.getElementById("t-webgl"),
    tTimezone: document.getElementById("t-timezone")
};

// Guard so programmatic changes during load don't trigger saves
let loading = true;

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 1600);
}

/* ---------------- Theme ---------------- */
window.WRTCBTheme.init();
els.themeToggle.addEventListener("click", async () => {
    const next = await window.WRTCBTheme.cycle();
    showToast(`Theme: ${next}`);
});

/* ---------------- Load ---------------- */
async function loadAll() {
    loading = true;

    const s = await chrome.storage.sync.get({
        [KEYS.policy]: "disable_non_proxied_udp",
        [KEYS.rules]: "",
        [KEYS.allowlist]: [],
        [KEYS.toggles]: DEFAULT_TOGGLES
    });

    els.policySelect.value = s[KEYS.policy];
    els.rulesText.value = s[KEYS.rules] || "";
    els.allowText.value = (s[KEYS.allowlist] || []).join("\n");

    const t = { ...DEFAULT_TOGGLES, ...s[KEYS.toggles] };
    els.tWebrtc.checked = t.webrtc;
    els.tMedia.checked = t.media;
    els.tCanvas.checked = t.canvas;
    els.tWebgl.checked = t.webgl;
    els.tTimezone.checked = t.timezone;

    highlightActivePreset(t, s[KEYS.policy]);

    // Allow change events to start saving again
    loading = false;
}

function currentToggles() {
    return {
        webrtc: els.tWebrtc.checked,
        media: els.tMedia.checked,
        canvas: els.tCanvas.checked,
        webgl: els.tWebgl.checked,
        timezone: els.tTimezone.checked
    };
}

function highlightActivePreset(toggles, policy) {
    document.querySelectorAll(".preset").forEach((btn) => btn.classList.remove("active"));
    for (const [name, preset] of Object.entries(PRESETS)) {
        const togglesMatch = Object.keys(preset.toggles).every(
            (k) => preset.toggles[k] === toggles[k]
        );
        if (togglesMatch && preset.policy === policy) {
            document.querySelector(`.preset[data-preset="${name}"]`)?.classList.add("active");
            els.presetHint.textContent = `Active: ${name[0].toUpperCase() + name.slice(1)}`;
            return;
        }
    }
    els.presetHint.textContent = "Custom configuration";
}

/* ---------------- Save toggles (debounced, guarded) ---------------- */
let saveTogglesTimer;
function scheduleSaveToggles() {
    if (loading) return;
    clearTimeout(saveTogglesTimer);
    saveTogglesTimer = setTimeout(async () => {
        const toggles = currentToggles();
        await chrome.storage.sync.set({ [KEYS.toggles]: toggles });
        const { [KEYS.policy]: policy } = await chrome.storage.sync.get({ [KEYS.policy]: "disable_non_proxied_udp" });
        highlightActivePreset(toggles, policy);
        showToast("Saved");
    }, 300);
}

[els.tWebrtc, els.tMedia, els.tCanvas, els.tWebgl, els.tTimezone].forEach((el) => {
    el.addEventListener("change", scheduleSaveToggles);
});

/* ---------------- Policy ---------------- */
els.policySelect.addEventListener("change", async () => {
    if (loading) return;
    await chrome.storage.sync.set({ [KEYS.policy]: els.policySelect.value });
    highlightActivePreset(currentToggles(), els.policySelect.value);
    showToast("Policy saved");
});

/* ---------------- Rules ---------------- */
let rulesTimer;
els.rulesText.addEventListener("input", () => {
    if (loading) return;
    clearTimeout(rulesTimer);
    rulesTimer = setTimeout(async () => {
        await chrome.storage.sync.set({ [KEYS.rules]: els.rulesText.value });
        showToast("Rules saved");
    }, 500);
});

/* ---------------- Allowlist ---------------- */
let allowTimer;
els.allowText.addEventListener("input", () => {
    if (loading) return;
    clearTimeout(allowTimer);
    allowTimer = setTimeout(async () => {
        const list = els.allowText.value.split("\n").map((s) => s.trim()).filter(Boolean);
        await chrome.storage.sync.set({ [KEYS.allowlist]: list });
        showToast("Allowlist saved");
    }, 500);
});

/* ---------------- Presets ---------------- */
document.querySelectorAll(".preset").forEach((btn) => {
    btn.addEventListener("click", async () => {
        const name = btn.dataset.preset;
        const preset = PRESETS[name];
        if (!preset) return;
        await chrome.storage.sync.set({
            [KEYS.toggles]: preset.toggles,
            [KEYS.policy]: preset.policy
        });
        await loadAll();
        showToast(`Preset: ${name}`);
    });
});

/* ---------------- Export / import / reset ---------------- */
document.getElementById("exportBtn").addEventListener("click", async () => {
    const s = await chrome.storage.sync.get(null);
    const payload = {
        version: 2,
        enabled: s.webrtcBlockerEnabled ?? true,
        theme: s[window.WRTCBTheme.KEY] ?? "auto",
        policy: s[KEYS.policy] ?? "disable_non_proxied_udp",
        rules: s[KEYS.rules] ?? "",
        allowlist: s[KEYS.allowlist] ?? [],
        toggles: s[KEYS.toggles] ?? DEFAULT_TOGGLES
    };
    els.ioText.value = JSON.stringify(payload, null, 2);
    els.ioText.select();
    showToast("Exported — copy the JSON");
});

document.getElementById("importBtn").addEventListener("click", async () => {
    try {
        const data = JSON.parse(els.ioText.value);
        const patch = {};
        if (typeof data.enabled === "boolean") patch.webrtcBlockerEnabled = data.enabled;
        if (typeof data.theme === "string") patch[window.WRTCBTheme.KEY] = data.theme;
        if (typeof data.policy === "string") patch[KEYS.policy] = data.policy;
        if (typeof data.rules === "string") patch[KEYS.rules] = data.rules;
        if (Array.isArray(data.allowlist)) patch[KEYS.allowlist] = data.allowlist;
        if (data.toggles && typeof data.toggles === "object")
            patch[KEYS.toggles] = { ...DEFAULT_TOGGLES, ...data.toggles };

        await chrome.storage.sync.set(patch);
        await loadAll();
        showToast("Imported");
    } catch (e) {
        showToast("Invalid JSON");
    }
});

document.getElementById("resetBtn").addEventListener("click", async () => {
    if (!confirm("Reset all settings to defaults?")) return;
    await chrome.storage.sync.clear();
    await loadAll();
    showToast("Reset complete");
});

/* ---------------- Keep in sync with other pages ---------------- */
chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== "sync") return;
    // If toggles/policy/rules/allowlist changed elsewhere, reload UI quietly.
    // Ignore if the change came from our own save (would cause a loop).
    if (loading) return;
    const relevant =
        changes[KEYS.toggles] || changes[KEYS.policy] ||
        changes[KEYS.rules] || changes[KEYS.allowlist];
    if (!relevant) return;

    // Only reload if the values actually differ from what's in the DOM
    const s = await chrome.storage.sync.get({
        [KEYS.policy]: "disable_non_proxied_udp",
        [KEYS.rules]: "",
        [KEYS.allowlist]: [],
        [KEYS.toggles]: DEFAULT_TOGGLES
    });
    const t = { ...DEFAULT_TOGGLES, ...s[KEYS.toggles] };
    const domToggles = currentToggles();
    const togglesDiffer = Object.keys(t).some((k) => t[k] !== domToggles[k]);
    const policyDiffers = s[KEYS.policy] !== els.policySelect.value;
    const rulesDiffer = (s[KEYS.rules] || "") !== els.rulesText.value;
    const allowDiffer = (s[KEYS.allowlist] || []).join("\n") !== els.allowText.value;

    if (togglesDiffer || policyDiffers || rulesDiffer || allowDiffer) {
        loading = true;
        els.policySelect.value = s[KEYS.policy];
        els.rulesText.value = s[KEYS.rules] || "";
        els.allowText.value = (s[KEYS.allowlist] || []).join("\n");
        els.tWebrtc.checked = t.webrtc;
        els.tMedia.checked = t.media;
        els.tCanvas.checked = t.canvas;
        els.tWebgl.checked = t.webgl;
        els.tTimezone.checked = t.timezone;
        highlightActivePreset(t, s[KEYS.policy]);
        loading = false;
    }
});

/* ---------------- Boot ---------------- */
loadAll();