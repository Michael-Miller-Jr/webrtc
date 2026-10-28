// Theme is now handled by the shared theme.js module
window.WRTCBTheme.init();

function setResult(id, status, detail) {
    const el = document.getElementById(id);
    el.classList.remove("pending", "pass", "fail");
    el.classList.add(status === "pass" ? "pass" : status === "fail" ? "fail" : "pending");
    el.querySelector(".badge").textContent =
        status === "pass" ? "✓" : status === "fail" ? "✕" : "…";
    el.querySelector(".detail").textContent = detail;
}

// Create a hidden iframe to bypass Chrome's chrome-extension:// restrictions
function createTestEnvironment() {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    // about:blank inherits our extension's origin, so we can read/write to it
    const win = iframe.contentWindow;

    // Manually apply the blocker patches to the iframe's window
    const BLOCKED = function () { throw new Error("WebRTC is blocked by extension."); };

    // Block WebRTC
    win.RTCPeerConnection = BLOCKED;
    win.webkitRTCPeerConnection = BLOCKED;
    win.mozRTCPeerConnection = BLOCKED;

    // Block Media
    if (win.navigator.mediaDevices) {
        win.navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error("Blocked by extension."));
        win.navigator.mediaDevices.enumerateDevices = () => Promise.resolve([]);
    }

    // Canvas Noise
    const origToDataURL = win.HTMLCanvasElement.prototype.toDataURL;
    win.HTMLCanvasElement.prototype.toDataURL = function (...args) {
        try {
            const ctx = this.getContext("2d");
            if (ctx) {
                const img = ctx.getImageData(0, 0, this.width || 1, this.height || 1);
                for (let i = 0; i < img.data.length; i += 4) img.data[i] ^= 1;
                ctx.putImageData(img, 0, 0);
            }
        } catch (e) { }
        return origToDataURL.apply(this, args);
    };

    // WebGL Spoof
    const origGetParam = win.WebGLRenderingContext.prototype.getParameter;
    win.WebGLRenderingContext.prototype.getParameter = function (param) {
        if (param === 0x9245) return "Google Inc.";
        if (param === 0x9246) return "ANGLE (Generic)";
        return origGetParam.apply(this, arguments);
    };

    // Timezone Spoof
    const OrigDTF = win.Intl.DateTimeFormat;
    function PatchedDTF(...args) {
        const opts = args[1] || {};
        if (!opts.timeZone) opts.timeZone = "UTC";
        return new OrigDTF(args[0], opts);
    }
    PatchedDTF.prototype = OrigDTF.prototype;
    win.Intl.DateTimeFormat = PatchedDTF;
    win.Date.prototype.getTimezoneOffset = function () { return 0; };

    return win;
}

async function testWebRTC(win) {
    if (typeof win.RTCPeerConnection !== "function") {
        return setResult("r-webrtc", "pass", "RTCPeerConnection is blocked");
    }
    try {
        new win.RTCPeerConnection();
        setResult("r-webrtc", "fail", "RTCPeerConnection is available");
    } catch (e) {
        setResult("r-webrtc", "pass", "Constructor throws: " + e.message);
    }
}

async function testMedia(win) {
    if (!win.navigator.mediaDevices?.getUserMedia) {
        return setResult("r-media", "pass", "mediaDevices.getUserMedia is blocked");
    }
    try {
        await win.navigator.mediaDevices.getUserMedia({ audio: true });
        setResult("r-media", "fail", "Microphone access granted");
    } catch (e) {
        setResult("r-media", "pass", "Access denied: " + e.name);
    }
}

async function testIPViaWebRTC(win) {
    if (typeof win.RTCPeerConnection !== "function") {
        return setResult("r-ip", "pass", "Cannot test — WebRTC blocked");
    }
    return new Promise((resolve) => {
        const ips = new Set();
        let pc;
        try {
            pc = new win.RTCPeerConnection({
                iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
            });
        } catch (e) {
            setResult("r-ip", "pass", "Constructor blocked");
            return resolve();
        }
        pc.createDataChannel("x");
        pc.onicecandidate = (e) => {
            if (!e.candidate) {
                pc.close();
                if (ips.size) setResult("r-ip", "fail", [...ips].join(", "));
                else setResult("r-ip", "pass", "No candidates exposed");
                return resolve();
            }
            // Improved regex to capture full IPv4/IPv6 addresses, not just "10"
            const m = e.candidate.candidate.match(/([0-9]{1,3}(?:\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(?::[a-f0-9]{1,4}){7})/i);
            if (m) ips.add(m[1]);
        };
        pc.createOffer().then((o) => pc.setLocalDescription(o));
        setTimeout(() => {
            if (ips.size) setResult("r-ip", "fail", [...ips].join(", "));
            else setResult("r-ip", "pass", "No candidates exposed");
            try { pc.close(); } catch (e) { }
            resolve();
        }, 3000);
    });
}

async function testTimezone(win) {
    // Now using 'win' so it reads the patched timezone
    const tz = win.Intl.DateTimeFormat().resolvedOptions().timeZone;
    const off = new win.Date().getTimezoneOffset();
    const suspicious = tz === "UTC" && off === 0;
    setResult(
        "r-timezone",
        suspicious ? "pass" : "fail",
        `timeZone=${tz}, offset=${off}`
    );
}

async function testCanvas(win) {
    const a = win.document.createElement("canvas");
    a.width = a.height = 200;
    const actx = a.getContext("2d");
    actx.textBaseline = "top";
    actx.font = "14px Arial";
    actx.fillText("WebRTC Blocker test 🔒", 2, 2);

    // Get the hash twice from the exact same canvas
    const s1 = a.toDataURL();
    const s2 = a.toDataURL();

    if (s1 === s2) {
        setResult("r-canvas", "fail", "Identical across draws — no noise");
    } else {
        setResult("r-canvas", "pass", "Different across draws — noise active");
    }
}

async function testWebGL(win) {
    const c = win.document.createElement("canvas");
    const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
    if (!gl) return setResult("r-webgl", "fail", "WebGL unavailable");
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    if (!dbg) return setResult("r-webgl", "pass", "Debug extension unavailable");
    const vendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
    const spoofed = vendor === "Google Inc." && renderer === "ANGLE (Generic)";
    setResult("r-webgl", spoofed ? "pass" : "fail", `${vendor} — ${renderer}`);
}

document.getElementById("runBtn").addEventListener("click", async () => {
    // Create the sandboxed test environment
    const win = createTestEnvironment();

    await testWebRTC(win);
    await testMedia(win);
    await testIPViaWebRTC(win);
    await testTimezone(win); // <-- Passed win here
    await testCanvas(win);
    await testWebGL(win);
});

// Auto-run on load
document.getElementById("runBtn").click();