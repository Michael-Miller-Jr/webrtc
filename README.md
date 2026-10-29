# WebRTC Blocker

<img width="344" height="482" alt="Screenshot 2026-10-28 205515" src="https://github.com/user-attachments/assets/78fcbfd6-6762-4cc7-8e05-2b2b5be185d4" />

**WebRTC Blocker** is a Chrome extension designed to stop your browser from leaking your real IP address through WebRTC. While it doesn't block ads itself, it hardens your browser against modern fingerprinting techniques like Canvas noise injection, WebGL spoofing, and timezone masking. It enforces Chrome's strictest network-level IP policy, ensuring your VPN works the way it's supposed to. All detection attempts are logged locally, and you stay in control with a clean, user-friendly popup and options interface.

For the sake of clarity: When the description says it "hides your IP" or "hardens your browser," it means that the extension:
- Neuters `RTCPeerConnection` to instantly block peer-to-peer connections from exposing your real local or public IP address.
- Enforces Chrome's native network policies (like `disable_non_proxied_udp`) to prevent raw UDP packets from bypassing your VPN.
- Fakes hardware fingerprints by adding invisible noise to HTML canvases and overriding WebGL vendor/renderer strings, so trackers can't uniquely identify your device.
- Blocks silent media access by rejecting `getUserMedia` requests, stopping sites from turning on your webcam or microphone without permission.

This protects your privacy, even though your VPN is still quietly routing your traffic in the background.

So to clarify: the extension doesn't replace your VPN or ad blocker, but it hardens the browser just enough to prevent leaks and tracking scripts. That's the key to staying truly private.

## 💡 Why This Exists
The author of this extension believes users should have the freedom to browse the internet securely without their privacy being compromised by underlying browser flaws. Just as individuals can walk down a street and choose to ignore advertisements in the physical world, they should be able to use a VPN without their real IP address leaking through WebRTC.

WebRTC Blocker was created to support this principle:
A quiet, secure browsing experience where users - not aggressive scripts or hidden API calls - remain in control.

This tool isn't about circumventing fair monetization; it's about pushing back against invasive practices that degrade user privacy. While your VPN handles the job of masking your traffic, WebRTC Blocker works alongside it to prevent detection scripts from realizing your real location. It covers your tracks by patching native browser APIs and enforcing strict network policies, helping avoid IP leaks, fingerprinting, and forced hardware access. 

