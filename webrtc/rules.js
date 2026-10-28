// Simple rule syntax:
//   *.example.com   allow webrtc
//   example.com     allow media
//   bank.com        block
//   *               block webrtc
//
// Categories: webrtc, media, canvas, webgl, timezone
// Actions: allow, block

function parseRules(text) {
  const lines = (text || "").split("\n");
  const rules = [];
  for (let raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    const pattern = parts[0];
    const action = parts[1].toLowerCase();
    const categories = parts.slice(2).map((c) => c.toLowerCase());
    if (action !== "allow" && action !== "block") continue;
    rules.push({
      pattern,
      action,
      categories: categories.length ? categories : ["webrtc", "media"]
    });
  }
  return rules;
}

function patternMatches(pattern, hostname) {
  if (!pattern || !hostname) return false;
  if (pattern === "*") return true;
  const p = pattern.toLowerCase();
  const h = hostname.toLowerCase();
  if (p.startsWith("*.")) {
    const base = p.slice(2);
    return h === base || h.endsWith("." + base);
  }
  return h === p;
}

// Returns { webrtc, media, canvas, webgl, timezone } booleans
// true means "allowed to run" (i.e., not blocked)
function resolvePermissions(hostname, rules, defaults) {
  const result = { ...defaults };
  for (const rule of rules) {
    if (!patternMatches(rule.pattern, hostname)) continue;
    for (const cat of rule.categories) {
      if (cat === "*") {
        result.webrtc = rule.action === "allow";
        result.media = rule.action === "allow";
        result.canvas = rule.action === "allow";
        result.webgl = rule.action === "allow";
        result.timezone = rule.action === "allow";
      } else if (cat in result) {
        result[cat] = rule.action === "allow";
      }
    }
  }
  return result;
}

// Expose to both content script and options page
if (typeof window !== "undefined") {
  window.WRTCB = { parseRules, patternMatches, resolvePermissions };
}