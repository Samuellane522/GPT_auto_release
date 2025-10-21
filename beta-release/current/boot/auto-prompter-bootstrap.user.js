// ==UserScript==
// @name         Auto Prompter (BOOT)
// @namespace    ap.boot
// @version      0.3.0
// @description  Bootstrap loader for encrypted bundle w/ self-retire + telemetry + remote commands
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_addElement
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @connect      samuellane522.github.io
// @connect      localhost:8765
// @updateURL    https://samuellane522.github.io/GPT_auto_release/beta-release/current/boot/auto-prompter-bootstrap.user.js
// @downloadURL  https://samuellane522.github.io/GPT_auto_release/beta-release/current/boot/auto-prompter-bootstrap.user.js
// ==/UserScript==

(function () {
  "use strict";

const __AP_LOAD = "[AP][boot]";
const PUBLIC_BASE = "https://samuellane522.github.io/GPT_auto_release";
const ENC_PATH = "/download/beta/auto-prompter-enc.bin";
const REMOTE_KEY_URL = "https://samuellane522.github.io/GPT_auto_release/download/beta/key.json";
const STATIC_KEY_B64 = "";
const STATIC_IV_B64  = "";
const HARD_REQUIRE_REMOTE = false;
const MIN_ID = "";


    // ===== AP Retirement (bootstrap) =====
    const __AP_NS = "ap.boot";
    const __AP_RET_KEY = "ap.retired";
    const __AP_MSG_TYPE = "ap:retire";
    const __AP_CACHE_PREFIX = "ap-";

    async function __ap_wipeCaches() {
      try {
        if (!("caches" in self)) return;
        const names = await caches.keys();
        for (const n of names) {
          if (n && n.startsWith(__AP_CACHE_PREFIX)) {
            try { await caches.delete(n); } catch {}
          }
        }
      } catch {}
    }

    async function __ap_wipeGMStorage() {
      try {
        if (typeof GM_listValues === "function" && typeof GM_deleteValue === "function") {
          const keys = await GM_listValues();
          for (const k of keys) {
            if (String(k).startsWith("ap:") || k === __AP_RET_KEY) {
              try { await GM_deleteValue(k); } catch {}
            }
          }
        }
      } catch {}
    }

    async function __ap_selfDestruct(reason) {
      try {
        if (typeof GM_setValue === "function") {
          await GM_setValue(__AP_RET_KEY, String(reason || "retired"));
        }
      } catch {}
      try { await __ap_wipeGMStorage(); } catch {}
      try { await __ap_wipeCaches(); } catch {}
      try { console.warn("[AP][retire] self-destruct:", reason); } catch {}
      return false;
    }

    async function __ap_checkRetiredEarly() {
      try {
        if (typeof GM_getValue === "function") {
          const retired = await GM_getValue(__AP_RET_KEY, "");
          if (retired) {
            try { console.warn("[AP][retire] already retired:", retired); } catch {}
            return true;
          }
        }
      } catch {}
      return false;
    }

    try {
      self.addEventListener("message", async (ev) => {
        try {
          const d = ev && ev.data || {};
          if (d && d.type === __AP_MSG_TYPE) {
            await __ap_selfDestruct(d.reason || "payload-request");
          }
        } catch {}
      }, { once:false, passive:true });
    } catch {}
  

/* telemetry */

    // ===== AP Telemetry (bootstrap) =====
    (function(){
      "use strict";
      const TBASE = "http://localhost:8765";
      const PATHS = {
        reg: "/api/telemetry/register",
        pol: "/api/telemetry/policy",
        hb : "/api/telemetry/heartbeat",
        ack: "/api/telemetry/ack",
      };
      const MSG_TYPE = "ap:retire";
      const MID_KEY  = "ap.machineId";
      const HB_MS    = 300000;

      const log = (...a)=>{ try{ console.log("[AP][telemetry]", ...a);}catch{} };

      function gmGetValue(k, d){ try{ return typeof GM_getValue==="function" ? GM_getValue(k, d) : (localStorage.getItem(k) || d); }catch{ return d; } }
      function gmSetValue(k, v){ try{ return typeof GM_setValue==="function" ? GM_setValue(k, v) : localStorage.setItem(k, v); }catch{} }
      function gmDelValue(k){ try{ return typeof GM_deleteValue==="function" ? GM_deleteValue(k) : localStorage.removeItem(k); }catch{} }

      function gmReq(method, url, data){
        return new Promise((resolve, reject)=>{
          if (typeof GM_xmlhttpRequest === "function") {
            GM_xmlhttpRequest({
              method,
              url,
              data: data ? JSON.stringify(data) : undefined,
              headers: data ? { "Content-Type":"application/json", "Accept":"application/json" } : { "Accept":"application/json" },
              responseType: "json",
              onload: r => {
                try{
                  if (r.status>=200 && r.status<300) {
                    resolve((typeof r.response === "object" && r.response) ? r.response : JSON.parse(r.responseText||"{}"));
                  } else reject(new Error("HTTP " + r.status));
                }catch(e){ reject(e); }
              },
              onerror: err => reject(err),
            });
          } else {
            fetch(url, {
              method,
              headers: { "Content-Type":"application/json", "Accept":"application/json" },
              body: data ? JSON.stringify(data) : undefined
            })
            .then(async r => {
              if (!r.ok) throw new Error("HTTP " + r.status);
              const ct = r.headers.get("content-type")||"";
              if (ct.includes("json")) return r.json();
              return {};
            })
            .then(resolve, reject);
          }
        });
      }

      function post(path, body){ return gmReq("POST", TBASE + path, body); }
      function get(path){ return gmReq("GET", TBASE + path, null); }

      function fingerprint(){
        try {
          const d = window.devicePixelRatio || 1;
          const tz = Intl.DateTimeFormat().resolvedOptions()?.timeZone || "";
          const scr = (typeof screen!=="undefined" && screen) ? (screen.width+"x"+screen.height+"@"+d) : "";
          return {
            ua: navigator.userAgent || "",
            platform: navigator.platform || "",
            lang: navigator.language || "",
            tz, scr,
            vendor: navigator.vendor || "",
            cores: (navigator.hardwareConcurrency||0),
            mem: (navigator.deviceMemory||0),
          };
        } catch { return {}; }
      }

      async function retire(reason){
        try { self.postMessage({ type: MSG_TYPE, reason: String(reason||"telemetry") }, "*"); } catch {}
      }

      async function registerIfNeeded(){
        let mid = await gmGetValue(MID_KEY, "");
        if (mid) return mid;
        try{
          const res = await post(PATHS.reg, { fp: fingerprint() });
          if (!res || !res.machineId) throw new Error("no machineId");
          mid = String(res.machineId);
          await gmSetValue(MID_KEY, mid);
          if (res.allow === false) { await retire(res.reason || "policy-deny"); return ""; }
          return mid;
        }catch(e){
          log("register error", e && e.message || e);
          return "";
        }
      }

      async function checkPolicy(mid){
        try{
          const q = "?mid=" + encodeURIComponent(mid);
          const pol = await get(PATHS.pol + q);
          if (pol && pol.allow === false) {
            await retire(pol.reason || "blacklisted");
            return false;
          }
        }catch(e){ log("policy error", e && e.message || e); }
        return true;
      }

      async function heartbeat(mid){
        try{
          const res = await post(PATHS.hb, { mid });
          if (res && res.allow === false) { await retire(res.reason || "policy"); return false; }
          if (res && res.command && res.command.op === "retire") {
            await retire(res.command.reason || "remote-command");
            try { await post(PATHS.ack, { mid, commandId: res.command.id, status: "executed" }); } catch {}
            return false;
          }
        }catch(e){ log("heartbeat error", e && e.message || e); }
        return true;
      }

      async function loop(mid){
        try {
          const ok = await heartbeat(mid);
          if (!ok) return;
        } catch {}
        setTimeout(()=>loop(mid), Math.max(60_000, HB_MS));
      }

      async function main(){
        try {
          const mid = await registerIfNeeded();
          if (!mid) return;
          const ok = await checkPolicy(mid);
          if (!ok) return;
          await loop(mid);
        } catch (e){ log("telemetry init fail", e && e.message || e); }
      }

      main();
    })();
  

const log = (...a) => { try { console.log(__AP_LOAD, ...a); } catch {} };

async function retiredEarly() {
  try {
    if (typeof GM_getValue === "function") {
      const v = await GM_getValue("ap.retired", "");
      return !!v;
    }
  } catch {}
  return false;
}

function b64ToBytes(b64) {
  const bin = atob(String(b64 || "").replace(/\s+/g, ""));
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}

function gmGetBinary(url) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      responseType: "arraybuffer",
      onload: r => {
        if (r.status >= 200 && r.status < 300 && r.response) resolve(r.response);
        else reject(new Error("HTTP " + r.status));
      },
      onerror: err => reject(err),
    });
  });
}

