const KEYS = {
    log: "webrtcBlockerLog",
    counter: "webrtcBlockerCounter"
};

const list = document.getElementById("logList");
const empty = document.getElementById("empty");
const total = document.getElementById("total");

// Theme is now handled by the shared theme.js module
window.WRTCBTheme.init();

function fmtTime(ts) {
    const d = new Date(ts);
    const diff = Date.now() - ts;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleString();
}

async function render() {
    const { [KEYS.log]: log = [] } = await chrome.storage.local.get({ [KEYS.log]: [] });
    const { [KEYS.counter]: counter = 0 } = await chrome.storage.local.get({ [KEYS.counter]: 0 });

    total.textContent = `${counter.toLocaleString()} total`;
    list.innerHTML = "";

    if (!log.length) {
        empty.classList.remove("hidden");
        return;
    }
    empty.classList.add("hidden");

    for (const entry of log) {
        const li = document.createElement("li");
        const left = document.createElement("div");
        const kind = document.createElement("span");
        kind.className = "kind";
        kind.textContent = entry.kind || "webrtc";
        const host = document.createElement("span");
        host.className = "host";
        host.textContent = entry.host || "(unknown)";
        left.appendChild(kind);
        left.appendChild(host);

        const ts = document.createElement("span");
        ts.className = "ts";
        ts.textContent = fmtTime(entry.ts);

        li.appendChild(left);
        li.appendChild(ts);
        list.appendChild(li);
    }
}

document.getElementById("clearBtn").addEventListener("click", async () => {
    await chrome.storage.local.set({ [KEYS.log]: [], [KEYS.counter]: 0 });
    render();
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes[KEYS.log] || changes[KEYS.counter])) render();
});

render();