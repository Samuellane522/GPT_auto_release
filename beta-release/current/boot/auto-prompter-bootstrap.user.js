// ==UserScript==
  // @name         Auto Prompter (BOOT)
  // @namespace    ap.boot
  // @version      0.1.0
  // @description  Bootstrap loader for encrypted bundle
  // @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
  // @run-at       document-start
  // @grant        GM_xmlhttpRequest
  // @grant        GM_addElement
  // @connect      samuellane522.github.io
  // ==/UserScript==

  (function () {
    "use strict";
    const __AP_LOAD = "[AP][boot]";
    const PUBLIC_BASE = "https://samuellane522.github.io/GPT_auto_release";
    const ENC_PATH = "/download/beta/auto-prompter-enc.bin";
    const REMOTE_KEY_URL = "https://samuellane522.github.io/GPT_auto_release/download/beta/key.json";
    const STATIC_KEY_B64 = "";
    const STATIC_IV_B64  = "";

    const log = (...a) => console.log(__AP_LOAD, ...a);

    function b64ToBytes(b64) {
      const bin = atob(b64.replace(/\s+/g, ""));
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
          headers: { "Accept": "application/json" },
          onload: r => {
            try {
              if (r.status >= 200 && r.status < 300) resolve(JSON.parse(r.responseText));
              else reject(new Error("HTTP " + r.status));
            } catch (e) { reject(e); }
          },
          onerror: err => reject(err),
        });
      });
    }

    async function getKeyAndIv() {
      if (REMOTE_KEY_URL) {
        const j = await gmGetJSON(REMOTE_KEY_URL);
        if (!j || !j.keyB64 || !j.ivB64) throw new Error("remote key missing fields");
        return { keyBytes: b64ToBytes(j.keyB64), ivBytes: b64ToBytes(j.ivB64) };
      }
      if (!STATIC_KEY_B64 || !STATIC_IV_B64) throw new Error("static key/iv not provided");
      return { keyBytes: b64ToBytes(STATIC_KEY_B64), ivBytes: b64ToBytes(STATIC_IV_B64) };
    }

    async function main() {
      try {
        const encURL = PUBLIC_BASE.replace(/\/$/, "") + ENC_PATH;
        log("fetch", encURL);
        const [bin, { keyBytes, ivBytes }] = await Promise.all([gmGetBinary(encURL), getKeyAndIv()]);
        const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
        const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBytes }, key, bin);
        const text = new TextDecoder().decode(dec);
        const s = document.createElement("script");
        s.type = "text/javascript";
        s.textContent = text;
        document.documentElement.appendChild(s);
        log("ok");
      } catch (e) {
        console.error(__AP_LOAD, "fail", e);
      }
    }

    main();
  })();