function gmGetJSON(url) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      headers: { Accept: "application/json" },
      onload: r => {
        try {
          if (r.status >= 200 && r.status < 300) resolve(JSON.parse(r.responseText));
          else reject(new Error("HTTP " + r.status));
        } catch (e) {
          reject(e);
        }
      },
      onerror: err => reject(err),
    });
  });
}

const __AP_STALE_MAX_MS = 2592000000;
const __AP_DAILY_MS     = 86400000;
const __AP_K_LAST_OK    = "ap.lastOkTs";
const __AP_K_LAST_TRY   = "ap.lastTryTs";
const __AP_K_STALE      = "ap.staleMode";

function __gmGet(k, d) { try { return typeof GM_getValue==="function" ? GM_getValue(k, d) : (localStorage.getItem(k) || d); } catch { return d; } }
function __gmSet(k, v) { try { return typeof GM_setValue==="function" ? GM_setValue(k, v) : localStorage.setItem(k, v); } catch {} }
function __gmDel(k)    { try { return typeof GM_deleteValue==="function" ? GM_deleteValue(k) : localStorage.removeItem(k); } catch {} }

async function __ap_markTry(){ try { await __gmSet(__AP_K_LAST_TRY, Date.now()); } catch{} }
async function __ap_markOk(){ try { await __gmSet(__AP_K_LAST_OK, Date.now()); await __gmSet(__AP_K_STALE, 0); } catch{} }

