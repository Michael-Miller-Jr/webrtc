// Shared theme helper. Both popup and options use this.
(function () {
    const THEME_KEY = "webrtcBlockerTheme";
    const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function resolve(pref) {
        return pref === "auto" ? (darkQuery.matches ? "dark" : "light") : pref;
    }

    function apply(pref) {
        document.documentElement.setAttribute("data-theme", resolve(pref));
    }

    async function get() {
        const { [THEME_KEY]: pref = "auto" } = await chrome.storage.sync.get({ [THEME_KEY]: "auto" });
        return pref;
    }

    async function init() {
        apply(await get());
        // Live-update on OS theme change (only matters when pref === "auto")
        darkQuery.addEventListener("change", async () => {
            apply(await get());
        });
        // Live-update when popup or options changes the theme
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === "sync" && changes[THEME_KEY]) {
                apply(changes[THEME_KEY].newValue);
            }
        });
    }

    async function cycle() {
        const cur = await get();
        const next = cur === "auto" ? "light" : cur === "light" ? "dark" : "auto";
        await chrome.storage.sync.set({ [THEME_KEY]: next });
        // apply happens via the onChanged listener, but apply immediately for snappiness
        apply(next);
        return next;
    }

    window.WRTCBTheme = { init, cycle, apply, resolve, get, KEY: THEME_KEY };
})();