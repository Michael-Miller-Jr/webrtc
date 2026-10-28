(function () {
    "use strict";

    if (window.__wrtcbInstalled) return;
    window.__wrtcbInstalled = true;

    const state = {
        applied: false,
        originals: [],
        config: null
    };

    function saveOriginal(target, prop) {
        try {
            const desc = Object.getOwnPropertyDescriptor(target, prop);
            if (desc) state.originals.push({ target, prop, desc });
        } catch (e) { }
    }

    function report(kind) {
        try {
            chrome.runtime.sendMessage({ type: "blocked", kind });
        } catch (e) { }
    }

    /* ---------- WebRTC ---------- */

    function blockWebRTC() {
        const BLOCKED = function () {
            report("webrtc");
            throw new Error("WebRTC is blocked by extension.");
        };
        saveOriginal(window, "RTCPeerConnection");
        try {
            Object.defineProperty(window, "RTCPeerConnection", {
                configurable: true, writable: false, value: BLOCKED
            });
        } catch (e) { window.RTCPeerConnection = BLOCKED; }

        ["webkitRTCPeerConnection", "mozRTCPeerConnection"].forEach((n) => {
            if (n in window) {
                saveOriginal(window, n);
                try {
                    Object.defineProperty(window, n, {
                        configurable: true, writable: false, value: BLOCKED
                    });
                } catch (e) { window[n] = BLOCKED; }
            }
        });
    }

    function blockMedia() {
        if (navigator.mediaDevices) {
            saveOriginal(navigator.mediaDevices, "getUserMedia");
            saveOriginal(navigator.mediaDevices, "enumerateDevices");
            try {
                Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
                    configurable: true, writable: false,
                    value: () => {
                        report("media");
                        return Promise.reject(new Error("Blocked by extension."));
                    }
                });
                Object.defineProperty(navigator.mediaDevices, "enumerateDevices", {
                    configurable: true, writable: false,
                    value: () => Promise.resolve([])
                });
            } catch (e) { }
        }
        ["getUserMedia", "webkitGetUserMedia", "mozGetUserMedia"].forEach((n) => {
            if (navigator[n]) {
                saveOriginal(navigator, n);
                try {
                    Object.defineProperty(navigator, n, {
                        configurable: true, writable: false,
                        value: () => {
                            report("media");
                            throw new Error("Blocked by extension.");
                        }
                    });
                } catch (e) { }
            }
        });
    }

    /* ---------- Canvas noise ---------- */

    function noiseCanvas() {
        const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
        const origToBlob = HTMLCanvasElement.prototype.toBlob;
        const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;

        saveOriginal(HTMLCanvasElement.prototype, "toDataURL");
        saveOriginal(HTMLCanvasElement.prototype, "toBlob");
        saveOriginal(CanvasRenderingContext2D.prototype, "getImageData");

        HTMLCanvasElement.prototype.toDataURL = function (...args) {
            try {
                const ctx = this.getContext("2d");
                if (ctx) {
                    const img = ctx.getImageData(0, 0, this.width || 1, this.height || 1);
                    for (let i = 0; i < img.data.length; i += 4) {
                        img.data[i] ^= Math.random() < 0.5 ? 0 : 1;
                    }
                    ctx.putImageData(img, 0, 0);
                }
            } catch (e) { }
            return origToDataURL.apply(this, args);
        };

        HTMLCanvasElement.prototype.toBlob = function (...args) {
            try {
                const ctx = this.getContext("2d");
                if (ctx) {
                    const img = ctx.getImageData(0, 0, this.width || 1, this.height || 1);
                    for (let i = 0; i < img.data.length; i += 4) {
                        img.data[i] ^= Math.random() < 0.5 ? 0 : 1;
                    }
                    ctx.putImageData(img, 0, 0);
                }
            } catch (e) { }
            return origToBlob.apply(this, args);
        };

        CanvasRenderingContext2D.prototype.getImageData = function (...args) {
            const data = origGetImageData.apply(this, args);
            for (let i = 0; i < data.data.length; i += 4) {
                data.data[i] ^= Math.random() < 0.5 ? 0 : 1;
            }
            return data;
        };
    }

    /* ---------- WebGL spoof ---------- */

    function spoofWebGL() {
        const origGetParameter = WebGLRenderingContext.prototype.getParameter;
        saveOriginal(WebGLRenderingContext.prototype, "getParameter");
        WebGLRenderingContext.prototype.getParameter = function (param) {
            // UNMASKED_VENDOR_WEBGL / UNMASKED_RENDERER_WEBGL
            if (param === 0x9245) return "Google Inc.";
            if (param === 0x9246) return "ANGLE (Generic)";
            return origGetParameter.apply(this, arguments);
        };
        if (typeof WebGL2RenderingContext !== "undefined") {
            const orig2 = WebGL2RenderingContext.prototype.getParameter;
            saveOriginal(WebGL2RenderingContext.prototype, "getParameter");
            WebGL2RenderingContext.prototype.getParameter = function (param) {
                if (param === 0x9245) return "Google Inc.";
                if (param === 0x9246) return "ANGLE (Generic)";
                return orig2.apply(this, arguments);
            };
        }
    }

    /* ---------- Timezone spoof ---------- */

    function spoofTimezone() {
        const fixed = "UTC";
        try {
            const OrigDTF = Intl.DateTimeFormat;
            function PatchedDTF(...args) {
                const opts = args[1] || {};
                if (!opts.timeZone) opts.timeZone = fixed;
                return new OrigDTF(args[0], opts);
            }
            PatchedDTF.prototype = OrigDTF.prototype;
            PatchedDTF.supportedLocalesOf = OrigDTF.supportedLocalesOf;
            Intl.DateTimeFormat = PatchedDTF;
            saveOriginal(Intl, "DateTimeFormat");
        } catch (e) { }

        const origOffset = Date.prototype.getTimezoneOffset;
        saveOriginal(Date.prototype, "getTimezoneOffset");
        Date.prototype.getTimezoneOffset = function () { return 0; };
    }

    /* ---------- Apply based on config ---------- */

    function apply(config) {
        state.config = config;
        const t = config.toggles;

        if (config.webrtcAllowed === false) {
            blockWebRTC();
            if (t.media) blockMedia();
        } else if (t.media) {
            blockMedia();
        }
        if (t.canvas) noiseCanvas();
        if (t.webgl) spoofWebGL();
        if (t.timezone) spoofTimezone();

        state.applied = true;
        console.log("[WebRTC Blocker] Applied on", location.hostname, config);
    }

    function buildConfigFromStorage() {
        chrome.runtime.sendMessage({ type: "get-config" }, (resp) => {
            if (!resp) return;
            const host = location.hostname || "";
            const allowlisted = (resp.allowlist || []).some(
                (h) => h === host || host.endsWith("." + h)
            );
            const rules = window.WRTCB
                ? window.WRTCB.parseRules(resp.rules || "")
                : [];
            const defaults = {
                webrtc: !allowlisted,
                media: !allowlisted,
                canvas: resp.toggles.canvas,
                webgl: resp.toggles.webgl,
                timezone: resp.toggles.timezone
            };
            const resolved = window.WRTCB
                ? window.WRTCB.resolvePermissions(host, rules, defaults)
                : defaults;

            apply({
                toggles: {
                    webrtc: resolved.webrtc,
                    media: resolved.media,
                    canvas: resolved.canvas,
                    webgl: resolved.webgl,
                    timezone: resolved.timezone
                },
                webrtcAllowed: !resolved.webrtc && !resp.enabled ? true : resolved.webrtc,
                enabled: resp.enabled
            });
        });
    }

    // Wait for rules.js to attach WRTCB to window (it runs first)
    buildConfigFromStorage();

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg?.type === "config-changed") {
            // Simplest correct behavior: reload so document_start applies cleanly
            location.reload();
        }
    });
})();