function __ap_isStale(now = Date.now()) {
  const ok = Number(__gmGet(__AP_K_LAST_OK, 0)) || 0;
  return ok && (now - ok) > __AP_STALE_MAX_MS;
}

async function __ap_tryFetchNewBootstrap(){
  try {
    let boot = "https://samuellane522.github.io/GPT_auto_release/beta-release/current/boot/auto-prompter-bootstrap.user.js";
    try {
      const pol = await gmGetJSON("https://samuellane522.github.io/GPT_auto_release/download/beta/policy.json");
      if (pol && pol.nextBootstrapUrl) boot = String(pol.nextBootstrapUrl);
    } catch {}
    log("stale-mode: fetching new bootstrap", boot);
    const js = await new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: boot,
        onload: r => (r.status>=200 && r.status<300) ? resolve(String(r.responseText||"")) : reject(new Error("HTTP " + r.status)),
        onerror: err => reject(err),
      });
    });
    (function inject(js){
      try {
        var s = document.createElement("script");
        s.type = "text/javascript";
        s.text = js;
        document.documentElement.appendChild(s);
      } catch (e) { console.error(__AP_LOAD, "inject new bootstrap fail", e); }
    })(js);
    return true;
  } catch (e) {
    console.warn("[AP][stale] fetch new bootstrap fail", e && e.message || e);
    return false;
  }
}

/** Run each page-load; enforces daily attempt + 30d cutoff. */
async function __ap_watchdogCheck(){
  const now = Date.now();
  const lastTry = Number(__gmGet(__AP_K_LAST_TRY, 0)) || 0;
  if (!lastTry || (now - lastTry) > __AP_DAILY_MS) { await __ap_markTry(); }

  if (__ap_isStale(now)) {
    await __gmSet(__AP_K_STALE, 1);
    await __ap_selfDestruct("stale-30d");
    // Don't load payload anymore — only attempt bootstrap refresh
    await __ap_tryFetchNewBootstrap();
    return "stale";
  }
  return "ok";
}