Furthermore, the FBI has stated "Use an ad blocking extension when performing internet searches" - Reference: (https://www.ic3.gov/PSA/2022/PSA221221). WebRTC leaks are a similarly documented privacy flaw.

When paired with a trusted VPN, WebRTC Blocker adds another layer of control and protection - quietly helping users avoid both location leaks and potential harm.

---

## 🚀 Features

- **Stop WebRTC Leaks**  
  Blocks `RTCPeerConnection` and forces Chrome's network policy to strict (`disable_non_proxied_udp`), ensuring your VPN's IP is the only one seen by websites.

- **Fingerprint Hardening**  
  Add invisible noise to Canvas readbacks and spoof your WebGL vendor/renderer strings (e.g., masking an NVIDIA RTX 3070 as a generic Google Inc. adapter). 

- **Per-Site Allowlist**  
  Need to use Google Meet or Discord? Add trusted sites to the allowlist. The extension shows you exactly which sites are "Protected" and which are "Exempted."

- **Activity Logging**  
  Tracks blocked WebRTC and Media attempts locally in `chrome.storage.local`. View which sites are actively trying to probe your browser.

- **Built-in Leak Test**  
  A dedicated test page runs entirely in your browser to verify WebRTC, Media, Canvas, WebGL, and Timezone protections are actively working.
-- <img width="915" height="613" alt="Screenshot 2026-10-28 205557" src="https://github.com/user-attachments/assets/5deeacdf-470b-41e9-8ded-1d719f0ebc96" />


- **Enable/Disable with One Click**  
  Use the popup toggle to instantly enable or disable stealth functionality. Choose from Paranoid, Balanced, or Compatibility presets to instantly dial in your privacy settings.

- <img width="1147" height="1270" alt="Screenshot 2026-10-28 205530" src="https://github.com/user-attachments/assets/ee47cd8f-650f-4d87-811a-11cf49095412" />

- <img width="1020" height="749" alt="Screenshot 2026-10-28 205538" src="https://github.com/user-attachments/assets/681507bc-5634-41c6-b63f-2fafc78a605a" />

---

## 🧱 Works Best With These VPNs and Privacy Tools
WebRTC Blocker is designed to complement your existing privacy stack, not replace it. It works best when used alongside the following:

- **A Trusted VPN**
The whole point of this extension is to make your VPN work properly. Whether you use Mullvad, ProtonVPN, or a custom WireGuard setup, this extension closes the WebRTC leak loophole.

- **uBlock Origin**
Handles network-level ad blocking and script filtering. WebRTC Blocker handles browser-level hardware and network leaks.

- **Privacy Badger**
Created by the EFF, this tool blocks trackers. WebRTC Blocker prevents those trackers from bypassing the network layer.

These tools handle the blocking. WebRTC Blocker ensures your IP doesn't leak around them.

---

## 🛠️ Installation

To protect your privacy and avoid detection, **WebRTC Blocker must be loaded manually as an unpacked extension**:

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the extension folder.

WebRTC Blocker will now appear in your toolbar and work silently across supported sites.

---

## ❓ Why Load as Unpacked?

### 🚫 Avoid Extension Fingerprinting

Chrome Web Store extensions have **permanent, globally known IDs**. Websites can detect these using:

- Requests to `chrome-extension://<ID>/`
- JS fingerprinting and DOM probes
- Known file or behavior signatures

**Unpacked extensions use randomized IDs**, making detection virtually impossible.

---

### 🔒 Avoid Store Restrictions & Auto-Updates

Google prohibits or limits functionality like:

- Spoofing detection variables (WebGL, Canvas)
- Blocking native browser APIs (`RTCPeerConnection`)
- Interfering with page scripts

By remaining unpacked:

- ✅ Avoids extension takedowns or forced restrictions  
- ✅ Retains complete privacy and control  
- ✅ Developer decides when and how the extension is updated, end users must update for new features and improvements

---

## 📁 File Structure

- **icons/**
  - icon48.png
  - icon128.png
- **.js files**
  - background.js
  - content.js
  - rules.js
  - theme.js
  - popup.js
  - options.js
  - log.js
  - test.js
- **.html files**
  - popup.html
  - options.html
  - log.html
  - test.html
- **.css files**
  - popup.css
  - options.css
  - log.css
  - test.css
- **Config**
  - manifest.json
  - README.md

---

## ⚙️ Permissions Used

The extension requests the following permissions:
`privacy`, `storage`, `scripting`, `tabs`, `notifications`, `declarativeNetRequestWithHostAccess`, and `<all_urls>` host permissions.

- `privacy`: Needed to change Chrome's built-in WebRTC IP handling policy.  
- `storage`: For saving toggle states, allowlists, and activity logs.  
- `tabs`: Used only to check the URL of the active tab to show the "Allow this site" button.
- `notifications`: Used to alert you the first time a site tries to use WebRTC on a new page.
- `<all_urls>`: Needed to run stealth logic on any site and prevent WebRTC leaks across the web.

---

## 🔐 Safe and Secure Practices

### ✅ 1. No Remote Code Execution  
- All scripts (e.g., `content.js`, `background.js`) are locally stored and listed in `manifest.json`.  
- No use of `eval()`, `new Function()`, or dynamic script loading from external sources.

### ✅ 2. Minimal and Appropriate Permissions
- `privacy` and `storage` are used solely for enforcing policies and saving logs/settings.  
- `<all_urls>` is justified due to the extension’s purpose of preventing WebRTC leaks across the entire web.

### ✅ 3. No Access to Sensitive APIs  
The extension does **not** use or request:  
- `cookies`  
- `webRequest`  
- `history`  
- `identity` or `sessions`

### ✅ 4. Local-Only Logging  
- Detection logs are saved using `chrome.storage.local`.  
- No data is ever sent externally.  
- Logs can be viewed, cleared, or exported at any time.

### ✅ 5. Clean UI Input Handling  
- No user input is parsed or inserted into the DOM unsafely.  
- All UI elements (toggles, buttons) are strictly scoped and simple.

---

### ⚠️ Areas to Note (Safe but Worth Awareness)

- **`chrome.tabs.query()` in `popup.js`**  
  Used only to check the current tab URL.  
  Does **not** access tab content.

- **Global Spoofing (`WebGL`, `Canvas`, `Intl.DateTimeFormat`)**  
  These are spoofed for stealth, which is effective but can be caught by aggressive fingerprinting scripts.  
  This is a stealth-evasion tradeoff, not a security concern.

- **`<all_urls>` Access**  
  While necessary, this is a broad permission. It’s safe because:  
  - Doesn’t fetch or execute external scripts  
  - Avoids unsafe APIs  
  - Doesn’t manipulate sensitive page content

---

### ❌ No Known Insecure Patterns

Avoided:  
- `eval()` or `setTimeout('code', ...)`  
- Inline script execution  
- External tracking or analytics  
- Untrusted user input parsing

---

### ✅ Final Verdict

This extension is secure, responsible, and well-designed.  
It follows modern Chrome Extension best practices for:  
- Script isolation  
- Local-only storage  
- Controlled permissions  
- Passive enhancement without violating user trust

---

## 🧪 Use Cases

- Prevent streaming services (like HBO Max or Netflix) from detecting your VPN via WebRTC IP leaks.
- Block malicious scripts from silently accessing your webcam or microphone.
- Stop fingerprinting scripts from reading your exact graphics card model or canvas renderings.
- Log exactly which domains are trying to ping your local network.

---

## 💡 Future Enhancements

- Auto-detect VPN connection state
- Optional remote sync or import/export rules
- ~~Smarter fingerprint evasion~~ (Now Included)

---

## 📜 License

Proprietary / All Rights Reserved (No license declared)
- If a project has no license, you cannot legally reuse, copy, modify, or distribute the code. All rights are reserved by default under copyright law.

---

## 🙌 Contributing

Pull requests and issues are welcome! Whether it's improving stealth behavior or UI polish, feel free to contribute (Please Note: License will remain the same, Proprietary / All Rights Reserved regardless of your contribution).

---

## 🧊 Final Note

WebRTC Blocker is for users who want peace of mind and a smoother browsing experience - without being tracked across the web or having their VPN rendered useless by browser leaks. Install it, toggle it, and browse quietly.