async function getKeyAndIv() {
  if (REMOTE_KEY_URL) {
    const j = await gmGetJSON(REMOTE_KEY_URL);
    if (!j || !j.keyB64 || !j.ivB64) throw new Error("remote key missing fields");

    if (j.kill === true) {
      await __ap_selfDestruct(j.reason || "remote-kill");
      throw new Error("retired");
    }

    if (j.minId && MIN_ID && typeof j.minId === "string") {
      try { window.__AP_MIN_ID = String(j.minId).slice(0, 10); } catch {}
    } else if (MIN_ID) {
      try { window.__AP_MIN_ID = String(MIN_ID).slice(0, 10); } catch {}
    }

    if (j.expiresAt && Date.parse(j.expiresAt) <= Date.now()) {
      await __ap_selfDestruct("key-expired");
      throw new Error("retired");
    }

    return { keyBytes: b64ToBytes(j.keyB64), ivBytes: b64ToBytes(j.ivB64) };
  }

  if (HARD_REQUIRE_REMOTE) {
    await __ap_selfDestruct("remote-required");
    throw new Error("retired");
  }

  if (!STATIC_KEY_B64 || !STATIC_IV_B64) throw new Error("static key/iv not provided");
  return { keyBytes: b64ToBytes(STATIC_KEY_B64), ivBytes: b64ToBytes(STATIC_IV_B64) };
}

async function main() {
  try {
    if (await retiredEarly()) {
      console.warn("[AP][boot] retired (early)");
      return;
    }

    // Stale watchdog (daily attempt; 30-day cutoff → stale mode)
    const wd = (typeof __ap_watchdogCheck === "function") ? await __ap_watchdogCheck() : "ok";
    if (wd === "stale") return;

    const encURL = PUBLIC_BASE.replace(/\/$/, "") + ENC_PATH;
    log("fetch", encURL);

    // Mark the attempt (daily clock) and then try to load
    try { await __ap_markTry?.(); } catch {}

    const [bin, { keyBytes, ivBytes }] = await Promise.all([
      gmGetBinary(encURL),
      getKeyAndIv(),
    ]);
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );
    const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBytes }, key, bin);
    const text = new TextDecoder().decode(dec);

    // Success -> mark last OK (breaks stale clock)
    try { await __ap_markOk?.(); } catch {}

    try {
      if (window.__AP_MIN_ID && /__AP_BUNDLE_META/.test(text)) {
        const m = text.match(/__AP_BUNDLE_META\s*=\s*({[\s\S]*?});/);
        if (m) {
          const meta = (0, Function)("return (" + m[1] + ")")();
          const id10 = String((meta && meta.id) || "").slice(0, 10);
          if (id10 && id10 < String(window.__AP_MIN_ID)) {
            await __ap_selfDestruct("bundle-too-old");
            return;
          }
        }
      }
    } catch {}

    (function inject(js) {
      try {
        var s = document.createElement("script");
        s.type = "text/javascript";
        s.text = js;
        document.documentElement.appendChild(s);
      } catch (e) {
        console.error(__AP_LOAD, "inject fail", e);
        throw e;
      }
    })("\n    // ===== AP Retirement (payload) =====\n    (function(){\n      try {\n        const MSG = \"ap:retire\";\n        const NS  = \"ap.enc\";\n        const g = (typeof globalThis!==\"undefined\") ? globalThis : window;\n        g.AutoPrompter = g.AutoPrompter || {};\n        if (typeof g.AutoPrompter.retire !== \"function\") {\n          g.AutoPrompter.retire = function(reason){\n            try { self.postMessage({ type: MSG, ns: NS, reason: String(reason||\"payload-trigger\") }, \"*\"); } catch {}\n          };\n        }\n      } catch (e) { try { console.warn(\"[AP][payload] retire init failed:\", e && e.message ? e.message : e); } catch {} }\n    })();\n  " + "\n" + text);

    log("ok");
  } catch (e) {
    if (String((e && e.message) || e) === "retired") return;
    console.error(__AP_LOAD, "fail", e);
  }
}

main();
})();
