// ==UserScript==
// @name         Auto Prompter (OBF)
// @namespace    ap.local
// @version      dev-cb602a15e7-obf
// @description  ChatGPT Auto Prompter build
// @author       Auto Prompter
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @run-at       document-idle
// @noframes
// @inject-into  content
// @grant        GM_addStyle
// ==/UserScript==
/* ap userscript bundle (iife) */
(function(){
"use strict";
// Bundled by AP dev server at 2025-10-21T01:13:54.860Z
// Tip: inspect window.__AP_LOAD (order) and window.__AP_BUNDLE_META (stats)

/* ===== AP RUNTIME PRELUDE (bundle, modular) ===== */
;(function(){
  try {
    var g = (typeof globalThis !== "undefined") ? globalThis : window;


    // --- Stable root + sticky assign that merges instead of replaces ---
    var __AP_ROOT__ = (g.AutoPrompter && typeof g.AutoPrompter === "object") ? g.AutoPrompter : {};
    try {
      Object.defineProperty(g, "AutoPrompter", {
        configurable: true,
        get: function(){ return __AP_ROOT__; },
        set: function(v){
          if (v && typeof v === "object" && v !== __AP_ROOT__) {
            for (var k in v) if (Object.prototype.hasOwnProperty.call(v, k)) {
              __AP_ROOT__[k] = v[k];
            }
          }
        }
      });
    } catch { g.AutoPrompter = __AP_ROOT__; }

    var APNS = g.AutoPrompter;
    g.AP = g.AP || APNS; // legacy alias

    // --- cp() breadcrumbs ---
    if (typeof APNS.cp !== "function") {
      APNS.cp = function(event, payload){
        try { (console.debug || console.log).call(console, "[AP][cp]", event, payload || {}); } catch {}
      };
    }

    // --- Logger stub (safe early) ---
    if (!APNS.logger || typeof APNS.logger.addSink !== "function") {
      var stub = {
        __is_ap_stub: true,
        addSink: function(){}, removeSink: function(){},
        setLevel: function(){}, getLevel: function(){ return "info"; },
        debug: function(){ (console.debug || console.log).apply(console, arguments); },
        log:   function(){ console.log.apply(console, arguments); },
        info:  function(){ console.log.apply(console, arguments); },
        warn:  function(){ console.warn.apply(console, arguments); },
        error: function(){ console.error.apply(console, arguments); },
        with:  function(){ return this; }, child: function(){ return this; },
        sinksCount: function(){ return 0; }
      };
      APNS.__LOGGER_IS_STUB__ = true;
      APNS.logger = stub;
      g.AP = g.AP || APNS;
      g.AP.logger = APNS.logger;
    }
  


    // --- Default selector config (tiny) ---
    (function(){
      var DEFAULT_CFG = {
        selectors: {
          input: 'textarea[name="prompt-textarea"], .ProseMirror[contenteditable="true"], #prompt-textarea.ProseMirror[contenteditable="true"]',
          send:  '#composer-submit-button, [data-testid="send-button"]:not([disabled]):not([aria-disabled="true"]), button[aria-label="Send message"]:not([disabled]):not([aria-disabled="true"]), button[aria-label="Send prompt"]:not([disabled]):not([aria-disabled="true"])',
          stop:  '[data-testid="stop-button"], button[aria-label="Stop generating"]'
        },
        postSend: { timeoutMs: 9000, pollMs: 120 }
      };
      function merge(a,b){
        var out={}; for (var k in a) out[k]=a[k];
        if (b && typeof b === "object") {
          if (b.selectors) out.selectors = Object.assign({}, a.selectors, b.selectors);
          if (b.postSend)  out.postSend  = Object.assign({}, a.postSend,  b.postSend);
        }
        return out;
      }
      g.__AP_CFG = merge(DEFAULT_CFG, (g.__AP_CFG||{}));

      if (!APNS.detectCoreConfig) APNS.detectCoreConfig = {};
      if (typeof APNS.detectCoreConfig.getSelectors !== "function"){
        APNS.detectCoreConfig.getSelectors = function(){
          var cfg = g.__AP_CFG || DEFAULT_CFG;
          var toArr = function(str){ return String(str||"").split(",").map(function(s){return s.trim();}).filter(Boolean); };
          return {
            INPUT_SELECTORS: toArr(cfg.selectors.input),
            SEND_SELECTORS:  toArr(cfg.selectors.send),
            STOP_SELECTORS:  toArr(cfg.selectors.stop)
          };
        };
      }
    })();
  


    // --- Minimal deep query (1-level shadow) ---
    (function(){
      if (!APNS.domQuery) APNS.domQuery = {};
      if (typeof APNS.domQuery.qsDeep !== "function"){
        APNS.domQuery.qsDeep = function(selector, root){
          root = root || document;
          try { var el = root.querySelector(selector); if (el) return el; } catch {}
          var nodes = root.querySelectorAll("*");
          for (var i=0;i<nodes.length;i++){
            var n = nodes[i];
            if (n && n.shadowRoot){
              try { var s = n.shadowRoot.querySelector(selector); if (s) return s; } catch {}
            }
          }
          return null;
        };
      }
    })();
  


    // --- Tiny detect cache ---
    (function(){
      if (!APNS.detectCache) {
        var _val = null, _ts = 0, TTL = 2500;
        APNS.detectCache = {
          get: function(){
            return (_val && _val.input && _val.input.isConnected && (Date.now()-_ts)<TTL) ? _val : null;
          },
          set: function(x){ _val = x; _ts = Date.now(); }
        };
      }
    })();
  


    // --- IO (light): value facade + senders signature ---
    (function(){
      if (!APNS.io) APNS.io = {};

      if (!APNS.io.value) {
        APNS.io.value = {
          __v: "0.4.1",
          set: function(text){
            try {
              var picker = (function(){
                var sels = (g.__AP_CFG && g.__AP_CFG.selectors && g.__AP_CFG.selectors.input) || "";
                var list = String(sels).split(",").map(function(s){return s.trim();}).filter(Boolean);
                for (var i=0;i<list.length;i++){
                  try { var el = document.querySelector(list[i]); if (el && el.offsetParent !== null) return {el:el, kind:(el.tagName && el.tagName.toLowerCase()==="textarea"?"textarea":"contenteditable")}; } catch {}
                }
                return null;
              })();
              if (!picker) {
                try{ console.warn("[AP io:value] no input element matched"); }catch{}
                return false;
              }
              var s = String(text == null ? "" : text);
              if (picker.kind === "textarea") {
                var el = picker.el; el.focus(); el.value = s;
                try { el.dispatchEvent(new Event("input", { bubbles:true })); } catch {}
                try { el.dispatchEvent(new Event("change",{ bubbles:true })); } catch {}
                return true;
              } else {
                picker.el.textContent = s;
                try { picker.el.dispatchEvent(new Event("input",{bubbles:true})); } catch {}
                return true;
              }
            } catch { return false; }
          },
          append: function(text){
            try { return this.set((this.get() || "") + String(text == null ? "" : text)); } catch { return false; }
          },
          get: function(){
            try {
              var sels = (g.__AP_CFG && g.__AP_CFG.selectors && g.__AP_CFG.selectors.input) || "";
              var list = String(sels).split(",").map(function(s){return s.trim();}).filter(Boolean);
              for (var i=0;i<list.length;i++){
                var el = document.querySelector(list[i]);
                if (el && el.offsetParent !== null) {
                  return (el.tagName && el.tagName.toLowerCase()==="textarea") ? String(el.value || "") : String((el.textContent || "").trim());
                }
              }
            } catch {}
            return "";
          },
          clear: function(){ return this.set(""); }
        };
        try { console.info("[AP io:value] ready", { v: APNS.io.value.__v }); } catch {}
      }

      if (!APNS.io.senders) {
        APNS.io.senders = {
          __v: "1.3.0",
          send: function(){
            try {
              var sels = (g.__AP_CFG && g.__AP_CFG.selectors && g.__AP_CFG.selectors.send) || "";
              var list = String(sels).split(",").map(function(s){return s.trim();}).filter(Boolean);
              for (var i=0;i<list.length;i++){
                var btn = document.querySelector(list[i]);
                if (btn && btn.offsetParent !== null && !btn.disabled && btn.getAttribute("aria-disabled")!=="true") {
                  try { btn.click(); return true; } catch {}
                }
              }
              try { console.warn("[AP io:send] no clickable send matched", { selectors: sels }); } catch {}
            } catch {}
            // Enter fallback
            try {
              var inputStr = (g.__AP_CFG && g.__AP_CFG.selectors && g.__AP_CFG.selectors.input) || "";
              var els = String(inputStr).split(",").map(function(s){return s.trim();}).filter(Boolean);
              for (var j=0;j<els.length;j++){
                var el = document.querySelector(els[j]);
                if (el && el.offsetParent !== null) {
                  var kd = new KeyboardEvent("keydown", { key:"Enter", code:"Enter", which:13, keyCode:13, bubbles:true, cancelable:true });
                  var ku = new KeyboardEvent("keyup",   { key:"Enter", code:"Enter", which:13, keyCode:13, bubbles:true, cancelable:true });
                  el.dispatchEvent(kd); el.dispatchEvent(ku);
                  return true;
                }
              }
              try { console.warn("[AP io:send] enter-fallback failed to find input", { selectors: inputStr }); } catch {}
            } catch {}
            return false;
          },
          postSendBarrier: async function(opts){
            var timeoutMs = (opts && opts.timeoutMs) || ((g.__AP_CFG && g.__AP_CFG.postSend && g.__AP_CFG.postSend.timeoutMs) || 9000);
            var pollMs    = (opts && opts.pollMs)    || ((g.__AP_CFG && g.__AP_CFG.postSend && g.__AP_CFG.postSend.pollMs) || 120);
            var start = performance.now();
            var userBubbleSel = '[data-message-author="user"], [data-testid="conversation-turn"] [data-testid="user"]';
            var baseCount = (document.querySelectorAll(userBubbleSel) || []).length;
            while (performance.now() - start < timeoutMs) {
              if (document.querySelector((g.__AP_CFG && g.__AP_CFG.selectors && g.__AP_CFG.selectors.stop) || "")) return "streaming";
              if ((document.querySelectorAll(userBubbleSel) || []).length > baseCount) return "sent:user-bubble";
              var txt = APNS.io && APNS.io.value && typeof APNS.io.value.get === "function" ? String(APNS.io.value.get()||"").trim() : "";
              if (!txt) return "sent:input-cleared";
              await new Promise(function(r){ setTimeout(r, pollMs); });
            }
            try { console.warn("[AP io:send] postSend timeout", { timeoutMs: timeoutMs, baseCount: baseCount }); } catch {}
            throw new Error("post-send timeout");
          },
          sendAndWait: async function(opts){ this.send(); return await this.postSendBarrier(opts); }
        };
        try { console.info("[AP io:senders] ready", { v: APNS.io.senders.__v }); } catch {}
      }
    })();
  


    // --- Early detectSafeFind stub (no dependencies) ---
    (function(){
      APNS.detectSafeFind = APNS.detectSafeFind || {};
      if (typeof APNS.detectSafeFind.findComposerSafe !== "function"){
        function pickFirstMatching(arr, root, deepQS){
          if (!Array.isArray(arr)) return null;
          for (var i=0;i<arr.length;i++){
            var sel = arr[i];
            try {
              var el = deepQS ? deepQS(sel, root) : root.querySelector(sel);
              if (el) return el;
            } catch {}
          }
          return null;
        }
        function manualFind(){
          try {
            var getSel = APNS.detectCoreConfig && APNS.detectCoreConfig.getSelectors;
            var S = (typeof getSel === "function" ? getSel() : { INPUT_SELECTORS:[], SEND_SELECTORS:[] }) || {};
            var deepQS = APNS.domQuery && APNS.domQuery.qsDeep;
            var inputEl = pickFirstMatching(S.INPUT_SELECTORS, document, deepQS);
            var sendEl  = pickFirstMatching(S.SEND_SELECTORS,  document, deepQS);
            try { 
              console.info("[AP detect] manualFind", { input:Boolean(inputEl), send:Boolean(sendEl), deep:Boolean(deepQS), inputSelCount:(S.INPUT_SELECTORS||[]).length, sendSelCount:(S.SEND_SELECTORS||[]).length });
              APNS.cp("composer:safeFind:prelude:manual", { input:!!inputEl, send:!!sendEl, deep:!!deepQS });
            } catch {}
            return { input: inputEl || null, send: sendEl || null };
          } catch {
            return { input: null, send: null };
          }
        }
        APNS.__manualFindFromPrelude = manualFind;
        APNS.detectSafeFind.findComposerSafe = function(){
          try {
            var cached = APNS.detectCache && APNS.detectCache.get && APNS.detectCache.get();
            if (cached) { try{ APNS.cp("composer:safeFind:cache:hit"); }catch{} return Promise.resolve(cached); }
          } catch {}
          var res = manualFind();
          try { APNS.detectCache && APNS.detectCache.set && APNS.detectCache.set(res); } catch {}
          if (!res || !res.input || !res.send) {
            try {
              var cfg = (window.__AP_CFG || { selectors:{} });
              console.warn("[AP detect] composer not found", { cfgSelectors: cfg.selectors || {}, ready: String(document && document.readyState) });
            } catch {}
          }
          return Promise.resolve(res);
        };
      }
    })();
  


    // --- Global guards so early errors surface clearly ---
    try {
      g.addEventListener("error", function(ev){
        try { console.warn("[AP][bundle] window.onerror:", ev.message, ev.error); } catch {}
      });
      g.addEventListener("unhandledrejection", function(ev){
        try { if (typeof ev.preventDefault === "function") ev.preventDefault(); } catch {}
        try { console.warn("[AP][bundle] unhandledrejection:", ev.reason); } catch {}
      });
    } catch {}
  


    APNS.__AP_PRELUDE__ = { ok:true, ts: Date.now(), v: "mod-1.0.0" };
  

  } catch (e) {
    try { console.warn("[AP][prelude] failed:", e && e.message ? e.message : e); } catch {}
  }
})();;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("logging/core/checkpoint.js");

/* ===== logging/core/checkpoint.js ===== */
(function(){var __AP_MOD="/logging/core/checkpoint.js";try{
// logging/core/checkpoint.js
// Lightweight, idempotent client checkpoint helper.
// NOTE: We intentionally do NOT @require the generated bundle or non-JS assets.
// If you want audit-only pulls, route them via a resource loader without executing.

(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  window.AP = window.AP || AP;

  if (typeof AP.cp === "function") return; // already present

  AP.cp = function cp(event, payload) {
    try {
      const msg = `[cp] ${String(event || "")}`;
      const data =
        payload && typeof payload === "object"
          ? payload
          : payload == null
          ? {}
          : { payload };

      // Prefer our logger if ready; fall back to console
      if (AP.logger && typeof AP.logger.info === "function") {
        AP.logger.info(msg, data);
      } else {
        (console.info || console.log).call(console, "[AP]", msg, data);
      }

      // Optional local dev mirror (kept very safe/no-op unless enabled)
      const force = localStorage.getItem("ap_log_mirror_force") === "1";
      const isLocal =
        location.hostname === "localhost" ||
        location.hostname === "127.0.0.1" ||
        location.hostname.endsWith(".local");
      const enabled =
        (isLocal || force) && localStorage.getItem("ap_mirror_logs") !== "0";
      const sink =
        enabled &&
        (localStorage.getItem("ap_log_sink") ||
          "http://localhost:8765/__ap/log");

      if (sink && navigator.sendBeacon) {
        try {
          const blob = new Blob(
            [
              JSON.stringify({
                level: "info",
                area: "cp",
                event: String(event || ""),
                payload: data,
                t: Date.now(),
              }),
            ],
            { type: "application/json" }
          );
          navigator.sendBeacon(sink, blob);
        } catch {}
      }
    } catch {}
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("logging/core/constants.js");

/* ===== logging/core/constants.js ===== */
(function(){var __AP_MOD="/logging/core/constants.js";try{
// logging/core/constants.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.logging = AP.logging || {};

  if (AP.logging.constants) return;

  const LEVELS = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40 });
  const LS_LEVEL_KEY = "ap_log_level";

  AP.logging.constants = { LEVELS, LS_LEVEL_KEY };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("logging/core/utils.js");

/* ===== logging/core/utils.js ===== */
(function(){var __AP_MOD="/logging/core/utils.js";try{
// logging/core/utils.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.logging = AP.logging || {};
  if (AP.logging.utils && AP.logging.utils.__v2_has_callsite) return;

  function safeReplacer() {
    const seen = new WeakSet();
    return function (_k, v) {
      if (typeof v === "object" && v !== null) {
        if (seen.has(v)) return "[Circular]";
        seen.add(v);
      }
      if (typeof v === "function") return `[Function ${v.name || "anonymous"}]`;
      if (typeof Node !== "undefined" && v instanceof Node)
        return `[Node <${v.nodeName}>]`;
      return v;
    };
  }

  function fmtAny(x) {
    if (x instanceof Error) return `${x.name}: ${x.message}\n${x.stack || ""}`;
    if (typeof x === "object" && x !== null) {
      try {
        return JSON.stringify(x, safeReplacer(), 2);
      } catch {
        try {
          return String(x);
        } catch {
          return "[object]";
        }
      }
    }
    try {
      return String(x);
    } catch {
      return "[unprintable]";
    }
  }

  function isoClock() {
    try {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      const ms = String(d.getMilliseconds()).padStart(3, "0");
      return `${hh}:${mm}:${ss}.${ms}`;
    } catch {
      return String(Date.now());
    }
  }

  // ---- Callsite helpers (new) ---------------------------------------------

  function basename(p) {
    try {
      return (
        String(p)
          .split(/[\/\\]/)
          .pop() || String(p)
      );
    } catch {
      return String(p);
    }
  }

  // Parse a JS stack into frames: { fn, file, line, col }
  function parseStackFrames(stack) {
    if (!stack) return [];
    const frames = [];
    const lines = String(stack).split("\n");
    for (const raw of lines) {
      const s = raw.trim();
      // V8 / Chrome: "at fn (url:line:col)" or "at url:line:col"
      let m =
        /^at\s+(?:(.*?)\s+\()?(.*?):(\d+):(\d+)\)?$/.exec(s) ||
        // Firefox / Safari: "fn@url:line:col"
        /^(.*?)@(.+?):(\d+):(\d+)$/.exec(s);
      if (m) {
        const fn = (m[1] || "").trim() || null;
        const file = (m[2] || "").trim();
        const line = Number(m[3] || 0) || null;
        const col = Number(m[4] || 0) || null;
        if (file) frames.push({ fn, file, line, col });
      }
    }
    return frames;
  }

  // Return the first app frame, skipping logger internals
  function firstAppFrameFromStack(stack) {
    const frames = parseStackFrames(stack);
    if (!frames.length) return null;

    const skip = [
      /\/logging\/core\/(?:emit|utils|sinkbus|constants)\.js/i,
      /\/logging\/logger\/index\.js/i,
      /\/logging\/logger\.js/i,
      /\/logging\/boot-shims\.js/i,
      /\/logging\/uiPanel\.js/i,
      /\/logging\/uiPosition\.js/i,
      /\/auto-prompter\/logging\//i,
    ];

    for (const f of frames) {
      if (skip.every((rx) => !rx.test(f.file))) return f;
    }
    // Fallback: last frame if everything looked internal
    return frames[frames.length - 1] || null;
  }

  function getCurrentCallsite() {
    try {
      const e = new Error();
      if (!e || !e.stack) return null;
      return firstAppFrameFromStack(e.stack);
    } catch {
      return null;
    }
  }

  AP.logging.utils = {
    safeReplacer,
    fmtAny,
    isoClock,
    basename,
    parseStackFrames,
    firstAppFrameFromStack,
    getCurrentCallsite,
    __v2_has_callsite: true,
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("logging/core/sinkbus.js");

/* ===== logging/core/sinkbus.js ===== */
(function(){var __AP_MOD="/logging/core/sinkbus.js";try{
// logging/core/sinkBus.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.logging = AP.logging || {};
  if (AP.logging.makeSinkBus) return;

  AP.logging.makeSinkBus = function makeSinkBus() {
    const sinks = new Set();
    function add(fn) {
      if (typeof fn === "function") sinks.add(fn);
      return () => sinks.delete(fn);
    }
    function remove(fn) {
      sinks.delete(fn);
    }
    function broadcast(line, meta) {
      for (const s of sinks) {
        try {
          s(line, meta);
        } catch {}
      }
    }
    function count() {
      return sinks.size;
    }
    return { add, remove, broadcast, count };
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("logging/core/emit.js");

/* ===== logging/core/emit.js ===== */
(function(){var __AP_MOD="/logging/core/emit.js";try{
// logging/core/emit.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.logging = AP.logging || {};
  if (AP.logging.makeEmitter) return;

  AP.logging.makeEmitter = function makeEmitter({
    LEVELS,
    isoClock,
    fmtAny,
    bus,
    getLevelNum,
  }) {
    function levelNameByNum(n) {
      for (const k in LEVELS)
        if (Object.prototype.hasOwnProperty.call(LEVELS, k) && LEVELS[k] === n)
          return k;
      return "info";
    }
    function shouldEmit(lvlNum) {
      return lvlNum >= getLevelNum();
    }

    function emit(level, parts, ctxMeta) {
      const lvlNum = LEVELS[level] ?? LEVELS.info;
      if (!shouldEmit(lvlNum)) return;
      const msg = parts.map(fmtAny).join(" ");
      const line = `[${isoClock()}] ${level.toUpperCase()} ${msg}`;
      const meta = {
        ts: Date.now(),
        level,
        levelNum: lvlNum,
        message: msg,
        ...(ctxMeta || null),
      };

      try {
        if (level === "error") console.error(line);
        else if (level === "warn") console.warn(line);
        else if (level === "debug")
          (console.debug || console.log).call(console, line);
        else console.log(line);
      } catch {}

      bus.broadcast(line, meta);
    }

    return { emit, levelNameByNum };
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("logging/logger/index.js");

/* ===== logging/logger/index.js ===== */
(function(){var __AP_MOD="/logging/logger/index.js";try{
// logging/logger/index.js
// Robust, idempotent logger assembly using core modules.
// Now auto-attaches callsite (file:line:col) to logs, especially errors.

(function () {
  "use strict";

  const APNS = (window.AutoPrompter = window.AutoPrompter || {});
  window.AP = window.AP || APNS;
  APNS.logging = APNS.logging || {};

  // If a real (non-stub) logger already exists, keep it.
  const existing = APNS.logger;
  const isStub =
    (existing && existing.__is_ap_stub === true) ||
    APNS.__LOGGER_IS_STUB__ === true;
  if (existing && typeof existing.addSink === "function" && !isStub) {
    window.AP.logger = existing;
    return;
  }

  // Core deps
  const C = (APNS.logging && APNS.logging.constants) || {};
  const U = (APNS.logging && APNS.logging.utils) || {};
  const makeSinkBus = APNS.logging && APNS.logging.makeSinkBus;
  const makeEmitter = APNS.logging && APNS.logging.makeEmitter;

  if (!C.LEVELS || !U.fmtAny || !U.isoClock || !makeSinkBus || !makeEmitter) {
    // Minimal safe stub
    const c = console,
      noop = function () {};
    const stub = {
      __is_ap_stub: true,
      addSink: () => noop,
      removeSink: noop,
      setLevel: noop,
      getLevel: () => "info",
      debug: (...a) => (c.debug || c.log).call(c, "[AP]", ...a),
      log: (...a) => (c.log || c.info).call(c, "[AP]", ...a),
      info: (...a) => (c.info || c.log).call(c, "[AP]", ...a),
      warn: (...a) => (c.warn || c.log).call(c, "[AP]", ...a),
      error: (...a) => (c.error || c.log).call(c, "[AP]", ...a),
      with: () => stub,
      child: () => stub,
      sinksCount: () => 0,
    };
    APNS.logger = stub;
    window.AP.logger = stub;
    APNS.__LOGGER_IS_STUB__ = true;
    try {
      (console.warn || console.log)("AP logger core missing; installed stub.");
    } catch {}
    return;
  }

  // State
  const { LEVELS, LS_LEVEL_KEY } = C;
  const bus = makeSinkBus();

  function readStoredLevel() {
    try {
      const raw = (localStorage.getItem(LS_LEVEL_KEY) || "info").toLowerCase();
      return LEVELS[raw] ?? LEVELS.info;
    } catch {
      return LEVELS.info;
    }
  }

  let currentLevel = readStoredLevel();
  const getLevelNum = () => currentLevel;

  // Wrap original emitter to append callsite
  const baseEmitter = makeEmitter({
    LEVELS,
    isoClock: U.isoClock,
    fmtAny: U.fmtAny,
    bus,
    getLevelNum,
  });

  function augmentWithCallsite(level, parts, ctxMeta) {
    // Try to find the first non-logger frame
    let cs = null;
    try {
      cs = U.getCurrentCallsite ? U.getCurrentCallsite() : null;
    } catch {}

    const meta = { ...(ctxMeta || {}) };
    if (cs) {
      if (!meta.file) meta.file = cs.file;
      if (!meta.line) meta.line = cs.line;
      if (!meta.col) meta.col = cs.col;
      if (!meta.fn && cs.fn) meta.fn = cs.fn;
    }

    // Prepend human-friendly location to the rendered line
    if (cs && cs.file && cs.line != null) {
      const pretty = `${U.basename(cs.file)}:${cs.line}${
        cs.col != null ? ":" + cs.col : ""
      }`;
      // Insert an inline location marker before the actual message
      parts = [`@${pretty} —`, ...parts];
    }
    return { parts, meta };
  }

  // Replace emit so sinks and console see location-enriched messages
  const emit = function (level, parts, ctxMeta) {
    const { parts: p2, meta } = augmentWithCallsite(level, parts, ctxMeta);
    return baseEmitter.emit(level, p2, meta);
  };

  function setLevel(lvl) {
    const key = String(lvl || "").toLowerCase();
    const n = LEVELS[key];
    if (!n) return;
    currentLevel = n;
    try {
      localStorage.setItem(LS_LEVEL_KEY, key);
    } catch {}
  }

  function levelNameByNum(n) {
    for (const k in LEVELS)
      if (Object.prototype.hasOwnProperty.call(LEVELS, k) && LEVELS[k] === n)
        return k;
    return "info";
  }

  function getLevel() {
    return levelNameByNum(currentLevel);
  }

  // Contextual child loggers; retains support for explicit {file, fn}
  function makeChild(baseCtx = {}) {
    const ctx = { ...baseCtx };
    const prefixBits = [];
    if (ctx.component) prefixBits.push(`[${ctx.component}]`);
    const fileFn =
      ctx.file && ctx.fn
        ? `(${ctx.file}:${ctx.fn})`
        : ctx.file
        ? `(${ctx.file})`
        : ctx.fn
        ? `(fn:${ctx.fn})`
        : "";
    if (fileFn) prefixBits.push(fileFn);
    const prefix = prefixBits.length ? prefixBits.join(" ") + " " : "";
    const tag = (lvl, parts) => emit(lvl, [prefix, ...parts], ctx);

    return {
      debug: (...m) => tag("debug", m),
      log: (...m) => tag("info", m),
      info: (...m) => tag("info", m),
      warn: (...m) => tag("warn", m),
      error: (...m) => tag("error", m),
      with: (more) => makeChild({ ...ctx, ...(more || {}) }),
      child: (more) => makeChild({ ...ctx, ...(more || {}) }),
    };
  }

  // Public API
  const api = {
    addSink: bus.add,
    removeSink: bus.remove,
    setLevel,
    getLevel,
    debug: (...m) => emit("debug", m),
    log: (...m) => emit("info", m),
    info: (...m) => emit("info", m),
    warn: (...m) => emit("warn", m),
    error: (...m) => emit("error", m),
    with: (ctx) => makeChild(ctx),
    child: (ctx) => makeChild(ctx),
    sinksCount: () => bus.count(),
  };

  APNS.logger = api;
  window.AP.logger = api;
  try {
    delete APNS.__LOGGER_IS_STUB__;
    if (APNS.logger) delete APNS.logger.__is_ap_stub;
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("logging/logger.js");

/* ===== logging/logger.js ===== */
(function(){var __AP_MOD="/logging/logger.js";try{
// logging/logger.js
// Back-compat shim: if the assembled logger isn't present, run index.js assembly.
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  window.AP = window.AP || AP;

  if (
    AP.logger &&
    typeof AP.logger.addSink === "function" &&
    !AP.__LOGGER_IS_STUB__
  ) {
    window.AP.logger = AP.logger;
    return;
  }

  // If index.js already executed, logger will be present. Otherwise, this file
  // exists only so legacy @require("/logging/logger.js") keeps working when the
  // real implementation lives in /logging/logger/index.js.
  // No-ops here by design.
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/prompt/parser.js");

/* ===== core/runtime/prompt/parser.js ===== */
(function(){var __AP_MOD="/core/runtime/prompt/parser.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/prompt/parser.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  // Allow replacement if a stub exists; only early-return if a *real* parser is present.
  if (
    AP.promptParser &&
    typeof AP.promptParser.parse === "function" &&
    !AP.promptParser.__isStub
  ) {
    return;
  }

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/prompt/parser.js"
    );
  } catch {}

  const VERSION = "4.4.1";

  function parse(sequence) {
    // Accept pre-parsed arrays (idempotent)
    if (Array.isArray(sequence)) return sequence;

    const text = String(sequence || "");
    const lines = text.split("\n");
    const out = [];
    let i = 0;

    const trim = (s) => (s || "").trim();
    const isComment = (s) => /^(\s*[#/;]|\/\/)/.test(s || "");

    function parseBlock() {
      const steps = [];
      while (i < lines.length) {
        const rawLine = lines[i++];
        const raw = trim(rawLine);
        if (!raw || isComment(raw)) continue;
        if (raw === "}") break;

        // pause / wait:  pause: 1000
        const pause = raw.match(/^(?:pause|wait)\s*[:\s]\s*(\d{1,7})$/i);
        if (pause) {
          steps.push({ type: "pause", ms: parseInt(pause[1], 10) });
          continue;
        }

        // until: <selector> [timeoutMs]
        const until = raw.match(/^until\s*:\s*([^\s]+)(?:\s+(\d{1,7}))?$/i);
        if (until) {
          steps.push({
            type: "until",
            selector: until[1],
            timeout: until[2] ? parseInt(until[2], 10) : 15000,
          });
          continue;
        }

        // until-gone: <selector> [timeoutMs]
        const gone = raw.match(/^until-gone\s*:\s*([^\s]+)(?:\s+(\d{1,7}))?$/i);
        if (gone) {
          steps.push({
            type: "untilGone",
            selector: gone[1],
            timeout: gone[2] ? parseInt(gone[2], 10) : 15000,
          });
          continue;
        }

        // until-text: <selector> "<text>" [timeoutMs]
        const untilText = raw.match(
          /^until-text\s*:\s*([^\s]+)\s+"([^"]+)"(?:\s+(\d{1,7}))?$/i
        );
        if (untilText) {
          steps.push({
            type: "untilText",
            selector: untilText[1],
            text: untilText[2],
            timeout: untilText[3] ? parseInt(untilText[3], 10) : 15000,
          });
          continue;
        }

        // click: <selector>
        const click = raw.match(/^click\s*:\s*(.+)$/i);
        if (click) {
          steps.push({ type: "click", selector: click[1].trim() });
          continue;
        }

        // repeat N { ... }
        const repeatLine = raw.match(/^repeat\s+(\d+)\s*\{\s*$/i);
        if (repeatLine) {
          const n = Math.max(1, parseInt(repeatLine[1], 10));
          const inner = parseBlock();
          for (let k = 0; k < n; k++) steps.push(...inner);
          continue;
        }

        // N x: message   OR   N *: message   OR   N ×: message
        const repeat = raw.match(/^(\d+)\s*(?:x|×|\*)[:\s]\s*(.+)$/i);
        if (repeat) {
          const n = Math.max(1, parseInt(repeat[1], 10));
          for (let j = 0; j < n; j++)
            steps.push({ type: "msg", text: repeat[2] });
          continue;
        }

        if (raw === "{") {
          const inner = parseBlock();
          steps.push(...inner);
          continue;
        }

        // Default = message line
        steps.push({ type: "msg", text: raw });
      }
      return steps;
    }

    i = 0;
    out.push(...parseBlock());
    return out;
  }

  AP.promptParser = { parse, __isStub: false, _version: VERSION };

  try {
    AP.boot?.cp?.("prompt:parser:ready", { version: VERSION });
  } catch {}
  try {
    // Also emit a DOM event so other boot stages can gate on this.
    window.dispatchEvent(
      new CustomEvent("ap:prompt:parser:ready", {
        detail: { version: VERSION },
      })
    );
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/prompt/engine.js");

/* ===== core/runtime/prompt/engine.js ===== */
(function(){var __AP_MOD="/core/runtime/prompt/engine.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/prompt/engine.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  // Allow replacement if a stub exists; only early-return if a *real* engine is already present.
  if (
    AP.promptEngine &&
    typeof AP.promptEngine.runAll === "function" &&
    !AP.promptEngine.__isStub
  ) {
    return;
  }

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/prompt/engine.js"
    );
  } catch {}

  const VERSION = "4.4.1";

  // Logger (module-scoped, safe fallback to console)
  const L =
    AP.logger && AP.logger.with
      ? AP.logger.with({ component: "prompt", file: "prompt/engine.js" })
      : console;

  const log = {
    debug: (...a) => (L.debug || L.log).apply(L, a),
    info: (...a) => (L.info || L.log).apply(L, a),
    warn: (...a) => (L.warn || L.log).apply(L, a),
    error: (...a) => (L.error || L.log).apply(L, a),
  };

  let aborted = false;

  function resetRun() {
    aborted = false;
  }
  function abortRun() {
    aborted = true;
  }

  // Prefer your renderer hookup; fallback is identity stringify
  const render =
    (AP.renderers && AP.renderers.renderText) || ((t) => String(t ?? ""));

  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(resolve, Math.max(0, ms | 0));
      if (signal) {
        const onAbort = () => {
          clearTimeout(t);
          reject(new DOMException("Aborted", "AbortError"));
        };
        signal.aborted
          ? onAbort()
          : signal.addEventListener("abort", onAbort, { once: true });
      }
    });
  }

  async function doPause(ms, cfg) {
    if (aborted) throw new DOMException("Aborted", "AbortError");
    const s = cfg?.signal;
    await sleep(ms, s);
  }

  async function waitForVisible(selector, timeout, cfg) {
    if (aborted) throw new DOMException("Aborted", "AbortError");
    const W =
      (AP.domWait && AP.domWait.waitForSelector) ||
      (AP.waiters && AP.waiters.waitForVisible);
    if (!W) return null;
    return await W(selector, timeout ?? 15000, 200, cfg?.signal);
  }

  async function waitForGone(selector, timeout, cfg) {
    if (aborted) throw new DOMException("Aborted", "AbortError");
    const gone = AP.waiters && AP.waiters.waitForGone;
    if (!gone) return true;
    return await gone(selector, timeout ?? 15000, 200, cfg?.signal);
  }

  async function waitForText(selector, text, timeout, cfg) {
    if (aborted) throw new DOMException("Aborted", "AbortError");
    const wt = AP.waiters && AP.waiters.waitForText;
    if (!wt) return null;
    return await wt(selector, text, timeout ?? 15000, 200, cfg?.signal);
  }

  async function doClick(selector, cfg) {
    if (aborted) throw new DOMException("Aborted", "AbortError");
    const el =
      (await waitForVisible(selector, cfg?.clickTimeout ?? 10000, cfg)) ||
      document.querySelector(selector);
    if (!el) {
      log.warn("[AP][prompt] click: element not found", { selector });
      return false;
    }
    try {
      el.scrollIntoView?.({ block: "center", inline: "nearest" });
    } catch {}
    try {
      el.click();
      return true;
    } catch (e) {
      try {
        // Fallback dispatch
        el.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true })
        );
        return true;
      } catch {}
      log.warn("[AP][prompt] click failed", {
        selector,
        err: String(e?.message || e),
      });
      return false;
    }
  }

  // Robust message sender: prefer compose.composeAndSend; fallback to manual set+send
  async function doMsg(text, idx, cfg) {
    if (aborted) throw new DOMException("Aborted", "AbortError");
    const { preIdleMs = 0, postIdleMs = 1000, retry = 2, signal } = cfg || {};
    const rendered = render(text, { index: idx });

    // Preferred path
    if (AP.compose && typeof AP.compose.composeAndSend === "function") {
      return AP.compose.composeAndSend(rendered, {
        preIdleMs,
        postIdleMs,
        retry,
        signal,
      });
    }

    // Fallback: find composer, set value, trigger send
    try {
      const found = await (AP.composerDetect?.findComposer?.({
        allowInputOnly: false,
      }) || AP.composer?.find?.({ allowInputOnly: false }));
      const input = found?.input;
      if (!input) {
        log.warn("[AP][prompt] compose fallback: composer not found");
        return false;
      }

      // value write via registry/std/CE
      try {
        if (AP.valueReg && AP.valueReg.set(input, rendered)) {
          // ok
        } else if (
          AP.senders &&
          typeof AP.senders.setInputValue === "function"
        ) {
          AP.senders.setInputValue(input, rendered);
        } else {
          input.value = rendered;
          input.dispatchEvent(
            new Event("input", { bubbles: true, cancelable: true })
          );
        }
      } catch (e) {
        log.warn("[AP][prompt] compose fallback: set value error", e);
      }

      await sleep(120, signal);

      // send via enter/submit/click
      try {
        if (AP.submitEnter?.press?.(input)) return true;
      } catch {}
      try {
        const send = found?.send;
        if (
          send &&
          (AP.submitBtn?.clickIfReady?.(send) || (send.click?.(), true))
        )
          return true;
      } catch {}
      try {
        if (AP.submitForm?.trySubmit?.(input)) return true;
      } catch {}

      log.warn("[AP][prompt] compose fallback: could not send");
      return false;
    } catch (e) {
      log.warn("[AP][prompt] compose fallback error", e);
      return false;
    }
  }

  // Steps runner
  async function runAll(stepsOrText, cfg = {}) {
    resetRun();

    // Accept either an array of steps or a string to be parsed.
    const steps = Array.isArray(stepsOrText) ? stepsOrText : parse(stepsOrText);

    const onStep = typeof cfg.onStep === "function" ? cfg.onStep : null;
    const onError = typeof cfg.onError === "function" ? cfg.onError : null;

    let i = 0;
    for (const step of steps || []) {
      if (aborted) throw new DOMException("Aborted", "AbortError");
      const type = step?.type || "msg";
      try {
        onStep && onStep(type, step, i);

        switch (type) {
          case "pause":
            await doPause(step.ms | 0, cfg);
            break;
          case "until":
            await waitForVisible(step.selector, step.timeout, cfg);
            break;
          case "untilGone":
            await waitForGone(step.selector, step.timeout, cfg);
            break;
          case "untilText":
            await waitForText(step.selector, step.text, step.timeout, cfg);
            break;
          case "click":
            await doClick(step.selector, cfg);
            break;
          case "msg":
          default:
            await doMsg(step.text ?? String(step), i, cfg);
            i++;
        }
      } catch (e) {
        log.warn("[AP][prompt] step error", {
          type,
          step,
          err: String(e?.message || e),
        });
        if (onError) onError(e, type, step, i);
        if (cfg?.failFast) throw e;
      }
    }
    return true;
  }

  // Parse proxies existing parser
  const parse = (seq) => (AP.promptParser ? AP.promptParser.parse(seq) : []);

  // Install real engine (replace any stub)
  AP.promptEngine = {
    __isStub: false,
    _version: VERSION,
    parse,
    runAll,
    resetRun,
    abortRun,
  };

  // Drain any queued runs from a previous stub.
  Promise.resolve().then(async () => {
    try {
      const q = Array.isArray(AP._promptQueue) ? AP._promptQueue.splice(0) : [];
      for (const job of q) {
        try {
          await runAll(job.stepsOrText, job.cfg);
        } catch (e) {
          log.warn("[AP][prompt] queued run error", e);
        }
      }
    } catch {}
  });

  try {
    AP.boot?.cp?.("prompt:engine:ready", { version: VERSION });
  } catch {}
  try {
    // Also emit a DOM event so other boot stages can gate on this.
    window.dispatchEvent(
      new CustomEvent("ap:prompt:engine:ready", {
        detail: { version: VERSION },
      })
    );
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("logging/mirrorSink.js");

/* ===== logging/mirrorSink.js ===== */
(function(){var __AP_MOD="/logging/mirrorSink.js";try{
// auto-prompter/logging/mirrorSink.js
(function () {
  const base = window.AutoPrompter || {};
  const logger = base.logger;
  if (!logger) return;

  const isLocal =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname.endsWith(".local");

  const force = localStorage.getItem("ap_log_mirror_force") === "1";
  const enabled =
    (isLocal || force) && localStorage.getItem("ap_mirror_logs") !== "0";
  if (!enabled) return;

  const url =
    localStorage.getItem("ap_log_sink") || "http://localhost:8765/__ap/log";

  const MIN_INTERVAL_MS = 35;
  let lastSent = 0;
  const q = [];

  function flush() {
    const now = Date.now();
    if (!q.length || now - lastSent < MIN_INTERVAL_MS) return;
    lastSent = now;
    const item = q.shift();

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(item)], {
          type: "application/json",
        });
        navigator.sendBeacon(url, blob);
      } else {
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
          keepalive: true,
          mode: "no-cors",
        }).catch(() => {});
      }
    } catch {}

    if (q.length) setTimeout(flush, MIN_INTERVAL_MS);
  }

  const dispose = logger.addSink((line, meta) => {
    q.push({
      level: meta?.level || "info",
      message: line,
      t: meta?.ts || Date.now(),
      file: meta?.file || null,
      line: meta?.line ?? null,
      col: meta?.col ?? null,
      fn: meta?.fn || null,
    });
    flush();
  });

  window.addEventListener("beforeunload", () => {
    try {
      dispose();
    } catch {}
  });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("logging/uiPosition.js");

/* ===== logging/uiPosition.js ===== */
(function(){var __AP_MOD="/logging/uiPosition.js";try{
// logging/uiPosition.js
(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.uiPosition && typeof AP.uiPosition.applyPosition === "function")
    return;

  const POS_KEY = "ap_ui_pos_v2";

  const loadPos = () => {
    try {
      return JSON.parse(localStorage.getItem(POS_KEY) || "{}");
    } catch {
      return {};
    }
  };

  const savePos = (p) => {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(p || {}));
    } catch {}
  };

  const applyPosition = (card, pos = {}) => {
    if (!card) return;
    const p = { docked: pos.docked ?? "right", top: pos.top ?? 20, ...pos };
    card.style.position = "fixed";
    card.style.top = `${Math.max(12, p.top)}px`;
    if (p.docked === "left") {
      card.style.left = `${p.left ?? 20}px`;
      card.style.right = "auto";
    } else {
      card.style.right = `${p.right ?? 20}px`;
      card.style.left = "auto";
    }
    card.classList.toggle("ap-card--hidden", !!p.hidden);
    card.classList.toggle("ap-card--collapsed", !!p.collapsed);
  };

  const toggleHidden = (card, pos = {}, val) => {
    const hidden = typeof val === "boolean" ? val : !pos.hidden;
    if (card) card.classList.toggle("ap-card--hidden", hidden);
    pos.hidden = hidden;
    savePos(pos);
  };

  const toggleCollapsed = (card, pos = {}, val) => {
    const collapsed = typeof val === "boolean" ? val : !pos.collapsed;
    if (card) card.classList.toggle("ap-card--collapsed", collapsed);
    pos.collapsed = collapsed;
    savePos(pos);
  };

  const dock = (card, pos = {}, side) => {
    pos.docked = side === "left" ? "left" : "right";
    applyPosition(card, pos);
    savePos(pos);
  };

  AP.uiPosition = {
    POS_KEY,
    loadPos,
    savePos,
    applyPosition,
    makeDraggable: () => {},
    toggleHidden,
    toggleCollapsed,
    dock,
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("logging/uiPanel.js");

/* ===== logging/uiPanel.js ===== */
(function(){var __AP_MOD="/logging/uiPanel.js";try{
// logging/uiPanel.js
(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.uiPanel && typeof AP.uiPanel.createPanel === "function") return;

  const el = (tag, props = {}, children = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "style" && typeof v === "string") n.setAttribute("style", v);
      else if (k in n) {
        try {
          n[k] = v;
        } catch {
          n.setAttribute(k, v);
        }
      } else {
        n.setAttribute(k, v);
      }
    }
    const list = Array.isArray(children) ? children : [children];
    for (const c of list) {
      if (c == null) continue;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return n;
  };

  const injectStyles = (css) => {
    try {
      const id = "ap-core-styles";
      if (document.getElementById(id)) return;
      const s = document.createElement("style");
      s.id = id;
      s.textContent = css;
      (document.head || document.documentElement).appendChild(s);
    } catch {}
  };

  AP.uiPanel = {
    createPanel({ onStart, onStop } = {}) {
      injectStyles(`
        .ap-card{position:fixed;top:20px;right:20px;background:#0b1220;color:#e5e7eb;
          border:1px solid #243145;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.3);
          width:320px;z-index:2147483647;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial}
        .ap-card--hidden{display:none!important}
        .ap-row{display:flex;gap:8px;flex-wrap:wrap;padding:10px}
        .ap-toggle{position:fixed;right:16px;bottom:16px;width:44px;height:44px;border-radius:999px;
          border:1px solid #374151;background:#111827;color:#e5e7eb;z-index:2147483647;cursor:pointer}
        textarea,input,button{background:#1f2937;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 10px}
        textarea{min-height:80px;width:100%}
      `);

      const host = el("div");
      (document.body || document.documentElement).appendChild(host);
      const shadow = host.attachShadow({ mode: "open" });

      const toggle = el("button", {
        className: "ap-toggle",
        textContent: "AP",
        type: "button",
        title: "Toggle Auto-Prompter",
      });
      (document.body || document.documentElement).appendChild(toggle);

      const card = el("div", { className: "ap-card" });
      const ta = el("textarea", { id: "ap-seq", placeholder: "Sequence..." });
      const btnStart = el("button", {
        textContent: "Start",
        onclick: () =>
          onStart && onStart({ sequence: ta.value || "", autoDetect: true }),
      });
      const btnStop = el("button", {
        textContent: "Stop",
        style: "margin-left:8px",
        onclick: () => onStop && onStop(),
      });

      card.appendChild(el("div", { className: "ap-row" }, [ta]));
      card.appendChild(el("div", { className: "ap-row" }, [btnStart, btnStop]));
      shadow.appendChild(card);

      toggle.onclick = () => {
        if (AP.uiPosition?.toggleHidden) {
          const pos = AP.uiPosition.loadPos ? AP.uiPosition.loadPos() : {};
          AP.uiPosition.toggleHidden(card, pos);
        } else {
          card.classList.toggle("ap-card--hidden");
        }
      };

      try {
        if (AP.uiPosition?.applyPosition) {
          const pos = AP.uiPosition.loadPos ? AP.uiPosition.loadPos() : {};
          AP.uiPosition.applyPosition(card, pos);
        }
      } catch (e) {
        (AP.logger?.warn || console.warn)("uiPosition.applyPosition error", e);
      }

      return host;
    },
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/public/static/repo_dump.js");

/* ===== auto-prompter/public/static/repo_dump.js ===== */
(function(){var __AP_MOD="/auto-prompter/public/static/repo_dump.js";try{
// generated
window.__AP_REPO_LIST = [
  "/auto-prompter/public/static/repo_dump.js",
  "/auto-prompter/ui/dev/boot.js",
  "/auto-prompter/ui/panel.js",
  "/auto-prompter/ui/panel.log.js",
  "/auto-prompter/ui/panel/controls/bind.js",
  "/auto-prompter/ui/panel/controls/buttons.js",
  "/auto-prompter/ui/panel/controls/form.js",
  "/auto-prompter/ui/panel/controls/index.js",
  "/auto-prompter/ui/panel/controls/repeats.js",
  "/auto-prompter/ui/panel/controls/safe.js",
  "/auto-prompter/ui/panel/controls/scheduler.js",
  "/auto-prompter/ui/panel/controls/steps/row.js",
  "/auto-prompter/ui/panel/controls/steps/styles.js",
  "/auto-prompter/ui/panel/controls/ui.js",
  "/auto-prompter/ui/panel/layout/debug.js",
  "/auto-prompter/ui/panel/layout/dock.js",
  "/auto-prompter/ui/panel/layout/index.js",
  "/auto-prompter/ui/panel/layout/keyboard.js",
  "/auto-prompter/ui/panel/layout/markup.js",
  "/auto-prompter/ui/panel/layout/mount.js",
  "/auto-prompter/ui/panel/layout/toggle.js",
  "/auto-prompter/ui/panel/profiles.js",
  "/auto-prompter/ui/panel/tabs.js",
  "/auto-prompter/ui/panel/templates.js",
  "/auto-prompter/ui/position/apply.js",
  "/auto-prompter/ui/position/drag.js",
  "/auto-prompter/ui/position/geometry.js",
  "/auto-prompter/ui/position/index.js",
  "/auto-prompter/ui/position/keyboard.js",
  "/auto-prompter/ui/position/storage.js",
  "/auto-prompter/ui/theme.js",
  "/auto-prompter/userscript/autoload.js",
  "/auto-prompter/userscript/boot-core-helpers.js",
  "/auto-prompter/userscript/boot.js",
  "/auto-prompter/userscript/bootstrap/guard.js",
  "/auto-prompter/userscript/bootstrap/start.js",
  "/auto-prompter/userscript/dictation/capture.js",
  "/auto-prompter/userscript/dictation/constants.js",
  "/auto-prompter/userscript/dictation/events.js",
  "/auto-prompter/userscript/dictation/index.js",
  "/auto-prompter/userscript/dictation/mic.js",
  "/auto-prompter/userscript/dictation/util.js",
  "/auto-prompter/userscript/entry.js",
  "/auto-prompter/userscript/glue/boot.js",
  "/auto-prompter/userscript/glue/bridges.js",
  "/auto-prompter/userscript/glue/compose-strict.js",
  "/auto-prompter/userscript/glue/dev.js",
  "/auto-prompter/userscript/glue/dictation-accept.js",
  "/auto-prompter/userscript/glue/dictation-api.js",
  "/auto-prompter/userscript/glue/dictation-auto-reopen.js",
  "/auto-prompter/userscript/glue/dictation-compose.js",
  "/auto-prompter/userscript/glue/dictation-config.js",
  "/auto-prompter/userscript/glue/dictation-dom.js",
  "/auto-prompter/userscript/glue/dictation-events.js",
  "/auto-prompter/userscript/glue/dictation-fallback.js",
  "/auto-prompter/userscript/glue/dictation-finalize.js",
  "/auto-prompter/userscript/glue/dictation-glue.js",
  "/auto-prompter/userscript/glue/dictation-guard.js",
  "/auto-prompter/userscript/glue/dictation-hooks.js",
  "/auto-prompter/userscript/glue/dictation-logger.js",
  "/auto-prompter/userscript/glue/dictation-selftest.js",
  "/auto-prompter/userscript/glue/dictation-session.js",
  "/auto-prompter/userscript/glue/dictation-site-watchers.js",
  "/auto-prompter/userscript/glue/dictation.js",
  "/auto-prompter/userscript/glue/gate-helpers.js",
  "/auto-prompter/userscript/glue/prompt-parser-fallback.js",
  "/auto-prompter/userscript/glue/shared-utils.js",
  "/auto-prompter/userscript/index/boot.js",
  "/auto-prompter/userscript/index/bootChecklist.js",
  "/auto-prompter/userscript/index/composer-bridge.js",
  "/auto-prompter/userscript/index/facade.js",
  "/auto-prompter/userscript/index/openBootTrace.js",
  "/auto-prompter/userscript/index/startGateEnhance.js",
  "/auto-prompter/userscript/index/whenReady.js",
  "/auto-prompter/userscript/manifest/helpers.js",
  "/auto-prompter/userscript/manifest/parts.boot-loader.js",
  "/auto-prompter/userscript/manifest/parts.core-boot.js",
  "/auto-prompter/userscript/manifest/parts.logging-core.js",
  "/auto-prompter/userscript/manifest/parts.logging.js",
  "/auto-prompter/userscript/manifest/parts.nav-boot.js",
  "/auto-prompter/userscript/manifest/parts.nav-facades.js",
  "/auto-prompter/userscript/manifest/parts.nav-hooks.js",
  "/auto-prompter/userscript/manifest/parts.nav-route.js",
  "/auto-prompter/userscript/manifest/parts.nav-utils.js",
  "/auto-prompter/userscript/manifest/parts.sanity.js",
  "/auto-prompter/userscript/manifest/parts.ui-panel.js",
  "/auto-prompter/userscript/manifest/parts.ui-position.js",
  "/auto-prompter/userscript/manifest/parts.userscript.js",
  "/auto-prompter/userscript/manifest/parts.utils-config.js",
  "/auto-prompter/userscript/orchestrator.js",
  "/auto-prompter/userscript/probe.js",
  "/auto-prompter/userscript/repoDump.js",
  "/auto-prompter/userscript/runtime-pickers.js",
  "/auto-prompter/userscript/sanity.js",
  "/auto-prompter/userscript/tryStart.js",
  "/auto-prompter/userscript/version.js",
  "/auto-prompter/utils/config/constants.js",
  "/auto-prompter/utils/config/index.js",
  "/auto-prompter/utils/config/profiles.js",
  "/auto-prompter/utils/config/storage.js",
  "/auto-prompter/utils/config/templates.js",
  "/auto-prompter/utils/dom.js",
  "/core/adapters/chatgpt/detector.js",
  "/core/adapters/chatgpt/patch.js",
  "/core/detect/core/config/config.js",
  "/core/detect/core/debug/debug.js",
  "/core/detect/core/find/explicitSelectors.js",
  "/core/detect/core/find/findComposer.js",
  "/core/detect/core/find/scanLoop.js",
  "/core/detect/core/hints/hints.js",
  "/core/detect/core/probe/fallback/probeFallback.js",
  "/core/detect/core/probe/resolve/resolve.js",
  "/core/detect/core/probe/try/tryOnce.js",
  "/core/detect/core/probe/util/firstMatch.js",
  "/core/detect/core/probe/util/heuristics.js",
  "/core/detect/core/probe/util/nearInput.js",
  "/core/detect/core/probe/util/visibility.js",
  "/core/detect/core/registry/try.js",
  "/core/detect/core/roots/scan.js",
  "/core/detect/core/sanity/sanity.js",
  "/core/detect/core/waiters/waiters.js",
  "/core/detect/flags.js",
  "/core/detect/helpers.js",
  "/core/detect/index.js",
  "/core/detect/probe.js",
  "/core/detect/roots.js",
  "/core/detect/selectors.js",
  "/core/detect/shim/flags.js",
  "/core/detect/shim/helpers.js",
  "/core/detect/shim/index.js",
  "/core/detect/shim/probe.js",
  "/core/devtools/logger.js",
  "/core/devtools/loggerFacade.js",
  "/core/devtools/noise/dom.js",
  "/core/devtools/noise/index.js",
  "/core/devtools/noiseStubs.js",
  "/core/devtools/panelFallback.js",
  "/core/devtools/telemetry/loader.telemetry.js",
  "/core/devtools/telemetry/nav.boot.telemetry.js",
  "/core/devtools/trace.js",
  "/core/engine/context.js",
  "/core/engine/find/allow.js",
  "/core/engine/find/global-proxy.js",
  "/core/engine/find/index.js",
  "/core/engine/find/once.js",
  "/core/engine/find/orFail.js",
  "/core/engine/find/probe.js",
  "/core/engine/find/utils.dictate.js",
  "/core/engine/find/utils.js",
  "/core/engine/idle/constants.js",
  "/core/engine/idle/dom.js",
  "/core/engine/idle/observer.js",
  "/core/engine/idle/state.js",
  "/core/engine/idle/waitUntilIdle.js",
  "/core/engine/index.js",
  "/core/engine/msg/context.js",
  "/core/engine/msg/deps.js",
  "/core/engine/msg/handler.js",
  "/core/engine/msg/helpers.focus.js",
  "/core/engine/msg/helpers.prime.js",
  "/core/engine/msg/helpers.refresh.js",
  "/core/engine/msg/helpers.sendGate.js",
  "/core/engine/msg/utils.js",
  "/core/engine/retries.js",
  "/core/engine/steps.execute.js",
  "/core/engine/steps.findComposer.js",
  "/core/engine/steps.handlers.basic.js",
  "/core/engine/steps.handlers.msg.js",
  "/core/engine/steps.js",
  "/core/events.js",
  "/core/lib/dom/domFacade.js",
  "/core/lib/dom/utils.js",
  "/core/plugins/ce-writers/focus.js",
  "/core/plugins/ce-writers/insertBeforeInput.js",
  "/core/plugins/ce-writers/insertByHTML.js",
  "/core/plugins/ce-writers/insertExecCommand.js",
  "/core/plugins/ce-writers/insertPaste.js",
  "/core/runtime/ap/index.js",
  "/core/runtime/ap/promptEngine.shim.js",
  "/core/runtime/ap/rootIndex.js",
  "/core/runtime/boot/core.js",
  "/core/runtime/boot/gate.js",
  "/core/runtime/boot/loader.js",
  "/core/runtime/boot/loader/apload.js",
  "/core/runtime/boot/loader/flags.js",
  "/core/runtime/boot/loader/probe.js",
  "/core/runtime/boot/loader/sanity.js",
  "/core/runtime/boot/loader/startCore.js",
  "/core/runtime/boot/loader/util.js",
  "/core/runtime/boot/mountPoint.js",
  "/core/runtime/boot/nav/boot/computeFlags.js",
  "/core/runtime/boot/nav/boot/guards.js",
  "/core/runtime/boot/nav/boot/index.js",
  "/core/runtime/boot/nav/boot/install.js",
  "/core/runtime/boot/nav/boot/interval.js",
  "/core/runtime/boot/nav/boot/longtask.js",
  "/core/runtime/boot/nav/boot/ready.js",
  "/core/runtime/boot/nav/boot/schedulers.js",
  "/core/runtime/boot/nav/boot/start.js",
  "/core/runtime/boot/nav/boot/strategy.js",
  "/core/runtime/boot/nav/boot/watchdog.js",
  "/core/runtime/boot/nav/flags.js",
  "/core/runtime/boot/nav/hooks.js",
  "/core/runtime/boot/nav/hooks/history.js",
  "/core/runtime/boot/nav/hooks/index.js",
  "/core/runtime/boot/nav/hooks/interval.js",
  "/core/runtime/boot/nav/hooks/mutation.js",
  "/core/runtime/boot/nav/index.js",
  "/core/runtime/boot/nav/route.js",
  "/core/runtime/boot/nav/route/changed.js",
  "/core/runtime/boot/nav/route/index.js",
  "/core/runtime/boot/nav/route/schedule.js",
  "/core/runtime/boot/nav/scheduler.js",
  "/core/runtime/boot/nav/state.js",
  "/core/runtime/boot/nav/utils.js",
  "/core/runtime/boot/nav/utils/dom.js",
  "/core/runtime/boot/nav/utils/index.js",
  "/core/runtime/boot/nav/utils/log.js",
  "/core/runtime/boot/nav/utils/time.js",
  "/core/runtime/boot/navWatch.js",
  "/core/runtime/boot/run.js",
  "/core/runtime/boot/start.js",
  "/core/runtime/boot/startGate.js",
  "/core/runtime/boot/state.js",
  "/core/runtime/compat/domWait.proxy.js",
  "/core/runtime/compat/startOnce.wrap.js",
  "/core/runtime/composer/bootstrap.js",
  "/core/runtime/composer/cache.js",
  "/core/runtime/composer/core/index.js",
  "/core/runtime/composer/core/watcher.js",
  "/core/runtime/composer/probe-shim.js",
  "/core/runtime/core/deps.js",
  "/core/runtime/core/index.js",
  "/core/runtime/index.js",
  "/core/runtime/io/compose.js",
  "/core/runtime/io/idle.js",
  "/core/runtime/io/index.js",
  "/core/runtime/io/submit/button.js",
  "/core/runtime/io/submit/enter.js",
  "/core/runtime/io/submit/form.js",
  "/core/runtime/io/value.js",
  "/core/runtime/io/value/contentEditable.js",
  "/core/runtime/io/value/standardInput.js",
  "/core/runtime/io/waiters.js",
  "/core/runtime/prompt/engine.js",
  "/core/runtime/prompt/parser.js",
  "/core/runtime/shared/flags.js",
  "/core/sanity.js",
  "/core/sanity/checks.js",
  "/core/sanity/checks/bundle.js",
  "/core/sanity/checks/cache.js",
  "/core/sanity/checks/composer.js",
  "/core/sanity/checks/core_ready.js",
  "/core/sanity/checks/environment.js",
  "/core/sanity/checks/flags.js",
  "/core/sanity/checks/order.js",
  "/core/sanity/checks/selectors.js",
  "/core/sanity/checks/self.js",
  "/core/sanity/checks/userscript.js",
  "/core/sanity/facade.js",
  "/core/sanity/helpers.js",
  "/core/sanity/index.js",
  "/core/sanity/report.js",
  "/core/sanity/reporters/banner.js",
  "/core/sanity/reporters/console.js",
  "/core/sanity/reporters/html.js",
  "/core/sanity/reporters/telemetry.js",
  "/core/sanity/sanity_core/bootstrap.js",
  "/core/sanity/sanity_core/index.js",
  "/core/sanity/sanity_core/registry.js",
  "/core/sanity/sanity_core/runner.js",
  "/core/sanity/utils.js",
  "/core/sanity/utils/bootstrap/boot.js",
  "/core/sanity/utils/bootstrap/core-ready.js",
  "/core/sanity/utils/config/config.js",
  "/core/sanity/utils/config/explain.js",
  "/core/sanity/utils/config/paths.js",
  "/core/sanity/utils/core/base.js",
  "/core/sanity/utils/core/time.js",
  "/core/sanity/utils/core/utils.js",
  "/core/sanity/utils/diagnostics/csp.js",
  "/core/sanity/utils/diagnostics/errors.js",
  "/core/sanity/utils/diagnostics/perf.js",
  "/core/sanity/utils/diagnostics/selftest.js",
  "/core/sanity/utils/registry/checks-registry.js",
  "/core/sanity/utils/telemetry/bk.js",
  "/core/sanity/utils/telemetry/heartbeat.js",
  "/core/sanity/utils/telemetry/lifecycle.js",
  "/core/sanity/utils/telemetry/network-memory.js",
  "/core/sanity/utils/telemetry/print.js",
  "/core/sanity/utils/telemetry/report.js",
  "/core/sanity/utils/telemetry/sink.js",
  "/core/sanity/utils/telemetry/snapshot.js",
  "/core/sanity/utils/ux/breadcrumbs.js",
  "/core/sanity/utils/ux/toast.js",
  "/core/ui/dom/attrs.js",
  "/core/ui/dom/el.js",
  "/core/ui/dom/index.js",
  "/core/ui/dom/query.js",
  "/core/ui/dom/shadow.js",
  "/core/ui/dom/styles.js",
  "/core/ui/dom/utils.js",
  "/core/ui/dom/waitForSelector.js",
  "/core/ui/index.js",
  "/core/ui/panel.js",
  "/core/ui/position.js",
  "/core/ui/positionFallback.js",
  "/logging/boot-shims.js",
  "/logging/core/checkpoint.js",
  "/logging/core/constants.js",
  "/logging/core/emit.js",
  "/logging/core/sinkbus.js",
  "/logging/core/utils.js",
  "/logging/logger.js",
  "/logging/logger/index.js",
  "/logging/mirrorSink.js",
  "/logging/uiPanel.js",
  "/logging/uiPosition.js"
];

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/boot-core-helpers.js");

/* ===== auto-prompter/userscript/boot-core-helpers.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/boot-core-helpers.js";try{
// ./auto-prompter/userscript/boot-core-helpers.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/userscript/boot-core-helpers.js"
    );
  } catch {}

  // Basic logger shim with context
  const base = AP.logger?.with
    ? AP.logger.with({ component: "userscript", file: "boot-core-helpers.js" })
    : console;
  const L = {
    info: (...a) => (base.info || base.log).apply(base, a),
    warn: (...a) => (base.warn || base.log).apply(base, a),
    error: (...a) => (base.error || base.log).apply(base, a),
    debug: (...a) => (base.debug || base.log).apply(base, a),
  };

  // Ensure AP.boot + checkpoint function exist early
  AP.boot = AP.boot || {
    id:
      Math.random().toString(36).slice(2, 6) +
      "-" +
      (Date.now() % 1e6).toString(36),
    startedAt: Date.now(),
    trace: [],
  };
  if (typeof AP.boot.cp !== "function") {
    AP.boot.cp = function cp(name, extra) {
      const t = Date.now();
      const row = {
        t,
        dt: t - (AP.boot.trace[0]?.t || AP.boot.startedAt),
        name: String(name || ""),
        ...(extra || {}),
      };
      AP.boot.trace.push(row);
      try {
        (AP.logger || console).info("[AP][boot] cp:", row.name, extra || "");
      } catch {}
      try {
        window.dispatchEvent(new CustomEvent("ap:boot-cp", { detail: row }));
      } catch {}
      return row;
    };
  }

  // --- Unified dev flag + helpers ------------------------------------------
  function localDevDetect() {
    try {
      if (new URL(location.href).searchParams.get("ap_dev") === "1")
        return true;
    } catch {}
    try {
      if (String(localStorage.getItem("ap_dev")) === "1") return true;
    } catch {}
    return false;
  }

  AP.flags = AP.flags || {};
  if (typeof AP.flags.dev !== "function") {
    AP.flags.dev = function dev() {
      // If someone overrides AP.flags.dev upstream, prefer that.
      return localDevDetect();
    };
  }

  // Back-compat surface used elsewhere in the bundle
  AP.userscript = AP.userscript || {};
  AP.userscript.devEnabled =
    AP.userscript.devEnabled || (() => !!AP.flags.dev());

  // Run-once helper keyed by string/symbol (safe across reloads in page)
  const ONCE_TOKEN = Symbol.for("ap.once.map");
  const onceMap = (window[ONCE_TOKEN] = window[ONCE_TOKEN] || new Map());
  AP.once =
    AP.once ||
    function once(key, fn) {
      const k = String(key || "");
      if (onceMap.has(k)) return onceMap.get(k);
      const val = typeof fn === "function" ? fn() : true;
      onceMap.set(k, val);
      return val;
    };

  // Lightweight event .once helper
  AP.events = AP.events || {};
  AP.events.once =
    AP.events.once ||
    function onceEvent(target, type, handler, options) {
      try {
        if (!target || !type || !handler) return;
        const opts =
          typeof options === "object"
            ? { ...options, once: true }
            : { once: true };
        target.addEventListener(type, handler, opts);
      } catch {}
    };

  // --- Defaults for nav (route/mutation/history observers) ------------------
  // "nav" watches SPA route changes (history/mutation) so adapters can re-detect
  // inputs and send buttons when the UI changes. ON by default, but keep it
  // overrideable via AP.nav.__overrides__ set earlier by the host or tests.
  AP.nav = AP.nav || {};
  const navOv = (AP.nav.__overrides__ = AP.nav.__overrides__ || {});
  if (!("OFF" in navOv)) navOv.OFF = false; // ON by default
  if (!("DISABLE_MO" in navOv)) navOv.DISABLE_MO = false;
  if (!("DISABLE_HISTORY" in navOv)) navOv.DISABLE_HISTORY = false;

  AP.boot.cp("userscript:boot-core-helpers", {
    dev: !!AP.flags.dev(),
    navDefaults: { ...navOv },
  });

  L.info("[AP userscript] boot-core-helpers installed", {
    dev: !!AP.flags.dev(),
  });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/runtime-pickers.js");

/* ===== auto-prompter/userscript/runtime-pickers.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/runtime-pickers.js";try{
// ./auto-prompter/userscript/runtime-pickers.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/userscript/runtime-pickers.js"
    );
  } catch {}
  const base = AP.logger?.with
    ? AP.logger.with({ component: "userscript", file: "runtime-pickers.js" })
    : console;
  const L = {
    info: (...a) => (base.info || base.log).apply(base, a),
    warn: (...a) => (base.warn || base.log).apply(base, a),
  };
  function pickStart() {
    const picks = [
      () => AP.AutoPrompterCore?.start,
      () => AP.coreStart?.start,
      () =>
        typeof AP.start === "function" ? AP.start.__impl : AP.start || null,
      () => window.AP?.core?.start,
      () => window.PromptEngine?.start,
      () => window.startAutoPrompter,
    ];
    for (const f of picks) {
      try {
        const v = f();
        if (typeof v === "function") return v;
      } catch {}
    }
    return undefined;
  }
  function pickStop() {
    const picks = [
      () => AP.AutoPrompterCore?.stop,
      () => AP.coreRun?.stop,
      () => (typeof AP.stop === "function" ? AP.stop.__impl : AP.stop || null),
      () => window.AP?.core?.stop,
      () => window.PromptEngine?.stop,
      () => window.stopAutoPrompter,
    ];
    for (const f of picks) {
      try {
        const v = f();
        if (typeof v === "function") return v;
      } catch {}
    }
    return undefined;
  }
  function pickRun() {
    const picks = [() => AP.AutoPrompterCore?.run, () => AP.coreRun?.run];
    for (const f of picks) {
      try {
        const v = f();
        if (typeof v === "function") return v;
      } catch {}
    }
    return undefined;
  }
  function installEventBridges() {
    if (AP.__runtimePickersInstalled) return;
    AP.__runtimePickersInstalled = true;
    window.addEventListener("ap:need-start", (e) => {
      try {
        const fn = pickStart();
        if (fn && e?.detail?.provide) e.detail.provide(fn);
      } catch {}
    });
    window.addEventListener("ap:need-stop", (e) => {
      try {
        const fn = pickStop();
        if (fn && e?.detail?.provide) e.detail.provide(fn);
      } catch {}
    });
    Object.defineProperty(AP, "start", {
      configurable: true,
      get() {
        const fn = pickStart();
        if (typeof fn === "function") {
          const shim = fn.bind(AP);
          Object.defineProperty(shim, "__impl", { value: fn });
          return shim;
        }
        return undefined;
      },
    });
    Object.defineProperty(AP, "stop", {
      configurable: true,
      get() {
        const fn = pickStop();
        if (typeof fn === "function") {
          const shim = fn.bind(AP);
          Object.defineProperty(shim, "__impl", { value: fn });
          return shim;
        }
        return undefined;
      },
    });
    Object.defineProperty(AP, "run", {
      configurable: true,
      get() {
        const fn = pickRun();
        if (typeof fn === "function") {
          const shim = fn.bind(AP);
          Object.defineProperty(shim, "__impl", { value: fn });
          return shim;
        }
        return undefined;
      },
    });
    L.info("[AP userscript] runtime pickers installed");
  }
  AP.userscript = AP.userscript || {};
  AP.userscript.runtimePickers = {
    pickStart,
    pickStop,
    pickRun,
    installEventBridges,
  };
  // Install immediately (idempotent)
  installEventBridges();
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/index/facade.js");

/* ===== auto-prompter/userscript/index/facade.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/index/facade.js";try{
// ./auto-prompter/userscript/index/facade.js
// VERSION: userscript-facade/2.1.0

(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/userscript/index/facade.js@userscript-facade/2.1.0"
    );
  } catch {}

  const base = AP.logger?.with
    ? AP.logger.with({ component: "index", file: "facade.js" })
    : console;
  const L = {
    debug: (...a) => (base.debug || base.log).apply(base, a),
    info: (...a) => (base.info || base.log).apply(base, a),
    warn: (...a) => (base.warn || base.log).apply(base, a),
    error: (...a) => (base.error || base.log).apply(base, a),
  };
  const cp = (tag, extra) => {
    try {
      AP.boot?.cp?.("facade:" + tag, {
        ver: "userscript-facade/2.1.0",
        ...(extra || {}),
      });
    } catch {}
  };

  // Public surfaces (idempotent)
  AP.domUtils = AP.domUtils || {};
  AP.domQuery = AP.domQuery || {};
  AP.detectSelectors = AP.detectSelectors || {};
  AP.composer = AP.composer || {};
  AP.composerDetect = AP.composerDetect || {};
  AP.senders = AP.senders || {};
  AP.compose = AP.compose || {};
  AP.startGate = AP.startGate || {};
  AP.navWatch = AP.navWatch || {};
  AP.promptEngine = AP.promptEngine || {};
  AP.promptParser = AP.promptParser || {};
  AP.uiPanel = AP.uiPanel || {};
  AP.mountPoint = AP.mountPoint || {};
  AP.idleWait = AP.idleWait || {};
  AP.sanity = AP.sanity || {};
  AP.renderers = AP.renderers || {};

  // -------- Prompt surface with resilient getters --------
  const defaultParse = (input) => {
    const text = input && input.text ? String(input.text) : String(input ?? "");
    return { text: text.trim(), meta: { codeBlocks: [], flags: [] } };
  };
  const defaultRenderText = (t) => String((t && t.text) ?? t ?? "");

  if (typeof AP.renderers.renderText !== "function") {
    AP.renderers.renderText = defaultRenderText;
    cp("renderers:default");
  }

  AP.prompt = AP.prompt || {};
  try {
    Object.defineProperty(AP.prompt, "parse", {
      configurable: true,
      enumerable: true,
      get() {
        const fn = AP.promptParser?.parse || defaultParse;
        return fn;
      },
      set(fn) {
        Object.defineProperty(AP.prompt, "parse", {
          value: fn,
          writable: true,
          configurable: true,
        });
        cp("prompt:parse:set");
      },
    });
  } catch {}
  try {
    Object.defineProperty(AP.prompt, "renderText", {
      configurable: true,
      enumerable: true,
      get() {
        return typeof AP.renderers?.renderText === "function"
          ? AP.renderers.renderText
          : defaultRenderText;
      },
      set(fn) {
        AP.renderers.renderText =
          typeof fn === "function" ? fn : defaultRenderText;
        cp("prompt:render:set");
      },
    });
  } catch {}

  AP.prompt.renderText = AP.prompt.renderText;

  AP.util = { logger: AP.logger || console, backoff: AP._logBackoff || {} };

  // Boot state
  AP.boot = AP.boot || {
    id:
      Math.random().toString(36).slice(2, 6) +
      "-" +
      (Date.now() % 1e6).toString(36),
    startedAt: Date.now(),
    trace: [],
  };
  if (typeof AP.boot.cp !== "function") {
    AP.boot.cp = function (name, extra) {
      const t = Date.now();
      const row = {
        t,
        dt: t - (AP.boot.trace[0]?.t || AP.boot.startedAt),
        name: String(name || ""),
        ...(extra || {}),
      };
      AP.boot.trace.push(row);
      try {
        (AP.logger || console).info("[AP][boot] cp:", row.name, extra || "");
      } catch {}
      try {
        window.dispatchEvent(new CustomEvent("ap:boot-cp", { detail: row }));
      } catch {}
      return row;
    };
    cp("boot:cp:shim");
  }

  // Re-harden prompt surface on every boot checkpoint (guards against clobbering)
  function hardenPrompt() {
    try {
      if (typeof AP.prompt?.renderText !== "function")
        AP.prompt.renderText = defaultRenderText;
      if (typeof AP.renderers?.renderText !== "function")
        AP.renderers.renderText = defaultRenderText;
      if (typeof AP.prompt?.parse !== "function")
        AP.prompt.parse = defaultParse;
      cp("prompt:harden");
    } catch {}
  }
  try {
    window.addEventListener("ap:boot-cp", hardenPrompt);
  } catch {}
  setTimeout(hardenPrompt, 0);
  setTimeout(hardenPrompt, 500);
  setTimeout(hardenPrompt, 1500);

  AP.__apMainFacadeReady = true;
  L.info("[AP index] facade ready (userscript-facade/2.1.0)");
  cp("ready");
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/index/composer-bridge.js");

/* ===== auto-prompter/userscript/index/composer-bridge.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/index/composer-bridge.js";try{
// VERSION: userscript-bridge/2.2.0
// - No global execCommand/selectAll
// - Element-scoped Range writes for CE
// - Extra breadcrumbs for safety + path visibility

(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/userscript/index/composer-bridge.js@userscript-bridge/2.2.0"
    );
  } catch {}

  const base = AP.logger?.with
    ? AP.logger.with({ component: "index", file: "composer-bridge.js" })
    : console;
  const L = {
    info: (...a) => (base.info || base.log).apply(base, a),
    warn: (...a) => (base.warn || base.log).apply(base, a),
  };
  const cp = (tag, extra) => {
    try {
      AP.boot?.cp?.("bridge:" + tag, {
        ver: "userscript-bridge/2.2.0",
        ...(extra || {}),
      });
    } catch {}
  };

  const rAF = () => new Promise((r) => requestAnimationFrame(() => r()));
  const settle = async (frames = 2) => {
    for (let i = 0; i < frames; i++) await rAF();
  };

  // ---- Find bridge ----------------------------------------------------------
  AP.composer = AP.composer || {};
  AP.composerDetect = AP.composerDetect || {};

  if (!AP.composer.find && AP.composerDetect.findComposer) {
    AP.composer.find = AP.composerDetect.findComposer;
    cp("alias:composer.find");
  }
  if (!("findComposer" in AP.composerDetect)) {
    Object.defineProperty(AP.composerDetect, "findComposer", {
      configurable: true,
      get() {
        return AP.composer.find || AP.composer.findComposer || undefined;
      },
    });
    cp("alias:composerDetect.findComposer:getter");
  }

  async function freshComposer({ allowInputOnly = true } = {}) {
    try {
      const found =
        (await AP.composerDetect?.findComposer?.({ allowInputOnly })) || {};
      cp("fresh:composer", { input: !!found.input, send: !!found.send });
      return found;
    } catch (e) {
      cp("fresh:composer:fail", { err: String(e?.message || e) });
      return {};
    }
  }

  // ---- Helpers --------------------------------------------------------------
  function setTextAreaOrInput(input, s) {
    try {
      input.focus?.({ preventScroll: true });
      const prev = input.value;
      input.value = s;
      input.dispatchEvent?.(new Event("input", { bubbles: true }));
      input.dispatchEvent?.(new Event("change", { bubbles: true }));
      cp("setInput:textarea", { ok: true, len: s.length, changed: prev !== s });
      return true;
    } catch (e) {
      cp("setInput:textarea:fail", { err: String(e?.message || e) });
      return false;
    }
  }

  function elementScopedReplaceCE(el, s) {
    try {
      el.focus?.({ preventScroll: true });
      const doc = el.ownerDocument || document;
      const sel = doc.getSelection?.();
      const range = doc.createRange?.();
      if (sel && range) {
        range.selectNodeContents(el);
        range.deleteContents();
        sel.removeAllRanges();
        sel.addRange(range);
      }
      // Wake editors that listen to beforeinput
      try {
        el.dispatchEvent?.(
          new InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            inputType: "insertText",
            data: s,
          })
        );
      } catch {}
      // Replace content
      el.textContent = "";
      el.appendChild(doc.createTextNode(String(s)));
      // Follow with input/change
      el.dispatchEvent?.(
        new InputEvent("input", {
          bubbles: true,
          data: s,
          inputType: "insertText",
        })
      );
      el.dispatchEvent?.(new Event("change", { bubbles: true }));
      cp("setInput:ce:range", { ok: true, len: s.length });
      return true;
    } catch (e) {
      cp("setInput:ce:range:fail", { err: String(e?.message || e) });
      return false;
    }
  }

  // ---- IO bridge ------------------------------------------------------------
  AP.composerBridge = AP.composerBridge || {};

  AP.composerBridge.setInputValue = async function setInputValue(text) {
    const s = String(text ?? "");
    cp("setInput:start", { len: s.length });

    // Preferred: canonical writer
    if (AP.io?.value?.set) {
      const ok = !!(await AP.io.value.set(s));
      cp("setInput:valueApi", { ok, len: s.length });
      return ok;
    }

    // Fallback: detect elements and write manually
    try {
      const { input } = await freshComposer({ allowInputOnly: true });
      if (!input) throw new Error("input not found");

      if (input.tagName === "TEXTAREA" || input.tagName === "INPUT") {
        const ok = setTextAreaOrInput(input, s);
        if (!ok) throw new Error("textarea/input set failed");
      } else {
        // contenteditable (ProseMirror or similar)
        const ok = elementScopedReplaceCE(input, s);
        if (!ok) throw new Error("contenteditable set failed");
      }

      await settle(2); // let the site enable the Send button
      return true;
    } catch (e) {
      L.warn(
        "[AP bridge] setInputValue fallback failed",
        String(e?.message || e)
      );
      cp("setInput:fallback-fail", { err: String(e?.message || e) });
      return false;
    }
  };

  AP.composerBridge.clickSend = async function clickSend() {
    cp("send:start");
    try {
      const { input, send } = await freshComposer({ allowInputOnly: false });
      // Prefer clicking the site's real button if available & enabled
      if (send) {
        if (!send.disabled) {
          try {
            send.click();
            cp("send:button", { ok: true });
            return true;
          } catch {}
        } else {
          cp("send:button:disabled");
        }
      }
      // Fallback: synthesize Enter on the composer
      if (input) {
        try {
          input.focus?.({ preventScroll: true });
          const kd = new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            which: 13,
            keyCode: 13,
            bubbles: true,
          });
          const ku = new KeyboardEvent("keyup", {
            key: "Enter",
            code: "Enter",
            which: 13,
            keyCode: 13,
            bubbles: true,
          });
          input.dispatchEvent(kd);
          input.dispatchEvent(ku);
          cp("send:enter", { ok: true });
          return true;
        } catch {}
      }
    } catch (e) {
      L.warn("[AP bridge] clickSend fallback failed", String(e?.message || e));
      cp("send:fallback-fail", { err: String(e?.message || e) });
    }
    cp("send:fail");
    return false;
  };

  AP.composerBridge.setAndSend = async function setAndSend(text) {
    cp("setAndSend:start");
    const wrote = await AP.composerBridge.setInputValue(text);
    if (!wrote) {
      cp("setAndSend:write-fail");
      return false;
    }
    await settle(2);
    const sent = await AP.composerBridge.clickSend();
    cp("setAndSend:done", { sent });
    return sent;
  };

  // Legacy globals
  try {
    if (!("setInputValue" in window))
      window.setInputValue = AP.composerBridge.setInputValue;
    if (!("clickSend" in window))
      window.clickSend = AP.composerBridge.clickSend;
    cp("legacy:globals");
  } catch {}

  AP.__apComposerBridgeReady = true;
  L.info("[AP index] composer bridge installed (userscript-bridge/2.2.0)");
  cp("ready");
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/index/whenReady.js");

/* ===== auto-prompter/userscript/index/whenReady.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/index/whenReady.js";try{
// ./auto-prompter/userscript/index/whenReady.js
// VERSION: userscript-whenReady/1.1.0

(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/userscript/index/whenReady.js@userscript-whenReady/1.1.0"
    );
  } catch {}
  const cp = (tag, extra) => {
    try {
      AP.boot?.cp?.("whenReady:" + tag, {
        ver: "userscript-whenReady/1.1.0",
        ...(extra || {}),
      });
    } catch {}
  };

  const logCp = (name) => {
    try {
      AP.boot?.cp?.(name);
    } catch {}
  };

  const cpBoot = AP.boot?.cp || logCp;

  AP.__readyResolvers = AP.__readyResolvers || [];
  AP.whenReady =
    AP.whenReady ||
    function () {
      return new Promise((resolve) => {
        if (AP.AutoPrompterCoreStarted) {
          cp("already-started");
          cpBoot("index:whenReady:already-started");
          return resolve(true);
        }
        cp("resolver-added");
        cpBoot("index:whenReady:resolver-added");
        AP.__readyResolvers.push((ok) => {
          cp("resolved", { ok: !!ok });
          resolve(ok);
        });
      });
    };
  AP.__apWhenReadyReady = true;
  cp("ready");
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/index/startGateEnhance.js");

/* ===== auto-prompter/userscript/index/startGateEnhance.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/index/startGateEnhance.js";try{
// ./auto-prompter/userscript/index/startGateEnhance.js
// VERSION: userscript-startGateEnhance/1.1.0

(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/userscript/index/startGateEnhance.js@userscript-startGateEnhance/1.1.0"
    );
  } catch {}
  const base = AP.logger?.with
    ? AP.logger.with({ component: "index", file: "startGateEnhance.js" })
    : console;
  const L = { warn: (...a) => (base.warn || base.log).apply(base, a) };
  const cp = (tag, extra) => {
    try {
      AP.boot?.cp?.("startGate:" + tag, {
        ver: "userscript-startGateEnhance/1.1.0",
        ...(extra || {}),
      });
    } catch {}
  };

  function isStarted() {
    try {
      if (typeof AP.coreState?.isStarted === "function")
        return !!AP.coreState.isStarted();
    } catch {}
    return !!AP.AutoPrompterCoreStarted;
  }

  function resolveReady(ok) {
    if (AP.__readyResolved) return;
    AP.__readyResolved = true;
    const rs = Array.isArray(AP.__readyResolvers)
      ? AP.__readyResolvers.splice(0)
      : [];
    for (const r of rs) {
      try {
        r(!!ok);
      } catch {}
    }
    cp("resolved", { ok: !!ok });
  }

  try {
    if (AP.startGate && typeof AP.startGate.startIfCoreExists === "function") {
      const orig = AP.startGate.startIfCoreExists;
      AP.startGate.startIfCoreExists = function (...args) {
        cp("wrap:call");
        const out = orig.apply(this, args);
        const wait = AP.sanity?.utils?.awaitCoreStart || null;
        if (typeof wait === "function") {
          wait(2500).then((ok) => {
            try {
              if (
                ok &&
                typeof AP.AutoPrompterCore?.start === "function" &&
                !isStarted()
              ) {
                AP.AutoPrompterCore.start();
                cp("late-start");
              }
            } catch (e) {
              L.warn("[AP][boot] late core.start() failed", e);
              cp("late-start:error", { err: String(e?.message || e) });
            } finally {
              resolveReady(ok || isStarted());
            }
          });
        } else {
          resolveReady(isStarted());
        }
        return out;
      };
      AP.__startGateEnhanced = true;
      cp("wrap:installed");
    }
  } catch (e) {
    L.warn("[AP][boot] enhanceStartGate failed", e);
    cp("wrap:error", { err: String(e?.message || e) });
  }
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/index/bootChecklist.js");

/* ===== auto-prompter/userscript/index/bootChecklist.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/index/bootChecklist.js";try{
// ./auto-prompter/userscript/index/bootChecklist.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/userscript/index/bootChecklist.js"
    );
  } catch {}
  const base = AP.logger?.with
    ? AP.logger.with({ component: "index", file: "bootChecklist.js" })
    : console;
  const L = {
    info: (...a) => (base.info || base.log).apply(base, a),
    warn: (...a) => (base.warn || base.log).apply(base, a),
  };

  function dev() {
    try {
      const f = AP.flags?.dev;
      if (typeof f === "function") return !!f();
    } catch {}
    try {
      const q = new URL(location.href).searchParams;
      if (q.get("ap_dev") === "1") return true;
    } catch {}
    try {
      if (String(localStorage.getItem("ap_dev")) === "1") return true;
    } catch {}
    return false;
  }

  function bootChecklist(tag = "checklist") {
    const U = AP.sanity?.utils || {};
    const checklist = {
      detectCoreConfig: !!AP.detectCoreConfig,
      "composer.find()": !!(
        AP.composer?.find || AP.composerDetect?.findComposer
      ),
      senders: !!AP.senders,
      promptEngine: !!AP.promptEngine,
      "ui.panel.create": !!AP.uiPanel?.createPanel,
      "boot.core.start()": !!AP.AutoPrompterCore?.start,
    };

    // Run core sanity check only in dev to reduce console noise in prod
    if (dev()) {
      try {
        AP.detectCoreSanity?.run?.();
      } catch (e) {
        L.warn("[AP][boot] sanity run failed", e);
      }
    }

    try {
      const missing =
        typeof U.missing === "function"
          ? U.missing(U.REQUIRED_RUNTIME || [])
          : [];
      const tail = typeof U.tailLoad === "function" ? U.tailLoad(15) : [];

      // Always update meta so CI/devtools can consume it
      const meta = (window.__AP_BUNDLE_META = window.__AP_BUNDLE_META || {});
      meta.ok = missing.length === 0;
      meta.criticalMissing = missing;
      meta.wants_count = (U.REQUIRED_RUNTIME || []).length;
      meta.files_count = (window.__AP_LOAD || []).length;

      // Only verbose-log in dev
      if (dev()) {
        L.info(`[AP][boot] ${tag}`, checklist);
        L.info("[AP][boot] bundle summary", {
          required: (U.REQUIRED_RUNTIME || []).length,
          missing,
          tailLen: tail.length,
          tail,
        });
      }
    } catch (e) {
      L.warn("[AP][boot] checklist summary failed", e);
    }
  }

  AP.userscript = AP.userscript || {};
  AP.userscript.bootHelpers = AP.userscript.bootHelpers || {};
  AP.userscript.bootHelpers.bootChecklist = bootChecklist;
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/index/openBootTrace.js");

/* ===== auto-prompter/userscript/index/openBootTrace.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/index/openBootTrace.js";try{
// ./auto-prompter/userscript/index/openBootTrace.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/userscript/index/openBootTrace.js"
    );
  } catch {}
  AP.openBootTrace =
    AP.openBootTrace ||
    function () {
      try {
        console.groupCollapsed(
          `[AP][boot] trace id=${AP.boot.id} (${AP.boot.trace.length} cps)`
        );
        for (const r of AP.boot.trace) {
          const ms = String(r.t % 1000).padStart(3, "0");
          console.log(
            `${new Date(r.t).toLocaleTimeString()}.${ms} (+${r.dt}ms) — ${
              r.name
            }`,
            r
          );
        }
        console.groupEnd();
      } catch {}
      return AP.boot.trace.slice();
    };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/index/boot.js");

/* ===== auto-prompter/userscript/index/boot.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/index/boot.js";try{
// ./auto-prompter/userscript/index/boot.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/userscript/index/boot.js"
    );
  } catch {}
  const base = AP.logger?.with
    ? AP.logger.with({ component: "index", file: "boot.js" })
    : console;
  const L = {
    info: (...a) => (base.info || base.log).apply(base, a),
  };
  const cp = AP.boot?.cp || function () {};

  function dev() {
    try {
      const f = AP.flags?.dev;
      if (typeof f === "function") return !!f();
    } catch {}
    try {
      if (new URL(location.href).searchParams.get("ap_dev") === "1")
        return true;
    } catch {}
    try {
      if (String(localStorage.getItem("ap_dev")) === "1") return true;
    } catch {}
    return false;
  }

  function maybeChecklist(tag) {
    try {
      const meta = window.__AP_BUNDLE_META || {};
      if (
        dev() ||
        (Array.isArray(meta.criticalMissing) && meta.criticalMissing.length)
      ) {
        AP.userscript.bootHelpers?.bootChecklist?.(tag);
      }
    } catch {}
  }

  function boot() {
    cp("index:boot()");
    try {
      AP.userscript?.boot?.("index.boot");
    } catch {}
    // Optional: surface checklist in dev
    try {
      maybeChecklist("checklist:index");
    } catch {}
  }

  if (document.readyState === "loading") {
    cp("index:await-DOMContentLoaded");
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        cp("index:DOMContentLoaded");
        boot();
      },
      { once: true }
    );
  } else {
    cp("index:dom-ready-immediate");
    boot();
  }

  AP.__apBootInstalled = true;
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/dictation/util.js");

/* ===== auto-prompter/userscript/dictation/util.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/dictation/util.js";try{
// VERSION: userscript-dictation/2.5.2
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const U = (AP.shared && AP.shared.utils) || {};

  const L = (AP._log || { with: () => console }).with({
    component: "userscript",
    file: "userscript/dictation/util.js",
    version: "userscript-dictation/2.5.2",
  });
  const log = {
    info: (...a) => (L.info || L.log).apply(L, a),
    warn: (...a) => (L.warn || L.log).apply(L, a),
    error: (...a) => (L.error || L.log).apply(L, a),
  };

  // Shared session + sequence so breadcrumbs line up across modules
  const SID_TOKEN = Symbol.for("ap.dictation.sid");
  const SEQ_TOKEN = Symbol.for("ap.dictation.seq");
  if (!window[SID_TOKEN]) {
    window[SID_TOKEN] =
      Math.random().toString(36).slice(2, 8) + "-" + (Date.now() % 1e5);
  }
  if (typeof window[SEQ_TOKEN] !== "number") window[SEQ_TOKEN] = 0;

  function cp(tag, extra) {
    try {
      AP.boot?.cp?.("udict:" + tag, {
        ver: "userscript-dictation/2.5.2",
        sid: String(window[SID_TOKEN]),
        seq: ++window[SEQ_TOKEN],
        ...(extra || {}),
      });
    } catch {}
  }

  AP.dictationMod = AP.dictationMod || {};
  AP.dictationMod.util = { log, cp, U };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/dictation/constants.js");

/* ===== auto-prompter/userscript/dictation/constants.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/dictation/constants.js";try{
// VERSION: userscript-dictation-consts/2.7.1
(function (global) {
  "use strict";

  var AP = (global.AP = global.AP || {});
  var NS = (AP.UserscriptDictation = AP.UserscriptDictation || {});

  var VER = "2.7.1";

  var ACCEPT_SELECTORS = [
    "#composer-submit-button",
    "[data-testid='send-button']",
    "button[aria-label='Send prompt']",
    "button[aria-label='Send']",
    "button:has(svg[aria-label='Send'])",
    "button[data-testid='composer-send-button']",
    "button[aria-label^='Send']",
  ].join(",");

  var CANCEL_SELECTORS = [
    "[data-testid='stop-button']",
    "button[aria-label='Stop generating']",
    "button:has(svg[aria-label='Stop'])",
  ].join(",");

  var INPUT_SELECTORS = [
    "#prompt-textarea.ProseMirror[contenteditable='true']",
    ".ProseMirror[contenteditable='true']#prompt-textarea",
    ".ProseMirror[contenteditable='true']",
    "div[contenteditable='true'][role='textbox']",
    "textarea[name='prompt-textarea']",
    "textarea#prompt-textarea",
  ].join(",");

  var constants = {
    VER: VER,
    ENSURE_GATE_TIMEOUT_MS: 900,
    WAIT_DECISION_TIMEOUT_MS: 10000,
    ACCEPT_SELECTORS: ACCEPT_SELECTORS,
    CANCEL_SELECTORS: CANCEL_SELECTORS,
    INPUT_SELECTORS: INPUT_SELECTORS,
  };

  NS.Constants = constants;
  AP.dictationMod = AP.dictationMod || {};
  AP.dictationMod.consts = AP.dictationMod.consts || {};
  AP.dictationMod.consts.ACCEPT_SELECTORS = ACCEPT_SELECTORS;
  AP.dictationMod.consts.CANCEL_SELECTORS = CANCEL_SELECTORS;
  AP.dictationMod.consts.INPUT_SELECTORS = INPUT_SELECTORS;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = constants;
  } else if (typeof define === "function" && define.amd) {
    define(function () {
      return constants;
    });
  }
})(typeof window !== "undefined" ? window : this);

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/dictation/events.js");

/* ===== auto-prompter/userscript/dictation/events.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/dictation/events.js";try{
// VERSION: userscript-dictation-events/2.7.1
(function (global) {
  "use strict";

  var AP = (global.AP = global.AP || {});
  var NS = (AP.UserscriptDictation = AP.UserscriptDictation || {});
  var VER = "2.7.1";

  var logger =
    (AP.shared && AP.shared.logger && AP.shared.logger.facade?.("dictation")) ||
    AP.logger ||
    console;

  function info() {
    try {
      (logger.info || logger.log).apply(logger, arguments);
    } catch {}
  }
  function warn() {
    try {
      (logger.warn || logger.log).apply(logger, arguments);
    } catch {}
  }
  function error() {
    try {
      (logger.error || logger.log).apply(logger, arguments);
    } catch {}
  }

  var listeners = Object.create(null);
  function on(evt, fn) {
    if (!evt || typeof fn !== "function") return;
    (listeners[evt] = listeners[evt] || []).push(fn);
    info("[dictation.events] on", { evt });
  }
  function once(evt, fn) {
    if (!evt || typeof fn !== "function") return;
    function wrap() {
      off(evt, wrap);
      try {
        fn.apply(null, arguments);
      } catch (err) {
        error("[dictation.events] once handler error", err);
      }
    }
    on(evt, wrap);
  }
  function off(evt, fn) {
    if (!evt || !listeners[evt]) return;
    if (!fn) return delete listeners[evt];
    listeners[evt] = listeners[evt].filter((f) => f !== fn);
    if (!listeners[evt].length) delete listeners[evt];
  }
  function emit(evt, payload) {
    var list = listeners[evt];
    if (list && list.length) {
      list.slice().forEach(function (fn) {
        try {
          fn(payload);
        } catch (err) {
          error("[dictation.events] emit handler error", err);
        }
      });
    }
    try {
      window.dispatchEvent(
        new CustomEvent("ap:" + evt, { detail: payload || {} })
      );
    } catch {}
  }

  NS.Events = { on: on, once: once, off: off, emit: emit, VER: VER };

  // Bridge for AP.dictation.emitDictationResult()
  AP.dictationMod = AP.dictationMod || {};
  AP.dictationMod.events = {
    emitResult: function ({ text, isFinal }) {
      emit("dictation:result", {
        text: String(text || ""),
        isFinal: !!isFinal,
      });
    },
  };
})(typeof window !== "undefined" ? window : this);

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/dictation/mic.js");

/* ===== auto-prompter/userscript/dictation/mic.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/dictation/mic.js";try{
// VERSION: userscript-dictation/2.5.2
(function () {
  "use strict";

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "userscript/dictation/mic.js"
    );
  } catch {}

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.dictationMod = AP.dictationMod || {};
  if (AP.dictationMod.mic && AP.dictationMod.mic._ok) return;

  const { cp, log } = AP.dictationMod.util || { cp: () => {}, log: console };
  const { micSelector } = AP.dictationMod.consts || { micSelector: () => "" };

  const DEFAULT_MIC_SELECTORS = [
    "button[aria-label='Dictate button']",
    ".composer-btn[aria-label='Dictate button']",
    "button[aria-label='Start dictation']",
    "button[aria-label='Dictate']",
  ];

  function findInShadowRoots(sel) {
    const nodes = Array.from(document.querySelectorAll("*"))
      .map((n) => n.shadowRoot)
      .filter(Boolean);
    for (const sr of nodes) {
      try {
        const b = sr.querySelector(sel);
        if (b) return b;
      } catch {}
    }
    return null;
  }

  function findButton(root = document) {
    cp("mic:find:begin");
    let sel = "";
    try {
      sel = String(micSelector?.() || "").trim();
    } catch {}

    if (!sel) {
      cp("mic:find:fallback-scan");
      for (const s of DEFAULT_MIC_SELECTORS) {
        try {
          const el =
            (root || document).querySelector(s) || findInShadowRoots(s);
          if (el) {
            cp("mic:find:fallback-hit", { selector: s });
            return el;
          }
        } catch {}
      }
      cp("mic:find:none");
      return null;
    }

    try {
      const direct = (root || document).querySelector(sel);
      if (direct) {
        cp("mic:find:direct", { selector: sel });
        return direct;
      }
      const sh = findInShadowRoots(sel);
      if (sh) {
        cp("mic:find:shadow", { selector: sel });
        return sh;
      }
    } catch (e) {
      cp("mic:find:error", { err: String(e?.message || e), selector: sel });
      log.warn?.("[dictation] findButton error", e);
    }
    cp("mic:find:none");
    return null;
  }

  async function clickMic(btn) {
    cp("mic:click:begin", { hasBtn: !!btn });
    try {
      if (!btn) btn = findButton();
      if (!btn) {
        cp("mic:click:missing");
        return false;
      }
      btn.click();
      cp("mic:click:ok");
      log.info?.("[dictation] site mic clicked");
      return true;
    } catch (e) {
      cp("mic:click:error", { err: String(e?.message || e) });
      log.warn?.("[dictation] clickMic error", e);
      return false;
    }
  }

  AP.dictationMod.mic = { findButton, clickMic, _ok: true };
  cp("mic:ready");
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/dictation/capture.js");

/* ===== auto-prompter/userscript/dictation/capture.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/dictation/capture.js";try{
// VERSION: userscript-dictation/2.5.2
(function () {
  "use strict";

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "userscript/dictation/capture.js"
    );
  } catch {}

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.dictationMod = AP.dictationMod || {};
  if (AP.dictationMod.capture && AP.dictationMod.capture._ok) return;

  const { cp } = AP.dictationMod.util || { cp: () => {} };
  const { findButton, clickMic } = AP.dictationMod.mic || {};

  async function captureToTextarea({ textarea } = {}) {
    cp("capture:start", { hasTextarea: !!textarea });
    if (!textarea) {
      cp("capture:bad-arg");
      throw new Error("captureToTextarea requires a textarea");
    }

    const btn = findButton();
    if (!btn) {
      cp("capture:no-mic");
      return false;
    }

    const ok = await clickMic(btn);
    if (!ok) {
      cp("capture:mic-click-failed");
      return false;
    }

    try {
      textarea.focus?.();
    } catch {}
    cp("capture:site-mic");
    return true;
  }

  AP.dictationMod.capture = { captureToTextarea, _ok: true };
  cp("capture:ready");
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/dictation/index.js");

/* ===== auto-prompter/userscript/dictation/index.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/dictation/index.js";try{
// VERSION: userscript-dictation/2.5.2
(function () {
  "use strict";

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "userscript/dictation/index.js"
    );
  } catch {}

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const M = AP.dictationMod || {};
  if (AP.dictation && AP.dictation.__v) return;

  const { log, cp } = M.util || { log: console, cp: () => {} };
  const mic = M.mic || {};
  const capture = M.capture || {};

  function emitDictationResult({ text, isFinal }) {
    try {
      M.events?.emitResult?.({ text, isFinal });
    } catch {}
    try {
      window.dispatchEvent(
        new CustomEvent("ap:dictation:result", {
          detail: { text: String(text || ""), isFinal: !!isFinal },
        })
      );
    } catch {}
  }

  AP.dictation = {
    findButton: mic.findButton,
    clickMic: mic.clickMic,
    captureToTextarea: capture.captureToTextarea,
    emitDictationResult,
    __v: "userscript-dictation/2.5.2",
  };

  log.info?.("[dictation] ready (userscript-dictation/2.5.2)");
  cp("ready");
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/boot.js");

/* ===== auto-prompter/userscript/glue/boot.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/boot.js";try{
// ./auto-prompter/userscript/glue/boot.js
// VERSION: userscript.glue/4.2.1 (adds AP.bc breadcrumbs)
(function (g) {
  "use strict";
  const AP = (g.AutoPrompter = g.AutoPrompter || {});
  try {
    (g.__AP_LOAD = g.__AP_LOAD || []).push(
      "auto-prompter/userscript/glue/boot.js"
    );
  } catch {}
  const L = AP.logger || console;

  // --- Breadcrumbs -----------------------------------------------------------
  // Lightweight breadcrumb helper that logs + emits cp() for log collectors.
  (function ensureBreadcrumbs() {
    const bc = (AP.bc = AP.bc || {});
    if (typeof bc.mark !== "function") {
      bc.mark = function mark(file, meta) {
        const payload = {
          file,
          ts: new Date().toISOString(),
          ...(meta || {}),
        };
        try {
          (L.info || L.log).call(L, "[BC] mark", payload);
        } catch {}
        try {
          AP.boot?.cp?.("bc:mark", payload);
        } catch {}
        return payload;
      };
    }
    if (typeof bc.event !== "function") {
      bc.event = function event(file, tag, extra) {
        const payload = {
          file,
          tag,
          ts: new Date().toISOString(),
          ...(extra || {}),
        };
        try {
          (L.info || L.log).call(L, "[BC] event", payload);
        } catch {}
        try {
          AP.boot?.cp?.("bc:event", payload);
        } catch {}
        return payload;
      };
    }
  })();
  AP.bc.mark("userscript/glue/boot.js", {
    ver: "userscript.glue/4.2.1",
    sig: "manual-patch",
  });

  function devEnabled() {
    try {
      const fromApi = AP.flags?.dev?.();
      if (typeof fromApi === "boolean") return fromApi;
    } catch {}
    try {
      const q = new URL(g.location.href).searchParams;
      if (q.get("ap_dev") === "1") return true;
    } catch {}
    try {
      if (String(localStorage.getItem("ap_dev")) === "1") return true;
    } catch {}
    return false;
  }

  function ensureRenderText() {
    try {
      const def = (t) => String((t && t.text) ?? t ?? "");
      AP.renderers = AP.renderers || {};
      if (typeof AP.renderers.renderText !== "function")
        AP.renderers.renderText = def;
      AP.prompt = AP.prompt || {};
      if (typeof AP.prompt.renderText !== "function")
        AP.prompt.renderText = AP.renderers.renderText;
    } catch {}
  }

  function boot(tag) {
    ensureRenderText();
    try {
      AP.userscript?.boot?.(tag || "userscript.glue");
    } catch (e) {
      (L.warn || L.log).call(L, "[AP boot] glue boot error", e);
    }
    ensureRenderText();

    try {
      g.addEventListener("ap:boot-cp", ensureRenderText);
      g.addEventListener("ap:core-ready", ensureRenderText);
    } catch {}

    if (devEnabled()) {
      try {
        typeof AP.detectCoreSanity?.run === "function" &&
          AP.detectCoreSanity.run();
      } catch {}
    }

    try {
      const checklist = {
        detectCoreConfig: !!AP.detectCoreConfig,
        "composer.find()": !!AP.composer?.find,
        senders: !!AP.senders,
        promptEngine: !!AP.promptEngine,
        "ui.panel": !!AP.uiPanel?.createPanel,
        "boot.core.start": !!AP.AutoPrompterCore?.start,
      };
      (L.info || L.log).call(L, "[AP boot] glue up", { tag, checklist });
      AP.bc.event("userscript/glue/boot.js", "boot", checklist);
    } catch {}
  }

  (AP.userscript = AP.userscript || {}).glue = { boot };
})(globalThis);

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/bridges.js");

/* ===== auto-prompter/userscript/glue/bridges.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/bridges.js";try{
// ./auto-prompter/userscript/glue/bridges.js
(function (g) {
  "use strict";
  const AP = (g.AutoPrompter = g.AutoPrompter || {});
  try {
    (g.__AP_LOAD = g.__AP_LOAD || []).push(
      "auto-prompter/userscript/glue/bridges.js"
    );
  } catch {}

  // Keep composer.find in sync with detect.findComposer
  AP.composer = AP.composer || {};
  AP.composerDetect = AP.composerDetect || {};

  if (!AP.composer.find && AP.composerDetect.findComposer) {
    AP.composer.find = AP.composerDetect.findComposer;
  }
  if (!("findComposer" in AP.composerDetect)) {
    Object.defineProperty(AP.composerDetect, "findComposer", {
      configurable: true,
      get() {
        return AP.composer.find || undefined;
      },
    });
  }

  AP.__bridgesReady = true;
  try {
    g.dispatchEvent(new CustomEvent("ap:bridges:ready"));
  } catch {}
})(typeof window !== "undefined" ? window : globalThis);

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/shared-utils.js");

/* ===== auto-prompter/userscript/glue/shared-utils.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/shared-utils.js";try{
// auto-prompter/userscript/glue/shared-utils.js
// VERSION: glue-utils/1.1.0 (standalone fallbacks so missing core utils won't break you)
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const U = (AP.shared = AP.shared || {});
  if (U.utils && U.utils.__v) return; // don't double-install

  function stripZw(s) {
    try {
      return String(s || "").replace(/[\u200B-\u200D\uFEFF]/g, "");
    } catch {
      return String(s || "");
    }
  }

  function isVisible(el) {
    if (!el || el.nodeType !== 1) return false;
    const style = (el.ownerDocument || document).defaultView?.getComputedStyle
      ? getComputedStyle(el)
      : null;
    if (style && (style.display === "none" || style.visibility === "hidden")) {
      return false;
    }
    const rect = el.getBoundingClientRect?.();
    return !!rect && rect.width > 0 && rect.height > 0;
  }

  function firstVisible(selectors, root) {
    const r = root || document;
    for (const sel of selectors || []) {
      const el = r.querySelector(sel);
      if (el && isVisible(el)) return el;
    }
    return null;
  }

  function collectCandidates(selectors, root) {
    const r = root || document;
    const out = [];
    for (const sel of selectors || []) {
      r.querySelectorAll(sel).forEach((el) => {
        out.push({
          sel,
          vis: isVisible(el),
          tag: el.tagName,
          cls: el.className,
        });
      });
    }
    return out;
  }

  function dumpEl(el) {
    if (!el) return null;
    return {
      tag: el.tagName,
      id: el.id || null,
      cls: (el.className || "").toString(),
      ariaDisabled: el.getAttribute?.("aria-disabled") || null,
      disabled: !!el.disabled,
      text: (el.textContent || "").trim().slice(0, 80),
    };
  }

  function getFocusedEditable() {
    const a = document.activeElement;
    if (!a) return null;
    if (a.isContentEditable) return a;
    if (
      a.tagName === "TEXTAREA" ||
      (a.tagName === "INPUT" && a.type === "text")
    )
      return a;
    return (
      a.querySelector?.(
        "[contenteditable='true'], textarea, input[type='text']"
      ) || null
    );
  }

  function writeTo(target, text, { append = false } = {}) {
    const t = String(text ?? "");
    if (!target) return false;
    if ("value" in target) {
      target.value = append ? (target.value ? target.value + "\n" : "") + t : t;
      target.dispatchEvent?.(new Event("input", { bubbles: true }));
      return true;
    }
    if (target.isContentEditable) {
      // basic contentEditable writer
      const v = append
        ? (target.textContent ? target.textContent + "\n" : "") + t
        : t;
      target.textContent = v;
      target.dispatchEvent?.(new Event("input", { bubbles: true }));
      return true;
    }
    target.textContent = t;
    target.dispatchEvent?.(new Event("input", { bubbles: true }));
    return true;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms | 0)));
  const raf = () => new Promise((r) => requestAnimationFrame(() => r()));

  U.utils = {
    __v: "glue-utils/1.1.0",
    stripZw,
    isVisible,
    firstVisible,
    collectCandidates,
    dumpEl,
    getFocusedEditable,
    writeTo,
    sleep,
    raf,
    DEBUG: !!(localStorage && localStorage.getItem("ap_debug")),
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/compose-strict.js");

/* ===== auto-prompter/userscript/glue/compose-strict.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/compose-strict.js";try{
// auto-prompter/userscript/glue/compose-strict.js
// VERSION: strict-1.1.0 (stronger readiness + enter fallback + breadcrumbs)
(function () {
  "use strict";
  const G = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  const AP = (G.AutoPrompter = G.AutoPrompter || {});
  AP.compose = AP.compose || {};
  const U = (AP.shared && AP.shared.utils) || null;

  AP.bc?.mark?.("userscript/glue/compose-strict.js", {
    ver: "strict-1.1.0",
    sig: "manual-patch",
  });

  const cp = (e, p) => {
    try {
      AP.boot?.cp?.(e, p);
    } catch {}
  };
  const info = (m, p) => console.info("[AP compose:strict]", m, p || {});
  const warn = (m, p) => console.warn("[AP compose:strict]", m, p || {});
  const err = (m, p) => console.error("[AP compose:strict]", m, p || {});

  const INPUT_SELECTORS = [
    "#prompt-textarea[contenteditable='true']",
    "div.ProseMirror[contenteditable='true']#prompt-textarea",
    "div.ProseMirror[contenteditable='true']",
    "[data-testid='prompt-textarea'][contenteditable='true']",
    "div[contenteditable='true'][role='textbox']",
    "textarea#prompt-textarea",
    "textarea[name='prompt-textarea']",
  ];
  const SEND_SELECTORS = [
    "[data-testid='send-button']",
    "#composer-submit-button",
    "button[aria-label='Send prompt']",
    "button[aria-label='Send']",
    "button:has(svg[aria-label='Send'])",
    "button[data-testid='composer-send-button']",
    "button[aria-label^='Send']",
  ];

  function isVisible(el) {
    if (!el) return false;
    try {
      if (U?.isVisible) return U.isVisible(el);
    } catch {}
    const rect = el.getBoundingClientRect?.();
    return !!rect && rect.width > 0 && rect.height > 0;
  }

  function isSendReady(btn) {
    try {
      if (typeof AP.detectSelectors?.isSendReady === "function")
        return !!AP.detectSelectors.isSendReady(btn) && isVisible(btn);
    } catch {}
    if (!btn || !isVisible(btn)) return false;
    if (btn.disabled) return false;
    const aria = (btn.getAttribute("aria-disabled") || "").toLowerCase();
    if (aria === "true" || aria === "1") return false;
    const cls = (btn.className || "").toString().toLowerCase();
    if (/\bdisabled\b/.test(cls)) return false;
    return true;
  }

  function synthEnter(target) {
    try {
      const ev = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        bubbles: true,
        cancelable: true,
      });
      (target || document).dispatchEvent(ev);
      window.dispatchEvent(ev);
      cp("compose:strict:enter-fallback", {});
      info("Enter fallback dispatched");
      return true;
    } catch (e) {
      warn("Enter fallback failed", { err: e });
      cp("compose:strict:enter-fallback-fail", {
        msg: String(e?.message || e),
      });
      return false;
    }
  }

  AP.compose.composeAndSend = async function composeAndSendStrict() {
    try {
      cp("compose:strict:find:begin", {
        url: location.href,
        inputSelCount: INPUT_SELECTORS.length,
        sendSelCount: SEND_SELECTORS.length,
      });

      const input = U?.firstVisible
        ? U.firstVisible(INPUT_SELECTORS, document)
        : ((sel) => {
            for (const s of sel) {
              const el = document.querySelector(s);
              if (el && isVisible(el)) return el;
            }
            return null;
          })(INPUT_SELECTORS);
      if (!input) {
        cp("compose:strict:abort:no-input", {});
        warn("abort: no input found");
        if (U?.DEBUG)
          warn("input:candidates(document)", {
            candidates: U.collectCandidates?.(INPUT_SELECTORS, document),
          });
        return false;
      }

      input.focus?.();
      await (U?.raf ? U.raf() : Promise.resolve());

      const text =
        (U?.readEditableText
          ? U.readEditableText(input)
          : input.value ?? input.textContent ?? "") || "";
      if (U?.DEBUG)
        info("compose:text:read", {
          len: text.length,
          sample: String(text).slice(0, 120),
        });
      if (!String(text).trim()) {
        cp("compose:strict:abort:empty", {});
        warn("abort: composer empty");
        return false;
      }

      const scope =
        input.closest?.("form,[data-testid],[role],main,.composer") || document;

      if (U?.DEBUG) {
        info("send:candidates(scope)", {
          scopeTag: scope === document ? "document" : scope.tagName,
          candidates: U.collectCandidates?.(SEND_SELECTORS, scope),
        });
        info("send:candidates(document)", {
          candidates: U.collectCandidates?.(SEND_SELECTORS, document),
        });
      }

      const send =
        (U?.firstVisible ? U.firstVisible(SEND_SELECTORS, scope) : null) ||
        (U?.firstVisible
          ? U.firstVisible(SEND_SELECTORS, document)
          : ((sel) => {
              for (const s of sel) {
                const el =
                  (scope || document).querySelector(s) ||
                  document.querySelector(s);
                if (el && isVisible(el)) return el;
              }
              return null;
            })(SEND_SELECTORS));

      if (!send) {
        cp("compose:strict:abort:no-send", {});
        warn("abort: send button not found — trying Enter fallback");
        return synthEnter(input);
      }

      if (!isSendReady(send)) {
        const meta = U?.dumpEl
          ? U.dumpEl(send)
          : { tag: send.tagName, cls: send.className };
        cp("compose:strict:abort:send-not-ready", { meta });
        warn("abort: send button not ready", { sendMeta: meta });
        // Attempt last-ditch Enter
        return synthEnter(input);
      }

      send.click();
      cp("compose:strict:clicked", { len: String(text).length });
      info("clicked Send", { len: String(text).length });
      return true;
    } catch (e) {
      cp("compose:strict:error", { msg: String(e?.message || e) });
      err("error", { err: e });
      return false;
    }
  };

  info("ready", { ver: "strict-1.1.0" });
  cp("compose:strict:ready", { ver: "strict-1.1.0" });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/gate-helpers.js");

/* ===== auto-prompter/userscript/glue/gate-helpers.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/gate-helpers.js";try{
// auto-prompter/userscript/glue/gate-helpers.js
// VERSION: userscript-gate-helpers/3.0.0 (HEADLESS-ONLY; no fallback UI, no DOM capture)
(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const U = (AP.shared && AP.shared.utils) || null;

  // --- session + sequence ----------------------------------------------------
  const SID_TOKEN = Symbol.for("ap.dictation.sid");
  const SEQ_TOKEN = Symbol.for("ap.dictation.seq");
  if (!window[SID_TOKEN]) {
    window[SID_TOKEN] =
      Math.random().toString(36).slice(2, 8) + "-" + (Date.now() % 1e5);
  }
  if (typeof window[SEQ_TOKEN] !== "number") window[SEQ_TOKEN] = 0;
  const sid = () => String(window[SID_TOKEN]);
  const seq = () => ++window[SEQ_TOKEN];

  // --- logging ---------------------------------------------------------------
  const L = (AP._log || { with: () => console }).with({
    component: "userscript",
    file: "userscript/glue/gate-helpers.js",
    version: "userscript-gate-helpers/3.0.0",
  });
  const log = {
    info: (...a) => (L.info || L.log).apply(L, a),
    warn: (...a) => (L.warn || L.log).apply(L, a),
    error: (...a) => (L.error || L.log).apply(L, a),
  };

  // --- telemetry helper ------------------------------------------------------
  const cp = (tag, extra) => {
    try {
      AP.boot?.cp?.("gateh:" + tag, {
        ver: "userscript-gate-helpers/3.0.0",
        sid: sid(),
        seq: seq(),
        ...(extra || {}),
      });
    } catch {}
  };

  // --- idempotent load guard -------------------------------------------------
  if (AP.__gateHelpersLoaded) {
    log.info("[gate-helpers] module already loaded; skipping");
    cp("already-loaded");
    return;
  }
  AP.__gateHelpersLoaded = true;
  cp("init");

  // --- sanitize helpers ------------------------------------------------------
  function coerceString(x) {
    return typeof x === "string" ? x : x == null ? "" : String(x);
  }
  function sanitize(text) {
    let t = coerceString(text);
    t = U?.stripZw ? U.stripZw(t) : t; // strip zero-width
    t = t.replace(/\u00A0/g, " "); // nbsp -> space
    t = t.replace(/[ \t\f\v]+/g, " "); // collapse runs
    t = t.replace(/\s+\n/g, "\n").replace(/\n\s+/g, "\n"); // trim around \n
    t = t.replace(/\r\n?/g, "\n"); // normalize CRLF
    return t.trim();
  }

  // --- headless gate (no DOM UI; no confirm/cancel buttons) -----------------
  function createHeadlessGate(initialText = "") {
    cp("headless:open");
    let value = coerceString(initialText || "");

    return {
      set: (t) => {
        value = coerceString(t || "");
      },
      append: (t, { replace } = {}) => {
        if (replace) value = coerceString(t || "");
        else value = (value ? value + " " : "") + coerceString(t || "");
      },
      // Auto-decision: non-empty => accept, empty => cancel
      wait: () => {
        const text = sanitize(value);
        if (!text.length) {
          cp("headless:cancel-empty", { len: 0 });
          return Promise.resolve({ accepted: false, text: "" });
        }
        cp("headless:accept", { len: text.length });
        return Promise.resolve({ accepted: true, text });
      },
      destroy: () => {},
      current: () => value,
      _elements: null,
    };
  }

  // --- decision latch (programmatic signals only; no DOM capture) -----------
  function createDecisionGate() {
    let decided = null;
    let pending = null;
    let resolve = null;

    function ensurePending() {
      if (!pending) {
        pending = new Promise((res) => (resolve = res));
        if (decided) queueMicrotask(() => resolve(decided));
      }
      return pending;
    }
    function decide(value) {
      if (decided) return;
      decided = value === "accept" ? "accept" : "cancel";
      try {
        if (resolve) resolve(decided);
      } finally {
        resolve = null;
      }
    }

    return {
      isDecided: () => decided != null,
      accept: () => decide("accept"),
      cancel: () => decide("cancel"),
      wait: () => (decided ? Promise.resolve(decided) : ensurePending()),
      reset() {
        decided = null;
        pending = null;
        resolve = null;
      },
      state: () => decided,
    };
  }

  const decisionGate = createDecisionGate();
  let gateOpen = false;
  let gateUI = null;
  let lastInterim = "";

  // --- gate lifecycle (HEADLESS-ONLY or host-provided opener) ---------------
  function chooseOpener() {
    // Prefer host opener if provided; otherwise always headless (no fallback UI)
    if (AP.dictationGate && typeof AP.dictationGate.open === "function") {
      return AP.dictationGate.open;
    }
    return createHeadlessGate;
  }

  function ensureGate(initialText = "") {
    if (gateOpen && gateUI) {
      cp("open:reuse", { lastLen: lastInterim.length });
      return gateUI;
    }

    const opener = chooseOpener();
    decisionGate.reset();

    gateUI = opener(initialText);
    lastInterim = sanitize(initialText || "");

    cp("open", {
      len: lastInterim.length,
      headless: opener === createHeadlessGate,
      fallback: false, // explicitly no fallback UI
    });

    try {
      gateUI.focus?.(); // no-op if not provided
    } catch (e) {
      cp("open:on-wire-fail", { err: String(e?.message || e) });
    }

    gateOpen = true;
    log.info("[dictation] gate opened (headless-only path)");
    cp("opened", { headless: opener === createHeadlessGate });
    return gateUI;
  }

  function updateGate(text, { replace = true } = {}) {
    if (!gateOpen || !gateUI) {
      cp("update:skip-closed");
      return;
    }
    const clean = sanitize(text || "");
    if (!clean.length && !lastInterim.length) {
      cp("update:skip-empty");
      return;
    }
    if (clean === lastInterim && replace) {
      cp("update:skip-same");
      return;
    }

    try {
      if (replace && typeof gateUI.set === "function") {
        gateUI.set(clean);
      } else if (typeof gateUI.append === "function") {
        gateUI.append(clean, { replace: false });
      } else if (typeof gateUI.set === "function") {
        gateUI.set(clean);
      }
      lastInterim = clean;
      cp("update", { replace: !!replace, len: clean.length });
    } catch (e) {
      log.warn("[dictation] gate update failed", e);
      cp("update:fail", { err: String(e?.message || e) });
    }
  }

  function closeGate() {
    try {
      gateUI?.destroy?.();
    } catch (e) {
      log.warn("[dictation] gate destroy threw", e);
      cp("close:destroy-error", { err: String(e?.message || e) });
    }
    gateOpen = false;
    gateUI = null;
    lastInterim = "";
    decisionGate.reset();
    log.info("[dictation] gate closed");
    cp("closed");
  }

  function readUIText() {
    try {
      if (!gateUI) return lastInterim;
      if (typeof gateUI.current === "function") {
        return sanitize(gateUI.current());
      }
    } catch (e) {
      cp("read:fail", { err: String(e?.message || e) });
    }
    return lastInterim;
  }

  async function waitDecision() {
    // Prefer native wait (headless auto-accept or host opener’s custom logic)
    const nativeWait = (async () => {
      if (!gateUI || typeof gateUI.wait !== "function") return null;
      try {
        const r = await gateUI.wait();
        if (r) {
          const acc = !!r.accepted;
          const txt = sanitize(r.text || "");
          cp("decided:native", { accepted: acc, len: txt.length });
          // Enforce: never accept empty text
          if (acc && !txt.length) return { accepted: false, text: "" };
          return { accepted: acc, text: txt };
        }
      } catch (e) {
        cp("decided:native-error", { err: String(e?.message || e) });
      }
      return null;
    })();

    // Or allow programmatic signal (AP.gate.accept()/cancel())
    const dec = await Promise.race([
      nativeWait,
      decisionGate.wait().then((d) => ({ _d: d })),
    ]);

    if (dec && !dec._d) {
      return dec; // native path already returned accepted/text
    }

    // Programmatic signal path
    const accepted = (dec && dec._d) === "accept";
    const text = readUIText();
    const len = text.length;

    if (accepted && !len) {
      cp("decided:armed-empty->cancel");
      return { accepted: false, text: "" };
    }
    cp("decided", { accepted: !!accepted, len });
    return { accepted, text };
  }

  // --- public API (no DOM button clicks; signals only) ----------------------
  AP.gate = {
    ensure: ensureGate,
    update: updateGate,
    close: closeGate,
    waitDecision,
    _decisionGate: decisionGate,
    state: () => ({
      open: gateOpen,
      ui: !!gateUI,
      lastLen: lastInterim.length,
      decided: decisionGate.state(),
    }),
    get: () => readUIText(),
    // Signals: do NOT try to click DOM buttons; we’re headless-only now.
    accept: () => {
      if (!gateOpen) return false;
      decisionGate.accept();
      cp("accept:signal");
      return true;
    },
    cancel: () => {
      if (!gateOpen) return false;
      decisionGate.cancel();
      cp("cancel:signal");
      return true;
    },
    _trace: {
      willWrite: (len) => cp("submit:will-write", { len }),
      wrote: (len) => cp("submit:wrote", { len }),
    },
    __v: "userscript-gate-helpers/3.0.0",
  };

  log.info("[gate-helpers] ready (HEADLESS-ONLY)");
  cp("ready", { headless: true });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/dictation-logger.js");

/* ===== auto-prompter/userscript/glue/dictation-logger.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/dictation-logger.js";try{
// VERSION: userscript-dictation-glue/3.4.3 (module: logger)
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const D = (AP.dictGlue = AP.dictGlue || {});

  const SID_TOKEN = Symbol.for("ap.dictation.sid");
  const SEQ_TOKEN = Symbol.for("ap.dictation.seq");
  if (!window[SID_TOKEN]) {
    window[SID_TOKEN] =
      Math.random().toString(36).slice(2, 8) + "-" + (Date.now() % 1e5);
  }
  if (typeof window[SEQ_TOKEN] !== "number") window[SEQ_TOKEN] = 0;

  const L = (AP._log || { with: () => console }).with({
    component: "userscript",
    file: "userscript/glue/dictation-logger.js",
    version: "userscript-dictation-glue/3.4.3",
  });
  const log = {
    info: (...a) => (L.info || L.log).apply(L, a),
    warn: (...a) => (L.warn || L.log).apply(L, a),
    error: (...a) => (L.error || L.log).apply(L, a),
  };
  const cp = (tag, extra) => {
    try {
      AP.boot?.cp?.("dg:" + tag, {
        ver: "userscript-dictation-glue/3.4.3",
        sid: String(window[SID_TOKEN]),
        seq: ++window[SEQ_TOKEN],
        ...(extra || {}),
      });
    } catch {}
  };

  D.log = log;
  D.cp = cp;
  D.state = D.state || { gateTarget: null, hidPanelForDictation: false };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/dictation-config.js");

/* ===== auto-prompter/userscript/glue/dictation-config.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/dictation-config.js";try{
// VERSION: userscript-dictation-glue/3.4.0 (module: config)
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const D = (AP.dictGlue = AP.dictGlue || {});

  const DictationFlags = (AP.flags = AP.flags || {});
  DictationFlags.dictation = Object.assign(
    {
      autoAcceptOnFinal: true,
      acceptOnFinalKeyword: "send",
      stripKeywordOnAccept: true,
      finalAcceptDebounceMs: 150,
      minCharsToAutoAccept: 1,
      // NEW: disable the inline ✓/✗ fallback UI overlay
      disableFallbackGate: true,
    },
    DictationFlags.dictation || {}
  );

  D.flags = DictationFlags;
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/dictation-session.js");

/* ===== auto-prompter/userscript/glue/dictation-session.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/dictation-session.js";try{
// userscript-dictation-glue/session 3.9.0
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const D = (AP.dictGlue = AP.dictGlue || {});
  const cp = (D && D.cp) || function () {};

  if (D.session && D.session.__v === "3.9.0") return;

  const session = {
    active: false,
    preText: "",
    panelBaseline: "",
    commitDone: false,
    timer: null,
    startedAt: 0,
    id: 0,
    __v: "3.9.0",
  };

  function mergePrompt(before, inserted) {
    const a = typeof before === "string" ? before : String(before || "");
    const b = typeof inserted === "string" ? inserted : String(inserted || "");
    if (!a) return b;
    if (!b) return a;
    const needsSep = !/\s$/.test(a);
    return a + (needsSep ? "\n" : "") + b;
  }

  D.session = session;
  D.mergePrompt = mergePrompt;

  cp("session:ready", { v: "3.9.0" });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/dictation-dom.js");

/* ===== auto-prompter/userscript/glue/dictation-dom.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/dictation-dom.js";try{
// userscript-dictation-glue/dom 3.9.0
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const D = (AP.dictGlue = AP.dictGlue || {});
  const U = (AP.shared && AP.shared.utils) || null;
  const cp = (D && D.cp) || function () {};
  const log = (D && D.log) || console;

  if (D.dom && D.dom.__v === "3.9.0") return;

  async function getComposerEl() {
    try {
      if (D.compose?.getComposerEl) return await D.compose.getComposerEl();
      const res = await AP?.composerDetect?.findComposer?.({
        allowInputOnly: true,
      });
      if (!res || !res.input) return null;
      const inner =
        res.input.querySelector?.('[contenteditable="true"]') ||
        res.input.querySelector?.('.ProseMirror[contenteditable="true"]');
      return inner || res.input || null;
    } catch {
      return null;
    }
  }

  async function readComposerTextRaw() {
    try {
      const el = await getComposerEl();
      if (!el) return "";
      const raw =
        (await AP?.io?.getInputValue?.(el)) ?? el.value ?? el.textContent ?? "";
      return U?.stripZw ? U.stripZw(String(raw)) : String(raw);
    } catch {
      return "";
    }
  }

  function clearComposerSync(el) {
    try {
      if (AP.io?.clearInputValue) {
        AP.io.clearInputValue(el);
        return;
      }
    } catch {}
    try {
      if ("value" in el) el.value = "";
      else el.textContent = "";
      el.dispatchEvent?.(new Event("input", { bubbles: true }));
    } catch {}
  }

  async function setComposerAsync(el, text) {
    const v = String(text ?? "");
    try {
      if (AP.io?.setInputValue) {
        await AP.io.setInputValue(el, v, { dispatch: true });
        return;
      }
    } catch {}
    try {
      if ("value" in el) el.value = v;
      else el.textContent = v;
      el.dispatchEvent?.(new Event("input", { bubbles: true }));
    } catch {}
  }

  async function getPanelTextarea() {
    const api = AP.ui?.stepTextarea; // preferred facade
    if (api && (api.setValue || api.getValue)) return api;
    const el =
      document.querySelector("[data-ap-panel] textarea, .ap-step-textarea") ||
      null;
    return el
      ? {
          getValue: () => el.value ?? el.textContent ?? "",
          setValue: (v) => {
            el.value = String(v);
            el.dispatchEvent(new Event("input", { bubbles: true }));
          },
          _el: el,
        }
      : null;
  }

  D.dom = {
    __v: "3.9.0",
    getComposerEl,
    readComposerTextRaw,
    clearComposerSync,
    setComposerAsync,
    getPanelTextarea,
  };

  cp("dom:ready", { v: "3.9.0" });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/dictation-hooks.js");

/* ===== auto-prompter/userscript/glue/dictation-hooks.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/dictation-hooks.js";try{
// userscript-dictation-glue/hooks 3.10.0
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const D = (AP.dictGlue = AP.dictGlue || {});
  const cp = (D && D.cp) || function () {};
  const log = (D && D.log) || console;

  if (D.hooks && D.hooks.__v === "3.10.0") return;

  function hidePanelForDictation() {
    try {
      AP.uiLayoutParts?.control?.hide?.();
      D.state = D.state || {};
      D.state.hidPanelForDictation = true;
      cp("panel:auto-hide:start", { via: "hooks" });
    } catch (e) {
      log.warn?.("[dictation] failed to hide panel via hooks", e);
    }
  }

  function installHooks() {
    const M = AP.dictationMod || {};
    const mic = M.mic || {};
    const cap = M.capture || {};

    // Wrap mic.clickMic
    if (mic.clickMic && !mic.clickMic.__ap_glue_wrapped) {
      const orig = mic.clickMic;
      const wrapped = async function wrappedClickMic() {
        const pre = await D.dom.readComposerTextRaw();
        const ok = await orig.apply(this, arguments);
        if (ok) {
          cp("hook:clickMic:ok");
          hidePanelForDictation();
          D.finalize.startWatchWithBaseline(pre);
        } else {
          cp("hook:clickMic:fail");
        }
        return ok;
      };
      wrapped.__ap_glue_wrapped = true;
      mic.clickMic = wrapped;
      cp("hook:clickMic:installed");
      log.info("[dictation] glue hook installed: mic.clickMic");
    }

    // Wrap capture.captureToTextarea
    if (cap.captureToTextarea && !cap.captureToTextarea.__ap_glue_wrapped) {
      const origCap = cap.captureToTextarea;
      const wrappedCap = async function wrappedCapture(opts) {
        const pre = await D.dom.readComposerTextRaw();
        const res = await origCap.apply(this, arguments);
        if (res) {
          cp("hook:captureToTextarea:ok");
          hidePanelForDictation();
          D.finalize.startWatchWithBaseline(pre);
        } else {
          cp("hook:captureToTextarea:fail");
        }
        return res;
      };
      wrappedCap.__ap_glue_wrapped = true;
      cap.captureToTextarea = wrappedCap;
      cp("hook:captureToTextarea:installed");
      log.info("[dictation] glue hook installed: capture.captureToTextarea");
    }

    // Optional: if there is a direct "dictationGlue.click" entry
    if (D.click && !D.click.__ap_glue_wrapped) {
      const origClick = D.click;
      const wrappedClick = async function () {
        const r = await origClick.apply(this, arguments);
        if (r) {
          hidePanelForDictation();
        }
        return r;
      };
      wrappedClick.__ap_glue_wrapped = true;
      D.click = wrappedClick;
      cp("hook:glue-click:installed");
      log.info("[dictation] glue hook installed: dictationGlue.click");
    }
  }

  // Retry for ~9s to survive late module loads
  function installHooksWithRetry() {
    installHooks();
    (function retry(i = 0, max = 45, delay = 200) {
      if (i > max) return;
      try {
        installHooks();
      } catch {}
      setTimeout(() => retry(i + 1, max, delay), delay);
    })();
  }

  D.hooks = { __v: "3.10.0", installHooks, installHooksWithRetry };
  cp("hooks:ready", { v: "3.10.0" });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/dictation-finalize.js");

/* ===== auto-prompter/userscript/glue/dictation-finalize.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/dictation-finalize.js";try{
// userscript-dictation-glue/finalize 3.9.6
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const D = (AP.dictGlue = AP.dictGlue || {});
  const cp = (D && D.cp) || function () {};
  const log = (D && D.log) || console;

  if (D.finalize && D.finalize.__v && D.finalize.__v >= "3.9.6") return;

  function tryShowPanel(reason) {
    try {
      AP.uiLayoutParts?.control?.show?.();
      D.state = D.state || {};
      D.state.hidPanelForDictation = false;
      cp("panel:auto-open", { reason });
      try {
        window.dispatchEvent(new CustomEvent("ap:dictation:done"));
      } catch {}
    } catch (e) {
      log.warn?.("[dictation] failed to show panel", e);
    }
  }

  async function writeComposerSafe(el, text) {
    try {
      if (D.dom?.setComposerAsync) {
        await D.dom.setComposerAsync(el, text);
        return true;
      }
    } catch (e) {
      log.warn?.("[dictation] setComposerAsync failed; falling back", e);
    }
    try {
      el?.focus?.({ preventScroll: true });
      const r = document.createRange();
      r.selectNodeContents(el);
      r.deleteContents();
      const ok = el.dispatchEvent(
        new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: String(text),
        })
      );
      if (!ok) el.textContent = String(text);
      const sel = window.getSelection?.();
      if (sel) {
        sel.removeAllRanges();
        const end = document.createRange();
        end.selectNodeContents(el);
        end.collapse(false);
        sel.addRange(end);
      }
      return true;
    } catch (e2) {
      log.warn?.("[dictation] writeComposerSafe fallback failed", e2);
      return false;
    }
  }

  async function commitMergedToBoth(dictatedText) {
    const S = (D.session = D.session || {});
    if (S.commitDone) return;
    try {
      const before = S.preText || (await D.dom.readComposerTextRaw());
      const merged = D.mergePrompt(before, String(dictatedText || ""));

      // 1) Update panel (even if hidden)
      const panel = await D.dom.getPanelTextarea();
      try {
        panel?.setValue?.(merged);
        cp("finalize:panel:set", { len: merged.length });
      } catch {}

      // 2) Update the ChatGPT composer
      const el = await D.dom.getComposerEl();
      if (el) {
        const ok = await writeComposerSafe(el, merged);
        cp("finalize:composer:set", { len: merged.length, ok: !!ok });
      } else {
        cp("finalize:composer:missing");
      }

      S.commitDone = true;
      cp("finalize:done", { id: S.id });

      // NEW: always show the panel when done (accept flow)
      tryShowPanel("finalize:commit");
    } catch (e) {
      log.warn?.("[dictation] finalize error", e);
      cp("finalize:error", { err: String(e?.message || e) });
      // Still surface the panel so user sees any error/state
      tryShowPanel("finalize:error");
    }
  }

  function startWatchWithBaseline(preSnapshot) {
    const S = (D.session = D.session || {});
    S.active = true;
    S.preText = preSnapshot || "";
    S.commitDone = false;
    S.startedAt = Date.now();
    S.id = (S.id || 0) + 1;

    let started = false;
    (async () => {
      const panel = await D.dom.getPanelTextarea();
      S.panelBaseline = panel?.getValue?.() || "";
      started = true;
      cp("watch:start", {
        id: S.id,
        preLen: S.preText.length,
        baseLen: S.panelBaseline.length,
      });
    })();

    const MAX_MS = 12000;
    const STEP_MS = 150;
    const t0 = Date.now();

    if (S.timer) {
      try {
        clearInterval(S.timer);
      } catch {}
      S.timer = null;
    }

    S.timer = setInterval(async () => {
      if (!started) return;
      if (!S.active || S.commitDone) {
        clearInterval(S.timer);
        S.timer = null;
        return;
      }
      const panel = await D.dom.getPanelTextarea();
      const val = panel?.getValue?.() || "";
      if (val && val !== S.panelBaseline) {
        clearInterval(S.timer);
        S.timer = null;
        cp("watch:panel:change", {
          id: S.id,
          valLen: val.length,
          baseLen: S.panelBaseline.length,
        });
        await commitMergedToBoth(val);
        S.active = false;
      } else if (Date.now() - t0 >= MAX_MS) {
        clearInterval(S.timer);
        S.timer = null;
        cp("watch:timeout", { id: S.id });
        S.active = false;
        // NEW: on timeout (cancel/stop), still bring the panel back
        tryShowPanel("watch:timeout");
      }
    }, STEP_MS);
  }

  D.finalize = { __v: "3.9.6", commitMergedToBoth, startWatchWithBaseline };
  cp("finalize:ready", { v: "3.9.6" });

  try {
    window.dispatchEvent(new CustomEvent("ap:dictation:finalize-ready"));
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/dictation-fallback.js");

/* ===== auto-prompter/userscript/glue/dictation-fallback.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/dictation-fallback.js";try{
// userscript-dictation-glue/events 3.9.3 (fallback loader -> unified listener)
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const D = (AP.dictGlue = AP.dictGlue || {});
  const cp = (D && D.cp) || function () {};
  const log = (D && D.log) || console;

  const INST = Symbol.for("ap.dictation.events.installed.v393");
  if (window[INST]) return;
  window[INST] = true;

  if (D.events2 && D.events2.__v && D.events2.__v >= "3.9.3") return;

  const pending = [];

  function tryFlush() {
    const fn = D.finalize && D.finalize.commitMergedToBoth;
    if (typeof fn !== "function") return false;
    while (pending.length) {
      const t = pending.shift();
      try {
        fn(t);
      } catch (e) {
        pending.unshift(t);
        break;
      }
    }
    return true;
  }

  window.addEventListener("ap:dictation:finalize-ready", () => {
    tryFlush();
  });

  async function startShortWatch() {
    try {
      if (typeof D.finalize?.startWatchWithBaseline === "function") {
        const snap = await D.dom.readComposerTextRaw().catch(() => "");
        D.finalize.startWatchWithBaseline(snap || "");
      }
    } catch {}
  }

  window.addEventListener("ap:dictation:result", (ev) => {
    try {
      const { text, isFinal } = ev?.detail || {};
      if (!text || !isFinal) return;
      cp("finalize:event:dictation:result");
      startShortWatch();
      if (!tryFlush()) {
        pending.push(String(text));
        log.info?.("[dictation] finalize not ready; buffered final", {
          len: String(text).length,
          q: pending.length,
        });
      }
    } catch {}
  });

  D.events2 = { __v: "3.9.3" };
  cp("events:ready", { v: "3.9.3" });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/dictation-events.js");

/* ===== auto-prompter/userscript/glue/dictation-events.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/dictation-events.js";try{
// userscript-dictation-glue/events 3.9.3
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const D = (AP.dictGlue = AP.dictGlue || {});
  const cp = (D && D.cp) || function () {};
  const log = (D && D.log) || console;

  const INST = Symbol.for("ap.dictation.events.installed.v393");
  if (window[INST]) return;
  window[INST] = true;

  if (D.events2 && D.events2.__v && D.events2.__v >= "3.9.3") return;

  const pending = [];

  function tryFlush() {
    const fn = D.finalize && D.finalize.commitMergedToBoth;
    if (typeof fn !== "function") return false;
    while (pending.length) {
      const t = pending.shift();
      try {
        fn(t);
      } catch (e) {
        pending.unshift(t);
        break;
      }
    }
    return true;
  }

  // If/when finalize comes up, flush any buffered finals
  window.addEventListener("ap:dictation:finalize-ready", () => {
    tryFlush();
  });

  // Kick off a short watch as soon as we get a final result so we always merge once.
  async function startShortWatch() {
    try {
      if (typeof D.finalize?.startWatchWithBaseline === "function") {
        const snap = await D.dom.readComposerTextRaw().catch(() => "");
        D.finalize.startWatchWithBaseline(snap || "");
      }
    } catch {}
  }

  window.addEventListener("ap:dictation:result", (ev) => {
    try {
      const { text, isFinal } = ev?.detail || {};
      if (!text || !isFinal) return;
      cp("finalize:event:dictation:result");
      startShortWatch();
      if (!tryFlush()) {
        pending.push(String(text));
        log.info?.("[dictation] finalize not ready; buffered final", {
          len: String(text).length,
          q: pending.length,
        });
      }
    } catch {}
  });

  D.events2 = { __v: "3.9.3" };
  cp("events:ready", { v: "3.9.3" });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/dictation-accept.js");

/* ===== auto-prompter/userscript/glue/dictation-accept.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/dictation-accept.js";try{
// VERSION: userscript-dictation-glue/3.4.0 (module: accept/finalize)
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const D = (AP.dictGlue = AP.dictGlue || {});
  const cp = (D && D.cp) || function () {};
  const log = (D && D.log) || console;

  const GATE_ACCEPT_SEL = [
    "[data-ap-role='accept']",
    "[data-ap-action='accept']",
    "button[aria-label='Accept']",
    "button[aria-label='Submit']",
    "button[aria-label='Confirm']",
    ".ap-accept",
    ".ap-gate-accept",
    "button:has(svg[aria-label='Check'])",
    "button:has([data-icon='check'])",
    "button:has(svg[aria-label='✓']), button:has(svg[aria-label='check'])",
    "button:has(span):not([aria-label])[data-accept='1']",
    ".ap-dict-gate__btn--ok",
    "[data-ap-accept='1']",
  ].join(",");

  function findGateRoot() {
    try {
      return (
        document.querySelector(
          ".ap-dict-gate, .ap-dictation-gate, [data-ap='dictation-gate'], .ap-gate, .ap-overlay"
        ) || document.body
      );
    } catch {
      return document.body;
    }
  }

  function tryClickGateAccept() {
    try {
      const root = findGateRoot();
      const btn = root && root.querySelector(GATE_ACCEPT_SEL);
      if (btn) {
        btn.click();
        log.info("[dictation] auto-accept: clicked gate ✓");
        cp("accept:click-ok");
        return true;
      }
    } catch (e) {
      log.warn("[dictation] auto-accept: click ✓ failed", e);
      cp("accept:click-fail", { err: String(e?.message || e) });
    }
    return false;
  }

  function synthEnter() {
    try {
      const ev = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        bubbles: true,
        cancelable: true,
      });
      const root = findGateRoot();
      (root || document).dispatchEvent(ev);
      window.dispatchEvent(ev);
      log.info("[dictation] auto-accept: dispatched synthetic Enter");
      cp("accept:synth-enter");
      return true;
    } catch (e) {
      log.warn("[dictation] auto-accept: synthetic Enter failed", e);
      cp("accept:synth-enter-fail", { err: String(e?.message || e) });
      return false;
    }
  }

  function tryGateAcceptProgrammatic() {
    try {
      if (AP.gate && typeof AP.gate.accept === "function") {
        const ok = !!AP.gate.accept();
        if (ok) {
          log.info("[dictation] auto-accept: AP.gate.accept()");
          cp("accept:programmatic-ok");
        } else {
          cp("accept:programmatic-noop");
        }
        return ok;
      }
    } catch (e) {
      cp("accept:programmatic-fail", { err: String(e?.message || e) });
    }
    return false;
  }

  function autoAcceptIfNeeded(text, { isFinal }) {
    const F = (D.flags && D.flags.dictation) || {};
    if (!AP.gate?.state?.().open) return false;
    if (!isFinal) return false;
    const minLen = Math.max(0, Number(F.minCharsToAutoAccept) || 0);
    if ((text || "").trim().length < minLen) return false;

    const kw = String(F.acceptOnFinalKeyword || "").trim();
    let newText = text || "";

    if (kw) {
      const re = new RegExp(`\\b${kw}\\b\\s*$`, "i");
      if (re.test(newText)) {
        if (F.stripKeywordOnAccept) newText = newText.replace(re, "").trimEnd();
        if (newText !== text) AP.gate.update(newText, { replace: true });
        if (!tryGateAcceptProgrammatic() && !tryClickGateAccept()) synthEnter();
        cp("accept:keyword", { stripped: !!F.stripKeywordOnAccept });
        return true;
      }
    }

    if (F.autoAcceptOnFinal) {
      const ms = Math.max(0, Number(F.finalAcceptDebounceMs) || 0);
      setTimeout(() => {
        if (AP.gate?.state?.().open) {
          if (!tryGateAcceptProgrammatic() && !tryClickGateAccept())
            synthEnter();
          cp("accept:auto-final");
        }
      }, ms);
      return true;
    }
    return false;
  }

  D.accept = { autoAcceptIfNeeded };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/dictation-compose.js");

/* ===== auto-prompter/userscript/glue/dictation-compose.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/dictation-compose.js";try{
// auto-prompter/userscript/glue/dictation-compose.js
// VERSION: userscript-dictation-glue/3.5.0 (breadcrumbs, sturdier fallbacks, longer waits)
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const D = (AP.dictGlue = AP.dictGlue || {});
  const U = (AP.shared && AP.shared.utils) || null;
  const cp = (D && D.cp) || function () {};
  const log = (D && D.log) || console;

  AP.bc?.mark?.("userscript/glue/dictation-compose.js", {
    ver: "userscript-dictation-glue/3.5.0",
    sig: "manual-patch",
  });

  async function getComposerEl() {
    try {
      const res = await AP?.composerDetect?.findComposer?.({
        allowInputOnly: true,
      });
      if (!res || !res.input) return null;
      const inner =
        res.input.querySelector?.('[contenteditable="true"]') ||
        res.input.querySelector?.('.ProseMirror[contenteditable="true"]');
      return inner || res.input || null;
    } catch {
      return null;
    }
  }

  async function readComposerTextOnce() {
    try {
      const el = await getComposerEl();
      if (!el) return "";
      const raw =
        (await AP?.io?.getInputValue?.(el)) ?? el.value ?? el.textContent ?? "";
      const cleaned = (
        U?.stripZw ? U.stripZw(String(raw)) : String(raw)
      ).trim();
      if (U?.DEBUG)
        log.info("[dictation] composer:text", {
          len: cleaned.length,
          sample: cleaned.slice(0, 120),
        });
      return cleaned;
    } catch {
      return "";
    }
  }

  const isSendReady =
    AP.detectSelectors?.isSendReady ||
    AP.composerDetect?.isSendReady ||
    ((btn) => {
      if (!btn) return false;
      const aria = (btn.getAttribute?.("aria-disabled") || "").toLowerCase();
      if (aria === "true" || aria === "1") return false;
      if (btn.disabled) return false;
      return U?.isVisible ? U.isVisible(btn) : true;
    });

  async function clickIfReady(btn, inputEl) {
    if (btn && isSendReady(btn)) {
      try {
        btn.click();
      } catch {}
      log.info("[dictation] clicked Send");
      cp("send:clicked");
      return true;
    }
    // last-ditch: Enter on input
    try {
      const ev = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        bubbles: true,
        cancelable: true,
      });
      (inputEl || document).dispatchEvent(ev);
      window.dispatchEvent(ev);
      cp("send:enter-fallback");
      return true;
    } catch {}
    return false;
  }

  async function tryStrictComposeAndSend() {
    try {
      if (typeof AP?.compose?.composeAndSend === "function") {
        const ok = await AP.compose.composeAndSend();
        if (ok) {
          log.info("[dictation] composeAndSend(strict) succeeded");
          cp("send:strict-ok");
          return true;
        }
      }
    } catch (e) {
      log.warn("[dictation] composeAndSend(strict) error", e);
      cp("send:strict-fail", { err: String(e?.message || e) });
    }
    return false;
  }

  async function waitAndClickSend({ timeoutMs = 10000, pollMs = 120 } = {}) {
    if (await tryStrictComposeAndSend()) return true;

    const t0 = Date.now();
    let lastInput = null;
    while (Date.now() - t0 < timeoutMs) {
      try {
        const r = await AP?.composerDetect?.findComposer?.({
          allowInputOnly: false,
        });
        lastInput = r?.input || lastInput;
        if (r && r.send && (await clickIfReady(r.send, lastInput))) return true;

        if (AP?.detectProbe?.tryOnce) {
          const once = await AP.detectProbe.tryOnce(document);
          lastInput = once?.input || lastInput;
          if (once && once.send && (await clickIfReady(once.send, lastInput)))
            return true;
        }
      } catch {}
      await (U?.sleep
        ? U.sleep(pollMs)
        : new Promise((res) => setTimeout(res, pollMs)));
    }
    log.warn("[dictation] send button not found/ready within timeout");
    cp("send:timeout", { timeoutMs });
    return false;
  }

  D.compose = {
    getComposerEl,
    readComposerTextOnce,
    waitAndClickSend,
    tryStrictComposeAndSend,
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/dictation-guard.js");

/* ===== auto-prompter/userscript/glue/dictation-guard.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/dictation-guard.js";try{
// auto-prompter/userscript/glue/dictation-guard.js
// VERSION: userscript-dictation-glue/3.5.0 (MO rewire, multi-form, more breadcrumbs)
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const D = (AP.dictGlue = AP.dictGlue || {});
  const U = (AP.shared && AP.shared.utils) || null;
  const cp = (D && D.cp) || function () {};
  const log = (D && D.log) || console;

  AP.bc?.mark?.("userscript/glue/dictation-guard.js", {
    ver: "userscript-dictation-glue/3.5.0",
    sig: "manual-patch",
  });

  const SUBMIT_BYPASS_ATTR = "data-ap-gate-bypass";
  const HOOKED = new WeakSet();

  async function readSeed() {
    try {
      const seed = await D.compose?.readComposerTextOnce?.();
      return String(seed || "");
    } catch {
      return "";
    }
  }

  async function seedGateFromComposer() {
    try {
      const seed = await readSeed();
      if (!AP.gate.state().open) AP.gate.ensure(seed || "");
      if (U?.isMeaningfulText ? U.isMeaningfulText(seed) : !!seed) {
        AP.gate.update(seed, { replace: true });
      }
      cp("guard:seed", { len: (seed || "").length });
    } catch (e) {
      cp("guard:seed:noop", { msg: String(e?.message || e) });
    }
  }

  function resolveComposer() {
    try {
      const fn = AP?.composerDetect?.findComposer;
      if (typeof fn !== "function") return Promise.resolve(null);
      const res = fn({ allowInputOnly: false });
      return res && typeof res?.then === "function"
        ? res
        : Promise.resolve(res || null);
    } catch {
      return Promise.resolve(null);
    }
  }

  function findCandidateForms() {
    const out = new Set();
    const explicit =
      document.querySelectorAll("form[action*='/backend-api/conversation']") ||
      [];
    explicit.forEach((f) => out.add(f));
    // Fallback: any form that appears to be the composer’s parent
    document.querySelectorAll("form").forEach((f) => out.add(f));
    return Array.from(out);
  }

  async function onSubmitCaptureFactory(form, composer) {
    return async function onSubmitCapture(e) {
      try {
        if (form.hasAttribute(SUBMIT_BYPASS_ATTR)) return;

        const needsGate =
          typeof AP?.dictation?.shouldGate === "function"
            ? !!AP.dictation.shouldGate({ composer })
            : true;

        if (!needsGate) return;

        e.preventDefault();
        e.stopImmediatePropagation();

        log.info("[dictationGate] submit intercepted (capture) → opening gate");
        cp("guard:submit:intercept");

        await seedGateFromComposer();

        const { accepted, text } = await AP.gate.waitDecision();
        if (!accepted) {
          log.info("[dictationGate] decision: cancel → abort submit");
          AP.gate.close();
          cp("guard:submit:cancel");
          return;
        }

        const target =
          D.state?.gateTarget ||
          composer?.input ||
          (await D.compose?.getComposerEl?.()) ||
          (U?.getFocusedEditable ? U.getFocusedEditable() : null);

        if (!target) {
          log.warn("[dictationGate] accept: no target found");
          AP.gate.close();
          cp("guard:submit:no-target");
          return;
        }

        try {
          D.compose && AP.gate?._trace?.willWrite?.((text || "").length);
          if (U?.writeTo) U.writeTo(target, text, { append: false });
          else if ("value" in target) target.value = text;
          else target.textContent = text;
          target.focus?.();
          AP.gate?._trace?.wrote?.((text || "").length);
          cp("guard:submit:wrote", { len: (text || "").length });
        } catch (e) {
          log.warn("[dictationGate] failed to write text", e);
          cp("guard:submit:write-fail", { err: String(e?.message || e) });
        }

        form.setAttribute(SUBMIT_BYPASS_ATTR, "1");
        try {
          if (typeof form.requestSubmit === "function") {
            const btn =
              composer?.send ||
              form.querySelector(
                "#composer-submit-button,[data-testid='send-button'],button[aria-label='Send prompt']"
              ) ||
              null;
            form.requestSubmit(btn || undefined);
          } else if (composer?.send) {
            composer.send.click();
          } else {
            await D.compose?.waitAndClickSend?.({
              timeoutMs: 7000,
              pollMs: 120,
            });
          }
          cp("guard:submit:resubmitted");
        } catch (reSubmitErr) {
          log.warn("[dictationGate] re-submit failed", reSubmitErr);
          cp("guard:submit:resubmit-fail", {
            err: String(reSubmitErr?.message || reSubmitErr),
          });
        } finally {
          setTimeout(() => form.removeAttribute(SUBMIT_BYPASS_ATTR), 0);
        }

        AP.gate.close();
      } catch (err) {
        log.error("[dictationGate] submit guard error", err);
        cp("guard:submit:error", { err: String(err?.message || err) });
        try {
          AP.gate.close();
        } catch {}
      }
    };
  }

  async function hookForm(form) {
    if (!form || HOOKED.has(form)) return false;
    let composer = null;
    try {
      composer = await resolveComposer();
    } catch {
      composer = null;
    }
    const handler = await onSubmitCaptureFactory(form, composer);
    form.addEventListener("submit", handler, true);
    HOOKED.add(form);
    log.info("[dictationGate] submit guard installed (capture)", {
      hooked: true,
    });
    cp("guard:installed", { which: "capture", hooked: true });
    return true;
  }

  async function wireSubmitGuardOnce() {
    // Hook any existing forms
    const forms = findCandidateForms();
    let count = 0;
    for (const f of forms) {
      // eslint-disable-next-line no-await-in-loop
      if (await hookForm(f)) count++;
    }
    cp("guard:scan", { found: forms.length, hooked: count });

    // Watch for new forms / route changes and hook them too
    if (!wireSubmitGuardOnce._mo) {
      const mo = new MutationObserver(async () => {
        const batch = findCandidateForms();
        for (const f of batch) {
          // eslint-disable-next-line no-await-in-loop
          await hookForm(f);
        }
      });
      mo.observe(document.documentElement || document.body, {
        subtree: true,
        childList: true,
      });
      wireSubmitGuardOnce._mo = mo;
      cp("guard:observer");
    }
  }

  D.guard = { wireSubmitGuardOnce };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/dictation-site-watchers.js");

/* ===== auto-prompter/userscript/glue/dictation-site-watchers.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/dictation-site-watchers.js";try{
// VERSION: userscript-dictation-glue/3.4.1 (module: site mic watchers + instant hide fallbacks)
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const D = (AP.dictGlue = AP.dictGlue || {});
  const U = (AP.shared && AP.shared.utils) || null;
  const cp = (D && D.cp) || function () {};
  const log = (D && D.log) || console;

  function hidePanelNow(tag) {
    try {
      const ctl = AP.uiLayoutParts?.control;
      if (!ctl?.hide) return false;
      const wasVisible = !(ctl.isHidden?.() ?? false);
      D.state.panelWasVisibleOnMic = wasVisible;
      ctl.hide();
      cp(tag, { wasVisible });
      return true;
    } catch {
      return false;
    }
  }

  function installSiteMicWatchers() {
    if (installSiteMicWatchers._done) return;
    installSiteMicWatchers._done = true;

    const mo = new MutationObserver(() => {
      const btnSubmit = document.querySelector(
        "button.composer-btn[aria-label='Submit dictation']"
      );
      const btnStop = document.querySelector(
        "button.composer-btn[aria-label='Stop dictation']"
      );

      // NEW: if a Stop button appears, dictation is live → hide immediately
      if (btnStop && !btnStop.__apObservedVisible) {
        btnStop.__apObservedVisible = true;
        hidePanelNow("panel:auto-hide:stop-visible");
      }

      if (btnSubmit && !btnSubmit.__apHooked) {
        btnSubmit.__apHooked = true;
        btnSubmit.addEventListener(
          "click",
          async () => {
            try {
              // instant hide on submit click (in case hooks path missed it)
              hidePanelNow("panel:auto-hide:submit-click");

              log.info("[dictation] submit handler invoked (legacy)");
              cp("legacy:submit-click");

              await (D.guard ? 0 : 0); // ensure module loaded

              try {
                const seed = await D.compose?.readComposerTextOnce?.();
                if (!AP.gate.state().open) AP.gate.ensure(seed || "");
                if (U?.isMeaningfulText ? U.isMeaningfulText(seed) : !!seed) {
                  AP.gate.update(seed, { replace: true });
                }
                cp("seed", { len: (seed || "").length });
              } catch {
                cp("seed:noop");
              }

              log.info("[dictation] waiting for gate decision (✓ / ✗) ...");
              const { accepted, text } = await AP.gate.waitDecision();
              if (!accepted) {
                log.info("[dictation] gate declined by user");
                AP.gate.close();
                cp("legacy:cancel");
                return;
              }

              const target =
                D.state?.gateTarget ||
                (await D.compose?.getComposerEl?.()) ||
                (U?.getFocusedEditable ? U.getFocusedEditable() : null);
              if (!target) {
                log.warn("[dictation] accept: no target found");
                AP.gate.close();
                cp("legacy:no-target");
                return;
              }
              if (U?.writeTo) U.writeTo(target, text, { append: false });
              else if ("value" in target) target.value = text;
              else target.textContent = text;

              target.focus?.();
              log.info("[dictation] accepted → inserted", { len: text.length });
              cp("legacy:inserted", { len: (text || "").length });

              await D.compose?.waitAndClickSend?.({
                timeoutMs: 7000,
                pollMs: 120,
              });
              AP.gate.close();
              cp("legacy:sent");
            } catch (err) {
              log.error("[dictation] submit hook error", err);
              cp("legacy:error", { err: String(err?.message || err) });
              AP.gate.close();
            }
          },
          true
        );
        log.info("[dictation] submit button hooked");
      }

      if (btnStop && !btnStop.__apHooked) {
        btnStop.__apHooked = true;
        btnStop.addEventListener(
          "click",
          () => {
            try {
              log.info("[dictation] site stop clicked");
              cp("legacy:stop");
              AP.gate.close();
            } catch (err) {
              log.error("[dictation] stop hook error", err);
              cp("legacy:stop-error", { err: String(err?.message || err) });
              AP.gate.close();
            }
          },
          true
        );
        log.info("[dictation] stop button hooked");
      }
    });

    mo.observe(document.documentElement || document.body, {
      subtree: true,
      childList: true,
    });
    installSiteMicWatchers._observer = mo;
    cp("watchers:installed");

    // NEW: global click fallback for common mic buttons (bypasses any engine path)
    const MIC_SELECTORS = [
      "button[aria-label='Dictate button']",
      ".composer-btn[aria-label='Dictate button']",
      "button[aria-label='Start dictation']",
      "button[aria-label='Dictate']",
    ].join(",");
    window.addEventListener(
      "click",
      (e) => {
        try {
          const t =
            e.target && e.target.closest && e.target.closest(MIC_SELECTORS);
          if (t) hidePanelNow("panel:auto-hide:global-click");
        } catch {}
      },
      true
    );
  }

  D.site = { installSiteMicWatchers };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/dictation-selftest.js");

/* ===== auto-prompter/userscript/glue/dictation-selftest.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/dictation-selftest.js";try{
// userscript-dictation-glue/selftest 3.9.0
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const D = (AP.dictGlue = AP.dictGlue || {});
  const cp = (D && D.cp) || function () {};

  if (D.selftest && D.selftest.__v === "3.9.0") return;

  async function selftest() {
    const M = AP.dictationMod || {};
    const mic = M.mic || {};
    const cap = M.capture || {};
    const comp =
      (await AP?.composerDetect?.findComposer?.({ allowInputOnly: false })) ||
      {};
    const status = {
      ver: "userscript-dictation-glue/3.9.0",
      micHooked: !!(mic.clickMic && mic.clickMic.__ap_glue_wrapped),
      capHooked: !!(
        cap.captureToTextarea && cap.captureToTextarea.__ap_glue_wrapped
      ),
      hasComposerInput: !!comp.input,
      hasComposerSend: !!comp.send,
      time: new Date().toISOString(),
    };
    cp("selftest", status);
    console.table ? console.table(status) : console.info("[selftest]", status);
    return status;
  }

  D.selftest = Object.assign(selftest, { __v: "3.9.0" });
  cp("selftest:ready", { v: "3.9.0" });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/dictation-api.js");

/* ===== auto-prompter/userscript/glue/dictation-api.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/dictation-api.js";try{
// VERSION: userscript-dictation-glue/3.4.0 (module: public API)
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const D = (AP.dictGlue = AP.dictGlue || {});
  const U = (AP.shared && AP.shared.utils) || null;
  const cp = (D && D.cp) || function () {};
  const log = (D && D.log) || console;

  function ensure() {
    try {
      D.events?.installResultListenersOnce?.();
    } catch {}
    try {
      D.site?.installSiteMicWatchers?.();
    } catch {}
    try {
      D.guard?.wireSubmitGuardOnce?.();
      const retryId = setInterval(() => {
        if (D.guard?.wireSubmitGuardOnce?._done) return clearInterval(retryId);
        D.guard?.wireSubmitGuardOnce?.();
      }, 700);
      setTimeout(() => clearInterval(retryId), 8000);
      cp("guard:arm");
    } catch (e) {
      log.warn("[dictationGate] submit guard init error", e);
      cp("guard:init-error", { err: String(e?.message || e) });
    }
    return true;
  }

  function click() {
    ensure();
    D.state.gateTarget =
      (U?.getFocusedEditable && U.getFocusedEditable()) || D.state.gateTarget;
    AP.gate.ensure("");

    const micMod =
      (AP.dictationMod && AP.dictationMod.mic) || AP.dictation || null;
    const btn = micMod?.findButton ? micMod.findButton() : null;

    if (!btn) {
      log.warn("[dictation] button not found");
      cp("click:mic-missing");
      return false;
    }

    let ok = false;
    try {
      ok = micMod?.clickMic ? !!micMod.clickMic(btn) : false;
    } catch (e) {
      log.warn("[dictation] mic click error", e);
      cp("click:mic-error", { err: String(e?.message || e) });
      ok = false;
    }

    log.info("[dictation] clicked site mic");
    cp("click:mic", { ok: !!ok });
    return ok;
  }

  AP.dictationGlue = {
    ensure,
    click,
    routeTranscript: D.routeTranscript,
    __v: "userscript-dictation-glue/3.4.0",
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/dictation-glue.js");

/* ===== auto-prompter/userscript/glue/dictation-glue.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/dictation-glue.js";try{
// auto-prompter/userscript/glue/dictation-glue.js
// VERSION: userscript-dictation-glue/3.9.0 (modular bootstrap)
(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const D = (AP.dictGlue = AP.dictGlue || {});
  const cp = (D && D.cp) || function () {};
  const log = (D && D.log) || console;

  AP.bc?.mark?.("userscript/glue/dictation-glue.js", {
    ver: "userscript-dictation-glue/3.9.0",
    sig: "modular",
  });

  if (!AP.__dictationGlueLoaded) {
    AP.__dictationGlueLoaded = true;
    cp("init:first");
    try {
      AP.dictationGlue?.ensure?.();
    } catch {}
    log.info("[dictation] glue ready (userscript-dictation-glue/3.9.0)");
    cp("ready");
  } else {
    cp("init:reload");
    log.info("[dictation] glue reloaded; re-installing hooks");
  }

  if (!AP.__dictationGlueFinalizerLoaded) {
    AP.__dictationGlueFinalizerLoaded = true;
    cp("finalizer:first-install");
  } else {
    cp("finalizer:reinstall");
  }

  // Bring up hooks (with retries) once modules are present
  try {
    D.hooks?.installHooksWithRetry?.();
  } catch {}

  log.info("[dictation] finalizer installed (merge-to-composer)");
  cp("finalize:installed");
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/dictation.js");

/* ===== auto-prompter/userscript/glue/dictation.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/dictation.js";try{
// ./auto-prompter/userscript/glue/dictation.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  if (AP.__dictationGlueLoaded) {
    (console.info || console.log)(
      "[dictation] legacy glue skipped (new glue already loaded)"
    );
    return;
  }

  if (AP.__legacyDictationGlueSkipped) return;
  AP.__legacyDictationGlueSkipped = true;

  (console.info || console.log)(
    "[dictation] legacy glue disabled; waiting for dictation-glue.js"
  );
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/dev.js");

/* ===== auto-prompter/userscript/glue/dev.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/dev.js";try{
// ./auto-prompter/userscript/glue/dev.js
(function (g) {
  "use strict";
  const AP = (g.AutoPrompter = g.AutoPrompter || {});
  try {
    (g.__AP_LOAD = g.__AP_LOAD || []).push(
      "auto-prompter/userscript/glue/dev.js"
    );
  } catch {}
  (AP.userscript = AP.userscript || {}).devEnabled =
    (AP.userscript && AP.userscript.devEnabled) ||
    (() => {
      try {
        const fromApi = AP.flags?.dev?.();
        if (typeof fromApi === "boolean") return fromApi;
      } catch {}
      try {
        if (new URL(g.location.href).searchParams.get("ap_dev") === "1")
          return true;
      } catch {}
      try {
        if (String(localStorage.getItem("ap_dev")) === "1") return true;
      } catch {}
      return false;
    });
})(globalThis);

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/prompt-parser-fallback.js");

/* ===== auto-prompter/userscript/glue/prompt-parser-fallback.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/prompt-parser-fallback.js";try{
// ./auto-prompter/userscript/glue/prompt-parser-fallback.js
(function (g) {
  "use strict";
  const AP = (g.AutoPrompter = g.AutoPrompter || {});
  try {
    (g.__AP_LOAD = g.__AP_LOAD || []).push(
      "auto-prompter/userscript/glue/prompt-parser-fallback.js"
    );
  } catch {}
  AP.promptParser = AP.promptParser || {};
  if (typeof AP.promptParser.parse === "function") return;

  const L = AP.logger || console;
  AP.promptParser.parse = function (input) {
    const text = input && input.text ? String(input.text) : String(input ?? "");
    const trimmed = text.trim();
    const meta = {};
    const codeBlocks = [];
    try {
      const re = /```(\w+)?\n([\s\S]*?)```/g;
      let m;
      while ((m = re.exec(text)))
        codeBlocks.push({ lang: (m[1] || "").trim() || null, code: m[2] });
    } catch {}
    meta.codeBlocks = codeBlocks;
    const flags = [];
    try {
      const fl = trimmed.match(/(?:^|\s)\/([a-z0-9_-]+)/gi) || [];
      for (const f of fl) flags.push(f.trim().slice(1).toLowerCase());
    } catch {}
    meta.flags = Array.from(new Set(flags));
    return { text: trimmed, meta };
  };

  try {
    g.dispatchEvent(new CustomEvent("ap:prompt-parser:ready"));
  } catch {}

  (L.info || L.log)("[AP glue] promptParser.parse (fallback) installed");
})(globalThis);

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/utils/dom.js");

/* ===== auto-prompter/utils/dom.js ===== */
(function(){var __AP_MOD="/auto-prompter/utils/dom.js";try{
(function () {
  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k in e) e[k] = v;
      else e.setAttribute(k, v);
    }
    for (const c of children)
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    return e;
  }

  function injectStyles(cssText, root = document.head) {
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(cssText);
      const target = root instanceof ShadowRoot ? root : document;
      const current = target.adoptedStyleSheets || [];
      target.adoptedStyleSheets = [...current, sheet];
      return sheet;
    } catch {}
    const style = document.createElement("style");
    style.setAttribute("data-ap-style", "1");
    style.appendChild(document.createTextNode(cssText));
    const container =
      root && root.nodeType === 11
        ? root
        : document.head || document.documentElement;
    try {
      if (container.firstChild)
        container.insertBefore(style, container.firstChild);
      else container.appendChild(style);
      return style;
    } catch {
      requestAnimationFrame(() => {
        try {
          (document.head || document.documentElement).appendChild(style);
        } catch {}
      });
      return style;
    }
  }

  async function waitForSelector(sel, timeout = 10000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const node = document.querySelector(sel);
      if (node) return node;
      await new Promise((r) => setTimeout(r, 250));
    }
    return null;
  }

  window.AutoPrompter = window.AutoPrompter || {};
  window.AutoPrompter.dom = { el, injectStyles, waitForSelector };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/utils/config/constants.js");

/* ===== auto-prompter/utils/config/constants.js ===== */
(function(){var __AP_MOD="/auto-prompter/utils/config/constants.js";try{
(function () {
  const KEY = "autoprompter_cfg_v5";
  const TPL = "autoprompter_templates_v2";

  // Faster, balanced defaults
  const DEFAULTS = {
    inputSel:
      '#prompt-textarea.ProseMirror[contenteditable="true"],.ProseMirror[contenteditable="true"]#prompt-textarea,.ProseMirror[contenteditable="true"],textarea[name="prompt-textarea"]',
    submitSel:
      "#composer-submit-button,[data-testid='send-button'],button[aria-label='Send prompt']",
    stopSel:
      "[data-testid='stop-button'],button[aria-label='Stop generating'],button:has(svg[aria-label='Stop'])",
    sequence: "3x: Hello World\npause: 250\n1x: Goodbye!",
    delayMs: 250,
    scanMs: 300,
    minIntervalMs: 200,
    autoDetect: true,
    profiles: {
      "chat.openai.com": {
        inputSel:
          '#prompt-textarea.ProseMirror[contenteditable="true"],.ProseMirror[contenteditable="true"]#prompt-textarea,.ProseMirror[contenteditable="true"],textarea[name="prompt-textarea"]',
        submitSel:
          "#composer-submit-button,[data-testid='send-button'],button[aria-label='Send prompt']",
        stopSel:
          "[data-testid='stop-button'],button[aria-label='Stop generating'],button:has(svg[aria-label='Stop'])",
        autoDetect: true,
      },
      "chatgpt.com": {
        inputSel:
          '#prompt-textarea.ProseMirror[contenteditable="true"],.ProseMirror[contenteditable="true"]#prompt-textarea,.ProseMirror[contenteditable="true"],textarea[name="prompt-textarea"]',
        submitSel:
          "#composer-submit-button,[data-testid='send-button'],button[aria-label='Send prompt']",
        stopSel:
          "[data-testid='stop-button'],button[aria-label='Stop generating'],button:has(svg[aria-label='Stop'])",
        autoDetect: true,
      },
    },
  };

  window.AutoPrompter = window.AutoPrompter || {};
  window.AutoPrompter.configParts = window.AutoPrompter.configParts || {};
  window.AutoPrompter.configParts.constants = { KEY, TPL, DEFAULTS };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/utils/config/storage.js");

/* ===== auto-prompter/utils/config/storage.js ===== */
(function(){var __AP_MOD="/auto-prompter/utils/config/storage.js";try{
(function () {
  const { KEY, DEFAULTS } = window.AutoPrompter.configParts.constants;

  function baseConfig() {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function mergeSiteProfile(cfg) {
    try {
      const host = location.hostname.toLowerCase();
      const map = cfg.profiles || {};
      const exact = map[host];
      if (exact) return { ...cfg, ...exact };
      const wildcard = Object.keys(map).find(
        (k) => k.startsWith("*.") && host.endsWith(k.slice(1))
      );
      if (wildcard) return { ...cfg, ...map[wildcard] };
    } catch {}
    return cfg;
  }

  function getConfig() {
    return mergeSiteProfile(baseConfig());
  }

  function saveConfig(updates) {
    const merged = { ...baseConfig(), ...updates };
    localStorage.setItem(KEY, JSON.stringify(merged));
    return mergeSiteProfile(merged);
  }

  window.AutoPrompter.configParts = window.AutoPrompter.configParts || {};
  window.AutoPrompter.configParts.storage = {
    baseConfig,
    mergeSiteProfile,
    getConfig,
    saveConfig,
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/utils/config/templates.js");

/* ===== auto-prompter/utils/config/templates.js ===== */
(function(){var __AP_MOD="/auto-prompter/utils/config/templates.js";try{
(function () {
  // LocalStorage-backed templates storage (config layer)
  // Exposed as window.AutoPrompter.configParts.templates
  const { TPL } = window.AutoPrompter.configParts.constants;

  function readAll() {
    try {
      const raw = localStorage.getItem(TPL);
      const arr = JSON.parse(raw || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function writeAll(items) {
    try {
      localStorage.setItem(TPL, JSON.stringify(items));
    } catch {}
  }

  function normalizeList(items) {
    return items
      .filter(
        (t) =>
          t &&
          typeof t.name === "string" &&
          t.name.trim().length > 0 &&
          typeof t.sequence === "string"
      )
      .map((t) => ({ name: t.name.trim(), sequence: t.sequence }));
  }

  function listTemplates() {
    return normalizeList(readAll());
  }

  function saveTemplate(name, sequence) {
    const n = String(name || "").trim();
    if (!n) return;
    const items = readAll();
    const idx = items.findIndex((t) => t && t.name === n);
    const row = { name: n, sequence: String(sequence ?? "") };
    if (idx >= 0) items[idx] = row;
    else items.push(row);
    writeAll(normalizeList(items));
  }

  function deleteTemplate(name) {
    const n = String(name || "").trim();
    if (!n) return;
    const items = readAll().filter((t) => t && t.name !== n);
    writeAll(normalizeList(items));
  }

  function exportTemplates() {
    return JSON.stringify(listTemplates(), null, 2);
  }

  function importTemplates(jsonText) {
    try {
      const parsed = JSON.parse(String(jsonText || "[]"));
      if (!Array.isArray(parsed)) return;
      writeAll(normalizeList(parsed));
    } catch {
      // ignore bad JSON
    }
  }

  window.AutoPrompter = window.AutoPrompter || {};
  window.AutoPrompter.configParts = window.AutoPrompter.configParts || {};
  window.AutoPrompter.configParts.templates = {
    listTemplates,
    saveTemplate,
    deleteTemplate,
    exportTemplates,
    importTemplates,
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/utils/config/profiles.js");

/* ===== auto-prompter/utils/config/profiles.js ===== */
(function(){var __AP_MOD="/auto-prompter/utils/config/profiles.js";try{
(function () {
  const { baseConfig, mergeSiteProfile } =
    window.AutoPrompter.configParts.storage;
  const { KEY } = window.AutoPrompter.configParts.constants;

  function listProfiles() {
    const cfg = baseConfig();
    return Object.keys(cfg.profiles || {});
  }

  function getProfile(hostname) {
    const cfg = baseConfig();
    return (cfg.profiles || {})[hostname] || null;
  }

  function saveProfile(hostname, profile) {
    const cfg = baseConfig();
    const profiles = { ...(cfg.profiles || {}) };
    profiles[hostname] = {
      inputSel: profile.inputSel || cfg.inputSel,
      submitSel: profile.submitSel || cfg.submitSel,
      stopSel: profile.stopSel || cfg.stopSel,
      autoDetect: Boolean(profile.autoDetect),
    };
    localStorage.setItem(KEY, JSON.stringify({ ...cfg, profiles }));
    return mergeSiteProfile({ ...cfg, profiles });
  }

  function deleteProfile(hostname) {
    const cfg = baseConfig();
    const profiles = { ...(cfg.profiles || {}) };
    delete profiles[hostname];
    localStorage.setItem(KEY, JSON.stringify({ ...cfg, profiles }));
    return mergeSiteProfile({ ...cfg, profiles });
  }

  window.AutoPrompter.configParts = window.AutoPrompter.configParts || {};
  window.AutoPrompter.configParts.profiles = {
    listProfiles,
    getProfile,
    saveProfile,
    deleteProfile,
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/utils/config/index.js");

/* ===== auto-prompter/utils/config/index.js ===== */
(function(){var __AP_MOD="/auto-prompter/utils/config/index.js";try{
(function () {
  const { DEFAULTS } = window.AutoPrompter.configParts.constants;
  const { getConfig, saveConfig } = window.AutoPrompter.configParts.storage;
  const {
    listTemplates,
    saveTemplate,
    deleteTemplate,
    exportTemplates,
    importTemplates,
  } = window.AutoPrompter.configParts.templates;
  const { listProfiles, getProfile, saveProfile, deleteProfile } =
    window.AutoPrompter.configParts.profiles;

  window.AutoPrompter = window.AutoPrompter || {};
  window.AutoPrompter.config = {
    DEFAULTS,
    getConfig,
    saveConfig,
    listTemplates,
    saveTemplate,
    deleteTemplate,
    exportTemplates,
    importTemplates,
    listProfiles,
    getProfile,
    saveProfile,
    deleteProfile,
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/position/storage.js");

/* ===== auto-prompter/ui/position/storage.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/position/storage.js";try{
// auto-prompter/ui/position/storage.js
(function () {
  const POS_KEY = "ap_ui_pos_v2";

  function load() {
    try {
      return JSON.parse(localStorage.getItem(POS_KEY) || "{}");
    } catch {
      return {};
    }
  }
  function save(p) {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(p));
    } catch {}
  }

  window.AutoPrompter = window.AutoPrompter || {};
  const ns = (window.AutoPrompter.uiPositionParts =
    window.AutoPrompter.uiPositionParts || {});
  ns.storage = { POS_KEY, load, save };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/position/geometry.js");

/* ===== auto-prompter/ui/position/geometry.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/position/geometry.js";try{
// auto-prompter/ui/position/geometry.js
(function () {
  const SNAP_PX = 28;
  const MARGIN = 12;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v ?? 0));
  const vw = () => window.innerWidth;
  const vh = () => window.innerHeight;

  function normalized(pos) {
    const p = { ...pos };
    if (p.docked !== "left" && p.docked !== "right") p.docked = null;
    if (typeof p.top !== "number") p.top = 20;
    return p;
  }

  function afterDragRelease(rect) {
    const distLeft = rect.left;
    const distRight = vw() - rect.right;

    if (distLeft < SNAP_PX || distRight < SNAP_PX) {
      if (distLeft <= distRight) {
        return {
          docked: "left",
          left: MARGIN,
          right: undefined,
          top: rect.top,
        };
      } else {
        return {
          docked: "right",
          right: MARGIN,
          left: undefined,
          top: rect.top,
        };
      }
    }
    return {
      docked: null,
      left: rect.left,
      right: vw() - rect.right,
      top: rect.top,
    };
  }

  const clampedTop = (top) => clamp(top, MARGIN, vh() - MARGIN);

  function resetToRightTop() {
    return {
      docked: "right",
      right: 20,
      top: 20,
      hidden: false,
      collapsed: false,
    };
  }

  window.AutoPrompter = window.AutoPrompter || {};
  const ns = (window.AutoPrompter.uiPositionParts =
    window.AutoPrompter.uiPositionParts || {});
  ns.geometry = {
    SNAP_PX,
    MARGIN,
    vw,
    vh,
    clamp,
    normalized,
    afterDragRelease,
    clampedTop,
    resetToRightTop,
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/position/apply.js");

/* ===== auto-prompter/ui/position/apply.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/position/apply.js";try{
// auto-prompter/ui/position/apply.js
(function () {
  const { geometry } = window.AutoPrompter.uiPositionParts;

  function toDOM(card, pos) {
    const p = geometry.normalized(pos);

    card.style.removeProperty("left");
    card.style.removeProperty("right");

    if (p.docked === "left") card.style.left = `${p.left ?? 20}px`;
    else card.style.right = `${p.right ?? 20}px`;

    card.style.top = `${geometry.clampedTop(p.top)}px`;

    card.classList.toggle("ap-card--collapsed", !!p.collapsed);
    card.classList.toggle("ap-card--hidden", !!p.hidden);
  }

  window.AutoPrompter = window.AutoPrompter || {};
  const ns = (window.AutoPrompter.uiPositionParts =
    window.AutoPrompter.uiPositionParts || {});
  ns.apply = { toDOM };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/position/drag.js");

/* ===== auto-prompter/ui/position/drag.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/position/drag.js";try{
// auto-prompter/ui/position/drag.js
(function () {
  const { geometry, storage, apply } = window.AutoPrompter.uiPositionParts;
  const { clamp, vw, vh } = geometry;

  function make(card, handle, pos, { onChange } = {}) {
    let startX = 0,
      startY = 0,
      startLeft = 0,
      startTop = 0,
      dragging = false;

    const onDown = (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const r = card.getBoundingClientRect();
      startLeft = r.left;
      startTop = r.top;
      startX = e.clientX;
      startY = e.clientY;
      dragging = true;
      card.classList.add("ap-card--dragging");
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };

    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const newLeft = clamp(
        startLeft + dx,
        geometry.MARGIN,
        vw() - geometry.MARGIN
      );
      const newTop = clamp(
        startTop + dy,
        geometry.MARGIN,
        vh() - geometry.MARGIN
      );

      pos.docked = null; // undock while dragging
      card.style.left = newLeft + "px";
      card.style.top = newTop + "px";
      card.style.right = "auto";
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      card.classList.remove("ap-card--dragging");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);

      const r = card.getBoundingClientRect();
      Object.assign(pos, geometry.afterDragRelease(r));
      storage.save(pos);
      apply.toDOM(card, pos);
      onChange?.(pos);
    };

    // dbl-click handle toggles collapse
    const onDbl = () => {
      pos.collapsed = !pos.collapsed;
      storage.save(pos);
      apply.toDOM(card, pos);
    };

    // keep clamped on resize
    const onResize = () => apply.toDOM(card, pos);

    handle.addEventListener("mousedown", onDown);
    handle.addEventListener("dblclick", onDbl);
    window.addEventListener("resize", onResize);
  }

  window.AutoPrompter = window.AutoPrompter || {};
  const ns = (window.AutoPrompter.uiPositionParts =
    window.AutoPrompter.uiPositionParts || {});
  ns.drag = { make };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/position/keyboard.js");

/* ===== auto-prompter/ui/position/keyboard.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/position/keyboard.js";try{
// auto-prompter/ui/position/keyboard.js
(function () {
  const { geometry, storage, apply } = window.AutoPrompter.uiPositionParts;

  function wireReset(pos, card) {
    window.addEventListener("keydown", (e) => {
      if (e.altKey && e.shiftKey && (e.key === "p" || e.key === "P")) {
        Object.assign(pos, geometry.resetToRightTop());
        storage.save(pos);
        apply.toDOM(card, pos);
      }
    });
  }

  window.AutoPrompter = window.AutoPrompter || {};
  const ns = (window.AutoPrompter.uiPositionParts =
    window.AutoPrompter.uiPositionParts || {});
  ns.keyboard = { wireReset };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/position/index.js");

/* ===== auto-prompter/ui/position/index.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/position/index.js";try{
// auto-prompter/ui/position/index.js
(function () {
  const parts = window.AutoPrompter.uiPositionParts || {};
  const { storage, geometry, apply, drag, keyboard } = parts;
  if (!storage || !geometry || !apply || !drag || !keyboard) {
    // If someone @require'd index before the parts, try again once the page finishes loading.
    document.addEventListener("DOMContentLoaded", attach, { once: true });
  } else {
    attach();
  }

  function attach() {
    const { storage, geometry, apply, drag, keyboard } =
      window.AutoPrompter.uiPositionParts;

    function loadPos() {
      return storage.load();
    }
    function savePos(p) {
      storage.save(p);
    }
    function applyPosition(card, pos) {
      apply.toDOM(card, pos);
    }
    function makeDraggable(card, handle, pos, opts) {
      drag.make(card, handle, pos, opts);
      keyboard.wireReset(pos, card);
    }
    function toggleHidden(card, pos, val) {
      pos.hidden = typeof val === "boolean" ? val : !pos.hidden;
      apply.toDOM(card, pos);
      storage.save(pos);
    }
    function toggleCollapsed(card, pos, val) {
      pos.collapsed = typeof val === "boolean" ? val : !pos.collapsed;
      apply.toDOM(card, pos);
      storage.save(pos);
    }
    function dock(card, pos, side /* 'left' | 'right' */) {
      pos.docked = side;
      if (side === "left") {
        pos.left = 20;
        delete pos.right;
      }
      if (side === "right") {
        pos.right = 20;
        delete pos.left;
      }
      pos.top = Math.max(20, pos.top ?? 20);
      apply.toDOM(card, pos);
      storage.save(pos);
    }

    window.AutoPrompter = window.AutoPrompter || {};
    window.AutoPrompter.uiPosition = {
      POS_KEY: storage.POS_KEY,
      loadPos,
      savePos,
      applyPosition,
      makeDraggable,
      toggleHidden,
      toggleCollapsed,
      dock,
    };
  }
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/theme.js");

/* ===== auto-prompter/ui/theme.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/theme.js";try{
// ./auto-prompter/ui/theme.js
(function () {
  function ensureTheme(root) {
    // Styles inside ShadowRoot
    const shadowCss = `
  .ap-card{
    position:fixed;top:20px;right:20px;
    background:#0b1220;color:#e5e7eb;
    border:1px solid #243145;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.3);
    width:min(980px, calc(100vw - 64px));z-index:2147483647;
    font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial
  }
  .ap-card--compact{width:min(720px, calc(100vw - 64px))}
  .ap-card--collapsed .ap-body{display:none}
  .ap-card--hidden{display:none !important}
  .ap-card--dragging{opacity:.95;cursor:grabbing}

  .ap-header{display:flex;justify-content:space-between;align-items:center;background:#111827;padding:8px 10px}
  .ap-dock{display:flex;gap:6px;margin-left:8px}
  .ap-body{padding:12px;display:grid;gap:12px}
  .ap-row{display:flex;gap:10px;flex-wrap:wrap}
  .ap-tabs{display:flex;gap:6px}
  .ap-tab{background:#141c2b;border:1px solid #243145;border-radius:8px;padding:6px 10px;cursor:pointer}
  .ap-tab--active{background:#1f2937;border-color:#3b82f6}

  textarea,input{background:#0f172a;color:#e5e7eb;border:1px solid #334155;border-radius:10px;padding:8px 10px}
  textarea{min-height:112px;resize:vertical}
  button{background:#1f2937;color:#e5e7eb;border:1px solid #374151;border-radius:10px;padding:8px 12px;cursor:pointer}
  button:hover{background:#374151}
  .ap-cta{box-shadow:0 0 0 1px #3b82f6 inset}
  .ap-danger{background:#b91c1c;border-color:#7f1d1d}
  .ap-hud{margin-top:6px;padding:10px 12px;border:1px solid #243145;border-radius:12px;background:#0f172a;font-size:12.5px}

  .ap-log{height:160px;overflow:auto;background:#0a0f1a;border:1px solid #243145;border-radius:10px;padding:8px;
    font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;font-size:12px}
  .ap-log-line{white-space:pre-wrap;word-break:break-word}

  .ap-drag-handle{
    width:18px;height:18px;border-radius:4px;background:#1f2737;opacity:.95;cursor:grab;
    margin-right:8px;box-shadow:inset 0 0 0 2px #243145
  }

  /* ---------- Controls: Steps layout ---------- */
  .ap-steps{display:flex;flex-direction:column;gap:14px}
  .ap-step{
    display:grid;
    grid-template-columns: 1fr auto;
    gap:16px;align-items:start
  }
  .ap-step .ap-step-text{min-height:112px;width:100%;resize:vertical}

  .ap-step-actions{
    display:grid;
    grid-template-rows:auto auto;
    gap:12px;align-items:start
  }

  .ap-field-label{font-size:12px;opacity:.75}

  /* Repeat group */
  .ap-repeat-wrap{
    display:grid;grid-template-columns:auto;gap:6px;justify-items:end;min-width:176px
  }
  .ap-repeat-spinner{
    display:inline-flex;align-items:stretch;
    border:1px solid rgba(255,255,255,0.08);
    border-radius:10px;overflow:hidden;backdrop-filter:blur(2px)
  }
  .ap-repeat-spinner .ap-spin-btn{
    min-width:30px;height:30px;line-height:28px;font-size:14px;border:0;
    background:rgba(255,255,255,0.06);cursor:pointer
  }
  .ap-repeat-spinner .ap-spin-btn:hover{background:rgba(255,255,255,0.10)}
  .ap-repeat-spinner .ap-step-repeat-input{
    width:64px;height:30px;text-align:center;border:0;outline:none;
    background:rgba(255,255,255,0.03);color:inherit;
    -moz-appearance:textfield;
  }
  .ap-repeat-spinner .ap-step-repeat-input::-webkit-outer-spin-button,
  .ap-repeat-spinner .ap-step-repeat-input::-webkit-inner-spin-button{
    -webkit-appearance:none;margin:0
  }

  .ap-step-row-buttons{display:inline-flex;gap:8px;justify-content:end}
  .ap-step-row-buttons .ap-icon-btn{width:36px;height:36px}

  .ap-actions{margin-top:4px;gap:12px}
  `;

    // Styles in the page (floating toggle)
    const pageCss = `
  .ap-toggle{
    position:fixed;right:16px;bottom:16px;width:44px;height:44px;border-radius:999px;
    border:1px solid #374151;background:#111827;color:#e5e7eb;
    z-index:2147483647;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.35)
  }
  .ap-toggle:hover{background:#1a2436}
  `;

    // Inject into shadow root (panel internals)
    window.AutoPrompter.dom.injectStyles(
      shadowCss,
      root instanceof ShadowRoot ? root : document
    );

    // Inject into page (toggle button)
    window.AutoPrompter.dom.injectStyles(pageCss, document.head);
  }

  window.AutoPrompter = window.AutoPrompter || {};
  window.AutoPrompter.theme = { ensureTheme };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/layout/mount.js");

/* ===== auto-prompter/ui/panel/layout/mount.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/layout/mount.js";try{
// auto-prompter/ui/panel/layout/mount.js
(function () {
  function attach(shadow, { el, logger }) {
    const toggle = el("button", {
      className: "ap-toggle",
      textContent: "AP",
      title: "Toggle Auto-Prompter (Alt+P)",
      type: "button",
      "aria-pressed": "true",
      "aria-label": "Toggle Auto-Prompter panel",
    });

    const card = el("div", {
      className: "ap-card",
      role: "region",
      "aria-label": "Auto-Prompter Panel",
    });

    try {
      (document.body || document.documentElement).appendChild(toggle);
    } catch (e) {
      logger.warn(
        "[layout] Failed to append toggle to body; falling back to documentElement"
      );
      document.documentElement.appendChild(toggle);
    }

    shadow.appendChild(card);
    return { card, toggle };
  }

  window.AutoPrompter = window.AutoPrompter || {};
  const ns = (window.AutoPrompter.uiLayoutParts =
    window.AutoPrompter.uiLayoutParts || {});
  ns.mount = { attach };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/layout/markup.js");

/* ===== auto-prompter/ui/panel/layout/markup.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/layout/markup.js";try{
// /opt/homebrew/bin/node
// ./auto-prompter/ui/panel/layout/markup.js
(function () {
  function get() {
    return `
      <!-- Scoped signature font + styles (panel-local, no global coupling) -->
      <style id="ap-signature-font">
        /* 1) Self-hosted preferred: place the file at
              panel/public/static/fonts/GreatVibes-Regular.woff2 */
        @font-face{
          font-family:'SL_Signature';
          font-style:normal;
          font-weight:400;
          font-display:swap;
          src:
            url('/static/fonts/GreatVibes-Regular.woff2') format('woff2'),
            /* 2) CDN fallback (lightweight, widely cached) */
            url('https://fonts.gstatic.com/s/parisienne/v15/E21i_d3kivvAkxhLEVZpQyZwD9Ku.woff2') format('woff2');
          unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122;
        }

        .ap-signature{
          font-family:'SL_Signature',
            "Snell Roundhand","Zapfino","Segoe Script","Lucida Handwriting","Brush Script MT",cursive;
          font-weight:400;
          font-size:18px;         /* your preferred size */
          line-height:1;
          letter-spacing:.2px;
          color:currentColor;      /* follows dark/light theme */
          opacity:.96;
          display:inline-block;
          vertical-align:middle;
          transform:translateY(1px); /* optical baseline */
          white-space:nowrap;
          user-select:none;

          /* Calligraphic goodness */
          font-variant-ligatures: common-ligatures contextual;
          font-feature-settings:"calt" 1,"liga" 1,"clig" 1,"swsh" 1,"salt" 1;
          text-rendering:geometricPrecision;
          -webkit-font-smoothing:antialiased;
        }

        /* Curved underline swash, lightly inked */
        .ap-swash{
          display:inline-block;
          height:12px; width:132px;
          vertical-align:baseline;
          margin-left:8px;
        }
        .ap-swash path{
          stroke:currentColor; stroke-width:1; fill:none;
          stroke-linecap:round; stroke-linejoin:round;
          opacity:.22;
        }

        /* Subtle hover ink lift on links; signature stays calm */
        .ap-footer a:hover{ filter:saturate(1.06); }

        @media (max-width:520px){
          .ap-signature{ font-size:16px; }
          .ap-swash{ width:108px; height:10px; }
        }
      </style>

      <div class="ap-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="ap-drag-handle" title="Drag to move (dbl-click to collapse)"></div>

          <div class="ap-tabs">
            <button data-tab="controls"  class="ap-tab ap-tab--active" type="button">Controls</button>
            <button data-tab="scheduler" class="ap-tab"               type="button">Scheduler</button>
            <button data-tab="templates" class="ap-tab"               type="button">Templates</button>
            <button data-tab="profiles"  class="ap-tab"               type="button">Profiles</button>
            <button data-tab="log"       class="ap-tab"               type="button">Log</button>
          </div>

          <div class="ap-dock">
            <button id="ap-dock-left" class="ap-dock-btn" title="Dock left" aria-label="Dock left" type="button">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M10 5a1 1 0 0 1 1.7-.7l6 6a1 1 0 0 1 0 1.4l-6 6A1 1 0 0 1 10 17.6L14.6 13H4a1 1 0 1 1 0-2h10.6L10 6.4A1 1 0 0 1 10 5z"/></svg>
            </button>
            <button id="ap-dock-right" class="ap-dock-btn" title="Dock right" aria-label="Dock right" type="button">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M14 5a1 1 0 0 0-1.7-.7l-6 6a1 1 0 0 0 0 1.4l6 6A1 1 0 0 0 14 17.6L9.4 13H20a1 1 0 1 0 0-2H9.4L14 6.4A1 1 0 0 0 14 5z"/></svg>
            </button>
            <button id="ap-collapse" class="ap-dock-btn" title="Collapse/Expand" aria-label="Collapse/Expand" type="button">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M7 9a1 1 0 0 1 1.7-.7L12 11.6l3.3-3.3A1 1 0 1 1 16.7 10l-4 4a1 1 0 0 1-1.4 0l-4-4A1 1 0 0 1 7 9z"/></svg>
            </button>
            <button id="ap-compact" class="ap-dock-btn" title="Compact" aria-label="Compact" type="button">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 10h8a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2z"/></svg>
            </button>
            <button id="ap-close" class="ap-dock-btn" title="Hide panel" aria-label="Hide panel" type="button">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M6.2 6.2a1 1 0 0 1 1.4 0L12 10.6l4.4-4.4a1 1 0 1 1 1.4 1.4L13.4 12l4.4 4.4a1 1 0 1 1-1.4 1.4L12 13.4l-4.4 4.4a1 1 0 1 1-1.4-1.4L10.6 12 6.2 7.6a1 1 0 0 1 0-1.4z"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div class="ap-body">
        <section data-pane="controls"></section>
        <section data-pane="scheduler" hidden></section>

        <section data-pane="templates" hidden>
          <div class="ap-row">
            <input id="ap-tpl-name" placeholder="Template name" />
            <button id="ap-tpl-save"   type="button">Save Template</button>
            <button id="ap-tpl-export" type="button">Export</button>
            <button id="ap-tpl-import" type="button">Import</button>
          </div>
          <div id="ap-tpl-list" class="ap-list"></div>
        </section>

        <section data-pane="profiles" hidden>
          <div class="ap-row">
            <select id="ap-prof-list" style="min-width:180px"></select>
            <input id="ap-prof-host"   placeholder="hostname (e.g. chat.openai.com)" style="flex:1" />
            <button id="ap-prof-load"  type="button">Load</button>
          </div>
          <div class="ap-row">
            <input id="ap-prof-input"  placeholder="input selector"  style="flex:1" />
            <input id="ap-prof-submit" placeholder="submit selector" style="flex:1" />
            <input id="ap-prof-stop"   placeholder="stop selector"   style="flex:1" />
          </div>
          <div class="ap-row">
            <label>
              <input id="ap-prof-auto" type="checkbox" />
              auto-detect composer
            </label>
          </div>
          <div class="ap-row">
            <button id="ap-prof-save" type="button">Save Profile</button>
            <button id="ap-prof-del"  type="button" class="ap-danger">Delete</button>
          </div>
        </section>

        <section data-pane="log" hidden>
          <div id="ap-log" class="ap-log"></div>
          <div class="ap-row"><button id="ap-log-clear" type="button">Clear</button></div>
        </section>
      </div>

      <footer class="ap-footer" aria-label="Credits and Support">
        <div class="ap-footer-left">
          <!-- Calligraphic signature + tapered swash underline -->
          <span class="ap-signature" aria-hidden="true">Samuel&nbsp;Lane</span>
          <svg class="ap-swash" viewBox="0 0 132 20" aria-hidden="true" focusable="false">
            <!-- gentle entry, dip, and long exit under “Lane” -->
            <path d="M2 14 C 26 18, 56 18, 78 14 S 120 8, 130 12" />
          </svg>

          <div class="ap-footer-text">
            <span class="ap-madeby">Developed & maintained by</span>
            <a class="ap-author" href="https://github.com/Samuellane522" target="_blank" rel="noopener noreferrer">Samuel Lane</a>
            <span class="ap-dot" aria-hidden="true">•</span>
            <a class="ap-handle" href="https://github.com/Samuellane522" target="_blank" rel="noopener noreferrer">@samuellane522</a>
          </div>
        </div>

        <a
          class="ap-coffee-btn"
          href="https://buymeacoffee.com/samuellane522?ref=autoprompter"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Buy me a coffee to support development"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path fill="currentColor" d="M4 5h13a3 3 0 0 1 0 6h-1.1l-.9 6.3A3 3 0 0 1 12 20H9a3 3 0 0 1-2.97-2.7L5.1 11H4a1 1 0 0 1 0-2h.9l.2-1.4A2 2 0 0 1 7.1 6H4a1 1 0 1 1 0-2zm3.2 6h8.6l-.8 5.6a1.5 1.5 0 0 1-1.49 1.3H9a1.5 1.5 0 0 1-1.48-1.35L7.2 11zM17 7v2h0a1 1 0 1 0 0-2z"/>
          </svg>
          <span>Buy me a coffee</span>
        </a>
      </footer>
    `;
  }

  window.AutoPrompter = window.AutoPrompter || {};
  const ns = (window.AutoPrompter.uiLayoutParts =
    window.AutoPrompter.uiLayoutParts || {});
  ns.markup = { get };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/layout/toggle.js");

/* ===== auto-prompter/ui/panel/layout/toggle.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/layout/toggle.js";try{
// auto-prompter/ui/panel/layout/toggle.js
(function () {
  function wire({ toggle, card, pos, P, logger }) {
    const syncPressed = () =>
      toggle.setAttribute("aria-pressed", String(!pos.hidden));

    const doToggle = () => {
      try {
        const before = !!pos.hidden;
        P.toggleHidden?.(card, pos);
        syncPressed();
        logger.info(
          `[layout] toggle clicked: hidden ${before} -> ${pos.hidden}`
        );
      } catch (e) {
        logger.error("[layout] toggle error: " + (e?.message || String(e)));
      }
    };

    toggle.onclick = doToggle;
    syncPressed();

    return doToggle;
  }

  window.AutoPrompter = window.AutoPrompter || {};
  const ns = (window.AutoPrompter.uiLayoutParts =
    window.AutoPrompter.uiLayoutParts || {});
  ns.toggle = { wire };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/layout/keyboard.js");

/* ===== auto-prompter/ui/panel/layout/keyboard.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/layout/keyboard.js";try{
// auto-prompter/ui/panel/layout/keyboard.js
(function () {
  function wire({ toggle, card, pos, P, logger }) {
    const onKey = (e) => {
      try {
        const isKeyP =
          e.code === "KeyP" ||
          (typeof e.key === "string" && e.key.toLowerCase() === "p");

        // Alt+Shift+P: reset/show (more specific, handle first)
        if (e.altKey && e.shiftKey && isKeyP && !e.metaKey && !e.ctrlKey) {
          const before = JSON.stringify(pos);
          pos.hidden = false;
          P.applyPosition?.(card, pos);
          P.savePos?.(pos);
          toggle.setAttribute("aria-pressed", "true");
          logger.info(
            `[layout] Alt+Shift+P reset: ${before} -> ${JSON.stringify(pos)}`
          );
          e.preventDefault();
          e.stopPropagation();
        }
        // Alt+P: toggle
        else if (e.altKey && isKeyP && !e.metaKey && !e.ctrlKey) {
          toggle.click(); // keeps aria-pressed in sync
          e.preventDefault();
          e.stopPropagation();
        }
      } catch (err) {
        logger.error(
          "[layout] keydown handler error: " + (err?.message || String(err))
        );
      }
    };

    // capture + bubble to beat page handlers
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keydown", onKey, false);
  }

  window.AutoPrompter = window.AutoPrompter || {};
  const ns = (window.AutoPrompter.uiLayoutParts =
    window.AutoPrompter.uiLayoutParts || {});
  ns.keyboard = { wire };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/layout/dock.js");

/* ===== auto-prompter/ui/panel/layout/dock.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/layout/dock.js";try{
// auto-prompter/ui/panel/layout/dock.js
(function () {
  function wire(shadow, { toggle, card, pos, P, logger }) {
    const $ = (id) => shadow.getElementById(id);

    $("ap-dock-left").onclick = () => {
      logger.info("[layout] dock left");
      P.dock?.(card, pos, "left");
    };

    $("ap-dock-right").onclick = () => {
      logger.info("[layout] dock right");
      P.dock?.(card, pos, "right");
    };

    $("ap-collapse").onclick = () => {
      logger.info("[layout] collapse toggle");
      P.toggleCollapsed?.(card, pos);
    };

    $("ap-compact").onclick = () => {
      logger.info("[layout] compact toggle");
      card.classList.toggle("ap-card--compact");
    };

    $("ap-close").onclick = () => {
      logger.info("[layout] close (hide)");
      P.toggleHidden?.(card, pos, true);
      toggle.setAttribute("aria-pressed", "false");
    };
  }

  window.AutoPrompter = window.AutoPrompter || {};
  const ns = (window.AutoPrompter.uiLayoutParts =
    window.AutoPrompter.uiLayoutParts || {});
  ns.dock = { wire };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/layout/debug.js");

/* ===== auto-prompter/ui/panel/layout/debug.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/layout/debug.js";try{
// auto-prompter/ui/panel/layout/debug.js
(function () {
  function expose({ card, pos, P, shadow, logger }) {
    try {
      window.apDebug = Object.assign({}, window.apDebug, {
        card,
        pos,
        P,
        shadow,
      });
      logger.info("[layout] apDebug handle available: window.apDebug");
    } catch {}
  }

  window.AutoPrompter = window.AutoPrompter || {};
  const ns = (window.AutoPrompter.uiLayoutParts =
    window.AutoPrompter.uiLayoutParts || {});
  ns.debug = { expose };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/layout/index.js");

/* ===== auto-prompter/ui/panel/layout/index.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/layout/index.js";try{
// auto-prompter/ui/panel/layout/index.js
(function () {
  function buildPanel(shadow) {
    const ap = (window.AutoPrompter = window.AutoPrompter || {});
    const logger = ap.logger || { info() {}, warn() {}, error() {} };
    const { el } = ap.dom || {};
    const P = ap.uiPosition;

    const cp = (tag, extra) => {
      try {
        (ap.boot?.cp || (() => {}))("ui:layout:index:" + tag, {
          ver: "ui-layout-index/1.1.4",
          ...(extra || {}),
        });
      } catch {}
    };

    if (!el || !P) {
      console &&
        console.error &&
        console.error(
          "[AP][layout] Missing dependencies: dom.el or uiPosition"
        );
      cp("abort:deps");
      return { card: null, toggle: null };
    }

    // 0) Inject styles
    try {
      ap.uiLayoutParts?.styles?.inject?.(shadow, ap);
      cp("styles:ok");
    } catch (e) {
      logger.warn(
        "[layout] styles inject failed: " + (e?.message || String(e))
      );
      cp("styles:error", { err: String(e?.message || e) });
    }

    // ---------- helpers ----------
    const _isVisible = (elm) => {
      try {
        if (!elm || !elm.getBoundingClientRect) return false;
        const st = getComputedStyle(elm);
        if (
          st.display === "none" ||
          st.visibility === "hidden" ||
          st.opacity === "0"
        )
          return false;
        const r = elm.getBoundingClientRect();
        return r.width > 40 && r.height > 24 && r.bottom > 0 && r.right > 0;
      } catch {
        return false;
      }
    };
    const _rect = (elm) => {
      try {
        return (elm.closest("form") || elm).getBoundingClientRect();
      } catch {
        return null;
      }
    };

    function findComposerRect() {
      const sels = [
        "form textarea#prompt-textarea",
        "textarea#prompt-textarea",
        '[data-testid="conversation-composer"] textarea',
        'form [data-testid="prompt-textarea"]',
        'textarea[aria-label*="message" i]',
        "form textarea",
        "textarea",
      ];
      for (const s of sels) {
        const nodes = document.querySelectorAll(s);
        for (const n of nodes) {
          if (!n || shadow.contains(n)) continue;
          if (!_isVisible(n)) continue;
          const r = _rect(n);
          if (r) return r;
        }
      }
      return null;
    }

    function isNewChat() {
      const sels = [
        '[data-testid^="conversation-turn-"]',
        "[data-message-author-role]",
        '[data-testid="assistant-message"]',
        '[data-testid="user-message"]',
      ];
      for (const s of sels) {
        const nodes = document.querySelectorAll(s);
        for (const n of nodes) if (_isVisible(n)) return false;
      }
      return true;
    }

    function smartPlaceNearComposer({ card, pos, preferBelow = false }) {
      const anchor = findComposerRect();
      if (!anchor) {
        logger.info("[layout] composer not found; keeping default position");
        return;
      }
      let cw = card.offsetWidth || 380;
      let ch = card.offsetHeight || 320;
      const vw = window.innerWidth,
        vh = window.innerHeight;
      const gap = 10;

      let placeBelow = !!preferBelow;
      if (!placeBelow) {
        const tentativeTop = Math.round(anchor.top - ch - gap);
        placeBelow = tentativeTop < 8;
      }

      let left = Math.round(anchor.right - cw);
      left = Math.max(8, Math.min(left, vw - cw - 8));

      let top = placeBelow
        ? Math.round(anchor.bottom + gap)
        : Math.round(anchor.top - ch - gap);
      top = Math.max(8, Math.min(top, vh - ch - 8));

      card.style.right = "";
      card.style.bottom = "";
      card.style.left = left + "px";
      card.style.top = top + "px";

      try {
        pos.docked = "free";
        pos.left = left;
        pos.top = top;
        pos.hidden = false;
        pos.__smartPlaced = true;
        pos.__followComposer = true;
        P.applyPosition?.(card, pos);
        P.savePos?.(pos);
        cp("smartPlace", { left, top, below: placeBelow });
      } catch (e) {
        logger.warn(
          "[layout] smartPlace save/apply failed: " + (e?.message || String(e))
        );
      }
    }

    let _followTick = 0;
    function scheduleFollow(card, pos) {
      if (!pos.__followComposer) return;
      cancelAnimationFrame(_followTick);
      _followTick = requestAnimationFrame(() => {
        const preferBelow = isNewChat();
        smartPlaceNearComposer({ card, pos, preferBelow });
      });
    }

    // -------------------------- 1) Mount base nodes -------------------------
    const { card, toggle } = ap.uiLayoutParts.mount.attach(shadow, {
      el,
      logger,
    });
    cp("mount:ok");

    // -------------------------- 2) Fill markup ------------------------------
    card.innerHTML = ap.uiLayoutParts.markup.get();
    cp("markup:ok");

    // -------------------------- 3) Position --------------------------------
    const pos = { docked: "right", ...(P.loadPos?.() || {}) };
    try {
      logger.info("[layout] buildPanel: initial pos=" + JSON.stringify(pos));
      P.applyPosition?.(card, pos);
      cp("position:apply", { pos });
    } catch (e) {
      logger.error(
        "[layout] applyPosition failed: " + (e?.message || String(e))
      );
      cp("position:error", { err: String(e?.message || e) });
    }

    // ----------- force-hide helpers: unify hide/show/normalize --------------
    function forceHide() {
      try {
        card.dataset.apForceHidden = "1";
        card.style.setProperty("display", "none", "important");
      } catch {}
    }
    function forceShow() {
      try {
        if (card.dataset.apForceHidden === "1")
          delete card.dataset.apForceHidden;
        card.style.removeProperty("display");
      } catch {}
    }
    function ensureVisibleIfOpen(reason) {
      if (!pos.hidden) {
        const cs = getComputedStyle(card);
        if (cs.display === "none" || card.dataset.apForceHidden === "1") {
          forceShow();
          try {
            P.applyPosition?.(card, pos);
          } catch {}
          cp("force-unhide", { reason });
        }
      }
    }

    // Wrap toggleHidden so "show" clears any CSS force-hide
    try {
      if (P.toggleHidden && !P.toggleHidden.__ap_unhide_wrapped) {
        const origToggleHidden = P.toggleHidden.bind(P);
        P.toggleHidden = function (cardEl, posObj, hide) {
          const r = origToggleHidden(cardEl, posObj, hide);
          if (!hide) {
            forceShow();
            cp("toggle:ensure-show", { by: "wrap" });
          }
          return r;
        };
        P.toggleHidden.__ap_unhide_wrapped = true;
        cp("toggle:wrap");
      }
    } catch (e) {
      logger.warn(
        "[layout] wrap toggleHidden failed: " + (e?.message || String(e))
      );
    }

    // -------------------------- 4) Wire toggle ------------------------------
    ap.uiLayoutParts.toggle.wire({ toggle, card, pos, P, logger });

    function maybeSmartPlaceOnOpen() {
      try {
        ensureVisibleIfOpen("toggle-open");
        if (!pos.__smartPlaced && !pos.hidden) {
          const preferBelow = isNewChat();
          smartPlaceNearComposer({ card, pos, preferBelow });
        }
      } catch (e) {
        logger.warn(
          "[layout] smart place on open failed: " + (e?.message || String(e))
        );
      }
    }
    toggle.addEventListener("click", () =>
      setTimeout(maybeSmartPlaceOnOpen, 0)
    );
    if (!pos.hidden)
      requestAnimationFrame(() => ensureVisibleIfOpen("boot-open"));

    // -------------------------- 5) Keyboard --------------------------------
    ap.uiLayoutParts.keyboard.wire({ toggle, card, pos, P, logger });

    // -------------------------- 6) Dock/collapse/hide -----------------------
    ap.uiLayoutParts.dock.wire(shadow, { toggle, card, pos, P, logger });

    // -------------------------- 7) Drag -------------------------------------
    try {
      const handle = card.querySelector(".ap-drag-handle");
      P.makeDraggable?.(card, handle, pos, {
        onChange: (p) => {
          logger.info("[layout] position changed: " + JSON.stringify(p));
          pos.__followComposer = false;
          pos.__smartPlaced = true;
          P.savePos?.(pos);
          cp("drag:move", { left: p.left, top: p.top });
        },
      });
    } catch (e) {
      logger.warn(
        "[layout] makeDraggable failed: " + (e?.message || String(e))
      );
    }

    window.addEventListener("resize", () => scheduleFollow(card, pos));
    window.addEventListener("orientationchange", () =>
      scheduleFollow(card, pos)
    );
    window.addEventListener("scroll", () => scheduleFollow(card, pos), {
      passive: true,
    });

    // ------------------ 7.5) Dictation Gate → auto-hide/show ----------------
    (function wireDictationGateAutoHide() {
      let hidByGate = false;

      function hideForGate() {
        try {
          if (!pos.hidden) {
            P.toggleHidden?.(card, pos, true);
            toggle?.setAttribute("aria-pressed", "false");
            hidByGate = true;
            forceHide();
            logger.info("[layout] gate: hide panel");
            cp("gate:hide");
          } else {
            hidByGate = true; // even if already hidden, mark that gate owns it
          }
        } catch (e) {
          logger.warn("[layout] gate: hide failed: " + (e?.message || e));
          cp("gate:hide:error", { err: String(e?.message || e) });
        }
      }
      function unhideAfterGate(reason) {
        try {
          if (hidByGate) {
            pos.hidden = false;
            forceShow();
            P.applyPosition?.(card, pos);
            P.savePos?.(pos);
            toggle?.setAttribute("aria-pressed", "true");
            hidByGate = false;
            logger.info("[layout] gate: restore panel");
            cp("gate:restore", { reason });
          }
        } catch (e) {
          logger.warn("[layout] gate: restore failed: " + (e?.message || e));
          cp("gate:restore:error", { err: String(e?.message || e) });
        }
      }

      // Patch AP.gate if present
      function tryPatchGate() {
        const gate = (window.AutoPrompter || {}).gate;
        if (!gate || gate.__apPanelHidePatched) return false;
        const orig = {
          ensure: gate.ensure && gate.ensure.bind(gate),
          close: gate.close && gate.close.bind(gate),
          accept: gate.accept && gate.accept.bind(gate),
          cancel: gate.cancel && gate.cancel.bind(gate),
          state: gate.state && gate.state.bind(gate),
        };
        gate.ensure = function (...a) {
          try {
            const st = orig.state?.() || {};
            if (!st?.open) hideForGate();
          } catch {}
          return orig.ensure ? orig.ensure(...a) : true;
        };
        gate.close = function (...a) {
          try {
            unhideAfterGate("gate.close");
          } catch {}
          return orig.close ? orig.close(...a) : undefined;
        };
        gate.accept = function (...a) {
          const r = orig.accept ? orig.accept(...a) : false;
          try {
            unhideAfterGate("gate.accept");
          } catch {}
          return r;
        };
        gate.cancel = function (...a) {
          const r = orig.cancel ? orig.cancel(...a) : false;
          try {
            unhideAfterGate("gate.cancel");
          } catch {}
          return r;
        };
        gate.__apPanelHidePatched = true;
        try {
          const st = gate.state?.() || {};
          if (st?.open) hideForGate();
        } catch {}
        logger.info("[layout] gate: auto-hide patch installed");
        cp("gate:patch");
        return true;
      }

      if (!tryPatchGate()) {
        const id = setInterval(() => {
          if (tryPatchGate()) clearInterval(id);
        }, 600);
        setTimeout(() => clearInterval(id), 8000);
      }

      // DOM observer path (for non-headless UIs)
      const GATE_ROOT_SEL =
        ".ap-dict-gate, .ap-dictation-gate, [data-ap='dictation-gate'], .ap-gate, .ap-overlay";
      const GATE_ACCEPT_SEL =
        "[data-ap-role='accept'],[data-ap-action='accept'],.ap-gate-accept,.ap-dict-gate__btn--ok,[data-ap-accept='1']";
      const GATE_CANCEL_SEL =
        "[data-ap-role='cancel'],[data-ap-action='cancel'],.ap-gate-cancel,.ap-dict-gate__btn--cancel";

      function hasGateInDOM() {
        try {
          return !!document.querySelector(GATE_ROOT_SEL);
        } catch {
          return false;
        }
      }

      const mo = new MutationObserver(() => {
        if (hasGateInDOM()) hideForGate();
        else unhideAfterGate("mo");
      });
      try {
        mo.observe(document.documentElement || document.body, {
          childList: true,
          subtree: true,
        });
      } catch {}

      window.addEventListener(
        "click",
        (e) => {
          const t =
            e.target &&
            e.target.closest &&
            e.target.closest(`${GATE_ACCEPT_SEL},${GATE_CANCEL_SEL}`);
          if (t) unhideAfterGate("click");
        },
        true
      );

      // SAFETY NET: listen to dictation glue custom events (headless flow)
      window.addEventListener("ap:dictation:done", () =>
        unhideAfterGate("event:done")
      );
    })();

    // -------- 7.6) Programmatic controls (exposed) --------------------------
    try {
      ap.uiLayoutParts = ap.uiLayoutParts || {};
      ap.uiLayoutParts.control = {
        hide() {
          try {
            P.toggleHidden?.(card, pos, true);
            toggle?.setAttribute("aria-pressed", "false");
            forceHide();
            cp("control:hide");
          } catch {}
        },
        show() {
          try {
            pos.hidden = false;
            forceShow();
            P.applyPosition?.(card, pos);
            P.savePos?.(pos);
            toggle?.setAttribute("aria-pressed", "true");
            ensureVisibleIfOpen("control.show");
            cp("control:show");
          } catch {}
        },
        isHidden() {
          const cs = getComputedStyle(card);
          return (
            !!pos.hidden ||
            card.dataset.apForceHidden === "1" ||
            cs.display === "none" ||
            cs.visibility === "hidden" ||
            cs.opacity === "0"
          );
        },
      };
      cp("control:ready");
      try {
        window.dispatchEvent(new CustomEvent("ap:ui:control-ready"));
      } catch {}
    } catch (e) {
      logger.warn(
        "[layout] control expose failed: " + (e?.message || String(e))
      );
      cp("control:error", { err: String(e?.message || e) });
    }

    // -------------------------- 8) Debug surface ----------------------------
    ap.uiLayoutParts.debug.expose({ card, pos, P, shadow, logger });
    cp("ready");

    return { card, toggle };
  }

  window.AutoPrompter = window.AutoPrompter || {};
  window.AutoPrompter.uiLayout = { buildPanel };
  window.AutoPrompter.uiLayoutParts = window.AutoPrompter.uiLayoutParts || {};
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/tabs.js");

/* ===== auto-prompter/ui/panel/tabs.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/tabs.js";try{
(function () {
  function wireTabs(shadow) {
    const $ = (s) => shadow.querySelector(s);
    function switchTab(key) {
      Array.from(shadow.querySelectorAll(".ap-tab")).forEach((t) => {
        const isActive = t.getAttribute("data-tab") === key;
        t.classList.toggle("ap-tab--active", isActive);
      });
      Array.from(shadow.querySelectorAll("[data-pane]")).forEach((p) => {
        p.hidden = p.getAttribute("data-pane") !== key;
      });
    }
    Array.from(shadow.querySelectorAll(".ap-tab")).forEach((t) => {
      t.onclick = () => switchTab(t.getAttribute("data-tab"));
    });
    return switchTab;
  }

  window.AutoPrompter = window.AutoPrompter || {};
  window.AutoPrompter.uiTabs = { wireTabs };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/controls/safe.js");

/* ===== auto-prompter/ui/panel/controls/safe.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/controls/safe.js";try{
// /opt/homebrew/bin/node
// ./auto-prompter/ui/panel/controls/safe.js
(function () {
  "use strict";

  // Minimal, safe defaults for required subsystems (logger, dom, uiPosition).
  function getAP() {
    const ap = window.AutoPrompter || {};
    ap.logger = ap.logger || { info() {}, warn() {}, error() {} };
    ap.dom = ap.dom || {
      el: (tag, props, children = []) => {
        const n = document.createElement(tag);
        if (props) Object.assign(n, props);
        for (const c of children) n.appendChild(c);
        return n;
      },
      injectStyles: (css, root) => {
        const s = document.createElement("style");
        s.textContent = css;
        (root || document.head).appendChild(s);
      },
    };

    // Lightweight fallback for uiPosition so the panel can build & toggle via Alt+P
    // even if no custom position manager is provided by the host page.
    if (!ap.uiPosition) {
      const KEY = "ap_ui_pos_v1";

      function loadPos() {
        try {
          const raw = localStorage.getItem(KEY);
          if (!raw) return { hidden: false, docked: "right" };
          const p = JSON.parse(raw);
          return {
            hidden: !!p.hidden,
            docked: p.docked || "right",
            left: Number.isFinite(p.left) ? p.left : undefined,
            top: Number.isFinite(p.top) ? p.top : undefined,
          };
        } catch {
          return { hidden: false, docked: "right" };
        }
      }

      function savePos(pos) {
        try {
          localStorage.setItem(KEY, JSON.stringify(pos || {}));
        } catch {}
      }

      function applyPosition(card, pos) {
        if (!card || !pos) return;
        card.style.position = "fixed";
        card.style.zIndex = "2147483000";

        if (pos.docked === "free") {
          // free-floating using saved coords
          const left = Math.max(
            8,
            Math.min(pos.left || 24, window.innerWidth - 24)
          );
          const top = Math.max(
            8,
            Math.min(pos.top || 24, window.innerHeight - 24)
          );
          card.style.left = left + "px";
          card.style.top = top + "px";
          card.style.right = "";
          card.style.bottom = "";
        } else {
          // simple left/right dock
          card.style.top = "";
          card.style.left = pos.docked === "left" ? "12px" : "";
          card.style.right = pos.docked === "right" ? "12px" : "";
          card.style.bottom = "16px";
        }

        card.hidden = !!pos.hidden;
        savePos(pos);
      }

      function toggleHidden(card, pos, forceHide) {
        if (!card || !pos) return;
        pos.hidden = typeof forceHide === "boolean" ? !!forceHide : !pos.hidden;
        card.hidden = !!pos.hidden;
        savePos(pos);
      }

      function dock(card, pos, side) {
        if (!card || !pos) return;
        pos.docked = side === "left" ? "left" : "right";
        delete pos.left;
        delete pos.top;
        applyPosition(card, pos);
      }

      function toggleCollapsed(card, pos) {
        if (!card) return;
        card.classList.toggle("ap-card--compact");
        savePos(pos || {});
      }

      function makeDraggable(card, handle, pos, { onChange } = {}) {
        if (!card || !handle || !pos) return;

        let startX = 0,
          startY = 0,
          startLeft = 0,
          startTop = 0,
          dragging = false;

        const onDown = (e) => {
          if (e.button !== 0) return;
          dragging = true;
          pos.docked = "free"; // switch to free mode on drag
          const r = card.getBoundingClientRect();
          startLeft = r.left;
          startTop = r.top;
          startX = e.clientX;
          startY = e.clientY;
          e.preventDefault();
          window.addEventListener("mousemove", onMove, true);
          window.addEventListener("mouseup", onUp, true);
        };

        const onMove = (e) => {
          if (!dragging) return;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          pos.left = Math.max(
            8,
            Math.min(startLeft + dx, window.innerWidth - 24)
          );
          pos.top = Math.max(
            8,
            Math.min(startTop + dy, window.innerHeight - 24)
          );
          applyPosition(card, pos);
          if (typeof onChange === "function")
            try {
              onChange(pos);
            } catch {}
        };

        const onUp = () => {
          dragging = false;
          savePos(pos);
          window.removeEventListener("mousemove", onMove, true);
          window.removeEventListener("mouseup", onUp, true);
        };

        handle.addEventListener("mousedown", onDown, true);
      }

      ap.uiPosition = {
        loadPos,
        savePos,
        applyPosition,
        toggleHidden,
        dock,
        toggleCollapsed,
        makeDraggable,
      };
    }

    return ap;
  }

  window.AutoPrompter = getAP();
  window.AutoPrompter.safe = { getAP };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/controls/repeats.js");

/* ===== auto-prompter/ui/panel/controls/repeats.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/controls/repeats.js";try{
// ./auto-prompter/ui/panel/controls/repeats.js
// VERSION: ui-repeats/1.1.0 (adds breadcrumbs)

(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const cp = (tag, extra) => {
    try {
      (AP.boot?.cp || (() => {}))("ui:repeats:" + tag, {
        ver: "ui-repeats/1.1.0",
        ...(extra || {}),
      });
    } catch {}
  };
  const L =
    (typeof AP.logger === "function" ? AP.logger() : AP.logger) || console;

  function normalizeRepeat(n) {
    const v = Number(n);
    const out = Number.isFinite(v) && v >= 1 ? Math.floor(v) : 1;
    return out;
  }

  function esc(str) {
    return String(str || "")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"');
  }

  function trimLines(s) {
    return String(s || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  }

  // Parse sequence → group consecutive identical msg lines
  function parseSequenceToStepsAndExtra(sequence) {
    const lines = trimLines(sequence);
    const rawMsgs = [];
    const extra = [];

    for (const line of lines) {
      const mQ = line.match(/^msg\s+["']([\s\S]*?)["']\s*$/i);
      if (mQ) {
        rawMsgs.push(mQ[1]);
        continue;
      }
      const mBare = line.match(/^msg\s+(.+?)\s*$/i);
      if (mBare) {
        rawMsgs.push(mBare[1]);
        continue;
      }
      extra.push(line);
    }

    const steps = [];
    for (let i = 0; i < rawMsgs.length; ) {
      const t = String(rawMsgs[i] || "");
      let r = 1;
      let j = i + 1;
      while (j < rawMsgs.length && String(rawMsgs[j] || "") === t) {
        r++;
        j++;
      }
      steps.push({ text: t, repeat: normalizeRepeat(r) });
      i = j;
    }

    cp("parse", {
      lines: lines.length,
      msgLines: rawMsgs.length,
      groups: steps.length,
      hasExtra: extra.length > 0,
    });

    return { steps, extra: extra.join("\n") };
  }

  // Expand to engine string
  function buildSequenceFromSteps(steps, extra) {
    let expandedCount = 0;
    const out = [];
    for (const s of steps || []) {
      const text = String(s?.text || "").trim();
      if (!text) continue;
      const r = normalizeRepeat(s?.repeat);
      for (let i = 0; i < r; i++) {
        out.push(`msg "${esc(text)}"`);
        expandedCount++;
      }
    }
    const tail = String(extra || "").trim();
    const seq = tail ? `${out.join("\n")}\n${tail}` : out.join("\n");

    cp("build", {
      groups: (steps || []).length,
      expandedMsgs: expandedCount,
      extraLen: tail.length,
      totalLen: seq.length,
    });

    return seq;
  }

  // Create a clamp-on-wheel number input (defaults to 1)
  function createRepeatInput(el, initial, onChange) {
    const input = el("input", {
      type: "number",
      className: "ap-step-repeat",
      min: "1",
      step: "1",
      value: String(normalizeRepeat(initial)),
      title: "Repeat count",
      "aria-label": "Repeat count",
    });

    function clamp() {
      const before = input.value;
      input.value = String(normalizeRepeat(input.value));
      const after = input.value;
      if (before !== after) cp("repeat:clamp", { before, after });
      if (typeof onChange === "function") onChange(input.valueAsNumber || 1);
    }

    input.addEventListener("input", clamp);
    input.addEventListener("change", clamp);
    input.addEventListener(
      "wheel",
      (e) => {
        if (document.activeElement === input) {
          e.preventDefault();
          if (e.deltaY < 0) input.stepUp();
          else if (e.deltaY > 0) input.stepDown();
          clamp();
          cp("repeat:wheel");
        }
      },
      { passive: false }
    );

    return input;
  }

  // Lightweight debugger (optional)
  function debugAnalyze(sequence) {
    const { steps, extra } = parseSequenceToStepsAndExtra(sequence || "");
    const expanded = buildSequenceFromSteps(steps, extra);
    return { steps, extra, expanded };
  }

  AP.uiRepeats = {
    normalizeRepeat,
    parseSequenceToStepsAndExtra,
    buildSequenceFromSteps,
    createRepeatInput,
    debugAnalyze, // handy for apDebug
    __v: "ui-repeats/1.1.0",
  };

  try {
    window.apDebug = Object.assign({}, window.apDebug, {
      repeatsDebug: (seq) => {
        const d = debugAnalyze(seq);
        (L.info || L.log).call(L, "[repeats] debug", d);
        return d;
      },
    });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/controls/steps/styles.js");

/* ===== auto-prompter/ui/panel/controls/steps/styles.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/controls/steps/styles.js";try{
// /opt/homebrew/bin/node
// ./auto-prompter/ui/panel/controls/steps/styles.js
(function () {
  "use strict";

  function ensureStepsStyles(root) {
    const css = `
.ap-steps{display:grid;gap:14px}
.ap-step{
  display:grid;
  grid-template-columns: 1fr auto;
  gap:12px;
  align-items:start;
  padding:12px 12px;
  border:1px solid var(--ap-border);
  border-radius:10px;
  background: var(--ap-surface);
}
.ap-step-text{
  width:100%;
  min-height:120px;
  resize:vertical;
  background: rgba(12,20,36,0.6);
  border:1px solid var(--ap-border);
  color: var(--ap-text);
  border-radius:10px;
  padding:10px;
  line-height:1.35;
  transition: border-color .12s ease, box-shadow .12s ease, background .12s ease;
}
.ap-step-text:focus-visible{
  border-color: var(--ap-accent);
  box-shadow: 0 0 0 3px var(--ap-accent-weak);
  outline: none;
}

.ap-step-actions{
  display:grid;
  grid-auto-rows:min-content;
  grid-template-columns: 38px 38px;
  grid-auto-flow: row;
  gap:8px;
  align-content:start;
  justify-items:stretch;
}

.ap-icon-btn{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  height:38px; width:38px;
  border-radius:10px;
  background: var(--ap-surface-2);
  border:1px solid var(--ap-border);
  transition: background .12s ease, transform .04s ease, border-color .12s ease;
  font-size:0;
}
.ap-icon-btn:hover{ background: var(--ap-hover); }
.ap-icon-btn:active{ transform: translateY(1px); }
.ap-icon-btn:focus-visible{ outline: 2px solid var(--ap-ring); outline-offset: 2px; }

.ap-step-mic svg{ width:18px; height:18px; }
.ap-step-add svg{ width:18px; height:18px; }
.ap-step-del svg{ width:18px; height:18px; }

.ap-step-repeat-wrap{
  grid-column: 1 / -1;
  display:grid;
  gap:6px;
}
.ap-step-repeat{
  width:120px;
  height:36px;
  background: rgba(12,20,36,0.6);
  border:1px solid var(--ap-border);
  color: var(--ap-text);
  border-radius:10px;
  padding:6px 10px;
}
.ap-step-repeat:focus-visible{
  border-color: var(--ap-accent);
  box-shadow: 0 0 0 3px var(--ap-accent-weak);
  outline: none;
}

@media (min-width: 980px){
  .ap-step-actions{ grid-template-columns: 38px 38px 38px; }
  .ap-step-repeat-wrap{ grid-column: 1 / -1; }
}
`;
    const AP = (window.AutoPrompter = window.AutoPrompter || {});
    (AP.dom && AP.dom.injectStyles
      ? AP.dom.injectStyles
      : (cssText, where) => {
          const s = document.createElement("style");
          s.textContent = cssText;
          (where || document.head).appendChild(s);
        })(css, root instanceof ShadowRoot ? root : document);
  }

  window.AutoPrompter = window.AutoPrompter || {};
  window.AutoPrompter.uiStepsStyles = { ensureStepsStyles };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/controls/steps/row.js");

/* ===== auto-prompter/ui/panel/controls/steps/row.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/controls/steps/row.js";try{
// /opt/homebrew/bin/node
// ./auto-prompter/ui/panel/controls/steps/row.js
(function () {
  "use strict";

  function createStepRow(el, value, repeatValue) {
    const ta = el("textarea", {
      className: "ap-step-text",
      placeholder: "Type a message…",
      value: value || "",
    });

    // repeat control (min 1)
    const repeatInput = el("input", {
      type: "number",
      className: "ap-step-repeat",
      min: "1",
      step: "1",
      value:
        Number.isFinite(repeatValue) && repeatValue > 0
          ? String(Math.floor(repeatValue))
          : "1",
      title: "Repeat count",
      "aria-label": "Repeat count",
    });

    // wheel to change only when focused
    const clampRepeat = () => {
      const n = Number(repeatInput.value);
      repeatInput.value =
        !Number.isFinite(n) || n < 1 ? "1" : String(Math.floor(n));
    };
    repeatInput.addEventListener("input", clampRepeat);
    repeatInput.addEventListener("change", clampRepeat);
    repeatInput.addEventListener(
      "wheel",
      (e) => {
        if (document.activeElement === repeatInput) {
          e.preventDefault();
          if (e.deltaY < 0) repeatInput.stepUp();
          else if (e.deltaY > 0) repeatInput.stepDown();
          clampRepeat();
        }
      },
      { passive: false }
    );

    // step actions (SVG icons for visual consistency)
    const addBtn = el("button", {
      type: "button",
      className: "ap-icon-btn ap-step-add",
      title: "Add step below",
      "aria-label": "Add step below",
      innerHTML:
        '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M11 5a1 1 0 1 1 2 0v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5z"/></svg>',
    });

    const delBtn = el("button", {
      type: "button",
      className: "ap-icon-btn ap-step-del",
      title: "Remove step",
      "aria-label": "Remove step",
      innerHTML:
        '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M5 11a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2H5z"/></svg>',
    });

    // microphone (dictation) button — inline SVG (no emojis)
    const micBtn = el("button", {
      type: "button",
      className: "ap-icon-btn ap-step-mic",
      title: "Dictate into this step",
      "aria-label": "Dictate into this step",
      innerHTML:
        '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3zm-7-3a1 1 0 1 1 2 0 5 5 0 0 0 10 0 1 1 0 1 1 2 0 7 7 0 0 1-6 6.93V20h3a1 1 0 1 1 0 2H10a1 1 0 1 1 0-2h3v-2.07A7 7 0 0 1 5 11z"/></svg>',
    });

    // right-side controls stack ( +  -  mic  repeat )
    const repeatWrap = el(
      "label",
      { className: "ap-field ap-step-repeat-wrap" },
      [
        el("div", { className: "ap-field-label", textContent: "Repeat" }),
        repeatInput,
      ]
    );

    const actions = el("div", { className: "ap-step-actions" }, [
      addBtn,
      delBtn,
      micBtn,
      repeatWrap,
    ]);

    return {
      row: el("div", { className: "ap-step" }, [ta, actions]),
      ta,
      repeatInput,
      addBtn,
      delBtn,
      micBtn, // exposed for wiring
    };
  }

  window.AutoPrompter = window.AutoPrompter || {};
  window.AutoPrompter.uiStepsRow = { createStepRow };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/controls/ui.js");

/* ===== auto-prompter/ui/panel/controls/ui.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/controls/ui.js";try{
// /opt/homebrew/bin/node
// ./auto-prompter/ui/panel/controls/ui.js
// VERSION: ui-controls-ui/1.3.0  (adds sequenceFromSteps/applySequenceToSteps, focus & Ctrl/Cmd+Enter)

(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const cp = (tag, extra) => {
    try {
      (AP.boot?.cp || (() => {}))("ui:steps:" + tag, {
        ver: "ui-controls-ui/1.3.0",
        ...(extra || {}),
      });
    } catch {}
  };

  const Dom = AP.dom || {};
  const el =
    typeof Dom.el === "function"
      ? Dom.el
      : (tag, props, children = []) => {
          const n = document.createElement(tag);
          if (props) Object.assign(n, props);
          for (const c of children || []) n.appendChild(c);
          return n;
        };

  // REQUIRED modules
  const Repeats = AP.uiRepeats;
  const StepsStyles = AP.uiStepsStyles;
  const StepsRow = AP.uiStepsRow;

  if (!Repeats) throw new Error("[uiControlsUI] uiRepeats is required.");
  if (!StepsStyles)
    throw new Error("[uiControlsUI] uiStepsStyles is required.");
  if (!StepsRow) throw new Error("[uiControlsUI] uiStepsRow is required.");

  const {
    parseSequenceToStepsAndExtra,
    buildSequenceFromSteps,
    normalizeRepeat,
  } = Repeats;
  const { ensureStepsStyles } = StepsStyles;
  const { createStepRow } = StepsRow;

  function createLayout({ shadow, el: elArg, pane, cfg }) {
    const _el = elArg || el;

    ensureStepsStyles(shadow);

    const stepsWrap = _el("div", {
      className: "ap-steps",
      id: "ap-steps",
      "aria-label": "Message steps",
    });
    const seqHidden = _el("textarea", {
      id: "ap-seq",
      hidden: true,
      value: cfg.sequence || "",
    });
    const seqExtraHidden = _el("textarea", {
      id: "ap-seq-extra",
      hidden: true,
      value: "",
    });

    const stepsCard = _el("div", { className: "ap-hud" }, [
      _el("div", { className: "ap-hud-title", textContent: "Message Steps" }),
      stepsWrap,
    ]);
    pane.innerHTML = "";
    pane.appendChild(stepsCard);
    pane.appendChild(seqHidden);
    pane.appendChild(seqExtraHidden);

    // Actions (updated classes)
    const startBtn = _el("button", {
      id: "ap-start",
      className: "ap-btn ap-btn--primary",
      textContent: "Start",
    });
    const stopBtn = _el("button", {
      id: "ap-stop",
      className: "ap-btn",
      textContent: "Stop",
    });
    const saveBtn = _el("button", {
      id: "ap-save",
      className: "ap-btn ap-btn--ghost",
      textContent: "Save Config",
    });
    pane.appendChild(
      _el("div", { className: "ap-row ap-actions" }, [
        startBtn,
        stopBtn,
        saveBtn,
      ])
    );

    function syncHiddenSequence() {
      const rows = Array.from(stepsWrap.querySelectorAll(".ap-step"));
      const steps = rows.map((row) => {
        const text = row.querySelector(".ap-step-text")?.value ?? "";
        const rRaw = Number(row.querySelector(".ap-step-repeat")?.value);
        return { text, repeat: normalizeRepeat(rRaw) };
      });
      const seq = buildSequenceFromSteps(steps, seqExtraHidden.value);
      seqHidden.value = seq;
      cp("sync", { steps: steps.length, seqLen: (seq || "").length });
    }

    function wireMic(micBtn, ta) {
      if (!micBtn) return;
      micBtn.addEventListener("click", async () => {
        const D = (window.AutoPrompter || {}).dictation;
        if (D && typeof D.captureToTextarea === "function") {
          try {
            cp("mic:click");
            await D.captureToTextarea({ textarea: ta, shadowRoot: shadow });
            cp("mic:ok");
          } catch (e) {
            (AP.logger || console).warn?.(
              "[dictation] captureToTextarea failed: " + (e?.message || e)
            );
            cp("mic:error", { err: String(e?.message || e) });
          }
        } else {
          (AP.logger || console).info?.(
            "[dictation] helper not present; mic click ignored"
          );
          cp("mic:noop");
        }
      });
    }

    function addStep(afterRow, initText = "", initRepeat = 1) {
      const { row, ta, repeatInput, addBtn, delBtn, micBtn } = createStepRow(
        _el,
        initText,
        normalizeRepeat(initRepeat)
      );
      const parent = stepsWrap;
      if (afterRow && afterRow.nextSibling) {
        parent.insertBefore(row, afterRow.nextSibling);
      } else {
        parent.appendChild(row);
      }

      const resync = () => syncHiddenSequence();
      ta.addEventListener("input", resync);
      repeatInput.addEventListener("input", resync);
      repeatInput.addEventListener("change", resync);

      // UX: Cmd/Ctrl+Enter adds a step below and focuses it.
      ta.addEventListener("keydown", (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          const newRow = addStep(row, "", 1);
          newRow.querySelector?.(".ap-step-text")?.focus();
          resync();
          cp("step:add:kb");
        }
      });

      wireMic(micBtn, ta);

      addBtn.onclick = () => {
        const newRow = addStep(row, "", 1);
        newRow.querySelector?.(".ap-step-text")?.focus();
        resync();
        cp("step:add");
      };
      delBtn.onclick = () => {
        const rows = parent.querySelectorAll(".ap-step");
        if (rows.length <= 1) {
          ta.value = "";
          repeatInput.value = "1";
        } else {
          row.remove();
        }
        resync();
        cp("step:del");
      };

      return row;
    }

    function renderFromSequence(sequence) {
      stepsWrap.innerHTML = "";
      const { steps, extra } = parseSequenceToStepsAndExtra(sequence || "");
      seqExtraHidden.value = extra || "";

      const list = steps.length ? steps : [{ text: "", repeat: 1 }];
      let firstRow = null;
      for (const s of list) {
        const r = addStep(null, s.text, normalizeRepeat(s.repeat));
        if (!firstRow) firstRow = r;
      }
      syncHiddenSequence();

      // Focus first textarea for quick typing.
      firstRow?.querySelector?.(".ap-step-text")?.focus();

      cp("render", { steps: list.length });
    }

    // initial render
    renderFromSequence(cfg.sequence || "");

    const $ = (s) => shadow.querySelector(s);
    const refs = {
      __shadow: shadow,
      seq: $("#ap-seq"),
      delay: null,
      scan: null,
      minint: null,
      inputSel: null,
      submitSel: null,
      stopSel: null,
      auto: null,
      startBtn,
      stopBtn,
      saveBtn,
    };

    return { refs };
  }

  // ---------- Utilities ----------
  function sequenceFromSteps(shadow) {
    try {
      const stepsWrap = shadow.querySelector("#ap-steps");
      const extraEl = shadow.querySelector("#ap-seq-extra");
      if (stepsWrap) {
        const rows = Array.from(stepsWrap.querySelectorAll(".ap-step"));
        const steps = rows.map((row) => {
          const text = row.querySelector(".ap-step-text")?.value ?? "";
          const rRaw = Number(row.querySelector(".ap-step-repeat")?.value);
          return { text, repeat: normalizeRepeat(rRaw) };
        });
        return buildSequenceFromSteps(steps, extraEl?.value || "");
      }
      const ta = shadow.querySelector("#ap-seq");
      return ta ? ta.value : "";
    } catch {
      const ta = shadow.querySelector("#ap-seq");
      return ta ? ta.value : "";
    }
  }

  function applySequenceToSteps(shadow, sequence) {
    try {
      const pane = shadow.querySelector('section[data-pane="controls"]');
      const seqTa = shadow.querySelector("#ap-seq");

      if (!pane) {
        if (seqTa) seqTa.value = String(sequence || "");
        return;
      }

      const Cfg = AP.config || {};
      const cfg =
        (typeof Cfg.getConfig === "function" ? Cfg.getConfig() : {}) || {};
      cfg.sequence = String(sequence || "");

      const DomNS = AP.dom || {};
      const _el =
        typeof DomNS.el === "function"
          ? DomNS.el
          : (tag, props, children = []) => {
              const n = document.createElement(tag);
              if (props) Object.assign(n, props);
              for (const c of children || []) n.appendChild(c);
              return n;
            };

      createLayout({ shadow, el: _el, pane, cfg });
      cp("applySequence", { len: (cfg.sequence || "").length });
    } catch (e) {
      (AP.logger || console).warn?.(
        "[uiControlsUI] applySequenceToSteps failed: " +
          (e?.message || String(e))
      );
      const seqTa = shadow.querySelector("#ap-seq");
      if (seqTa) seqTa.value = String(sequence || "");
    }
  }

  AP.uiControlsUI = Object.assign(AP.uiControlsUI || {}, {
    createLayout,
    sequenceFromSteps,
    applySequenceToSteps,
    __v: "ui-controls-ui/1.3.0",
  });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/controls/scheduler.js");

/* ===== auto-prompter/ui/panel/controls/scheduler.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/controls/scheduler.js";try{
// ./auto-prompter/ui/panel/controls/scheduler.js
(function () {
  "use strict";

  function labeled(el, label, control) {
    return el("label", { className: "ap-field" }, [
      el("div", { className: "ap-field-label", textContent: label }),
      control,
    ]);
  }

  function createScheduler(shadow, { el, cfg }) {
    const AP = (window.AutoPrompter = window.AutoPrompter || {});
    const logger =
      (typeof AP.logger === "function" ? AP.logger() : AP.logger) || console;

    try {
      const pane = shadow.querySelector('section[data-pane="scheduler"]');
      if (!pane) {
        (logger.warn || logger.log).call(logger, "[scheduler] pane not found");
        return { refs: {} };
      }

      pane.innerHTML = "";
      const card = el("div", { className: "ap-hud" }, [
        el("div", { className: "ap-hud-title", textContent: "Scheduler" }),
        el("div", { className: "ap-row" }, [
          labeled(
            el,
            "Delay (ms)",
            el("input", {
              id: "ap-delay",
              type: "number",
              min: "0",
              step: "50",
              value: String(Number.isFinite(cfg.delayMs) ? cfg.delayMs : 1000),
              placeholder: "delayMs",
            })
          ),
          labeled(
            el,
            "Scan (ms)",
            el("input", {
              id: "ap-scan",
              type: "number",
              min: "0",
              step: "50",
              value: String(Number.isFinite(cfg.scanMs) ? cfg.scanMs : 900),
              placeholder: "scanMs",
            })
          ),
          labeled(
            el,
            "Min Interval (ms)",
            el("input", {
              id: "ap-minint",
              type: "number",
              min: "0",
              step: "50",
              value: String(
                Number.isFinite(cfg.minIntervalMs) ? cfg.minIntervalMs : 400
              ),
              placeholder: "minIntervalMs",
            })
          ),
        ]),
        el("div", { className: "ap-note" }, [
          document.createTextNode(
            "Composer detection is always on. Selectors are handled automatically."
          ),
        ]),
      ]);
      pane.appendChild(card);

      const $ = (s) => shadow.querySelector(s);
      const refs = {
        delay: $("#ap-delay"),
        scan: $("#ap-scan"),
        minint: $("#ap-minint"),
      };

      (logger.info || logger.log).call(
        logger,
        "[scheduler] wired: " +
          JSON.stringify({
            hasDelay: !!refs.delay,
            hasScan: !!refs.scan,
            hasMinInt: !!refs.minint,
          })
      );

      return { refs };
    } catch (e) {
      (logger.error || logger.log).call(
        logger,
        "[scheduler] error: " + (e?.message || String(e))
      );
      return { refs: {} };
    }
  }

  window.AutoPrompter = window.AutoPrompter || {};
  window.AutoPrompter.uiScheduler = { createScheduler };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/controls/form.js");

/* ===== auto-prompter/ui/panel/controls/form.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/controls/form.js";try{
// ./auto-prompter/ui/panel/controls/form.js
// VERSION: ui-controls-form/1.1.0

(function () {
  "use strict";

  const cp = (tag, extra) => {
    try {
      (window.AutoPrompter?.boot?.cp || (() => {}))("ui:form:" + tag, {
        ver: "ui-controls-form/1.1.0",
        ...(extra || {}),
      });
    } catch {}
  };

  function parseNonNegInt(s, fallback) {
    const n = Number(String(s || "").trim());
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
  }

  function readVal(ref, fallback) {
    try {
      const v = ref && typeof ref.value !== "undefined" ? ref.value : undefined;
      return String(v == null ? fallback : v).trim();
    } catch {
      return String(fallback || "").trim();
    }
  }

  function readForm(refs, defaults) {
    const d = defaults || {};

    // Prefer building from the Steps editor; fall back to hidden #ap-seq
    let sequence = "";
    try {
      const UI = (window.AutoPrompter = window.AutoPrompter || {}).uiControlsUI;
      if (UI && typeof UI.sequenceFromSteps === "function") {
        sequence = UI.sequenceFromSteps(refs.__shadow);
      }
    } catch {}
    if (!sequence && refs?.seq) sequence = refs.seq.value;

    const inputSel = readVal(refs?.inputSel, d.inputSel || "");
    const submitSel = readVal(refs?.submitSel, d.submitSel || "");
    const stopSel = readVal(refs?.stopSel, d.stopSel || "");
    const autoDetect =
      refs?.auto && typeof refs.auto.checked === "boolean"
        ? Boolean(refs.auto.checked)
        : true; // always-on by design

    const out = {
      sequence,
      delayMs: parseNonNegInt(refs?.delay?.value, d.defaultDelayMs ?? 1000),
      scanMs: parseNonNegInt(refs?.scan?.value, d.defaultScanMs ?? 900),
      minIntervalMs: parseNonNegInt(
        refs?.minint?.value,
        d.defaultMinIntervalMs ?? 400
      ),
      inputSel,
      submitSel,
      stopSel,
      autoDetect,
    };

    cp("read", {
      delayMs: out.delayMs,
      scanMs: out.scanMs,
      minIntervalMs: out.minIntervalMs,
      autoDetect: out.autoDetect,
      seqLen: (out.sequence || "").length,
    });

    return out;
  }

  window.AutoPrompter = window.AutoPrompter || {};
  window.AutoPrompter.uiControlsForm = {
    parseNonNegInt,
    readForm,
    __v: "ui-controls-form/1.1.0",
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/controls/buttons.js");

/* ===== auto-prompter/ui/panel/controls/buttons.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/controls/buttons.js";try{
// ./auto-prompter/ui/panel/controls/buttons.js
// VERSION: ui-controls-buttons/1.1.0

(function () {
  "use strict";

  const cp = (tag, extra) => {
    try {
      (window.AutoPrompter?.boot?.cp || (() => {}))("ui:buttons:" + tag, {
        ver: "ui-controls-buttons/1.1.0",
        ...(extra || {}),
      });
    } catch {}
  };

  function withBtnDisabled(btn, fn) {
    return async () => {
      if (!btn) return fn?.();
      try {
        btn.disabled = true;
        cp("btn:disable", { id: btn?.id || "" });
        await fn();
      } finally {
        btn.disabled = false;
        cp("btn:enable", { id: btn?.id || "" });
      }
    };
  }

  function getLogger(logger) {
    try {
      if (typeof logger === "function") {
        const v = logger();
        if (v && typeof v.info === "function") return v;
      } else if (logger && typeof logger.info === "function") {
        return logger;
      }
    } catch {}
    return console;
  }

  function wire({
    shadow,
    refs,
    saveConfig,
    readForm,
    onStart,
    onStop,
    logger,
  }) {
    const L = getLogger(logger);

    if (refs?.saveBtn) {
      refs.saveBtn.onclick = withBtnDisabled(refs.saveBtn, async () => {
        const updates = readForm();
        const merged = saveConfig(updates);
        cp("save", {
          delayMs: merged?.delayMs,
          scanMs: merged?.scanMs,
          minIntervalMs: merged?.minIntervalMs,
          autoDetect: merged?.autoDetect,
        });
        L.info(
          `[controls] saved ${JSON.stringify({
            delayMs: merged?.delayMs,
            scanMs: merged?.scanMs,
            minIntervalMs: merged?.minIntervalMs,
            autoDetect: merged?.autoDetect,
          })}`
        );
      });
    }

    if (refs?.startBtn) {
      refs.startBtn.onclick = withBtnDisabled(refs.startBtn, async () => {
        try {
          cp("start:click");
          await onStart?.();
          cp("start:ok");
        } catch (e) {
          cp("start:error", { err: String(e?.message || e) });
          L.error(`[controls] Start error: ${e?.message || e}`);
        }
      });
    }

    if (refs?.stopBtn) {
      refs.stopBtn.onclick = withBtnDisabled(refs.stopBtn, async () => {
        try {
          cp("stop:click");
          await onStop?.();
          cp("stop:ok");
        } catch (e) {
          cp("stop:error", { err: String(e?.message || e) });
          L.error(`[controls] Stop error: ${e?.message || e}`);
        }
      });
    }
  }

  window.AutoPrompter = window.AutoPrompter || {};
  window.AutoPrompter.uiControlsButtons = {
    wire,
    withBtnDisabled,
    __v: "ui-controls-buttons/1.1.0",
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/controls/bind.js");

/* ===== auto-prompter/ui/panel/controls/bind.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/controls/bind.js";try{
// /opt/homebrew/bin/node
// ./auto-prompter/ui/panel/controls/bind.js
(function () {
  "use strict";

  function init(shadow, opts) {
    // Convenience wrapper in case you want to call a single entry point.
    // Delegates to uiControls.wireControls.
    const Controls = window.AutoPrompter?.uiControls;
    if (Controls && typeof Controls.wireControls === "function") {
      Controls.wireControls(shadow, opts || {});
    }
  }

  window.AutoPrompter = window.AutoPrompter || {};
  window.AutoPrompter.uiControlsBind = { init };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/controls/index.js");

/* ===== auto-prompter/ui/panel/controls/index.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/controls/index.js";try{
// ./auto-prompter/ui/panel/controls/index.js
(function () {
  "use strict";

  function wireControls(shadow, { onStart, onStop, card }) {
    const AP = (window.AutoPrompter = window.AutoPrompter || {});
    const cp = (tag, extra) => {
      try {
        (AP.boot?.cp || (() => {}))("ui:controls:" + tag, {
          ver: "ui-controls/1.2.0",
          ...(extra || {}),
        });
      } catch {}
    };

    // Logger (object or thunk) → console fallback
    const rawLogger = AP.logger || console;
    const getLogger =
      typeof AP.logger === "function" ? AP.logger : () => rawLogger;
    const logger = getLogger();

    // DOM helper fallback
    const DomNS = AP.dom || {};
    const el =
      typeof DomNS.el === "function"
        ? DomNS.el
        : (tag, props, children = []) => {
            const n = document.createElement(tag);
            if (props) Object.assign(n, props);
            for (const c of children || []) n.appendChild(c);
            return n;
          };

    // Config fallbacks
    const Cfg = AP.config || {};
    const getConfig =
      typeof Cfg.getConfig === "function" ? Cfg.getConfig : () => ({});
    const saveConfig =
      typeof Cfg.saveConfig === "function" ? Cfg.saveConfig : () => ({});

    const UI = AP.uiControlsUI; // expected
    const Scheduler = AP.uiScheduler; // optional, may not be loaded yet
    const Form = AP.uiControlsForm || {};
    const Buttons = AP.uiControlsButtons || {};
    const Repeats = AP.uiRepeats || null;

    // Ensure there's a controls pane to target; use fallback if missing
    let controlsPane = shadow.querySelector('section[data-pane="controls"]');
    if (!controlsPane) {
      (logger.error || logger.log).call(
        logger,
        "[controls] controls pane not found; inserting fallback"
      );
      const fallback = el("section", { "data-pane": "controls" });
      shadow.querySelector(".ap-body")?.appendChild(fallback);
      controlsPane = fallback; // critical: actually use the fallback
      cp("pane:fallback");
    }
    controlsPane.innerHTML = "";

    const schedulerPane = shadow.querySelector(
      'section[data-pane="scheduler"]'
    );

    const cfg = (() => {
      try {
        return getConfig() || {};
      } catch {
        return {};
      }
    })();

    // -------------------- Controls (Steps + Actions) ------------------------
    let controlsRefs = {};
    if (UI && typeof UI.createLayout === "function" && controlsPane) {
      try {
        const out =
          UI.createLayout({ shadow, el, pane: controlsPane, cfg }) || {};
        controlsRefs = out.refs || {};
        cp("ui:createLayout:ok");
      } catch (e) {
        (logger.error || logger.log).call(
          logger,
          "[controls] UI.createLayout error: " + (e?.message || String(e))
        );
        cp("ui:createLayout:error", { err: String(e?.message || e) });
        // Minimal message so the pane isn't blank
        controlsPane.appendChild(
          el("div", { className: "ap-hud" }, [
            el("div", { className: "ap-hud-title", textContent: "Controls" }),
            el("div", { textContent: "Failed to render Controls UI." }),
          ])
        );
      }
    } else if (controlsPane) {
      controlsPane.appendChild(
        el("div", { className: "ap-hud" }, [
          el("div", { className: "ap-hud-title", textContent: "Controls" }),
          el("div", { textContent: "Controls UI module not available." }),
        ])
      );
      controlsRefs = { __shadow: shadow };
      cp("ui:createLayout:missing");
    }

    // -------------------- Scheduler (eager + lazy) --------------------------
    let schedRefs = {};
    let schedulerRendered = false;

    // Render function that’s safe to call multiple times
    function tryRenderScheduler(reason) {
      if (!schedulerPane) return;
      if (schedulerRendered) return;
      if (!Scheduler || typeof Scheduler.createScheduler !== "function") {
        (logger.info || logger.log).call(
          logger,
          `[controls] scheduler not ready (${reason}); will try later`
        );
        cp("scheduler:defer", { reason });
        return;
      }
      try {
        const out = Scheduler.createScheduler(shadow, { el, cfg }) || {};
        schedRefs = out.refs || {};
        schedulerRendered = true;
        const meta = {
          hasDelay: !!schedRefs.delay,
          hasScan: !!schedRefs.scan,
          hasMinInt: !!schedRefs.minint,
          reason,
        };
        (logger.info || logger.log).call(
          logger,
          `[controls] scheduler wired (${reason}): ${JSON.stringify(meta)}`
        );
        cp("scheduler:wired", meta);
      } catch (e) {
        (logger.warn || logger.log).call(
          logger,
          "[controls] scheduler wiring failed: " + (e?.message || String(e))
        );
        cp("scheduler:error", { err: String(e?.message || e), reason });
      }
    }

    // 1) Eager attempt (works if module loaded in time)
    tryRenderScheduler("eager");

    // 2) Lazy: render when the pane becomes visible the first time
    if (schedulerPane && !schedulerRendered) {
      try {
        // If user switches to Scheduler now, render immediately
        const onClickTab = (btn) => {
          if (btn?.getAttribute("data-tab") === "scheduler") {
            tryRenderScheduler("tab-click");
          }
        };
        Array.from(shadow.querySelectorAll(".ap-tab")).forEach((b) => {
          b.addEventListener("click", () => onClickTab(b), { capture: true });
        });

        // Also watch for hidden -> false changes (in case switching happens programmatically)
        const mo = new MutationObserver((mutations) => {
          for (const m of mutations) {
            if (
              m.type === "attributes" &&
              m.attributeName === "hidden" &&
              schedulerPane.hidden === false
            ) {
              tryRenderScheduler("unhidden");
            }
          }
        });
        mo.observe(schedulerPane, {
          attributes: true,
          attributeFilter: ["hidden"],
        });
      } catch (e) {
        (logger.warn || logger.log).call(
          logger,
          "[controls] scheduler observer failed: " + (e?.message || String(e))
        );
        cp("scheduler:observer:error", { err: String(e?.message || e) });
      }
    }

    // -------------------- Unified refs + helpers ----------------------------
    const refs = Object.assign({}, controlsRefs, schedRefs);

    const readForm =
      typeof Form.readForm === "function"
        ? () => {
            try {
              // FAST DEFAULTS (was 1000/900/400)
              const v = Form.readForm(refs, {
                defaultDelayMs: 250,
                defaultScanMs: 300,
                defaultMinIntervalMs: 200,
              });
              cp("form:read", {
                delayMs: v?.delayMs,
                scanMs: v?.scanMs,
                minIntervalMs: v?.minIntervalMs,
                seqLen: (v?.sequence || "").length,
              });
              return v;
            } catch (e) {
              (logger.warn || logger.log).call(
                logger,
                "[controls] readForm failed; using defaults"
              );
              cp("form:read:error", { err: String(e?.message || e) });
              return {
                sequence: "",
                delayMs: 250,
                scanMs: 300,
                minIntervalMs: 200,
                inputSel: "",
                submitSel: "",
                stopSel: "",
                autoDetect: true,
              };
            }
          }
        : () => ({
            sequence: "",
            // FAST DEFAULTS (fallback)
            delayMs: 250,
            scanMs: 300,
            minIntervalMs: 200,
            inputSel: "",
            submitSel: "",
            stopSel: "",
            autoDetect: true,
          });

    function parseSequence(seq) {
      const engine = AP.promptEngine;
      if (!engine || typeof engine.parse !== "function") {
        throw new Error(
          "promptEngine.parse is required. Load your engine bundle before the UI."
        );
      }
      const t0 = performance.now();
      const steps = engine.parse(String(seq || ""));
      cp("engine:parse:ok", {
        ms: Math.round(performance.now() - t0),
        steps: Array.isArray(steps) ? steps.length : -1,
      });
      if (!Array.isArray(steps) || steps.length === 0) {
        throw new Error("Engine returned no steps for the given sequence.");
      }
      return steps;
    }

    function sendHealthProbe() {
      const health = {
        gateHelpers: !!AP.__gateHelpersLoaded,
        dictationGlue: !!AP.__dictationGlueLoaded,
        gateVer: AP.gate?.__v || null,
        gateOpen: !!AP.gate?.state?.().open,
        composerDetect: !!AP?.composerDetect?.findComposer,
        composerFound: false,
        input: null,
        sendBtn: null,
      };
      try {
        AP?.composerDetect
          ?.findComposer?.({ allowInputOnly: false })
          .then((r) => {
            health.composerFound = !!r?.input;
            health.input = !!r?.input;
            health.sendBtn = !!r?.send;
            cp("send:health:composer", {
              input: health.input,
              send: health.sendBtn,
            });
          });
      } catch {}
      cp("send:health", health);
      (logger.info || logger.log).call(
        logger,
        "[controls] send health",
        health
      );
      return health;
    }

    async function startCore() {
      try {
        cp("start:click");
        sendHealthProbe();

        const updates = readForm();
        try {
          saveConfig(updates);
          cp("save:auto", {
            delayMs: updates?.delayMs,
            scanMs: updates?.scanMs,
            minIntervalMs: updates?.minIntervalMs,
          });
        } catch (e) {
          (logger.warn || logger.log).call(
            logger,
            "[controls] saveConfig failed: " + (e?.message || String(e))
          );
          cp("save:auto:error", { err: String(e?.message || e) });
        }

        const current = (() => {
          try {
            return getConfig() || {};
          } catch {
            return updates || {};
          }
        })();
        const seq = String(current.sequence || "").trim();
        cp("start:seq", { len: seq.length });

        if (!seq) {
          (logger.warn || logger.log).call(
            logger,
            "[controls] No sequence set; nothing to run"
          );
          cp("start:noop");
          if (typeof onStart === "function") onStart(current);
          return;
        }

        // Analyze repeats if available (groups vs expanded messages)
        try {
          if (Repeats) {
            const { steps: groups, extra } =
              Repeats.parseSequenceToStepsAndExtra(seq);
            const expanded = Repeats.buildSequenceFromSteps(
              groups,
              extra
            ).split("\n").length;
            cp("repeat:analyze", {
              groups: groups.length,
              expanded,
              hasExtra: !!extra,
            });
          }
        } catch (e) {
          cp("repeat:analyze:error", { err: String(e?.message || e) });
        }

        const core = AP.AutoPrompterCore;
        if (core && typeof core.start === "function") {
          try {
            await core.start();
          } catch (e) {
            (logger.warn || logger.log).call(
              logger,
              "[controls] core.start failed: " + (e?.message || String(e))
            );
            cp("core:start:error", { err: String(e?.message || e) });
          }
        }

        const steps = parseSequence(seq); // emits breadcrumbs
        const engine = AP.promptEngine;
        if (!engine || typeof engine.runAll !== "function") {
          throw new Error("promptEngine.runAll is required.");
        }
        const t0 = performance.now();
        cp("engine:run:start", {
          steps: Array.isArray(steps) ? steps.length : -1,
          delayMs: current?.delayMs,
          scanMs: current?.scanMs,
          minIntervalMs: current?.minIntervalMs,
        });
        await engine.runAll(steps, current);
        cp("engine:run:done", { ms: Math.round(performance.now() - t0) });
        (logger.info || logger.log).call(logger, "[controls] run complete");
      } catch (e) {
        (logger.error || logger.log).call(
          logger,
          "[controls] run failed: " + (e?.message || String(e))
        );
        cp("engine:run:error", { err: String(e?.message || e) });
      }

      if (typeof onStart === "function") {
        try {
          onStart(getConfig());
        } catch {
          onStart({});
        }
      }
    }

    function stopCore() {
      const engine = AP.promptEngine || {};
      const core = AP.AutoPrompterCore;
      let stopped = false;

      cp("stop:click");

      try {
        if (typeof engine.abortRun === "function") {
          engine.abortRun();
          stopped = true;
          cp("engine:abort");
        } else {
          (logger.warn || logger.log).call(
            logger,
            "[controls] promptEngine.abortRun is not available"
          );
          cp("engine:abort:missing");
        }
      } catch (e) {
        (logger.warn || logger.log).call(
          logger,
          "[controls] abortRun error: " + (e?.message || String(e))
        );
        cp("engine:abort:error", { err: String(e?.message || e) });
      }

      try {
        if (core && typeof core.stop === "function") {
          core.stop();
          stopped = true;
          cp("core:stop");
        }
      } catch (e) {
        (logger.error || logger.log).call(
          logger,
          "[controls] Stop error: " + (e?.message || String(e))
        );
        cp("core:stop:error", { err: String(e?.message || e) });
      }

      if (!stopped) {
        (logger.warn || logger.log).call(
          logger,
          "[controls] Stop completed; engine/core stop hooks may be missing"
        );
        cp("stop:warn");
      } else {
        cp("stop:done");
      }

      if (typeof onStop === "function") {
        try {
          onStop();
        } catch {}
      }
    }

    // -------------------- Buttons wiring (with fallback) --------------------
    if (Buttons && typeof Buttons.wire === "function") {
      Buttons.wire({
        shadow,
        refs,
        saveConfig,
        readForm,
        onStart: startCore,
        onStop: stopCore,
        logger: getLogger,
      });
      cp("buttons:wire:ok");
    } else {
      (logger.warn || logger.log).call(
        logger,
        "[controls] Buttons.wire not available; attaching basic handlers"
      );
      cp("buttons:wire:fallback");
      try {
        const startBtn = refs.startBtn || shadow.querySelector("#ap-start");
        const stopBtn = refs.stopBtn || shadow.querySelector("#ap-stop");
        const saveBtn = refs.saveBtn || shadow.querySelector("#ap-save");
        if (startBtn) startBtn.onclick = startCore;
        if (stopBtn) stopBtn.onclick = stopCore;
        if (saveBtn)
          saveBtn.onclick = () => {
            try {
              saveConfig(readForm());
              cp("save:click");
            } catch (e) {
              cp("save:click:error", { err: String(e?.message || e) });
            }
          };
      } catch {}
    }
  }

  window.AutoPrompter = window.AutoPrompter || {};
  window.AutoPrompter.uiControls = { wireControls };
})();

(function () {
  const KEY = "autoprompter_cfg_v5";
  const TPL = "autoprompter_templates_v2";

  // FAST DEFAULTS (balanced)
  const DEFAULTS = {
    inputSel:
      '#prompt-textarea.ProseMirror[contenteditable="true"],.ProseMirror[contenteditable="true"]#prompt-textarea,.ProseMirror[contenteditable="true"],textarea[name="prompt-textarea"]',
    submitSel:
      "#composer-submit-button,[data-testid='send-button'],button[aria-label='Send prompt']",
    stopSel:
      "[data-testid='stop-button'],button[aria-label='Stop generating'],button:has(svg[aria-label='Stop'])",
    sequence: "3x: Hello World\npause: 250\n1x: Goodbye!",
    delayMs: 250,
    scanMs: 300,
    minIntervalMs: 200,
    autoDetect: true,
    profiles: {
      "chat.openai.com": {
        inputSel:
          '#prompt-textarea.ProseMirror[contenteditable="true"],.ProseMirror[contenteditable="true"]#prompt-textarea,.ProseMirror[contenteditable="true"],textarea[name="prompt-textarea"]',
        submitSel:
          "#composer-submit-button,[data-testid='send-button'],button[aria-label='Send prompt']",
        stopSel:
          "[data-testid='stop-button'],button[aria-label='Stop generating'],button:has(svg[aria-label='Stop'])",
        autoDetect: true,
      },
      "chatgpt.com": {
        inputSel:
          '#prompt-textarea.ProseMirror[contenteditable="true"],.ProseMirror[contenteditable="true"]#prompt-textarea,.ProseMirror[contenteditable="true"],textarea[name="prompt-textarea"]',
        submitSel:
          "#composer-submit-button,[data-testid='send-button'],button[aria-label='Send prompt']",
        stopSel:
          "[data-testid='stop-button'],button[aria-label='Stop generating'],button:has(svg[aria-label='Stop'])",
        autoDetect: true,
      },
    },
  };

  window.AutoPrompter = window.AutoPrompter || {};
  window.AutoPrompter.configParts = window.AutoPrompter.configParts || {};
  window.AutoPrompter.configParts.constants = { KEY, TPL, DEFAULTS };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/profiles.js");

/* ===== auto-prompter/ui/panel/profiles.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/profiles.js";try{
// /opt/homebrew/bin/node
// ./auto-prompter/ui/panel/profiles.js
(function () {
  function wireProfiles(shadow) {
    const $ = (s) => shadow.querySelector(s);
    const pane = $('section[data-pane="profiles"]');
    if (!pane) return; // pane not present; skip wiring

    const { el } = window.AutoPrompter.dom;
    const { listProfiles, getProfile, saveProfile, deleteProfile, getConfig } =
      window.AutoPrompter.config;
    const logger = window.AutoPrompter.logger;

    function refreshProfileList() {
      const list = $("#ap-prof-list");
      if (!list) return;
      list.innerHTML = "";
      const items = listProfiles();
      const opt = el("option", { value: "", textContent: "(profiles)" });
      list.appendChild(opt);
      for (const host of items) {
        list.appendChild(el("option", { value: host, textContent: host }));
      }
    }

    function loadProfileFields(hostname) {
      const p = getProfile(hostname);
      const base = getConfig();
      $("#ap-prof-host").value = hostname || location.hostname;
      $("#ap-prof-input").value = p?.inputSel || base.inputSel;
      $("#ap-prof-submit").value = p?.submitSel || base.submitSel;
      $("#ap-prof-stop").value = p?.stopSel || base.stopSel;
      $("#ap-prof-auto").checked = Boolean(p?.autoDetect ?? base.autoDetect);
    }

    const loadBtn = $("#ap-prof-load");
    const saveBtn = $("#ap-prof-save");
    const delBtn = $("#ap-prof-del");
    if (!loadBtn || !saveBtn || !delBtn) return; // safety

    // Apply visual system
    loadBtn.className = "ap-btn";
    saveBtn.className = "ap-btn ap-btn--primary";
    delBtn.className = "ap-btn ap-danger";

    loadBtn.onclick = () => {
      const selected =
        $("#ap-prof-list").value || $("#ap-prof-host").value.trim();
      if (!selected) return;
      loadProfileFields(selected);
      logger.info(`Profile loaded: ${selected}`);
    };

    saveBtn.onclick = () => {
      const h = $("#ap-prof-host").value.trim() || location.hostname;
      const profile = {
        inputSel: $("#ap-prof-input").value.trim(),
        submitSel: $("#ap-prof-submit").value.trim(),
        stopSel: $("#ap-prof-stop").value.trim(),
        autoDetect: $("#ap-prof-auto").checked,
      };
      saveProfile(h, profile);
      refreshProfileList();
      logger.info(`Profile saved: ${h}`);
    };

    delBtn.onclick = () => {
      const h = $("#ap-prof-host").value.trim();
      if (!h) return;
      deleteProfile(h);
      refreshProfileList();
      logger.warn(`Profile deleted: ${h}`);
    };

    refreshProfileList();
    loadProfileFields(location.hostname);
  }

  window.AutoPrompter = window.AutoPrompter || {};
  window.AutoPrompter.uiProfiles = { wireProfiles };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel/templates.js");

/* ===== auto-prompter/ui/panel/templates.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel/templates.js";try{
// /opt/homebrew/bin/node
// ./auto-prompter/ui/panel/templates.js
(function () {
  function setupTemplates(shadow, switchTab) {
    const $ = (s) => shadow.querySelector(s);
    const {
      getConfig,
      saveConfig,
      listTemplates,
      saveTemplate,
      deleteTemplate,
      exportTemplates,
      importTemplates,
    } = window.AutoPrompter.config;
    const { el } = window.AutoPrompter.dom;
    const logger = window.AutoPrompter.logger;

    // Apply visual system to top controls
    (function styleTopControls() {
      const save = $("#ap-tpl-save");
      const exp = $("#ap-tpl-export");
      const imp = $("#ap-tpl-import");
      if (save) save.className = "ap-btn ap-btn--primary";
      if (exp) exp.className = "ap-btn ap-btn--ghost";
      if (imp) imp.className = "ap-btn";
    })();

    function render() {
      const list = $("#ap-tpl-list");
      list.innerHTML = "";
      for (const { name, sequence } of listTemplates()) {
        const row = el("div", { className: "ap-item" }, [
          el("span", { className: "ap-item-name", textContent: name }),
          el("div", { className: "ap-row" }, [
            el("button", {
              className: "ap-btn ap-btn--primary",
              textContent: "Load",
              onclick: () => {
                const cfg = getConfig();
                saveConfig({ ...cfg, sequence });

                // Reflect into the Steps UI if available; fallback to hidden #ap-seq
                try {
                  const UI = (window.AutoPrompter = window.AutoPrompter || {})
                    .uiControlsUI;
                  if (UI && typeof UI.applySequenceToSteps === "function") {
                    UI.applySequenceToSteps(shadow, sequence);
                  } else {
                    const ta = $("#ap-seq");
                    if (ta) ta.value = sequence;
                  }
                } catch {}

                switchTab("controls");
                logger.info(`Template loaded: ${name}`);
              },
            }),
            el("button", {
              className: "ap-btn ap-danger",
              textContent: "Delete",
              onclick: () => {
                deleteTemplate(name);
                render();
                logger.warn(`Template deleted: ${name}`);
              },
            }),
          ]),
        ]);
        list.appendChild(row);
      }
    }

    $("#ap-tpl-save").onclick = () => {
      const name = $("#ap-tpl-name").value.trim();
      if (!name) return;

      // Prefer latest sequence from the Steps UI (unsaved edits),
      // fallback to current config.
      let sequenceToSave = "";
      try {
        const UI = (window.AutoPrompter = window.AutoPrompter || {})
          .uiControlsUI;
        if (UI && typeof UI.sequenceFromSteps === "function") {
          sequenceToSave = UI.sequenceFromSteps(shadow);
        }
      } catch {}
      if (!sequenceToSave) sequenceToSave = getConfig().sequence;

      saveTemplate(name, sequenceToSave);
      $("#ap-tpl-name").value = "";
      render();
      logger.info(`Template saved: ${name}`);
    };

    $("#ap-tpl-export").onclick = () => {
      const blob = new Blob([exportTemplates()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "autoprompter_templates.json";
      a.click();
      URL.revokeObjectURL(url);
      logger.info("Templates exported");
    };

    $("#ap-tpl-import").onclick = async () => {
      const picker = document.createElement("input");
      picker.type = "file";
      picker.accept = "application/json";
      picker.onchange = async () => {
        const file = picker.files?.[0];
        if (!file) return;
        importTemplates(await file.text());
        render();
        logger.info(`Templates imported: ${file.name}`);
      };
      picker.click();
    };

    render();
  }

  window.AutoPrompter = window.AutoPrompter || {};
  window.AutoPrompter.uiTemplates = { setupTemplates };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel.log.js");

/* ===== auto-prompter/ui/panel.log.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel.log.js";try{
// /usr/local/bin/node
// ./auto-prompter/ui/panel.log.js
(function () {
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L = AP.logger || console;

  // Preserve any existing setup; extend it to listen for freeze + heartbeat events
  AP.uiLog = AP.uiLog || {};
  const prevSetup = AP.uiLog.setupLog;

  function formatFreeze(d) {
    const bits = [
      `[freeze] ${d.reason}`,
      d.duration != null ? `dur=${d.duration}ms` : null,
      d.drift != null ? `drift=${d.drift}ms` : null,
      d.gap != null ? `gap=${d.gap}ms` : null,
      `vis=${d.visible}`,
    ].filter(Boolean);
    return bits.join(" ");
  }

  function formatHeartbeat(d) {
    return `[hb] #${d.count} ${d.interval}ms vis=${d.visible}`;
  }

  function installEventMirrors(sink) {
    try {
      window.addEventListener("ap:freeze", (ev) => {
        const d = ev?.detail || {};
        try {
          sink(formatFreeze(d));
        } catch {}
      });
    } catch {}
    try {
      window.addEventListener("ap:heartbeat", (ev) => {
        const d = ev?.detail || {};
        try {
          sink(formatHeartbeat(d));
        } catch {}
      });
    } catch {}
  }

  AP.uiLog.setupLog = function setupLogPatched(shadow) {
    // call old setup first to keep existing behavior
    if (typeof prevSetup === "function") {
      try {
        prevSetup(shadow);
      } catch {}
    }

    try {
      const $ = (s) =>
        shadow && shadow.querySelector ? shadow.querySelector(s) : null;
      const view = $ && $("#ap-log");
      const dom = AP.dom || {};
      const el =
        typeof dom.el === "function"
          ? dom.el
          : (tag, attrs) => {
              const n = document.createElement(tag);
              if (attrs) Object.assign(n, attrs);
              return n;
            };
      const logger = AP.logger;

      // Build a sink that writes to the panel if present, falls back to console
      const sink = (line) => {
        try {
          if (view) {
            const div = el("div", {
              className: "ap-log-line",
              textContent: String(line),
            });
            view.appendChild(div);
            view.scrollTop = view.scrollHeight;
            return true;
          }
        } catch {}
        try {
          (L.info || L.log).call(L, "[AP uiLog]", String(line));
        } catch {}
        return false;
      };

      // Wire into logger stream (strings)
      try {
        if (logger && typeof logger.addSink === "function") {
          logger.addSink(sink);
        }
      } catch {}

      // Wire event mirrors
      installEventMirrors(sink);

      // Clear button support
      try {
        const btn = $ && $("#ap-log-clear");
        if (btn && view) btn.onclick = () => (view.innerHTML = "");
      } catch {}

      (L.info || L.log).call(L, "[AP uiLog] log/heartbeat/freeze wired");
    } catch (e) {
      (L.warn || L.log).call(L, "[AP uiLog] setup error", e);
    }
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/panel.js");

/* ===== auto-prompter/ui/panel.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/panel.js";try{
// ./auto-prompter/ui/panel.js (createPanel)
(function () {
  function createPanel({ onStart, onStop }) {
    const { el } = window.AutoPrompter.dom;
    const { ensureTheme } = window.AutoPrompter.theme;
    const { buildPanel } = window.AutoPrompter.uiLayout;
    const { wireTabs } = window.AutoPrompter.uiTabs;
    const { wireControls } = window.AutoPrompter.uiControls;
    const { wireProfiles } = window.AutoPrompter.uiProfiles;
    const { setupTemplates } = window.AutoPrompter.uiTemplates;
    const { setupLog } = window.AutoPrompter.uiLog;

    const host = el("div");
    const shadow = host.attachShadow({ mode: "open" });
    ensureTheme(shadow);

    const { card } = buildPanel(shadow);

    const switchTab = wireTabs(shadow);
    wireControls(shadow, { onStart, onStop, card });
    wireProfiles(shadow);
    setupTemplates(shadow, switchTab);
    setupLog(shadow);

    // 🔹 Ensure Controls is visible initially
    switchTab("controls");

    return { root: host, shadow };
  }

  window.AutoPrompter = window.AutoPrompter || {};
  window.AutoPrompter.uiPanel = { createPanel };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/ui/dev/boot.js");

/* ===== auto-prompter/ui/dev/boot.js ===== */
(function(){var __AP_MOD="/auto-prompter/ui/dev/boot.js";try{
(function () {
  const { createPanel } = window.AutoPrompter.uiPanel;
  const logger = window.AutoPrompter.logger;
  const { getConfig } = window.AutoPrompter.config;

  (function boot() {
    const t0 = performance.now();

    function ts(label, tStart = t0) {
      const ms = (performance.now() - tStart).toFixed(1);
      logger.info(`[boot] ${label} +${ms}ms`);
    }

    function envSnapshot() {
      const info = {
        href: location.href,
        host: location.host,
        origin: location.origin,
        readyState: document.readyState,
        ua: navigator.userAgent,
        time: new Date().toISOString(),
      };
      logger.info(`[boot] env ${JSON.stringify(info)}`);
    }

    function configSnapshot() {
      try {
        const cfg = getConfig();
        const pick = (({
          inputSel,
          submitSel,
          stopSel,
          delayMs,
          scanMs,
          minIntervalMs,
          autoDetect,
        }) => ({
          inputSel,
          submitSel,
          stopSel,
          delayMs,
          scanMs,
          minIntervalMs,
          autoDetect,
        }))(cfg);
        logger.info(`[boot] cfg ${JSON.stringify(pick)}`);
      } catch (e) {
        logger.error(`[boot] cfg error ${String(e)}`);
      }
    }

    function wireGlobalTraps() {
      window.addEventListener("error", (ev) => {
        try {
          const where = ev?.filename
            ? `${ev.filename}:${ev.lineno}:${ev.colno}`
            : "";
          logger.error(`[global] ${ev?.message || "error"} ${where}`);
        } catch {}
      });

      window.addEventListener("unhandledrejection", (ev) => {
        try {
          const reason =
            ev?.reason instanceof Error
              ? `${ev.reason.name}: ${ev.reason.message}`
              : String(ev?.reason);
          logger.error(`[global] unhandledrejection ${reason}`);
        } catch {}
      });

      ts("global traps ready");
    }

    function sanityAfterMount(panel) {
      try {
        const rootOk = Boolean(panel?.root && panel?.shadow);
        const hasToggle = Boolean(document.querySelector(".ap-toggle"));
        const bodyInShadow = Boolean(panel.shadow.querySelector(".ap-body"));
        const tabs = Array.from(panel.shadow.querySelectorAll(".ap-tab")).map(
          (n) => n.getAttribute("data-tab")
        );
        const summary = { rootOk, hasToggle, bodyInShadow, tabs };
        logger.info(`[boot] sanity ${JSON.stringify(summary)}`);
      } catch (e) {
        logger.error(`[boot] sanity error ${String(e)}`);
      }
    }

    function main() {
      envSnapshot();
      wireGlobalTraps();

      const tCreate = performance.now();
      let panel;
      try {
        panel = createPanel({
          onStart: (cfg) => {
            logger.info("[boot] onStart");
            logger.info(`[boot] onStart cfg ${JSON.stringify(cfg)}`);
          },
          onStop: () => {
            logger.warn("[boot] onStop");
          },
        });
        ts("createPanel", tCreate);
      } catch (e) {
        logger.error(`[boot] createPanel error ${String(e)}`);
        return;
      }

      const tAttach = performance.now();
      try {
        document.documentElement.appendChild(panel.root);
        ts("panel attached", tAttach);
      } catch (e) {
        logger.error(`[boot] attach error ${String(e)}`);
        return;
      }

      sanityAfterMount(panel);
      configSnapshot();
      ts("boot complete");
    }

    if (document.readyState === "loading") {
      logger.info("[boot] waiting DOMContentLoaded");
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          ts("DOMContentLoaded");
          main();
        },
        { once: true }
      );
    } else {
      ts("document already ready");
      main();
    }
  })();
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/autoload.js");

/* ===== auto-prompter/userscript/autoload.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/autoload.js";try{
// /usr/local/bin/node
// ./auto-prompter/userscript/autoload.js
(function () {
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.userscript = AP.userscript || {};

  function ensureRequires() {
    const L = AP.logger || console;
    const items = AP.userscript.manifest || [];
    const missing = [];
    for (const m of items) {
      try {
        if (!m.check()) missing.push(m.path);
      } catch {
        missing.push(m.path);
      }
    }

    const meta = (window.__AP_BUNDLE_META = window.__AP_BUNDLE_META || {});
    meta.ok = missing.length === 0;
    meta.missing = missing.slice();
    meta.files_count = (window.__AP_LOAD || []).length;
    meta.wants_count = items.length;
    meta.latest_version = AP.versions?.userscript || "unknown";
    meta.generatedAt = AP.versions?.meta?.generatedAt || null;
    meta.commit = AP.versions?.meta?.commit || null;

    if (missing.length) {
      const lines = missing.map((p) => ` /* @require      ${p} */`).join("\n");
      L.warn("[AP][bundle] missing modules", missing);
      L.info("[AP][bundle] paste these lines into your userscript header:");
      L.info(lines);
      try {
        window.dispatchEvent(
          new CustomEvent("ap:userscript:missing-modules", {
            detail: { missing },
          })
        );
      } catch {}
    } else {
      L.info("[AP][bundle] all manifest modules present", {
        total: items.length,
        filesLoaded: meta.files_count,
        version: meta.latest_version,
      });
    }

    const tail = Array.isArray(window.__AP_LOAD)
      ? window.__AP_LOAD.slice(-10)
      : [];
    (AP.logger || console).info("[AP][bundle] tail", tail);
    return { missing, manifestCount: items.length };
  }

  function computeStatus() {
    const L = AP.logger || console;

    function normalize(s) {
      return String(s || "")
        .replace(/^https?:\/\/[^/]+/i, "")
        .replace(/[?#].*$/, "")
        .replace(/\\/g, "/")
        .replace(/\/+/g, "/")
        .replace(/^\/?auto-prompter\//i, "")
        .trim();
    }

    const load = Array.isArray(window.__AP_LOAD)
      ? window.__AP_LOAD.slice()
      : [];

    const base = (s) =>
      normalize(s).split("/").slice(-2).join("/").toLowerCase();

    const seen = new Map();
    for (const e of load) {
      const k = base(e);
      const v = seen.get(k) || [];
      v.push(normalize(e));
      seen.set(k, v);
    }
    const dup = [];
    for (const [k, v] of seen) {
      const uniq = Array.from(new Set(v));
      if (uniq.length > 1) dup.push({ key: k, list: uniq });
    }

    const U = (AP.sanity && AP.sanity.utils) || {};
    const paths = U && U.missing ? U : null;
    const requiredMissing = paths?.missing
      ? paths.missing(paths.REQUIRED_RUNTIME || [])
      : [];

    const meta = (window.__AP_BUNDLE_META = window.__AP_BUNDLE_META || {});
    meta.criticalMissing = requiredMissing.slice();
    meta.duplicates = dup.slice();
    meta.ok = meta.ok && requiredMissing.length === 0 && dup.length === 0;

    if (requiredMissing.length) {
      L.error("[AP][bundle] critical missing runtime", requiredMissing);
    }
    if (dup.length) {
      L.warn("[AP][bundle] duplicate module bases", dup.slice(0, 4));
    }
    return { requiredMissing, duplicates: dup, files: load.length };
  }

  AP.userscript.autoload = { ensureRequires, computeStatus };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/boot.js");

/* ===== auto-prompter/userscript/boot.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/boot.js";try{
// /usr/local/bin/node
// ./auto-prompter/userscript/boot.js
(function () {
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const cp = AP.boot?.cp || function () {};

  function isDev() {
    try {
      const f = AP.flags?.dev;
      if (typeof f === "function") return !!f();
    } catch {}
    try {
      if (new URL(location.href).searchParams.get("ap_dev") === "1")
        return true;
    } catch {}
    try {
      if (String(localStorage.getItem("ap_dev")) === "1") return true;
    } catch {}
    return false;
  }

  // Single boot entry (others should just call this)
  AP.userscript = AP.userscript || {};
  AP.userscript.boot = function (stage) {
    if (AP.__userscriptBooted) return;
    AP.__userscriptBooted = true;

    cp("userscript:boot", {
      stage,
      href: location.href,
      readyState: document.readyState,
    });

    // Diagnostics: listen for boot checkpoints and surface missing deps
    try {
      window.addEventListener("ap:boot-cp", (ev) => {
        const d = ev?.detail || {};
        if (
          d &&
          typeof d === "object" &&
          /deps:ready/i.test(String(d.name || "")) &&
          Array.isArray(d.missing) &&
          d.missing.length
        ) {
          (AP.logger || console).warn("[AP][boot] missing deps", d.missing);
        }
      });
    } catch {}

    // Dev convenience: if dev is on, make sanity non-quiet as early as possible
    try {
      AP.config = AP.config || {};
      if (AP.config.quietSanity === undefined && isDev()) {
        AP.config.quietSanity = false;
      }
    } catch {}

    // Early probes/autoload
    try {
      AP.userscript.probe?.(stage);
    } catch {}
    try {
      AP.userscript.autoload?.ensureRequires?.();
    } catch {}

    // Register the HTML reporter explicitly (console reporter might be quiet-gated)
    try {
      const REG = AP.detectSanityRegistry;
      const HR = AP.detectSanityHtmlReporter;
      if (REG && HR && typeof REG.registerReporter === "function") {
        REG.registerReporter(HR);
      }
    } catch {}

    // Legacy sanity launcher (opens HTML report if checks fail)
    try {
      AP.userscript.sanity?.();
    } catch {}

    // --- CORE: wire observers/heartbeat so freezes are tracked automatically ---
    try {
      const U = AP.sanity?.utils;
      U?.captureGlobalErrors?.();
      U?.installPerfObservers?.({
        longTaskThreshold: 900,
        rafThreshold: 1800,
        lagInterval: 500,
        lagThreshold: 1200,
      });
      U?.startHeartbeat?.(10000); // 10s heartbeat by default
      U?.attachLifecycle?.();
      U?.attachEnvSignals?.();
      U?.firstRunDump?.("userscript.boot");
    } catch {}

    // Orchestrator (starts core as needed; idempotent)
    try {
      AP.userscript.orchestrator?.run?.();
    } catch {}

    setTimeout(() => {
      cp("userscript:post-load");
      try {
        AP.userscript.probe?.("post-load");
      } catch {}
    }, 1500);
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/glue/dictation-auto-reopen.js");

/* ===== auto-prompter/userscript/glue/dictation-auto-reopen.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/glue/dictation-auto-reopen.js";try{
// auto-prompter/userscript/glue/dictation-auto-reopen.js
// Re-open the AP panel as soon as dictation finishes (i.e., text is inserted).

(function attachDictationAutoReopen() {
  const log = (...args) =>
    window.AP?.logger?.info
      ? window.AP.logger.info("[dictation:auto-reopen]", ...args)
      : console.info("[dictation:auto-reopen]", ...args);

  let dictating = false;
  let inputEl = null;

  // --- utilities -------------------------------------------------------------

  function ensurePanelVisible(reason = "dictation-end") {
    // Preferred: built-in helper if present (emits the same logs you already see)
    try {
      const dbg = window.apDebug;
      const idx = dbg?.layout || window.AP?.ui?.layout?.index;
      if (idx?.ensureShow) {
        idx.ensureShow(reason);
        log("ensureShow()", { reason, via: "helper" });
        return;
      }
    } catch (e) {
      /* fall through to DOM path */
    }

    // Fallback: toggle click if panel root is hidden
    try {
      const root =
        document.querySelector("[data-ap-panel-root]") ||
        document.querySelector("[data-ap-panel]") ||
        document.querySelector("ap-panel-root,[ap-panel]");

      const toggle =
        document.querySelector("[data-ap-panel-toggle]") ||
        document.querySelector("[data-ap=panel-toggle]") ||
        document.querySelector(
          '.ap-panel-toggle, [aria-label="Auto Prompter panel"]'
        );

      const isHidden =
        !root ||
        root.hidden ||
        root.getAttribute("hidden") !== null ||
        root.dataset?.hidden === "true" ||
        root.style?.display === "none";

      if (isHidden && toggle) {
        toggle.click();
        log("fallback toggle click", { reason });
      } else {
        log("panel already visible", { reason });
      }
    } catch (e) {
      console.warn("[dictation:auto-reopen] ensurePanelVisible failed:", e);
    }
  }

  function findComposer() {
    // Mirrors your adapter selectors from logs (ProseMirror, textarea variant, etc.)
    const sel =
      '#prompt-textarea.ProseMirror[contenteditable="true"],' +
      '.ProseMirror[contenteditable="true"]#prompt-textarea,' +
      '.ProseMirror[contenteditable="true"],' +
      'textarea[name="prompt-textarea"]';
    return document.querySelector(sel);
  }

  function findMicButton() {
    // We piggyback on your dict glue mic detector.
    // Try common patterns & what your logs suggest.
    const byDataTestId = document.querySelector(
      '[data-testid="microphone-button"]'
    );
    if (byDataTestId) return byDataTestId;

    // Generic fallbacks (don’t break if UI changes slightly)
    const candidates = Array.from(
      document.querySelectorAll(
        'button[aria-label*="Mic"],button[aria-label*="mic"],button[aria-label*="microphone"],button[aria-pressed]'
      )
    );
    return candidates.find((b) => b.offsetParent !== null) || null;
  }

  // --- wire: mark dictation start -------------------------------------------

  function wireMic() {
    const mic = findMicButton();
    if (!mic) return false;

    // If your glue already handles this, we only observe (passive).
    mic.addEventListener(
      "click",
      () => {
        // Many UIs toggle aria-pressed=true while listening.
        dictating = true;
        log("mic clicked → dictating=true");
      },
      { passive: true }
    );

    // Watch aria-pressed changes (true→false can mean listening stopped)
    const mo = new MutationObserver(() => {
      const pressed = mic.getAttribute("aria-pressed");
      if (pressed === "false" && dictating) {
        log("mic aria-pressed=false; dictation likely stopped");
        // The text may land a few ms later — composer listener will catch it.
        // But if nothing arrives, still force re-show so the panel returns.
        setTimeout(() => ensurePanelVisible("mic-pressed-false"), 0);
      }
    });
    mo.observe(mic, { attributes: true, attributeFilter: ["aria-pressed"] });

    return true;
  }

  // --- wire: detect text insertion (our true “dictation ended” signal) ------

  function wireComposer() {
    inputEl = findComposer();
    if (!inputEl) return false;

    // When dictation finishes, your glue inserts text → fire input events.
    const onFirstInputAfterDictation = (evt) => {
      if (!dictating) return;
      dictating = false; // one-shot
      log("composer input detected → dictation ended", {
        type: evt.type,
        len: (inputEl.value || inputEl.textContent || "").length,
      });
      // Instantly re-show the panel
      ensurePanelVisible("composer-input");
    };

    // Cover both CE and textarea paths.
    // ProseMirror tends to emit beforeinput+input; textareas emit input.
    inputEl.addEventListener("beforeinput", onFirstInputAfterDictation, {
      passive: true,
    });
    inputEl.addEventListener("input", onFirstInputAfterDictation, {
      passive: true,
    });

    return true;
  }

  // --- boot: retry until both are wired -------------------------------------

  function boot() {
    let tries = 0;
    const max = 60; // ~6s total @ 100ms; plenty for slow boots
    const tick = setInterval(() => {
      const a = wireMic();
      const b = wireComposer();
      if ((a && b) || ++tries >= max) {
        clearInterval(tick);
        log("wired", { mic: !!a, composer: !!b, tries });
      }
    }, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  // Bonus: if your dictation glue dispatches any of these custom events,
  // we re-open immediately as well (harmless if never fired).
  ["ap:dictation:end", "ap:dictation:stop", "ap:dictation:done"].forEach((t) =>
    window.addEventListener(t, () => ensurePanelVisible(t), { passive: true })
  );
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/entry.js");

/* ===== auto-prompter/userscript/entry.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/entry.js";try{
(function () {
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const cp = (AP.boot && AP.boot.cp) || function () {};
  AP.userscript = AP.userscript || {};
  AP.userscript.entry = AP.userscript.entry || {};
  AP.userscript.entry.run = function () {
    if (AP.__userscriptEntryRunning) return;
    AP.__userscriptEntryRunning = true;
    try {
      (window.__AP_LOAD = window.__AP_LOAD || []).push(
        "auto-prompter/userscript/entry.run"
      );
    } catch {}
    cp("userscript:entry:begin");
    if (!/^(chat\.openai\.com|chatgpt\.com)$/.test(location.hostname)) {
      cp("userscript:entry:host-skip");
      return;
    }
    const start = () =>
      AP.userscript.boot?.(document.readyState || "immediate");
    if (document.readyState === "loading") {
      cp("userscript:entry:await-DOMContentLoaded");
      document.addEventListener(
        "DOMContentLoaded",
        () => {
          cp("userscript:entry:DOMContentLoaded");
          start();
        },
        { once: true }
      );
    } else {
      cp("userscript:entry:dom-ready-immediate");
      start();
    }
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/orchestrator.js");

/* ===== auto-prompter/userscript/orchestrator.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/orchestrator.js";try{
// ./auto-prompter/userscript/orchestrator.js
(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const US = (AP.userscript = AP.userscript || {});
  const O = (US.orchestrator = US.orchestrator || {});
  const L = AP.logger || console;
  const isDev =
    !!(US && typeof US.devEnabled === "function" && US.devEnabled());

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/userscript/orchestrator.js"
    );
  } catch {}

  // Public delegator API that defers to split implementation.
  if (typeof O.run !== "function") {
    O.run = function run() {
      try {
        if (O.main && typeof O.main.run === "function") {
          return O.main.run();
        }
      } catch (e) {
        (L.warn || L.log)?.("[AP orchestrator] main.run failed", e);
        return false;
      }
      const log = isDev ? (L.info || L.log) : (L.debug || function () {});
      log?.("[AP orchestrator] split modules not loaded; skipping.");
      return false;
    };
  }

  // Signal availability
  try {
    AP.boot?.cp?.("userscript:orchestrator:ready");
    window.dispatchEvent(new CustomEvent("ap:orchestrator:ready"));
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/probe.js");

/* ===== auto-prompter/userscript/probe.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/probe.js";try{
// /usr/local/bin/node
// ./auto-prompter/userscript/probe.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/userscript/probe.js"
    );
  } catch {}
  function cpSafe(name, extra) {
    try {
      const cp = AP.boot?.cp;
      if (typeof cp === "function") return cp(name, extra);
    } catch {}
    try {
      (AP.logger || console).info("[AP][boot] cp:", name, extra || "");
    } catch {}
    return { t: Date.now(), name: String(name || ""), ...(extra || {}) };
  }
  function typeAt(path) {
    try {
      let o = window;
      for (const k of String(path || "").split(".")) {
        if (!(k in o)) return "undefined";
        o = o[k];
      }
      return typeof o;
    } catch {
      return "undefined";
    }
  }
  AP.userscript = AP.userscript || {};
  AP.userscript.probe = function (label) {
    cpSafe("userscript:probe", { label });
    const rows = [
      ["AutoPrompter", typeof window.AutoPrompter],
      ["logger.info", typeAt("AutoPrompter.logger.info")],
      ["uiPanel.createPanel", typeAt("AutoPrompter.uiPanel.createPanel")],
      [
        "uiPosition.applyPosition",
        typeAt("AutoPrompter.uiPosition.applyPosition"),
      ],
      ["promptParser.parse", typeAt("AutoPrompter.promptParser.parse")],
      ["promptEngine.runAll", typeAt("AutoPrompter.promptEngine.runAll")],
      ["Core.start", typeAt("AutoPrompter.AutoPrompterCore.start")],
    ];
    const tableRows = rows.map(([k, v]) => ({ key: k, found: v }));
    try {
      if (console.table) console.table(tableRows);
      else
        tableRows.forEach((r) =>
          (AP.logger || console).log("[AP probe]", r.key, r.found)
        );
    } catch {}
    try {
      const tail = Array.isArray(window.__AP_LOAD)
        ? window.__AP_LOAD.slice(-30)
        : [];
      if (tail.length)
        (AP.logger || console).info("[AP probe] __AP_LOAD tail", tail);
    } catch {}
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/repoDump.js");

/* ===== auto-prompter/userscript/repoDump.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/repoDump.js";try{
// /usr/local/bin/node
// ./auto-prompter/userscript/repoDump.js
(function () {
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L = AP.logger || console;

  function normalize(p) {
    return String(p || "")
      .replace(/^https?:\/\/[^/]+/i, "") // strip origin
      .replace(/[?#].*$/, "") // strip query/hash
      .replace(/\\/g, "/") // windows -> posix
      .replace(/\/+/g, "/") // collapse multi slashes (global)
      .replace(/^\/?auto-prompter\//i, "") // remove optional repo prefix
      .trim();
  }

  function toSet(arr) {
    const s = new Set();
    for (const p of arr || []) {
      if (!p || typeof p !== "string") continue;
      const n = normalize(p);
      if (n.endsWith(".js")) s.add(n);
    }
    return s;
  }

  function loadedSet() {
    const load = Array.isArray(window.__AP_LOAD) ? window.__AP_LOAD : [];
    return toSet(load);
  }

  function repoSet() {
    // window.__AP_REPO_LIST comes from /auto-prompter/public/static/repo_dump.js (step 3)
    if (!Array.isArray(window.__AP_REPO_LIST)) return new Set();
    return toSet(window.__AP_REPO_LIST);
  }

  function buildRequireLines(paths) {
    return (paths || []).map((p) => `/* @require      ${p} */`).join("\n");
  }

  async function tryCopy(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    return false;
  }

  function audit({ requireOnly = false } = {}) {
    const repo = repoSet();
    const seen = loadedSet();

    // Optional: only check files that appear in the manifest “wants” list
    const wants = (AP.userscript?.manifest || []).map((m) => normalize(m.path));
    const wantSet = toSet(wants);

    const target = requireOnly ? wantSet : repo;
    const missing = [];
    for (const p of target) {
      if (!seen.has(p)) missing.push(p);
    }

    const covered = Math.max(
      0,
      Math.round(
        ((target.size - missing.length) / Math.max(1, target.size)) * 100
      )
    );

    // Duplicate base reporting (different variants of same /a/b/file.js)
    const dupMap = new Map();
    for (const p of window.__AP_LOAD || []) {
      const base = normalize(p).split("/").slice(-2).join("/");
      const arr = dupMap.get(base) || [];
      arr.push(p);
      dupMap.set(base, arr);
    }
    const duplicates = [];
    for (const [k, v] of dupMap) {
      const uniq = Array.from(new Set(v.map(normalize)));
      if (uniq.length > 1) duplicates.push({ base: k, variants: uniq });
    }

    const meta = (window.__AP_BUNDLE_META = window.__AP_BUNDLE_META || {});
    meta.repo_total = target.size;
    meta.repo_missing = missing.slice();
    meta.repo_covered_pct = covered;
    meta.duplicates = duplicates;
    meta.ok =
      Boolean(meta.ok) && missing.length === 0 && duplicates.length === 0;

    // Attempt clipboard copy of @require lines to speed up fixing
    if (missing.length) {
      const lines = buildRequireLines(missing);
      tryCopy(lines).then((copied) => {
        try {
          AP.sanity?.utils?.toast?.(
            copied
              ? "Missing @require lines copied to clipboard."
              : "Missing @require found (open console).",
            copied ? "info" : "warn",
            { onceKey: "repo_missing_copy" }
          );
        } catch {}
        if (!copied) {
          (L.info || L.log)?.(
            "[AP][audit] paste these into your userscript header:\n" + lines
          );
        }
      });
    }

    try {
      window.dispatchEvent(
        new CustomEvent("ap:bundle:audit", {
          detail: { requireOnly, coveredPct: covered, missing, duplicates },
        })
      );
    } catch {}

    (L.info || L.log)?.("[AP][audit] repo coverage", {
      requireOnly,
      coveredPct: covered,
      total: target.size,
      missing: missing.length,
      duplicates: duplicates.length,
    });

    if (missing.length) (L.warn || L.log)?.("[AP][audit] missing", missing);
    if (duplicates.length)
      (L.warn || L.log)?.("[AP][audit] duplicates", duplicates);

    return { coveredPct: covered, missing, duplicates };
  }

  AP.userscript = AP.userscript || {};
  AP.userscript.repoDump = { audit };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/sanity.js");

/* ===== auto-prompter/userscript/sanity.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/sanity.js";try{
// /usr/local/bin/node
// ./auto-prompter/userscript/sanity.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/userscript/sanity.js"
    );
  } catch {}
  function cpSafe(name, extra) {
    try {
      const cp = AP.boot?.cp;
      if (typeof cp === "function") return cp(name, extra);
    } catch {}
    try {
      (AP.logger || console).info("[AP][boot] cp:", name, extra || "");
    } catch {}
    return { t: Date.now(), name: String(name || ""), ...(extra || {}) };
  }
  AP.userscript = AP.userscript || {};
  AP.userscript.sanity = function () {
    cpSafe("userscript:sanity:begin");
    try {
      if (typeof window.AP?.sanityRun === "function") {
        const ok = window.AP.sanityRun();
        if (!ok && typeof AP?.sanity?.utils?.openReport === "function") {
          AP.sanity.utils.openReport(window.AP.sanityResults || []);
        }
      } else {
        (AP.logger || console).info(
          "[AP sanity] not exposed (maybe internal)."
        );
      }
    } catch (e) {
      (AP.logger || console).warn("[AP sanity] error", e);
    }
    cpSafe("userscript:sanity:end");
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/tryStart.js");

/* ===== auto-prompter/userscript/tryStart.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/tryStart.js";try{
// /usr/local/bin/node
// ./auto-prompter/userscript/tryStart.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/userscript/tryStart.js"
    );
  } catch {}
  function cpSafe(name, extra) {
    try {
      const cp = AP.boot?.cp;
      if (typeof cp === "function") return cp(name, extra);
    } catch {}
    try {
      (AP.logger || console).info("[AP][boot] cp:", name, extra || "");
    } catch {}
    return { t: Date.now(), name: String(name || ""), ...(extra || {}) };
  }
  AP.userscript = AP.userscript || {};
  AP.userscript.tryStart = function () {
    if (AP.__userscriptTryStartRan) return;
    AP.__userscriptTryStartRan = true;
    cpSafe("userscript:tryStart:begin");
    try {
      window.addEventListener(
        "ap:need-start",
        (e) => e?.detail?.provide?.(AP.AutoPrompterCore?.start),
        { once: true }
      );
      window.addEventListener(
        "ap:need-stop",
        (e) => e?.detail?.provide?.(AP.AutoPrompterCore?.stop),
        { once: true }
      );
    } catch {}
    try {
      AP.mountPoint?.mountPanelWhenReady?.();
    } catch (e) {
      (AP.logger || console).warn("mountPanelWhenReady error", e);
    }
    try {
      AP.startGate?.startIfCoreExists?.();
    } catch (e) {
      (AP.logger || console).warn("startGate error", e);
    }
    try {
      AP.AutoPrompterCore?.start?.();
    } catch (e) {
      (AP.logger || console).warn("core.start error", e);
    }
    cpSafe("userscript:tryStart:end");
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/version.js");

/* ===== auto-prompter/userscript/version.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/version.js";try{
// /usr/local/bin/node
// ./auto-prompter/userscript/version.js
(function () {
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.versions = AP.versions || {};
  AP.versions.userscript = "6.9.5";
  AP.versions.meta = {
    repo: "gpt_auto_prompter",
    branch: "development",
    commit: "1e33fcff0fdd",
    committedAt: "2025-10-11T23:44:20-05:00",
    generatedAt: "2025-10-12T09:31:53-05:00",
  };
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/userscript/version.js@6.9.5"
    );
  } catch {}
  AP.boot = AP.boot || {
    id:
      Math.random().toString(36).slice(2, 6) +
      "-" +
      (Date.now() % 1e6).toString(36),
    startedAt: Date.now(),
    trace: [],
  };
  if (typeof AP.boot.cp !== "function") {
    AP.boot.cp = function (name, extra) {
      const t = Date.now();
      const row = {
        t,
        dt: t - (AP.boot.trace[0]?.t || AP.boot.startedAt),
        name: String(name || ""),
        ...(extra || {}),
      };
      AP.boot.trace.push(row);
      try {
        (AP.logger || console).info("[AP][boot] cp:", row.name, extra || "");
      } catch {}
      try {
        window.dispatchEvent(new CustomEvent("ap:boot-cp", { detail: row }));
      } catch {}
      return row;
    };
  }
  const L = AP.logger || console;
  try {
    const tail = Array.isArray(window.__AP_LOAD)
      ? window.__AP_LOAD.slice(-20)
      : [];
    const lastModuleLoaded = tail[tail.length - 1] || "n/a";
    (L.info || L.log).call(L, "[AP][version] userscript=6.9.5", {
      repo: AP.versions.meta.repo,
      branch: AP.versions.meta.branch,
      commit: AP.versions.meta.commit,
      committedAt: AP.versions.meta.committedAt,
      generatedAt: AP.versions.meta.generatedAt,
      lastModuleLoaded,
    });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/bootstrap/guard.js");

/* ===== auto-prompter/userscript/bootstrap/guard.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/bootstrap/guard.js";try{
// /usr/local/bin/node
// ./auto-prompter/userscript/bootstrap/guard.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/userscript/bootstrap/guard.js"
    );
  } catch {}
  const L = AP.logger || console;
  const cp = AP.boot?.cp || function () {};
  const TOKEN = Symbol.for("ap.userscript.boot.guard");
  if (window[TOKEN]) {
    try {
      (L.info || L.log).call(L, "[AP boot] guard already loaded");
    } catch {}
    return;
  }
  const allowedHost = /^(chat\.openai\.com|chatgpt\.com)$/i.test(
    location.hostname
  );
  const isTop = !window.top || window.top === window;
  if (!allowedHost || !isTop) {
    try {
      (L.info || L.log).call(L, "[AP boot] guard skip", {
        host: location.hostname,
        topFrame: isTop,
      });
    } catch {}
    return;
  }
  window[TOKEN] = true;
  AP.__BOOT_GUARD_OK = true;
  try {
    cp("userscript:bootstrap:guard:ok", {
      host: location.hostname,
      topFrame: isTop,
    });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/bootstrap/start.js");

/* ===== auto-prompter/userscript/bootstrap/start.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/bootstrap/start.js";try{
// /usr/local/bin/node
// ./auto-prompter/userscript/bootstrap/start.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/userscript/bootstrap/start.js"
    );
  } catch {}
  const L = AP.logger || console;
  const cp = AP.boot?.cp || function () {};
  if (!AP.__BOOT_GUARD_OK) {
    try {
      (L.info || L.log).call(
        L,
        "[AP boot] start aborted: guard not ok (wrong host/frame)"
      );
    } catch {}
    return;
  }
  if (AP.__BOOT_START_INIT) return;
  AP.__BOOT_START_INIT = true;
  function tryRun() {
    try {
      if (AP?.userscript?.entry?.run) {
        AP.userscript.entry.run();
        return true;
      }
    } catch (e) {
      try {
        (L.warn || L.log).call(L, "[AP boot] entry.run failed", e);
      } catch {}
    }
    try {
      if (AP?.userscript?.tryStart) {
        AP.userscript.tryStart();
        return true;
      }
    } catch (e2) {
      try {
        (L.warn || L.log).call(L, "[AP boot] tryStart failed", e2);
      } catch {}
    }
    return false;
  }
  try {
    cp("userscript:bootstrap:start:init", { ready: document.readyState });
  } catch {}
  if (!tryRun()) {
    let attempts = 0;
    const maxAttempts = 8;
    const handle = setInterval(function () {
      attempts += 1;
      if (tryRun() || attempts >= maxAttempts) clearInterval(handle);
    }, 25);
    if (document && document.readyState !== "complete") {
      document.addEventListener(
        "DOMContentLoaded",
        function onReady() {
          document.removeEventListener("DOMContentLoaded", onReady);
          tryRun();
        },
        { once: true }
      );
    }
    try {
      queueMicrotask(tryRun);
    } catch {
      try {
        Promise.resolve().then(tryRun);
      } catch {}
    }
  }
  try {
    setTimeout(() => cp("userscript:bootstrap:start:post"), 1500);
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/manifest/helpers.js");

/* ===== auto-prompter/userscript/manifest/helpers.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/manifest/helpers.js";try{
// /usr/local/bin/node
// ./auto-prompter/userscript/manifest/helpers.js
(function () {
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const U = (AP.userscript = AP.userscript || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/userscript/manifest/helpers.js"
    );
  } catch {}

  // Ensure base map + minimal APIs so parts.* can register immediately.
  U.__manifestParts = U.__manifestParts || new Map();

  // has()
  if (typeof U.manifestHas !== "function") {
    U.manifestHas = function has(path) {
      try {
        let o = window;
        for (const k of String(path || "").split(".")) {
          if (!(k in o)) return false;
          o = o[k];
        }
        return true;
      } catch {
        return false;
      }
    };
  }

  // devEnabled()
  if (typeof U.devEnabled !== "function") {
    U.devEnabled = function devEnabled() {
      try {
        const f = AP.flags?.dev;
        if (typeof f === "function") return !!f();
      } catch {}
      try {
        if (new URL(location.href).searchParams.get("ap_dev") === "1")
          return true;
      } catch {}
      try {
        if (String(localStorage.getItem("ap_dev")) === "1") return true;
      } catch {}
      return false;
    };
  }

  // mkManifestItem()
  if (typeof U.mkManifestItem !== "function") {
    U.mkManifestItem = function mk(path, checkOrMeta) {
      const item = {
        path,
        check: () => true,
        after: [],
        before: [],
        weight: 0,
      };
      if (typeof checkOrMeta === "function") {
        item.check = checkOrMeta;
      } else if (typeof checkOrMeta === "string") {
        const chk = checkOrMeta;
        item.check = () => U.manifestHas(chk);
      } else if (checkOrMeta && typeof checkOrMeta === "object") {
        const { check, after, before, weight } = checkOrMeta;
        if (typeof check === "function") item.check = check;
        else if (typeof check === "string")
          item.check = () => U.manifestHas(check);
        if (after) item.after = Array.isArray(after) ? after.slice() : [after];
        if (before)
          item.before = Array.isArray(before) ? before.slice() : [before];
        if (Number.isFinite(weight)) item.weight = weight;
      }
      return item;
    };
  }

  // registerManifestPart()
  if (typeof U.registerManifestPart !== "function") {
    U.registerManifestPart = function registerManifestPart(name, items) {
      if (!name) return;
      const list = Array.isArray(items) ? items.slice() : [];
      U.__manifestParts.set(name, list);
    };
  }

  // NOTE: We intentionally do NOT define buildManifest here anymore.
  // It now lives in ./helpers/build.js — this file keeps only the minimal
  // surfaces needed by parts.* files during registration.
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/manifest/parts.boot-loader.js");

/* ===== auto-prompter/userscript/manifest/parts.boot-loader.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/manifest/parts.boot-loader.js";try{
// ./auto-prompter/userscript/manifest/parts.boot-loader.js
(function () {
  const U = (window.AutoPrompter = window.AutoPrompter || {}).userscript;
  const mk = U.mkManifestItem;

  U.registerManifestPart("boot-loader", [
    mk("/core/runtime/boot/loader.js", "AutoPrompter.bootLoader.util.onReady"),
    mk(
      "/core/runtime/boot/loader/util.js",
      "AutoPrompter.bootLoader.util.onReady"
    ),
    // FIX: telemetry lives under core/devtools/telemetry
    mk(
      "/core/devtools/telemetry/loader.telemetry.js",
      "AutoPrompter.bootLoader.telemetry.cp"
    ),
    mk(
      "/core/runtime/boot/loader/flags.js",
      "AutoPrompter.bootLoader.flags.getFlag"
    ),
    mk(
      "/core/runtime/boot/loader/apload.js",
      "AutoPrompter.bootLoader.apload.fillApLoadWithRequired"
    ),
    mk(
      "/core/runtime/boot/loader/probe.js",
      "AutoPrompter.bootLoader.probe.runComposerProbe"
    ),
    mk(
      "/core/runtime/boot/loader/sanity.js",
      "AutoPrompter.bootLoader.sanity.runSanityOnce"
    ),
    mk(
      "/core/runtime/boot/loader/startCore.js",
      "AutoPrompter.bootLoader.startCore.run"
    ),
  ]);
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/manifest/parts.core-boot.js");

/* ===== auto-prompter/userscript/manifest/parts.core-boot.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/manifest/parts.core-boot.js";try{
// ./auto-prompter/userscript/manifest/parts.core-boot.js
(function () {
  const U = (window.AutoPrompter = window.AutoPrompter || {}).userscript;
  const mk = U.mkManifestItem;

  U.registerManifestPart("core-boot", [
    mk("/core/runtime/boot/core.js", "AutoPrompter.AutoPrompterCore.start"),
    mk("/core/runtime/boot/state.js", "AutoPrompter.coreState.isStarted"),
    // FIX: panel file doesn’t exist under runtime/boot; use core/ui/panel.js
    mk("/core/ui/panel.js", "AutoPrompter.uiPanel.createPanel"),
    mk(
      "/core/runtime/boot/mountPoint.js",
      "AutoPrompter.mountPoint.mountPanelWhenReady"
    ),
    mk("/core/runtime/boot/run.js", "AutoPrompter.coreRun.run"),
    mk("/core/runtime/boot/start.js", "AutoPrompter.coreStart.start"),
    mk(
      "/core/runtime/boot/gate.js",
      "AutoPrompter.startGate.startIfCoreExists"
    ),
    mk("/core/runtime/boot/startGate.js", "AutoPrompter.startGate.untilGate"),
    mk("/core/runtime/boot/navWatch.js", "AutoPrompter.navWatch.teardown"),
  ]);
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/manifest/parts.logging-core.js");

/* ===== auto-prompter/userscript/manifest/parts.logging-core.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/manifest/parts.logging-core.js";try{
// ./auto-prompter/userscript/manifest/parts.logging-core.js
(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const U = (AP.userscript = AP.userscript || {});

  // mk() that matches the rest of the system (uses `check`, not `ok`)
  const mk =
    U.mkManifestItem ||
    function (path, check) {
      const checker =
        typeof check === "function"
          ? check
          : () =>
              typeof U.manifestHas === "function"
                ? !!U.manifestHas(path)
                : true;
      return { path, check: checker };
    };

  // De-dupe guard
  U.__manifestPartsLoaded = U.__manifestPartsLoaded || new Set();
  const PART_NAME = "logging-core";
  if (U.__manifestPartsLoaded.has(PART_NAME)) return;

  // ✅ Correct, canonical paths (rooted at /logging/)
  const items = [
    mk("/logging/core/checkpoint.js"),
    mk("/logging/core/constants.js"),
    mk("/logging/core/emit.js"),
    mk("/logging/core/sinkbus.js"),
    mk("/logging/core/utils.js"),
    mk("/logging/logger/index.js"),
  ];

  if (typeof U.registerManifestPart === "function") {
    U.registerManifestPart(PART_NAME, items);
    U.__manifestPartsLoaded.add(PART_NAME);
  } else {
    (U.__manifestQueue = U.__manifestQueue || []).push([PART_NAME, items]);
  }
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/manifest/parts.logging.js");

/* ===== auto-prompter/userscript/manifest/parts.logging.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/manifest/parts.logging.js";try{
// ./auto-prompter/userscript/manifest/parts.logging.js
(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const U = (AP.userscript = AP.userscript || {});

  const mk =
    U.mkManifestItem ||
    function (path, check) {
      const checker =
        typeof check === "function"
          ? check
          : () =>
              typeof U.manifestHas === "function"
                ? !!U.manifestHas(path)
                : true;
      return { path, check: checker };
    };

  U.__manifestPartsLoaded = U.__manifestPartsLoaded || new Set();
  const PART_NAME = "logging";
  if (U.__manifestPartsLoaded.has(PART_NAME)) return;

  // ✅ Correct, canonical paths (rooted at /logging/)
  const items = [
    mk("/logging/boot-shims.js"),
    mk("/logging/logger.js"),
    mk("/logging/mirrorSink.js"),
    mk("/logging/uiPanel.js"),
    mk("/logging/uiPosition.js"),
  ];

  if (typeof U.registerManifestPart === "function") {
    U.registerManifestPart(PART_NAME, items);
    U.__manifestPartsLoaded.add(PART_NAME);
  } else {
    (U.__manifestQueue = U.__manifestQueue || []).push([PART_NAME, items]);
  }
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/manifest/parts.nav-boot.js");

/* ===== auto-prompter/userscript/manifest/parts.nav-boot.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/manifest/parts.nav-boot.js";try{
// ./auto-prompter/userscript/manifest/parts.nav-boot.js
(function () {
  const U = (window.AutoPrompter = window.AutoPrompter || {}).userscript;
  const mk = U.mkManifestItem;

  U.registerManifestPart("nav-boot", [
    mk(
      "/core/runtime/boot/nav/boot/computeFlags.js",
      "AutoPrompter.navBoot.computeFlags.computeFlags"
    ),
    mk(
      "/core/runtime/boot/nav/boot/guards.js",
      "AutoPrompter.navBoot.guards.pathBlocked"
    ),
    mk(
      "/core/runtime/boot/nav/boot/ready.js",
      "AutoPrompter.navBoot.ready.waitForReady"
    ),
    mk(
      "/core/runtime/boot/nav/boot/watchdog.js",
      "AutoPrompter.navBoot.watchdog.createWatchdog"
    ),
    // FIX: telemetry file path
    mk(
      "/core/devtools/telemetry/nav.boot.telemetry.js",
      "AutoPrompter.navBoot.telemetry.ready"
    ),
    mk(
      "/core/runtime/boot/nav/boot/schedulers.js",
      "AutoPrompter.navBoot.schedulers.buildSchedulers"
    ),
    mk(
      "/core/runtime/boot/nav/boot/install.js",
      "AutoPrompter.navBoot.install.installAll"
    ),
    mk(
      "/core/runtime/boot/nav/boot/interval.js",
      "AutoPrompter.navBoot.interval.startInterval"
    ),
    mk(
      "/core/runtime/boot/nav/boot/strategy.js",
      "AutoPrompter.navBoot.strategy.runStrategy"
    ),
    mk(
      "/core/runtime/boot/nav/boot/longtask.js",
      "AutoPrompter.navBoot.longtask.start"
    ),
    mk(
      "/core/runtime/boot/nav/boot/start.js",
      "AutoPrompter.navBoot.start.start"
    ),
    mk("/core/runtime/boot/nav/boot/index.js", "AutoPrompter.nav.start"),
  ]);
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/manifest/parts.nav-facades.js");

/* ===== auto-prompter/userscript/manifest/parts.nav-facades.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/manifest/parts.nav-facades.js";try{
// ./auto-prompter/userscript/manifest/parts.nav-facades.js
(function () {
  const U = (window.AutoPrompter = window.AutoPrompter || {}).userscript;
  const mk = U.mkManifestItem;

  U.registerManifestPart("nav-facades", [
    mk("/core/runtime/boot/nav/flags.js", "AutoPrompter.navFlags.readFlags"),
    mk("/core/runtime/boot/nav/index.js", "AutoPrompter.nav.start"),
    mk("/core/runtime/boot/nav/route.js", "AutoPrompter.navRoute"),
    mk(
      "/core/runtime/boot/nav/scheduler.js",
      "AutoPrompter.navScheduler.makeDebouncedScheduler"
    ),
    mk("/core/runtime/boot/nav/state.js", "AutoPrompter.navState.createState"),
  ]);
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/manifest/parts.nav-hooks.js");

/* ===== auto-prompter/userscript/manifest/parts.nav-hooks.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/manifest/parts.nav-hooks.js";try{
// ./auto-prompter/userscript/manifest/parts.nav-hooks.js
(function () {
  const U = (window.AutoPrompter = window.AutoPrompter || {}).userscript;
  const mk = U.mkManifestItem;

  U.registerManifestPart("nav-hooks", [
    mk("/core/runtime/boot/nav/hooks.js", "AutoPrompter.navHooks"),
    mk(
      "/core/runtime/boot/nav/hooks/index.js",
      "AutoPrompter.navHooks.installHistoryPatch"
    ),
    mk(
      "/core/runtime/boot/nav/hooks/history.js",
      "AutoPrompter.navHooks.history.installHistoryPatch"
    ),
    mk(
      "/core/runtime/boot/nav/hooks/interval.js",
      "AutoPrompter.navHooks.interval.installIntervalFallback"
    ),
    mk(
      "/core/runtime/boot/nav/hooks/mutation.js",
      "AutoPrompter.navHooks.mutation.installMutationObserver"
    ),
  ]);
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/manifest/parts.nav-route.js");

/* ===== auto-prompter/userscript/manifest/parts.nav-route.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/manifest/parts.nav-route.js";try{
// ./auto-prompter/userscript/manifest/parts.nav-route.js
(function () {
  const U = (window.AutoPrompter = window.AutoPrompter || {}).userscript;
  const mk = U.mkManifestItem;

  U.registerManifestPart("nav-route", [
    mk(
      "/core/runtime/boot/nav/route/index.js",
      "AutoPrompter.navRoute.routeChangedFactory"
    ),
    mk(
      "/core/runtime/boot/nav/route/changed.js",
      "AutoPrompter.navRoute.changed.routeChangedFactory"
    ),
    mk(
      "/core/runtime/boot/nav/route/schedule.js",
      "AutoPrompter.navRoute.schedule.scheduleFactory"
    ),
  ]);
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/manifest/parts.nav-utils.js");

/* ===== auto-prompter/userscript/manifest/parts.nav-utils.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/manifest/parts.nav-utils.js";try{
// ./auto-prompter/userscript/manifest/parts.nav-utils.js
(function () {
  const U = (window.AutoPrompter = window.AutoPrompter || {}).userscript;
  const mk = U.mkManifestItem;

  U.registerManifestPart("nav-utils", [
    mk("/core/runtime/boot/nav/utils.js", "AutoPrompter.nav.utils.until"),
    mk("/core/runtime/boot/nav/utils/index.js", "AutoPrompter.nav.utils.raf"),
    mk("/core/runtime/boot/nav/utils/dom.js", "AutoPrompter.__nav.dom.q"),
    mk("/core/runtime/boot/nav/utils/log.js", "AutoPrompter.__nav.log.safeLog"),
    mk("/core/runtime/boot/nav/utils/time.js", "AutoPrompter.__nav.time.raf"),
  ]);
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/manifest/parts.sanity.js");

/* ===== auto-prompter/userscript/manifest/parts.sanity.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/manifest/parts.sanity.js";try{
// /usr/local/bin/node
// ./auto-prompter/userscript/manifest/parts.sanity.js
(function () {
  const U = (window.AutoPrompter = window.AutoPrompter || {}).userscript;
  const mk = U.mkManifestItem;

  // Load sanity base + utils + reporters + checks so userscript boot can use them.
  U.registerManifestPart("sanity", [
    // base surface + minimal helpers
    mk("/core/sanity/utils.js", () => true),
    mk("/core/sanity/helpers.js", "AutoPrompter.detectSanityHelpers.sample"),
    mk("/core/sanity/facade.js", "AutoPrompter.sanity.run"),
    mk("/core/sanity/index.js", "AutoPrompter.sanity.version"),

    // config + telemetry plumbing
    mk("/core/sanity/utils/config/config.js", "AutoPrompter.config.getConfig"),
    mk("/core/sanity/utils/config/explain.js", "AutoPrompter.config.getConfig"),
    mk(
      "/core/sanity/utils/telemetry/sink.js",
      "AutoPrompter.sanity.utils.postLog"
    ),
    mk("/core/sanity/utils/telemetry/bk.js", "AutoPrompter.sanity.utils.bkLog"),
    mk(
      "/core/sanity/utils/telemetry/report.js",
      "AutoPrompter.sanity.utils.reportHtml"
    ),
    mk(
      "/core/sanity/utils/telemetry/print.js",
      "AutoPrompter.sanity.utils.printResults"
    ),
    mk(
      "/core/sanity/utils/telemetry/snapshot.js",
      "AutoPrompter.sanity.utils.envSnapshot"
    ),

    // diagnostics & runtime signals
    mk(
      "/core/sanity/utils/diagnostics/csp.js",
      "AutoPrompter.sanity.utils.sniffCsp"
    ),
    mk(
      "/core/sanity/utils/diagnostics/errors.js",
      "AutoPrompter.sanity.utils.captureGlobalErrors"
    ),
    mk(
      "/core/sanity/utils/diagnostics/perf.js",
      "AutoPrompter.sanity.utils.installPerfObservers"
    ),

    // boot/heartbeat helpers
    mk(
      "/core/sanity/utils/bootstrap/boot.js",
      "AutoPrompter.sanity.utils.firstRunDump"
    ),
    mk(
      "/core/sanity/utils/bootstrap/core-ready.js",
      "AutoPrompter.sanity.utils.awaitCoreStart"
    ), // NEW
    mk(
      "/core/sanity/utils/telemetry/heartbeat.js",
      "AutoPrompter.sanity.utils.startHeartbeat"
    ),
    mk(
      "/core/sanity/utils/telemetry/lifecycle.js",
      "AutoPrompter.sanity.utils.attachLifecycle"
    ),
    mk(
      "/core/sanity/utils/telemetry/network-memory.js",
      "AutoPrompter.sanity.utils.attachEnvSignals"
    ),

    // ux helpers
    mk("/core/sanity/utils/ux/toast.js", "AutoPrompter.sanity.utils.toast"),
    mk("/core/sanity/utils/ux/breadcrumbs.js", "AutoPrompter.sanity.bc.mark"),

    // required-runtime path map used by bundle/order checks
    mk(
      "/core/sanity/utils/config/paths.js",
      "AutoPrompter.sanity.utils.REQUIRED_RUNTIME"
    ),

    // legacy single-file checks (surfaced via userscript/sanity.js)
    mk("/core/sanity/checks.js", "AutoPrompter.sanity.run"),

    // modern runner + registry + reporters
    mk(
      "/core/sanity/sanity_core/registry.js",
      "AutoPrompter.detectSanityRegistry.get"
    ),
    mk(
      "/core/sanity/sanity_core/runner.js",
      "AutoPrompter.detectSanityRunner.runAll"
    ),
    mk(
      "/core/sanity/sanity_core/index.js",
      "AutoPrompter.detectCoreSanity.run"
    ),
    mk("/core/sanity/report.js", "AutoPrompter.detectSanityReport.logReport"),
    mk("/core/sanity/reporters/console.js", () => true),
    mk("/core/sanity/reporters/banner.js", () => true),
    mk("/core/sanity/reporters/telemetry.js", () => true),
    mk(
      "/core/sanity/reporters/html.js",
      "AutoPrompter.detectSanityHtmlReporter"
    ),

    // individual checks
    mk("/core/sanity/checks/bundle.js", () => true),
    mk("/core/sanity/checks/cache.js", () => true),
    mk("/core/sanity/checks/composer.js", () => true),
    mk("/core/sanity/checks/core_ready.js", () => true),
    mk("/core/sanity/checks/environment.js", () => true),
    mk("/core/sanity/checks/flags.js", () => true),
    mk("/core/sanity/checks/order.js", () => true),
    mk("/core/sanity/checks/selectors.js", () => true),
    mk("/core/sanity/checks/self.js", () => true),
    mk("/core/sanity/checks/userscript.js", () => true),
  ]);
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/manifest/parts.ui-panel.js");

/* ===== auto-prompter/userscript/manifest/parts.ui-panel.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/manifest/parts.ui-panel.js";try{
// ./auto-prompter/userscript/manifest/parts.ui-panel.js
(function () {
  const U = (window.AutoPrompter = window.AutoPrompter || {}).userscript;
  const mk = U.mkManifestItem;

  // NOTE: We intentionally exclude any monolithic ui/panel/layout.js to avoid collisions.
  U.registerManifestPart("ui-panel", [
    mk("/auto-prompter/ui/theme.js", "AutoPrompter.theme.ensureTheme"),

    // layout (modular only)
    mk("/auto-prompter/ui/panel/layout/mount.js", () => true),
    mk("/auto-prompter/ui/panel/layout/markup.js", () => true),
    mk("/auto-prompter/ui/panel/layout/toggle.js", () => true),
    mk("/auto-prompter/ui/panel/layout/keyboard.js", () => true),
    mk("/auto-prompter/ui/panel/layout/dock.js", () => true),
    mk("/auto-prompter/ui/panel/layout/debug.js", () => true),
    mk(
      "/auto-prompter/ui/panel/layout/index.js",
      "AutoPrompter.uiLayout.buildPanel"
    ),

    // tabs & controls
    mk("/auto-prompter/ui/panel/tabs.js", "AutoPrompter.uiTabs.wireTabs"),
    mk("/auto-prompter/ui/panel/controls/safe.js", () => true),
    mk("/auto-prompter/ui/panel/controls/repeats.js", () => true),
    mk("/auto-prompter/ui/panel/controls/steps/styles.js", () => true),
    mk("/auto-prompter/ui/panel/controls/steps/row.js", () => true),


    mk("/auto-prompter/ui/panel/controls/ui.js", () => true),
    mk("/auto-prompter/ui/panel/controls/scheduler.js", () => true),

    mk("/auto-prompter/ui/panel/controls/form.js", () => true),
    mk("/auto-prompter/ui/panel/controls/buttons.js", () => true),
    mk(
      "/auto-prompter/ui/panel/controls/index.js",
      "AutoPrompter.uiControls.wireControls"
    ),

    // data panes
    mk(
      "/auto-prompter/ui/panel/profiles.js",
      "AutoPrompter.uiProfiles.wireProfiles"
    ),
    mk(
      "/auto-prompter/ui/panel/templates.js",
      "AutoPrompter.uiTemplates.setupTemplates"
    ),
    mk("/auto-prompter/ui/panel.log.js", "AutoPrompter.uiLog.setupLog"),

    // panel entry
    mk("/auto-prompter/ui/panel.js", "AutoPrompter.uiPanel.createPanel"),
  ]);
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/manifest/parts.ui-position.js");

/* ===== auto-prompter/userscript/manifest/parts.ui-position.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/manifest/parts.ui-position.js";try{
// ./auto-prompter/userscript/manifest/parts.ui-position.js
(function () {
  const U = (window.AutoPrompter = window.AutoPrompter || {}).userscript;
  const mk = U.mkManifestItem;

  U.registerManifestPart("ui-position", [
    mk(
      "/auto-prompter/ui/position/storage.js",
      "AutoPrompter.uiPosition.POS_KEY"
    ),
    mk("/auto-prompter/ui/position/geometry.js", () => true),
    mk("/auto-prompter/ui/position/apply.js", () => true),
    mk("/auto-prompter/ui/position/drag.js", () => true),
    mk("/auto-prompter/ui/position/keyboard.js", () => true),
    mk(
      "/auto-prompter/ui/position/index.js",
      "AutoPrompter.uiPosition.applyPosition"
    ),
  ]);
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/manifest/parts.userscript.js");

/* ===== auto-prompter/userscript/manifest/parts.userscript.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/manifest/parts.userscript.js";try{
// /opt/homebrew/bin/node
// ./auto-prompter/userscript/manifest/parts.userscript.js
(function () {
  "use strict";

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/userscript/manifest/parts.userscript.js"
    );
  } catch {}

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const U = (AP.userscript = AP.userscript || {});
  const mk =
    U.mkManifestItem ||
    function (path) {
      // safer fallback: always return a manifest item object
      return { path, check: () => true };
    };

  // Optional UI gate (robust to flags/query/localStorage)
  function gateUiEnabled() {
    try {
      if (AP.flags?.gateUi && typeof AP.flags.gateUi === "function") {
        return !!AP.flags.gateUi();
      }
    } catch {}
    try {
      if (new URL(location.href).searchParams.get("ap_gate_ui") === "1")
        return true;
    } catch {}
    try {
      if (String(localStorage.getItem("ap_gate_ui")) === "1") return true;
    } catch {}
    return false;
  }

  // De-dupe: avoid double registration if this file is injected twice
  U.__manifestPartsLoaded = U.__manifestPartsLoaded || new Set();
  const PART_NAME = "userscript";
  if (U.__manifestPartsLoaded.has(PART_NAME)) return;

  const items = [
    // Versions & probes
    mk(
      "/auto-prompter/userscript/version.js",
      "AutoPrompter.versions.userscript"
    ),
    mk("/auto-prompter/userscript/probe.js", "AutoPrompter.userscript.probe"),
    mk(
      "/auto-prompter/userscript/tryStart.js",
      "AutoPrompter.userscript.tryStart"
    ),
    mk("/auto-prompter/userscript/sanity.js", "AutoPrompter.userscript.sanity"),

    // Manifest composition (modular)
    mk(
      "/auto-prompter/userscript/manifest/parts.helpers.js",
      "AutoPrompter.userscript.__manifestHelpersPartReady"
    ),
    mk(
      "/auto-prompter/userscript/manifest/order.js",
      "AutoPrompter.userscript.ORDER"
    ),
    mk("/auto-prompter/userscript/manifest/edges.js", () => true),
    mk(
      "/auto-prompter/userscript/manifest/init.js",
      "AutoPrompter.userscript.__manifestInitRan"
    ),

    // Core userscript entrypoints
    mk(
      "/auto-prompter/userscript/autoload.js",
      "AutoPrompter.userscript.autoload"
    ),
    mk("/auto-prompter/userscript/boot.js", "AutoPrompter.userscript.boot"),
    mk(
      "/auto-prompter/userscript/entry.js",
      "AutoPrompter.userscript.entry.run"
    ),
    mk(
      "/auto-prompter/userscript/boot-core-helpers.js",
      "AutoPrompter.userscript.devEnabled"
    ),
    mk(
      "/auto-prompter/userscript/runtime-pickers.js",
      "AutoPrompter.userscript.runtimePickers.installEventBridges"
    ),

    // Split index set (must precede glue to avoid undefined AP)
    mk(
      "/auto-prompter/userscript/index/facade.js",
      "AutoPrompter.__apMainFacadeReady"
    ),
    mk(
      "/auto-prompter/userscript/index/composer-bridge.js",
      "AutoPrompter.__apComposerBridgeReady"
    ),
    mk(
      "/auto-prompter/userscript/index/whenReady.js",
      "AutoPrompter.whenReady"
    ),
    mk(
      "/auto-prompter/userscript/index/startGateEnhance.js",
      "AutoPrompter.__startGateEnhanced"
    ),
    mk(
      "/auto-prompter/userscript/index/bootChecklist.js",
      "AutoPrompter.userscript.bootHelpers.bootChecklist"
    ),
    mk(
      "/auto-prompter/userscript/index/openBootTrace.js",
      "AutoPrompter.openBootTrace"
    ),
    mk(
      "/auto-prompter/userscript/index/boot.js",
      "AutoPrompter.__apBootInstalled"
    ),

    // --- Glue base (bridges + parser fallback) ---
    mk("/auto-prompter/userscript/glue/bridges.js", () => true),
    mk("/auto-prompter/userscript/glue/prompt-parser-fallback.js", () => true),

    // --- Modular glue utils & composer ---
    mk("/auto-prompter/userscript/glue/shared-utils.js", () => true),
    mk("/auto-prompter/userscript/glue/compose-strict.js", () => true),

    // --- Gate helpers (controller + fallback UI wiring) ---
    mk("/auto-prompter/userscript/glue/gate-helpers.js", () => true),

    // --- Dictation glue modules (expanded set; **order matters**) ---
    // logging + config first so subsequent modules have cp() + flags
    mk("/auto-prompter/userscript/glue/dictation-logger.js", () => true),
    mk("/auto-prompter/userscript/glue/dictation-config.js", () => true),

    // core state + DOM helpers used by hooks/finalize
    mk("/auto-prompter/userscript/glue/dictation-session.js", () => true),
    mk("/auto-prompter/userscript/glue/dictation-dom.js", () => true),

    // wire hooks early so we can observe mic/capture soon after load
    mk("/auto-prompter/userscript/glue/dictation-hooks.js", () => true),

    // finalize + fallback rely on session/dom; events relies on finalize
    mk("/auto-prompter/userscript/glue/dictation-finalize.js", () => true),
    mk("/auto-prompter/userscript/glue/dictation-fallback.js", () => true),
    mk("/auto-prompter/userscript/glue/dictation-events.js", () => true),
    // auto-reopen (must run after events, before accept)
    mk("/auto-prompter/userscript/glue/dictation-auto-reopen.js", {
      check: () => true,
      after: ["/auto-prompter/userscript/glue/dictation-events.js"],
      before: ["/auto-prompter/userscript/glue/dictation-accept.js"],
    }),

    // accept keyword / auto-accept helpers
    mk("/auto-prompter/userscript/glue/dictation-accept.js", () => true),

    // compose/send helpers and submit guard
    mk("/auto-prompter/userscript/glue/dictation-compose.js", () => true),
    mk("/auto-prompter/userscript/glue/dictation-guard.js", () => true),

    // site mic watchers (legacy surface)
    mk("/auto-prompter/userscript/glue/dictation-site-watchers.js", () => true),

    // quick diagnostics for dictation stack
    mk("/auto-prompter/userscript/glue/dictation-selftest.js", () => true),

    // public API must come BEFORE dictation-glue so ensure() can be called
    mk("/auto-prompter/userscript/glue/dictation-api.js", () => true),

    // bootstrapper that calls ensure(); must come AFTER dictation-api.js
    mk("/auto-prompter/userscript/glue/dictation-glue.js", () => true),

    // legacy stub (safe after new glue so it no-ops)
    mk("/auto-prompter/userscript/glue/dictation.js", () => true),

    // Optional popup UI for gate (opt-in via ?ap_gate_ui=1 or localStorage)
    mk("/auto-prompter/userscript/glue/dictationGate.js", gateUiEnabled),

    // keep dev + boot glue
    mk(
      "/auto-prompter/userscript/glue/dev.js",
      "AutoPrompter.userscript.devEnabled"
    ),
    mk(
      "/auto-prompter/userscript/glue/boot.js",
      "AutoPrompter.userscript.glue.boot"
    ),

    // Bootstrap split (these should be early in header, but kept here for audit)
    mk(
      "/auto-prompter/userscript/bootstrap/guard.js",
      "AutoPrompter.__BOOT_GUARD_OK"
    ),
    mk(
      "/auto-prompter/userscript/bootstrap/start.js",
      "AutoPrompter.__BOOT_START_INIT"
    ),

    // --- Orchestrator split ---
    mk("/auto-prompter/userscript/orchestrator/flags.js", () => true),
    mk("/auto-prompter/userscript/orchestrator/state.js", () => true),
    mk("/auto-prompter/userscript/orchestrator/phase.js", () => true),
    mk("/auto-prompter/userscript/orchestrator/idle.js", () => true),
    mk("/auto-prompter/userscript/orchestrator/coreWait.js", () => true),
    mk("/auto-prompter/userscript/orchestrator/report.js", () => true),
    mk(
      "/auto-prompter/userscript/orchestrator/run.js",
      "AutoPrompter.userscript.orchestrator.main.run"
    ),

    // delegator (public API)
    mk(
      "/auto-prompter/userscript/orchestrator.js",
      "AutoPrompter.userscript.orchestrator.run"
    ),
  ];

  if (typeof U.registerManifestPart === "function") {
    U.registerManifestPart(PART_NAME, items);
    U.__manifestPartsLoaded.add(PART_NAME);
  } else {
    // If helpers aren't ready yet, queue this part for later registration.
    (U.__manifestQueue = U.__manifestQueue || []).push([PART_NAME, items]);
  }
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("auto-prompter/userscript/manifest/parts.utils-config.js");

/* ===== auto-prompter/userscript/manifest/parts.utils-config.js ===== */
(function(){var __AP_MOD="/auto-prompter/userscript/manifest/parts.utils-config.js";try{
// ./auto-prompter/userscript/manifest/parts.utils-config.js
(function () {
  const U = (window.AutoPrompter = window.AutoPrompter || {}).userscript;
  const has = U.manifestHas,
    mk = U.mkManifestItem;

  U.registerManifestPart("utils-config", [
    mk("/auto-prompter/utils/dom.js", "AutoPrompter.dom.el"),

    mk(
      "/auto-prompter/utils/config/constants.js",
      () => has("AutoPrompter.config.getConfig") || has("AutoPrompter.config")
    ),
    mk("/auto-prompter/utils/config/storage.js", () => true),
    mk("/auto-prompter/utils/config/templates.js", () => true),
    mk("/auto-prompter/utils/config/profiles.js", () => true),
    mk("/auto-prompter/utils/config/index.js", "AutoPrompter.config.getConfig"),
  ]);
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("logging/boot-shims.js");

/* ===== logging/boot-shims.js ===== */
(function(){var __AP_MOD="/logging/boot-shims.js";try{
// logging/boot-shims.js
(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  // ---- logger shim (only if missing) ----
  if (!AP.logger) {
    const c = console;
    const noop = () => {};
    AP.logger = {
      addSink: () => noop,
      removeSink: noop,
      setLevel: noop,
      getLevel: () => "info",
      debug: (...a) => (c.debug || c.log).call(c, "[AP]", ...a),
      log: (...a) => (c.log || c.debug || c.info).call(c, "[AP]", ...a),
      info: (...a) => (c.info || c.log).call(c, "[AP]", ...a),
      warn: (...a) => (c.warn || c.log).call(c, "[AP]", ...a),
      error: (...a) => (c.error || c.log).call(c, "[AP]", ...a),
    };
  }

  // ---- uiPosition shim (only if missing) ----
  if (!AP.uiPosition) {
    const POS_KEY = "ap_ui_pos_v2";
    const loadPos = () => {
      try {
        return JSON.parse(localStorage.getItem(POS_KEY) || "{}");
      } catch {
        return {};
      }
    };
    const savePos = (p) => {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(p || {}));
      } catch {}
    };
    const applyPosition = (card, pos = {}) => {
      if (!card) return;
      const p = { docked: pos.docked ?? "right", top: pos.top ?? 20, ...pos };
      card.style.position = "fixed";
      card.style.top = `${Math.max(12, p.top)}px`;
      if (p.docked === "left") {
        card.style.left = `${p.left ?? 20}px`;
        card.style.right = "auto";
      } else {
        card.style.right = `${p.right ?? 20}px`;
        card.style.left = "auto";
      }
      card.classList.toggle("ap-card--hidden", !!p.hidden);
      card.classList.toggle("ap-card--collapsed", !!p.collapsed);
    };
    const toggleHidden = (card, pos = {}, val) => {
      const hidden = typeof val === "boolean" ? val : !pos.hidden;
      if (card) card.classList.toggle("ap-card--hidden", hidden);
      pos.hidden = hidden;
      savePos(pos);
    };
    const toggleCollapsed = (card, pos = {}, val) => {
      const collapsed = typeof val === "boolean" ? val : !pos.collapsed;
      if (card) card.classList.toggle("ap-card--collapsed", collapsed);
      pos.collapsed = collapsed;
      savePos(pos);
    };
    const dock = (card, pos = {}, side) => {
      pos.docked = side === "left" ? "left" : "right";
      applyPosition(card, pos);
      savePos(pos);
    };

    AP.uiPosition = {
      POS_KEY,
      loadPos,
      savePos,
      applyPosition,
      makeDraggable: () => {},
      toggleHidden,
      toggleCollapsed,
      dock,
    };
  }

  // ---- uiPanel shim (only if missing) ----
  if (!AP.uiPanel) {
    const el = (tag, props = {}, children = []) => {
      const n = document.createElement(tag);
      for (const [k, v] of Object.entries(props)) {
        if (k === "style" && typeof v === "string") n.setAttribute("style", v);
        else if (k in n) {
          try {
            n[k] = v;
          } catch {
            n.setAttribute(k, v);
          }
        } else n.setAttribute(k, v);
      }
      const list = Array.isArray(children) ? children : [children];
      for (const c of list) {
        if (c == null) continue;
        n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      }
      return n;
    };

    const injectStyles = (css) => {
      try {
        const id = "ap-core-styles";
        if (document.getElementById(id)) return;
        const s = document.createElement("style");
        s.id = id;
        s.textContent = css;
        (document.head || document.documentElement).appendChild(s);
      } catch {}
    };

    AP.uiPanel = {
      createPanel({ onStart, onStop } = {}) {
        injectStyles(`
          .ap-card{position:fixed;top:20px;right:20px;background:#0b1220;color:#e5e7eb;
            border:1px solid #243145;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.3);
            width:320px;z-index:2147483647;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial}
          .ap-card--hidden{display:none!important}
          .ap-row{display:flex;gap:8px;flex-wrap:wrap;padding:10px}
          .ap-toggle{position:fixed;right:16px;bottom:16px;width:44px;height:44px;border-radius:999px;
            border:1px solid #374151;background:#111827;color:#e5e7eb;z-index:2147483647;cursor:pointer}
          textarea,input,button{background:#1f2937;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 10px}
          textarea{min-height:80px;width:100%}
        `);

        const host = el("div");
        (document.body || document.documentElement).appendChild(host);
        const shadow = host.attachShadow({ mode: "open" });

        const toggle = el("button", {
          className: "ap-toggle",
          textContent: "AP",
          type: "button",
          title: "Toggle Auto-Prompter",
        });
        (document.body || document.documentElement).appendChild(toggle);

        const card = el("div", { className: "ap-card" });
        const ta = el("textarea", { id: "ap-seq", placeholder: "Sequence..." });
        const btnStart = el("button", {
          textContent: "Start",
          onclick: () =>
            onStart && onStart({ sequence: ta.value || "", autoDetect: true }),
        });
        const btnStop = el("button", {
          textContent: "Stop",
          style: "margin-left:8px",
          onclick: () => onStop && onStop(),
        });

        card.appendChild(el("div", { className: "ap-row" }, [ta]));
        card.appendChild(
          el("div", { className: "ap-row" }, [btnStart, btnStop])
        );
        shadow.appendChild(card);

        toggle.onclick = () => {
          if (AP.uiPosition?.toggleHidden) {
            const pos = AP.uiPosition.loadPos ? AP.uiPosition.loadPos() : {};
            AP.uiPosition.toggleHidden(card, pos);
          } else {
            card.classList.toggle("ap-card--hidden");
          }
        };

        try {
          if (AP.uiPosition?.applyPosition) {
            const pos = AP.uiPosition.loadPos ? AP.uiPosition.loadPos() : {};
            AP.uiPosition.applyPosition(card, pos);
          }
        } catch (e) {
          (AP.logger?.warn || console.warn)(
            "uiPosition.applyPosition error",
            e
          );
        }

        return host;
      },
    };
  }
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/selectors.js");

/* ===== core/detect/selectors.js ===== */
(function(){var __AP_MOD="/core/detect/selectors.js";try{
// runtime/composer/core/selectors.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  const SEL = (AP.detectSelectors = AP.detectSelectors || {});

  // Merge defaults into existing arrays (idempotent)
  const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

  const SEND_DEFAULTS = [
    "#composer-submit-button",
    "[data-testid='send-button']",
    "button[data-testid='send-button']",
    "button[aria-label='Send']",
    "button[aria-label='Send prompt']",
    "button[aria-label*='send prompt' i]",
    "button[aria-label*='send' i]",
    "[role='button'][aria-label*='send' i]",
    "form button[type='submit']:not([data-testid='composer-plus-btn']):not([data-testid='composer-speech-button'])",
    // extra resilience
    "button[aria-label='Send message']",
    "button:has(svg[aria-label='Send'])",
  ];

  const INPUT_DEFAULTS = [
    "#prompt-textarea.ProseMirror[contenteditable='true']",
    "div.ProseMirror[contenteditable='true']",
    "div[contenteditable='true'][role='textbox']",
    "div[contenteditable='true']",
    "textarea#prompt-textarea",
    "textarea[name='prompt-textarea']",
    "textarea[placeholder*='ask' i]",
    "textarea",
    "input[type='text']",
    "input[role='combobox']",
    // extra resilience
    "#prompt-textarea",
    "textarea[data-id='prompt-textarea']",
    "div[data-testid='prompt-textarea'] [contenteditable='true']",
    "div[contenteditable='true'][data-gramm='false']",
  ];

  SEL.SEND_SELECTORS = uniq([...(SEL.SEND_SELECTORS || []), ...SEND_DEFAULTS]);
  SEL.INPUT_SELECTORS = uniq([
    ...(SEL.INPUT_SELECTORS || []),
    ...INPUT_DEFAULTS,
  ]);

  // Allow runtime extension without reordering
  SEL.extend = function ({ send = [], input = [] } = {}) {
    if (send && send.length) {
      SEL.SEND_SELECTORS = uniq([...(SEL.SEND_SELECTORS || []), ...send]);
    }
    if (input && input.length) {
      SEL.INPUT_SELECTORS = uniq([...(SEL.INPUT_SELECTORS || []), ...input]);
    }
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/flags.js");

/* ===== core/detect/flags.js ===== */
(function(){var __AP_MOD="/core/detect/flags.js";try{
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const FLAGS = {
    detectTimeoutMs: Number(localStorage.getItem("ap_detect_timeout_ms") || "") || null,
    verboseDetect: localStorage.getItem("ap_verbose_detect") === "1",
    logWinningSelector: localStorage.getItem("ap_detect_log_selector") === "1",
    pollMs: Math.max(60, Math.min(240, Number(localStorage.getItem("ap_detect_poll_ms") || 120))),
  };
  AP.detectFlags = FLAGS;
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/helpers.js");

/* ===== core/detect/helpers.js ===== */
(function(){var __AP_MOD="/core/detect/helpers.js";try{
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L = (AP._log || { with: () => console }).with({ component: "detect", file: "core/runtime/detect/helpers.js" });
  const qsDeep = (AP.dom && AP.dom.qsDeep) || ((sel, root) => (root || document).querySelector(sel));
  const qsaDeep = (AP.dom && AP.dom.qsaDeep) || ((sel, root) => Array.from((root || document).querySelectorAll(sel)));
  function findDeep(selector, root) {
    try { return qsDeep(selector, root); } catch (e) { L.warn("findDeep error", { selector, e: String(e) }); return null; }
  }
  function closestScope(node) {
    if (!node) return document;
    return (node.getRootNode && node.getRootNode()) || document;
  }
  AP.detectHelpers = { findDeep, closestScope, qsDeep, qsaDeep };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/roots.js");

/* ===== core/detect/roots.js ===== */
(function(){var __AP_MOD="/core/detect/roots.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/detect/roots.js
(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.detectRoots) return;

  const L =
    (AP._log && AP._log.with
      ? AP._log.with({
          component: "detect",
          file: "core/runtime/detect/roots.js",
        })
      : AP.logger) || console;

  function flagOn(key, defBool) {
    try {
      const v = localStorage.getItem(key);
      if (v === "1") return true;
      if (v === "0") return false;
    } catch {}
    return !!defBool;
  }

  function sameOriginDoc(iframeEl) {
    try {
      const doc = iframeEl && iframeEl.contentDocument;
      if (!doc) return null;
      void doc.location.href;
      return doc;
    } catch {
      return null;
    }
  }

  function enumerateSearchRoots({
    includeIframes = true,
    maxFrames = 12,
  } = {}) {
    const roots = [document];
    if (!includeIframes) return roots;

    const frames = Array.from(document.querySelectorAll("iframe,frame"));
    let added = 0;
    for (const f of frames) {
      if (added >= Math.max(0, maxFrames)) break;
      const doc = sameOriginDoc(f);
      if (doc && !roots.includes(doc)) {
        roots.push(doc);
        added++;
      }
    }

    if (roots.length > 1) {
      (L.info || L.log)?.("detect roots", { count: roots.length });
    }
    return roots;
  }

  function getIframesEnabled() {
    return flagOn("ap_detect_iframes", true);
  }

  AP.detectRoots = { enumerateSearchRoots, getIframesEnabled };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/core/config/config.js");

/* ===== core/detect/core/config/config.js ===== */
(function(){var __AP_MOD="/core/detect/core/config/config.js";try{
// /usr/local/bin/node
// ./core/detect/core/config/config.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  function logger(meta) {
    const L =
      (AP._log && AP._log.with ? AP._log.with(meta) : AP.logger) || console;
    return L;
  }

  function getFlags() {
    const F = AP.detectFlags || {};
    const detectTimeoutMs =
      F.detectTimeoutMs != null ? F.detectTimeoutMs : null;
    const verboseDetect = !!F.verboseDetect;
    const logWinningSelector = !!F.logWinningSelector;
    const pollMs = Math.max(60, Math.min(240, Number(F.pollMs || 120)));
    return { detectTimeoutMs, verboseDetect, logWinningSelector, pollMs };
  }

  function getSelectors() {
    const S = AP.detectSelectors || {};
    const SEND_SELECTORS = Array.isArray(S.SEND_SELECTORS)
      ? S.SEND_SELECTORS
      : [
          "[data-testid='send-button']",
          "#composer-submit-button",
          "button[aria-label='Send prompt']",
          "form button[type='submit']",
        ];
    const INPUT_SELECTORS = Array.isArray(S.INPUT_SELECTORS)
      ? S.INPUT_SELECTORS
      : ["[contenteditable='true']", "textarea", "input[type='text']"];
    const isSendReady =
      typeof S.isSendReady === "function"
        ? S.isSendReady
        : function (btn) {
            if (!btn) return false;
            const s = getComputedStyle(btn);
            const disabled =
              btn.hasAttribute("disabled") ||
              btn.getAttribute("aria-disabled") === "true";
            const hidden =
              s.display === "none" ||
              s.visibility === "hidden" ||
              s.opacity === "0";
            return !disabled && !hidden;
          };
    return { SEND_SELECTORS, INPUT_SELECTORS, isSendReady };
  }

  function getHelpers() {
    const H = AP.detectHelpers || {};
    const qsDeep =
      H.qsDeep || ((sel, root) => (root || document).querySelector(sel));
    const findDeep = H.findDeep || qsDeep;
    const closestScope =
      H.closestScope ||
      function (node) {
        return (node && node.getRootNode && node.getRootNode()) || document;
      };
    const sleep =
      (AP.dom && AP.dom.sleep) ||
      ((ms, signal) =>
        new Promise((resolve, reject) => {
          const t = setTimeout(resolve, ms);
          if (signal) {
            const onAbort = () => {
              clearTimeout(t);
              reject(new DOMException("Aborted", "AbortError"));
            };
            signal.aborted
              ? onAbort()
              : signal.addEventListener("abort", onAbort, { once: true });
          }
        }));
    return { qsDeep, findDeep, closestScope, sleep };
  }

  AP.detectCoreConfig = { logger, getFlags, getSelectors, getHelpers };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/core/probe/util/visibility.js");

/* ===== core/detect/core/probe/util/visibility.js ===== */
(function(){var __AP_MOD="/core/detect/core/probe/util/visibility.js";try{
// /usr/local/bin/node
// ./core/detect/core/probe/util/visibility.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  function isVisible(el) {
    if (!el) return false;
    const s = getComputedStyle(el);
    if (!s) return false;
    if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0")
      return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  AP.detectCoreProbeUtil = Object.assign({}, AP.detectCoreProbeUtil || {}, {
    isVisible,
  });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/core/probe/util/firstMatch.js");

/* ===== core/detect/core/probe/util/firstMatch.js ===== */
(function(){var __AP_MOD="/core/detect/core/probe/util/firstMatch.js";try{
// /usr/local/bin/node
// ./core/detect/core/probe/util/firstMatch.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const cfg = AP.detectCoreConfig || {};
  const { logger, getFlags, getHelpers } = cfg;

  const L =
    (logger &&
      logger({
        component: "detect",
        file: "core/runtime/detect/core/probeFirstMatch.js",
      })) ||
    console;

  const FLAGS = (getFlags && getFlags()) || {
    verboseDetect: false,
  };

  const HELP = (getHelpers && getHelpers()) || {
    findDeep: (s, r) => (r || document).querySelector(s),
  };

  function firstMatchSelector(selectors, root, finder) {
    const list = Array.isArray(selectors) ? selectors : [];
    const find = finder || HELP.findDeep;
    const V =
      (AP.detectCoreProbeUtil && AP.detectCoreProbeUtil.isVisible) || null;

    for (const sel of list) {
      try {
        const el = find(sel, root);
        if (el) {
          // Prefer visible nodes to avoid hidden/fallback inputs.
          if (!V || V(el)) return { el, sel };
          if (FLAGS.verboseDetect)
            (L.warn || L.log)?.("detect: skipping invisible match", { sel });
        }
      } catch (e) {
        if (FLAGS.verboseDetect)
          (L.warn || L.log)?.("detect: bad selector", { sel, err: String(e) });
      }
    }
    return { el: null, sel: null };
  }

  AP.detectCoreProbeUtil = Object.assign({}, AP.detectCoreProbeUtil || {}, {
    firstMatchSelector,
  });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/core/probe/util/heuristics.js");

/* ===== core/detect/core/probe/util/heuristics.js ===== */
(function(){var __AP_MOD="/core/detect/core/probe/util/heuristics.js";try{
// /usr/local/bin/node
// ./core/detect/core/probe/util/heuristics.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  const TRAILING_BUTTONS_SEL =
    ".\\[grid-area\\:trailing\\] button, .\\[grid-area\\:trailing\\] [role='button']";

  const HAS_ARROW_SEL = (() => {
    try {
      if (CSS && CSS.supports && CSS.supports("selector(:has(*))")) {
        return `button:has(svg path[d^="M8.99992 16V6.414"])`;
      }
    } catch (e) {}
    return null;
  })();

  function looksLikeSendButton(btn) {
    if (!btn) return false;
    if (btn.id === "composer-plus-btn") return false;
    if (btn.closest && btn.closest("[data-testid='composer-speech-button']"))
      return false;
    const aria = (btn.getAttribute && btn.getAttribute("aria-label")) || "";
    if (aria.toLowerCase().includes("send")) return true;
    if (btn.type === "submit") return true;
    const hasSvg = !!btn.querySelector && !!btn.querySelector("svg");
    const textish = (btn.textContent || "").trim();
    if (hasSvg && !textish) return true;
    return false;
  }

  AP.detectCoreProbeConst = Object.assign({}, AP.detectCoreProbeConst || {}, {
    TRAILING_BUTTONS_SEL,
    HAS_ARROW_SEL,
  });

  AP.detectCoreProbeUtil = Object.assign({}, AP.detectCoreProbeUtil || {}, {
    looksLikeSendButton,
  });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/core/probe/util/nearInput.js");

/* ===== core/detect/core/probe/util/nearInput.js ===== */
(function(){var __AP_MOD="/core/detect/core/probe/util/nearInput.js";try{
// /usr/local/bin/node
// ./core/detect/core/probe/util/nearInput.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const cfg = AP.detectCoreConfig || {};
  const { getHelpers } = cfg;

  const HELP = (getHelpers && getHelpers()) || {
    closestScope: () => document,
  };

  function findSendNearInput(inputEl) {
    if (!inputEl) return null;

    const U = AP.detectCoreProbeUtil || {};
    const C = AP.detectCoreProbeConst || {};
    const isVisible = U.isVisible || (() => true);
    const looksLikeSendButton = U.looksLikeSendButton || (() => false);
    const HAS_ARROW_SEL = C.HAS_ARROW_SEL || null;
    const TRAILING_BUTTONS_SEL = C.TRAILING_BUTTONS_SEL;

    const root = (HELP.closestScope && HELP.closestScope(inputEl)) || document;

    if (HAS_ARROW_SEL) {
      try {
        const precise = root.querySelector(HAS_ARROW_SEL);
        if (precise && isVisible(precise)) return precise;
      } catch (e) {}
    }

    let trailingBtns = [];
    try {
      trailingBtns = Array.from(
        root.querySelectorAll(TRAILING_BUTTONS_SEL)
      ).filter(isVisible);
    } catch (e) {}

    const ranked = trailingBtns.filter(looksLikeSendButton).sort((a, b) => {
      const ad =
        a.disabled || a.getAttribute("aria-disabled") === "true" ? 1 : 0;
      const bd =
        b.disabled || b.getAttribute("aria-disabled") === "true" ? 1 : 0;
      return ad - bd;
    });

    return ranked[0] || trailingBtns[0] || null;
  }

  AP.detectCoreProbeUtil = Object.assign({}, AP.detectCoreProbeUtil || {}, {
    findSendNearInput,
  });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/core/probe/try/tryOnce.js");

/* ===== core/detect/core/probe/try/tryOnce.js ===== */
(function(){var __AP_MOD="/core/detect/core/probe/try/tryOnce.js";try{
// /usr/local/bin/node
// ./core/detect/core/probe/try/tryOnce.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const cfg = AP.detectCoreConfig || {};
  const { logger, getFlags, getSelectors, getHelpers } = cfg;

  const L =
    (logger &&
      logger({
        component: "detect",
        file: "core/runtime/detect/core/probeTryOnce.js",
      })) ||
    console;

  const FLAGS = (getFlags && getFlags()) || {
    verboseDetect: false,
    logWinningSelector: false,
  };

  const SEL = (getSelectors && getSelectors()) || {
    SEND_SELECTORS: [],
    INPUT_SELECTORS: [],
    isSendReady: () => true,
  };

  const HELP = (getHelpers && getHelpers()) || {
    findDeep: (s, r) => (r || document).querySelector(s),
    closestScope: () => document,
  };

  async function tryOnce(scope) {
    const U = AP.detectCoreProbeUtil || {};
    const firstMatchSelector =
      U.firstMatchSelector ||
      function (list, root, finder) {
        const selList = Array.isArray(list) ? list : [];
        const f = finder || HELP.findDeep;
        for (const sel of selList) {
          try {
            const el = f(sel, root);
            if (el) return { el, sel };
          } catch (e) {}
        }
        return { el: null, sel: null };
      };
    const findSendNearInput = U.findSendNearInput || (() => null);
    const isSendReady = SEL.isSendReady || (() => true);

    const root = scope || document;
    let sendBtn, sendSel, inputEl, inputSel;

    ({ el: sendBtn, sel: sendSel } = firstMatchSelector(
      SEL.SEND_SELECTORS,
      root,
      HELP.findDeep
    ));

    if (!sendBtn) {
      ({ el: inputEl, sel: inputSel } = firstMatchSelector(
        SEL.INPUT_SELECTORS,
        root,
        HELP.findDeep
      ));
      if (inputEl) {
        const sc = HELP.closestScope(inputEl) || document;
        ({ el: sendBtn, sel: sendSel } = firstMatchSelector(
          SEL.SEND_SELECTORS,
          sc,
          HELP.findDeep
        ));
        if (!sendBtn) {
          ({ el: sendBtn, sel: sendSel } = firstMatchSelector(
            SEL.SEND_SELECTORS,
            document,
            HELP.findDeep
          ));
        }
        if (!sendBtn) {
          sendBtn = findSendNearInput(inputEl) || null;
          if (sendBtn && FLAGS.logWinningSelector) {
            sendSel = "[heuristic:near-input]";
          }
        }
      }
    } else {
      const sc = HELP.closestScope(sendBtn) || document;
      ({ el: inputEl, sel: inputSel } = firstMatchSelector(
        SEL.INPUT_SELECTORS,
        sc,
        HELP.findDeep
      ));
      if (!inputEl) {
        ({ el: inputEl, sel: inputSel } = firstMatchSelector(
          SEL.INPUT_SELECTORS,
          document,
          HELP.findDeep
        ));
      }
    }

    if (FLAGS.verboseDetect) {
      let trailingCount = -1;
      try {
        const C = AP.detectCoreProbeConst || {};
        const TRAILING_BUTTONS_SEL = C.TRAILING_BUTTONS_SEL;
        trailingCount = document.querySelectorAll(TRAILING_BUTTONS_SEL).length;
      } catch (e) {}
      const dbg = {
        url: location.pathname,
        inputSeen: !!inputEl,
        sendSeen: !!sendBtn,
        sendReady: isSendReady(sendBtn),
        trailingButtons: trailingCount,
      };
      if (FLAGS.logWinningSelector) {
        dbg.winInputSel = inputSel || null;
        dbg.winSendSel = sendSel || null;
      }
      (L.debug || L.info)?.("detect: probe", dbg);
    }

    return { input: inputEl || null, send: sendBtn || null };
  }

  AP.detectCoreProbeTry = { tryOnce };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/core/probe/fallback/probeFallback.js");

/* ===== core/detect/core/probe/fallback/probeFallback.js ===== */
(function(){var __AP_MOD="/core/detect/core/probe/fallback/probeFallback.js";try{
// /usr/local/bin/node
// ./core/detect/core/probe/fallback/probeFallback.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.detectCoreProbeFallback) return;

  const util = () => AP.detectCoreProbeUtil || {};
  const tryApi = () => AP.detectCoreProbeTry || {};
  const cfg = AP.detectCoreConfig || {};
  const { logger } = cfg;

  const L =
    (logger &&
      logger({
        component: "detect",
        file: "core/runtime/detect/core/probeFallback.js",
      })) ||
    console;

  function installSurface() {
    const u = util();
    const t = tryApi();
    const firstMatchSelector =
      u.firstMatchSelector ||
      function () {
        return { el: null, sel: null };
      };
    const tryOnce =
      t.tryOnce ||
      async function () {
        return { input: null, send: null };
      };

    AP.detectCoreProbeFallback = { tryOnce, firstMatchSelector };

    if (AP.detectRegistry && typeof AP.detectRegistry.register === "function") {
      AP.detectRegistry.register(async (opts, signal) => {
        try {
          const r = await tryOnce(document, signal);
          if (r && (r.input || r.send)) return r;
        } catch (e) {}
        return null;
      }, 10);
      (L.info || L.log)?.("probeFallback registered with detectRegistry");
    }
  }

  installSurface();
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/core/probe/resolve/resolve.js");

/* ===== core/detect/core/probe/resolve/resolve.js ===== */
(function(){var __AP_MOD="/core/detect/core/probe/resolve/resolve.js";try{
// /usr/local/bin/node
// ./core/detect/core/probe/resolve/resolve.js
(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  function resolveProbe() {
    if (AP.detectProbe && typeof AP.detectProbe.tryOnce === "function")
      return AP.detectProbe;
    if (
      AP.detectCoreProbeFallback &&
      typeof AP.detectCoreProbeFallback.tryOnce === "function"
    )
      return AP.detectCoreProbeFallback;
    return { tryOnce: async () => ({ input: null, send: null }) };
  }

  AP.detectCoreProbeResolve = { resolveProbe };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/core/roots/scan.js");

/* ===== core/detect/core/roots/scan.js ===== */
(function(){var __AP_MOD="/core/detect/core/roots/scan.js";try{
// /usr/local/bin/node
// ./core/detect/core/roots/scan.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.detectCoreRootsScan) return;

  const cfg = AP.detectCoreConfig || {};
  const { logger, getFlags } = cfg;
  const L =
    (logger &&
      logger({
        component: "detect",
        file: "core/runtime/detect/core/rootsScan.js",
      })) ||
    console;

  const FLAGS = (getFlags && getFlags()) || { verboseDetect: false };

  // Returns { input, send } or { input: null, send: null }
  async function scanOnceAcrossRoots(probe, signal) {
    const rootsApi = AP.detectRoots || {};
    const includeFrames =
      typeof rootsApi.getIframesEnabled === "function"
        ? rootsApi.getIframesEnabled()
        : true;

    const roots = (rootsApi.enumerateSearchRoots &&
      rootsApi.enumerateSearchRoots({ includeIframes: includeFrames })) || [
      document,
    ];

    const t0 = performance.now();
    let attempts = 0;

    for (const root of roots) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      attempts++;
      try {
        const found = await probe.tryOnce(root);
        if (found && found.input && found.send) {
          if (FLAGS.verboseDetect) {
            (L.debug || L.info)?.("rootsScan hit", {
              roots: roots.length,
              attempts,
              tookMs: Math.round(performance.now() - t0),
            });
          }
          return found;
        }
      } catch (e) {
        if (FLAGS.verboseDetect) {
          (L.warn || L.log)?.("rootsScan probe error", { err: String(e) });
        }
      }
    }

    if (FLAGS.verboseDetect) {
      (L.debug || L.info)?.("rootsScan miss", {
        roots: roots.length,
        attempts,
        tookMs: Math.round(performance.now() - t0),
      });
    }
    return { input: null, send: null };
  }

  AP.detectCoreRootsScan = { scanOnceAcrossRoots };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/core/find/explicitSelectors.js");

/* ===== core/detect/core/find/explicitSelectors.js ===== */
(function(){var __AP_MOD="/core/detect/core/find/explicitSelectors.js";try{
// /usr/local/bin/node
// ./core/detect/core/find/explicitSelectors.js
(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  function tryExplicitSelectors(cfgIn, qsDeep, allowInputOnly, L) {
    const hasInputSel = !!cfgIn.inputSel;
    const hasSubmitSel = !!cfgIn.submitSel;
    if (!hasInputSel && !hasSubmitSel) return null;

    const input = hasInputSel ? qsDeep(cfgIn.inputSel) : null;
    const send = hasSubmitSel ? qsDeep(cfgIn.submitSel) : null;

    (L.info || L.log)?.("detect: explicit selectors", {
      input: !!input,
      send: !!send,
      inputSel: cfgIn.inputSel || null,
      submitSel: cfgIn.submitSel || null,
    });

    if (input && send) return { input, send };
    if (allowInputOnly && input && !send) return { input, send: null };
    return null;
  }

  AP.detectCoreExplicit = { tryExplicitSelectors };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/core/find/scanLoop.js");

/* ===== core/detect/core/find/scanLoop.js ===== */
(function(){var __AP_MOD="/core/detect/core/find/scanLoop.js";try{
// /usr/local/bin/node
// ./core/detect/core/find/scanLoop.js
(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  async function scanLoop(ctx, signal) {
    const t0 = Date.now();
    while (Date.now() - t0 < ctx.detectMs) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      let last = await ctx.scanOnceAcrossRoots(ctx.probe, signal);

      if (last.input && last.send) {
        (ctx.logger.info || ctx.logger.log)?.("detect: composer found", {
          ms: Date.now() - t0,
          pollMs: ctx.pollMs,
          detectMs: ctx.detectMs,
          sendReady: ctx.isSendReady(last.send),
        });
        return last;
      }

      if (last.input && !last.send) {
        if (ctx.allowInputOnly) return { input: last.input, send: null };
        const gotText = await ctx.waitForNonEmpty(
          last.input,
          Math.min(1500, ctx.pollMs + 600)
        );
        if (gotText) {
          last = await ctx.scanOnceAcrossRoots(ctx.probe, signal);
          if (last && last.input && last.send) {
            (ctx.logger.info || ctx.logger.log)?.(
              "detect: composer found after content"
            );
            return last;
          }
        }
      }

      if (ctx.verbose && (Date.now() - t0) % 600 < ctx.pollMs) {
        (ctx.logger.debug || ctx.logger.info)?.("detect: still searching…", {
          ms: Date.now() - t0,
          pollMs: ctx.pollMs,
        });
      }

      await ctx.sleep(ctx.pollMs, signal);
    }
    return null;
  }

  AP.detectCoreScanLoop = { scanLoop };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/core/find/findComposer.js");

/* ===== core/detect/core/find/findComposer.js ===== */
(function(){var __AP_MOD="/core/detect/core/find/findComposer.js";try{
// ./core/detect/core/find/findComposer.js
// VERSION: detect-findComposer/2.0.0

(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const cfg = AP.detectCoreConfig || {};
  const { logger, getFlags, getSelectors, getHelpers } = cfg;

  const L =
    (logger &&
      logger({
        component: "detect",
        file: "core/runtime/detect/core/findComposer.js",
      })) ||
    console;

  const log = {
    debug: (...a) => (L.debug || L.log).apply(L, a),
    info: (...a) => (L.info || L.log).apply(L, a),
    warn: (...a) => (L.warn || L.log).apply(L, a),
    error: (...a) => (L.error || L.log).apply(L, a),
  };
  const cp = (tag, extra) => {
    try {
      AP.boot?.cp?.("detect:find:" + tag, {
        ver: "detect-findComposer/2.0.0",
        ...(extra || {}),
      });
    } catch {}
  };

  const FLAGS = (getFlags && getFlags()) || {
    detectTimeoutMs: null,
    pollMs: 120,
    verboseDetect: false,
    logWinningSelector: false,
  };

  const SEL = (getSelectors && getSelectors()) || {
    SEND_SELECTORS: [],
    INPUT_SELECTORS: [],
    isSendReady: () => true,
  };

  const HELP = (getHelpers && getHelpers()) || {
    qsDeep: (s, r) => (r || document).querySelector(s),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
  };

  function readLsAllow() {
    try {
      return localStorage.getItem("ap_detect_input_only") === "1";
    } catch {
      return false;
    }
  }

  async function findComposer(cfgIn = {}, signal) {
    const t0 = performance.now();

    const detectMs =
      FLAGS.detectTimeoutMs ??
      (Number(cfgIn.detectTimeoutMs) > 0
        ? Number(cfgIn.detectTimeoutMs)
        : 7000);

    const pollMs = Math.max(
      60,
      Math.min(240, FLAGS.pollMs || Number(cfgIn.pollMs) || 120)
    );

    const lsAllow = readLsAllow();
    const allowInputOnly =
      cfgIn.allowInputOnly === true ||
      (cfgIn.allowInputOnly === undefined && lsAllow);

    cp("enter", { url: location.href, detectMs, pollMs, allowInputOnly });

    const { qsDeep, sleep } = HELP;

    // 1) Try explicit selectors
    try {
      const explicit =
        AP.detectCoreExplicit &&
        AP.detectCoreExplicit.tryExplicitSelectors &&
        AP.detectCoreExplicit.tryExplicitSelectors(
          cfgIn,
          qsDeep,
          allowInputOnly,
          L
        );
      if (explicit && (explicit.input || explicit.send)) {
        log.info("[detect-core] explicit selectors:hit", {
          hasInput: !!explicit.input,
          hasSend: !!explicit.send,
          allowInputOnly,
          ms: Math.round(performance.now() - t0),
        });
        cp("explicit:hit", { input: !!explicit.input, send: !!explicit.send });
        return explicit;
      }
      log.debug("[detect-core] explicit selectors:miss");
      cp("explicit:miss");
    } catch (e) {
      log.warn("[detect-core] explicit selectors:error", { err: String(e) });
      cp("explicit:error", { err: String(e?.message || e) });
    }

    // 2) Try registry strategy (async)
    if (AP.detectCoreRegistry && AP.detectCoreRegistry.tryRegistry) {
      const tR = performance.now();
      try {
        const r = await AP.detectCoreRegistry.tryRegistry(
          cfgIn,
          signal,
          allowInputOnly,
          L
        );
        if (r && (r.input || r.send)) {
          log.info("[detect-core] registry:hit", {
            hasInput: !!r.input,
            hasSend: !!r.send,
            allowInputOnly,
            ms: Math.round(performance.now() - tR),
          });
          cp("registry:hit", { input: !!r.input, send: !!r.send });
          return r;
        }
        log.debug("[detect-core] registry:miss", {
          ms: Math.round(performance.now() - tR),
        });
        cp("registry:miss");
      } catch (e) {
        log.warn("[detect-core] registry:error", {
          err: String(e),
          ms: Math.round(performance.now() - tR),
        });
        cp("registry:error", { err: String(e?.message || e) });
      }
    }

    // 3) Resolve probe impl (detectProbe or fallback)
    const resolveProbe =
      (AP.detectCoreProbeResolve && AP.detectCoreProbeResolve.resolveProbe) ||
      function () {
        if (AP.detectProbe && typeof AP.detectProbe.tryOnce === "function")
          return AP.detectProbe;
        if (
          AP.detectCoreProbeFallback &&
          typeof AP.detectCoreProbeFallback.tryOnce === "function"
        )
          return AP.detectCoreProbeFallback;
        return { tryOnce: async () => ({ input: null, send: null }) };
      };

    const probe = resolveProbe();
    cp("probe:resolved", { hasTryOnce: !!(probe && probe.tryOnce) });

    // 4) Scan once across candidate roots
    const scanOnceAcrossRoots =
      (AP.detectCoreRootsScan && AP.detectCoreRootsScan.scanOnceAcrossRoots) ||
      (async (p, s) => {
        if (s?.aborted) throw new DOMException("Aborted", "AbortError");
        return p.tryOnce(document);
      });

    // 5) Optional waiter for non-empty input (used by some strategies)
    const waitForNonEmpty =
      (AP.detectCoreWaiters && AP.detectCoreWaiters.waitForNonEmpty) ||
      (async () => false);

    // 6) Optional runLoop (comprehensive scan)
    const runLoop =
      (AP.detectCoreScanLoop && AP.detectCoreScanLoop.scanLoop) || null;

    if (typeof runLoop === "function") {
      const tL = performance.now();
      try {
        const found = await runLoop(
          {
            detectMs,
            pollMs,
            allowInputOnly,
            isSendReady: SEL.isSendReady,
            scanOnceAcrossRoots,
            probe,
            waitForNonEmpty,
            sleep,
            verbose: !!FLAGS.verboseDetect,
            logger: L,
          },
          signal
        );
        if (found) {
          log.info("[detect-core] loop:hit", {
            hasInput: !!found.input,
            hasSend: !!found.send,
            allowInputOnly,
            ms: Math.round(performance.now() - tL),
          });
          cp("loop:hit", { input: !!found.input, send: !!found.send });
          return found;
        }
        log.debug("[detect-core] loop:miss", {
          ms: Math.round(performance.now() - tL),
        });
        cp("loop:miss");
      } catch (e) {
        log.warn("[detect-core] loop:error", {
          err: String(e),
          ms: Math.round(performance.now() - tL),
        });
        cp("loop:error", { err: String(e?.message || e) });
      }
    }

    const makeHints =
      (AP.detectCoreHints && AP.detectCoreHints.makeHints) ||
      function (s) {
        return {
          inputSel: (s.INPUT_SELECTORS || []).slice(0, 3),
          sendSel: (s.SEND_SELECTORS || []).slice(0, 3),
          tip: "Send may enable after typing; set localStorage['ap_detect_input_only']='1' to allow input-only.",
        };
      };

    // Fallback: if we can at least see an input, return it quietly (no warn).
    try {
      const inputs = SEL.INPUT_SELECTORS || [];
      for (let i = 0; i < inputs.length; i++) {
        const el = qsDeep(inputs[i]);
        if (el) {
          log.info("[detect-core] input-only (no Send yet)", {
            url: location.href,
            allowInputOnly,
            totalMs: Math.round(performance.now() - t0),
          });
          cp("input-only", { selector: inputs[i] });
          return { input: el, send: null };
        }
      }
    } catch (e) {
      log.debug("[detect-core] input-only check:error", { err: String(e) });
      cp("input-only:error", { err: String(e?.message || e) });
    }

    // Nothing visible at all → genuine miss.
    const out = { input: null, send: null };
    log.warn("[detect-core] composer not found", {
      url: location.href,
      hints: makeHints(SEL),
      allowInputOnly,
      totalMs: Math.round(performance.now() - t0),
    });
    cp("miss", { allowInputOnly, tookMs: Math.round(performance.now() - t0) });
    return out;
  }

  AP.detectCoreFind = {
    findComposer,
    isSendReady: SEL.isSendReady,
    __v: "detect-findComposer/2.0.0",
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/core/hints/hints.js");

/* ===== core/detect/core/hints/hints.js ===== */
(function(){var __AP_MOD="/core/detect/core/hints/hints.js";try{
// /usr/local/bin/node
// ./core/detect/core/hints/hints.js
(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  function makeHints(SEL) {
    return {
      inputSel: (SEL.INPUT_SELECTORS || []).slice(0, 3),
      sendSel: (SEL.SEND_SELECTORS || []).slice(0, 3),
      tip: "Send may enable after typing; set localStorage['ap_detect_input_only']='1' to allow input-only.",
    };
  }

  AP.detectCoreHints = { makeHints };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/core/waiters/waiters.js");

/* ===== core/detect/core/waiters/waiters.js ===== */
(function(){var __AP_MOD="/core/detect/core/waiters/waiters.js";try{
// /usr/local/bin/node
// ./core/detect/core/waiters/waiters.js
(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  async function waitForNonEmpty(inputEl, ms = 1200) {
    if (!inputEl) return false;
    return new Promise((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          obs.disconnect();
          resolve(false);
        }
      }, Math.max(100, Number(ms) || 1200));

      const obs = new MutationObserver(() => {
        const hasText = (inputEl.textContent || "").trim().length > 0;
        if (hasText && !done) {
          done = true;
          clearTimeout(timer);
          obs.disconnect();
          resolve(true);
        }
      });

      obs.observe(inputEl, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    });
  }

  AP.detectCoreWaiters = { waitForNonEmpty };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/core/sanity/sanity.js");

/* ===== core/detect/core/sanity/sanity.js ===== */
(function(){var __AP_MOD="/core/detect/core/sanity/sanity.js";try{
// /usr/local/bin/node
// ./core/detect/core/sanity/sanity.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.detectCoreSanity) return;

  const { logger, getSelectors, getFlags } = AP.detectCoreConfig || {};
  const L =
    (logger &&
      logger({
        component: "detect",
        file: "core/runtime/detect/core/sanity.js",
      })) ||
    console;

  function toArray(x) {
    return Array.isArray(x) ? x : [];
  }

  function uniq(arr) {
    return Array.from(new Set(arr));
  }

  function sample(arr, n = 3) {
    return toArray(arr).slice(0, n);
  }

  function cssHasSupported() {
    try {
      return !!(
        window.CSS &&
        CSS.supports &&
        CSS.supports("selector(:has(*))")
      );
    } catch {
      return false;
    }
  }

  function run() {
    const S = (getSelectors && getSelectors()) || {};
    const F = (getFlags && getFlags()) || {};

    const issues = [];

    // --- Selectors: presence & types ---
    const send = toArray(S.SEND_SELECTORS);
    const input = toArray(S.INPUT_SELECTORS);

    if (send.length === 0) {
      issues.push({
        level: "error",
        code: "SEND_EMPTY",
        message: "SEND_SELECTORS is empty",
      });
    }
    if (input.length === 0) {
      issues.push({
        level: "error",
        code: "INPUT_EMPTY",
        message: "INPUT_SELECTORS is empty",
      });
    }

    const nonStringSend = send.filter((s) => typeof s !== "string");
    const nonStringInput = input.filter((s) => typeof s !== "string");
    if (nonStringSend.length) {
      issues.push({
        level: "error",
        code: "SEND_NON_STRING",
        message: "SEND_SELECTORS contains non-string entries",
        meta: { count: nonStringSend.length, samples: sample(nonStringSend) },
      });
    }
    if (nonStringInput.length) {
      issues.push({
        level: "error",
        code: "INPUT_NON_STRING",
        message: "INPUT_SELECTORS contains non-string entries",
        meta: { count: nonStringInput.length, samples: sample(nonStringInput) },
      });
    }

    // Duplicate selectors can cause wasted work / noisy logs
    const dupSend = send.filter((s, i) => send.indexOf(s) !== i);
    if (dupSend.length) {
      issues.push({
        level: "warn",
        code: "SEND_DUPLICATES",
        message: "Duplicate selectors in SEND_SELECTORS",
        meta: {
          unique: uniq(send).length,
          total: send.length,
          samples: sample(dupSend),
        },
        fix: "De-duplicate SEND_SELECTORS during construction.",
      });
    }

    const dupInput = input.filter((s, i) => input.indexOf(s) !== i);
    if (dupInput.length) {
      issues.push({
        level: "warn",
        code: "INPUT_DUPLICATES",
        message: "Duplicate selectors in INPUT_SELECTORS",
        meta: {
          unique: uniq(input).length,
          total: input.length,
          samples: sample(dupInput),
        },
        fix: "De-duplicate INPUT_SELECTORS during construction.",
      });
    }

    // isSendReady
    if (typeof S.isSendReady !== "function") {
      issues.push({
        level: "error",
        code: "SENDREADY_TYPE",
        message: "isSendReady is not a function",
        fix: "Export a function isSendReady(btn): boolean.",
      });
    }

    // --- Flags: ranges & shapes ---
    const timeoutMs = F.detectTimeoutMs;
    if (timeoutMs != null && Number(timeoutMs) < 500) {
      issues.push({
        level: "warn",
        code: "TIMEOUT_LOW",
        message: "detectTimeoutMs is suspiciously low",
        meta: { detectTimeoutMs: Number(timeoutMs) },
        fix: "Use >= 700ms or null to apply default.",
      });
    }

    const pollMs = Number(F.pollMs);
    if (!(pollMs >= 60 && pollMs <= 240)) {
      issues.push({
        level: "warn",
        code: "POLL_RANGE",
        message: "pollMs is outside the recommended range [60..240]ms",
        meta: { pollMs },
        fix: "Clamp to [60..240] to avoid excessive CPU or sluggish detection.",
      });
    }

    if (typeof F.verboseDetect !== "boolean") {
      issues.push({
        level: "info",
        code: "VERBOSE_SHAPE",
        message: "verboseDetect should be a boolean",
        meta: { verboseDetect: F.verboseDetect },
        fix: "Ensure detectFlags.verboseDetect is strictly true/false.",
      });
    }

    // --- Environment notes (non-fatal) ---
    const hasHas = cssHasSupported();
    if (!hasHas) {
      issues.push({
        level: "info",
        code: "CSS_HAS_UNSUPPORTED",
        message:
          ":has() selector not supported; heuristic fallbacks will be used",
      });
    }

    // iframe scanning toggle (if roots module available)
    let iframesEnabled = null;
    try {
      if (
        AP.detectRoots &&
        typeof AP.detectRoots.getIframesEnabled === "function"
      ) {
        iframesEnabled = !!AP.detectRoots.getIframesEnabled();
      }
    } catch {}
    if (iframesEnabled === false) {
      issues.push({
        level: "info",
        code: "IFRAME_SCAN_DISABLED",
        message:
          "Iframe scanning is disabled; detection will ignore same-origin frames",
        fix: "Set localStorage['ap_detect_iframes']='1' to enable.",
      });
    }

    // High-level summary log
    (L.info || L.log)?.("detect sanity", {
      sendSelectors: send.length,
      inputSelectors: input.length,
      timeoutMs: timeoutMs ?? "(default)",
      pollMs: F.pollMs,
      verbose: !!F.verboseDetect,
      cssHas: hasHas,
      issues,
      samples: {
        send: sample(send),
        input: sample(input),
      },
    });

    return issues;
  }

  // Optional legacy wrapper if some older code expects an array of strings.
  function runLegacy() {
    const issues = run();
    return issues.map((i) => `${i.level.toUpperCase()}: ${i.message}`);
  }

  AP.detectCoreSanity = { run, runLegacy };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/probe.js");

/* ===== core/detect/probe.js ===== */
(function(){var __AP_MOD="/core/detect/probe.js";try{
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L = (AP._log || { with: () => console }).with({
    component: "detect",
    file: "core/runtime/detect/probe.js",
  });

  const FLAGS = AP.detectFlags || {};
  const DS = AP.detectSelectors || {};
  const SEND_SELECTORS = DS.SEND_SELECTORS || [];
  const INPUT_SELECTORS = DS.INPUT_SELECTORS || [];
  const isSendReady = DS.isSendReady || AP.detect?.isSendReady || (() => true);

  const qsDeep =
    AP.domQuery && typeof AP.domQuery.qsDeep === "function"
      ? AP.domQuery.qsDeep
      : (sel, r) => (r || document).querySelector(sel);

  const isVisible =
    (AP.dom && typeof AP.dom.isVisible === "function" && AP.dom.isVisible) ||
    function (el) {
      try {
        if (!el || !el.ownerDocument) return false;
        const cs = el.ownerDocument.defaultView?.getComputedStyle?.(el);
        if (!cs) return !!el.getClientRects?.().length;
        if (cs.display === "none" || cs.visibility === "hidden") return false;
        const r = el.getBoundingClientRect?.();
        if (r) return r.width > 0 && r.height > 0;
        return !!el.offsetParent || !!el.parentElement;
      } catch {
        return false;
      }
    };

  function pickFirst(selectors, root) {
    for (const sel of selectors || []) {
      try {
        const el = qsDeep(sel, root || document);
        if (el && isVisible(el)) return { el, sel };
      } catch (e) {
        if (FLAGS.verboseDetect)
          (L.warn || L.log).call(L, "bad selector", { sel, err: String(e) });
      }
    }
    return { el: null, sel: null };
  }

  function nearestScope(node) {
    if (!node?.closest) return document;
    return (
      node.closest("form,[role='main'],main,[data-testid],[role],.composer") ||
      document
    );
  }

  async function tryOnce(scope) {
    const root = scope || document;
    let { el: sendBtn, sel: sendSel } = pickFirst(SEND_SELECTORS, root);
    let { el: inputEl, sel: inputSel } = { el: null, sel: null };

    if (!sendBtn) {
      ({ el: inputEl, sel: inputSel } = pickFirst(INPUT_SELECTORS, root));
      if (inputEl) {
        const sc = nearestScope(inputEl);
        ({ el: sendBtn, sel: sendSel } = pickFirst(SEND_SELECTORS, sc));
        if (!sendBtn) {
          ({ el: sendBtn, sel: sendSel } = pickFirst(SEND_SELECTORS, document));
        }
      }
    } else {
      const sc = nearestScope(sendBtn);
      ({ el: inputEl, sel: inputSel } = pickFirst(INPUT_SELECTORS, sc));
      if (!inputEl) {
        ({ el: inputEl, sel: inputSel } = pickFirst(INPUT_SELECTORS, document));
      }
    }

    if (FLAGS.verboseDetect) {
      const dbg = {
        url: location.pathname,
        inputSeen: !!inputEl,
        sendSeen: !!sendBtn,
        sendReady: !!isSendReady(sendBtn),
      };
      if (FLAGS.logWinningSelector) {
        dbg.winInputSel = inputSel || null;
        dbg.winSendSel = sendSel || null;
      }
      (L.debug || L.info || L.log).call(L, "probe", dbg);
    }
    return { input: inputEl || null, send: sendBtn || null };
  }

  // Public API
  AP.detectProbe = { tryOnce, firstMatchSelector: (s, r) => pickFirst(s, r) };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/index.js");

/* ===== core/detect/index.js ===== */
(function(){var __AP_MOD="/core/detect/index.js";try{
// ./auto-prompter/core/runtime/detect/index.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  const L =
    (AP._log && AP._log.with
      ? AP._log.with({
          component: "detect",
          file: "core/runtime/detect/index.js",
        })
      : AP.logger) || console;

  const log = {
    debug: (...a) => (L.debug || L.log).apply(L, a),
    info: (...a) => (L.info || L.log).apply(L, a),
    warn: (...a) => (L.warn || L.log).apply(L, a),
    error: (...a) => (L.error || L.log).apply(L, a),
  };

  // Eager, safe surface so callers never explode while detect wires up
  if (!AP.composerDetect) {
    AP.composerDetect = {
      isSendReady: () => true,
      // returns {input:null, send:null} until real wiring happens
      findComposer: async () => ({ input: null, send: null }),
      _tryOnce: async () => ({ input: null, send: null }),
    };
  }

  // Wrap a finder into a strict "orFail" API with better semantics + telemetry
  function _makeFindComposerOrFail(fn) {
    return async function findComposerOrFail(opts = {}, signal) {
      const lsAllow =
        (function () {
          try {
            return localStorage.getItem("ap_detect_input_only") === "1";
          } catch {
            return false;
          }
        })() || false;

      // Allow cfg to override LS; default to LS when undefined
      const allowInputOnly = Object.prototype.hasOwnProperty.call(
        opts,
        "allowInputOnly"
      )
        ? !!opts.allowInputOnly
        : lsAllow;

      const t0 = performance.now();
      log.info("[detect] findComposerOrFail:start", {
        url: location.href,
        allowInputOnly,
        source:
          Object.prototype.hasOwnProperty.call(opts, "allowInputOnly") &&
          opts.allowInputOnly !== undefined
            ? "cfg"
            : lsAllow
            ? "localStorage"
            : "default:false",
      });

      try {
        const res = await (typeof fn === "function"
          ? fn({ ...opts, allowInputOnly }, signal)
          : AP.composerDetect.findComposer(
              { ...opts, allowInputOnly },
              signal
            ));

        const hasInput = !!(res && res.input);
        const hasSend = !!(res && res.send);

        // Require at least one; require send unless allowInputOnly is set
        if (!hasInput && !hasSend) {
          const err = new Error("composer not found");
          err.code = "COMPOSER_NOT_FOUND";
          err.meta = { url: location.href, opts: { allowInputOnly } };
          throw err;
        }
        if (!hasSend && !allowInputOnly) {
          const err = new Error("send control not found");
          err.code = "SEND_NOT_FOUND";
          err.meta = { url: location.href, opts: { allowInputOnly } };
          throw err;
        }

        log.info("[detect] findComposerOrFail:ok", {
          ms: Math.round(performance.now() - t0),
          hasInput,
          hasSend,
          allowInputOnly,
        });
        return res;
      } catch (e) {
        // Normalize AbortError vs other errors
        if (e && (e.name === "AbortError" || e.code === "ABORT_ERR")) {
          log.warn("[detect] findComposerOrFail:aborted", {
            ms: Math.round(performance.now() - t0),
          });
          throw e;
        }
        log.error("[detect] findComposerOrFail:error", {
          ms: Math.round(performance.now() - t0),
          code: e && (e.code || e.name),
          err: String(e && e.message ? e.message : e),
          allowInputOnly,
        });
        throw e;
      }
    };
  }

  // ------- robust global export helpers (multi-realm) -------
  function defineHardenedGlobal(target, name, value) {
    try {
      const desc = Object.getOwnPropertyDescriptor(target, name);
      // If already defined & non-configurable, never try to overwrite
      if (desc && desc.configurable === false) {
        // Only log if it's a different function reference
        if (desc.value !== value) {
          log.warn("global already defined & locked", { name });
        }
        return true;
      }
      // Define non-configurable, non-writable to avoid clobber
      Object.defineProperty(target, name, {
        value,
        enumerable: false,
        configurable: false,
        writable: false,
      });
      return true;
    } catch (e) {
      // fall back to plain assignment if defineProperty fails (some proxies)
      try {
        target[name] = value;
        return true;
      } catch (e2) {
        (L.warn || L.log)?.("failed setting global", {
          name,
          err: String(e2 || e),
        });
        return false;
      }
    }
  }

  function exposeEverywhere(name, fn) {
    const contexts = [];
    const gw = (typeof window !== "undefined" && window) || undefined;
    const gtw = (typeof globalThis !== "undefined" && globalThis) || undefined;
    // Tampermonkey/Greasemonkey bridge when available
    /* eslint-disable no-undef */
    const uw =
      typeof unsafeWindow !== "undefined" && unsafeWindow ? unsafeWindow : null;
    /* eslint-enable no-undef */

    if (gw) contexts.push(gw);
    if (gtw && gtw !== gw) contexts.push(gtw);
    if (uw && uw !== gw && uw !== gtw) contexts.push(uw);

    let okAny = false;
    for (const ctx of contexts) {
      if (!ctx) continue;
      okAny = defineHardenedGlobal(ctx, name, fn) || okAny;
    }
    return okAny;
  }
  // ----------------------------------------------------------

  // Ensure namespaced symbols exist immediately
  AP.Core = AP.Core || {};
  if (typeof AP.Core.findComposerOrFail !== "function") {
    AP.Core.findComposerOrFail = _makeFindComposerOrFail(
      AP.composerDetect.findComposer
    );
  }
  if (typeof AP.findComposerOrFail !== "function") {
    AP.findComposerOrFail = AP.Core.findComposerOrFail;
  }
  // Also mirror on glue for some callers that look there
  AP.glue = AP.glue || {};
  AP.glue.findComposerOrFail = AP.Core.findComposerOrFail;

  // *** GLOBAL ALIAS (multi-realm) ***
  const exposedNow = exposeEverywhere(
    "findComposerOrFail",
    AP.Core.findComposerOrFail
  );
  if (exposedNow) {
    log.info("global findComposerOrFail exposed", {
      where: "window/globalThis/unsafeWindow",
    });
  }

  // Optional sanity run when verbose
  try {
    if (AP.detectFlags && AP.detectFlags.verboseDetect) {
      const sanity = AP.detectCoreSanity || { run: () => [] };
      sanity.run();
    }
  } catch (e) {
    log.warn("detect sanity run failed", { err: String(e) });
  }

  // Late-binding loop: wait up to ~5s for detectCoreFind/registry, then wire
  const MAX_MS =
    Number(localStorage.getItem("ap_detect_bind_max_ms") || "") || 5000;
  const STEP_MS = 120;
  const t0 = Date.now();

  (function bindLoop() {
    if (AP.composerDetect && AP.composerDetect.__wired__) {
      log.debug("bindLoop: already wired");
      return;
    }

    const fromRegistry =
      AP.detectRegistry && typeof AP.detectRegistry.detect === "function";
    const findApi = AP.detectCoreFind || {};
    const haveFind = typeof findApi.findComposer === "function";

    if (fromRegistry || haveFind) {
      const findComposer = fromRegistry
        ? AP.detectRegistry.detect
        : findApi.findComposer;

      const isSendReady =
        (typeof findApi.isSendReady === "function" && findApi.isSendReady) ||
        (typeof (AP.detectSelectors || {}).isSendReady === "function" &&
          (AP.detectSelectors || {}).isSendReady) ||
        (() => true);

      const tryOnce =
        (AP.detectProbe && AP.detectProbe.tryOnce) ||
        (AP.detectShimProbe && AP.detectShimProbe.tryOnce) ||
        (AP.detectCoreProbeFallback && AP.detectCoreProbeFallback.tryOnce) ||
        (async () => ({ input: null, send: null }));

      AP.composerDetect = {
        isSendReady,
        findComposer,
        _tryOnce: tryOnce,
        __wired__: true,
      };

      // Rebind public + global symbols to the final implementation
      try {
        AP.Core.findComposerOrFail = _makeFindComposerOrFail(findComposer);
        AP.findComposerOrFail = AP.Core.findComposerOrFail;
        AP.glue.findComposerOrFail = AP.Core.findComposerOrFail;
        exposeEverywhere("findComposerOrFail", AP.Core.findComposerOrFail);
      } catch (e) {
        log.warn("failed to wire findComposerOrFail", { err: String(e) });
      }

      log.info("detect wired", {
        via: fromRegistry ? "registry" : "core",
        ms: Date.now() - t0,
      });
      return;
    }

    const dt = Date.now() - t0;
    if (dt < MAX_MS) {
      if (dt === 0 || dt % 1000 < STEP_MS) {
        log.debug("bindLoop: waiting...", { dt, MAX_MS });
      }
      setTimeout(bindLoop, STEP_MS);
    } else {
      log.error("detect init timed out; findComposer still missing", {
        waitedMs: dt,
      });
    }
  })();
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/shim/flags.js");

/* ===== core/detect/shim/flags.js ===== */
(function(){var __AP_MOD="/core/detect/shim/flags.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/detect/shim/flags.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.detectShimFlags) return;

  const FLAGS = {
    detectTimeoutMs:
      Number(localStorage.getItem("ap_detect_timeout_ms") || "") || null,
    verboseDetect: localStorage.getItem("ap_verbose_detect") === "1",
    logWinningSelector: localStorage.getItem("ap_detect_log_selector") === "1",
    pollMs: Math.max(
      60,
      Math.min(240, Number(localStorage.getItem("ap_detect_poll_ms") || 120))
    ),
  };

  AP.detectShimFlags = FLAGS;
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/shim/helpers.js");

/* ===== core/detect/shim/helpers.js ===== */
(function(){var __AP_MOD="/core/detect/shim/helpers.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/detect/shim/helpers.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.detectShimHelpers) return;

  const L =
    (AP._log && AP._log.with
      ? AP._log.with({
          component: "detect",
          file: "core/runtime/detect/shim/helpers.js",
        })
      : AP.logger) || console;

  function ensure(name, val) {
    if (!val) {
      try {
        (L.error || L.warn)?.(`[detect-shim] missing helper: ${name}`);
      } catch {}
      return null;
    }
    return val;
  }

  const qsDeep =
    (AP.dom && AP.dom.qsDeep) ||
    ((sel, root) => (root || document).querySelector(sel));
  const sleep =
    (AP.dom && AP.dom.sleep) ||
    ((ms, signal) =>
      new Promise((resolve, reject) => {
        const t = setTimeout(resolve, ms);
        if (signal) {
          const onAbort = () => {
            clearTimeout(t);
            reject(new DOMException("Aborted", "AbortError"));
          };
          signal.aborted
            ? onAbort()
            : signal.addEventListener("abort", onAbort, { once: true });
        }
      }));

  function findDeep(selector, root) {
    try {
      return qsDeep(selector, root);
    } catch (e) {
      try {
        (L.warn || L.log)?.("findDeep selector error", {
          selector,
          err: String(e),
        });
      } catch {}
      return null;
    }
  }

  function closestScope(node) {
    if (!node) return document;
    const rn = node.getRootNode && node.getRootNode();
    return rn || document;
  }

  function isSendReady(btn) {
    if (!btn) return false;
    const s = getComputedStyle(btn);
    const disabled =
      btn.hasAttribute("disabled") ||
      btn.getAttribute("aria-disabled") === "true";
    const hidden =
      s.display === "none" || s.visibility === "hidden" || s.opacity === "0";
    return !disabled && !hidden;
  }

  AP.detectShimHelpers = {
    ensure,
    findDeep,
    qsDeep,
    closestScope,
    isSendReady,
    sleep,
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/shim/index.js");

/* ===== core/detect/shim/index.js ===== */
(function(){var __AP_MOD="/core/detect/shim/index.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/detect/shim/index.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  if (AP.composerDetect && typeof AP.composerDetect.findComposer === "function")
    return;

  const L =
    (AP._log && AP._log.with
      ? AP._log.with({
          component: "detect",
          file: "core/runtime/detect/shim/index.js",
        })
      : AP.logger) || console;

  const FLAGS = AP.detectShimFlags || {};
  const { qsDeep, isSendReady, sleep } = AP.detectShimHelpers || {};
  const { tryOnce } = AP.detectShimProbe || {};

  async function findComposer(cfg = {}, signal) {
    const detectMs =
      FLAGS.detectTimeoutMs ??
      (Number(cfg.detectTimeoutMs) > 0 ? Number(cfg.detectTimeoutMs) : 7000);
    const pollMs = FLAGS.pollMs || 120;
    const t0 = Date.now();
    let last = { input: null, send: null };

    if (cfg.inputSel || cfg.submitSel) {
      const input = cfg.inputSel ? qsDeep(cfg.inputSel) : null;
      const send = cfg.submitSel ? qsDeep(cfg.submitSel) : null;
      (L.info || L.log)?.("explicit selectors", {
        input: !!input,
        send: !!send,
        inputSel: cfg.inputSel || null,
        submitSel: cfg.submitSel || null,
      });
      if (input && send) return { input, send };
    }

    while (Date.now() - t0 < detectMs) {
      if (signal?.aborted) {
        (L.warn || L.log)?.("findComposer aborted", { ms: Date.now() - t0 });
        throw new DOMException("Aborted", "AbortError");
      }
      last = await tryOnce(document);
      if (last.input && last.send) {
        (L.info || L.log)?.("composer found", {
          ms: Date.now() - t0,
          sendReady: isSendReady(last.send),
        });
        return last;
      }
      if (FLAGS.verboseDetect && (Date.now() - t0) % 600 < pollMs) {
        (L.debug || L.info)?.("still searching…", {
          ms: Date.now() - t0,
          inputSeen: !!last.input,
          sendSeen: !!last.send,
        });
      }
      await sleep(pollMs, signal);
    }

    const H = AP.detectSelectors || {};
    (L.warn || L.log)?.("composer not found", {
      url: location.href,
      ms: Date.now() - t0,
      inputSeen: !!last.input,
      sendSeen: !!last.send,
      hints: {
        inputSel: (H.INPUT_SELECTORS || []).slice(0, 3),
        sendSel: (H.SEND_SELECTORS || []).slice(0, 3),
      },
    });
    return { input: null, send: null };
  }

  AP.composerDetect = {
    isSendReady: isSendReady,
    findComposer,
    _tryOnce: tryOnce,
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/shim/probe.js");

/* ===== core/detect/shim/probe.js ===== */
(function(){var __AP_MOD="/core/detect/shim/probe.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/detect/shim/probe.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.detectShimProbe) return;

  const L =
    (AP._log && AP._log.with
      ? AP._log.with({
          component: "detect",
          file: "core/runtime/detect/shim/probe.js",
        })
      : AP.logger) || console;

  const FLAGS = AP.detectShimFlags || {};
  const { findDeep, closestScope, isSendReady } = AP.detectShimHelpers || {};

  // If core util is loaded, use it for consistency.
  const coreFirstMatch =
    (AP.detectCoreProbeUtil && AP.detectCoreProbeUtil.firstMatchSelector) ||
    null;

  function firstMatchSelector(selectors, root, finder) {
    if (typeof coreFirstMatch === "function") {
      return coreFirstMatch(selectors, root, finder);
    }
    const f = finder || ((sel, r) => (r || document).querySelector(sel));
    const V =
      (AP.detectCoreProbeUtil && AP.detectCoreProbeUtil.isVisible) || null;

    for (const sel of selectors || []) {
      try {
        const el = f(sel, root);
        if (el) {
          if (!V || V(el)) return { el, sel };
          if (FLAGS.verboseDetect)
            (L.warn || L.log)?.("skipping invisible match", { sel });
        }
      } catch (e) {
        if (FLAGS.verboseDetect)
          (L.warn || L.log)?.("bad selector", { sel, err: String(e) });
      }
    }
    return { el: null, sel: null };
  }

  async function tryOnce(scope) {
    const root = scope || document;

    const SEND_SELECTORS = (AP.detectSelectors &&
      AP.detectSelectors.SEND_SELECTORS) ||
      window.SEND_SELECTORS || [
        "[data-testid='send-button']",
        "#composer-submit-button",
        "form button[type='submit']",
      ];

    const INPUT_SELECTORS = (AP.detectSelectors &&
      AP.detectSelectors.INPUT_SELECTORS) ||
      window.INPUT_SELECTORS || [
        "[contenteditable='true']",
        "textarea",
        "input[type='text']",
      ];

    let sendBtn, sendSel, inputEl, inputSel;

    ({ el: sendBtn, sel: sendSel } = firstMatchSelector(
      SEND_SELECTORS,
      root,
      findDeep
    ));

    if (!sendBtn) {
      ({ el: inputEl, sel: inputSel } = firstMatchSelector(
        INPUT_SELECTORS,
        root,
        findDeep
      ));
      if (inputEl) {
        const sc = closestScope(inputEl);
        ({ el: sendBtn, sel: sendSel } = firstMatchSelector(
          SEND_SELECTORS,
          sc,
          findDeep
        ));
        if (!sendBtn) {
          ({ el: sendBtn, sel: sendSel } = firstMatchSelector(
            SEND_SELECTORS,
            document,
            findDeep
          ));
        }
      }
    } else {
      const sc = closestScope(sendBtn);
      ({ el: inputEl, sel: inputSel } = firstMatchSelector(
        INPUT_SELECTORS,
        sc,
        findDeep
      ));
      if (!inputEl) {
        ({ el: inputEl, sel: inputSel } = firstMatchSelector(
          INPUT_SELECTORS,
          document,
          findDeep
        ));
      }
    }

    if (FLAGS.verboseDetect) {
      const dbg = {
        url: location.pathname,
        inputSeen: !!inputEl,
        sendSeen: !!sendBtn,
        sendReady: isSendReady && isSendReady(sendBtn),
      };
      if (FLAGS.logWinningSelector) {
        dbg.winInputSel = inputSel || null;
        dbg.winSendSel = sendSel || null;
      }
      (L.debug || L.info)?.("probe", dbg);
    }
    return { input: inputEl || null, send: sendBtn || null };
  }

  AP.detectShimProbe = { tryOnce };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/context.js");

/* ===== core/engine/context.js ===== */
(function(){var __AP_MOD="/core/engine/context.js";try{
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  // Use a consistent starting index across all code paths.
  // (Other fallbacks assume -1 before the first bump.)
  let runCtx = { index: -1, lastSendAt: 0, controller: null };

  function getCtx() {
    return runCtx;
  }

  function resetRun() {
    runCtx = { index: -1, lastSendAt: 0, controller: null };
  }

  function setLastSend(ts) {
    const n = Number(ts);
    if (!Number.isFinite(n)) return;
    runCtx.lastSendAt = n;
  }

  function bumpIndex() {
    runCtx.index += 1;
  }

  AP.engineCtx = { getCtx, resetRun, setLastSend, bumpIndex };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/retries.js");

/* ===== core/engine/retries.js ===== */
(function(){var __AP_MOD="/core/engine/retries.js";try{
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L = (AP._log || { with: () => console }).with({
    component: "engine",
    file: "core/runtime/engine/retries.js",
  });

  const sleep =
    (AP.dom && AP.dom.sleep) ||
    ((ms, signal) =>
      new Promise((resolve, reject) => {
        const t = setTimeout(resolve, Math.max(0, ms | 0));
        if (signal) {
          const onAbort = () => {
            clearTimeout(t);
            reject(new DOMException("Aborted", "AbortError"));
          };
          signal.aborted
            ? onAbort()
            : signal.addEventListener("abort", onAbort, { once: true });
        }
      }));

  async function withRetries(fn, tries = 3, baseDelay = 250, signal, label) {
    const nTries = Math.max(1, tries | 0);
    const base = Math.max(1, baseDelay | 0);
    let lastErr;
    for (let a = 0; a < nTries; a++) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        L.warn("retryable error", {
          attempt: a + 1,
          of: nTries,
          label: label || null,
          error: String(e?.message || e),
        });
        const jitter = Math.floor(Math.random() * 60);
        await sleep(base * Math.pow(2, a) + jitter, signal);
      }
    }
    L.error("exhausted retries", {
      tries: nTries,
      label: label || null,
      error: String(lastErr?.message || lastErr),
    });
    throw lastErr;
  }

  async function enforceMinInterval(lastTs, minMs, signal) {
    const last = Number(lastTs) || 0;
    const min = Math.max(0, Number(minMs) || 0);
    const delta = Date.now() - last;
    if (delta < min) await sleep(min - delta, signal);
  }

  AP.engineRetry = { withRetries, enforceMinInterval, sleep };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/find/global-proxy.js");

/* ===== core/engine/find/global-proxy.js ===== */
(function(){var __AP_MOD="/core/engine/find/global-proxy.js";try{
// ./auto-prompter/core/engine/find/global-proxy.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L = (AP._log || { with: () => console }).with({
    component: "engine",
    file: "core/engine/find/global-proxy.js",
  });
  const log = {
    debug: (...a) => (L.debug || L.log).apply(L, a),
    info: (...a) => (L.info || L.log).apply(L, a),
    warn: (...a) => (L.warn || L.log).apply(L, a),
  };

  AP.__impls = AP.__impls || {};
  if (typeof AP.__impls.findComposerOrFailImpl !== "function") {
    AP.__impls.findComposerOrFailImpl = async function () {
      const err = new Error("findComposerOrFail impl not set");
      err.code = "IMPL_NOT_SET";
      throw err;
    };
  }

  function proxyFindComposerOrFail(/* cfg, signal */) {
    // eslint-disable-next-line prefer-rest-params
    return AP.__impls.findComposerOrFailImpl.apply(null, arguments);
  }

  function exposeOnce(name, fn) {
    const targets = [];
    const gw = typeof window !== "undefined" ? window : undefined;
    const gtw = typeof globalThis !== "undefined" ? globalThis : undefined;
    // eslint-disable-next-line no-undef
    const uw =
      typeof unsafeWindow !== "undefined" && unsafeWindow ? unsafeWindow : null;

    if (gw) targets.push(gw);
    if (gtw && gtw !== gw) targets.push(gtw);
    if (uw && uw !== gw && uw !== gtw) targets.push(uw);

    for (const t of targets) {
      try {
        const desc = Object.getOwnPropertyDescriptor(t, name);
        if (!desc) {
          Object.defineProperty(t, name, {
            value: fn,
            enumerable: false,
            configurable: false,
            writable: true,
          });
        }
      } catch (e) {
        log.warn("exposeOnce failed", { name, err: String(e) });
      }
    }
    AP.Core = AP.Core || {};
    AP.glue = AP.glue || {};
    AP.Core.findComposerOrFail = fn;
    AP.glue.findComposerOrFail = fn;
  }

  exposeOnce("findComposerOrFail", proxyFindComposerOrFail);

  AP.__setFindComposerOrFailImpl = function setFindImpl(fn) {
    AP.__impls.findComposerOrFailImpl = fn;
  };

  AP.debug = AP.debug || {};
  AP.debug.dumpFindState = function () {
    let dW, dG, dU;
    try {
      dW = Object.getOwnPropertyDescriptor(window, "findComposerOrFail");
    } catch {}
    try {
      dG = Object.getOwnPropertyDescriptor(globalThis, "findComposerOrFail");
    } catch {}
    try {
      // eslint-disable-next-line no-undef
      dU =
        typeof unsafeWindow !== "undefined"
          ? Object.getOwnPropertyDescriptor(unsafeWindow, "findComposerOrFail")
          : undefined;
    } catch {}
    console.group("[AP debug] dumpFindState");
    console.log("descriptors", {
      window: dW,
      globalThis: dG,
      unsafeWindow: dU,
    });
    console.log("implType", typeof AP.__impls.findComposerOrFailImpl);
    console.groupEnd();
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/find/utils.js");

/* ===== core/engine/find/utils.js ===== */
(function(){var __AP_MOD="/core/engine/find/utils.js";try{
// ./auto-prompter/core/engine/find/utils.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L = (AP._log || { with: () => console }).with({
    component: "engine",
    file: "core/engine/find/utils.js",
  });

  const sleep =
    (AP.engineRetry && AP.engineRetry.sleep) ||
    ((ms, signal) =>
      new Promise((resolve, reject) => {
        const t = setTimeout(resolve, Math.max(0, ms | 0));
        if (signal) {
          const onAbort = () => {
            clearTimeout(t);
            reject(new DOMException("Aborted", "AbortError"));
          };
          signal.aborted
            ? onAbort()
            : signal.addEventListener("abort", onAbort, { once: true });
        }
      }));

  function qAll(doc, selectors) {
    const out = [];
    for (const sel of selectors || []) {
      try {
        const nodes = doc.querySelectorAll(sel);
        if (nodes && nodes.length) out.push({ sel, nodes: Array.from(nodes) });
      } catch (e) {
        (L.debug || L.log)("qAll selector error", { sel, err: String(e) });
      }
    }
    return out;
  }

  function sameOriginDocs() {
    const docs = [document];
    document.querySelectorAll("iframe").forEach((f) => {
      try {
        if (f.contentDocument) docs.push(f.contentDocument);
      } catch {}
    });
    return docs;
  }

  function isVisible(el) {
    if (!el) return false;
    const win = el.ownerDocument && el.ownerDocument.defaultView;
    const s = win ? win.getComputedStyle(el) : null;
    if (!s) return true;
    if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0")
      return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function findSubmitNear(el) {
    try {
      const form = el.closest && el.closest("form");
      if (!form) return null;
      const candidates = form.querySelectorAll(
        'button[type="submit"], [data-testid="send-button"], button[aria-label="Send"], button[aria-label="Send message"], button[aria-label="Send prompt"], [data-testid="composer-send"], [data-testid="composer:send"]'
      );
      for (const b of candidates) if (isVisible(b)) return b;
    } catch {}
    return null;
  }

  AP.engineFind = AP.engineFind || {};
  AP.engineFind.utils = {
    sleep,
    qAll,
    sameOriginDocs,
    isVisible,
    findSubmitNear,
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/find/utils.dictate.js");

/* ===== core/engine/find/utils.dictate.js ===== */
(function(){var __AP_MOD="/core/engine/find/utils.dictate.js";try{
// ./auto-prompter/core/engine/find/utils.dictate.js
// VERSION: engine-utils-dictate/1.4.0

(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L = (AP._log || { with: () => console }).with({
    component: "engine",
    file: "core/engine/find/utils.dictate.js",
    version: "engine-utils-dictate/1.4.0",
  });
  const log = {
    info: (...a) => (L.info || L.log).apply(L, a),
    warn: (...a) => (L.warn || L.log).apply(L, a),
    debug: (...a) => (L.debug || L.log).apply(L, a),
  };
  const cp = (tag, extra) => {
    try {
      AP.boot?.cp?.("dictUtils:" + tag, {
        ver: "engine-utils-dictate/1.4.0",
        ...(extra || {}),
      });
    } catch {}
  };

  const U = (AP.engineFind && AP.engineFind.utils) || {};
  const { sameOriginDocs, isVisible } = U;

  // Candidates for the mic button (based on snippet + fallbacks)
  const MIC_SELECTORS = [
    "button[aria-label='Dictate button']",
    ".composer-btn[aria-label='Dictate button']",
    "button[aria-label*='Dictat']",
    "button:has(svg.icon)",
  ];

  function _q(doc, sel) {
    try {
      return doc.querySelector(sel);
    } catch {
      return null;
    }
  }

  function _findMicInDoc(doc) {
    for (const sel of MIC_SELECTORS) {
      const n = _q(doc, sel);
      if (n && (!isVisible || isVisible(n))) return n;
    }
    return null;
  }

  // Find a dictate button, preferring one near the composer input
  function findDictateNear(input) {
    cp("findMic:enter");
    try {
      const root =
        input?.closest?.(
          "form, [data-testid='composer'], .composer, .composer-root"
        ) ||
        input?.ownerDocument ||
        document;

      if (root) {
        const near = MIC_SELECTORS.map((s) => {
          try {
            return root.querySelector(s);
          } catch {
            return null;
          }
        }).find(Boolean);
        if (near && (!isVisible || isVisible(near))) {
          cp("findMic:near");
          return near;
        }
      }
    } catch {}
    try {
      const docs =
        typeof sameOriginDocs === "function" ? sameOriginDocs() : [document];
      for (const d of docs) {
        const n = _findMicInDoc(d);
        if (n) {
          cp("findMic:global");
          return n;
        }
      }
    } catch {}
    cp("findMic:miss");
    return null;
  }

  // Heuristic to detect recording state on the mic button
  function isMicActive(micBtn) {
    if (!micBtn) return false;
    try {
      const containerState =
        micBtn.closest &&
        micBtn.closest("[data-state]")?.getAttribute("data-state");
      if (containerState && String(containerState).toLowerCase() === "open")
        return true;
    } catch {}
    try {
      const pressed =
        micBtn.getAttribute && micBtn.getAttribute("aria-pressed");
      if (pressed && String(pressed).toLowerCase() === "true") return true;
    } catch {}
    try {
      const cls = micBtn.className || "";
      if (/\b(record|listening|active)\b/i.test(String(cls))) return true;
    } catch {}
    return false;
  }

  function clickMic(btn) {
    if (!btn) return false;
    try {
      btn.click();
      log.info("[dictation] mic clicked");
      cp("clickMic:ok");
      return true;
    } catch (e) {
      log.warn("[dictation] mic click failed", { err: String(e) });
      cp("clickMic:error", { err: String(e?.message || e) });
      return false;
    }
  }

  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(resolve, Math.max(0, ms | 0));
      if (signal) {
        const onAbort = () => {
          clearTimeout(t);
          reject(new DOMException("Aborted", "AbortError"));
        };
        signal.aborted
          ? onAbort()
          : signal.addEventListener("abort", onAbort, { once: true });
      }
    });
  }

  async function captureToTextarea({
    textarea,
    shadowRoot,
    timeoutMs = 180000,
  }) {
    cp("capture:start");
    if (!textarea) throw new Error("captureToTextarea: textarea required");

    const Deps = AP.msgParts?.deps?.getDeps ? AP.msgParts.deps.getDeps() : null;
    const getTextSnapshot = AP.msgParts?.focus?.getTextSnapshot || null;
    if (!Deps || !getTextSnapshot) {
      cp("capture:deps-missing");
      throw new Error(
        "captureToTextarea: engine deps not available (deps.getDeps / focus.getTextSnapshot)"
      );
    }
    const { findComposerOrFail, waitUntilIdle, setInputValue } = Deps;

    const found = await findComposerOrFail({ allowInputOnly: true });
    const input = (found && (found.input || found)) || null;
    if (!input) {
      cp("capture:no-input");
      throw new Error("captureToTextarea: composer input not found");
    }

    const mic = findDictateNear(input);
    if (mic && !isMicActive(mic)) {
      clickMic(mic);
      cp("capture:mic-clicked");
    }

    const t0 = Date.now();
    let sawActive = false;
    for (let i = 0; i < 30; i++) {
      if (!mic) break;
      if (isMicActive(mic)) {
        sawActive = true;
        break;
      }
      await sleep(120);
    }

    if (mic && sawActive) {
      while (isMicActive(mic)) {
        if (Date.now() - t0 > timeoutMs) break;
        await sleep(150);
      }
      cp("capture:mic-stop");
    } else {
      await sleep(220);
    }

    try {
      await waitUntilIdle(null, 8000, 120);
    } catch {}
    cp("capture:idle-ok");

    const captured = String(getTextSnapshot(input) || "").trim();

    try {
      textarea.value = captured;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true }));
      cp("capture:textarea:wrote", { len: captured.length });
    } catch {}

    try {
      await setInputValue(input, "");
      await sleep(80);
      cp("capture:composer:cleared");
    } catch (e) {
      log.warn("[dictation] failed to clear composer", { err: String(e) });
      try {
        if ("value" in input) input.value = "";
        else if (input.isContentEditable) input.innerHTML = "";
      } catch {}
      cp("capture:composer:clear-fallback");
    }

    log.info("[dictation] captured to step textarea", {
      len: captured.length,
      empty: !captured,
    });
    cp("capture:done", { len: captured.length });
    return captured;
  }

  AP.engineFind = AP.engineFind || {};
  AP.engineFind.utils = Object.assign({}, AP.engineFind.utils || {}, {
    findDictateNear,
  });

  AP.dictation = AP.dictation || {};
  AP.dictation.clickMic = clickMic;
  AP.dictation.findButton = function () {
    try {
      const det = AP.composerDetect?.findComposer || null;
      if (typeof det === "function") {
        try {
          const r = det({ allowInputOnly: true });
          const input = (r && r.input) || r || null;
          const b = input ? findDictateNear(input) : null;
          if (b) return b;
        } catch {}
      }
      return findDictateNear(null);
    } catch {
      return null;
    }
  };

  AP.dictation.captureToTextarea = captureToTextarea;
  log.info("[dictation] helper ready (engine-utils-dictate/1.4.0)");
  cp("ready");
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/find/probe.js");

/* ===== core/engine/find/probe.js ===== */
(function(){var __AP_MOD="/core/engine/find/probe.js";try{
// ./auto-prompter/core/engine/find/probe.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const { qAll, isVisible, findSubmitNear } =
    (AP.engineFind && AP.engineFind.utils) || {};

  function probe(doc) {
    const SEL = (AP.detectSelectors = AP.detectSelectors || {});

    const INPUT_FALLBACK = [
      "#prompt-textarea",
      "textarea#prompt-textarea",
      '#prompt-textarea.ProseMirror[contenteditable="true"]',
      'div[role="textbox"][contenteditable="true"]',
      'div[data-testid="prompt-textarea"] [contenteditable="true"]',
      'textarea[data-id="prompt-textarea"]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"][data-gramm="false"]',
      'div[contenteditable="true"]',
    ];
    const SEND_FALLBACK = [
      '[data-testid="send-button"]',
      'form [data-testid="send-button"]',
      '[data-testid="composer-send"]',
      '[data-testid="composer:send"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label="Send message"]',
      'button[aria-label="Send"]',
      'form button[type="submit"]',
      'button[type="submit"]',
      'button:has(svg[aria-label="Send"])',
    ];

    const inputSel =
      Array.isArray(SEL.INPUT_SELECTORS) && SEL.INPUT_SELECTORS.length
        ? SEL.INPUT_SELECTORS
        : INPUT_FALLBACK;
    const sendSel =
      Array.isArray(SEL.SEND_SELECTORS) && SEL.SEND_SELECTORS.length
        ? SEL.SEND_SELECTORS
        : SEND_FALLBACK;

    const inputHits = qAll(doc, inputSel)
      .flatMap((h) => h.nodes)
      .filter(isVisible);
    const sendHits = qAll(doc, sendSel)
      .flatMap((h) => h.nodes)
      .filter(isVisible);

    let input = inputHits[0] || null;
    let send = sendHits[0] || null;

    if (input && !send) {
      const near = findSubmitNear(input);
      if (near) send = near;
    }

    const diag = {
      inputCount: inputHits.length,
      sendCount: sendHits.length,
      title: doc.title || "",
      url:
        (doc.defaultView &&
          doc.defaultView.location &&
          doc.defaultView.location.href) ||
        "",
    };
    return { input, send, diag };
  }

  AP.engineFind = AP.engineFind || {};
  AP.engineFind.probe = { probe };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/find/allow.js");

/* ===== core/engine/find/allow.js ===== */
(function(){var __AP_MOD="/core/engine/find/allow.js";try{
// ./auto-prompter/core/engine/find/allow.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  /**
   * Decide whether the find step can succeed with ONLY an input (no send yet).
   * Priority:
   *   1) explicit cfg.allowInputOnly
   *   2) localStorage ap_detect_input_only ("1" | "true")
   *   3) implicit heuristics for prime/probe phases
   *   4) default: false (strict)
   */
  function deriveAllowInputOnly(cfg = {}) {
    if (Object.prototype.hasOwnProperty.call(cfg, "allowInputOnly")) {
      return !!cfg.allowInputOnly;
    }
    try {
      const v = localStorage.getItem("ap_detect_input_only");
      if (v === "1" || v === "true") return true;
    } catch {}

    // Heuristics: allow input-only when we're just priming/probing,
    // or the caller explicitly says send isn't required *yet*.
    if (
      cfg.phase === "probe" ||
      cfg.prime === true ||
      cfg.sendRequired === false
    ) {
      return true;
    }

    // Otherwise, require a send control.
    return false;
  }

  AP.engineFind = AP.engineFind || {};
  AP.engineFind.allow = { deriveAllowInputOnly };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/find/once.js");

/* ===== core/engine/find/once.js ===== */
(function(){var __AP_MOD="/core/engine/find/once.js";try{
// ./auto-prompter/core/engine/find/once.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L = (AP._log || { with: () => console }).with({
    component: "engine",
    file: "core/engine/find/once.js",
  });
  const log = {
    info: (...a) => (L.info || L.log).apply(L, a),
    warn: (...a) => (L.warn || L.log).apply(L, a),
    debug: (...a) => (L.debug || L.log).apply(L, a),
  };

  const { sameOriginDocs } = (AP.engineFind && AP.engineFind.utils) || {};
  const { probe } = (AP.engineFind && AP.engineFind.probe) || {};
  const { deriveAllowInputOnly } = (AP.engineFind && AP.engineFind.allow) || {};

  async function findOnce(cfg, signal) {
    const allowInputOnly = deriveAllowInputOnly(cfg);
    const det = AP.composerDetect || {};

    // Runtime kill-switch: force fallback probing if detector is flaky
    const disableDet = (function () {
      try {
        return localStorage.getItem("ap_disable_detector") === "1";
      } catch {
        return false;
      }
    })();

    if (!disableDet && typeof det.findComposer === "function") {
      try {
        const r = await det.findComposer({ ...cfg, allowInputOnly }, signal);
        if (r && r.input && (r.send || allowInputOnly)) {
          log.info("[find] hit via detector", { allowInputOnly });
          return { found: r, via: "detector" };
        }
      } catch (e) {
        log.warn("[find] detector error", { error: String(e?.message || e) });
      }
    }

    for (const doc of sameOriginDocs()) {
      const { input, send, diag } = probe(doc);
      if (input && (send || allowInputOnly)) {
        log.info("[find] hit via fallback", { diag, allowInputOnly });
        return { found: { input, send }, via: "fallback", diag };
      }
      if (diag.inputCount || diag.sendCount) {
        log.debug("[find] partial signals", { diag, allowInputOnly });
      }
    }
    return { found: null, via: "none" };
  }

  AP.engineFind = AP.engineFind || {};
  AP.engineFind.once = { findOnce };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/find/orFail.js");

/* ===== core/engine/find/orFail.js ===== */
(function(){var __AP_MOD="/core/engine/find/orFail.js";try{
// ./auto-prompter/core/engine/find/orFail.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L = (AP._log || { with: () => console }).with({
    component: "engine",
    file: "core/engine/find/orFail.js",
  });
  const log = {
    info: (...a) => (L.info || L.log).apply(L, a),
    warn: (...a) => (L.warn || L.log).apply(L, a),
  };

  const { sleep } = (AP.engineFind && AP.engineFind.utils) || {};
  const { findOnce } = (AP.engineFind && AP.engineFind.once) || {};
  const { deriveAllowInputOnly } = (AP.engineFind && AP.engineFind.allow) || {};

  async function findComposerOrFail(cfg = {}, signal) {
    const tMax =
      Number(cfg.detectTimeoutMs) > 0 ? Number(cfg.detectTimeoutMs) : 9000;
    const t0 = Date.now();
    const defaultAllow = deriveAllowInputOnly(cfg);

    log.info("[find] orFail:start", {
      tMax,
      defaultAllow,
      allowSource: Object.prototype.hasOwnProperty.call(cfg, "allowInputOnly")
        ? "cfg"
        : (function () {
            try {
              return localStorage.getItem("ap_detect_input_only") === "1"
                ? "localStorage"
                : "default:false";
            } catch {
              return "default:false";
            }
          })(),
    });

    let last = null;
    while (Date.now() - t0 < tMax) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const r = await findOnce(
        { ...cfg, allowInputOnly: defaultAllow },
        signal
      );
      last = r;
      if (r.found && r.found.input && (r.found.send || defaultAllow)) {
        log.info("[find] orFail:ok", {
          ms: Date.now() - t0,
          via: r.via,
          hasSend: !!r.found.send,
        });
        return r.found;
      }
      await sleep(140, signal);
    }

    const diag = last && last.diag ? last.diag : { via: last?.via || "none" };
    log.warn("[find] orFail:timeout", {
      allowInputOnly: !!defaultAllow,
      timeoutMs: tMax,
      diag,
    });
    const err = new Error(
      `composer not found allowInputOnly=${!!defaultAllow} via=${
        diag.via || "none"
      }`
    );
    err.code = "COMPOSER_NOT_FOUND";
    err.meta = { allowInputOnly: !!defaultAllow, diag, timeoutMs: tMax };
    throw err;
  }

  AP.engineStepsParts = AP.engineStepsParts || {};
  AP.engineStepsParts.findComposerOrFail = findComposerOrFail;

  try {
    AP.__setFindComposerOrFailImpl &&
      AP.__setFindComposerOrFailImpl(findComposerOrFail);
  } catch {}
  AP.engineFind = AP.engineFind || {};
  AP.engineFind.orFail = { findComposerOrFail };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/find/index.js");

/* ===== core/engine/find/index.js ===== */
(function(){var __AP_MOD="/core/engine/find/index.js";try{
// ./auto-prompter/core/engine/find/index.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.engineFind = AP.engineFind || {};
  if (!(AP.engineStepsParts || {}).findComposerOrFail && AP.engineFind.orFail) {
    AP.engineStepsParts = AP.engineStepsParts || {};
    AP.engineStepsParts.findComposerOrFail =
      AP.engineFind.orFail.findComposerOrFail;
  }
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/steps.execute.js");

/* ===== core/engine/steps.execute.js ===== */
(function(){var __AP_MOD="/core/engine/steps.execute.js";try{
// ./auto-prompter/core/runtime/engine/steps.execute.js
(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L = (AP._log || { with: () => console }).with({
    component: "engine",
    file: "core/runtime/engine/steps.execute.js",
  });

  function getHandler(type) {
    const parts = AP.engineStepHandlersParts || {};
    // Merge all registered handler groups (e.g., basic, msg) plus any ad-hoc handlers.
    const pool = Object.assign(
      {},
      parts.basic || {},
      parts.msg || {},
      AP.engineStepHandlers || {}
    );
    return pool[type];
  }

  async function executeStep(step, cfg = {}, signal) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const fn = getHandler(step.type);
    if (!fn) {
      L.warn("unknown step type", { type: step?.type });
      return;
    }
    return fn(step, cfg, signal);
  }

  // Expose
  AP.engineStepsParts = AP.engineStepsParts || {};
  AP.engineStepsParts.executeStep = executeStep;

  // Optional: keep a flat map for external consumers
  AP.engineStepHandlers = AP.engineStepHandlers || {};
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/steps.handlers.basic.js");

/* ===== core/engine/steps.handlers.basic.js ===== */
(function(){var __AP_MOD="/core/engine/steps.handlers.basic.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/engine/steps.handlers.basic.js
(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L = (AP._log || { with: () => console }).with({
    component: "engine",
    file: "core/engine/steps.handlers.basic.js",
  });

  const Retry = AP.engineRetry || {};
  const sleep =
    Retry.sleep ||
    ((ms, signal) =>
      new Promise((resolve, reject) => {
        const t = setTimeout(resolve, Math.max(0, ms | 0));
        if (signal) {
          const onAbort = () => {
            clearTimeout(t);
            reject(new DOMException("Aborted", "AbortError"));
          };
          signal.aborted
            ? onAbort()
            : signal.addEventListener("abort", onAbort, { once: true });
        }
      }));

  function need(name, fn) {
    if (!fn) throw new Error(`${name} not available`);
    return fn;
  }

  function getWaiters() {
    const wait = AP.waiters || {};
    return {
      waitForVisible: need("waitForVisible", wait.waitForVisible),
      waitForGone: need("waitForGone", wait.waitForGone),
      waitForText: need("waitForText", wait.waitForText),
    };
  }

  async function pause(step, _cfg, signal) {
    L.info("pause", { ms: step.ms });
    return sleep(step.ms, signal);
  }

  async function until(step, _cfg, signal) {
    const { waitForVisible } = getWaiters();
    const t = step.timeout || 15000;
    L.info("until", { selector: step.selector, timeoutMs: t });
    const el = await waitForVisible(step.selector, t, 200, signal);
    if (!el) L.warn("until timeout", { selector: step.selector });
  }

  async function untilGone(step, _cfg, signal) {
    const { waitForGone } = getWaiters();
    const t = step.timeout || 15000;
    L.info("until-gone", { selector: step.selector, timeoutMs: t });
    const ok = await waitForGone(step.selector, t, 200, signal);
    if (!ok) L.warn("until-gone timeout", { selector: step.selector });
  }

  async function untilText(step, _cfg, signal) {
    const { waitForText } = getWaiters();
    const t = step.timeout || 15000;
    L.info("until-text", {
      selector: step.selector,
      text: step.text,
      timeoutMs: t,
    });
    const ok = await waitForText(step.selector, step.text, t, 200, signal);
    if (!ok) L.warn("until-text timeout", { selector: step.selector });
  }

  async function click(step) {
    L.info("click", { selector: step.selector });
    const el = document.querySelector(step.selector);
    if (el) el.click();
    else L.warn("click not found", { selector: step.selector });
  }

  AP.engineStepHandlersParts = AP.engineStepHandlersParts || {};
  AP.engineStepHandlersParts.basic = {
    pause,
    until,
    untilGone,
    untilText,
    click,
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/msg/utils.js");

/* ===== core/engine/msg/utils.js ===== */
(function(){var __AP_MOD="/core/engine/msg/utils.js";try{
// ./auto-prompter/core/engine/msg/utils.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  const Retry = AP.engineRetry || {};

  const withRetries =
    Retry.withRetries ||
    (async (fn) => {
      return await fn();
    });

  // AbortSignal-aware sleep (parity with retries.js)
  const sleep =
    Retry.sleep ||
    ((ms, signal) =>
      new Promise((resolve, reject) => {
        const t = setTimeout(resolve, Math.max(0, ms | 0));
        if (signal) {
          const onAbort = () => {
            clearTimeout(t);
            reject(new DOMException("Aborted", "AbortError"));
          };
          signal.aborted
            ? onAbort()
            : signal.addEventListener("abort", onAbort, { once: true });
        }
      }));

  const enforceMinInterval =
    Retry.enforceMinInterval ||
    (async (lastAt, ms, signal) => {
      const wait = Math.max(
        0,
        (Number(ms) || 0) - (Date.now() - (lastAt || 0))
      );
      if (wait > 0) await sleep(wait, signal);
    });

  AP.msgParts = AP.msgParts || {};
  AP.msgParts.utils = { withRetries, sleep, enforceMinInterval };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/msg/context.js");

/* ===== core/engine/msg/context.js ===== */
(function(){var __AP_MOD="/core/engine/msg/context.js";try{
// ./auto-prompter/core/engine/msg/context.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const Ctx = AP.engineCtx || {};

  const bumpIndex =
    Ctx.bumpIndex ||
    function () {
      (AP.__ctx = AP.__ctx || { index: -1 }).index++;
    };

  const getCtx =
    Ctx.getCtx ||
    function () {
      return (AP.__ctx = AP.__ctx || { index: -1, lastSendAt: 0 });
    };

  const setLastSend =
    Ctx.setLastSend ||
    function (ts) {
      (AP.__ctx = AP.__ctx || {}).lastSendAt = ts;
    };

  AP.msgParts = AP.msgParts || {};
  AP.msgParts.context = { bumpIndex, getCtx, setLastSend };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/idle/constants.js");

/* ===== core/engine/idle/constants.js ===== */
(function(){var __AP_MOD="/core/engine/idle/constants.js";try{
// ./auto-prompter/core/engine/idle/constants.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.engineIdle = AP.engineIdle || {};

  // Heuristics for “model is still generating”
  const DEFAULT_STOP_SELECTORS = [
    "[data-testid='stop-button']",
    "button[aria-label='Stop generating']",
    "button:has(svg[aria-label='Stop'])",
  ];

  const STREAMING_HINTS = [
    "[data-state='loading']",
    "[data-state='streaming']",
    "[data-testid='result-streaming']",
    ".result-streaming",
    "[aria-busy='true']",
    "[data-animated='true']",
    "[data-typing='true']",
  ];

  AP.engineIdle.constants = {
    DEFAULT_STOP_SELECTORS,
    STREAMING_HINTS,
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/idle/dom.js");

/* ===== core/engine/idle/dom.js ===== */
(function(){var __AP_MOD="/core/engine/idle/dom.js";try{
// ./auto-prompter/core/engine/idle/dom.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.engineIdle = AP.engineIdle || {};

  function $(sel, root) {
    try {
      return (root || document).querySelector(sel);
    } catch {
      return null;
    }
  }
  function any(selectors, root) {
    for (const s of selectors) if ($(s, root)) return true;
    return false;
  }
  function lastAssistantTurnRoot() {
    const candidates = [
      "[data-testid='conversation-turn'][data-role='assistant']",
      "[data-testid='conversation-turn'] [data-message-author-role='assistant']",
      "[data-role='assistant']",
      "[data-author-role='assistant']",
      "article:has([data-message-author-role='assistant'])",
      ".markdown, .prose, .message, .assistant",
    ];
    for (const sel of candidates) {
      const nodes = document.querySelectorAll(sel);
      if (nodes && nodes.length) return nodes[nodes.length - 1];
    }
    return null;
  }
  function textLen(el) {
    if (!el) return 0;
    try {
      const t = (el.innerText || el.textContent || "").trim();
      return t.length;
    } catch {
      return 0;
    }
  }

  AP.engineIdle.dom = { $, any, lastAssistantTurnRoot, textLen };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/idle/state.js");

/* ===== core/engine/idle/state.js ===== */
(function(){var __AP_MOD="/core/engine/idle/state.js";try{
// ./auto-prompter/core/engine/idle/state.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.engineIdle = AP.engineIdle || {};

  // Tracks rolling content growth + stop button “stuck” time
  function createIdleState() {
    return {
      lastLen: -1,
      recentDeltas: [],
      quietSince: 0,
      stopSeenSince: 0,
    };
  }

  function calcAdaptiveQuietMs(avgDelta, base) {
    return Math.min(
      2200,
      avgDelta > 200
        ? Math.max(250, base - 300)
        : avgDelta > 50
        ? base
        : Math.min(2500, base + 400)
    );
  }

  function updateStateAndDecideIdle({
    state,
    stopVisible,
    streaming,
    currentLen,
    quietMsBase,
    stuckStopMs = 6000,
    signal,
    verboseLogger,
  }) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const L = verboseLogger;
    if (state.lastLen >= 0) {
      const d = Math.max(0, currentLen - state.lastLen);
      state.recentDeltas.push(d);
      if (state.recentDeltas.length > 3) state.recentDeltas.shift();
    }
    const contentGrowing = state.lastLen < 0 || currentLen !== state.lastLen;
    if (contentGrowing) {
      state.quietSince = 0;
      if (L)
        (L.debug || L.info)?.("idle: content growing", { len: currentLen });
    }
    state.lastLen = currentLen;

    const avg =
      state.recentDeltas.length > 0
        ? state.recentDeltas.reduce((a, b) => a + b, 0) /
          state.recentDeltas.length
        : 0;
    const adaptiveQuietMs = calcAdaptiveQuietMs(avg, quietMsBase);

    if (stopVisible) {
      if (contentGrowing) state.stopSeenSince = 0;
      else state.stopSeenSince = state.stopSeenSince || Date.now();
    } else {
      state.stopSeenSince = 0;
    }

    // If we still look "active", we're not idle (unless stuck-stop bailout)
    if (stopVisible || streaming || contentGrowing) {
      if (
        stopVisible &&
        !contentGrowing &&
        state.stopSeenSince &&
        Date.now() - state.stopSeenSince > stuckStopMs
      ) {
        if (L) (L.debug || L.info)?.("idle: stuck-stop bailout");
        return { idle: true, adaptiveQuietMs };
      }
      return { idle: false, adaptiveQuietMs };
    }

    // Quiet window satisfied => idle
    if (state.quietSince === 0) state.quietSince = Date.now();
    const idle = Date.now() - state.quietSince >= adaptiveQuietMs;
    if (idle && L)
      (L.debug || L.info)?.("idle: quiet satisfied", { adaptiveQuietMs });

    return { idle, adaptiveQuietMs };
  }

  AP.engineIdle.state = {
    createIdleState,
    updateStateAndDecideIdle,
    calcAdaptiveQuietMs,
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/idle/observer.js");

/* ===== core/engine/idle/observer.js ===== */
(function(){var __AP_MOD="/core/engine/idle/observer.js";try{
// ./auto-prompter/core/engine/idle/observer.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.engineIdle = AP.engineIdle || {};

  /**
   * observeUntil({ tick, timeoutMs, pollMs, throttleMs, signal })
   *
   * Runs `tick()` until it returns true or timeout elapses.
   * - Uses a MutationObserver, but **throttles** callbacks so `tick` runs
   *   at most once per `throttleMs` (defaults to pollMs).
   * - Also keeps a lightweight setInterval poll as a backstop.
   * - Never re-enters `tick` while a run is in progress.
   *
   * This prevents UI stalls during heavy streaming (tons of characterData/DOM updates).
   */
  function observeUntil({
    tick,
    timeoutMs = 180000,
    pollMs = 120,
    throttleMs,
    signal,
  }) {
    const root = document.body || document.documentElement;
    const t0 = Date.now();

    const throttle = Math.max(80, Number(throttleMs || pollMs) || 120);
    let lastRun = 0;
    let scheduled = false;
    let running = false;
    let obs = null;
    let pollTimer = null;

    let resolveFn, rejectFn;
    const doneP = new Promise((res, rej) => {
      resolveFn = res;
      rejectFn = rej;
    });

    function cleanup() {
      try {
        obs && obs.disconnect();
      } catch {}
      obs = null;
      try {
        clearInterval(pollTimer);
      } catch {}
      pollTimer = null;
      scheduled = false;
      running = false;
    }

    function safeTick() {
      if (running) return;
      running = true;
      try {
        if (tick()) {
          cleanup();
          resolveFn(true);
          return;
        }
      } catch (e) {
        cleanup();
        rejectFn(e);
        return;
      } finally {
        running = false;
      }
      // continue waiting
    }

    function schedule() {
      if (scheduled) return;
      scheduled = true;
      const now =
        performance && performance.now ? performance.now() : Date.now();
      const dueIn = Math.max(0, throttle - (now - lastRun));
      setTimeout(() => {
        scheduled = false;
        lastRun =
          performance && performance.now ? performance.now() : Date.now();
        safeTick();
      }, dueIn);
    }

    // --- MutationObserver (throttled) ---------------------------------------
    try {
      const wantChar = (function () {
        try {
          return localStorage.getItem("ap_idle_observer_chars") === "on";
        } catch {
          return false;
        }
      })();

      // We intentionally **do not** observe characterData by default; it’s noisy.
      obs = new MutationObserver(schedule);
      obs.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: wantChar, // opt-in via localStorage if ever needed
      });
    } catch {
      // If observer creation fails, we’ll rely purely on polling.
    }

    // --- Polling backstop ----------------------------------------------------
    pollTimer = setInterval(() => {
      try {
        if (Date.now() - t0 > timeoutMs) {
          cleanup();
          resolveFn(false);
          return;
        }
        schedule();
      } catch {}
    }, Math.max(80, Number(pollMs) || 120));

    // --- Initial check (fast-path) ------------------------------------------
    schedule();

    // --- Abort support -------------------------------------------------------
    if (signal) {
      const onAbort = () => {
        cleanup();
        rejectFn(new DOMException("Aborted", "AbortError"));
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }

    return doneP.finally(cleanup);
  }

  AP.engineIdle.observe = { observeUntil };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/idle/waitUntilIdle.js");

/* ===== core/engine/idle/waitUntilIdle.js ===== */
(function(){var __AP_MOD="/core/engine/idle/waitUntilIdle.js";try{
/* ./auto-prompter/core/engine/idle/waitUntilIdle.js */
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L = (AP._log || { with: () => console }).with({
    component: "engine",
    file: "core/engine/idle/waitUntilIdle.js",
  });

  AP.engineIdle = AP.engineIdle || {};

  // Null-safe constants + DOM helpers with sensible fallbacks
  const _C = (AP.engineIdle && AP.engineIdle.constants) || {};
  const DEFAULT_STOP_SELECTORS = Array.isArray(_C.DEFAULT_STOP_SELECTORS)
    ? _C.DEFAULT_STOP_SELECTORS
    : [];
  const STREAMING_HINTS = Array.isArray(_C.STREAMING_HINTS)
    ? _C.STREAMING_HINTS
    : [];

  const _DOM = (AP.engineIdle && AP.engineIdle.dom) || {};
  const any =
    typeof _DOM.any === "function"
      ? _DOM.any
      : function fallbackAny(selList) {
          try {
            const arr = Array.isArray(selList)
              ? selList
              : selList
              ? [selList]
              : [];
            for (const q of arr) {
              if (!q) continue;
              try {
                if (document.querySelector(q)) return true;
              } catch {}
            }
            return false;
          } catch {
            return false;
          }
        };
  const lastAssistantTurnRoot =
    typeof _DOM.lastAssistantTurnRoot === "function"
      ? _DOM.lastAssistantTurnRoot
      : function () {
          try {
            // Best-effort generic fallback; harmless if not found
            return document.querySelector(
              '[data-message-author-role="assistant"]:last-of-type'
            );
          } catch {
            return null;
          }
        };
  const textLen =
    typeof _DOM.textLen === "function"
      ? _DOM.textLen
      : function (el) {
          try {
            if (!el) return 0;
            const t =
              el.innerText ||
              el.textContent ||
              (el.value ? String(el.value) : "");
            return (t && t.length) || 0;
          } catch {
            return 0;
          }
        };

  const { createIdleState, updateStateAndDecideIdle } =
    AP.engineIdle.state || {};
  const { observeUntil } = AP.engineIdle.observe || {};

  async function waitUntilIdle(
    stopSel,
    timeoutMs = 180000,
    scanMs = 120,
    signal
  ) {
    // Overload: allow a single options object
    if (stopSel && typeof stopSel === "object" && !Array.isArray(stopSel)) {
      const o = stopSel;
      signal = o.signal ?? signal;
      scanMs = o.scanMs ?? o.pollMs ?? scanMs;
      timeoutMs = o.timeoutMs ?? o.maxWaitMs ?? timeoutMs;
      stopSel = o.stopSel ?? o.stopSelectors ?? undefined;
    }

    const stopSelectors = []
      .concat(Array.isArray(stopSel) ? stopSel : stopSel ? [stopSel] : [])
      .concat(DEFAULT_STOP_SELECTORS || []);

    const quietMsBase = Math.max(
      300,
      Math.min(1500, Number(scanMs || 900) + 300)
    );
    const state = createIdleState ? createIdleState() : {};

    const verbose =
      !!(AP.detectFlags && AP.detectFlags.verboseDetect) ||
      !!(AP.engineFlags && AP.engineFlags.verbose);
    const logger = verbose ? L : null;

    function nowIdleTick() {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      const stopVisible = any(stopSelectors);
      const streaming = any(STREAMING_HINTS || []);
      const turn = lastAssistantTurnRoot();
      const len = textLen(turn);

      const decide =
        typeof updateStateAndDecideIdle === "function"
          ? updateStateAndDecideIdle
          : function ({ currentLen }) {
              // Fallback heuristic: if nothing seems to be changing and no stop button is shown, treat as idle.
              return { idle: !streaming && !stopVisible && currentLen >= 0 };
            };

      const { idle } = decide({
        state,
        stopVisible,
        streaming,
        currentLen: len,
        quietMsBase,
        signal,
        verboseLogger: logger,
      });
      return idle;
    }

    // Fast-path
    try {
      if (nowIdleTick()) return true;
    } catch {}

    // Observe + poll
    const ok = await (typeof observeUntil === "function"
      ? observeUntil({
          tick: nowIdleTick,
          timeoutMs,
          pollMs: Math.max(80, Number(scanMs) || 120),
          signal,
        })
      : (async () => {
          // Minimal polling fallback if observeUntil isn’t available
          const t0 =
            typeof performance !== "undefined" ? performance.now() : Date.now();
          while (
            (typeof performance !== "undefined"
              ? performance.now()
              : Date.now()) -
              t0 <
            timeoutMs
          ) {
            try {
              if (nowIdleTick()) return true;
            } catch {}
            await new Promise((r) =>
              setTimeout(r, Math.max(80, Number(scanMs) || 120))
            );
          }
          return false;
        })()
    ).catch((e) => {
      if (e && e.name === "AbortError") throw e;
      (L.warn || L.log)?.("waitUntilIdle error", { err: String(e) });
      return false;
    });

    return !!ok;
  }

  AP.idleWait = AP.idleWait || {};
  AP.idleWait.waitUntilIdle = waitUntilIdle; // authoritative impl
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/msg/deps.js");

/* ===== core/engine/msg/deps.js ===== */
(function(){var __AP_MOD="/core/engine/msg/deps.js";try{
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L = (AP._log || { with: () => console }).with({
    component: "engine",
    file: "core/engine/msg/deps.js",
  });

  function need(name, fn) {
    if (!fn) throw new Error(`${name} not available`);
    return fn;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms | 0)));

  function normalizeMsgText(s) {
    try {
      let t = String(s ?? "");
      t = t.replace(/^\s*msg\s+/i, "");
      const q = t[0];
      if ((q === `"` || q === `'`) && t.endsWith(q)) t = t.slice(1, -1);
      return t;
    } catch {
      return String(s ?? "");
    }
  }

  // --- UI helpers ------------------------------------------------------------
  function _visible(el) {
    try {
      if (!el) return false;
      const s = el.ownerDocument?.defaultView?.getComputedStyle?.(el);
      if (!s) return true;
      if (s.display === "none" || s.visibility === "hidden") return false;
      if (Number(s.opacity) === 0) return false;
      const r = el.getBoundingClientRect?.() || { width: 1, height: 1 };
      return r.width > 0 && r.height > 0;
    } catch {
      return false;
    }
  }

  function _isSendReady(btn) {
    try {
      if (!btn) return false;
      if (AP.detectSelectors?.isSendReady)
        return !!AP.detectSelectors.isSendReady(btn);
      if (AP.composerDetect?.isSendReady)
        return !!AP.composerDetect.isSendReady(btn);

      if (btn.disabled) return false;
      const aria = (btn.getAttribute?.("aria-disabled") || "").toLowerCase();
      if (aria === "true" || aria === "1") return false;
      const ariaHidden = (
        btn.getAttribute?.("aria-hidden") || ""
      ).toLowerCase();
      if (ariaHidden === "true" || ariaHidden === "1") return false;
      if (btn.matches?.("[inert]") || btn.closest?.("[inert]")) return false;
      return _visible(btn);
    } catch {
      return false;
    }
  }

  function _findNearbySend(input) {
    const doc = (input && input.ownerDocument) || document;
    const SEL = (AP.detectSelectors && AP.detectSelectors.SEND_SELECTORS) || [
      "#composer-submit-button",
      "[data-testid='send-button']",
      "[data-testid='composer-send']",
      "[data-testid='composer:send']",
      "button[aria-label='Send prompt']",
      "button[aria-label='Send message']",
      "form button[type='submit']",
      "button:has(svg[aria-label='Send'])",
    ];
    for (const q of SEL) {
      try {
        const n = doc.querySelector(q);
        if (n && _visible(n)) return n;
      } catch {}
    }
    try {
      const form = input?.closest?.("form");
      if (form) {
        const b = form.querySelector("button[type='submit']");
        if (b && _visible(b)) return b;
      }
    } catch {}
    return null;
  }

  // SAFE writer used as final fallback (no global selectAll)
  async function _fallbackSetValue(el, text) {
    if (!el) return false;
    const cp = (tag, extra) => {
      try {
        AP.boot?.cp?.("deps:fallback:" + tag, extra || {});
      } catch {}
    };
    try {
      el.focus?.({ preventScroll: true });
    } catch {}
    const doc = el.ownerDocument || document;

    if ("value" in el) {
      const prev = el.value;
      el.value = String(text ?? "");
      try {
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } catch {}
      cp("plain", { len: (el.value || "").length, changed: prev !== el.value });
      return el.value !== prev || !!String(el.value).trim();
    }

    // Contenteditable path (element-scoped)
    try {
      const range = doc.createRange?.();
      const sel = doc.getSelection?.();
      if (range && sel) {
        range.selectNodeContents(el);
        range.deleteContents();
        sel.removeAllRanges();
        sel.addRange(range);
      }
      try {
        el.dispatchEvent?.(
          new InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            inputType: "insertText",
            data: String(text ?? ""),
          })
        );
      } catch {}
      el.textContent = String(text ?? "");
      try {
        el.dispatchEvent?.(
          new InputEvent("input", {
            bubbles: true,
            inputType: "insertText",
            data: String(text ?? ""),
          })
        );
        el.dispatchEvent?.(new Event("change", { bubbles: true }));
      } catch {}
      const got =
        (el.innerText && String(el.innerText)) ||
        (el.textContent && String(el.textContent)) ||
        "";
      cp("ce:range", { len: got.length });
      return !!got.trim();
    } catch (e) {
      cp("ce:error", { msg: String(e) });
      return false;
    }
  }

  async function _defaultTriggerSend(input, btn) {
    try {
      let target = btn || _findNearbySend(input);
      if (target && _isSendReady(target)) {
        try {
          target.click();
          return true;
        } catch {}
      }
      const el = input;
      const init = {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
      };
      try {
        el?.dispatchEvent(new KeyboardEvent("keydown", init));
      } catch {}
      try {
        el?.dispatchEvent(new KeyboardEvent("keyup", init));
      } catch {}
      try {
        el?.closest?.("form")?.requestSubmit?.();
      } catch {}
      return true;
    } catch (e) {
      (L.warn || L.log).call(L, "[deps] triggerSend fallback error", String(e));
      return false;
    }
  }

  // --- assemble getDeps() ----------------------------------------------------
  function getDeps() {
    const idle = AP.idleWait || {};
    const renderers = AP.renderers || {};

    // 1) safe finders (ignore all args)
    const safe =
      AP.msgParts &&
      AP.msgParts.depsSafeFinders &&
      AP.msgParts.depsSafeFinders.getSafeFinders
        ? AP.msgParts.depsSafeFinders.getSafeFinders()
        : (function fallbackSafe() {
            let findComposerOrFail =
              (AP.engineStepsParts && AP.engineStepsParts.findComposerOrFail) ||
              (AP.Core && AP.Core.findComposerOrFail) ||
              (typeof window !== "undefined" && window.findComposerOrFail) ||
              (typeof globalThis !== "undefined" &&
                globalThis.findComposerOrFail) ||
              null;
            let findComposer =
              (AP.composerDetect && AP.composerDetect.findComposer) ||
              (AP.Core && AP.Core.findComposer) ||
              (typeof window !== "undefined" && window.findComposer) ||
              (typeof globalThis !== "undefined" && globalThis.findComposer) ||
              null;

            const wrap = (fn, name) =>
              typeof fn === "function"
                ? function () {
                    return fn();
                  }
                : function () {
                    throw new Error(`${name} not available`);
                  };

            return {
              findComposer: wrap(findComposer, "findComposer"),
              findComposerOrFail: wrap(
                findComposerOrFail,
                "findComposerOrFail"
              ),
            };
          })();

    // 2) waitForComposerStable
    const waitForComposerStable =
      (AP.msgParts &&
        AP.msgParts.depsWait &&
        AP.msgParts.depsWait.waitForComposerStable) ||
      (function inlineWaiter() {
        return async function (findOrFail, opts = {}) {
          const { waitUntilIdle: wu } = opts;
          const startHref = location.href;
          let input;
          try {
            input = findOrFail();
          } catch {}
          const endAt =
            Date.now() + Math.max(15000, Number(opts.timeoutMs) || 0);

          while (Date.now() < endAt) {
            if (typeof wu === "function") {
              try {
                await wu({ minQuietMs: 350, maxWaitMs: 2000 });
              } catch {}
            } else {
              await sleep(200);
            }
            if (location.href !== startHref) {
              try {
                const fresh = findOrFail();
                if (fresh && fresh.getAttribute) return fresh;
              } catch {}
            } else if (input && input.getAttribute) {
              return input;
            }
          }
          throw new Error("post-send stabilization timeout");
        };
      })();

    // 3) renderText w/ sanitizer
    const rawRenderText = need("renderText", renderers.renderText);
    const renderText = (...args) => normalizeMsgText(rawRenderText(...args));

    // 4) setInputValue (lazy chain)
    const setInputValue = (function lazySetInputValue() {
      return async function setInputValue(
        el,
        text /*, signal ignored for safety */
      ) {
        const S = AP.senders || {};
        const IO = AP.io || {};
        const candidates = [
          { label: "senders.setInputValue", fn: S.setInputValue },
          { label: "senders.setValue", fn: S.setValue },
          { label: "io.setInputValue", fn: IO.setInputValue },
          {
            label: "io.value.setValue",
            fn:
              IO.value && typeof IO.value.setValue === "function"
                ? (node, t) => IO.value.setValue(node, t)
                : null,
          },
          { label: "local._fallbackSetValue", fn: _fallbackSetValue },
        ];
        for (const c of candidates) {
          if (typeof c.fn === "function") {
            try {
              (L.info || L.log).call(L, "[deps] setInputValue via", c.label);
            } catch {}
            return await c.fn(el, text);
          }
        }
        throw new Error("setInputValue not available");
      };
    })();

    // 5) triggerSend (lazy chain) + stabilization
    const triggerSend = (function lazyTriggerSend() {
      return async function triggerSend(input, btn /*, signal ignored */) {
        const S = AP.senders || {};
        const candidates = [
          { label: "senders.triggerSend", fn: S.triggerSend },
          { label: "senders.send", fn: S.send },
          { label: "local._defaultTriggerSend", fn: _defaultTriggerSend },
        ];
        let ok = false;
        for (const c of candidates) {
          if (typeof c.fn === "function") {
            try {
              (L.info || L.log).call(L, "[deps] triggerSend via", c.label);
            } catch {}
            ok = !!(await c.fn(input, btn));
            break;
          }
        }
        if (!ok) throw new Error("triggerSend not available");

        try {
          await waitForComposerStable(safe.findComposerOrFail, {
            timeoutMs: 15000,
            waitUntilIdle: idle?.waitUntilIdle,
          });
          AP.boot?.cp?.("deps:postSendBarrier:ok");
        } catch (e) {
          AP.boot?.cp?.("deps:postSendBarrier:warn", {
            msg: e?.message || String(e),
          });
        }
        return true;
      };
    })();

    return {
      renderText,
      setInputValue: need("setInputValue", setInputValue),
      triggerSend: need("triggerSend", triggerSend),
      waitUntilIdle: need("waitUntilIdle", idle.waitUntilIdle),
      findComposer: safe.findComposer,
      findComposerOrFail: safe.findComposerOrFail,
      postSendBarrier: (opts) =>
        waitForComposerStable(safe.findComposerOrFail, {
          waitUntilIdle: idle.waitUntilIdle,
          ...(opts || {}),
        }),
    };
  }

  AP.msgParts = AP.msgParts || {};
  AP.msgParts.deps = { need, getDeps };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/msg/helpers.focus.js");

/* ===== core/engine/msg/helpers.focus.js ===== */
(function(){var __AP_MOD="/core/engine/msg/helpers.focus.js";try{
// ./auto-prompter/core/engine/msg/helpers.focus.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  function ensureFocus(el) {
    if (!el) return;
    try {
      el.focus({ preventScroll: true });
    } catch {}
    try {
      el.click();
    } catch {}
    try {
      if (el.isContentEditable) {
        const doc = el.ownerDocument || document;
        const sel = doc.getSelection && doc.getSelection();
        if (sel) {
          const r = doc.createRange();
          r.selectNodeContents(el);
          r.collapse(false);
          sel.removeAllRanges();
          sel.addRange(r);
        }
      }
    } catch {}
  }

  function getTextSnapshot(el) {
    if (!el) return "";
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      return el.value || "";
    }
    if (el.isContentEditable) {
      return el.innerText || el.textContent || "";
    }
    return el.value || el.textContent || "";
  }

  AP.msgParts = AP.msgParts || {};
  AP.msgParts.focus = { ensureFocus, getTextSnapshot };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/msg/helpers.prime.js");

/* ===== core/engine/msg/helpers.prime.js ===== */
(function(){var __AP_MOD="/core/engine/msg/helpers.prime.js";try{
// ./auto-prompter/core/engine/msg/helpers.prime.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const { sleep } = (AP.msgParts && AP.msgParts.utils) || { sleep: null };
  const { ensureFocus } = (AP.msgParts && AP.msgParts.focus) || {
    ensureFocus: () => {},
  };

  // Insert a real, visible char (NBSP) to wake the editor and mount Send; then remove it.
  async function primeComposerIfNeeded(input, _cfg, signal) {
    if (!input) return;
    ensureFocus(input);

    const doc = input.ownerDocument || document;
    const isCE = !!input.isContentEditable;
    const NBSP = "\u00A0"; // visible space
    let changed = false;

    const doSleep =
      sleep || ((ms) => new Promise((r) => setTimeout(r, Math.max(0, ms | 0))));

    // Helper: dispatch a bubbling input event
    function fireInput(data = null) {
      try {
        input.dispatchEvent(
          new InputEvent("input", { bubbles: true, data: data })
        );
      } catch {
        try {
          input.dispatchEvent(new Event("input", { bubbles: true }));
        } catch {}
      }
    }

    // 1) Write a char
    try {
      if (typeof doc.execCommand === "function") {
        ensureFocus(input);
        // ProseMirror-friendly path
        changed = doc.execCommand("insertText", false, NBSP);
      }
    } catch {}

    if (!changed) {
      try {
        if ("value" in input) {
          input.value = (input.value || "") + NBSP;
          fireInput(NBSP);
          changed = true;
        } else if (isCE) {
          // CE fallback: insert a text node at the caret
          const sel = doc.getSelection && doc.getSelection();
          if (sel && sel.rangeCount) {
            const r = sel.getRangeAt(0).cloneRange();
            r.collapse(true);
            r.insertNode(doc.createTextNode(NBSP));
            // move caret to end
            sel.removeAllRanges();
            const r2 = doc.createRange();
            r2.selectNodeContents(input);
            r2.collapse(false);
            sel.addRange(r2);
            fireInput(NBSP);
            changed = true;
          } else {
            // last-ditch: append
            input.appendChild(doc.createTextNode(NBSP));
            fireInput(NBSP);
            changed = true;
          }
        }
      } catch {}
    }

    if (!changed) return; // nothing we can do

    await doSleep(120, signal);

    // 2) Remove the char
    try {
      if (typeof doc.execCommand === "function") {
        doc.execCommand("delete", false);
        fireInput("");
      } else if ("value" in input) {
        input.value = (input.value || "").replace(/\u00A0$/, "");
        fireInput("");
      } else if (isCE) {
        // remove the trailing NBSP we added
        const last = input.lastChild;
        if (last && last.nodeType === Node.TEXT_NODE) {
          last.nodeValue = (last.nodeValue || "").replace(/\u00A0$/, "");
          fireInput("");
        } else {
          // safe cleanup: trim any lone NBSP at end
          input.innerHTML = (input.innerHTML || "").replace(
            /\u00A0<\/?br?>?$/i,
            ""
          );
          fireInput("");
        }
      }
    } catch {}

    await doSleep(40, signal);
  }

  AP.msgParts = AP.msgParts || {};
  AP.msgParts.prime = { primeComposerIfNeeded };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/msg/helpers.refresh.js");

/* ===== core/engine/msg/helpers.refresh.js ===== */
(function(){var __AP_MOD="/core/engine/msg/helpers.refresh.js";try{
// ./auto-prompter/core/engine/msg/helpers.refresh.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  /**
   * Treat a node as stale only when it's truly unusable:
   * - element is missing or disconnected
   * - its ownerDocument/window is gone or closed
   *
   * NOTE: Do NOT compare ownerDocument to the top-level `document`.
   * Nodes found inside same-origin iframes will naturally have a different
   * ownerDocument and should still be considered fresh.
   *
   * @param {Node} el
   * @param {Document} [expectedDoc] Optional: if provided, mark stale when
   *                                 the element has migrated to a different document.
   */
  function isStaleNode(el, expectedDoc) {
    try {
      if (!el) return true;
      if (!el.isConnected) return true;

      const doc = el.ownerDocument;
      if (!doc) return true;

      // Optional: consider stale if the element moved to a different Document
      if (expectedDoc && doc !== expectedDoc) return true;

      const win = doc.defaultView;
      if (!win) return true;
      // If the browsing context was torn down
      if (typeof win.closed === "boolean" && win.closed) return true;

      return false;
    } catch {
      return true;
    }
  }

  async function refreshComposer(found, cfg, findComposer, signal) {
    try {
      const refreshed =
        (await findComposer?.({ ...cfg, allowInputOnly: true }, signal)) ||
        null;
      if (refreshed?.input) {
        found.input = refreshed.input;
        found.send = refreshed.send || found.send || null;
      }
    } catch {}
    return found;
  }

  AP.msgParts = AP.msgParts || {};
  AP.msgParts.refresh = { isStaleNode, refreshComposer };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/msg/helpers.sendGate.js");

/* ===== core/engine/msg/helpers.sendGate.js ===== */
(function(){var __AP_MOD="/core/engine/msg/helpers.sendGate.js";try{
// ./auto-prompter/core/engine/msg/helpers.sendGate.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const { sleep } = (AP.msgParts && AP.msgParts.utils) || { sleep: null };

  // --- Busy detection (reuses engine idle pieces when available) -------------
  const idleConstants = (AP.engineIdle && AP.engineIdle.constants) || {};
  const idleDom = (AP.engineIdle && AP.engineIdle.dom) || {};
  const DEFAULT_STOP_SELECTORS = idleConstants.DEFAULT_STOP_SELECTORS || [];
  const STREAMING_HINTS = idleConstants.STREAMING_HINTS || [];

  function _any(selectors, root) {
    try {
      const r = root || document;
      for (const s of selectors || []) {
        try {
          if (r.querySelector(s)) return true;
        } catch {}
      }
    } catch {}
    return false;
  }

  function isBusy(root) {
    const any = idleDom.any || _any;
    const r = root || document;
    // Busy if "Stop" control or any streaming hint is present
    return any(DEFAULT_STOP_SELECTORS, r) || any(STREAMING_HINTS, r);
  }

  // --- Send readiness --------------------------------------------------------
  function isSendEnabled(btn) {
    if (!btn) return false;
    if (btn.disabled === true) return false;
    const aria = btn.getAttribute && btn.getAttribute("aria-disabled");
    if (aria === "true") return false;
    if (btn.inert === true) return false;
    const ds = btn.dataset || {};
    if (ds.state === "disabled" || ds.disabled === "true") return false;

    // Style-based blocks that often indicate disabled/hidden
    try {
      const s = getComputedStyle(btn);
      if (!s) return false;
      if (s.display === "none" || s.visibility === "hidden") return false;
      if (s.pointerEvents === "none") return false;
      if (Number(s.opacity) === 0) return false;
      if ((s.filter || "").includes("opacity(0)")) return false;
    } catch {}

    return true;
  }

  async function waitForSendEnabled(
    btn,
    timeoutMs = 1500,
    stepMs = 80,
    signal
  ) {
    const sleeper =
      sleep || ((ms) => new Promise((r) => setTimeout(r, Math.max(0, ms | 0))));
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      if (isSendEnabled(btn)) return true;
      await sleeper(stepMs, signal);
    }
    return false;
  }

  // --- Unified greenlight gate ----------------------------------------------
  // Waits for model to be idle (Stop → gone), then ensures Send is enabled.
  async function waitForGreenlight({
    btn,
    timeoutMs = 180000,
    stepMs = 120,
    scanMs = 120,
    stopSelOverride,
    signal,
  } = {}) {
    const sleeper =
      sleep || ((ms) => new Promise((r) => setTimeout(r, Math.max(0, ms | 0))));

    // 1) If busy, wait until idle. Prefer the central idle waiter if present.
    if (isBusy(document)) {
      const stopList = []
        .concat(
          Array.isArray(stopSelOverride)
            ? stopSelOverride
            : stopSelOverride
            ? [stopSelOverride]
            : []
        )
        .concat(DEFAULT_STOP_SELECTORS);
      const mergedStopSel = stopList.filter(Boolean).join(",");

      const idleWait = (AP.idleWait && AP.idleWait.waitUntilIdle) || null;
      if (typeof idleWait === "function") {
        // Signature mirrors usage elsewhere: (stopSel, timeoutMs, scanMs, signal)
        await idleWait(mergedStopSel, timeoutMs, scanMs, signal);
      } else {
        // Fallback polling (rarely needed)
        const t0 = Date.now();
        while (Date.now() - t0 < timeoutMs) {
          if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
          if (!isBusy(document)) break;
          await sleeper(stepMs, signal);
        }
      }
    }

    // 2) If we have a button handle, wait until it's truly enabled.
    if (btn) {
      await waitForSendEnabled(btn, Math.max(900, stepMs * 10), stepMs, signal);
    }

    return true;
  }

  // --- Exports ---------------------------------------------------------------
  AP.msgParts = AP.msgParts || {};
  AP.msgParts.sendGate = Object.assign({}, AP.msgParts.sendGate || {}, {
    isBusy,
    isSendEnabled,
    waitForSendEnabled,
    waitForGreenlight,
  });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/msg/handler.js");

/* ===== core/engine/msg/handler.js ===== */
(function(){var __AP_MOD="/core/engine/msg/handler.js";try{
// ./auto-prompter/core/engine/msg/handler.js
(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L = (AP._log || { with: () => console }).with({
    component: "engine",
    file: "core/engine/msg/handler.js",
  });

  const { withRetries, sleep, enforceMinInterval } =
    (AP.msgParts && AP.msgParts.utils) || {};
  const { bumpIndex, getCtx, setLastSend } =
    (AP.msgParts && AP.msgParts.context) || {};
  const { getDeps } = (AP.msgParts && AP.msgParts.deps) || {};
  const { ensureFocus, getTextSnapshot } =
    (AP.msgParts && AP.msgParts.focus) || {};
  const { isSendEnabled, waitForSendEnabled, isBusy, waitForGreenlight } =
    (AP.msgParts && AP.msgParts.sendGate) || {};
  const { primeComposerIfNeeded } = (AP.msgParts && AP.msgParts.prime) || {};
  const { isStaleNode, refreshComposer } =
    (AP.msgParts && AP.msgParts.refresh) || {};

  // NEW: mic finder from engine/find/utils.dictate.js (loaded separately)
  const findDictateNear =
    (AP.engineFind &&
      AP.engineFind.utils &&
      AP.engineFind.utils.findDictateNear) ||
    null;

  // Heuristic to tell if a “Dictate” control is actively recording.
  // We check common attributes from your snippet (data-state="open") and aria-pressed.
  function isMicActive(micBtn) {
    if (!micBtn) return false;
    try {
      const containerState =
        micBtn.closest &&
        micBtn.closest("[data-state]")?.getAttribute("data-state");
      if (containerState && String(containerState).toLowerCase() === "open") {
        return true;
      }
    } catch {}
    try {
      const pressed =
        micBtn.getAttribute && micBtn.getAttribute("aria-pressed");
      if (pressed && String(pressed).toLowerCase() === "true") return true;
    } catch {}
    // Some UIs toggle a recording CSS class on the button; add a conservative check:
    try {
      const cls = micBtn.className || "";
      if (/\b(record|listening|active)\b/i.test(String(cls))) return true;
    } catch {}
    return false;
  }

  // Ensure dictation is not recording before we type or send.
  // If active, we toggle it off (click) and wait briefly (or until idle).
  async function ensureDictationIdleAround(
    input,
    waitUntilIdle,
    scanMs,
    signal
  ) {
    if (typeof findDictateNear !== "function") return;
    const mic = findDictateNear(input);
    if (!mic) return;

    // If recording, click to stop
    if (isMicActive(mic)) {
      try {
        (L.info || L.log).call(L, "[msg] dictation active → stopping it");
        mic.click();
      } catch (e) {
        (L.warn || L.log).call(
          L,
          "[msg] mic click error:",
          e?.message || String(e)
        );
      }

      // Prefer centralized idle waiter; otherwise short debounce
      if (typeof waitUntilIdle === "function") {
        try {
          await waitUntilIdle(
            /* stopSel */ null,
            /* timeoutMs */ 8000,
            /* scanMs   */ Math.max(80, Number(scanMs) || 120),
            signal
          );
        } catch {}
      } else {
        await sleep(300, signal);
      }
    }
  }

  async function msg(step, cfg, signal) {
    const {
      renderText,
      setInputValue,
      triggerSend,
      waitUntilIdle,
      findComposer,
      findComposerOrFail,
    } = getDeps();

    bumpIndex();
    const ctx = getCtx();
    const text = renderText(step.text, ctx) ?? "";
    L.info("step", { index: ctx.index, preview: text.slice(0, 120) });

    // 1) Locate composer (input may exist before Send is mounted)
    let found = await findComposerOrFail(
      { ...cfg, allowInputOnly: true },
      signal
    );

    // NEW: Make sure dictation isn’t recording before we proceed.
    await ensureDictationIdleAround(
      found.input,
      waitUntilIdle,
      cfg.scanMs,
      signal
    );

    // 2) Guard against hammering send
    await enforceMinInterval(
      ctx.lastSendAt,
      Math.max(0, Number(cfg.minIntervalMs || 0)),
      signal
    );

    // 3) PRIME editor so Send can mount/enable on a brand new thread
    ensureFocus(found.input);
    await primeComposerIfNeeded(found.input, cfg, signal);

    // Reacquire if priming remounted the editor
    if (isStaleNode(found.input)) {
      found = await findComposerOrFail(
        { ...cfg, allowInputOnly: true },
        signal
      );
    } else {
      await refreshComposer(found, cfg, findComposer, signal);
    }

    // NEW: Post-refresh, again ensure mic isn’t actively listening
    await ensureDictationIdleAround(
      found.input,
      waitUntilIdle,
      cfg.scanMs,
      signal
    );

    // 4) INSERT (verify; retry once if CE swallowed it)
    ensureFocus(found.input);
    await setInputValue(found.input, text, signal);
    await sleep(120, signal);

    let content = (getTextSnapshot(found.input) || "").trim();
    if (!content) {
      await refreshComposer(found, cfg, findComposer, signal);
      ensureFocus(found.input);
      await setInputValue(found.input, text, signal);
      await sleep(140, signal);
      content = (getTextSnapshot(found.input) || "").trim();
      L.info("post-insert verification", {
        empty: !content,
        len: content.length,
      });
    }

    // 5) Pre-send “greenlight” gate — wait until the UI is idle or Send appears
    {
      const stepPoll = Math.max(80, Number(cfg.scanMs || 120));
      const busy = typeof isBusy === "function" ? isBusy(document) : false;

      if (busy && typeof waitForGreenlight === "function") {
        L.info("pre-send gate: busy detected; waiting for idle/Send");
        await waitForGreenlight({
          btn: found.send || null,
          timeoutMs: 180000,
          stepMs: stepPoll,
          scanMs: stepPoll,
          stopSelOverride: cfg.stopSel,
          signal,
        });

        // After Stop→Send flip, DOM may remount; reacquire fresh handles.
        try {
          found = await findComposerOrFail(
            { ...cfg, allowInputOnly: true },
            signal
          );
        } catch {}
      } else {
        // If not busy and a button is already present, ensure it’s enabled
        if (found.send) {
          await waitForSendEnabled(found.send, 1800, 90, signal);
        }
      }

      // NEW: One more mic sanity right before send
      await ensureDictationIdleAround(
        found.input,
        waitUntilIdle,
        cfg.scanMs,
        signal
      );
    }

    // NOTE: We intentionally DO NOT perform a strict re-find requiring Send here.
    // If Send isn't mounted/enabled yet, we’ll fall back to Enter.
    if (!found.send) {
      L.info("no Send button visible/enabled; using Enter fallback");
    }

    // 6) SEND with retries + self-heal if nodes go stale
    await withRetries(
      async () => {
        if (
          isStaleNode(found.input) ||
          (found.send && isStaleNode(found.send))
        ) {
          found = await findComposerOrFail(
            { ...cfg, allowInputOnly: true },
            signal
          );
          await refreshComposer(found, cfg, findComposer, signal);
        }
        ensureFocus(found.input);

        // As a last-ditch nudge, prime again if button still looks disabled
        if (found.send && !isSendEnabled(found.send)) {
          await primeComposerIfNeeded(found.input, cfg, signal);
          await refreshComposer(found, cfg, findComposer, signal);
        }

        // NEW: Final guard — if mic flipped back on somehow, stop it
        await ensureDictationIdleAround(
          found.input,
          waitUntilIdle,
          cfg.scanMs,
          signal
        );

        await triggerSend(found.input, found.send || null, signal);
        return true;
      },
      /* tries */ 4,
      /* baseDelay */ 180,
      signal,
      "triggerSend"
    );

    // 7) Wait for completion, record send time, optional pacing delay
    await waitUntilIdle(cfg.stopSel, 180000, cfg.scanMs, signal);
    setLastSend(Date.now());

    const d = Math.max(0, Number(cfg.delayMs || 0));
    if (d) await sleep(d, signal);
  }

  // Register handler
  AP.engineStepHandlersParts = AP.engineStepHandlersParts || {};
  AP.engineStepHandlersParts.msg = { msg };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/steps.handlers.msg.js");

/* ===== core/engine/steps.handlers.msg.js ===== */
(function(){var __AP_MOD="/core/engine/steps.handlers.msg.js";try{
// ./auto-prompter/core/engine/steps.handlers.msg.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  // This file is now a shim — real implementation lives in core/engine/msg/handler.js
  // Ensure handler is already loaded; nothing else to do here.
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/steps.js");

/* ===== core/engine/steps.js ===== */
(function(){var __AP_MOD="/core/engine/steps.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/engine/steps.js
(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L = (AP._log || { with: () => console }).with({
    component: "engine",
    file: "core/runtime/engine/steps.js",
  });

  const parts = AP.engineStepsParts || {};
  const executeStep = parts.executeStep;
  const findComposerOrFail = parts.findComposerOrFail;

  if (!executeStep || !findComposerOrFail) {
    L.warn(
      "engineStepsParts incomplete; ensure steps.findComposer.js and steps.execute.js are loaded first"
    );
  }

  AP.engineSteps = { executeStep, findComposerOrFail };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/index.js");

/* ===== core/engine/index.js ===== */
(function(){var __AP_MOD="/core/engine/index.js";try{
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L = (AP._log || { with: () => console }).with({
    component: "engine",
    file: "core/runtime/engine/index.js",
  });

  // IMPORTANT: don't capture executeStep at module-load time;
  // load order can make it undefined permanently. Fetch it lazily.
  function getExecuteStep() {
    return (
      (AP.engineStepsParts && AP.engineStepsParts.executeStep) ||
      (AP.engineSteps && AP.engineSteps.executeStep) ||
      null
    );
  }

  function parse(sequence) {
    const parser = AP.promptParser && AP.promptParser.parse;
    if (!parser) throw new Error("promptParser.parse not available");
    return parser(sequence);
  }

  async function runAll(steps, cfg) {
    const { resetRun, getCtx } = AP.engineCtx || {};
    if (!resetRun || !getCtx) throw new Error("engineCtx not available");

    resetRun();
    const ctx = getCtx();
    ctx.controller = new AbortController();
    const { signal } = ctx.controller;

    const wired = {
      executeStep: !!getExecuteStep(),
      findComposer:
        !!(AP.engineStepsParts && AP.engineStepsParts.findComposerOrFail) ||
        !!(
          AP.__impls && typeof AP.__impls.findComposerOrFailImpl === "function"
        ),
    };

    L.info("run start", {
      steps: steps?.length || 0,
      cfg: {
        minIntervalMs: cfg?.minIntervalMs ?? null,
        delayMs: cfg?.delayMs ?? null,
        detectTimeoutMs: cfg?.detectTimeoutMs ?? null,
      },
      wired,
    });

    try {
      for (const step of steps) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        const executeStep = getExecuteStep();
        if (!executeStep) {
          throw new Error(
            "engine executeStep not available (ensure steps.execute.js is loaded before runAll)"
          );
        }
        await executeStep(step, cfg, signal);
      }
      L.info("run complete", { steps: steps?.length || 0 });
    } finally {
      ctx.controller = null;
    }
  }

  function abortRun() {
    const ctx =
      (AP.engineCtx && AP.engineCtx.getCtx && AP.engineCtx.getCtx()) || null;
    if (ctx && ctx.controller) {
      L.warn("run abort requested");
      ctx.controller.abort();
      ctx.controller = null;
    }
  }

  AP.promptEngine = { parse, runAll, abortRun };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/devtools/logger.js");

/* ===== core/devtools/logger.js ===== */
(function(){var __AP_MOD="/core/devtools/logger.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/shared/logger.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/shared/logger.js"
    );
  } catch {}

  const VERSION = "4.3.0";

  if (AP.logger && typeof AP.logger.info === "function" && AP.logger.with) {
    try {
      AP.boot?.cp?.("shared:logger:ready", { version: VERSION, reused: true });
    } catch {}
    return;
  }

  const sinks = [];
  const c = console;

  function fmt(args) {
    try {
      return args
        .map((a) =>
          typeof a === "string"
            ? a
            : a instanceof Error
            ? `${a.name}: ${a.message}`
            : JSON.stringify(a)
        )
        .join(" ");
    } catch {
      return args.map((x) => String(x)).join(" ");
    }
  }

  // Simple level gate via localStorage ("debug" | "info" | "warn" | "error")
  function levelEnabled(requested) {
    const order = { debug: 10, info: 20, warn: 30, error: 40 };
    let cur = 20;
    try {
      const lv = (localStorage.getItem("ap_log_level") || "info").toLowerCase();
      cur = order[lv] || 20;
    } catch {}
    return (order[requested] || 999) >= cur;
  }

  function callSinks(level, msg, meta) {
    try {
      for (const s of sinks) {
        try {
          s({ level, msg, meta });
        } catch {}
      }
    } catch {}
  }

  function baseLogger(meta) {
    const prefix =
      meta && Object.keys(meta).length
        ? `[${Object.entries(meta)
            .map(([k, v]) => `${k}:${v}`)
            .join(",")}] `
        : "";

    const wrap =
      (level, fn) =>
      (...a) => {
        if (!levelEnabled(level)) return;
        const m = prefix + fmt(a);
        (fn || c.log).call(c, "[AP]", m);
        callSinks(level, m, meta);
      };

    const logger = {
      addSink(fn) {
        if (typeof fn === "function") sinks.push(fn);
      },
      debug: wrap("debug", c.debug || c.log),
      info: wrap("info", c.info || c.log),
      warn: wrap("warn", c.warn || c.log),
      error: wrap("error", c.error || c.log),
    };

    // hierarchical child logger
    Object.defineProperty(logger, "with", {
      value: (more) => baseLogger({ ...(meta || {}), ...(more || {}) }),
      enumerable: true,
    });

    return logger;
  }

  AP.logger = baseLogger({ component: "root" });

  try {
    AP.boot?.cp?.("shared:logger:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/devtools/loggerFacade.js");

/* ===== core/devtools/loggerFacade.js ===== */
(function(){var __AP_MOD="/core/devtools/loggerFacade.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/shared/loggerFacade.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/shared/loggerFacade.js"
    );
  } catch {}

  const VERSION = "4.3.2";

  function loggerWith(meta) {
    const base = AP.logger || console;
    if (typeof base.with === "function") return base.with(meta);
    // Fallback: proxy wrapping console-like objects (no .call/.apply).
    return new Proxy(base, {
      get(_t, k) {
        if (k === "with") {
          return (more) => loggerWith({ ...(meta || {}), ...(more || {}) });
        }
        const fn = base[k] || base.log || console.log;
        return (...args) => {
          try {
            if (typeof fn === "function") fn(...args);
            else console.log(...args);
          } catch {
            try {
              console.log(...args);
            } catch {}
          }
        };
      },
    });
  }

  function createBackoff() {
    const state = new Map();

    const keyOf = (scope, tag) =>
      String(scope || "global") + "::" + String(tag || "event");

    function nextDelay(attempt, base, max) {
      const b = Math.max(50, Number(base) || 250);
      const m = Math.max(b, Number(max) || 60000);
      const pow = Math.min(10, Math.max(0, attempt));
      const raw = Math.min(m, b * Math.pow(2, pow));
      const jitter = Math.floor(raw * 0.15 * Math.random());
      return raw + jitter;
    }

    function shouldLog(scope, tag, now = Date.now(), base = 250, max = 60000) {
      const k = keyOf(scope, tag);
      const s = state.get(k) || { attempt: 0, nextAt: 0 };
      if (now >= s.nextAt) {
        s.nextAt = now + nextDelay(s.attempt, base, max);
        s.attempt = s.attempt + 1;
        state.set(k, s);
        return true;
      }
      return false;
    }

    function reset(scope, tag) {
      state.delete(keyOf(scope, tag));
    }

    function log(level, scope, tag, ...args) {
      const base = AP.logger || console;
      const fn = (base && base[level]) || base.log || console.log;
      const header = `[AP][${scope}] ${String(tag)}`;
      try {
        if (typeof fn === "function") fn(header, ...args);
        else console.log(header, ...args);
      } catch {
        try {
          console.log(header, ...args);
        } catch {}
      }
    }

    function logWithBackoff(level, scope, tag, optsOrMsg, ...rest) {
      const opts =
        typeof optsOrMsg === "object" && !(optsOrMsg instanceof Error)
          ? optsOrMsg
          : null;
      const args = opts ? rest : [optsOrMsg, ...rest];
      const base = opts?.base ?? 250;
      const max = opts?.max ?? 60000;
      if (shouldLog(scope, tag, Date.now(), base, max)) {
        log(level, scope, tag, ...args);
        return true;
      }
      return false;
    }

    function logOnce(level, scope, tag, ...args) {
      const store = window.sessionStorage;
      const k = `ap_log_once::${keyOf(scope, tag)}`;
      try {
        if (store && store.getItem(k)) return false;
        store && store.setItem(k, "1");
      } catch {}
      log(level, scope, tag, ...args);
      return true;
    }

    return { shouldLog, log: logWithBackoff, logOnce, reset };
  }

  AP._log = { with: loggerWith };
  AP._logBackoff = AP._logBackoff || createBackoff();

  try {
    AP.boot?.cp?.("shared:logger:facade:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/devtools/trace.js");

/* ===== core/devtools/trace.js ===== */
(function(){var __AP_MOD="/core/devtools/trace.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/shared/trace.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/shared/trace.js"
    );
  } catch {}

  const VERSION = "4.3.2";

  if (AP.boot && typeof AP.boot.cp === "function") {
    try {
      AP.boot.cp("boot:trace:reused", { version: VERSION });
    } catch {}
    return;
  }

  const id =
    Math.random().toString(36).slice(2, 6) +
    "-" +
    (Date.now() % 1e6).toString(36);
  const startedAt = Date.now();
  const trace = [];

  function safeLog(...args) {
    try {
      const base = AP.logger || console;
      const fn = (base && base.info) || base.log || console.log;
      if (typeof fn === "function") fn(...args);
      else console.log(...args);
    } catch {
      try {
        console.log(...args);
      } catch {}
    }
  }

  function cp(name, extra) {
    const t = Date.now();
    const row = {
      t,
      dt: t - (trace[0]?.t || startedAt),
      name: String(name || ""),
      ...(extra || {}),
    };
    trace.push(row);
    try {
      window.dispatchEvent(new CustomEvent("ap:boot-cp", { detail: row }));
    } catch {}
    safeLog("[AP][boot]", row.name, extra || "");
    return row;
  }

  function dump() {
    try {
      console.groupCollapsed(
        `[AP][boot] trace id=${id} (${trace.length} checkpoints)`
      );
      for (const r of trace) {
        console.log(
          `${new Date(r.t).toLocaleTimeString()}.${String(r.t % 1000).padStart(
            3,
            "0"
          )} (+${r.dt}ms) — ${r.name}`,
          r
        );
      }
      console.groupEnd();
    } catch {}
    return trace.slice();
  }

  AP.boot = {
    id,
    startedAt,
    trace,
    cp,
    dump,
    _version: VERSION,
    get last() {
      return trace[trace.length - 1] || null;
    },
  };

  cp("boot:trace:init", {
    href: location.href,
    readyState: document.readyState,
  });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/shared/flags.js");

/* ===== core/runtime/shared/flags.js ===== */
(function(){var __AP_MOD="/core/runtime/shared/flags.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/shared/flags.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/shared/flags.js"
    );
  } catch {}

  const VERSION = "4.3.0";

  // preserve any previous flags surface; extend rather than replace
  const existing = AP.flags || {};
  const readLS = (k, d) => {
    try {
      return localStorage.getItem(k) ?? d;
    } catch {
      return d;
    }
  };

  const flags = {
    get detectIframes() {
      return readLS("ap_detect_iframes", "0") === "1";
    },
    get detectPollMs() {
      return Number(readLS("ap_detect_poll_ms", "120")) || 120;
    },
    get detectTimeoutMs() {
      return Number(readLS("ap_detect_timeout_ms", "1200")) || 1200;
    },
    get inputOnly() {
      return readLS("ap_detect_input_only", "0") === "1";
    },
    // lightweight setter helpers for dev toggling
    _set(k, v) {
      try {
        localStorage.setItem(k, String(v));
        return true;
      } catch {
        return false;
      }
    },
  };

  AP.flags = Object.assign({}, existing, flags);

  try {
    AP.boot?.cp?.("shared:flags:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/lib/dom/domFacade.js");

/* ===== core/lib/dom/domFacade.js ===== */
(function(){var __AP_MOD="/core/lib/dom/domFacade.js";try{
// FILE: core/lib/dom/domFacade.js
// VERSION: shared-domFacade/1.0.3  (adds richer helpers + path aliases + breadcrumbs)

(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const cp = (tag, extra) => {
    try {
      const payload = { ver: "shared-domFacade/1.0.3", ...(extra || {}) };
      AP.boot?.cp?.("shared:domFacade:" + tag, payload);
      AP.boot?.cp?.("domFacade:" + tag, payload); // alias breadcrumb channel
    } catch {}
  };

  if (AP.shared?.domFacade && AP.shared.domFacade.__ver >= "1.0.3") {
    cp("already", { reused: true, existing: AP.shared.domFacade.__ver });
    return;
  }

  // Core helpers
  const dom = {
    __ver: "1.0.3",

    // Element creation
    el(tag, props, children) {
      const n = document.createElement(tag);
      if (props && typeof props === "object") {
        for (const k of Object.keys(props)) {
          try {
            if (k in n) n[k] = props[k];
            else n.setAttribute(k, props[k]);
          } catch {}
        }
      }
      for (const c of children || []) {
        try {
          n.appendChild(c);
        } catch {}
      }
      return n;
    },

    // Query (modern + aliases expected by other modules)
    qs(sel, root) {
      try {
        return (root || document).querySelector(sel);
      } catch {
        return null;
      }
    },
    qsa(sel, root) {
      try {
        return Array.from((root || document).querySelectorAll(sel));
      } catch {
        return [];
      }
    },
    // Aliases expected by some call sites
    q1(sel, root) {
      return dom.qs(sel, root);
    },
    qAll(sel, root) {
      return dom.qsa(sel, root);
    },

    // Traversal
    closest(el, sel) {
      try {
        return el?.closest?.(sel) || null;
      } catch {
        return null;
      }
    },
    inShadow(root, sel) {
      try {
        return root?.shadowRoot?.querySelector(sel) || null;
      } catch {
        return null;
      }
    },
    attachShadow(host, init) {
      try {
        return host.attachShadow(init || { mode: "open" });
      } catch {
        return null;
      }
    },

    // Events
    on(el, evt, fn, opts) {
      try {
        el &&
          el.addEventListener &&
          el.addEventListener(evt, fn, opts || false);
      } catch {}
    },
    off(el, evt, fn, opts) {
      try {
        el &&
          el.removeEventListener &&
          el.removeEventListener(evt, fn, opts || false);
      } catch {}
    },
    once(el, evt, fn, opts) {
      try {
        el &&
          el.addEventListener &&
          el.addEventListener(
            evt,
            fn,
            Object.assign({ once: true }, opts || {})
          );
      } catch {}
    },
    fire(el, type, detail, bubbles) {
      try {
        const ev = new CustomEvent(type, {
          bubbles: bubbles !== false,
          cancelable: true,
          detail,
        });
        el && el.dispatchEvent && el.dispatchEvent(ev);
      } catch {}
    },
    fireInput(el, text) {
      try {
        if (typeof InputEvent === "function") {
          const ev = new InputEvent("input", {
            bubbles: true,
            inputType: "insertText",
            data: text || "",
          });
          el && el.dispatchEvent && el.dispatchEvent(ev);
        } else {
          const ev2 = document.createEvent("Event");
          ev2.initEvent("input", true, true);
          el && el.dispatchEvent && el.dispatchEvent(ev2);
        }
      } catch {}
    },
    focus(el) {
      try {
        el && el.focus && el.focus();
      } catch {}
    },
  };

  // Public attachment
  AP.shared = AP.shared || {};
  AP.shared.domFacade = dom;

  // Legacy convenience aliases if callers expect AP.dom.* or AP.domFacade
  AP.dom = AP.dom || {};
  AP.dom.el = AP.dom.el || dom.el;
  AP.dom.query = AP.dom.query || dom.qs;
  AP.domFacade = AP.domFacade || dom;

  // Module alias registry (no new files; helps code that looks up by path)
  try {
    const reg = (window.__AP_MODULES = window.__AP_MODULES || {});
    // Existing paths
    reg["core/runtime/shared/domFacade.js"] = dom;
    reg["auto-prompter/core/runtime/shared/domFacade.js"] = dom;
    // Add leading-slash aliases to satisfy older bundlers
    reg["/core/runtime/shared/domFacade.js"] = dom;
    reg["/auto-prompter/core/runtime/shared/domFacade.js"] = dom;
    cp("aliases", {
      paths: Object.keys(reg).filter((k) => /domFacade\.js$/.test(k)),
    });
  } catch {}

  cp("ready");
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/lib/dom/utils.js");

/* ===== core/lib/dom/utils.js ===== */
(function(){var __AP_MOD="/core/lib/dom/utils.js";try{
// FILE: auto-prompter/core/runtime/shared/domUtils.js
// VERSION: shared-domUtils/4.4.1  (adds waitForSelector + setValueSmart + extra aliases + breadcrumbs)

(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const cp = (tag, extra) => {
    try {
      const payload = { ver: "shared-domUtils/4.4.1", ...(extra || {}) };
      AP.boot?.cp?.("shared:domUtils:" + tag, payload);
      AP.boot?.cp?.("domUtils:" + tag, payload); // alias breadcrumb channel
    } catch {}
  };

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/shared/domUtils.js"
    );
  } catch {}

  if (AP.domUtils?.__v >= 4) {
    cp("ready", { reused: true, version: AP.domUtils.__ver || "unknown" });
    return;
  }

  const isObj = (v) => v && typeof v === "object";
  const isFn = (v) => typeof v === "function";

  const sleep = (ms = 0, signal) =>
    new Promise((resolve, reject) => {
      const t = setTimeout(resolve, Math.max(0, Number(ms) || 0));
      if (signal) {
        const onAbort = () => (
          clearTimeout(t), reject(new DOMException("Aborted", "AbortError"))
        );
        signal.aborted
          ? onAbort()
          : signal.addEventListener("abort", onAbort, { once: true });
      }
    });

  const nextTick = () => Promise.resolve().then(() => undefined);

  function onDomReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      try {
        fn();
      } catch {}
    }
  }

  function throttle(fn, ms = 100) {
    let last = 0,
      timer = 0,
      lastArgs = null;
    return function throttled(...args) {
      const now = Date.now();
      lastArgs = args;
      if (now - last >= ms) {
        last = now;
        fn.apply(this, lastArgs);
        lastArgs = null;
      } else if (!timer) {
        const wait = ms - (now - last);
        timer = setTimeout(() => {
          last = Date.now();
          timer = 0;
          fn.apply(this, lastArgs);
          lastArgs = null;
        }, wait);
      }
    };
  }

  function debounce(fn, ms = 150) {
    let t = 0;
    return function debounced(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // New: waitForSelector (MO + fallback)
  function waitForSelector(sel, opts) {
    opts = opts || {};
    const root = opts.root || document;
    const timeout = +opts.timeout > 0 ? +opts.timeout : 6000;

    return new Promise((resolve) => {
      const df = (AP.shared && AP.shared.domFacade) || AP.domFacade || null;
      const q1 =
        (df && df.q1) ||
        ((s, r) => {
          try {
            return (r || document).querySelector(s);
          } catch {
            return null;
          }
        });

      const found = q1(sel, root);
      if (found) return resolve(found);

      let to = setTimeout(() => {
        try {
          mo && mo.disconnect();
        } catch {}
        resolve(null);
      }, timeout);

      let mo = null;
      try {
        const target = root.documentElement || root.body || root;
        mo = new MutationObserver(() => {
          const el = q1(sel, root);
          if (el) {
            clearTimeout(to);
            try {
              mo.disconnect();
            } catch {}
            resolve(el);
          }
        });
        mo.observe(target, {
          childList: true,
          subtree: true,
          attributes: false,
        });
      } catch {
        const iv = setInterval(() => {
          const el = q1(sel, root);
          if (el) {
            clearInterval(iv);
            clearTimeout(to);
            resolve(el);
          }
        }, 150);
      }
    });
  }

  // New: setValueSmart with IO helpers and input events
  function setValueSmart(el, text) {
    text = text == null ? "" : String(text);
    try {
      const io = AP.io && AP.io.value;
      if (io && isFn(io.set)) {
        io.set(el, text);
        return true;
      }
      if (io && io.ce && isFn(io.ce.set)) {
        io.ce.set(el, text);
        return true;
      }
    } catch {}

    try {
      const df = (AP.shared && AP.shared.domFacade) || AP.domFacade;
      df?.focus?.(el);
      if (!el) return false;
      if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
        el.value = text;
        df?.fireInput?.(el, text);
        return true;
      }
      if (el.isContentEditable) {
        el.textContent = text;
        df?.fireInput?.(el, text);
        return true;
      }
    } catch {}
    return false;
  }

  AP.domUtils = {
    __v: 4,
    __ver: "4.4.1",
    isObj,
    isFn,
    sleep,
    nextTick,
    onDomReady,
    throttle,
    debounce,
    waitForSelector,
    setValueSmart,
  };

  // Module alias registry (no new files created)
  try {
    const reg = (window.__AP_MODULES = window.__AP_MODULES || {});
    // Existing-style aliases
    reg["core/runtime/shared/domUtils.js"] = AP.domUtils;
    reg["auto-prompter/core/runtime/shared/domUtils.js"] = AP.domUtils;
    // Add leading-slash aliases to satisfy older bundlers
    reg["/core/runtime/shared/domUtils.js"] = AP.domUtils;
    reg["/auto-prompter/core/runtime/shared/domUtils.js"] = AP.domUtils;
    cp("aliases", {
      paths: Object.keys(reg).filter((k) => /domUtils\.js$/.test(k)),
    });
  } catch {}

  cp("ready", { version: "4.4.1" });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/core/deps.js");

/* ===== core/runtime/core/deps.js ===== */
(function(){var __AP_MOD="/core/runtime/core/deps.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/core/deps.js
(function () {
  "use strict";
  const VERSION = "4.3.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/core/deps.js"
    );
  } catch {}

  if (AP.coreDeps && typeof AP.coreDeps.ensureDeps === "function") {
    try {
      AP.boot?.cp?.("core:deps:ready", { version: VERSION, reused: true });
    } catch {}
    return;
  }

  const L = AP.logger?.with
    ? AP.logger.with({ component: "core", file: "core/deps.js" })
    : console;
  const BK = () => AP._logBackoff || { log: () => false, logOnce: () => false };

  // Minimal path walker: "a.b.c" -> window.AutoPrompter.a.b.c
  function has(path) {
    try {
      const parts = String(path).split(".");
      let cur = AP;
      for (const p of parts) {
        if (cur == null || !(p in cur)) return false;
        cur = cur[p];
      }
      return true;
    } catch {
      return false;
    }
  }

  // Expandable checklist (keep stable keys for diagnostics)
  const REQUIRED = [
    "uiPanel.createPanel",
    "promptParser.parse",
    "promptEngine.runAll",
    "compose.composeAndSend", // IO compose is critical for sending
  ];

  function listMissing() {
    const miss = [];
    for (const key of REQUIRED) if (!has(key)) miss.push(key);
    return miss;
  }

  function ensureDeps() {
    const miss = listMissing();
    if (miss.length) {
      const msg =
        "[AP][core] missing deps: " + miss.join(", ") + ". Check bundle order.";
      BK().log("warn", "core", "deps_missing", { miss });
      (L.warn || L.log).call(L, msg);
      try {
        // reflect into bundle meta if present
        const meta = (window.__AP_BUNDLE_META = window.__AP_BUNDLE_META || {});
        meta.core_missing = miss.slice();
      } catch {}
      return false;
    }
    return true;
  }

  AP.coreDeps = { ensureDeps, listMissing, REQUIRED, __v: VERSION };

  try {
    AP.boot?.cp?.("core:deps:ready", {
      version: VERSION,
      missing: listMissing(),
    });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/state.js");

/* ===== core/runtime/boot/state.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/state.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/state.js
(function () {
  "use strict";
  const VERSION = "4.3.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/state.js"
    );
  } catch {}

  if (AP.coreState) {
    try {
      AP.boot?.cp?.("boot:state:ready", { version: VERSION, reused: true });
    } catch {}
    return;
  }

  const state = { started: false, running: false };

  function isStarted() {
    return !!state.started;
  }
  function isRunning() {
    return !!state.running;
  }
  function setStarted(v) {
    state.started = !!v;
  }
  function setRunning(v) {
    state.running = !!v;
  }

  AP.coreState = { isStarted, isRunning, setStarted, setRunning, __v: VERSION };

  try {
    AP.boot?.cp?.("boot:state:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/gate.js");

/* ===== core/runtime/boot/gate.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/gate.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/gate.js
(function () {
  "use strict";
  const VERSION = "4.4.1";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/gate.js@4.4.1"
    );
  } catch {}

  function untilGate(timeoutMs = 3000, predicate) {
    const t0 = Date.now();
    return new Promise((resolve) => {
      const tick = () => {
        try {
          if (!predicate || predicate()) return resolve(true);
        } catch {}
        if (Date.now() - t0 >= timeoutMs) return resolve(false);
        setTimeout(tick, 60);
      };
      tick();
    });
  }

  async function startIfCoreExists() {
    try {
      const s =
        AP.AutoPrompterCore?.start ||
        (AP.start && (AP.start.__impl || AP.start)) ||
        null;
      if (typeof s === "function") {
        const res = await Promise.resolve(s());
        return res !== false;
      }
    } catch {}
    return false;
  }

  AP.startGate = AP.startGate || {};
  if (typeof AP.startGate.untilGate !== "function")
    AP.startGate.untilGate = untilGate;
  if (typeof AP.startGate.startIfCoreExists !== "function")
    AP.startGate.startIfCoreExists = startIfCoreExists;

  try {
    AP.boot?.cp?.("boot:gate:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/loader.js");

/* ===== core/runtime/boot/loader.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/loader.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/loader.js
(function () {
  "use strict";
  const VERSION = "4.5.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/loader.js@4.5.0"
    );
  } catch {}

  const BL = (AP.bootLoader = AP.bootLoader || {});
  const L =
    AP.logger?.with?.({
      component: "boot",
      file: "core/runtime/boot/loader.js",
    }) ||
    AP.logger ||
    console;

  const cp =
    BL.telemetry?.cp ||
    function (name, extra) {
      const detail = { version: VERSION, ...(extra || {}) };
      try {
        AP.boot?.cp?.(name, detail);
      } catch {}
      try {
        (L.info || L.log).call(L, `[AP][boot] ${name}`, extra || "");
      } catch {}
      try {
        window.dispatchEvent(
          new CustomEvent("ap:boot-cp", { detail: { name, extra: detail } })
        );
      } catch {}
    };

  const onReady =
    BL.util?.onReady ||
    ((fn) => {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", fn, { once: true });
      } else fn();
    });

  const sleep =
    BL.util?.sleep ||
    ((ms) => new Promise((r) => setTimeout(r, Math.max(0, Number(ms) || 0))));
  const getFlag = BL.flags?.getFlag || (() => false);
  const getNum = BL.flags?.getNum || ((_, d) => d);

  async function orchestrate() {
    cp("loader:ready");

    if (getFlag("ap_safe")) {
      cp("loader:safe:skip", { href: location.href });
      return;
    }

    const delay = getNum("ap_loader_delay_ms", 0);
    if (delay > 0) {
      cp("loader:delay:start", { ms: delay });
      await sleep(delay);
      cp("loader:delay:done");
    }

    try {
      await (BL.startCore?.run?.(cp) || Promise.resolve());
    } catch (e) {
      cp("loader:startCore:error", { err: String(e?.message || e) });
    }

    try {
      BL.apload?.fillApLoadWithRequired?.(cp);
    } catch (e) {
      cp("loader:ap_load:error", { err: String(e?.message || e) });
    }

    if (getFlag("ap_dev")) {
      try {
        BL.sanity?.runSanityOnce?.(cp);
      } catch (e) {
        cp("loader:sanity:error", { err: String(e?.message || e) });
      }
    }

    if (getFlag("ap_probe_enabled")) {
      try {
        await BL.probe?.runComposerProbe?.(cp);
      } catch (e) {
        cp("loader:composer:probe:error", { err: String(e?.message || e) });
      }
    } else {
      cp("loader:composer:probe:skipped");
    }
  }

  onReady(orchestrate);
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/loader/apload.js");

/* ===== core/runtime/boot/loader/apload.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/loader/apload.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/loader/apload.js
(function () {
  "use strict";
  const VERSION = "1.0.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const BL = (AP.bootLoader = AP.bootLoader || {});

  function fillApLoadWithRequired(cp) {
    try {
      const U = AP?.sanity?.utils;
      const req = Array.isArray(U?.REQUIRED_RUNTIME) ? U.REQUIRED_RUNTIME : [];
      if (!req.length) return;
      const load = window.__AP_LOAD || (window.__AP_LOAD = []);
      let added = 0;
      for (const p of req) {
        if (!load.some((h) => String(h).endsWith(p))) {
          load.push(p);
          added++;
        }
      }
      const meta = (window.__AP_BUNDLE_META = window.__AP_BUNDLE_META || {});
      if (added || (U?.missing && U.missing(req).length === 0)) {
        meta.ok = true;
        meta.criticalMissing = [];
        meta.missing = [];
      }
      cp?.("loader:ap_load:filled", { added, ok: !!meta.ok });
    } catch (e) {
      cp?.("loader:ap_load:error", { err: String(e?.message || e) });
    }
  }

  BL.apload = { VERSION, fillApLoadWithRequired };

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/loader/apload.js@1.0.0"
    );
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/loader/flags.js");

/* ===== core/runtime/boot/loader/flags.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/loader/flags.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/loader/flags.js
(function () {
  "use strict";
  const VERSION = "1.0.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const BL = (AP.bootLoader = AP.bootLoader || {});

  function getFlag(k) {
    try {
      const qs = new URL(location.href).searchParams.get(k);
      if (qs != null) return qs === "1" || qs === "true";
    } catch {}
    try {
      const v = localStorage.getItem(k);
      return v === "1" || v === "true";
    } catch {}
    return false;
  }

  function getNum(k, def) {
    try {
      const qs = new URL(location.href).searchParams.get(k);
      const v = Number(qs != null ? qs : localStorage.getItem(k));
      return Number.isFinite(v) ? v : def;
    } catch {
      return def;
    }
  }

  BL.flags = { VERSION, getFlag, getNum };

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/loader/flags.js@1.0.0"
    );
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/loader/probe.js");

/* ===== core/runtime/boot/loader/probe.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/loader/probe.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/loader/probe.js
(function () {
  "use strict";
  const VERSION = "1.0.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const BL = (AP.bootLoader = AP.bootLoader || {});

  async function runComposerProbe(cp) {
    if (AP.composerDetect?.probe) {
      cp?.("loader:composer:probe:start");
      const r = await AP.composerDetect.probe(
        Number(localStorage.getItem("ap_detect_timeout_ms")) || 1200
      );
      cp?.("loader:composer:probe:result", r);
      return;
    }
    if (AP.composerDetect?.findComposer) {
      cp?.("loader:composer:find:start");
      const r = await AP.composerDetect.findComposer({ allowInputOnly: true });
      cp?.("loader:composer:find:result", {
        input: !!r?.input,
        send: !!r?.send,
      });
      return;
    }
    cp?.("loader:composer:detector-missing");
  }

  BL.probe = { VERSION, runComposerProbe };

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/loader/probe.js@1.0.0"
    );
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/loader/sanity.js");

/* ===== core/runtime/boot/loader/sanity.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/loader/sanity.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/loader/sanity.js
(function () {
  "use strict";
  const VERSION = "1.0.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const BL = (AP.bootLoader = AP.bootLoader || {});

  function runSanityOnce(cp) {
    try {
      const Runner = AP.detectSanityRunner;
      const ConsoleRep = AP.detectSanityConsoleReporter;
      const TelemetryRep = AP.detectSanityTelemetryReporter;
      const REG = AP.detectSanityRegistry;

      if (REG && REG.get && REG.get().reporters.length === 0) {
        ConsoleRep && REG.registerReporter(ConsoleRep);
        TelemetryRep && REG.registerReporter(TelemetryRep);
      }

      const res = Runner?.runAll
        ? Runner.runAll()
        : { issues: [], snapshot: {} };

      (AP.detectSanityReport?.logReport || function () {})(
        AP.detectCoreConfig?.getSelectors?.() || {},
        AP.detectCoreConfig?.getFlags?.() || {},
        res
      );

      cp?.("loader:sanity:run", { issues: (res.issues || []).length });
    } catch (e) {
      cp?.("loader:sanity:error", { err: String(e?.message || e) });
    }
  }

  BL.sanity = { VERSION, runSanityOnce };

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/loader/sanity.js@1.0.0"
    );
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/loader/startCore.js");

/* ===== core/runtime/boot/loader/startCore.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/loader/startCore.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/loader/startCore.js
(function () {
  "use strict";
  const VERSION = "1.1.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const BL = (AP.bootLoader = AP.bootLoader || {});

  async function run(cp) {
    try {
      AP.mountPoint?.mountPanelWhenReady?.();
      cp?.("loader:mountPoint:called");
    } catch (e) {
      cp?.("loader:mountPoint:error", { err: String(e?.message || e) });
    }

    // Ask for providers FIRST, so any listeners can hand us a start fn.
    try {
      window.dispatchEvent(
        new CustomEvent("ap:need-start", {
          detail: {
            provide(fn) {
              if (typeof fn === "function") {
                (AP.AutoPrompterCore = AP.AutoPrompterCore || {}).start = fn;
                cp?.("loader:facade:gotStart");
              }
            },
          },
        })
      );
    } catch {}

    // Then try the start gate (returns true only if the call actually started)
    try {
      const ok = await AP.startGate?.startIfCoreExists?.();
      cp?.(ok ? "loader:startGate:start" : "loader:startGate:pending");
    } catch (e) {
      cp?.("loader:startGate:error", { err: String(e?.message || e) });
    }

    // Finally, try the AP.start alias as a last resort.
    try {
      const s = AP.start && (AP.start.__impl || AP.start);
      if (typeof s === "function") {
        cp?.("loader:AP.start:invoked");
        const res = await Promise.resolve(s());
        cp?.(res !== false ? "loader:AP.start:done" : "loader:AP.start:no-op");
      } else cp?.("loader:AP.start:missing");
    } catch (e) {
      cp?.("loader:AP.start:error", { err: String(e?.message || e) });
    }
  }

  BL.startCore = { VERSION, run };

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/loader/startCore.js@1.1.0"
    );
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/devtools/telemetry/loader.telemetry.js");

/* ===== core/devtools/telemetry/loader.telemetry.js ===== */
(function(){var __AP_MOD="/core/devtools/telemetry/loader.telemetry.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/loader/telemetry.js
(function () {
  "use strict";
  const VERSION = "1.0.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const BL = (AP.bootLoader = AP.bootLoader || {});
  const L =
    AP.logger?.with?.({
      component: "boot",
      file: "core/runtime/boot/loader/telemetry.js",
    }) ||
    AP.logger ||
    console;

  function cp(name, extra) {
    const detail = { version: VERSION, ...(extra || {}) };
    try {
      AP.boot?.cp?.(name, detail);
    } catch {}
    try {
      (L.info || L.log).call(L, `[AP][boot] ${name}`, extra || "");
    } catch {}
    try {
      window.dispatchEvent(
        new CustomEvent("ap:boot-cp", { detail: { name, extra: detail } })
      );
    } catch {}
  }

  BL.telemetry = { VERSION, cp };

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/loader/telemetry.js@1.0.0"
    );
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/loader/util.js");

/* ===== core/runtime/boot/loader/util.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/loader/util.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/loader/util.js
(function () {
  "use strict";
  const VERSION = "1.0.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const BL = (AP.bootLoader = AP.bootLoader || {});

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, Math.max(0, Number(ms) || 0)));
  }

  function onReady(fn) {
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  BL.util = { VERSION, sleep, onReady };

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/loader/util.js@1.0.0"
    );
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/utils/log.js");

/* ===== core/runtime/boot/nav/utils/log.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/utils/log.js";try{
// ./auto-prompter/core/runtime/boot/nav/utils/log.js
(function () {
  "use strict";
  const VERSION = "4.6.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L =
    AP.logger && AP.logger.with
      ? AP.logger.with({ component: "nav", file: "utils/log.js" })
      : console;

  const isDev = !!(
    AP.userscript &&
    typeof AP.userscript.devEnabled === "function" &&
    AP.userscript.devEnabled()
  );

  function safe(level, ...args) {
    try {
      const fn = (L && L[level]) || L.log || console.log;
      if (typeof fn === "function") fn(...args);
      else console.log(...args);
    } catch {
      try {
        console.log(...args);
      } catch {}
    }
  }

  function matchMsg(args, needle) {
    try {
      const s = args
        .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
        .join(" ");
      return s.includes(needle);
    } catch {
      return false;
    }
  }

  // Reduce console noise in non-dev: silence the well-known OFF notice unless dev.
  function warn(...args) {
    if (!isDev && matchMsg(args, "OFF — nav boot skipped")) {
      // no-op in prod-like runs
      return;
    }
    safe("warn", ...args);
  }

  function info(...args) {
    safe("info", ...args);
  }

  function debug(...args) {
    // Keep debug very quiet unless dev
    if (isDev) safe("debug", ...args);
  }

  // Single-shot warning helper (per-session)
  function warnOnce(tag, ...args) {
    const key = "ap_nav_warn_once_" + tag;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {}
    warn(...args);
  }

  (AP.__nav = AP.__nav || {}).log = {
    VERSION,
    safeLog: safe,
    warn,
    info,
    debug,
    warnOnce,
  };

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/utils/log.js"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:utils:log:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/utils/time.js");

/* ===== core/runtime/boot/nav/utils/time.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/utils/time.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/utils/time.js
(function () {
  "use strict";
  const VERSION = "4.5.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  const raf = window.requestAnimationFrame || ((cb) => setTimeout(cb, 16));
  const caf = window.cancelAnimationFrame || ((id) => clearTimeout(id));

  function nowMs() {
    try {
      if (performance && typeof performance.now === "function") {
        return (performance.timeOrigin || Date.now()) + performance.now();
      }
    } catch {}
    return Date.now();
  }

  (AP.__nav = AP.__nav || {}).time = { VERSION, raf, caf, nowMs };
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/utils/time.js"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:utils:time:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/utils/dom.js");

/* ===== core/runtime/boot/nav/utils/dom.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/utils/dom.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/utils/dom.js
(function () {
  "use strict";
  const VERSION = "4.5.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  function on(t, n, h, o) {
    try {
      t?.addEventListener?.(n, h, o || {});
      return true;
    } catch {
      return false;
    }
  }
  function off(t, n, h, o) {
    try {
      t?.removeEventListener?.(n, h, o || {});
      return true;
    } catch {
      return false;
    }
  }
  function emit(n, d) {
    try {
      window.dispatchEvent(new CustomEvent(n, { detail: d }));
      return true;
    } catch {
      return false;
    }
  }
  function q(sel, root) {
    try {
      return (root || document).querySelector(sel);
    } catch {
      return null;
    }
  }

  (AP.__nav = AP.__nav || {}).dom = { VERSION, on, off, emit, q };
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/utils/dom.js"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:utils:dom:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/utils/index.js");

/* ===== core/runtime/boot/nav/utils/index.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/utils/index.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/utils/index.js
(function () {
  "use strict";
  const VERSION = "4.5.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const N = (AP.__nav = AP.__nav || {});

  const utils = {
    VERSION,
    safeLog:
      N.log?.safeLog ||
      ((...a) => {
        try {
          console.log(...a);
        } catch {}
      }),
    raf: N.time?.raf || ((cb) => setTimeout(cb, 16)),
    caf: N.time?.caf || ((id) => clearTimeout(id)),
    nowMs: N.time?.nowMs || (() => Date.now()),
    on: N.dom?.on || (() => false),
    off: N.dom?.off || (() => false),
    emit: N.dom?.emit || (() => false),
    q: N.dom?.q || (() => null),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    until: async (pred, { timeoutMs = 5000, intervalMs = 50 } = {}) => {
      const t0 = Date.now();
      while (Date.now() - t0 < timeoutMs) {
        try {
          const v = pred();
          if (v) return v;
        } catch {}
        await new Promise((r) => setTimeout(r, intervalMs));
      }
      return null;
    },
  };

  AP.nav = AP.nav || {};
  AP.nav.utils = utils;

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/utils/index.js"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:utils:index:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/flags.js");

/* ===== core/runtime/boot/nav/flags.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/flags.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/flags.js
(function () {
  "use strict";
  const VERSION = "4.6.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const U = ((AP.nav = AP.nav || {}), AP.nav.utils);

  const ls = (k, d) => {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : v;
    } catch {
      return d;
    }
  };
  const b = (k, d = "0") => ls(k, d) === "1";
  const n = (k, d) => {
    const v = Number(ls(k, String(d)));
    return Number.isFinite(v) ? v : d;
  };

  function readFlags() {
    const DISABLE_MO = b("ap_nav_disable_mo");
    const DISABLE_HISTORY = b("ap_nav_disable_history");
    const INTERVAL_MS = Math.max(400, n("ap_nav_interval_ms", 1500) || 1500);
    const MIN_INTERVAL = Math.max(0, n("ap_nav_min_interval_ms", 600) || 600);
    const OFF = b("ap_nav_off");
    const VIS_LISTENER = ls("ap_nav_vis_listener", "1") === "1";
    const BOOT_DELAY_MS = Math.max(
      0,
      n("ap_nav_boot_delay_ms", n("ap_boot_delay_ms", 0)) || 0
    );
    const SCOPE_SELECTOR = ls("ap_nav_scope_selector", "#__next, main, body");

    // New perf guards
    const BOOT_MODE = ls("ap_nav_boot_mode", "auto").toLowerCase(); // "auto" | "safe-first" | "aggressive"
    const WATCHDOG_WINDOW_MS = Math.max(
      1000,
      n("ap_nav_watchdog_window_ms", 4000) || 4000
    );
    const WATCHDOG_MAX = Math.max(50, n("ap_nav_watchdog_max", 120) || 120);

    // New MO tuning
    const MO_MICRO_BATCH = ls("ap_nav_mo_micro_batch", "1") === "1";
    const MO_THROTTLE_MS = Math.max(0, n("ap_nav_mo_throttle_ms", 0) || 0);

    // Route path guard
    const PATH_GUARD = ls("ap_nav_path_guard", "1") === "1";
    const PATH_BLOCKS = ls(
      "ap_nav_path_blocks",
      "/auth/,/login,/signin,/account"
    );

    // Query param overrides
    const QUERY_OVERRIDES = ls("ap_nav_query_overrides", "1") === "1";

    return {
      DISABLE_MO,
      DISABLE_HISTORY,
      INTERVAL_MS,
      MIN_INTERVAL,
      OFF,
      VIS_LISTENER,
      BOOT_DELAY_MS,
      SCOPE_SELECTOR,
      WATCHDOG_WINDOW_MS,
      WATCHDOG_MAX,
      PATH_GUARD,
      PATH_BLOCKS,
      QUERY_OVERRIDES,
      BOOT_MODE,
      MO_MICRO_BATCH,
      MO_THROTTLE_MS,
    };
  }

  AP.navFlags = { VERSION, readFlags };
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/flags.js"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:flags:ready", { version: VERSION, sample: readFlags() });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/hooks/history.js");

/* ===== core/runtime/boot/nav/hooks/history.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/hooks/history.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/hooks/history.js
(function () {
  "use strict";
  const VERSION = "4.5.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const U = ((AP.nav = AP.nav || {}), AP.nav.utils);
  const SYM =
    typeof Symbol === "function"
      ? Symbol.for("ap_history_patched")
      : "__ap_history_patched__";

  function installHistoryPatch(schedule) {
    const out = { ok: false, restore: () => {} };
    try {
      if (history[SYM]) return { ok: true, restore: () => {} };
      const origPush = history.pushState;
      const origReplace = history.replaceState;
      const pop = () => {
        try {
          schedule();
        } catch {}
      };

      history.pushState = function () {
        const r = origPush.apply(this, arguments);
        try {
          schedule();
        } catch {}
        return r;
      };
      history.replaceState = function () {
        const r = origReplace.apply(this, arguments);
        try {
          schedule();
        } catch {}
        return r;
      };
      window.addEventListener("popstate", pop);

      history[SYM] = { push: origPush, replace: origReplace, pop };
      out.ok = true;
      out.restore = () => {
        try {
          if (history[SYM]) {
            history.pushState = history[SYM].push;
            history.replaceState = history[SYM].replace;
            try {
              window.removeEventListener("popstate", history[SYM].pop);
            } catch {}
            try {
              delete history[SYM];
            } catch {}
          }
        } catch {}
      };
    } catch (e) {
      U?.safeLog?.("warn", "[AP][nav] history patch failed:", e?.message || e);
    }
    return out;
  }

  AP.navHooks = AP.navHooks || {};
  AP.navHooks.history = { VERSION, installHistoryPatch };
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/hooks/history.js"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:hooks:history:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/hooks/mutation.js");

/* ===== core/runtime/boot/nav/hooks/mutation.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/hooks/mutation.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/hooks/mutation.js
(function () {
  "use strict";
  const VERSION = "4.6.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const U = ((AP.nav = AP.nav || {}), AP.nav.utils);

  // Scoped + micro-batched + throttled MutationObserver
  function installMutationObserver(
    schedule,
    { root = null, subtree = true, microBatch = true, throttleMs = 0 } = {}
  ) {
    const out = { ok: false, disconnect: () => {} };
    try {
      const target = root || document.body || document.documentElement;
      if (!target) throw new Error("no target");

      let queued = false;
      let last = 0;

      const invoke = () => {
        // rAF-bound delivery to align with paint
        const deliver = () => {
          const now = Date.now();
          if (throttleMs > 0 && now - last < throttleMs) return; // skip frequent bursts
          last = now;
          try {
            schedule();
          } catch {}
        };

        if (microBatch) {
          if (queued) return;
          queued = true;
          queueMicrotask(() => {
            queued = false;
            (U.raf || requestAnimationFrame)(deliver);
          });
        } else {
          (U.raf || requestAnimationFrame)(deliver);
        }
      };

      const mo = new MutationObserver(invoke);
      mo.observe(target, { childList: true, subtree: !!subtree });
      out.ok = true;
      out.disconnect = () => {
        try {
          mo.disconnect();
        } catch {}
      };
    } catch (e) {
      U?.safeLog?.(
        "warn",
        "[AP][nav] MutationObserver unavailable:",
        e?.message || e
      );
    }
    return out;
  }

  AP.navHooks = AP.navHooks || {};
  AP.navHooks.mutation = { VERSION, installMutationObserver };
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/hooks/mutation.js"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:hooks:mutation:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/hooks/interval.js");

/* ===== core/runtime/boot/nav/hooks/interval.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/hooks/interval.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/hooks/interval.js
(function () {
  "use strict";
  const VERSION = "4.5.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  function installIntervalFallback(schedule, ms) {
    let id = 0;
    return {
      ok: true,
      start() {
        if (!id)
          id = setInterval(() => {
            try {
              schedule();
            } catch {}
          }, ms);
      },
      stop() {
        try {
          if (id) clearInterval(id);
        } catch {}
        id = 0;
      },
    };
  }

  AP.navHooks = AP.navHooks || {};
  AP.navHooks.interval = { VERSION, installIntervalFallback };
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/hooks/interval.js"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:hooks:interval:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/hooks/index.js");

/* ===== core/runtime/boot/nav/hooks/index.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/hooks/index.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/hooks/index.js
(function () {
  "use strict";
  const VERSION = "4.6.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  // Visibility hook lives here and is always available.
  function installVisibilityHook(schedule) {
    const handler = () => {
      if (document.visibilityState === "visible") {
        try {
          schedule();
        } catch {}
      }
    };
    try {
      document.addEventListener("visibilitychange", handler);
    } catch {}
    return () => {
      try {
        document.removeEventListener("visibilitychange", handler);
      } catch {}
    };
  }

  // Delegating wrappers — resolve latest submodule impls at call time.
  function installHistoryPatch() {
    const fn = AP.navHooks?.history?.installHistoryPatch;
    return typeof fn === "function"
      ? fn.apply(this, arguments)
      : { ok: false, restore: () => {} };
  }
  function installMutationObserver() {
    const fn = AP.navHooks?.mutation?.installMutationObserver;
    return typeof fn === "function"
      ? fn.apply(this, arguments)
      : { ok: false, disconnect: () => {} };
  }
  function installIntervalFallback() {
    const fn = AP.navHooks?.interval?.installIntervalFallback;
    return typeof fn === "function"
      ? fn.apply(this, arguments)
      : { ok: false, start() {}, stop() {} };
  }

  // Merge instead of overwrite so late-loading submodules can attach under AP.navHooks.*
  AP.navHooks = Object.assign(AP.navHooks || {}, {
    VERSION,
    installHistoryPatch,
    installMutationObserver,
    installIntervalFallback,
    installVisibilityHook,
  });

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/hooks/index.js@4.6.0"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:hooks:index:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/route/changed.js");

/* ===== core/runtime/boot/nav/route/changed.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/route/changed.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/route/changed.js
(function () {
  "use strict";
  const VERSION = "4.5.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const U = ((AP.nav = AP.nav || {}), AP.nav.utils);

  function routeChangedFactory(state) {
    return function routeChanged(prev, next) {
      try {
        AP.mountPoint?.mountPanelWhenReady?.();
      } catch {}
      try {
        U.emit("ap:route", { prev, next });
      } catch {}

      // Non-blocking composer poke
      try {
        if (AP.composerDetect?.probe) {
          AP.composerDetect
            .probe(Number(localStorage.getItem("ap_detect_timeout_ms")) || 800)
            .then((r) => {
              U.safeLog?.(
                "info",
                `[AP][nav] composer probe: input=${!!r?.input} send=${!!r?.send}`
              );
              try {
                AP.boot?.cp?.("nav:composer:probe", {
                  input: !!r?.input,
                  send: !!r?.send,
                });
              } catch {}
            })
            .catch((e) =>
              U.safeLog?.(
                "warn",
                "[AP][nav] composer probe error:",
                e?.message || e
              )
            );
        } else if (AP.composerDetect?.findComposer) {
          AP.composerDetect.findComposer({ allowInputOnly: true }).then((r) => {
            U.safeLog?.(
              "info",
              `[AP][nav] composer find: input=${!!r?.input} send=${!!r?.send}`
            );
            try {
              AP.boot?.cp?.("nav:composer:find", {
                input: !!r?.input,
                send: !!r?.send,
              });
            } catch {}
          });
        }
      } catch {}
    };
  }

  AP.navRoute = AP.navRoute || {};
  AP.navRoute.changed = { VERSION, routeChangedFactory };
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/route/changed.js"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:route:changed:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/route/schedule.js");

/* ===== core/runtime/boot/nav/route/schedule.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/route/schedule.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/route/schedule.js
(function () {
  "use strict";
  const VERSION = "4.5.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const U = ((AP.nav = AP.nav || {}), AP.nav.utils);

  function scheduleFactory(state, routeChanged) {
    return function scheduleCheck() {
      if (state.ticking) return;
      state.ticking = true;
      state.rafId = (U.raf || requestAnimationFrame)(() => {
        state.ticking = false;
        if (location.href === state.lastHref) return;
        const prev = state.lastHref;
        state.lastHref = location.href;
        U.safeLog?.(
          "info",
          `[AP][nav] route change: ${prev} -> ${state.lastHref}`
        );
        routeChanged(prev, state.lastHref);
      });
    };
  }

  AP.navRoute = AP.navRoute || {};
  AP.navRoute.schedule = { VERSION, scheduleFactory };
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/route/schedule.js"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:route:schedule:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/route/index.js");

/* ===== core/runtime/boot/nav/route/index.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/route/index.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/route/index.js
(function () {
  "use strict";
  const VERSION = "4.6.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  // Delegating wrappers — defer lookup so load order doesn't matter.
  function routeChangedFactory() {
    const fn = AP.navRoute?.changed?.routeChangedFactory;
    return typeof fn === "function" ? fn.apply(this, arguments) : () => {};
  }

  function scheduleFactory() {
    const fn = AP.navRoute?.schedule?.scheduleFactory;
    return typeof fn === "function" ? fn.apply(this, arguments) : () => {};
  }

  // Merge; keep submodules (changed/schedule) intact if they load before/after.
  AP.navRoute = Object.assign(AP.navRoute || {}, {
    VERSION,
    routeChangedFactory,
    scheduleFactory,
  });

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/route/index.js@4.6.0"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:route:index:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/scheduler.js");

/* ===== core/runtime/boot/nav/scheduler.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/scheduler.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/scheduler.js
(function () {
  "use strict";
  const VERSION = "4.5.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  function makeDebouncedScheduler(rawScheduleCheck, minIntervalMs) {
    let lastTick = 0,
      timer = 0;
    function scheduleCheck() {
      const now = Date.now();
      const delta = now - lastTick;
      if (delta < minIntervalMs) {
        if (!timer) {
          timer = setTimeout(() => {
            timer = 0;
            lastTick = Date.now();
            rawScheduleCheck();
          }, Math.max(0, minIntervalMs - delta));
        }
        return;
      }
      lastTick = now;
      rawScheduleCheck();
    }
    return {
      scheduleCheck,
      _getState: () => ({ lastTick, timer, minIntervalMs }),
    };
  }
  AP.navScheduler = { VERSION, makeDebouncedScheduler };
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/scheduler.js"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:scheduler:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/state.js");

/* ===== core/runtime/boot/nav/state.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/state.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/state.js
(function () {
  "use strict";
  const VERSION = "4.5.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const U = ((AP.nav = AP.nav || {}), AP.nav.utils);

  function createState() {
    return {
      // Unset so the first schedule tick counts as a change
      lastHref: null,
      rafId: 0,
      ticking: false,
      visDispose: null,
      historyRestore: () => {},
      moDisconnect: () => {},
      intervalCtl: null,
      started: false,
    };
  }

  function stopAll(state) {
    try {
      if (state.rafId) U.caf(state.rafId);
    } catch {}
    state.rafId = 0;
    state.ticking = false;
    try {
      state.historyRestore && state.historyRestore();
    } catch {}
    state.historyRestore = () => {};
    try {
      state.moDisconnect && state.moDisconnect();
    } catch {}
    state.moDisconnect = () => {};
    try {
      state.intervalCtl && state.intervalCtl.stop && state.intervalCtl.stop();
    } catch {}
    state.intervalCtl = null;
    try {
      state.visDispose && state.visDispose();
    } catch {}
    state.visDispose = null;
    state.started = false;
  }

  AP.navState = { VERSION, createState, stopAll };
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/state.js"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:state:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/boot/computeFlags.js");

/* ===== core/runtime/boot/nav/boot/computeFlags.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/boot/computeFlags.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/boot/computeFlags.js
(function () {
  "use strict";
  const VERSION = "4.10.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const F = AP.navFlags;

  function getQuery() {
    try {
      return new URLSearchParams(location.search);
    } catch {
      return new URLSearchParams();
    }
  }

  function n(v, d) {
    const x = Number(v);
    return Number.isFinite(x) ? x : d;
  }

  function b(v, d = false) {
    if (v == null) return d;
    return String(v) === "1" || String(v).toLowerCase() === "true";
  }

  function computeFlags(base) {
    const q = getQuery();
    const flags = { ...(base || {}) };

    // ---- DEFAULTS (ensure sane boot-on-by-default) ----
    if (flags.OFF == null) flags.OFF = false; // <— previously inherited as true in some builds
    if (flags.DISABLE_MO == null) flags.DISABLE_MO = false;
    if (flags.DISABLE_HISTORY == null) flags.DISABLE_HISTORY = false;
    if (flags.VIS_LISTENER == null) flags.VIS_LISTENER = true;
    if (flags.QUERY_OVERRIDES == null) flags.QUERY_OVERRIDES = true;
    if (flags.PATH_GUARD == null) flags.PATH_GUARD = true;
    if (!flags.PATH_BLOCKS)
      flags.PATH_BLOCKS = "/auth/,/login,/signin,/account";

    // Timings & perf defaults
    if (flags.INTERVAL_MS == null) flags.INTERVAL_MS = 1500;
    if (flags.MIN_INTERVAL == null) flags.MIN_INTERVAL = 600;
    if (flags.MO_MICRO_BATCH == null) flags.MO_MICRO_BATCH = true;
    if (flags.MO_THROTTLE_MS == null) flags.MO_THROTTLE_MS = 0;
    if (flags.LONGTASK_WINDOW_MS == null) flags.LONGTASK_WINDOW_MS = 4000;
    if (flags.LONGTASK_BUDGET_MS == null) flags.LONGTASK_BUDGET_MS = 250;
    if (flags.WATCHDOG_WINDOW_MS == null) flags.WATCHDOG_WINDOW_MS = 4000;
    if (flags.WATCHDOG_MAX == null) flags.WATCHDOG_MAX = 120;
    if (!flags.SCOPE_SELECTOR) flags.SCOPE_SELECTOR = "#__next, main, body";
    if (flags.BOOT_DELAY_MS == null) flags.BOOT_DELAY_MS = 300;
    if (!flags.BOOT_MODE) flags.BOOT_MODE = "auto";

    // ---- QUERY OVERRIDES ----
    if (flags.QUERY_OVERRIDES) {
      // global off toggles
      const off = q.get("ap_nav_off") ?? q.get("ap_off");
      if (off != null) flags.OFF = b(off, false);

      // safety preset
      if (q.get("ap_safe") === "1") {
        flags.DISABLE_MO = true;
        flags.DISABLE_HISTORY = true;
        flags.INTERVAL_MS = Math.max(flags.INTERVAL_MS || 1200, 2000);
        flags.BOOT_MODE = "safe-first";
      }

      const bd = n(
        q.get("ap_nav_boot_delay_ms") || q.get("ap_boot_delay_ms"),
        flags.BOOT_DELAY_MS
      );
      if (bd >= 0) flags.BOOT_DELAY_MS = bd;

      const scope = q.get("ap_nav_scope_selector");
      if (scope) flags.SCOPE_SELECTOR = scope;

      const mode = q.get("ap_nav_boot_mode");
      if (mode) flags.BOOT_MODE = mode;

      const moThrottle = q.get("ap_nav_mo_throttle_ms");
      if (moThrottle != null)
        flags.MO_THROTTLE_MS = Math.max(0, n(moThrottle, flags.MO_THROTTLE_MS));

      const microBatch = q.get("ap_nav_mo_micro_batch");
      if (microBatch != null) flags.MO_MICRO_BATCH = b(microBatch, true);

      const ltWin = q.get("ap_nav_longtask_window_ms");
      if (ltWin != null)
        flags.LONGTASK_WINDOW_MS = Math.max(
          1000,
          n(ltWin, flags.LONGTASK_WINDOW_MS)
        );

      const ltBudget = q.get("ap_nav_longtask_budget_ms");
      if (ltBudget != null)
        flags.LONGTASK_BUDGET_MS = Math.max(
          0,
          n(ltBudget, flags.LONGTASK_BUDGET_MS)
        );

      const minDebounce = q.get("ap_nav_min_interval_ms");
      if (minDebounce != null)
        flags.MIN_INTERVAL = Math.max(0, n(minDebounce, flags.MIN_INTERVAL));

      const interval = q.get("ap_nav_interval_ms") || q.get("ap_nav_interval");
      if (interval != null)
        flags.INTERVAL_MS = Math.max(0, n(interval, flags.INTERVAL_MS));

      const disMo = q.get("ap_nav_disable_mo");
      if (disMo != null) flags.DISABLE_MO = b(disMo, flags.DISABLE_MO);

      const disHist = q.get("ap_nav_disable_history");
      if (disHist != null)
        flags.DISABLE_HISTORY = b(disHist, flags.DISABLE_HISTORY);

      const vis = q.get("ap_nav_vis_listener");
      if (vis != null) flags.VIS_LISTENER = b(vis, flags.VIS_LISTENER);

      const pathGuard = q.get("ap_nav_path_guard");
      if (pathGuard != null) flags.PATH_GUARD = b(pathGuard, flags.PATH_GUARD);

      const pathBlocks = q.get("ap_nav_path_blocks");
      if (pathBlocks) flags.PATH_BLOCKS = pathBlocks;
    }

    return flags;
  }

  AP.navBoot = AP.navBoot || {};
  AP.navBoot.computeFlags = { VERSION, computeFlags };

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/boot/computeFlags.js@4.10.0"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:boot:computeFlags:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/boot/guards.js");

/* ===== core/runtime/boot/nav/boot/guards.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/boot/guards.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/boot/guards.js
(function () {
  "use strict";
  const VERSION = "4.7.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  function compilePathBlocks(str) {
    const parts = (str || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.map((p) => {
      if (p.startsWith("/") && p.endsWith("/")) {
        const inner = p.slice(1, -1);
        try {
          return new RegExp(inner);
        } catch {
          return new RegExp(inner.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        }
      }
      return new RegExp("^" + p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    });
  }
  function pathBlocked(flags) {
    if (!flags.PATH_GUARD) return false;
    try {
      const reList = compilePathBlocks(flags.PATH_BLOCKS);
      return reList.some((re) => re.test(location.pathname || "/"));
    } catch {
      return false;
    }
  }
  AP.navBoot = AP.navBoot || {};
  AP.navBoot.guards = { VERSION, pathBlocked };
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/boot/guards.js@4.7.0"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:boot:guards:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/boot/ready.js");

/* ===== core/runtime/boot/nav/boot/ready.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/boot/ready.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/boot/ready.js
(function () {
  "use strict";
  const VERSION = "4.7.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const U = ((AP.nav = AP.nav || {}), AP.nav.utils);

  function waitDom() {
    if (document.readyState !== "loading") return Promise.resolve();
    return new Promise((r) =>
      document.addEventListener("DOMContentLoaded", r, { once: true })
    );
  }

  function waitVisible() {
    if (document.visibilityState === "visible") return Promise.resolve();
    return new Promise((r) => {
      const onVis = () => {
        if (document.visibilityState === "visible") {
          document.removeEventListener("visibilitychange", onVis);
          r();
        }
      };
      document.addEventListener("visibilitychange", onVis);
    });
  }

  function waitFCP(timeoutMs = 1200) {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      try {
        const po = new PerformanceObserver((list) => {
          const entries = list.getEntriesByName("first-contentful-paint");
          if (entries && entries.length) finish();
        });
        po.observe({ type: "paint", buffered: true });
        setTimeout(() => {
          try {
            po.disconnect();
          } catch {}
          finish();
        }, timeoutMs);
      } catch {
        setTimeout(finish, timeoutMs);
      }
    });
  }

  async function waitForReady(flags) {
    await waitDom();
    if (flags.BOOT_DELAY_MS > 0)
      await new Promise((r) => setTimeout(r, flags.BOOT_DELAY_MS));
    await waitVisible();
    // Configurable FCP wait for slower apps (default 1200ms)
    const FCP_MS = Number(localStorage.getItem("ap_nav_fcp_ms")) || 1200;
    await waitFCP(FCP_MS);
    await U.until(() => U.q?.(flags.SCOPE_SELECTOR), {
      timeoutMs: 2500,
      intervalMs: 50,
    });
  }

  AP.navBoot = AP.navBoot || {};
  AP.navBoot.ready = { VERSION, waitForReady };
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/boot/ready.js@4.7.0"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:boot:ready:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/boot/watchdog.js");

/* ===== core/runtime/boot/nav/boot/watchdog.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/boot/watchdog.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/boot/watchdog.js
(function () {
  "use strict";
  const VERSION = "4.7.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const U = ((AP.nav = AP.nav || {}), AP.nav.utils);

  function createWatchdog(flags, state, scheduleCheck) {
    const hits = [];
    let downgraded = false;
    return function bump() {
      const now = Date.now();
      hits.push(now);
      while (hits.length && now - hits[0] > (flags.WATCHDOG_WINDOW_MS || 2000))
        hits.shift();
      if (!downgraded && hits.length > (flags.WATCHDOG_MAX || 12)) {
        downgraded = true;
        try {
          state.moDisconnect?.();
        } catch {}
        if (!state.intervalCtl) {
          let id = 0;
          state.intervalCtl = {
            start() {
              if (!id)
                id = setInterval(
                  scheduleCheck,
                  Math.max(300, flags.INTERVAL_MS || 1200)
                );
            },
            stop() {
              try {
                if (id) clearInterval(id);
              } catch {}
              id = 0;
            },
          };
        }
        state.intervalCtl.start();
        try {
          AP.navBoot?.telemetry?.downgrade?.({
            intervalMs: flags.INTERVAL_MS,
          });
        } catch {}
        U?.safeLog?.(
          "warn",
          `[AP][nav] watchdog: MO disabled; interval=${flags.INTERVAL_MS}ms`
        );
      }
    };
  }

  AP.navBoot = AP.navBoot || {};
  AP.navBoot.watchdog = { VERSION, createWatchdog };
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/boot/watchdog.js@4.7.0"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:boot:watchdog:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/devtools/telemetry/nav.boot.telemetry.js");

/* ===== core/devtools/telemetry/nav.boot.telemetry.js ===== */
(function(){var __AP_MOD="/core/devtools/telemetry/nav.boot.telemetry.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/boot/telemetry.js
(function () {
  "use strict";
  const VERSION = "4.8.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  function emit(event, data) {
    try {
      AP.boot?.cp?.(event, data || {});
    } catch {}
  }
  const Telemetry = {
    VERSION,
    ready(payload) {
      emit("boot:nav:ready", payload);
    },
    off(payload) {
      emit("boot:nav:off", payload);
    },
    downgrade(payload) {
      emit("boot:nav:watchdog:downgrade", payload);
    },
    flags(payload) {
      emit("boot:nav:index:flags", payload);
    },
    upgrade(payload) {
      emit("boot:nav:upgrade", payload);
    },
  };
  AP.navBoot = AP.navBoot || {};
  AP.navBoot.telemetry = Telemetry;

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/boot/telemetry.js@4.8.0"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:boot:telemetry:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/boot/schedulers.js");

/* ===== core/runtime/boot/nav/boot/schedulers.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/boot/schedulers.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/boot/schedulers.js
(function () {
  "use strict";
  const VERSION = "4.8.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const R = AP.navRoute;
  const SCHED = AP.navScheduler;
  const BootWatch = AP.navBoot?.watchdog;

  function buildSchedulers(state, flags) {
    const routeChanged = R?.routeChangedFactory
      ? R.routeChangedFactory(state)
      : () => {};
    const rawSchedule = R?.scheduleFactory
      ? R.scheduleFactory(state, routeChanged)
      : () => {};
    const sched = SCHED?.makeDebouncedScheduler
      ? SCHED.makeDebouncedScheduler(
          rawSchedule,
          Math.max(0, flags.MIN_INTERVAL || 600)
        )
      : { scheduleCheck: rawSchedule };

    const scheduleCheck = sched.scheduleCheck;
    const bump =
      BootWatch?.createWatchdog?.(flags, state, scheduleCheck) || (() => {});
    const scheduleChecked = () => {
      bump();
      scheduleCheck();
    };

    return { VERSION, routeChanged, scheduleCheck, scheduleChecked };
  }

  AP.navBoot = AP.navBoot || {};
  AP.navBoot.schedulers = { VERSION, buildSchedulers };

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/boot/schedulers.js@4.8.0"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:boot:schedulers:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/boot/install.js");

/* ===== core/runtime/boot/nav/boot/install.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/boot/install.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/boot/install.js
(function () {
  "use strict";
  const VERSION = "4.9.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const U = ((AP.nav = AP.nav || {}), AP.nav.utils);
  const H = AP.navHooks;

  function throttle(fn, ms) {
    if (!ms || ms <= 0) return fn;
    let last = 0;
    let pending = 0;
    return function throttled() {
      const now = Date.now();
      if (now - last >= ms) {
        last = now;
        try {
          fn.apply(this, arguments);
        } catch {}
      } else if (!pending) {
        pending = 1;
        const delay = Math.max(0, ms - (now - last));
        setTimeout(() => {
          pending = 0;
          last = Date.now();
          try {
            fn.apply(this, arguments);
          } catch {}
        }, delay);
      }
    };
  }

  function installAll(flags, state, scheduleChecked) {
    if (!flags.DISABLE_HISTORY) {
      const hp = H?.installHistoryPatch?.(scheduleChecked);
      if (hp?.ok) state.historyRestore = hp.restore;
    }

    if (!flags.DISABLE_MO) {
      const root =
        U.q?.(flags.SCOPE_SELECTOR) ||
        document.body ||
        document.documentElement;

      const cb = throttle(scheduleChecked, flags.MO_THROTTLE_MS || 0);
      const mo = H?.installMutationObserver?.(cb, {
        root,
        subtree: true,
        microBatch: !!flags.MO_MICRO_BATCH,
        // ensure the MutationObserver’s internal delivery is also throttled
        throttleMs: Math.max(0, flags.MO_THROTTLE_MS || 0),
      });
      if (mo?.ok) state.moDisconnect = mo.disconnect;
    }

    const needInterval =
      (flags.DISABLE_HISTORY && flags.DISABLE_MO) ||
      (!state.historyRestore && !state.moDisconnect);

    if (needInterval) {
      const iv = H?.installIntervalFallback?.(
        scheduleChecked,
        flags.INTERVAL_MS
      );
      state.intervalCtl = iv;
      iv?.start?.();
    }

    if (flags.VIS_LISTENER) {
      try {
        state.visDispose = H?.installVisibilityHook?.(scheduleChecked);
      } catch {}
    }

    return { via: state.intervalCtl ? "interval" : "hooks" };
  }

  AP.navBoot = AP.navBoot || {};
  AP.navBoot.install = { VERSION, installAll };

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/boot/install.js@4.9.0"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:boot:install:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/boot/interval.js");

/* ===== core/runtime/boot/nav/boot/interval.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/boot/interval.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/boot/interval.js
(function () {
  "use strict";
  const VERSION = "4.8.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  function startInterval(state, scheduleChecked, ms) {
    let id = 0;
    const ctl = {
      start() {
        if (!id) id = setInterval(scheduleChecked, ms);
      },
      stop() {
        try {
          if (id) clearInterval(id);
        } catch {}
        id = 0;
      },
    };
    state.intervalCtl = ctl;
    ctl.start();
    return ctl;
  }

  AP.navBoot = AP.navBoot || {};
  AP.navBoot.interval = { VERSION, startInterval };

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/boot/interval.js@4.8.0"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:boot:interval:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/boot/longtask.js");

/* ===== core/runtime/boot/nav/boot/longtask.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/boot/longtask.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/boot/longtask.js
(function () {
  "use strict";
  const VERSION = "4.8.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const U = ((AP.nav = AP.nav || {}), AP.nav.utils);

  function start(flags, state, scheduleCheck) {
    if (typeof PerformanceObserver !== "function") return { stop() {} };
    let downgraded = false;
    let buf = [];

    const windowMs = Math.max(1000, flags.LONGTASK_WINDOW_MS || 4000);
    const budgetMs = Math.max(0, flags.LONGTASK_BUDGET_MS || 250);

    let po;
    try {
      po = new PerformanceObserver((list) => {
        const now =
          performance && typeof performance.now === "function"
            ? performance.now()
            : Date.now();

        // accumulate long tasks durations inside window
        for (const e of list.getEntries()) {
          const dur = e.duration || 0;
          buf.push({ t: now, d: dur });
        }
        const cutoff = now - windowMs;
        buf = buf.filter((x) => x.t >= cutoff);

        const total = buf.reduce((a, x) => a + x.d, 0);

        if (!downgraded && total > budgetMs) {
          downgraded = true;
          try {
            state.moDisconnect?.();
          } catch {}
          if (!state.intervalCtl) {
            let id = 0;
            state.intervalCtl = {
              start() {
                if (!id) id = setInterval(scheduleCheck, flags.INTERVAL_MS);
              },
              stop() {
                try {
                  if (id) clearInterval(id);
                } catch {}
                id = 0;
              },
            };
          }
          state.intervalCtl.start();
          try {
            AP.boot?.cp?.("boot:nav:longtask:downgrade", {
              intervalMs: flags.INTERVAL_MS,
              total,
              windowMs,
            });
          } catch {}
          U?.safeLog?.(
            "warn",
            `[AP][nav] longtask downgrade: ${total.toFixed(
              0
            )}ms/${windowMs}ms; interval=${flags.INTERVAL_MS}ms`
          );
        }
      });
      po.observe({ type: "longtask", buffered: true });
    } catch {
      return { stop() {} };
    }

    return {
      stop() {
        try {
          po.disconnect();
        } catch {}
      },
    };
  }

  AP.navBoot = AP.navBoot || {};
  AP.navBoot.longtask = { VERSION, start };
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/boot/longtask.js"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:boot:longtask:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/boot/strategy.js");

/* ===== core/runtime/boot/nav/boot/strategy.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/boot/strategy.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/boot/strategy.js
(function () {
  "use strict";
  const VERSION = "4.8.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const BootInstall = AP.navBoot?.install;
  const BootInterval = AP.navBoot?.interval;

  function upgradeWhenIdle(state, installFn, scheduleChecked) {
    const idle =
      window.requestIdleCallback ||
      ((cb) =>
        setTimeout(
          () => cb({ didTimeout: false, timeRemaining: () => 50 }),
          700
        ));
    idle(() => {
      try {
        state.intervalCtl?.stop?.();
      } catch {}
      installFn();
      scheduleChecked();
      try {
        AP.navBoot?.telemetry?.upgrade?.({
          via: state.intervalCtl ? "interval" : "hooks",
        });
      } catch {}
    });
  }

  function runStrategy(flags, state, scheduleChecked) {
    const install = () =>
      BootInstall?.installAll?.(flags, state, scheduleChecked);
    const mode = (flags.BOOT_MODE || "auto").toLowerCase();

    if (mode === "safe-first") {
      BootInterval?.startInterval?.(state, scheduleChecked, flags.INTERVAL_MS);
      upgradeWhenIdle(state, install, scheduleChecked);
      return { via: "interval", mode };
    }

    if (mode === "aggressive") {
      const out = install();
      return { via: out?.via || "hooks", mode };
    }

    const out = install();
    return { via: out?.via || "hooks", mode: "auto" };
  }

  AP.navBoot = AP.navBoot || {};
  AP.navBoot.strategy = { VERSION, runStrategy };

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/boot/strategy.js@4.8.0"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:boot:strategy:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/boot/start.js");

/* ===== core/runtime/boot/nav/boot/start.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/boot/start.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/boot/start.js
(function () {
  "use strict";
  const VERSION = "4.9.1";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const U = ((AP.nav = AP.nav || {}), AP.nav.utils);

  const F = AP.navFlags;
  const S = AP.navState;
  const BootFlags = AP.navBoot?.computeFlags;
  const BootReady = AP.navBoot?.ready;
  const BootGuards = AP.navBoot?.guards;
  const Schedulers = AP.navBoot?.schedulers;
  const Strategy = AP.navBoot?.strategy;
  const Telemetry = AP.navBoot?.telemetry;
  const Interval = AP.navBoot?.interval;
  const LongTask = AP.navBoot?.longtask;

  const INPUT_ONLY_LS_KEY = "ap_detect_input_only";

  let started = false;

  function teardownFromState(state) {
    try {
      state.moDisconnect?.();
    } catch {}
    try {
      state.intervalCtl?.stop?.();
    } catch {}
    try {
      state.historyRestore?.();
    } catch {}
    try {
      state.visDispose?.();
    } catch {}
    try {
      state.ltStop?.();
    } catch {}
    try {
      S?.stopAll?.(state);
    } catch {}
  }

  // Enable input-only detection so the first probe does not require a "Send" button.
  function enableInputOnlyForFirstProbe() {
    try {
      localStorage.setItem(INPUT_ONLY_LS_KEY, "1");
      U?.safeLog?.(
        "info",
        "[AP][nav] input-only detection enabled for first probe"
      );
    } catch {}
  }

  function start() {
    if (started) {
      Telemetry?.ready?.({ version: VERSION, via: "idempotent" });
      return true;
    }

    const baseFlags = F?.readFlags ? F.readFlags() : {};
    const flags = BootFlags?.computeFlags
      ? BootFlags.computeFlags(baseFlags)
      : baseFlags;

    if (flags.OFF) {
      Telemetry?.off?.({ version: VERSION });
      U?.safeLog?.("warn", "[AP][nav] OFF — nav boot skipped");
      return false;
    }

    const state = S?.createState
      ? S.createState()
      : { lastHref: location.href };

    const schedPack = Schedulers?.buildSchedulers?.(state, flags) || {};
    const scheduleChecked =
      typeof schedPack.scheduleChecked === "function"
        ? schedPack.scheduleChecked
        : function () {};

    if (BootGuards?.pathBlocked?.(flags)) {
      Interval?.startInterval?.(
        state,
        scheduleChecked,
        Math.max(flags.INTERVAL_MS || 1200, 2000)
      );
      Telemetry?.ready?.({
        version: VERSION,
        via: "interval:path-block",
        intervalMs: Math.max(flags.INTERVAL_MS || 1200, 2000),
        minInterval: flags.MIN_INTERVAL,
        scope: flags.SCOPE_SELECTOR,
        blockedPath: location.pathname,
      });
      AP.navWatch = AP.navWatch || {};
      AP.navWatch.teardown = () => teardownFromState(state);
      AP.nav.startState = state;
      AP.nav.scheduleCheck = scheduleChecked;
      started = true;
      return true;
    }

    (BootReady?.waitForReady?.(flags) || Promise.resolve()).then(() => {
      // Allow input-only detection on the first route probe (send may enable only after typing)
      enableInputOnlyForFirstProbe();

      // Fire an explicit initial route change so probes run on first load.
      if (state.lastHref == null || state.lastHref === "") {
        try {
          schedPack?.routeChanged?.(null, location.href);
        } catch {}
        // Prevent the next scheduleCheck() from double-firing the same route.
        state.lastHref = location.href;
      }

      const strat =
        Strategy?.runStrategy?.(flags, state, scheduleChecked) || {};
      const via = strat.via || "hooks";
      const mode = strat.mode || "auto";

      const lt = LongTask?.start?.(flags, state, scheduleChecked);
      if (lt && typeof lt.stop === "function") state.ltStop = lt.stop;

      Telemetry?.ready?.({
        version: VERSION,
        via,
        disableMo: !!flags.DISABLE_MO,
        disableHistory: !!flags.DISABLE_HISTORY,
        intervalMs: via === "interval" ? flags.INTERVAL_MS : undefined,
        minInterval: flags.MIN_INTERVAL,
        scope: flags.SCOPE_SELECTOR,
        bootDelayMs: flags.BOOT_DELAY_MS,
        bootMode: mode,
      });

      AP.navWatch = AP.navWatch || {};
      AP.navWatch.teardown = () => teardownFromState(state);
      AP.nav.startState = state;
      AP.nav.scheduleCheck = scheduleChecked;

      const idle =
        window.requestIdleCallback ||
        ((cb) =>
          setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 })));
      idle(() => scheduleChecked());
    });

    started = true;
    return true;
  }

  AP.navBoot = AP.navBoot || {};
  AP.navBoot.start = { VERSION, start };

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/boot/start.js@4.9.1"
    );
  } catch {}
  try {
    AP.boot?.cp?.("nav:boot:start:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/boot/index.js");

/* ===== core/runtime/boot/nav/boot/index.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/boot/index.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/index.js
(function () {
  "use strict";
  const VERSION = "4.7.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/index.js@4.7.0"
    );
  } catch {}

  function start() {
    return AP.navBoot?.start?.start?.() === false ? false : true;
  }

  function teardown() {
    try {
      if (AP.nav?.startState) {
        AP.navWatch?.teardown?.();
      }
    } catch {}
  }

  AP.nav = Object.assign(AP.nav || {}, { start, teardown, VERSION });

  try {
    const flags = AP.navFlags?.readFlags ? AP.navFlags.readFlags() : {};
    AP.navBoot?.telemetry?.flags?.(flags);
    AP.boot?.cp?.("boot:nav:index:flags", flags);
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/utils.js");

/* ===== core/runtime/boot/nav/utils.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/utils.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/utils.js
(function () {
  "use strict";
  const VERSION = "4.5.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  // Facade: prefer modular utils; if absent, minimal fallback.
  if (!AP.nav) AP.nav = {};
  if (!AP.nav.utils) {
    AP.nav.utils = {
      VERSION,
      safeLog: (...a) => {
        try {
          console.log(...a);
        } catch {}
      },
      raf: (cb) => setTimeout(cb, 16),
      caf: (id) => clearTimeout(id),
      nowMs: () => Date.now(),
      on: () => false,
      off: () => false,
      emit: () => false,
      q: () => null,
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      until: async (pred, { timeoutMs = 5000, intervalMs = 50 } = {}) => {
        const t0 = Date.now();
        while (Date.now() - t0 < timeoutMs) {
          try {
            const v = pred();
            if (v) return v;
          } catch {}
          await new Promise((r) => setTimeout(r, intervalMs));
        }
        return null;
      },
    };
  }
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/utils.js"
    );
  } catch {}
  try {
    AP.boot?.cp?.("boot:nav:utils:facade:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/route.js");

/* ===== core/runtime/boot/nav/route.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/route.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/route.js
(function () {
  "use strict";
  const VERSION = "4.5.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  // Facade: route API provided by route/index.js
  AP.navRoute = AP.navRoute || {};
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/route.js"
    );
  } catch {}
  try {
    AP.boot?.cp?.("boot:nav:route:facade:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/hooks.js");

/* ===== core/runtime/boot/nav/hooks.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/hooks.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/hooks.js
(function () {
  "use strict";
  const VERSION = "4.5.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  // Facade: re-export modular hooks API
  AP.navHooks = AP.navHooks || {};
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/hooks.js"
    );
  } catch {}
  try {
    AP.boot?.cp?.("boot:nav:hooks:facade:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/nav/index.js");

/* ===== core/runtime/boot/nav/index.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/nav/index.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/nav/index.js
(function () {
  "use strict";
  const VERSION = "4.6.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  function start() {
    if (AP.navBoot?.start?.start) return AP.navBoot.start.start();
    // minimal fallback (shouldn't happen in normal build)
    try {
      console.warn("[AP][nav] navBoot.start missing; nav disabled");
    } catch {}
    return false;
  }

  function teardown() {
    if (AP.navBoot?.start?.teardown) return AP.navBoot.start.teardown();
  }

  AP.nav = Object.assign(AP.nav || {}, { VERSION, start, teardown });

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/nav/index.js"
    );
  } catch {}
  try {
    const F =
      AP.navFlags && AP.navFlags.readFlags ? AP.navFlags.readFlags() : {};
    AP.boot?.cp?.("boot:nav:index:flags", F);
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/startGate.js");

/* ===== core/runtime/boot/startGate.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/startGate.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/startGate.js
(function () {
  "use strict";
  const VERSION = "4.3.2";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.__startGateReady) {
    try {
      AP.boot?.cp?.("startGate:init", { version: VERSION, reused: true });
    } catch {}
    return;
  }
  AP.__startGateReady = true;
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/startGate.js"
    );
  } catch {}

  const L = () => AP.logger || console;

  function safeLog(level, ...args) {
    try {
      const base = L();
      const fn = (base && base[level]) || base.log || console.log;
      if (typeof fn === "function") fn(...args);
      else console.log(...args);
    } catch {
      try {
        console.log(...args);
      } catch {}
    }
  }

  function onDomReady(fn) {
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  function untilGate(timeoutMs = 4000, predicate) {
    const t0 = Date.now();
    return new Promise((resolve) => {
      (function tick() {
        const baseReady =
          !!document.body &&
          !!(AP.uiPanel && typeof AP.uiPanel.createPanel === "function");
        let ok = baseReady;
        if (typeof predicate === "function") {
          try {
            ok = ok && !!predicate();
          } catch {}
        }
        if (ok || Date.now() - t0 >= timeoutMs) return resolve();
        setTimeout(tick, 50);
      })();
    });
  }

  function resolveStart() {
    const sources = [
      [
        "AP.AutoPrompterCore.start",
        AP.AutoPrompterCore && AP.AutoPrompterCore.start,
      ],
      ["AP.coreStart.start", AP.coreStart && AP.coreStart.start],
      ["AP.start(getter)", AP.start && (AP.start.__impl || AP.start)],
      [
        "window.AP.core.start",
        window.AP && window.AP.core && window.AP.core.start,
      ],
      ["PromptEngine.start", window.PromptEngine && window.PromptEngine.start],
      ["startAutoPrompter", window.startAutoPrompter],
    ];
    for (const [label, fn] of sources)
      if (typeof fn === "function") return { label, fn };
    return { label: null, fn: null };
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function tryStartCore(maxAttempts = 6) {
    const delays = [40, 100, 180, 350, 700, 1200];
    for (let i = 0; i < Math.min(maxAttempts, delays.length); i++) {
      // Ask providers each attempt (sanity bridge)
      try {
        window.dispatchEvent(
          new CustomEvent("ap:need-start", {
            detail: {
              provide(fn) {
                if (typeof fn === "function") {
                  (AP.AutoPrompterCore = AP.AutoPrompterCore || {}).start = fn;
                }
              },
            },
          })
        );
      } catch {}

      const { label, fn } = resolveStart();
      if (typeof fn === "function") {
        try {
          safeLog("info", "[AP][gate] invoking start via", label);
          // Await to capture async errors & prevent "Uncaught (in promise)"
          await Promise.resolve(fn());
          return true;
        } catch (e) {
          safeLog(
            "warn",
            "[AP][gate] start error via " + label + ": " + (e?.message || e)
          );
        }
      }
      await wait(delays[i]);
    }
    safeLog("warn", "[AP][gate] start function not available after retries");
    return false;
  }

  function startIfCoreExists() {
    return tryStartCore();
  }

  window.addEventListener(
    "ap:core-ready",
    () => {
      safeLog("info", "[AP][gate] ap:core-ready received; attempting start");
      tryStartCore(2);
    },
    { once: true }
  );

  AP.startGate = AP.startGate || {};
  AP.startGate.untilGate = untilGate;
  AP.startGate.onDomReady = onDomReady;
  AP.startGate.startIfCoreExists = startIfCoreExists;

  try {
    AP.boot?.cp?.("startGate:init", { version: VERSION });
  } catch {}

  onDomReady(async () => {
    try {
      AP._logBackoff?.logOnce?.("info", "boot", "dom_ready", {
        ts: new Date().toISOString(),
        href: location.href,
      });
      await untilGate(4000);
      AP.mountPoint?.mountPanelWhenReady?.();
    } catch (e) {
      safeLog("warn", "[AP][gate] mount error: " + (e?.message || e));
    }
    startIfCoreExists();
  });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/navWatch.js");

/* ===== core/runtime/boot/navWatch.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/navWatch.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/navWatch.js
(function () {
  "use strict";
  const VERSION = "4.3.2";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.__navWatchReady) {
    try {
      AP.boot?.cp?.("boot:navWatch:ready", { version: VERSION, reused: true });
    } catch {}
    return;
  }
  AP.__navWatchReady = true;
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/navWatch.js"
    );
  } catch {}

  function preferModulesOrFallback() {
    if (AP.nav && typeof AP.nav.start === "function") {
      try {
        AP.nav.start();
        AP.navWatch = AP.navWatch || {};
        AP.navWatch.teardown = AP.nav.teardown;
        AP.boot?.cp?.("boot:navWatch:ready", { version: VERSION, via: "nav" });
        return;
      } catch {}
    }

    // Fallback (minimal route watcher)
    const base = AP.logger || console;
    const info = (base.info || base.log || console.log).bind(base);

    let last = location.href;
    let intervalId = 0;
    let popHandler = null;

    function routeChanged(prev, next) {
      try {
        AP.mountPoint?.mountPanelWhenReady?.();
      } catch {}
      try {
        window.dispatchEvent(
          new CustomEvent("ap:route", { detail: { prev, next } })
        );
      } catch {}
    }

    function schedule() {
      if (location.href === last) return;
      const prev = last;
      last = location.href;
      info("[AP][nav:fallback] route change:", prev, "->", last);
      routeChanged(prev, last);
    }

    try {
      const push = history.pushState;
      const rep = history.replaceState;
      history.pushState = function () {
        const r = push.apply(this, arguments);
        schedule();
        return r;
      };
      history.replaceState = function () {
        const r = rep.apply(this, arguments);
        schedule();
        return r;
      };
      popHandler = () => schedule();
      window.addEventListener("popstate", popHandler);
    } catch {
      intervalId = setInterval(schedule, 800);
    }

    AP.navWatch = AP.navWatch || {};
    AP.navWatch.teardown = () => {
      try {
        if (popHandler) window.removeEventListener("popstate", popHandler);
      } catch {}
      try {
        history.pushState = history.pushState;
        history.replaceState = history.replaceState;
      } catch {}
      try {
        if (intervalId) clearInterval(intervalId);
      } catch {}
      intervalId = 0;
    };

    AP.boot?.cp?.("boot:navWatch:ready", { version: VERSION, via: "fallback" });
  }

  preferModulesOrFallback();
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/core.js");

/* ===== core/runtime/boot/core.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/core.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/core.js
(function () {
  "use strict";

  const VERSION = "4.3.2"; // late-bind + quieter boot
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/core.js@4.3.2"
    );
  } catch {}

  // If already wired, keep idempotent
  try {
    if (
      AP.AutoPrompterCore &&
      typeof AP.AutoPrompterCore.start === "function"
    ) {
      try {
        AP.boot?.cp?.("boot:core:ready", { version: VERSION, reused: true });
      } catch {}
      // Ensure downstream listeners still get the signal
      try {
        window.dispatchEvent(new CustomEvent("ap:core-ready"));
      } catch {}
      return;
    }
  } catch {}

  const L = AP.logger?.with
    ? AP.logger.with({ component: "boot", file: "boot/core.js" })
    : console;

  /**
   * Late-bound wrappers: resolve the actual impl at call time.
   * This avoids burning in a dummy start/stop/run when modules load out of order.
   */
  function start() {
    const impl =
      (AP.coreStart &&
        typeof AP.coreStart.start === "function" &&
        AP.coreStart.start) ||
      null;
    if (typeof impl === "function") {
      try {
        return impl.apply(this, arguments);
      } catch (e) {
        try {
          AP.boot?.cp?.("boot:core:start:err", {
            err: String(e?.message || e),
          });
        } catch {}
        throw e;
      }
    }
    // Normal race: defer quietly (telemetry only; no console warn)
    try {
      AP.boot?.cp?.("boot:core:start:deferred");
    } catch {}
    return false;
  }

  function stop() {
    const impl =
      (AP.coreRun &&
        typeof AP.coreRun.stop === "function" &&
        AP.coreRun.stop) ||
      null;
    if (typeof impl === "function") {
      try {
        return impl.apply(this, arguments);
      } catch (e) {
        try {
          AP.boot?.cp?.("boot:core:stop:err", { err: String(e?.message || e) });
        } catch {}
        throw e;
      }
    }
    try {
      AP.boot?.cp?.("boot:core:stop:deferred");
    } catch {}
    return false;
  }

  function run() {
    const impl =
      (AP.coreRun && typeof AP.coreRun.run === "function" && AP.coreRun.run) ||
      null;
    if (typeof impl === "function") {
      try {
        return impl.apply(this, arguments);
      } catch (e) {
        try {
          AP.boot?.cp?.("boot:core:run:err", { err: String(e?.message || e) });
        } catch {}
        throw e;
      }
    }
    try {
      AP.boot?.cp?.("boot:core:run:deferred");
    } catch {}
    return false;
  }

  // Bridge CustomEvent requests to provide start/stop to any caller.
  try {
    window.addEventListener(
      "ap:need-start",
      (e) => {
        try {
          e?.detail?.provide?.(start);
        } catch {}
      },
      { once: true }
    );
    window.addEventListener(
      "ap:need-stop",
      (e) => {
        try {
          e?.detail?.provide?.(stop);
        } catch {}
      },
      { once: true }
    );
  } catch {}

  // Public API facade (single source of truth) — plain object, not frozen
  const coreFacade = { start, stop, run, __v: VERSION };

  // Safely expose without mutating read-only/accessor properties
  (function exposeCore() {
    try {
      const desc = Object.getOwnPropertyDescriptor(AP, "AutoPrompterCore");
      if (!desc) {
        // Fresh install: prefer accessor so others can't replace the whole facade
        try {
          Object.defineProperty(AP, "AutoPrompterCore", {
            get: () => coreFacade,
            configurable: true, // allow dev hot-rewire if needed
          });
        } catch {
          // Fallback if defineProperty fails (shouldn't in modern browsers)
          try {
            AP.AutoPrompterCore = coreFacade;
          } catch {}
        }
      } else {
        // Property exists: don't overwrite. Keep the getter pattern if present.
      }
    } catch {}
  })();

  // DO NOT assign AP.start/AP.stop directly — those may be accessor-only.
  // If aliases are desired and available, expose them as accessors guarded by try/catch.
  (function exposeAliases() {
    try {
      if (!Object.getOwnPropertyDescriptor(AP, "start")) {
        Object.defineProperty(AP, "start", {
          get: () => start,
          configurable: true,
        });
      }
    } catch {}
    try {
      if (!Object.getOwnPropertyDescriptor(AP, "stop")) {
        Object.defineProperty(AP, "stop", {
          get: () => stop,
          configurable: true,
        });
      }
    } catch {}
  })();

  // Let startGate know a core facade exists
  try {
    window.dispatchEvent(new CustomEvent("ap:core-ready"));
  } catch {}

  try {
    AP.boot?.cp?.("boot:core:ready", {
      version: VERSION,
      start: typeof start === "function",
      stop: typeof stop === "function",
      run: typeof run === "function",
      lateBound: true,
    });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/run.js");

/* ===== core/runtime/boot/run.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/run.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/run.js
(function () {
  "use strict";
  const VERSION = "4.3.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/run.js"
    );
  } catch {}

  if (AP.coreRun) {
    try {
      AP.boot?.cp?.("boot:run:ready", { version: VERSION, reused: true });
    } catch {}
    return;
  }

  const L = () => AP.logger || console;
  const BK = () => AP._logBackoff || { log: () => false };
  const { isRunning, setRunning } = (AP.coreState = AP.coreState || {});

  function withDefaults(cfg) {
    const C = AP.config || {};
    return {
      minIntervalMs: cfg?.minIntervalMs ?? null,
      delayMs: cfg?.delayMs ?? null,
      detectTimeoutMs: cfg?.detectTimeoutMs ?? C.detectTimeoutMs ?? 7000,
      pollMs: cfg?.pollMs ?? C.detectPollMs ?? 120,
      stopSel: cfg?.stopSel ?? null,
      scanMs: cfg?.scanMs ?? 900,
      ...cfg,
    };
  }

  async function run(cfg = {}) {
    if (isRunning?.()) {
      BK().log("info", "core", "run_ignored_busy", {});
      return false;
    }
    if (!AP.promptEngine) {
      BK().log("warn", "core", "engine_missing", {});
      (L.warn || L.log).call(L, "[AP][core] promptEngine missing");
      return false;
    }

    const merged = withDefaults(cfg);
    const sequence =
      typeof merged.sequence === "string" && merged.sequence.trim()
        ? merged.sequence
        : (localStorage.getItem("ap_sequence") || "").trim();
    if (!sequence) {
      BK().log("warn", "core", "sequence_empty", {});
      (L.warn || L.log).call(
        L,
        "[AP][core] empty sequence (pass {sequence} or set localStorage.ap_sequence)"
      );
      return false;
    }

    setRunning?.(true);
    try {
      (L.info || L.log).call(L, "Run started");
      const steps = AP.promptEngine.parse(sequence);
      AP.promptEngine.resetRun?.();
      await AP.promptEngine.runAll(steps, merged);
      (L.info || L.log).call(L, "Run finished");
      BK().log("info", "core", "run_finished", { steps: steps?.length || 0 });
      return true;
    } catch (e) {
      BK().log("warn", "core", "run_error", { err: String(e?.stack || e) });
      (L.warn || L.log).call(L, "Run error: " + (e?.message || e));
      return false;
    } finally {
      setRunning?.(false);
    }
  }

  function stop({ teardownNavWatch = false } = {}) {
    try {
      AP.promptEngine?.abortRun?.();
      BK().log("info", "core", "run_aborted", {});
      (L.warn || L.log).call(L, "Run aborted");
    } catch (e) {
      BK().log("warn", "core", "abort_error", { err: String(e?.message || e) });
    } finally {
      setRunning?.(false);
      if (teardownNavWatch) {
        try {
          AP.navWatch?.teardown?.();
        } catch {}
      }
    }
  }

  AP.coreRun = { run, stop };

  try {
    AP.boot?.cp?.("boot:run:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/start.js");

/* ===== core/runtime/boot/start.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/start.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/boot/start.js
(function () {
  "use strict";
  const VERSION = "4.4.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/start.js@4.4.0"
    );
  } catch {}

  if (AP.coreStart && typeof AP.coreStart.start === "function") {
    try {
      AP.boot?.cp?.("boot:start:ready", { version: VERSION, reused: true });
    } catch {}
    return;
  }

  const L = () => AP.logger || console;
  const BK = () => AP._logBackoff || { logOnce: () => false };
  const { ensureDeps } = (AP.coreDeps = AP.coreDeps || {});
  const { ensurePanelMounted } = (AP.corePanel = AP.corePanel || {});
  const { run } = (AP.coreRun = AP.coreRun || {});
  const { isStarted, setStarted } = (AP.coreState = AP.coreState || {});

  async function waitGate(ms = 4000) {
    const untilGate = AP.startGate?.untilGate;
    if (typeof untilGate !== "function") return;
    try {
      await untilGate(ms, () => !!AP.uiPanel?.createPanel);
    } catch {}
  }

  async function start(opts = {}) {
    if (isStarted?.()) {
      BK().logOnce("info", "core", "start_idempotent", { started: true });
      ensurePanelMounted?.();
      return true;
    }

    await waitGate(4000);

    try {
      ensureDeps?.();
    } catch (e) {
      (L().warn || L().log).call(L(), "[AP][core] deps check failed", e);
    }

    try {
      ensurePanelMounted?.();
    } catch (e) {
      (L().warn || L().log).call(L(), "[AP][core] panel mount failed", e);
    }

    try {
      setStarted?.(true);
    } catch {}

    BK().logOnce("info", "core", "ready", {
      href: location.href,
      bundleId:
        AP.bundleMeta?.id ||
        (window.__AP_BUNDLE_META && window.__AP_BUNDLE_META.id) ||
        null,
    });

    try {
      (L().info || L().log).call(L(), "Auto-Prompter ready");
    } catch {}

    if (opts && typeof opts.sequence === "string" && opts.sequence.trim()) {
      try {
        await run?.({ sequence: opts.sequence, ...opts });
      } catch {}
    }

    return true;
  }

  AP.coreStart = { start };

  try {
    AP.boot?.cp?.("boot:start:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/boot/mountPoint.js");

/* ===== core/runtime/boot/mountPoint.js ===== */
(function(){var __AP_MOD="/core/runtime/boot/mountPoint.js";try{
(function () {
  "use strict";
  const VERSION = "4.3.1";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  // Mark loaded for diagnostics
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/boot/mountPoint.js"
    );
  } catch {}

  if (AP.__mountPointReady) {
    try {
      (AP.logger || console).info?.("[AP][mount] mountPoint ready (reused)", {
        version: VERSION,
      });
    } catch {}
    try {
      AP.boot?.cp?.("boot:mountPoint:ready", {
        version: VERSION,
        reused: true,
      });
    } catch {}
    return;
  }
  AP.__mountPointReady = true;

  const logger = () =>
    AP.logger?.with
      ? AP.logger.with({ component: "core", file: "mountPoint.js" })
      : AP.logger || console;

  let mounted = false;
  let panelRef = null;
  let keepObs = null;

  try {
    AP.boot?.cp?.("boot:mountPoint:ready", { version: VERSION });
  } catch {}

  function ensureBody(cb) {
    if (document.body) return void cb();
    const obs = new MutationObserver(() => {
      if (document.body) {
        try {
          obs.disconnect();
        } catch {}
        try {
          cb();
        } catch (e) {
          const L = logger();
          (L.warn || L.log).call(
            L,
            "[AP][mount] ensureBody cb failed:",
            e?.message || e
          );
        }
      }
    });
    try {
      obs.observe(document.documentElement, { childList: true, subtree: true });
    } catch {}
  }

  function mountPanelWhenReady() {
    const L = logger();
    if (mounted && panelRef && document.contains(panelRef.root)) return;
    ensureBody(() => {
      try {
        const { createPanel } = AP.uiPanel || {};
        if (typeof createPanel !== "function") {
          (L.warn || L.log).call(
            L,
            "[AP][mount] uiPanel.createPanel not ready"
          );
          return;
        }
        panelRef = createPanel({
          onStart: AP.AutoPrompterCore?.start,
          onStop: AP.AutoPrompterCore?.stop,
        });
        if (!panelRef?.root) {
          (L.warn || L.log).call(
            L,
            "[AP][mount] createPanel returned no root"
          );
          return;
        }
        document.documentElement.appendChild(panelRef.root);
        mounted = true;
        (L.info || L.log).call(L, "[AP][mount] panel attached");

        try {
          keepObs?.disconnect?.();
        } catch {}
        keepObs = new MutationObserver(() => {
          if (panelRef?.root && !document.contains(panelRef.root)) {
            try {
              document.documentElement.appendChild(panelRef.root);
              (L.info || L.log).call(L, "[AP][mount] panel reattached");
            } catch (e) {
              (L.warn || L.log).call(
                L,
                "[AP][mount] reattach failed:",
                e?.message || e
              );
            }
          }
        });
        try {
          keepObs.observe(document.documentElement, {
            childList: true,
            subtree: true,
          });
        } catch {}
      } catch (e) {
        (L.warn || L.log).call(L, "[AP][mount] failed:", e?.message || e);
      }
    });
  }

  function unmountPanel() {
    const L = logger();
    try {
      keepObs?.disconnect?.();
    } catch {}
    keepObs = null;
    try {
      const root = panelRef?.root;
      if (root?.parentNode) root.parentNode.removeChild(root);
    } catch {}
    mounted = false;
    panelRef = null;
    try {
      (L.info || L.log).call(L, "[AP][mount] panel removed");
    } catch {}
  }

  AP.mountPoint = { ensureBody, mountPanelWhenReady, unmountPanel };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/composer/core/watcher.js");

/* ===== core/runtime/composer/core/watcher.js ===== */
(function(){var __AP_MOD="/core/runtime/composer/core/watcher.js";try{
// ./auto-prompter/core/runtime/composer/core/watcher.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.composerWatch) return;

  const ls = (k, d) => {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : v;
    } catch {
      return d;
    }
  };
  const DISABLED = ls("ap_disable_watchers", "0") === "1";
  const MIN_INTERVAL = Math.max(
    0,
    Number(ls("ap_watch_min_interval_ms", "900")) || 0
  );
  const USE_INTERVAL = ls("ap_watch_use_interval", "0") === "1";
  const INTERVAL_MS = Math.max(
    250,
    Number(ls("ap_watch_interval_ms", "1200")) || 1200
  );

  const ATTR_WATCH = ls("ap_watch_attributes", "0") === "1";
  const ATTR_FILTER = ls(
    "ap_watch_attr_filter",
    "disabled,aria-disabled,hidden"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let mo = null,
    rafLock = false,
    last = null,
    lastTick = 0,
    intervalId = 0;

  async function pollOnce() {
    try {
      const r = await (AP.composerDetect?.findComposer?.({
        allowInputOnly: true,
      }) || AP.detectSafeFind.findComposerSafe({ allowInputOnly: true }));
      if (!r) return;
      const same = last && r.input === last.input && r.send === last.send;
      if (!same) {
        last = r;
        window.dispatchEvent(
          new CustomEvent("ap:composer-changed", { detail: r })
        );
        AP.detectCache?.set?.(r);
        try {
          AP.boot?.cp?.("composer:watch:changed", {
            hasInput: !!r?.input,
            hasSend: !!r?.send,
          });
        } catch {}
      }
    } catch {}
  }

  function scheduleThrottled() {
    const now = Date.now();
    if (now - lastTick < MIN_INTERVAL) return;
    lastTick = now;
    if (rafLock) return;
    rafLock = true;
    requestAnimationFrame(() => ((rafLock = false), pollOnce()));
  }

  function start() {
    if (DISABLED) {
      try {
        AP.boot?.cp?.("composer:watch:disabled");
      } catch {}
      return;
    }

    if (USE_INTERVAL) {
      if (!intervalId) {
        intervalId = setInterval(scheduleThrottled, INTERVAL_MS);
      }
      window.addEventListener("ap:route", scheduleThrottled);
      scheduleThrottled();
      try {
        AP.boot?.cp?.("composer:watch:start", {
          mode: "interval",
          intervalMs: INTERVAL_MS,
          minInterval: MIN_INTERVAL,
        });
      } catch {}
      return;
    }

    if (mo) return;
    mo = new MutationObserver(scheduleThrottled);
    const root = document.body || document.documentElement;
    const opts = { subtree: true, childList: true };
    if (ATTR_WATCH) {
      opts.attributes = true;
      if (ATTR_FILTER.length) opts.attributeFilter = ATTR_FILTER;
    }
    mo.observe(root, opts);

    window.addEventListener("ap:route", scheduleThrottled);
    scheduleThrottled();
    try {
      AP.boot?.cp?.("composer:watch:start", {
        mode: "mo",
        minInterval: MIN_INTERVAL,
        attrWatch: !!ATTR_WATCH,
      });
    } catch {}
  }

  function stop() {
    try {
      mo?.disconnect?.();
    } catch {}
    mo = null;
    window.removeEventListener("ap:route", scheduleThrottled);
    try {
      if (intervalId) clearInterval(intervalId);
    } catch {}
    intervalId = 0;
    try {
      AP.boot?.cp?.("composer:watch:stop");
    } catch {}
  }

  AP.composerWatch = { start, stop, get: () => last };
  try {
    AP.boot?.cp?.("composer:watch:ready");
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/composer/cache.js");

/* ===== core/runtime/composer/cache.js ===== */
(function(){var __AP_MOD="/core/runtime/composer/cache.js";try{
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.detectCache) return;

  let cached = null,
    ts = 0;
  const VALID_AGE = 800; // ms

  function valid(p) {
    return (
      p &&
      p.input &&
      document.contains(p.input) &&
      (!p.send || document.contains(p.send))
    );
  }
  function get(maxAgeMs = VALID_AGE) {
    return cached && Date.now() - ts <= maxAgeMs && valid(cached)
      ? cached
      : null;
  }
  function set(p) {
    cached = p;
    ts = Date.now();
    try {
      AP.boot?.cp?.("composer:cache:set", {
        hasInput: !!p?.input,
        hasSend: !!p?.send,
      });
    } catch {}
  }
  function clear() {
    cached = null;
    try {
      AP.boot?.cp?.("composer:cache:cleared");
    } catch {}
  }

  window.addEventListener?.("ap:route", clear);
  AP.detectCache = { get, set, clear };

  try {
    AP.boot?.cp?.("composer:cache:ready");
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/composer/probe-shim.js");

/* ===== core/runtime/composer/probe-shim.js ===== */
(function(){var __AP_MOD="/core/runtime/composer/probe-shim.js";try{
(function () {
  "use strict";
  // Legacy probe shim; detect/probe.js provides AP.composerDetect.probe now.
  try {
    window.AutoPrompter?.boot?.cp?.("composer:probe:compat");
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/composer/bootstrap.js");

/* ===== core/runtime/composer/bootstrap.js ===== */
(function(){var __AP_MOD="/core/runtime/composer/bootstrap.js";try{
(function () {
  "use strict";
  // Kept for backwards compat; real logic moved to detect/selectors.js
  try {
    window.AutoPrompter?.boot?.cp?.("composer:bootstrap:compat");
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/adapters/chatgpt/detector.js");

/* ===== core/adapters/chatgpt/detector.js ===== */
(function(){var __AP_MOD="/core/adapters/chatgpt/detector.js";try{
// ./auto-prompter/core/runtime/composer/detectors/chatgpt.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  const DQ = (AP.domQuery = AP.domQuery || {});
  const qsDeep =
    typeof DQ.qsDeep === "function"
      ? (sel, root) => DQ.qsDeep(sel, root || document)
      : (sel, root) => (root || document).querySelector(sel);
  const qsaDeep =
    typeof DQ.qsaDeep === "function"
      ? (sel, root) => DQ.qsaDeep(sel, root || document)
      : (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // Cheap visibility check
  function isVisible(el) {
    if (!el) return false;
    const s = getComputedStyle(el);
    if (!s) return false;
    if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0")
      return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  // The ChatGPT editor is ProseMirror:
  //   <div id="prompt-textarea" class="ProseMirror" contenteditable="true">...</div>
  // Sometimes a plain <textarea placeholder="Ask anything"> exists too.
  function findInput(root = document) {
    const sels = [
      'div#prompt-textarea.ProseMirror[contenteditable="true"]',
      'div.ProseMirror[contenteditable="true"]',
      'textarea[placeholder="Ask anything"]',
      "textarea#prompt-textarea",
      'textarea[name="prompt-textarea"]',
      // fallbacks
      "[contenteditable='true'][role='textbox']",
      "[contenteditable='true']",
      "textarea",
      "input[type='text']",
    ];
    for (const sel of sels) {
      try {
        const el = qsDeep(sel, root);
        if (el && isVisible(el)) return el;
      } catch {}
    }
    return null;
  }

  // Send button only appears when there’s content. It can be:
  //   [data-testid="send-button"] (common)
  //   button[aria-label="Send"]   (alt)
  // Fallback to first submit button in the same form (excluding plus/voice).
  function findSend(input) {
    const container =
      (input &&
        input.closest &&
        input.closest("form,[data-testid],[role],main,.composer")) ||
      document;

    const primarySels = [
      "[data-testid='send-button']",
      "button[aria-label='Send']",
      "button[aria-label*='send' i]",
    ];
    for (const sel of primarySels) {
      try {
        const el = qsDeep(sel, container);
        if (el && isVisible(el)) return el;
      } catch {}
    }

    // Submit fallback (avoid plus/voice buttons) within the container first…
    try {
      const subs = qsaDeep(
        "button[type='submit'], input[type='submit']",
        container
      ).filter((b) => {
        const tid = b.getAttribute && b.getAttribute("data-testid");
        const label = (
          b.getAttribute?.("aria-label") ||
          b.textContent ||
          ""
        ).toLowerCase();
        return (
          tid !== "composer-plus-btn" &&
          tid !== "composer-speech-button" &&
          !/microphone|speech/i.test(label)
        );
      });
      for (const b of subs) {
        if (isVisible(b)) return b;
      }
    } catch {}

    // …then global as last resort
    try {
      const subs = qsaDeep("button[type='submit'], input[type='submit']");
      for (const b of subs) {
        if (isVisible(b)) return b;
      }
    } catch {}

    return null;
  }

  function isSendReady(btn) {
    if (!btn) return false;
    const s = getComputedStyle(btn);
    const disabled =
      btn.disabled ||
      (btn.getAttribute && btn.getAttribute("aria-disabled") === "true");
    const hidden =
      s.display === "none" || s.visibility === "hidden" || s.opacity === "0";
    return !disabled && !hidden && isVisible(btn);
  }

  // Public detector API
  function detect() {
    const input = findInput(document);
    const send = input ? findSend(input) : null;
    return { input, send };
  }

  // Export under AP namespace (legacy surface)
  AP.composerDetectors = AP.composerDetectors || {};
  AP.composerDetectors.chatgpt = { detect, isSendReady };

  // Register with registry if available (high weight)
  if (AP.detectRegistry && typeof AP.detectRegistry.register === "function") {
    AP.detectRegistry.register(async (_opts, _signal) => {
      const r = detect();
      if (r && (r.input || r.send)) return r;
      return null;
    }, 100);
  }

  // Breadcrumb
  try {
    AP.boot?.cp?.("adapters:chatgpt:detector:ready");
  } catch {}
})();

// (selectors bootstrap) — keep as canonical
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  // Prefer site-provided globals but extend with robust defaults
  const SEND_SELECTORS = (window.SEND_SELECTORS && [
    ...window.SEND_SELECTORS,
  ]) || [
    // Common explicit targets
    "[data-testid='send-button']",
    "button[data-testid='send-button']",
    "button[aria-label='Send']",
    "button[aria-label*='Send']",
    "button[aria-label='Send prompt']",
    "button[aria-label*='Send prompt']",
    // Generic submit
    "form button[type='submit']",
  ];

  const INPUT_SELECTORS = (window.INPUT_SELECTORS && [
    ...window.INPUT_SELECTORS,
  ]) || [
    // ProseMirror (ChatGPT editor)
    "#prompt-textarea.ProseMirror[contenteditable='true']",
    "div.ProseMirror[contenteditable='true']",
    // Fallbacks
    "[contenteditable='true']",
    "textarea",
    "input[type='text']",
  ];

  function isSendReady(btn) {
    if (!btn) return false;
    const s = getComputedStyle(btn);
    const disabled =
      btn.hasAttribute("disabled") ||
      btn.getAttribute("aria-disabled") === "true";
    const hidden =
      s.display === "none" || s.visibility === "hidden" || s.opacity === "0";
    return !disabled && !hidden;
  }

  AP.detectSelectors = { SEND_SELECTORS, INPUT_SELECTORS, isSendReady };

  try {
    AP.boot?.cp?.("adapters:chatgpt:selectors:ready", {
      send: SEND_SELECTORS.length,
      input: INPUT_SELECTORS.length,
    });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/adapters/chatgpt/patch.js");

/* ===== core/adapters/chatgpt/patch.js ===== */
(function(){var __AP_MOD="/core/adapters/chatgpt/patch.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/composer/chatgptPatch.js
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(root);
  } else {
    factory(root);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (global) {
  "use strict";

  var AP = (global.AutoPrompter = global.AutoPrompter || {});
  var L = AP.logger && AP.logger.info ? AP.logger : global.console;

  // Keep original if present
  var orig = (AP.composerDetect && AP.composerDetect.findComposer) || null;

  function fallbackFindComposer(opts) {
    try {
      var det =
        AP.composerDetectors && AP.composerDetectors.chatgpt
          ? AP.composerDetectors.chatgpt
          : null;
      if (!det) return { input: null, send: null };
      var r = det.detect();
      var input = r && r.input ? r.input : null;
      var send = r && r.send ? r.send : null;

      if (input && !send && !(opts && opts.allowInputOnly)) {
        // Caller may still push Enter as a fallback; we return what we have.
      }
      return { input: input, send: send };
    } catch (_e) {
      return { input: null, send: null };
    }
  }

  // Namespace
  AP.composerDetect = AP.composerDetect || {};

  // Provide isSendReady if missing (pure function, no imports)
  if (typeof AP.composerDetect.isSendReady !== "function") {
    AP.composerDetect.isSendReady = function (btn) {
      try {
        if (
          AP.composerDetectors &&
          AP.composerDetectors.chatgpt &&
          typeof AP.composerDetectors.chatgpt.isSendReady === "function"
        ) {
          return AP.composerDetectors.chatgpt.isSendReady(btn);
        }
        return true;
      } catch (_e) {
        return true;
      }
    };
  }

  // Fully classic, no exports/imports
  AP.composerDetect.findComposer = function findComposer(opts) {
    return Promise.resolve()
      .then(function () {
        if (typeof orig === "function") {
          return Promise.resolve()
            .then(function () {
              return orig.call(AP.composerDetect, opts);
            })
            .then(function (res) {
              if (!res) return null;
              if (res.input && res.send) return res;
              if (res.input && opts && opts.allowInputOnly) return res;
              return null;
            })
            .catch(function (e) {
              try {
                (L.warn || L.log).call(
                  L,
                  "[AP][composer] orig findComposer threw",
                  e
                );
              } catch (_e) {}
              return null;
            });
        }
        return null;
      })
      .then(function (res) {
        if (res) return res;
        var res2 = fallbackFindComposer(opts);
        if (res2 && (res2.input || (opts && opts.allowInputOnly))) return res2;
        return res2; // may be {input:null, send:null}
      });
  };

  try {
    if (AP.boot && AP.boot.cp) {
      AP.boot.cp("adapters:chatgpt:patch:applied", { hasOrig: !!orig });
    }
  } catch (_e) {}

  // Return namespace for CJS usage; ignored in browser
  return AP;
});

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/io/index.js");

/* ===== core/runtime/io/index.js ===== */
(function(){var __AP_MOD="/core/runtime/io/index.js";try{
// ./auto-prompter/core/runtime/io/index.js
// Unified IO surface to plug into runtime/index.js (stable API) + prompt stub
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.__ioIndexReady) {
    try {
      AP.boot?.cp?.("io:index:ready:noop");
    } catch {}
    return;
  }
  AP.__ioIndexReady = true;

  // Ensure namespaces exist
  AP.io = AP.io || {};

  // Merge classic globals into AP.io (back-compat)
  if (AP.senders) Object.assign(AP.io, AP.senders); // setInputValue, triggerSend
  if (!AP.io.senders && AP.senders) AP.io.senders = AP.senders; // alias for legacy callsites
  if (AP.waiters) AP.io.waiters = AP.waiters;
  if (AP.idleWait?.waitUntilIdle && !AP.io.waitUntilIdle)
    AP.io.waitUntilIdle = AP.idleWait.waitUntilIdle;
  if (AP.find && !AP.io.find) AP.io.find = AP.find;

  // Value helpers (prefer dedicated module if present)
  if (!AP.io.value && AP.valueReg) {
    AP.io.value = {
      setValue: (el, v, opts) =>
        AP.valueReg.set(
          el,
          opts?.append ? (el.value ?? el.textContent ?? "") + v : v
        ),
      getValue: (el) =>
        el?.value != null ? el.value : (el?.textContent || "").trim(),
      insert: (el, txt) =>
        AP.valueReg.set(el, (el?.value ?? el?.textContent ?? "") + txt),
    };
  }

  // Compose + submit wrappers, linked to the real core implementations
  AP.io.compose = AP.io.compose || {};
  AP.io.submit = AP.io.submit || {};

  // Route io.compose.compose(text, opts) -> core compose.composeAndSend({ text, ...opts })
  if (AP.compose?.composeAndSend) {
    AP.io.compose.compose = (text, opts = {}) =>
      AP.compose.composeAndSend({ text, ...opts });
  } else if (!AP.io.compose.compose) {
    AP.io.compose.compose = () => ({ ok: false, reason: "compose_not_ready" });
  }

  // Route io.submit.submit(opts) -> core submit.submit(opts)
  if (AP.submit?.submit) {
    AP.io.submit.submit = (opts = {}) => AP.submit.submit(opts);
  } else if (!AP.io.submit.submit) {
    AP.io.submit.submit = () => ({ ok: false, reason: "submit_not_ready" });
  }

  // Convenience: io.send(text, opts) -> compose then submit (mirrors runtime.runtime.send)
  AP.io.send =
    AP.io.send ||
    (async (text, opts = {}) => {
      const w = await AP.io.compose.compose(text, opts);
      if (!w?.ok || opts.nosend)
        return { ok: !!w?.ok, step: w?.ok ? "nosend" : "compose" };
      const s = await AP.io.submit.submit(opts);
      return s?.ok ? { ok: true, via: s.via } : { ok: false, step: "submit" };
    });

  // -------- Prompt engine bootstrap stub to avoid race with dev controls --------
  // If the real prompt engine isn't ready when controls start, they fall back
  // and log "engine.runAll missing executor" and then fail on {type:'msg'}.
  // Provide a small queueing stub that gets replaced by the real engine.
  AP._promptQueue = AP._promptQueue || [];
  const hasReal =
    AP.promptEngine &&
    typeof AP.promptEngine.runAll === "function" &&
    !AP.promptEngine.__isStub;

  if (!hasReal) {
    AP.promptEngine = AP.promptEngine || {};
    AP.promptEngine.__isStub = true;
    AP.promptEngine.runAll = async (stepsOrText, cfg = {}) => {
      try {
        AP._promptQueue.push({ stepsOrText, cfg });
        AP.boot?.cp?.("prompt:engine:queued");
      } catch {}
      // Always resolve true to avoid triggering fallback error paths.
      return true;
    };

    // Lightweight parser stub to handle JSON arrays if controls pass strings.
    if (!AP.promptParser) {
      AP.promptParser = {
        __isStub: true,
        parse: (text) => {
          try {
            if (!text) return [];
            if (Array.isArray(text)) return text;
            const s = String(text).trim();
            if (s.startsWith("[")) return JSON.parse(s);
          } catch {}
          return [];
        },
      };
    }
  }
  // ---------------------------------------------------------------------------

  // Version stamp for checklist
  AP.versions = AP.versions || {};
  AP.versions.io = "4.5.1";

  try {
    AP.boot?.cp?.("io:index:ready", { version: AP.versions.io });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/io/waiters.js");

/* ===== core/runtime/io/waiters.js ===== */
(function(){var __AP_MOD="/core/runtime/io/waiters.js";try{
// ./core/runtime/io/waiters.js
// VERSION: io-waiters/1.1.0

(function () {
  "use strict";
  const cp = (tag, extra) => {
    try {
      (window.AutoPrompter?.boot?.cp || (() => {}))("io:waiters:" + tag, {
        ver: "io-waiters/1.1.0",
        ...(extra || {}),
      });
    } catch {}
  };

  function isVisible(el) {
    if (!el) return false;
    const s = window.getComputedStyle(el);
    if (!s) return false;
    if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0")
      return false;
    if (el.offsetParent === null && s.position !== "fixed") return false;
    try {
      const r = el.getBoundingClientRect();
      if (!r || r.width <= 0 || r.height <= 0) return false;
    } catch {}
    return true;
  }

  async function waitForVisible(
    selector,
    timeoutMs = 15000,
    pollMs = 200,
    signal
  ) {
    cp("visible:enter", { selector, timeoutMs, pollMs });
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const el = document.querySelector(selector);
      if (el && isVisible(el)) {
        cp("visible:hit");
        return el;
      }
      await new Promise((r) => {
        const t = setTimeout(r, pollMs);
        signal?.addEventListener("abort", () => (clearTimeout(t), r()), {
          once: true,
        });
      });
    }
    cp("visible:timeout");
    return null;
  }

  async function waitForGone(
    selector,
    timeoutMs = 15000,
    pollMs = 200,
    signal
  ) {
    cp("gone:enter", { selector, timeoutMs, pollMs });
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const el = document.querySelector(selector);
      if (!el || !isVisible(el)) {
        cp("gone:hit");
        return true;
      }
      await new Promise((r) => {
        const t = setTimeout(r, pollMs);
        signal?.addEventListener("abort", () => (clearTimeout(t), r()), {
          once: true,
        });
      });
    }
    cp("gone:timeout");
    return false;
  }

  async function waitForText(
    selector,
    text,
    timeoutMs = 15000,
    pollMs = 200,
    signal
  ) {
    cp("text:enter", { selector, timeoutMs, pollMs, len: (text || "").length });
    const start = Date.now();
    const needle = String(text).toLowerCase();
    while (Date.now() - start < timeoutMs) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const el = document.querySelector(selector);
      if (el && isVisible(el)) {
        const content = (el.textContent || el.innerText || "").toLowerCase();
        if (content.includes(needle)) {
          cp("text:hit");
          return el;
        }
      }
      await new Promise((r) => {
        const t = setTimeout(r, pollMs);
        signal?.addEventListener("abort", () => (clearTimeout(t), r()), {
          once: true,
        });
      });
    }
    cp("text:timeout");
    return null;
  }

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.waiters = {
    isVisible,
    waitForVisible,
    waitForGone,
    waitForText,
    __v: "io-waiters/1.1.0",
  };
  cp("ready");
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/io/idle.js");

/* ===== core/runtime/io/idle.js ===== */
(function(){var __AP_MOD="/core/runtime/io/idle.js";try{
// ./auto-prompter/core/runtime/io/idle.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const DET = AP.composerDetect || {};

  const sleep =
    (AP.dom && AP.dom.sleep) ||
    ((ms, signal) =>
      new Promise((resolve, reject) => {
        const t = setTimeout(resolve, Math.max(0, Number(ms) || 0));
        if (signal) {
          const onAbort = () => (
            clearTimeout(t), reject(new DOMException("Aborted", "AbortError"))
          );
          signal.aborted
            ? onAbort()
            : signal.addEventListener("abort", onAbort, { once: true });
        }
      }));

  /**
   * Thin detector-backed idle wait:
   * - polls detect.findComposer for the current send button
   * - uses detect.isSendReady(send) to decide idleness
   * This is only used if the engine’s richer idle heuristic hasn’t loaded yet.
   */
  async function _fallbackWaitUntilIdle(
    stopSel,
    maxMs = 180000,
    scanMs = 900,
    signal
  ) {
    const isSendReady = (DET && DET.isSendReady) || (() => true);
    const start = Date.now();
    const stepScan = Math.max(250, Number(scanMs) || 900);

    while (Date.now() - start < maxMs) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      const stopBtn = stopSel ? document.querySelector(stopSel) : null;

      // Always ask the single source of truth for detection
      let sendBtn = null;
      try {
        const found = await (DET.findComposer?.({ allowInputOnly: false }) ||
          Promise.resolve(null));
        sendBtn = found?.send || null;
      } catch {
        // ignore
      }

      const ready = sendBtn && isSendReady(sendBtn);
      if (!stopBtn && ready) return true;

      await sleep(stepScan, signal).catch(() => {});
    }
    return false;
  }

  // Public surface:
  // - Use the engine’s implementation if already present
  // - Otherwise provide the fallback above
  AP.idleWait = AP.idleWait || {};
  if (typeof AP.idleWait.waitUntilIdle !== "function") {
    AP.idleWait.waitUntilIdle = _fallbackWaitUntilIdle;
  }

  // Also expose a stable IO helper that always delegates to AP.idleWait
  AP.io = AP.io || {};
  AP.io.waitUntilIdle =
    AP.io.waitUntilIdle || ((...args) => AP.idleWait.waitUntilIdle?.(...args));

  try {
    AP.boot?.cp?.("io:idle:ready");
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/io/compose.js");

/* ===== core/runtime/io/compose.js ===== */
(function(){var __AP_MOD="/core/runtime/io/compose.js";try{
(function () {
  "use strict";

  const FILE = "io/compose.js";
  const VERSION = "1.4.1";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  const L =
    AP.logger?.with?.({ component: "io", file: FILE }) || AP.logger || console;
  const cp = (tag, extra) => {
    try {
      AP.boot?.cp?.(`io:compose:${tag}`, {
        version: VERSION,
        ...(extra || {}),
      });
    } catch {}
  };
  const info = (...a) => (L.info || L.log || console.log).call(L, ...a);
  const warn = (...a) => (L.warn || L.log || console.log).call(L, ...a);

  const nap = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms | 0)));
  function now() {
    try {
      return performance.timeOrigin + performance.now();
    } catch {
      return Date.now();
    }
  }

  function pickCELeaf(node) {
    if (!node) return node;
    if (node.isContentEditable) return node;
    try {
      const leaf = node.querySelector?.('[contenteditable="true"]');
      return leaf || node;
    } catch {
      return node;
    }
  }

  function snapshot(el) {
    try {
      if (!el) return "";
      if ("value" in el) return String(el.value || "");
      if (el.isContentEditable)
        return String(el.innerText || el.textContent || "");
      return String(el.textContent || "");
    } catch {
      return "";
    }
  }

  async function setInputText(input0, text) {
    try {
      if (!input0) throw new Error("No input element");
      const input = pickCELeaf(input0);
      const s = String(text ?? "");
      input.focus?.({ preventScroll: true });

      // Preferred: central value API
      if (typeof AP.value?.set === "function") {
        const ok = !!(await AP.value.set(input, s));
        await nap(30);
        const snap = snapshot(input);
        const applied = ok || snap.trim().length > 0;
        cp(applied ? "setInput:valueApi:ok" : "setInput:valueApi:weak", {
          len: snap.length,
        });
        return applied;
      }

      // Editor-friendly attempt sequence (NO global selectAll)
      const doc = input.ownerDocument || document;

      try {
        input.dispatchEvent?.(
          new InputEvent("beforeinput", {
            bubbles: true,
            cancelable: true,
            inputType: "insertText",
            data: s,
          })
        );
      } catch {}

      // Element-scoped replace
      try {
        const sel = doc.getSelection?.();
        const range = doc.createRange?.();
        if (sel && range) {
          range.selectNodeContents(input);
          range.deleteContents();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } catch {}
      if ("value" in input) {
        input.value = s;
        input.dispatchEvent?.(new Event("input", { bubbles: true }));
        input.dispatchEvent?.(new Event("change", { bubbles: true }));
      } else {
        input.textContent = s;
        input.dispatchEvent?.(
          new InputEvent("input", { bubbles: true, data: s })
        );
        input.dispatchEvent?.(new Event("change", { bubbles: true }));
      }

      await nap(50);
      const snap = snapshot(input);
      const ok = snap.trim().length > 0;
      cp(ok ? "setInput:ok" : "setInput:fail", { len: snap.length });
      return ok;
    } catch (e) {
      cp("setInput:error", {
        err: String(e?.message || e),
        stack: String(e?.stack || e),
      });
      warn("[AP][io] setInputText failed:", e);
      return false;
    }
  }

  async function findComposer({
    timeoutMs = 1500,
    allowInputOnly = false,
  } = {}) {
    const t0 = now();
    try {
      const useProbe = AP.composerDetect?.probe;
      if (useProbe) {
        const res = await AP.composerDetect.probe(timeoutMs);
        if (res?.input) {
          const found = await AP.composerDetect.findComposer({
            allowInputOnly,
          });
          cp("find:probe", {
            ok: !!found?.input,
            send: !!found?.send,
            tookMs: Math.round(now() - t0),
          });
          return found || { input: null, send: null };
        }
      }
      const r = await AP.composerDetect?.findComposer?.({ allowInputOnly });
      cp("find:direct", {
        ok: !!r?.input,
        send: !!r?.send,
        tookMs: Math.round(now() - t0),
      });
      return r || { input: null, send: null };
    } catch (e) {
      cp("find:error", {
        err: String(e?.message || e),
        stack: String(e?.stack || e),
      });
      return { input: null, send: null };
    }
  }

  async function sendViaButton(btn) {
    try {
      if (!btn) return { ok: false, reason: "no_button" };
      if (AP.composerDetect?.isSendReady && !AP.composerDetect.isSendReady(btn))
        return { ok: false, reason: "button_not_ready" };
      btn.focus?.();
      btn.click?.();
      btn.dispatchEvent?.(new MouseEvent("click", { bubbles: true }));
      return { ok: true, method: "button" };
    } catch (e) {
      return { ok: false, reason: "button_error", err: e };
    }
  }
  async function sendViaEnter(input, withMeta = false) {
    try {
      if (!input) return { ok: false, reason: "no_input" };
      input.focus?.();
      const init = {
        key: "Enter",
        code: "Enter",
        which: 13,
        keyCode: 13,
        bubbles: true,
        cancelable: true,
        ...(withMeta ? { metaKey: true, ctrlKey: false } : {}),
      };
      input.dispatchEvent(new KeyboardEvent("keydown", init));
      input.dispatchEvent(new KeyboardEvent("keyup", init));
      return { ok: true, method: withMeta ? "enter_meta" : "enter" };
    } catch (e) {
      return { ok: false, reason: "enter_error", err: e };
    }
  }
  async function sendViaForm(form) {
    try {
      if (!form) return { ok: false, reason: "no_form" };
      form.requestSubmit?.() || form.submit?.();
      form.dispatchEvent?.(
        new Event("submit", { bubbles: true, cancelable: true })
      );
      return { ok: true, method: "form" };
    } catch (e) {
      return { ok: false, reason: "form_error", err: e };
    }
  }

  async function trySend({ input, send, method }) {
    if (method === "button" && send) return sendViaButton(send);
    if (method === "enter") return sendViaEnter(input, false);
    if (method === "enter_meta") return sendViaEnter(input, true);
    if (method === "form") return sendViaForm(input?.closest?.("form"));
    if (send) {
      const r1 = await sendViaButton(send);
      if (r1.ok) return r1;
    }
    let r = await sendViaEnter(input, false);
    if (r.ok) return r;
    r = await sendViaEnter(input, true);
    if (r.ok) return r;
    return sendViaForm(input?.closest?.("form"));
  }

  async function composeAndSend({
    text,
    method = "auto",
    timeoutMs = 3000,
    findTimeoutMs = 1500,
    allowInputOnly = false,
    sanity = true,
  } = {}) {
    const t0 = now();
    cp("start", { method, findTimeoutMs, timeoutMs });
    try {
      if (!text || !String(text).trim()) {
        cp("fail", { reason: "empty_text" });
        return { ok: false, reason: "empty_text" };
      }
      const comp = await findComposer({
        timeoutMs: findTimeoutMs,
        allowInputOnly,
      });
      if (!comp?.input) {
        cp("fail", { reason: "no_input" });
        return { ok: false, reason: "no_input" };
      }
      const setOk = await setInputText(comp.input, text);
      if (!setOk) {
        cp("fail", { reason: "set_input_failed" });
        return { ok: false, reason: "set_input_failed" };
      }
      await nap(20);
      const sendRes = await Promise.race([
        trySend({ input: comp.input, send: comp.send, method }),
        new Promise((r) =>
          setTimeout(() => r({ ok: false, reason: "timeout" }), timeoutMs)
        ),
      ]);
      if (!sendRes?.ok) {
        cp("fail", {
          reason: sendRes?.reason || "unknown",
          tookMs: Math.round(now() - t0),
        });
        return { ok: false, ...sendRes, tookMs: Math.round(now() - t0) };
      }
      if (sanity) {
        try {
          AP.sanity?.compose?.noteSuccess?.();
        } catch {}
      }
      const out = {
        ok: true,
        method: sendRes.method,
        tookMs: Math.round(now() - t0),
      };
      cp("ok", out);
      info("[AP][io] composeAndSend ok:", out);
      return out;
    } catch (e) {
      const err = String(e?.message || e);
      cp("error", { err, stack: String(e?.stack || e) });
      return {
        ok: false,
        reason: "exception",
        err,
        tookMs: Math.round(now() - t0),
      };
    }
  }

  AP.compose = AP.compose || {};
  AP.compose.composeAndSend = composeAndSend;
  AP.compose.__v = VERSION;

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/io/compose.js@" + VERSION
    );
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/io/value.js");

/* ===== core/runtime/io/value.js ===== */
(function(){var __AP_MOD="/core/runtime/io/value.js";try{
// VERSION: io:value/0.7.0
// - Canonical AP.io.value.set(textOrEl, maybeText)
// - Element-scoped CE writes (no global selectAll)
// - Breadcrumbs for each write path + ready safety report

(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const NS = "io:value";

  const cp = (tag, extra) => {
    try {
      AP.boot?.cp?.(`${NS}:${tag}`, { ver: "0.7.0", ...(extra || {}) });
    } catch {}
  };

  function _dispatch(el, type, opts = {}) {
    try {
      const ev =
        type === "beforeinput"
          ? new InputEvent("beforeinput", {
              bubbles: true,
              cancelable: true,
              ...opts,
            })
          : new Event(type, { bubbles: true, cancelable: true, ...opts });
      el.dispatchEvent(ev);
    } catch {}
  }

  const _isTextLikeInput = (el) => {
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    if (tag !== "input") return false;
    const t = String(el.type || "text").toLowerCase();
    const non = new Set([
      "checkbox",
      "radio",
      "file",
      "button",
      "submit",
      "reset",
      "range",
      "color",
      "date",
      "datetime-local",
      "month",
      "time",
      "week",
      "hidden",
      "image",
    ]);
    return !non.has(t);
  };

  const _isEditable = (el) => {
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    if (tag === "textarea") return true;
    if (_isTextLikeInput(el)) return true;
    if (el.isContentEditable || el.getAttribute?.("contenteditable") === "true")
      return true;
    return false;
  };

  function _writeTextareaOrInput(el, text) {
    try {
      el.focus?.({ preventScroll: true });
      el.value = String(text ?? "");
      _dispatch(el, "input");
      _dispatch(el, "change");
      _dispatch(el, "keyup");
      cp("wrote:plain", { tag: el.tagName, len: (el.value || "").length });
      return true;
    } catch (e) {
      cp("error:plain", { msg: String(e) });
      return false;
    }
  }

  function _writeContentEditable(el, text) {
    const s = String(text ?? "");
    try {
      el.focus?.({ preventScroll: true });

      // Let editors prepare
      try {
        _dispatch(el, "beforeinput", { inputType: "insertText", data: s });
      } catch {}

      // Element-scoped range deletion + insert
      const doc = el.ownerDocument || document;
      const sel = doc.getSelection?.();
      const range = doc.createRange?.();
      if (sel && range) {
        range.selectNodeContents(el);
        range.deleteContents();
        sel.removeAllRanges();
        sel.addRange(range);
      }

      el.textContent = "";
      el.appendChild(doc.createTextNode(s));

      // Notify observers
      _dispatch(el, "input", { inputType: "insertText", data: s });
      _dispatch(el, "change");
      _dispatch(el, "keyup");

      cp("wrote:ce:range", { len: s.length });
      return true;
    } catch (e) {
      cp("error:ce", { msg: String(e) });
      return false;
    }
  }

  function _insertContentEditable(el, text) {
    const s = String(text ?? "");
    try {
      el.focus?.({ preventScroll: true });
      const sel = (el.ownerDocument || document).getSelection?.();
      if (sel && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode((el.ownerDocument || document).createTextNode(s));
        range.collapse(false);
      } else {
        el.appendChild((el.ownerDocument || document).createTextNode(s));
      }
      _dispatch(el, "input", { inputType: "insertText", data: s });
      _dispatch(el, "change");
      _dispatch(el, "keyup");
      cp("insert:ce", { len: s.length });
      return true;
    } catch (e) {
      cp("error:insert:ce", { msg: String(e) });
      return false;
    }
  }

  async function _findComposerInput() {
    try {
      const found =
        (await AP.composerDetect?.findComposer?.({ allowInputOnly: true })) ||
        {};
      if (found.input) return found.input;
    } catch {}
    const FALLBACKS = [
      "#prompt-textarea.ProseMirror[contenteditable='true']",
      ".ProseMirror[contenteditable='true']#prompt-textarea",
      ".ProseMirror[contenteditable='true']",
      "#prompt-textarea[contenteditable='true']",
      "textarea[name='prompt-textarea']",
      "div[contenteditable='true']",
    ];
    for (const sel of FALLBACKS) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch {}
    }
    return null;
  }

  // Public API ---------------------------------------------------------------

  // set(targetElOrText, maybeText) → Promise<boolean>
  async function set(target, maybeText) {
    let el, text;
    if (typeof target === "string" || typeof target === "number") {
      text = String(target ?? "");
      el = await _findComposerInput();
      cp("set:auto-detect", { found: !!el, len: text.length });
    } else {
      el = target;
      text = String(maybeText ?? "");
      cp("set:explicit-el", { tag: el?.tagName, len: text.length });
    }
    if (!el || !_isEditable(el)) {
      cp("set:no-editable", { hasEl: !!el });
      return false;
    }
    const tag = (el.tagName || "").toLowerCase();
    const ok =
      tag === "textarea" || _isTextLikeInput(el)
        ? _writeTextareaOrInput(el, text)
        : _writeContentEditable(el, text);
    cp(ok ? "set:ok" : "set:fail", { tag, len: String(text).length });
    return ok;
  }

  // keep old name for compatibility
  function setValue(el, text, opts = {}) {
    cp("setValue:call", { hasEl: !!el, append: !!opts?.append });
    if (!_isEditable(el)) return false;
    if (opts?.append === true) {
      const tag = (el.tagName || "").toLowerCase();
      if (tag === "textarea" || _isTextLikeInput(el)) {
        const v = el.value || "";
        const ok = _writeTextareaOrInput(el, v + String(text ?? ""));
        cp(ok ? "setValue:append:plain:ok" : "setValue:append:plain:fail", {
          len: (el.value || "").length,
        });
        return ok;
      }
      return _insertContentEditable(el, text);
    }
    const tag = (el.tagName || "").toLowerCase();
    const ok =
      tag === "textarea" || _isTextLikeInput(el)
        ? _writeTextareaOrInput(el, text)
        : _writeContentEditable(el, text);
    cp(ok ? "setValue:ok" : "setValue:fail", { tag, len: String(text).length });
    return ok;
  }

  function get(el) {
    if (!el || !_isEditable(el)) return "";
    const tag = (el.tagName || "").toLowerCase();
    const val =
      tag === "textarea" || _isTextLikeInput(el)
        ? el.value || ""
        : el.textContent || "";
    cp("get", { tag: el.tagName, len: (val || "").length });
    return (val || "").trim();
  }

  function getValue(el) {
    return get(el);
  }

  function insert(el, text) {
    if (!_isEditable(el)) return false;
    const tag = (el.tagName || "").toLowerCase();
    if (tag === "textarea" || _isTextLikeInput(el)) {
      try {
        el.focus?.({ preventScroll: true });
        const start = el.selectionStart ?? (el.value || "").length;
        const end = el.selectionEnd ?? (el.value || "").length;
        const v = el.value || "";
        const s = String(text ?? "");
        el.value = v.slice(0, start) + s + v.slice(end);
        el.selectionStart = el.selectionEnd = start + s.length;
        _dispatch(el, "input");
        _dispatch(el, "change");
        _dispatch(el, "keyup");
        cp("insert:plain", { len: s.length });
        return true;
      } catch (e) {
        cp("error:insert:plain", { msg: String(e) });
        return false;
      }
    }
    return _insertContentEditable(el, text);
  }

  AP.io = AP.io || {};
  AP.io.value = {
    set,
    setValue,
    get,
    getValue,
    insert,
  };

  cp("ready", { safety: { globalExecCommand: false } });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/io/value/standardInput.js");

/* ===== core/runtime/io/value/standardInput.js ===== */
(function(){var __AP_MOD="/core/runtime/io/value/standardInput.js";try{
// ./auto-prompter/core/runtime/io/value/standardInput.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.valueStd && typeof AP.valueStd.set === "function") {
    try {
      AP.boot?.cp?.("io:value:std:ready:noop");
    } catch {}
    return;
  }

  /**
   * Set value into <textarea>/<input> so React/Vue/etc. detect it.
   * Uses native setter from the right prototype, then fires input/change.
   */
  function set(el, val) {
    if (!el) return false;
    if (el.isContentEditable) return false; // CE handled by valueCE

    const tag = el.tagName;
    const isTA = tag === "TEXTAREA";
    const isIN = tag === "INPUT";
    const proto =
      (isTA && HTMLTextAreaElement.prototype) ||
      (isIN && HTMLInputElement.prototype) ||
      HTMLElement.prototype;

    try {
      const desc = Object.getOwnPropertyDescriptor(proto, "value");
      if (desc && desc.set) {
        desc.set.call(el, String(val ?? ""));
      } else {
        el.value = String(val ?? "");
      }
    } catch {
      try {
        el.value = String(val ?? "");
      } catch {}
    }

    try {
      el.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    } catch {}
    try {
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } catch {}
    return true;
  }

  AP.valueStd = { set };

  if (AP.valueReg && typeof AP.valueReg.register === "function") {
    AP.valueReg.register(
      (el, txt) => !!el && !el.isContentEditable && set(el, txt),
      10
    );
  }

  try {
    AP.boot?.cp?.("io:value:std:ready");
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/io/value/contentEditable.js");

/* ===== core/runtime/io/value/contentEditable.js ===== */
(function(){var __AP_MOD="/core/runtime/io/value/contentEditable.js";try{
// ./auto-prompter/core/runtime/io/value/contentEditable.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.valueCE && typeof AP.valueCE.set === "function") {
    try {
      AP.boot?.cp?.("io:value:ce:ready:noop");
    } catch {}
    return;
  }

  AP.valueCEParts = AP.valueCEParts || {};

  function _textOf(el) {
    try {
      return el.innerText || el.textContent || "";
    } catch {
      return "";
    }
  }
  function _fireInput(el) {
    try {
      el.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    } catch {}
  }
  function _placeCaretEnd(el) {
    try {
      el.focus?.();
      const sel = el.ownerDocument.getSelection?.();
      const range = el.ownerDocument.createRange?.();
      if (sel && range) {
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch {}
  }

  // Try a provided strategy; only succeed if the DOM actually changed.
  function _tryStrategy(fn, el, text, before) {
    if (!fn) return false;
    try {
      _placeCaretEnd(el);
      const ok = !!fn(el, text);
      const after = _textOf(el);
      if (ok && after !== before) {
        _fireInput(el);
        return true;
      }
    } catch {}
    return false;
  }

  function set(el, text) {
    if (!el || !el.isContentEditable) return false;
    const P = AP.valueCEParts;
    const before = _textOf(el);

    // Ensure focus/caret
    try {
      (P.focus || _placeCaretEnd)(el);
    } catch {}

    // Ordered attempts. We *verify* each actually changed the DOM before accepting.
    if (_tryStrategy(P.insertViaBeforeInput, el, text, before)) return true;
    if (_tryStrategy(P.insertViaExecCommand, el, text, before)) return true;
    if (_tryStrategy(P.insertViaPaste, el, text, before)) return true;
    if (_tryStrategy(P.insertByHTML, el, text, before)) return true;

    // Built-in robust fallback combo: beforeinput -> execCommand -> direct node
    try {
      _placeCaretEnd(el);
      try {
        el.dispatchEvent(
          new InputEvent("beforeinput", {
            inputType: "insertText",
            data: String(text ?? ""),
            bubbles: true,
            cancelable: true,
            composed: true,
          })
        );
      } catch {}

      let applied = false;
      try {
        if (document.execCommand) {
          applied = document.execCommand(
            "insertText",
            false,
            String(text ?? "")
          );
        }
      } catch {}

      if (!applied) {
        const sel = el.ownerDocument.getSelection?.();
        if (sel && sel.rangeCount) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(el.ownerDocument.createTextNode(String(text ?? "")));
          range.collapse(false);
          applied = true;
        } else {
          el.appendChild(el.ownerDocument.createTextNode(String(text ?? "")));
          applied = true;
        }
      }

      const after = _textOf(el);
      if (after !== before) {
        _fireInput(el);
        return true;
      }
    } catch {}

    return false;
  }

  AP.valueCE = {
    set,
    _focus: (...a) => (AP.valueCEParts.focus || (() => {}))(...a),
    _insertViaExecCommand: (...a) =>
      (AP.valueCEParts.insertViaExecCommand || (() => false))(...a),
    _insertViaBeforeInput: (...a) =>
      (AP.valueCEParts.insertViaBeforeInput || (() => false))(...a),
    _insertViaPaste: (...a) =>
      (AP.valueCEParts.insertViaPaste || (() => false))(...a),
    _insertByHTML: (...a) =>
      (AP.valueCEParts.insertByHTML || (() => false))(...a),
  };

  if (AP.valueReg && typeof AP.valueReg.register === "function") {
    // High weight so CE wins over standard inputs
    AP.valueReg.register(
      (el, txt) => !!el && !!el.isContentEditable && set(el, txt),
      100
    );
  }

  try {
    AP.boot?.cp?.("io:value:ce:ready");
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/plugins/ce-writers/focus.js");

/* ===== core/plugins/ce-writers/focus.js ===== */
(function(){var __AP_MOD="/core/plugins/ce-writers/focus.js";try{
// ./auto-prompter/core/runtime/io/value/ce/focus.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.valueCEParts = AP.valueCEParts || {};

  function focus(el) {
    if (!el) return;
    try {
      el.scrollIntoView({ block: "center", inline: "nearest" });
    } catch {}
    try {
      el.click?.();
    } catch {}
    try {
      el.focus?.({ preventScroll: true });
    } catch {}
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch {}
  }

  AP.valueCEParts.focus = focus;
  try {
    AP.boot?.cp?.("io:value:ce:focus:ready");
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/plugins/ce-writers/insertBeforeInput.js");

/* ===== core/plugins/ce-writers/insertBeforeInput.js ===== */
(function(){var __AP_MOD="/core/plugins/ce-writers/insertBeforeInput.js";try{
// ./auto-prompter/core/runtime/io/value/ce/insertBeforeInput.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.valueCEParts = AP.valueCEParts || {};

  function insertViaBeforeInput(el, text) {
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      const data = String(text ?? "");

      el.dispatchEvent(
        new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data,
        })
      );

      el.textContent = "";
      const lines = data.split(/\r?\n/);
      lines.forEach((line, i) => {
        el.appendChild(document.createTextNode(line));
        if (i < lines.length - 1) el.appendChild(document.createElement("br"));
      });

      el.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data,
        })
      );

      try {
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } catch {}

      const got =
        (el.textContent || "").replace(/\u200b/g, "").trim() ||
        (el.innerText || "").trim();
      return got.length > 0;
    } catch {
      return false;
    }
  }

  AP.valueCEParts.insertViaBeforeInput = insertViaBeforeInput;
  try {
    AP.boot?.cp?.("io:value:ce:beforeinput:ready");
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/plugins/ce-writers/insertByHTML.js");

/* ===== core/plugins/ce-writers/insertByHTML.js ===== */
(function(){var __AP_MOD="/core/plugins/ce-writers/insertByHTML.js";try{
// ./auto-prompter/core/runtime/io/value/ce/insertByHTML.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.valueCEParts = AP.valueCEParts || {};

  function insertByHTML(el, text) {
    const html = String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
    el.innerHTML = html;

    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch {}

    try {
      el.dispatchEvent(
        new InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          inputType: "insertFromPaste",
          data: String(text ?? ""),
        })
      );
    } catch {}
    try {
      el.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    } catch {}
    try {
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } catch {}
    return true;
  }

  AP.valueCEParts.insertByHTML = insertByHTML;
  try {
    AP.boot?.cp?.("io:value:ce:byhtml:ready");
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/plugins/ce-writers/insertExecCommand.js");

/* ===== core/plugins/ce-writers/insertExecCommand.js ===== */
(function(){var __AP_MOD="/core/plugins/ce-writers/insertExecCommand.js";try{
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.valueCEParts = AP.valueCEParts || {};

  // Runtime flag: turn on only if you need to A/B test execCommand
  // Default is OFF to avoid whole-page selection side-effects.
  const ALLOW = !!(AP.flags && AP.flags.ALLOW_EXEC_COMMAND);

  function insertViaExecCommand(el, text) {
    const cp = (tag, extra) => {
      try {
        AP.boot?.cp?.("io:value:ce:execcommand:" + tag, extra || {});
      } catch {}
    };
    if (!ALLOW) {
      cp("skipped", { reason: "flag_off" });
      return false;
    }
    try {
      if (!el) {
        cp("fail", { reason: "no_el" });
        return false;
      }
      const doc = el.ownerDocument || document;
      const sel = doc.getSelection?.();
      const range = doc.createRange?.();
      if (sel && range) {
        // Scope selection to the element only (no global selectAll)
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      const ok = doc.execCommand?.("insertText", false, String(text ?? ""));
      cp(ok ? "ok" : "weak", { len: String(text ?? "").length });
      return !!ok;
    } catch (e) {
      cp("error", { msg: String(e?.message || e) });
      return false;
    }
  }

  AP.valueCEParts.insertViaExecCommand = insertViaExecCommand;
  try {
    AP.boot?.cp?.("io:value:ce:execcommand:ready", { allow: ALLOW });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/plugins/ce-writers/insertPaste.js");

/* ===== core/plugins/ce-writers/insertPaste.js ===== */
(function(){var __AP_MOD="/core/plugins/ce-writers/insertPaste.js";try{
// ./auto-prompter/core/runtime/io/value/ce/insertPaste.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.valueCEParts = AP.valueCEParts || {};

  function insertViaPaste(el, text) {
    try {
      const dt = new DataTransfer();
      dt.setData("text/plain", String(text ?? ""));
      const ev = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      });
      return el.dispatchEvent(ev);
    } catch {
      return false;
    }
  }

  AP.valueCEParts.insertViaPaste = insertViaPaste;
  try {
    AP.boot?.cp?.("io:value:ce:paste:ready");
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/io/submit/button.js");

/* ===== core/runtime/io/submit/button.js ===== */
(function(){var __AP_MOD="/core/runtime/io/submit/button.js";try{
(function () {
  "use strict";
  const FILE = "io/submit/button.js";
  const VERSION = "1.0.1";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const cp = (tag, extra) =>
    AP.boot?.cp?.(`io:submit:button:${tag}`, {
      version: VERSION,
      ...(extra || {}),
    });

  async function clickButton(btn) {
    try {
      if (!btn) return { ok: false, reason: "no_button" };
      if (
        AP.composerDetect?.isSendReady &&
        !AP.composerDetect.isSendReady(btn)
      ) {
        cp("not_ready", {});
        return { ok: false, reason: "button_not_ready" };
      }
      btn.focus?.();
      btn.click?.();
      btn.dispatchEvent?.(new MouseEvent("click", { bubbles: true }));
      cp("ok", {});
      return { ok: true, method: "button" };
    } catch (e) {
      cp("error", {
        err: String(e?.message || e),
        stack: String(e?.stack || e),
      });
      return { ok: false, reason: "exception" };
    }
  }
  AP.submit = AP.submit || {};
  AP.submit.viaButton = clickButton;
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/io/submit/button.js@" + VERSION
    );
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/io/submit/enter.js");

/* ===== core/runtime/io/submit/enter.js ===== */
(function(){var __AP_MOD="/core/runtime/io/submit/enter.js";try{
// ./core/runtime/io/submit/enter.js
(function () {
  "use strict";
  const FILE = "io/submit/enter.js";
  const VERSION = "1.0.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const cp = (tag, extra) => AP.boot?.cp?.(`io:submit:enter:${tag}`, { version: VERSION, ...(extra || {}) });

  function keyEvent(el, type, withMeta) {
    const init = { key: "Enter", code: "Enter", which: 13, keyCode: 13, bubbles: true, cancelable: true, ...(withMeta ? { metaKey: true, ctrlKey: false } : {}) };
    return el.dispatchEvent(new KeyboardEvent(type, init));
  }
  async function viaEnter(input, withMeta = false) {
    try { if (!input) return { ok: false, reason: "no_input" }; input.focus?.(); keyEvent(input, "keydown", withMeta); keyEvent(input, "keyup", withMeta); cp("ok", { meta: !!withMeta }); return { ok: true, method: withMeta ? "enter_meta" : "enter" }; }
    catch (e) { cp("error", { err: String(e?.message || e), stack: String(e?.stack || e) }); return { ok: false, reason: "exception" }; }
  }
  AP.submit = AP.submit || {}; AP.submit.viaEnter = viaEnter;
  try { (window.__AP_LOAD = window.__AP_LOAD || []).push("core/runtime/io/submit/enter.js@" + VERSION); } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/io/submit/form.js");

/* ===== core/runtime/io/submit/form.js ===== */
(function(){var __AP_MOD="/core/runtime/io/submit/form.js";try{
// ./auto-prompter/ui/panel/controls/form.js
(function () {
  "use strict";

  function parseNonNegInt(s, fallback) {
    const n = Number(String(s || "").trim());
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
  }

  function readVal(ref, fallback) {
    try {
      const v = ref && typeof ref.value !== "undefined" ? ref.value : undefined;
      return String(v == null ? fallback : v).trim();
    } catch {
      return String(fallback || "").trim();
    }
  }

  function readForm(refs, defaults) {
    const d = defaults || {};

    let sequence = "";
    try {
      const UI = (window.AutoPrompter = window.AutoPrompter || {}).uiControlsUI;
      if (UI && typeof UI.sequenceFromSteps === "function") {
        sequence = UI.sequenceFromSteps(refs.__shadow);
      }
    } catch {}
    if (!sequence && refs.seq) sequence = refs.seq.value;

    const inputSel = readVal(refs.inputSel, d.inputSel || "");
    const submitSel = readVal(refs.submitSel, d.submitSel || "");
    const stopSel = readVal(refs.stopSel, d.stopSel || "");
    const autoDetect =
      refs.auto && typeof refs.auto.checked === "boolean"
        ? Boolean(refs.auto.checked)
        : true;

    return {
      sequence,
      delayMs: parseNonNegInt(
        refs.delay && refs.delay.value,
        d.defaultDelayMs ?? 1000
      ),
      scanMs: parseNonNegInt(
        refs.scan && refs.scan.value,
        d.defaultScanMs ?? 900
      ),
      minIntervalMs: parseNonNegInt(
        refs.minint && refs.minint.value,
        d.defaultMinIntervalMs ?? 400
      ),
      inputSel,
      submitSel,
      stopSel,
      autoDetect,
    };
  }

  window.AutoPrompter = window.AutoPrompter || {};
  window.AutoPrompter.uiControlsForm = { parseNonNegInt, readForm };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/ui/dom/attrs.js");

/* ===== core/ui/dom/attrs.js ===== */
(function(){var __AP_MOD="/core/ui/dom/attrs.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/ui/dom/attrs.js
(function () {
  "use strict";
  const VERSION = "4.3.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/ui/dom/attrs.js"
    );
  } catch {}

  const { isObj, isFn } = (AP.domUtils = AP.domUtils || {});
  if (AP.domAttrs?.__ready) {
    try {
      AP.boot?.cp?.("ui:dom:attrs:ready", { version: VERSION, reused: true });
    } catch {}
    return;
  }

  function setAttrs(el, attrs = {}) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;

      if (k === "class" || k === "className") {
        el.className = Array.isArray(v)
          ? v.filter(Boolean).join(" ")
          : String(v);
        continue;
      }
      if (k === "style" && (isObj?.(v) || typeof v === "string")) {
        if (isObj?.(v)) Object.assign(el.style, v);
        else el.setAttribute("style", v);
        continue;
      }
      if (k === "dataset" && isObj?.(v)) {
        Object.assign(el.dataset, v);
        continue;
      }
      if (k.startsWith("on") && isFn?.(v)) {
        el.addEventListener(k.slice(2).toLowerCase(), v);
        continue;
      }

      if (k in el) {
        try {
          el[k] = v;
          continue;
        } catch {}
      }
      if (typeof v === "boolean") {
        v ? el.setAttribute(k, "") : el.removeAttribute(k);
        continue;
      }
      el.setAttribute(k, String(v));
    }
    return el;
  }

  AP.domAttrs = { __ready: true, setAttrs };

  try {
    AP.boot?.cp?.("ui:dom:attrs:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/ui/dom/el.js");

/* ===== core/ui/dom/el.js ===== */
(function(){var __AP_MOD="/core/ui/dom/el.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/ui/dom/el.js
(function () {
  "use strict";
  const VERSION = "4.3.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/ui/dom/el.js"
    );
  } catch {}

  const { setAttrs } = (AP.domAttrs = AP.domAttrs || {});
  if (AP.domEl?.__ready) {
    try {
      AP.boot?.cp?.("ui:dom:el:ready", { version: VERSION, reused: true });
    } catch {}
    return;
  }

  function el(tag, attrs = {}, children = []) {
    const isSvg = /^svg:/.test(tag);
    const name = isSvg ? tag.replace(/^svg:/, "") : tag;
    const e = isSvg
      ? document.createElementNS("http://www.w3.org/2000/svg", name)
      : document.createElement(name);
    setAttrs(e, attrs);
    const append = (c) =>
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    if (Array.isArray(children)) for (const c of children) append(c);
    else if (children != null) append(children);
    return e;
  }

  AP.domEl = { __ready: true, el };

  try {
    AP.boot?.cp?.("ui:dom:el:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/ui/dom/query.js");

/* ===== core/ui/dom/query.js ===== */
(function(){var __AP_MOD="/core/ui/dom/query.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/ui/dom/query.js
(function () {
  "use strict";
  const VERSION = "4.3.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/ui/dom/query.js"
    );
  } catch {}

  if (AP.domQuery?.__ready && AP.domQuery.__v >= 4) {
    try {
      AP.boot?.cp?.("ui:dom:query:ready", {
        version: VERSION,
        reused: true,
        v: AP.domQuery.__v,
      });
    } catch {}
    return;
  }

  const DU = (AP.domUtils = AP.domUtils || {});
  const isFn =
    typeof DU?.isFn === "function" ? DU.isFn : (v) => typeof v === "function";

  function iframeTraversalEnabled() {
    try {
      return (
        (AP.flags && AP.flags.detectIframes) ||
        localStorage.getItem("ap_detect_iframes") === "1"
      );
    } catch {
      return false;
    }
  }

  function* walkTree(node, depth = 0) {
    if (!node || depth > 5) return;
    yield node;

    if (node.shadowRoot) yield* walkTree(node.shadowRoot, depth + 1);

    const kids = node.children || node.childNodes || [];
    for (const c of kids) yield* walkTree(c, depth + 1);

    if (node instanceof ShadowRoot) {
      for (const c of node.childNodes) yield* walkTree(c, depth + 1);
    }

    if (iframeTraversalEnabled() && node instanceof HTMLIFrameElement) {
      try {
        const doc =
          node.contentDocument ||
          (node.contentWindow && node.contentWindow.document);
        if (doc?.documentElement) {
          yield doc;
          yield* walkTree(doc.documentElement, depth + 1);
        }
      } catch {}
    }
  }

  function queryDeep(selector, root = document) {
    for (const n of walkTree(root)) {
      try {
        if (n && isFn(n.querySelector)) {
          const found = n.querySelector(selector);
          if (found) return found;
        }
      } catch {}
    }
    return null;
  }

  function queryAllDeep(selector, root = document) {
    const out = [];
    for (const n of walkTree(root)) {
      try {
        if (n && isFn(n.querySelectorAll)) {
          for (const el of n.querySelectorAll(selector)) out.push(el);
        }
      } catch {}
    }
    return out;
  }

  const qs = (sel, root) => (root || document).querySelector(sel);
  const qsa = (sel, root) =>
    Array.from((root || document).querySelectorAll(sel));
  const qsDeep = (sel, root) => queryDeep(sel, root);
  const qsaDeep = (sel, root) => queryAllDeep(sel, root);

  AP.domQuery = {
    __ready: true,
    __v: 4,
    walkTree,
    queryDeep,
    queryAllDeep,
    qs,
    qsa,
    qsDeep,
    qsaDeep,
  };

  try {
    AP.boot?.cp?.("ui:dom:query:ready", { version: VERSION, v: 4 });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/ui/dom/shadow.js");

/* ===== core/ui/dom/shadow.js ===== */
(function(){var __AP_MOD="/core/ui/dom/shadow.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/ui/dom/shadow.js
(function () {
  "use strict";
  const VERSION = "4.3.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/ui/dom/shadow.js"
    );
  } catch {}

  const { el } = (AP.domEl = AP.domEl || {});
  const { injectStyles } = (AP.domStyles = AP.domStyles || {});
  if (AP.domShadow?.__ready) {
    try {
      AP.boot?.cp?.("ui:dom:shadow:ready", { version: VERSION, reused: true });
    } catch {}
    return;
  }

  function createShadowHost({
    tag = "div",
    mode = "open",
    attrs = {},
    css,
  } = {}) {
    const host = el(tag, attrs);
    const shadow = host.attachShadow({ mode });
    if (css) injectStyles(css, shadow);
    return { host, shadow };
  }

  AP.domShadow = { __ready: true, createShadowHost };

  try {
    AP.boot?.cp?.("ui:dom:shadow:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/ui/dom/styles.js");

/* ===== core/ui/dom/styles.js ===== */
(function(){var __AP_MOD="/core/ui/dom/styles.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/ui/dom/styles.js
(function () {
  "use strict";
  const VERSION = "4.3.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/ui/dom/styles.js"
    );
  } catch {}

  if (AP.domStyles?.__ready) {
    try {
      AP.boot?.cp?.("ui:dom:styles:ready", { version: VERSION, reused: true });
    } catch {}
    return;
  }

  function injectStyles(cssText, root = document) {
    const targetDocLike = root instanceof ShadowRoot ? root : document;
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(String(cssText));
      const current = targetDocLike.adoptedStyleSheets || [];
      targetDocLike.adoptedStyleSheets = [...current, sheet];
      return sheet;
    } catch {
      const s = document.createElement("style");
      s.textContent = String(cssText);
      const parent =
        root instanceof ShadowRoot
          ? root
          : document.head || document.documentElement;
      parent.appendChild(s);
      return s;
    }
  }

  AP.domStyles = { __ready: true, injectStyles };

  try {
    AP.boot?.cp?.("ui:dom:styles:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/ui/dom/utils.js");

/* ===== core/ui/dom/utils.js ===== */
(function(){var __AP_MOD="/core/ui/dom/utils.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/ui/dom/utils.js
(function () {
  "use strict";
  const VERSION = "4.3.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/ui/dom/utils.js"
    );
  } catch {}

  // If shared/domUtils.js (v>=3) already exists, do not downgrade/override.
  if (AP.domUtils && (AP.domUtils.__v >= 3 || AP.domUtils.__ready)) {
    try {
      AP.boot?.cp?.("ui:dom:utils:ready", {
        version: VERSION,
        reused: true,
        v: AP.domUtils.__v ?? "legacy",
      });
    } catch {}
    return;
  }

  const isObj = (v) => v && typeof v === "object";
  const isFn = (v) => typeof v === "function";

  const sleep = (ms, signal) =>
    new Promise((resolve, reject) => {
      const t = setTimeout(resolve, Math.max(0, Number(ms) || 0));
      if (signal) {
        const onAbort = () => {
          clearTimeout(t);
          reject(new DOMException("Aborted", "AbortError"));
        };
        signal.aborted
          ? onAbort()
          : signal.addEventListener("abort", onAbort, { once: true });
      }
    });

  const nextTick = () => Promise.resolve().then(() => undefined);

  function onDomReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      try {
        fn();
      } catch {}
    }
  }

  AP.domUtils = {
    __ready: true,
    __v: 2,
    isObj,
    isFn,
    sleep,
    onDomReady,
    nextTick,
  };

  try {
    AP.boot?.cp?.("ui:dom:utils:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/ui/dom/waitForSelector.js");

/* ===== core/ui/dom/waitForSelector.js ===== */
(function(){var __AP_MOD="/core/ui/dom/waitForSelector.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/ui/dom/waitForSelector.js
(function () {
  "use strict";
  const VERSION = "4.3.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/ui/dom/waitForSelector.js"
    );
  } catch {}

  const { sleep } = (AP.domUtils = AP.domUtils || {});
  const { queryDeep } = (AP.domQuery = AP.domQuery || {});
  if (AP.domWait?.__ready) {
    try {
      AP.boot?.cp?.("ui:dom:waitForSelector:ready", {
        version: VERSION,
        reused: true,
      });
    } catch {}
    return;
  }

  async function waitForSelector(sel, timeout = 10000, opts = {}) {
    const { root = document, pollMs = 200, signal, deep = false } = opts || {};
    const t0 = Date.now();
    const finder = deep
      ? (s, r) => queryDeep(s, r || document)
      : (s, r) => (r || document).querySelector(s);

    try {
      const first = finder(sel, root);
      if (first) return first;
    } catch {}

    while (Date.now() - t0 < timeout) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      try {
        const n = finder(sel, root);
        if (n) return n;
      } catch {}
      try {
        if (typeof sleep === "function") await sleep(pollMs, signal);
        else {
          await new Promise((resolve) => {
            const t = setTimeout(resolve, pollMs);
            signal?.addEventListener(
              "abort",
              () => (clearTimeout(t), resolve()),
              { once: true }
            );
          });
        }
      } catch (e) {
        if (e?.name === "AbortError") throw e;
      }
    }
    return null;
  }

  AP.domWait = { __ready: true, __v: 2, waitForSelector };

  try {
    AP.boot?.cp?.("ui:dom:waitForSelector:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/ui/dom/index.js");

/* ===== core/ui/dom/index.js ===== */
(function(){var __AP_MOD="/core/ui/dom/index.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/ui/dom/index.js
(function () {
  "use strict";
  const VERSION = "4.3.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/ui/dom/index.js"
    );
  } catch {}

  const already = !!(AP.dom && typeof AP.dom.el === "function");

  const { el } = (AP.domEl = AP.domEl || {});
  const { setAttrs } = (AP.domAttrs = AP.domAttrs || {});
  const { injectStyles } = (AP.domStyles = AP.domStyles || {});
  const { waitForSelector } = (AP.domWait = AP.domWait || {});
  const { qs, qsa, qsDeep, qsaDeep } = (AP.domQuery = AP.domQuery || {});
  const { createShadowHost } = (AP.domShadow = AP.domShadow || {});
  const { onDomReady, sleep, throttle, debounce, nextTick } = (AP.domUtils =
    AP.domUtils || {});

  if (!already) {
    AP.dom = {
      el,
      setAttrs,
      injectStyles,
      waitForSelector,
      qs,
      qsa,
      qsDeep,
      qsaDeep,
      createShadowHost,
      onDomReady,
      sleep,
      throttle,
      debounce,
      nextTick,
      __source: "ui/dom/index",
    };
  }

  try {
    AP.boot?.cp?.("ui:dom:index:ready", {
      version: VERSION,
      assembled: !already,
    });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/ui/index.js");

/* ===== core/ui/index.js ===== */
(function(){var __AP_MOD="/core/ui/index.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/ui/index.js
// Namespace combiner for UI helpers. Non-intrusive.
(function () {
  "use strict";
  const VERSION = "4.3.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/ui/index.js"
    );
  } catch {}

  if (AP.__uiIndexReady) {
    try {
      AP.boot?.cp?.("ui:index:ready", { version: VERSION, reused: true });
    } catch {}
    return;
  }
  AP.__uiIndexReady = true;

  AP.ui = AP.ui || {};
  AP.ui.panel = AP.ui.panel || AP.uiPanel || {};
  AP.ui.position = AP.ui.position || AP.uiPosition || {};
  AP.ui.dom = AP.ui.dom || AP.dom || {};

  try {
    AP.boot?.cp?.("ui:index:ready", {
      version: VERSION,
      surfaces: {
        panel: !!AP.ui.panel,
        position: !!AP.ui.position,
        dom: !!AP.ui.dom,
      },
    });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/ui/position.js");

/* ===== core/ui/position.js ===== */
(function(){var __AP_MOD="/core/ui/position.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/ui/position.js
(function () {
  "use strict";
  const VERSION = "4.3.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/ui/position.js"
    );
  } catch {}

  if (AP.uiPosition && typeof AP.uiPosition.applyPosition === "function") {
    try {
      AP.boot?.cp?.("ui:position:ready", { version: VERSION, reused: true });
    } catch {}
    return;
  }

  const POS_KEY = "ap_ui_pos_v2";

  function loadPos() {
    try {
      return JSON.parse(localStorage.getItem(POS_KEY) || "{}");
    } catch {
      return {};
    }
  }
  function savePos(p) {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(p || {}));
    } catch {}
  }

  function applyPosition(card, pos = {}) {
    if (!card) return;
    const p = { docked: pos.docked ?? "right", top: pos.top ?? 20, ...pos };
    card.style.position = "fixed";
    card.style.top = `${Math.max(12, p.top)}px`;
    if (p.docked === "left") {
      card.style.left = `${p.left ?? 20}px`;
      card.style.right = "auto";
    } else {
      card.style.right = `${p.right ?? 20}px`;
      card.style.left = "auto";
    }
    card.classList.toggle("ap-card--hidden", !!p.hidden);
    card.classList.toggle("ap-card--collapsed", !!p.collapsed);
  }

  function toggleHidden(card, pos = {}, val) {
    const hidden = typeof val === "boolean" ? val : !pos.hidden;
    if (card) card.classList.toggle("ap-card--hidden", hidden);
    pos.hidden = hidden;
    savePos(pos);
  }
  function toggleCollapsed(card, pos = {}, val) {
    const collapsed = typeof val === "boolean" ? val : !pos.collapsed;
    if (card) card.classList.toggle("ap-card--collapsed", collapsed);
    pos.collapsed = collapsed;
    savePos(pos);
  }
  function dock(card, pos = {}, side) {
    pos.docked = side === "left" ? "left" : "right";
    applyPosition(card, pos);
    savePos(pos);
  }

  AP.uiPosition = {
    POS_KEY,
    loadPos,
    savePos,
    applyPosition,
    makeDraggable: () => {},
    toggleHidden,
    toggleCollapsed,
    dock,
  };

  try {
    AP.boot?.cp?.("ui:position:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/ui/panel.js");

/* ===== core/ui/panel.js ===== */
(function(){var __AP_MOD="/core/ui/panel.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/ui/panel.js
(function () {
  "use strict";
  const VERSION = "4.3.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/ui/panel.js"
    );
  } catch {}

  if (AP.uiPanel && typeof AP.uiPanel.createPanel === "function") {
    try {
      AP.boot?.cp?.("ui:panel:ready", { version: VERSION, reused: true });
    } catch {}
    return;
  }

  const L = AP.logger?.with
    ? AP.logger.with({ component: "ui", file: "panel.js" })
    : console;
  const { el, injectStyles } = (AP.dom = AP.dom || {});
  const Pos = (AP.uiPosition = AP.uiPosition || {});

  AP.uiPanel = {
    createPanel({ onStart, onStop } = {}) {
      injectStyles(`
        .ap-card{position:fixed;top:20px;right:20px;background:#0b1220;color:#e5e7eb;
          border:1px solid #243145;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.3);
          width:320px;z-index:2147483647;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial}
        .ap-card--hidden{display:none!important}
        .ap-row{display:flex;gap:8px;flex-wrap:wrap;padding:10px}
        .ap-toggle{position:fixed;right:16px;bottom:16px;width:44px;height:44px;border-radius:999px;
          border:1px solid #374151;background:#111827;color:#e5e7eb;z-index:2147483647;cursor:pointer}
        textarea,input,button{background:#1f2937;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 10px}
        textarea{min-height:80px;width:100%}
      `);

      const host = el("div");
      (document.body || document.documentElement).appendChild(host);

      const shadow = host.attachShadow({ mode: "open" });

      const toggle = el("button", {
        className: "ap-toggle",
        textContent: "AP",
        type: "button",
        title: "Toggle Auto-Prompter",
      });
      (document.body || document.documentElement).appendChild(toggle);

      const card = el("div", { className: "ap-card" });
      const ta = el("textarea", { id: "ap-seq", placeholder: "Sequence..." });
      const btnStart = el("button", {
        textContent: "Start",
        onclick: () => {
          try {
            onStart && onStart({ sequence: ta.value || "", autoDetect: true });
          } catch (e) {
            (L.error || L.log).call(L, "[AP ui] start error", e);
          }
        },
      });
      const btnStop = el("button", {
        textContent: "Stop",
        style: "margin-left:8px",
        onclick: () => {
          try {
            onStop && onStop();
          } catch (e) {
            (L.error || L.log).call(L, "[AP ui] stop error", e);
          }
        },
      });

      card.appendChild(el("div", { className: "ap-row" }, [ta]));
      card.appendChild(el("div", { className: "ap-row" }, [btnStart, btnStop]));
      shadow.appendChild(card);

      const pos = typeof Pos.loadPos === "function" ? Pos.loadPos() : {};
      if (typeof Pos.applyPosition === "function") Pos.applyPosition(card, pos);

      toggle.onclick = () => {
        try {
          if (typeof Pos.toggleHidden === "function") {
            Pos.toggleHidden(card, pos, undefined);
          } else {
            card.classList.toggle("ap-card--hidden");
          }
          AP.boot?.cp?.("ui:panel:toggle", {
            hidden: card.classList.contains("ap-card--hidden"),
          });
        } catch {}
      };

      try {
        AP.boot?.cp?.("ui:panel:ready", { version: VERSION });
      } catch {}
      return { root: host, shadow };
    },
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/ui/positionFallback.js");

/* ===== core/ui/positionFallback.js ===== */
(function(){var __AP_MOD="/core/ui/positionFallback.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/util/ui/positionFallback.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.uiPosition?.__v >= 2) return;

  const POS_KEY = "ap_ui_pos_v2";

  function loadPos() {
    try {
      return JSON.parse(localStorage.getItem(POS_KEY) || "{}");
    } catch {
      return {};
    }
  }
  function savePos(p) {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(p || {}));
    } catch {}
  }

  function applyPosition(card, pos = {}) {
    if (!card) return;
    const p = { docked: pos.docked ?? "right", top: pos.top ?? 20, ...pos };
    card.style.position = "fixed";
    card.style.top = `${Math.max(12, p.top)}px`;
    if (p.docked === "left") {
      card.style.left = `${p.left ?? 20}px`;
      card.style.right = "auto";
    } else {
      card.style.right = `${p.right ?? 20}px`;
      card.style.left = "auto";
    }
    card.classList.toggle("ap-card--hidden", !!p.hidden);
    card.classList.toggle("ap-card--collapsed", !!p.collapsed);
  }

  function toggleHidden(card, pos = {}, val) {
    const hidden = typeof val === "boolean" ? val : !pos.hidden;
    if (card) card.classList.toggle("ap-card--hidden", hidden);
    pos.hidden = hidden;
    savePos(pos);
  }
  function toggleCollapsed(card, pos = {}, val) {
    const collapsed = typeof val === "boolean" ? val : !pos.collapsed;
    if (card) card.classList.toggle("ap-card--collapsed", collapsed);
    pos.collapsed = collapsed;
    savePos(pos);
  }

  function dock(card, pos = {}, side) {
    pos.docked = side === "left" ? "left" : "right";
    applyPosition(card, pos);
    savePos(pos);
  }

  // NEW: basic draggable support (mouse + touch)
  function makeDraggable(card, handle, pos = {}) {
    if (!card) return () => {};
    const dragEl = handle || card;
    let startX = 0,
      startY = 0,
      startTop = 0,
      startLeftOrRight = 0,
      dragging = false;

    const getClientXY = (ev) => {
      if (ev.touches && ev.touches[0])
        return { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
      return { x: ev.clientX, y: ev.clientY };
    };

    function onDown(ev) {
      const { x, y } = getClientXY(ev);
      dragging = true;
      startX = x;
      startY = y;
      startTop = parseFloat(card.style.top || "20");
      if (pos.docked === "left")
        startLeftOrRight = parseFloat(card.style.left || "20");
      else startLeftOrRight = parseFloat(card.style.right || "20");
      ev.preventDefault();
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp, { once: true });
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onUp, { once: true });
    }

    function onMove(ev) {
      if (!dragging) return;
      const { x, y } = getClientXY(ev);
      const dx = x - startX;
      const dy = y - startY;

      const vh = Math.max(
        document.documentElement.clientHeight,
        window.innerHeight || 0,
      );
      const vw = Math.max(
        document.documentElement.clientWidth,
        window.innerWidth || 0,
      );

      const newTop = Math.min(Math.max(12, startTop + dy), vh - 60);
      card.style.top = `${newTop}px`;
      pos.top = newTop;

      if (pos.docked === "left") {
        const newLeft = Math.min(Math.max(12, startLeftOrRight + dx), vw - 60);
        card.style.left = `${newLeft}px`;
        pos.left = newLeft;
        delete pos.right;
      } else {
        const newRight = Math.min(Math.max(12, startLeftOrRight - dx), vw - 60);
        card.style.right = `${newRight}px`;
        pos.right = newRight;
        delete pos.left;
      }
      savePos(pos);
      ev.preventDefault();
    }

    function onUp() {
      dragging = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
    }

    dragEl.addEventListener("mousedown", onDown);
    dragEl.addEventListener("touchstart", onDown, { passive: false });

    return () => {
      dragEl.removeEventListener("mousedown", onDown);
      dragEl.removeEventListener("touchstart", onDown);
      onUp();
    };
  }

  AP.uiPosition = {
    __v: 2,
    POS_KEY,
    loadPos,
    savePos,
    applyPosition,
    makeDraggable,
    toggleHidden,
    toggleCollapsed,
    dock,
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/compat/domWait.proxy.js");

/* ===== core/runtime/compat/domWait.proxy.js ===== */
(function(){var __AP_MOD="/core/runtime/compat/domWait.proxy.js";try{
// ./auto-prompter/core/runtime/domWait.js
// Thin alias that delegates to the canonical waiter from ui/dom/waitForSelector.js.
// Does NOT set __ready, so the canonical module can still replace it when it loads.
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  // If the canonical waiter is already installed, do nothing.
  if (
    AP.domWait &&
    AP.domWait.__ready &&
    typeof AP.domWait.waitForSelector === "function"
  )
    return;

  const DU = (AP.domUtils = AP.domUtils || {});
  const DQ = (AP.domQuery = AP.domQuery || {});

  async function fallbackWaitForSelector(sel, timeout = 10000, opts = {}) {
    const { root = document, pollMs = 200, signal, deep = false } = opts || {};
    const finder =
      deep && typeof DQ.queryDeep === "function"
        ? (s, r) => DQ.queryDeep(s, r || document)
        : (s, r) => (r || document).querySelector(s);

    const t0 = Date.now();
    try {
      const first = finder(sel, root);
      if (first) return first;
    } catch {}

    while (Date.now() - t0 < timeout) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      try {
        const n = finder(sel, root);
        if (n) return n;
      } catch {}
      await (DU.sleep
        ? DU.sleep(pollMs, signal)
        : new Promise((r) => setTimeout(r, pollMs)));
    }
    return null;
  }

  // Delegating proxy; prefers AP.dom.waitForSelector when available.
  function proxyWaitForSelector(sel, timeout, opts) {
    const impl =
      (AP.dom &&
        typeof AP.dom.waitForSelector === "function" &&
        AP.dom.waitForSelector) ||
      (AP.domWait &&
        AP.domWait.waitForSelector === proxyWaitForSelector &&
        null) ||
      null;
    if (impl) return impl(sel, timeout, opts);
    return fallbackWaitForSelector(sel, timeout, opts);
  }

  AP.domWait = AP.domWait || {};
  AP.domWait.waitForSelector = proxyWaitForSelector;
  // Intentionally do NOT set AP.domWait.__ready here.
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/compat/startOnce.wrap.js");

/* ===== core/runtime/compat/startOnce.wrap.js ===== */
(function(){var __AP_MOD="/core/runtime/compat/startOnce.wrap.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/compat/startOnce.wrap.js
(function () {
  "use strict";

  const VERSION = "4.3.3";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/compat/startOnce.wrap.js@4.3.3"
    );
  } catch {}

  function applyWrap(core) {
    if (!core) return;

    // Use a symbol to avoid colliding with consumer fields.
    const WRAP_FLAG = Symbol.for("ap.core.startOnce.wrapApplied");
    if (core[WRAP_FLAG]) return;
    core[WRAP_FLAG] = true;

    const originalStart = typeof core.start === "function" ? core.start : null;
    const originalStop = typeof core.stop === "function" ? core.stop : null;

    let startPromise = null; // share pending start across re-entrant calls
    let stopping = false;

    const cp = (tag, data) => {
      try {
        AP.boot?.cp?.(tag, data);
      } catch {}
    };

    function wrappedStart(...args) {
      if (core._started && !startPromise) return Promise.resolve(true);
      if (startPromise) return startPromise;

      cp("core:start:enter");

      startPromise = Promise.resolve()
        .then(() => (originalStart ? originalStart.apply(this, args) : true))
        .then((res) => {
          const ok = res !== false;
          core._started = ok;
          cp(ok ? "core:start:ready" : "core:start:no-op");
          return res;
        })
        .catch((e) => {
          cp("core:start:error", { err: String(e?.message || e) });
          throw e;
        })
        .finally(() => {
          startPromise = null;
        });

      return startPromise;
    }

    async function wrappedStop(...args) {
      if (stopping) return true;
      stopping = true;
      try {
        const res = await (originalStop
          ? originalStop.apply(this, args)
          : true);
        return res;
      } finally {
        core._started = false;
        stopping = false;
        cp("core:stop");
      }
    }

    // Install wrappers on the *facade object* (not the AP namespace).
    try {
      core.start = wrappedStart;
      core.stop = wrappedStop;
    } catch {
      // Fallback if properties are non-writable on some builds.
      try {
        Object.defineProperty(core, "start", {
          configurable: true,
          writable: true,
          enumerable: true,
          value: wrappedStart,
        });
        Object.defineProperty(core, "stop", {
          configurable: true,
          writable: true,
          enumerable: true,
          value: wrappedStop,
        });
      } catch (err) {
        try {
          (AP.logger || console).warn(
            "[AP compat] startOnce wrapper install failed",
            err
          );
        } catch {}
      }
    }

    // Quiet the "[AP boot] coreStart.start missing" by providing a delegate to the facade.
    try {
      AP.coreStart = AP.coreStart || {};
      if (typeof AP.coreStart.start !== "function") {
        AP.coreStart.start = core.start;
      }
    } catch {}
  }

  // Apply immediately if the facade is already present; otherwise, wait for it.
  const existing = AP.AutoPrompterCore;
  if (existing) {
    applyWrap(existing);
  } else {
    try {
      window.addEventListener(
        "ap:core-ready",
        () => applyWrap(AP.AutoPrompterCore),
        { once: true }
      );
    } catch {}
  }

  try {
    AP.boot?.cp?.("compat:startOnce:ready", { version: VERSION });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/ap/promptEngine.shim.js");

/* ===== core/runtime/ap/promptEngine.shim.js ===== */
(function(){var __AP_MOD="/core/runtime/ap/promptEngine.shim.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/ap/promptEngine.shim.js
// SHIM: forward to the modular engine API to avoid drift.
(function () {
  "use strict";
  const VERSION = "4.3.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/ap/promptEngine.shim.js"
    );
  } catch {}

  if (AP.promptEngine && typeof AP.promptEngine.runAll === "function") {
    try {
      AP.boot?.cp?.("ap:engine:shim", { version: VERSION, reused: true });
    } catch {}
    return;
  }

  // Nothing to do; the real engine module will populate AP.promptEngine.
  try {
    AP.boot?.cp?.("ap:engine:shim", { version: VERSION, installed: true });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/ap/rootIndex.js");

/* ===== core/runtime/ap/rootIndex.js ===== */
(function(){var __AP_MOD="/core/runtime/ap/rootIndex.js";try{
// ./auto-prompter/core/runtime/ap/rootIndex.js
(function () {
  "use strict";
  const VERSION = "4.3.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/ap/rootIndex.js"
    );
  } catch {}

  function getOwnDesc(obj, key) {
    try {
      return Object.getOwnPropertyDescriptor(obj, key);
    } catch {
      return undefined;
    }
  }
  function tryDefineGetter(obj, key, getter) {
    try {
      const d = getOwnDesc(obj, key);
      if (!d || d.configurable) {
        Object.defineProperty(obj, key, {
          configurable: true,
          enumerable: true,
          get: getter,
        });
        return true;
      }
    } catch {}
    return false;
  }
  function tryDefineWritable(obj, key, val) {
    try {
      const d = getOwnDesc(obj, key);
      if (!d || d.configurable) {
        Object.defineProperty(obj, key, {
          configurable: true,
          enumerable: true,
          writable: true,
          value: val,
        });
        return true;
      }
    } catch {}
    return false;
  }
  function cp(tag, payload) {
    try {
      AP.boot?.cp?.(tag, payload);
    } catch {}
  }

  // Create or reuse the facade; never overwrite existing accessor-only objects.
  const facade =
    AP.AutoPrompterCore && typeof AP.AutoPrompterCore === "object"
      ? AP.AutoPrompterCore
      : {};

  // Bind accessors to underlying core surfaces if present
  tryDefineGetter(facade, "start", () => AP.coreStart?.start);
  tryDefineGetter(facade, "stop", () => AP.coreRun?.stop);
  tryDefineGetter(facade, "run", () => AP.coreRun?.run);
  tryDefineWritable(facade, "__v", VERSION);

  // Attach (idempotent + safe)
  if (!("AutoPrompterCore" in AP)) {
    // prefer writable value when possible
    if (!tryDefineWritable(AP, "AutoPrompterCore", facade)) {
      tryDefineGetter(AP, "AutoPrompterCore", () => facade);
    }
  }

  // Provide convenient top-level aliases without clobbering existing props
  tryDefineGetter(AP, "start", () => AP.coreStart?.start);
  tryDefineGetter(AP, "stop", () => AP.coreRun?.stop);

  // Breadcrumb w/ availability flags
  cp("ap:rootIndex:aliased", {
    version: VERSION,
    hasCoreStart: !!(AP.coreStart && AP.coreStart.start),
    hasCoreRun: !!(AP.coreRun && AP.coreRun.run),
  });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/ap/index.js");

/* ===== core/runtime/ap/index.js ===== */
(function(){var __AP_MOD="/core/runtime/ap/index.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/ap/index.js
// Public facade for the AutoPrompter runtime. No side effects beyond namespacing.
(function () {
  "use strict";
  const VERSION = "4.3.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/ap/index.js"
    );
  } catch {}

  if (AP.__apIndexReady) {
    try {
      AP.boot?.cp?.("ap:index:ready", { version: VERSION, reused: true });
    } catch {}
    return;
  }
  AP.__apIndexReady = true;

  // Boot breadcrumb
  try {
    AP.boot?.cp?.("ap:index:ready", { version: VERSION });
  } catch {}

  // Boot surface (canonical: direct pass-through to core; prefer live getters)
  Object.defineProperties(AP, {
    start: {
      configurable: true,
      get() {
        return (
          (AP.coreStart && AP.coreStart.start) ||
          (AP.AutoPrompterCore && AP.AutoPrompterCore.start) ||
          null
        );
      },
      set(v) {
        Object.defineProperty(this, "start", { value: v, writable: true });
      },
    },
    stop: {
      configurable: true,
      get() {
        return (
          (AP.coreRun && AP.coreRun.stop) ||
          (AP.AutoPrompterCore && AP.AutoPrompterCore.stop) ||
          null
        );
      },
      set(v) {
        Object.defineProperty(this, "stop", { value: v, writable: true });
      },
    },
    run: {
      configurable: true,
      get() {
        return (
          (AP.coreRun && AP.coreRun.run) ||
          (AP.AutoPrompterCore && AP.AutoPrompterCore.run) ||
          null
        );
      },
      set(v) {
        Object.defineProperty(this, "run", { value: v, writable: true });
      },
    },
  });

  // Engine (kept for back-compat)
  AP.engine = AP.promptEngine || {};

  // Detect: prefer unified composerDetect if present
  AP.detect = AP.composerDetect || {};

  // IO group (senders + waiters + idle)
  AP.io = (function () {
    const senders = AP.senders || {};
    const waiters = AP.waiters || {};
    const waitUntilIdle = (AP.idleWait && AP.idleWait.waitUntilIdle) || null;
    return { ...senders, waiters, waitUntilIdle };
  })();

  // UI group
  AP.ui = {
    panel: AP.uiPanel || {},
    position: AP.uiPosition || {},
    dom: AP.dom || {},
  };

  // Prompt
  AP.prompt = {
    parse:
      (AP.promptParser && AP.promptParser.parse) ||
      function () {
        return [];
      },
    renderText:
      (AP.renderers && AP.renderers.renderText) ||
      function (t) {
        return String(t || "");
      },
  };

  // Utilities
  AP.util = {
    logger: AP.logger || console,
    backoff: AP._logBackoff || {},
  };

  // Version tag for quick diagnostics
  AP.apIndexVersion = VERSION;
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/devtools/noise/dom.js");

/* ===== core/devtools/noise/dom.js ===== */
(function(){var __AP_MOD="/core/devtools/noise/dom.js";try{
/* @require  .../core/runtime/noise/dom/utils.js */
/* @require  .../core/runtime/noise/dom/query.js */
/* @require  .../core/runtime/noise/dom/attrs.js */
/* @require  .../core/runtime/noise/dom/el.js */
/* @require  .../core/runtime/noise/dom/styles.js */
/* @require  .../core/runtime/noise/dom/waitForSelector.js */
/* @require  .../core/runtime/noise/dom/shadow.js */
/* @require  .../core/runtime/noise/dom/index.js */

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/devtools/noise/index.js");

/* ===== core/devtools/noise/index.js ===== */
(function(){var __AP_MOD="/core/devtools/noise/index.js";try{
(function () {
  "use strict";
  // This file intentionally does nothing except serve as an easy single @require
  // anchor to guarantee noise shims are loaded. Each shim is self-guarded.
  // If you prefer, you can @require the four files individually.
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/devtools/noiseStubs.js");

/* ===== core/devtools/noiseStubs.js ===== */
(function(){var __AP_MOD="/core/devtools/noiseStubs.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/util/noiseStubs.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.__noiseStubsReady) return;
  AP.__noiseStubsReady = true;

  // Minimal: rely on dedicated modules (logger.js, dom.js, domUtils.js, ui/*Fallback.js)
  // Only emit a single readiness log, without re-defining any logic here.
  try {
    const L = AP.logger && AP.logger.info ? AP.logger : console;
    (L.info || L.log).call(L, "[AP] noise fallback helpers initialized");
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/devtools/panelFallback.js");

/* ===== core/devtools/panelFallback.js ===== */
(function(){var __AP_MOD="/core/devtools/panelFallback.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/runtime/util/ui/panelFallback.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.uiPanel?.__v >= 31) return; // bump guard

  const Dom = (AP.dom = AP.dom || {});
  const el =
    Dom.el ||
    ((tag, attrs, children) => {
      const n = document.createElement(tag);
      if (attrs)
        for (const k in attrs) {
          if (k === "className") n.className = attrs[k];
          else if (k in n) n[k] = attrs[k];
          else n.setAttribute(k, attrs[k]);
        }
      if (children) {
        (Array.isArray(children) ? children : [children]).forEach((c) =>
          n.appendChild(typeof c === "string" ? document.createTextNode(c) : c)
        );
      }
      return n;
    });
  const injectStyles =
    Dom.injectStyles ||
    ((css) => {
      const s = document.createElement("style");
      s.textContent = css;
      (document.head || document.documentElement).appendChild(s);
      return s;
    });

  // We keep a MOUNT HOST but **do not** expose the grey UI or its toggle.
  AP.uiPanel = {
    __v: 31,
    createPanel({ onStart, onStop } = {}) {
      // Minimal styles for internal layout if anything looks for them
      injectStyles(`
        .ap-card{position:fixed;top:20px;right:20px;background:#0b1220;color:#e5e7eb;
          border:1px solid #243145;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.3);
          width:320px;z-index:2147483647;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial}
        .ap-card--hidden{display:none!important}
      `);

      // Create a host + shadow so the loader has a stable mount surface.
      const host = el("div"); // no data-ap-fallback-host to avoid purge
      (document.body || document.documentElement).appendChild(host);
      const shadow = host.attachShadow({ mode: "open" });

      // Headless (hidden) card; keep structure light, no textarea/buttons/toggle.
      const card = el("div", { className: "ap-card ap-card--hidden" });
      // Provide an inner mount div if the core wants to append under the panel.
      const mount = el("div", { id: "ap-mount" });
      card.appendChild(mount);
      shadow.appendChild(card);

      // Return an object shaped like the legacy one so callers don’t explode.
      return {
        root: host,
        shadow,
        mount,
        hidden: true,
        destroy: () => {
          try {
            host.remove();
          } catch {}
        },
      };
    },
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/events.js");

/* ===== core/events.js ===== */
(function(){var __AP_MOD="/core/events.js";try{
// /opt/homebrew/bin/node
// /Users/samuellane/Documents/GitHub/gpt_auto_prompter/auto-prompter/userscript/dictation/events.js

(function () {
  "use strict";

  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "userscript/dictation/events.js"
    );
  } catch {}

  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.dictationMod = AP.dictationMod || {};
  if (AP.dictationMod.events && AP.dictationMod.events._ok) return;

  const { cp, log } = AP.dictationMod.util || { cp: () => {}, log: console };

  function emitResult({ text = "", isFinal = true } = {}) {
    const len = (text || "").length;
    cp("events:emit:begin", { isFinal: !!isFinal, len });
    try {
      if (AP.events && typeof AP.events.emit === "function") {
        AP.events.emit("dictation:result", { text, isFinal });
        cp("events:emit:ap");
      } else {
        window.dispatchEvent(
          new CustomEvent("ap:dictation:result", {
            detail: { text, isFinal },
            bubbles: true,
          })
        );
        cp("events:emit:dom");
      }
      log.info?.("[dictation] emitResult", { len, isFinal: !!isFinal });
    } catch (e) {
      cp("events:emit:error", { err: String(e?.message || e) });
      log.warn?.("[dictation] emitResult error", e);
    }
  }

  AP.dictationMod.events = { emitResult, _ok: true };
  cp("events:ready");
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/core/debug/debug.js");

/* ===== core/detect/core/debug/debug.js ===== */
(function(){var __AP_MOD="/core/detect/core/debug/debug.js";try{
// /usr/local/bin/node
// ./core/detect/core/debug/debug.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.detectCoreDebug) return;

  function _outline(el, color) {
    if (!el) return;
    const prev = el.style.outline;
    el.style.outline = `2px solid ${color || "#22c55e"}`;
    setTimeout(() => (el.style.outline = prev), 2000);
  }

  async function highlightOnce(opts = {}) {
    const detect =
      (AP.detectCoreFind && AP.detectCoreFind.findComposer) ||
      (AP.composerDetect && AP.composerDetect.findComposer);
    if (typeof detect !== "function") {
      (console.warn || console.log)?.("[detect:debug] findComposer missing");
      return null;
    }
    const ctrl = new AbortController();
    try {
      const found = await detect(opts, ctrl.signal);
      if (found?.input) _outline(found.input, "#3b82f6");
      if (found?.send) _outline(found.send, "#22c55e");
      (console.info || console.log)?.("[detect:debug] result", {
        input: !!found?.input,
        send: !!found?.send,
      });
      return found;
    } catch (e) {
      (console.warn || console.log)?.("[detect:debug] error", String(e));
      return null;
    }
  }

  AP.detectCoreDebug = { highlightOnce };
  // convenient alias
  window.apDetectDebug = () =>
    AP.detectCoreDebug.highlightOnce({ allowInputOnly: true });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/detect/core/registry/try.js");

/* ===== core/detect/core/registry/try.js ===== */
(function(){var __AP_MOD="/core/detect/core/registry/try.js";try{
// /usr/local/bin/node
// ./core/detect/core/registry/try.js
(function () {
  "use strict";

  const AP = (window.AutoPrompter = window.AutoPrompter || {});

  async function tryRegistry(cfgIn, signal, allowInputOnly, L) {
    if (!AP.detectRegistry || typeof AP.detectRegistry.detect !== "function") {
      return null;
    }
    try {
      const r = await AP.detectRegistry.detect(cfgIn, signal);
      if (!r || (!r.input && !r.send)) return null;
      (L.info || L.log)?.("detect: registry hit", {
        input: !!r.input,
        send: !!r.send,
      });
      if (r.input && r.send) return r;
      if (allowInputOnly && r.input) return { input: r.input, send: null };
      return null;
    } catch (e) {
      (L.warn || L.log)?.("detect: registry error", { err: String(e) });
      return null;
    }
  }

  AP.detectCoreRegistry = { tryRegistry };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/engine/steps.findComposer.js");

/* ===== core/engine/steps.findComposer.js ===== */
(function(){var __AP_MOD="/core/engine/steps.findComposer.js";try{
// ./auto-prompter/core/engine/steps.findComposer.js (shim)
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L = (AP._log || { with: () => console }).with({
    component: "engine",
    file: "core/engine/steps.findComposer.js",
  });

  AP.engineStepsParts = AP.engineStepsParts || {};
  if (
    !AP.engineStepsParts.findComposerOrFail &&
    AP.engineFind &&
    AP.engineFind.orFail
  ) {
    AP.engineStepsParts.findComposerOrFail =
      AP.engineFind.orFail.findComposerOrFail;
  }

  if (!AP.engineStepsParts.findComposerOrFail) {
    (L.warn || L.log)(
      "findComposerOrFail not wired yet; ensure core/engine/find/*.js are loaded"
    );
  }
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/composer/core/index.js");

/* ===== core/runtime/composer/core/index.js ===== */
(function(){var __AP_MOD="/core/runtime/composer/core/index.js";try{
// ./auto-prompter/core/runtime/composer/core/index.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const L = AP.logger || console;
  const VER = "core-index-3.0.1";

  AP.detect = AP.detect || {};
  AP.composerDetect = AP.composerDetect || {};

  AP.composerDetect.findComposer = async function findComposer(opts = {}) {
    let res;
    try {
      res = (await AP.detectSafeFind.findComposerSafe({
        ...opts,
        allowInputOnly: true,
      })) || { input: null, send: null };
    } catch (e) {
      try {
        (L.warn || L.log).call(
          L,
          "[AP core] detectSafeFind error",
          String(e?.message || e)
        );
      } catch {}
      res = { input: null, send: null };
    }

    // Prefer the nested CE inside any wrapper — guard AP.utils access
    try {
      if (res && res.input) {
        const pickInner =
          AP?.utils?.dom && typeof AP.utils.dom.pickInnerEditable === "function"
            ? AP.utils.dom.pickInnerEditable
            : null;
        if (pickInner) {
          const inner = pickInner(res.input);
          if (inner) res.input = inner;
        }
      }
    } catch (e) {
      try {
        (L.warn || L.log).call(
          L,
          "[AP core] pickInnerEditable failed",
          String(e?.message || e)
        );
      } catch {}
    }

    try {
      AP.boot?.cp?.("composer:core:found", {
        ver: VER,
        source: "safe",
        input: !!res.input,
        send: !!res.send,
        tag: res.input && res.input.tagName,
        role:
          res.input && res.input.getAttribute && res.input.getAttribute("role"),
        ce:
          res.input &&
          res.input.getAttribute &&
          res.input.getAttribute("contenteditable"),
      });
    } catch {}

    return res;
  };

  // Legacy aliases (guarded)
  if (typeof AP.setInputValue !== "function")
    AP.setInputValue = (...a) => AP.io?.setInputValue?.(...a);
  if (typeof AP.getInputValue !== "function")
    AP.getInputValue = (...a) => AP.io?.getInputValue?.(...a);

  try {
    AP.boot?.cp?.("composer:core:index:ready", {
      ver: VER,
      guard: !!AP.__composeGuardInstalled,
    });
  } catch {}
  try {
    (L.info || L.log).call(L, "[AP core] composer index ready", {
      ver: VER,
      guard: !!AP.__composeGuardInstalled,
    });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/checks/bundle.js");

/* ===== core/sanity/checks/bundle.js ===== */
(function(){var __AP_MOD="/core/sanity/checks/bundle.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/checks/bundle.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const REG = AP.detectSanityRegistry || {};
  const U = (AP.sanity && AP.sanity.utils) || {};

  function run() {
    const issues = [];
    try {
      const req = Array.isArray(U.REQUIRED_RUNTIME) ? U.REQUIRED_RUNTIME : [];
      const miss = U.missing ? U.missing(req) : req.slice();
      if (miss.length) {
        for (const m of miss)
          issues.push({
            level: "error",
            code: "RUNTIME_MISSING",
            message: "required module not present in __AP_LOAD",
            meta: { path: m },
            fix: "Ensure bundler includes canonical path.",
          });
      } else {
        issues.push({
          level: "info",
          code: "RUNTIME_OK",
          message: "required runtime present",
        });
      }
    } catch (e) {
      issues.push({
        level: "warn",
        code: "RUNTIME_CHECK_FAILED",
        message: String(e && e.message ? e.message : e),
      });
    }
    return { issues, snapshot: { runtimeLayout: "v2" } };
  }

  if (REG.registerCheck) REG.registerCheck({ id: "bundle", run, deps: [] });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/checks/cache.js");

/* ===== core/sanity/checks/cache.js ===== */
(function(){var __AP_MOD="/core/sanity/checks/cache.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/checks/cache.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const REG = AP.detectSanityRegistry || {};

  function normEntry(x) {
    try {
      const s = String(x || "");
      return s
        .replace(/^https?:\/\/[^\/]+\/+/, "")
        .replace(/^file:\/\/\/[^\/]+\/+/, "")
        .replace(/^\/+/, "")
        .replace(/[?#].*$/, "")
        .trim()
        .toLowerCase();
    } catch {
      return String(x || "");
    }
  }

  function baseName(p) {
    const n = normEntry(p);
    const parts = n.split("/");
    return parts.slice(-2).join("/");
  }

  function hasMixedOrigins(load) {
    try {
      const kinds = new Set(
        load.map((x) =>
          /^https?:\/\//i.test(x)
            ? "http"
            : /^file:\/\//i.test(x)
            ? "file"
            : "inline"
        )
      );
      return kinds.size > 1;
    } catch {
      return false;
    }
  }

  function run() {
    const issues = [];
    const load = Array.isArray(window.__AP_LOAD)
      ? window.__AP_LOAD.slice()
      : [];
    const seen = new Map();
    const dups = [];

    for (const e of load) {
      const key = baseName(e);
      const list = seen.get(key) || [];
      list.push(e);
      seen.set(key, list);
    }

    for (const [k, list] of seen) {
      const uniq = Array.from(new Set(list.map(normEntry)));
      if (uniq.length > 1) {
        dups.push({ key: k, list: uniq });
      }
    }

    if (dups.length) {
      issues.push({
        level: "warn",
        code: "CACHE_SHADOWED_DUP",
        message: "same module name loaded from multiple paths",
        meta: { samples: dups.slice(0, 4) },
        fix: "Ensure only /auto-prompter/... paths are required and remove legacy paths.",
      });
    }

    if (hasMixedOrigins(load)) {
      issues.push({
        level: "warn",
        code: "MIXED_ORIGIN",
        message: "mixed inline/http/file script origins detected",
        fix: "Standardize on one origin; prefer repo-scoped @require paths.",
      });
    }

    const unstamped = load.filter((x) => !/@\d/.test(String(x)));
    if (unstamped.length) {
      issues.push({
        level: "info",
        code: "UNSTAMPED_MODULES",
        message: "some modules not stamped with version",
        meta: { count: unstamped.length, samples: unstamped.slice(-6) },
        fix: "Push a version token to __AP_LOAD in each module or stamp names during build.",
      });
    }

    const genAt =
      (AP.versions && AP.versions.meta && AP.versions.meta.generatedAt) || null;
    if (genAt) {
      const t = Date.parse(genAt);
      if (isFinite(t) && Date.now() - t > 1000 * 60 * 60 * 6) {
        issues.push({
          level: "info",
          code: "BUILD_AGE",
          message: "userscript build is older than 6h",
          meta: { generatedAt: genAt },
          fix: "Rebuild if you expect active iteration and still see stale behavior.",
        });
      }
    }

    return { issues, snapshot: { cache: { loadCount: load.length } } };
  }

  if (REG.registerCheck)
    REG.registerCheck({ id: "cache", run, deps: ["bundle"] });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/checks/composer.js");

/* ===== core/sanity/checks/composer.js ===== */
(function(){var __AP_MOD="/core/sanity/checks/composer.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/checks/composer.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const REG = AP.detectSanityRegistry || {};

  function run() {
    const issues = [];
    try {
      const ns = AP || {};
      const hasComposer = !!ns.composer;
      const hasDetect = !!(
        ns.composer &&
        (ns.composer.detect || ns.composer.find || ns.composer.registry)
      );
      if (!hasComposer) {
        issues.push({
          level: "error",
          code: "COMPOSER_NS_MISSING",
          message: "AP.composer namespace not present",
          fix: "Ensure core/runtime/composer/bootstrap.js initializes AP.composer.",
        });
      } else if (!hasDetect) {
        issues.push({
          level: "warn",
          code: "COMPOSER_API_SHALLOW",
          message: "AP.composer present but expected APIs missing",
          fix: "Verify composer/core/index.js registers detect registry and bootstrap runs before start().",
        });
      } else {
        issues.push({
          level: "info",
          code: "COMPOSER_OK",
          message: "AP.composer namespace available",
        });
      }
    } catch (e) {
      issues.push({
        level: "warn",
        code: "COMPOSER_CHECK_FAILED",
        message: String(e && e.message ? e.message : e),
      });
    }
    return { issues };
  }

  if (REG.registerCheck)
    REG.registerCheck({ id: "composer", run, deps: ["bundle"] });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/checks/core_ready.js");

/* ===== core/sanity/checks/core_ready.js ===== */
(function(){var __AP_MOD="/core/sanity/checks/core_ready.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/checks/core_ready.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const REG = AP.detectSanityRegistry || {};
  const U = (AP.sanity && AP.sanity.utils) || {};

  function run() {
    const issues = [];
    try {
      const have =
        AP.AutoPrompterCore && typeof AP.AutoPrompterCore.start === "function";
      if (!have) {
        issues.push({
          level: "warn",
          code: "CORE_START_UNEXPOSED",
          message: "AutoPrompterCore.start not yet exposed at run time",
          fix: "Verify startGate wiring and @require order.",
        });
      }
    } catch (e) {
      issues.push({
        level: "warn",
        code: "CORE_READY_CHECK_FAILED",
        message: String(e && e.message ? e.message : e),
      });
    }
    return { issues };
  }

  if (REG.registerCheck)
    REG.registerCheck({ id: "core_ready", run, deps: ["order"] });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/checks/environment.js");

/* ===== core/sanity/checks/environment.js ===== */
(function(){var __AP_MOD="/core/sanity/checks/environment.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/checks/environment.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const REG = AP.detectSanityRegistry || {};

  function cssHasSupported() {
    try {
      return !!(
        window.CSS &&
        CSS.supports &&
        CSS.supports("selector(:has(*))")
      );
    } catch {
      return false;
    }
  }

  function run() {
    const issues = [];
    const hasHas = cssHasSupported();
    if (!hasHas) {
      issues.push({
        level: "info",
        code: "CSS_HAS_UNSUPPORTED",
        message:
          ":has() selector not supported; heuristic fallbacks will be used",
      });
    }
    let iframesEnabled = null;
    try {
      if (
        AP.detectRoots &&
        typeof AP.detectRoots.getIframesEnabled === "function"
      )
        iframesEnabled = !!AP.detectRoots.getIframesEnabled();
    } catch {}
    if (iframesEnabled === false) {
      issues.push({
        level: "info",
        code: "IFRAME_SCAN_DISABLED",
        message:
          "Iframe scanning is disabled; detection will ignore same-origin frames",
        fix: "Set localStorage['ap_detect_iframes']='1' to enable.",
      });
    }
    return { issues, snapshot: { env: { cssHas: hasHas, iframesEnabled } } };
  }

  REG.registerCheck &&
    REG.registerCheck({ id: "environment", run, deps: ["flags"] });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/checks/flags.js");

/* ===== core/sanity/checks/flags.js ===== */
(function(){var __AP_MOD="/core/sanity/checks/flags.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/checks/flags.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const REG = AP.detectSanityRegistry || {};

  function run(_, F) {
    const issues = [];
    const timeoutMs = F && F.detectTimeoutMs;
    if (timeoutMs != null && Number(timeoutMs) < 500) {
      issues.push({
        level: "warn",
        code: "TIMEOUT_LOW",
        message: "detectTimeoutMs is suspiciously low",
        meta: { detectTimeoutMs: Number(timeoutMs) },
        fix: "Use >= 700ms or null to apply default.",
      });
    }
    const pollMs = Number(F && F.pollMs);
    if (!(pollMs >= 60 && pollMs <= 240)) {
      issues.push({
        level: "warn",
        code: "POLL_RANGE",
        message: "pollMs is outside the recommended range [60..240]ms",
        meta: { pollMs },
        fix: "Clamp to [60..240] to avoid excessive CPU or sluggish detection.",
      });
    }
    if (typeof (F && F.verboseDetect) !== "boolean") {
      issues.push({
        level: "info",
        code: "VERBOSE_SHAPE",
        message: "verboseDetect should be a boolean",
        meta: { verboseDetect: F && F.verboseDetect },
        fix: "Ensure detectFlags.verboseDetect is strictly true/false.",
      });
    }
    return {
      issues,
      snapshot: {
        flags: { timeoutMs, pollMs, verbose: !!(F && F.verboseDetect) },
      },
    };
  }

  REG.registerCheck && REG.registerCheck({ id: "flags", run });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/checks/order.js");

/* ===== core/sanity/checks/order.js ===== */
(function(){var __AP_MOD="/core/sanity/checks/order.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/checks/order.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const REG = AP.detectSanityRegistry || {};
  const U = (AP.sanity && AP.sanity.utils) || {};
  const P = U || {};

  function indexOfTail(load, suffix) {
    for (let i = 0; i < load.length; i++) {
      if (String(load[i]).endsWith(suffix)) return i;
    }
    return -1;
  }

  function run() {
    const issues = [];
    const tail = Array.isArray(window.__AP_LOAD)
      ? window.__AP_LOAD.slice()
      : [];
    const want = (P.REQUIRED_RUNTIME && Array.from(P.REQUIRED_RUNTIME)) || [];
    if (!tail.length || !want.length) {
      return { issues, snapshot: { order: { checked: 0 } } };
    }

    const pos = want.map((suf) => [suf, indexOfTail(tail, suf)]);
    const missing = pos.filter(([, i]) => i < 0).map(([s]) => s);
    for (const m of missing) {
      issues.push({
        level: "error",
        code: "ORDER_MISSING",
        message: "required runtime not loaded",
        meta: { path: m },
      });
    }

    let inversions = 0;
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const a = pos[i][1];
        const b = pos[j][1];
        if (a >= 0 && b >= 0 && a > b) inversions++;
      }
    }
    if (inversions) {
      issues.push({
        level: "warn",
        code: "ORDER_INVERSION",
        message: "required runtime appears out of canonical order",
        meta: { inversions, required: want.length },
        fix: "Adjust @require order to match sanity.utils.paths.REQUIRED_RUNTIME.",
      });
    }

    return {
      issues,
      snapshot: { order: { checked: want.length, inversions } },
    };
  }

  if (REG.registerCheck)
    REG.registerCheck({ id: "order", run, deps: ["bundle"] });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/checks/selectors.js");

/* ===== core/sanity/checks/selectors.js ===== */
(function(){var __AP_MOD="/core/sanity/checks/selectors.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/checks/selectors.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const H = AP.detectSanityHelpers || {};
  const { toArray, uniq, sample } = H;
  const REG = AP.detectSanityRegistry || {};

  function run(S) {
    const issues = [];
    const send = toArray(S && S.SEND_SELECTORS);
    const input = toArray(S && S.INPUT_SELECTORS);

    if (send.length === 0)
      issues.push({
        level: "error",
        code: "SEND_EMPTY",
        message: "SEND_SELECTORS is empty",
      });
    if (input.length === 0)
      issues.push({
        level: "error",
        code: "INPUT_EMPTY",
        message: "INPUT_SELECTORS is empty",
      });

    const nonStrSend = send.filter((s) => typeof s !== "string");
    const nonStrInput = input.filter((s) => typeof s !== "string");
    if (nonStrSend.length)
      issues.push({
        level: "error",
        code: "SEND_NON_STRING",
        message: "SEND_SELECTORS contains non-string entries",
        meta: { count: nonStrSend.length, samples: sample(nonStrSend) },
      });
    if (nonStrInput.length)
      issues.push({
        level: "error",
        code: "INPUT_NON_STRING",
        message: "INPUT_SELECTORS contains non-string entries",
        meta: { count: nonStrInput.length, samples: sample(nonStrInput) },
      });

    const dupSend = send.filter((s, i) => send.indexOf(s) !== i);
    if (dupSend.length)
      issues.push({
        level: "warn",
        code: "SEND_DUPLICATES",
        message: "Duplicate selectors in SEND_SELECTORS",
        meta: {
          unique: uniq(send).length,
          total: send.length,
          samples: sample(dupSend),
        },
        fix: "De-duplicate SEND_SELECTORS during construction.",
      });

    const dupInput = input.filter((s, i) => input.indexOf(s) !== i);
    if (dupInput.length)
      issues.push({
        level: "warn",
        code: "INPUT_DUPLICATES",
        message: "Duplicate selectors in INPUT_SELECTORS",
        meta: {
          unique: uniq(input).length,
          total: input.length,
          samples: sample(dupInput),
        },
        fix: "De-duplicate INPUT_SELECTORS during construction.",
      });

    if (!S || typeof S.isSendReady !== "function") {
      issues.push({
        level: "error",
        code: "SENDREADY_TYPE",
        message: "isSendReady is not a function",
        fix: "Export a function isSendReady(btn): boolean.",
      });
    }

    return {
      issues,
      snapshot: { selectors: { sendLen: send.length, inputLen: input.length } },
    };
  }

  REG.registerCheck &&
    REG.registerCheck({ id: "selectors", run: (S) => run(S) });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/checks/self.js");

/* ===== core/sanity/checks/self.js ===== */
(function(){var __AP_MOD="/core/sanity/checks/self.js";try{
// ./auto-prompter/core/sanity/checks/self.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const REG = AP.detectSanityRegistry || {};

  function run() {
    const issues = [];
    const have = (p) => {
      try {
        return (
          String(p)
            .split(".")
            .reduce((o, k) => (o && k in o ? o[k] : undefined), window) !==
          undefined
        );
      } catch {
        return false;
      }
    };

    if (!have("AutoPrompter.sanity.utils.openReport"))
      issues.push({
        level: "error",
        code: "UTILS_OPENREPORT",
        message: "openReport() not found",
      });
    if (!have("AutoPrompter.sanity.run"))
      issues.push({
        level: "error",
        code: "FACADE_RUN",
        message: "sanity.run() not found",
      });
    if (!have("AutoPrompter.detectSanityRegistry.get"))
      issues.push({
        level: "error",
        code: "REGISTRY",
        message: "sanity registry missing",
      });
    if (!have("AutoPrompter.detectSanityRunner.runAll"))
      issues.push({
        level: "error",
        code: "RUNNER",
        message: "sanity runner missing",
      });

    // breadcrumbs present?
    if (!have("AutoPrompter.sanity.bc.mark"))
      issues.push({
        level: "warn",
        code: "BREADCRUMBS",
        message: "breadcrumbs not installed",
      });

    // quiet mode respected?
    const cfg =
      (AP.config && AP.config.getConfig && AP.config.getConfig()) ||
      AP.config ||
      {};
    if (cfg.quietSanity === undefined) {
      issues.push({
        level: "info",
        code: "QUIET_DEFAULT",
        message: "quietSanity not set (defaults to quiet)",
      });
    }

    return { issues, snapshot: { env: { quiet: cfg.quietSanity !== false } } };
  }

  REG &&
    REG.registerCheck &&
    REG.registerCheck({ id: "sanity-self", run, deps: ["flags", "bundle"] });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/checks/userscript.js");

/* ===== core/sanity/checks/userscript.js ===== */
(function(){var __AP_MOD="/core/sanity/checks/userscript.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/checks/userscript.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  const REG = AP.detectSanityRegistry || {};

  function run() {
    const issues = [];
    const manifest = (AP.userscript && AP.userscript.manifest) || [];
    const meta = window.__AP_BUNDLE_META || {};
    const ver = (AP.versions && AP.versions.userscript) || null;
    const genAt =
      (AP.versions && AP.versions.meta && AP.versions.meta.generatedAt) || null;

    if (!Array.isArray(manifest) || manifest.length === 0) {
      issues.push({
        level: "error",
        code: "US_MANIFEST_ABSENT",
        message: "AP.userscript.manifest not present or empty",
        fix: "Ensure /auto-prompter/userscript/manifest.js is @require'd before boot.js.",
      });
      return { issues, snapshot: { userscript: { manifestCount: 0 } } };
    }

    const missing = [];
    for (const item of manifest) {
      try {
        const ok = typeof item.check === "function" ? !!item.check() : false;
        if (!ok) missing.push(item.path);
      } catch {
        missing.push(item.path);
      }
    }

    if (!ver) {
      issues.push({
        level: "error",
        code: "US_VERSION_MISSING",
        message: "AP.versions.userscript missing",
        fix: "Require /auto-prompter/userscript/version.js early in the header.",
      });
    }

    if (missing.length) {
      for (const p of missing) {
        issues.push({
          level: "error",
          code: "US_REQ_MISSING",
          message: "userscript module missing",
          meta: { path: p },
          fix: `Add to userscript header: /* @require      ${p} */`,
        });
      }
    } else {
      issues.push({
        level: "info",
        code: "US_OK",
        message: "userscript manifest satisfied",
      });
    }

    if (meta && meta.ok === false) {
      issues.push({
        level: "warn",
        code: "US_BUNDLE_META_NOT_OK",
        message: "bundle meta reports missing entries",
        meta: { missing: meta.missing || [] },
        fix: "Paste the suggested @require lines from autoload.ensureRequires() output.",
      });
    }

    return {
      issues,
      snapshot: {
        userscript: {
          version: ver,
          generatedAt: genAt,
          manifestCount: manifest.length,
          missingCount: missing.length,
        },
      },
    };
  }

  if (REG.registerCheck)
    REG.registerCheck({ id: "userscript", run, deps: ["bundle"] });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/helpers.js");

/* ===== core/sanity/helpers.js ===== */
(function(){var __AP_MOD="/core/sanity/helpers.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/helpers.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.detectSanityHelpers) return;

  function toArray(x) {
    return Array.isArray(x) ? x : [];
  }

  function uniq(arr) {
    return Array.from(new Set(arr));
  }

  function sample(arr, n = 3) {
    return toArray(arr).slice(0, n);
  }

  function cssHasSupported() {
    try {
      return !!(
        window.CSS &&
        CSS.supports &&
        CSS.supports("selector(:has(*))")
      );
    } catch {
      return false;
    }
  }

  AP.detectSanityHelpers = { toArray, uniq, sample, cssHasSupported };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/report.js");

/* ===== core/sanity/report.js ===== */
(function(){var __AP_MOD="/core/sanity/report.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/report.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.detectSanityReport) return;
  const ConsoleRep = AP.detectSanityConsoleReporter || function () {};
  function logReport(S, F, result) {
    try {
      ConsoleRep({
        S,
        F,
        issues: (result && result.issues) || [],
        snapshot: (result && result.snapshot) || {},
      });
    } catch {}
  }
  function toLegacyStrings(issues) {
    return (issues || []).map(
      (i) => `${String(i.level || "info").toUpperCase()}: ${i.message}`,
    );
  }
  AP.detectSanityReport = { logReport, toLegacyStrings };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/reporters/banner.js");

/* ===== core/sanity/reporters/banner.js ===== */
(function(){var __AP_MOD="/core/sanity/reporters/banner.js";try{
// ./auto-prompter/core/sanity/reporters/banner.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.detectSanityBannerReporter) return;

  function bannerReporter(ctx) {
    try {
      const cfg =
        (AP.config && AP.config.getConfig && AP.config.getConfig()) ||
        AP.config ||
        {};
      if (cfg.quietSanity === false) {
        // still quiet: show just one line + toast
        const issues = ctx.issues || [];
        const errors = issues.filter((i) => i.level === "error");
        const warns = issues.filter((i) => i.level === "warn");
        const ok = errors.length === 0;
        const line = `[AP][sanity] ${ok ? "online ✓" : "degraded ⚠"}  files=${
          (window.__AP_LOAD || []).length
        } issues=${issues.length} warn=${warns.length} error=${errors.length}`;

        // console: single line (once)
        try {
          const k = "ap_sanity_banner_once";
          if (!sessionStorage.getItem(k)) {
            sessionStorage.setItem(k, "1");
            (console.info || console.log)(line);
          }
        } catch {
          (console.info || console.log)(line);
        }

        // toast highlight (ok/degraded)
        try {
          AP.sanity?.utils?.toast?.(
            ok
              ? "Sanity online ✓"
              : `Sanity degraded ⚠  ${errors.length} error(s)`,
            ok ? "ok" : "warn",
            { onceKey: "sanity_banner" }
          );
        } catch {}
      }
    } catch {}
  }

  AP.detectSanityBannerReporter = bannerReporter;
  try {
    AP.detectSanityRegistry?.registerReporter?.(bannerReporter);
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/reporters/console.js");

/* ===== core/sanity/reporters/console.js ===== */
(function(){var __AP_MOD="/core/sanity/reporters/console.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/reporters/console.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.detectSanityConsoleReporter) return;

  const C = AP.detectCoreConfig || {};
  const logger = C.logger;
  const L =
    (logger &&
      logger({
        component: "sanity",
        file: "core/sanity/reporters/console.js",
      })) ||
    console;

  // QUIET GUARD: default to quiet unless quietSanity === false.
  // We still register a no-op to preserve registry shape.
  try {
    const cfg =
      (AP.config && AP.config.getConfig && AP.config.getConfig()) ||
      AP.config ||
      {};
    if (cfg.quietSanity !== false) {
      AP.detectSanityConsoleReporter = function () {};
      try {
        AP.detectSanityRegistry &&
          AP.detectSanityRegistry.registerReporter(
            AP.detectSanityConsoleReporter
          );
      } catch {}
      return;
    }
  } catch {}

  function consoleReporter(ctx) {
    try {
      const S = ctx && ctx.S;
      const F = ctx && ctx.F;
      const issues = (ctx && ctx.issues) || [];
      const snapshot = (ctx && ctx.snapshot) || {};
      const many = Array.isArray(issues) && issues.length > 50;
      (L.info || L.log)?.("detect sanity", {
        sendSelectors: (S && S.SEND_SELECTORS && S.SEND_SELECTORS.length) || 0,
        inputSelectors:
          (S && S.INPUT_SELECTORS && S.INPUT_SELECTORS.length) || 0,
        timeoutMs: (F && F.detectTimeoutMs) ?? "(default)",
        pollMs: F && F.pollMs,
        verbose: !!(F && F.verboseDetect),
        cssHas: snapshot && snapshot.env && snapshot.env.cssHas,
        issues: many
          ? issues.slice(0, 50).concat([
              {
                level: "info",
                code: "TRUNCATED",
                message: `${issues.length - 50} more...`,
              },
            ])
          : issues,
      });
    } catch (e) {
      (L.warn || L.log)?.("sanity console reporter failed", { err: String(e) });
    }

    try {
      const U = (AP.sanity && AP.sanity.utils) || {};
      const tail = U.tailLoad ? U.tailLoad(15) : [];
      const req = Array.isArray(U.REQUIRED_RUNTIME) ? U.REQUIRED_RUNTIME : [];
      const missing = req.length && U.missing ? U.missing(req) : [];
      (L.info || L.log)?.("[AP][sanity] bundle summary", {
        required: req.length,
        missing,
        tailLen: tail.length,
        tail,
      });
    } catch (e) {
      (L.warn || L.log)?.("sanity bundle summary failed", { err: String(e) });
    }
  }

  AP.detectSanityConsoleReporter = consoleReporter;
  try {
    AP.detectSanityRegistry &&
      AP.detectSanityRegistry.registerReporter(consoleReporter);
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/reporters/html.js");

/* ===== core/sanity/reporters/html.js ===== */
(function(){var __AP_MOD="/core/sanity/reporters/html.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/reporters/html.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (typeof window === "undefined") return;
  if (AP.detectSanityHtmlReporter) return;

  const U = (AP.sanity && AP.sanity.utils) || {};
  function htmlReporter(ctx) {
    try {
      if (!U || !U.openReport || !U.reportHtml) return;
      const cfg =
        (AP.config && AP.config.getConfig && AP.config.getConfig()) ||
        AP.config ||
        {};
      if (cfg.env === "prod" || cfg.disableHtmlReporter) return;

      const results = (ctx.issues || []).map((i) => ({
        ok: i.level !== "error",
        severity: i.level,
        label: i.code || "(issue)",
        path: i.meta && i.meta.path ? i.meta.path : "-",
        kind: i.meta && i.meta.kind ? i.meta.kind : "-",
        found: i.meta && i.meta.found != null ? String(i.meta.found) : "-",
        why: i.message || "",
        fix: i.fix || "",
      }));
      if (results.length) U.openReport(results);
    } catch {}
  }
  AP.detectSanityHtmlReporter = htmlReporter;
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/reporters/telemetry.js");

/* ===== core/sanity/reporters/telemetry.js ===== */
(function(){var __AP_MOD="/core/sanity/reporters/telemetry.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/reporters/telemetry.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.detectSanityTelemetryReporter) return;

  const U = (AP.sanity && AP.sanity.utils) || {};
  function telemetryReporter(ctx) {
    try {
      if (!U || !U.bkLog) return;
      U.bkLog(
        "info",
        "sanity",
        "summary",
        {
          issues: (ctx.issues || []).length,
          cssHas: !!(
            ctx.snapshot &&
            ctx.snapshot.env &&
            ctx.snapshot.env.cssHas
          ),
          sendLen:
            ctx.snapshot &&
            ctx.snapshot.selectors &&
            ctx.snapshot.selectors.sendLen,
          inputLen:
            ctx.snapshot &&
            ctx.snapshot.selectors &&
            ctx.snapshot.selectors.inputLen,
        },
        { sampleRate: 0.5 },
      );
    } catch {}
  }
  AP.detectSanityTelemetryReporter = telemetryReporter;
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/sanity_core/bootstrap.js");

/* ===== core/sanity/sanity_core/bootstrap.js ===== */
(function(){var __AP_MOD="/core/sanity/sanity_core/bootstrap.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/sanity_core/bootstrap.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (
    !AP.detectSanityHelpers &&
    AP.detectCoreConfig &&
    AP.detectCoreConfig.logger
  ) {
  }
  AP.sanityNS = AP.sanityNS || {};
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/sanity_core/index.js");

/* ===== core/sanity/sanity_core/index.js ===== */
(function(){var __AP_MOD="/core/sanity/sanity_core/index.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/sanity_core/index.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.detectCoreSanity) return;
  AP.sanityNS = AP.sanityNS || {};
  const { logger } = AP.detectCoreConfig || {};
  const L =
    (logger &&
      logger({
        component: "sanity",
        file: "core/sanity/sanity_core/index.js",
      })) ||
    console;
  const Runner = AP.detectSanityRunner || {
    runAll: () => ({ issues: [], snapshot: {} }),
  };
  const ConsoleRep = AP.detectSanityConsoleReporter;
  const TelemetryRep = AP.detectSanityTelemetryReporter;
  try {
    const REG = AP.detectSanityRegistry;
    if (REG && REG.get && REG.get().reporters.length === 0) {
      ConsoleRep && REG.registerReporter(ConsoleRep);
      TelemetryRep && REG.registerReporter(TelemetryRep);
    }
  } catch {}
  function run() {
    const res = Runner.runAll();
    return res.issues || [];
  }
  function runLegacy() {
    const issues = run();
    return (issues || []).map(
      (i) => `${String(i.level || "info").toUpperCase()}: ${i.message}`,
    );
  }
  AP.detectCoreSanity = { run, runLegacy, version: "1.0.0" };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/sanity_core/registry.js");

/* ===== core/sanity/sanity_core/registry.js ===== */
(function(){var __AP_MOD="/core/sanity/sanity_core/registry.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/sanity_core/registry.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.detectSanityRegistry) return;
  const checks = [];
  const reporters = [];
  function registerCheck(spec) {
    if (!spec || typeof spec.run !== "function") return false;
    checks.push(spec);
    return true;
  }
  function registerReporter(fn) {
    if (typeof fn !== "function") return false;
    reporters.push(fn);
    return true;
  }
  function get() {
    return { checks: checks.slice(), reporters: reporters.slice() };
  }
  AP.detectSanityRegistry = {
    registerCheck,
    registerReporter,
    get,
    version: "1.0.0",
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/sanity_core/runner.js");

/* ===== core/sanity/sanity_core/runner.js ===== */
(function(){var __AP_MOD="/core/sanity/sanity_core/runner.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/sanity_core/runner.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  if (AP.detectSanityRunner) return;
  const { logger, getSelectors, getFlags } = AP.detectCoreConfig || {};
  const L =
    (logger &&
      logger({
        component: "sanity",
        file: "core/sanity/sanity_core/runner.js",
      })) ||
    console;
  const R = AP.detectSanityRegistry || {
    get: () => ({ checks: [], reporters: [] }),
  };

  function topoSort(checks) {
    const map = new Map();
    for (const s of checks) {
      map.set(s.id || Math.random().toString(36).slice(2), s);
    }
    const indeg = new Map();
    const adj = new Map();
    for (const [id, s] of map) {
      const deps = Array.isArray(s.deps) ? s.deps : [];
      indeg.set(id, indeg.get(id) || 0);
      for (const d of deps) {
        if (!map.has(d)) continue;
        adj.set(d, (adj.get(d) || new Set()).add(id));
        indeg.set(id, (indeg.get(id) || 0) + 1);
      }
    }
    const q = [];
    for (const [id] of map) {
      if ((indeg.get(id) || 0) === 0) q.push(id);
    }
    const out = [];
    while (q.length) {
      const id = q.shift();
      out.push(map.get(id));
      for (const nxt of adj.get(id) || []) {
        indeg.set(nxt, indeg.get(nxt) - 1);
        if (indeg.get(nxt) === 0) q.push(nxt);
      }
    }
    return out.length ? out : Array.from(map.values());
  }

  function runAll() {
    const S = (getSelectors && getSelectors()) || {};
    const F = (getFlags && getFlags()) || {};
    const reg = R.get();
    const issues = [];
    const parts = [];

    const checks = topoSort(reg.checks || []);
    for (const spec of checks) {
      try {
        if (spec.before) {
          try {
            spec.before({ S, F });
          } catch {}
        }
        const out = spec.run(S, F) || {};
        if (Array.isArray(out.issues)) issues.push(...out.issues);
        if (out.snapshot) parts.push(out.snapshot);
        if (spec.after) {
          try {
            spec.after({ S, F, out });
          } catch {}
        }
      } catch (e) {
        issues.push({
          level: "error",
          code: "CHECK_THROW",
          message: `check failed: ${spec.id || "(unknown)"}`,
          meta: { err: String(e) },
        });
      }
    }

    const flat = { env: {}, flags: {}, selectors: {} };
    for (const p of parts) {
      try {
        if (p.selectors) Object.assign(flat.selectors, p.selectors);
        if (p.flags) Object.assign(flat.flags, p.flags);
        if (p.env) Object.assign(flat.env, p.env);
      } catch {}
    }

    const ctx = { S, F, issues, snapshot: flat, logger: L };
    for (const rep of reg.reporters || []) {
      try {
        rep(ctx);
      } catch (e) {
        (L.warn || L.log)?.("sanity reporter failed", { err: String(e) });
      }
    }
    return { issues, snapshot: flat };
  }

  AP.detectSanityRunner = { runAll, version: "1.0.0" };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/bootstrap/boot.js");

/* ===== core/sanity/utils/bootstrap/boot.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/bootstrap/boot.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils/boot.js
(function () {
  "use strict";
  const ns = (window.AutoPrompter = window.AutoPrompter || {});
  ns.sanity = ns.sanity || {};
  const U = (ns.sanity.utils = ns.sanity.utils || {});

  U.firstRunDump = function firstRunDump(reason) {
    const seenKey = "ap_first_run_dumped_v3";
    try {
      if (sessionStorage.getItem(seenKey)) return false;
      sessionStorage.setItem(seenKey, "1");
    } catch {}
    const dump = U.envSnapshot
      ? U.envSnapshot()
      : { ts: new Date().toISOString() };
    dump.reason = reason || "unknown";
    const csp = U.sniffCsp ? U.sniffCsp() : { has: false, policy: "" };
    dump.csp = {
      present: csp.has,
      sample: csp.policy ? csp.policy.slice(0, 140) + "…" : "",
    };
    if (!(U.bkOnce && U.bkOnce("info", "boot", "dump", dump))) {
      (U.L ? U.L() : console).info("[AP][boot] dump", dump);
    }
    return true;
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/bootstrap/core-ready.js");

/* ===== core/sanity/utils/bootstrap/core-ready.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/bootstrap/core-ready.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils/core-ready.js
(function () {
  "use strict";
  const ns = (window.AutoPrompter = window.AutoPrompter || {});
  ns.sanity = ns.sanity || {};
  const U = (ns.sanity.utils = ns.sanity.utils || {});

  U.awaitCoreStart = function awaitCoreStart(ms = 8000) {
    return new Promise((res) => {
      const start = U.nowMs ? U.nowMs() : Date.now();
      let done = false;

      function check() {
        if (done) return;
        const fn = ns.AutoPrompterCore && ns.AutoPrompterCore.start;
        if (typeof fn === "function") {
          done = true;
          U.bkLog &&
            U.bkLog("info", "sanity", "core_ready", {
              dt: (U.nowMs() - start) | 0,
            });
          return res(true);
        }
        if ((U.nowMs ? U.nowMs() : Date.now()) - start > ms) {
          done = true;
          U.bkLog && U.bkLog("warn", "sanity", "core_timeout", { ms });
          return res(false);
        }
        try {
          window.dispatchEvent(
            new CustomEvent("ap:need-start", {
              detail: {
                provide(fn2) {
                  if (typeof fn2 === "function")
                    (ns.AutoPrompterCore = ns.AutoPrompterCore || {}).start =
                      fn2;
                },
              },
            }),
          );
        } catch {}
        setTimeout(check, 200);
      }

      check();
    });
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/config/config.js");

/* ===== core/sanity/utils/config/config.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/config/config.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils/config.js
(function () {
  "use strict";
  const ns = (window.AutoPrompter = window.AutoPrompter || {});
  ns.sanity = ns.sanity || {};
  const U = (ns.sanity.utils = ns.sanity.utils || {});

  function readConfig() {
    try {
      const me =
        document.currentScript ||
        Array.from(document.querySelectorAll("script")).slice(-1)[0];
      const cfg = {};
      if (!me) return cfg;
      for (const a of me.attributes) {
        if (a.name.startsWith("data-ap-")) {
          const k = a.name
            .replace(/^data-ap-/, "")
            .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          const v = a.value;
          cfg[k] =
            v === "true" ? true : v === "false" ? false : isFinite(+v) ? +v : v;
        }
      }
      return cfg;
    } catch {
      return {};
    }
  }

  const merged = Object.assign(
    {
      heartbeatMaxMs: 60000,
      sampleRate: 1,
      logUrl: "/__ap/log",
      runtimeLayoutVersion: "v2",
    },
    readConfig(),
  );
  U.config = merged;

  const existing = ns.config && typeof ns.config === "object" ? ns.config : {};
  const getConfig = () => Object.assign({}, U.config);
  ns.config = Object.assign({}, existing, U.config, { getConfig });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/config/explain.js");

/* ===== core/sanity/utils/config/explain.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/config/explain.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils/explain.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.sanity = AP.sanity || {};
  const U = (AP.sanity.utils = AP.sanity.utils || {});

  // Do NOT re-create config here. Just ensure the public getter exists and mirrors U.config.
  const existing = AP.config && typeof AP.config === "object" ? AP.config : {};
  const getConfig =
    (typeof existing.getConfig === "function" && existing.getConfig) ||
    (() => Object.assign({}, U.config || {}));

  AP.config = Object.assign({}, existing, U.config || {}, { getConfig });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/config/paths.js");

/* ===== core/sanity/utils/config/paths.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/config/paths.js";try{
// core/sanity/utils/config/paths.js
(function () {
  "use strict";
  const ns = (window.AutoPrompter = window.AutoPrompter || {});
  ns.sanity = ns.sanity || {};
  const U = (ns.sanity.utils = ns.sanity.utils || {});

  if (U._pathsReady) return;

  // Legacy → Canonical path remaps (keeps old @require/imports working)
  const aliasMap = new Map(
    Object.entries({
      // boot/nav
      "core/runtime/navWatch.js": "core/runtime/boot/navWatch.js",
      "core/runtime/startGate.js": "core/runtime/boot/startGate.js",
      "core/runtime/core.js": "core/runtime/boot/core.js",

      // detection unified here
      "core/runtime/composerDetect.js": "core/detect/index.js",
      "core/runtime/composer/unifiedDetect.js": "core/detect/index.js",

      // deep picker → central deepQuery
      "core/runtime/composer/core/pickDeep.js": "core/dom/deepQuery.js",

      // prompt pipeline
      "core/runtime/promptParser.js": "core/runtime/prompt/parser.js",
      "core/runtime/promptEngine.js": "core/runtime/prompt/engine.js",

      // renderers: one canonical file
      "core/runtime/renderers.js": "core/addons/renderers.js",
      "core/runtime/prompt/renderers.js": "core/addons/renderers.js",

      // IO (kept for compatibility; not required by default)
      "core/runtime/senders.js": "core/runtime/io/senders.js",
      "core/runtime/idleWait.js": "core/runtime/io/idle.js",
      "core/runtime/waiters.js": "core/runtime/io/waiters.js",

      // compat
      "core/runtime/domWait.js": "core/runtime/compat/domWait.proxy.js",
      "core/runtime/startOnce.js": "core/runtime/compat/startOnce.wrap.js",

      // devtools
      "core/runtime/util/ui/panelFallback.js":
        "core/runtime/devtools/panelFallback.js",
      "core/runtime/util/noiseStubs.js": "core/runtime/devtools/noiseStubs.js",

      // adapters
      "core/runtime/composer/detectors/chatgpt.js":
        "core/runtime/adapters/chatgpt/detector.js",
      "core/runtime/composer/detectors/chatgptPatch.js":
        "core/runtime/adapters/chatgpt/patch.js",

      // shared facades
      "core/runtime/boot/trace.js": "core/runtime/shared/trace.js",
      "core/runtime/util/dom.js": "core/runtime/shared/domFacade.js",
      "core/runtime/util/domUtils.js": "core/runtime/shared/domUtils.js",
      "core/runtime/util/logger.js": "core/runtime/shared/logger.js",
      "core/runtime/util/loggerFacade.js":
        "core/runtime/shared/loggerFacade.js",
    })
  );

  // Minimal set your sanity check should find in a normal build
  const REQUIRED_RUNTIME = [
    "core/runtime/boot/startGate.js",
    "core/runtime/boot/navWatch.js",
    "core/runtime/boot/core.js",
    "core/runtime/composer/bootstrap.js",
    "core/runtime/composer/core/index.js",
    "core/detect/index.js", // unified detect
    "core/runtime/adapters/chatgpt/detector.js",
    // If you removed the patch layer entirely, delete the next line:
    "core/runtime/adapters/chatgpt/patch.js",
    "core/runtime/shared/flags.js",
    "core/addons/renderers.js", // canonical renderers
    "core/runtime/ui/panel.js",
  ];

  function norm(p) {
    return String(p || "")
      .replace(/^https?:\/\/[^\/]+\/+/, "")
      .replace(/^file:\/\/\/[^\/]+\/+/, "")
      .replace(/^\/+/, "")
      .trim();
  }

  function remap(p) {
    const s = norm(p);
    for (const [oldPath, newPath] of aliasMap.entries()) {
      if (s.endsWith(oldPath)) {
        return s.slice(0, s.length - oldPath.length) + newPath;
      }
    }
    return s;
  }

  function fullLoad() {
    try {
      const load = Array.isArray(window.__AP_LOAD) ? window.__AP_LOAD : [];
      return load.map((x) => remap(x));
    } catch {
      return [];
    }
  }

  function inBundle(requiredPaths) {
    try {
      const hay = fullLoad();
      const want = (requiredPaths || []).map((x) => remap(x));
      for (const w of want) {
        const hit = hay.find((h) => h.endsWith(w));
        if (hit) return { present: true, hit, load: hay };
      }
      return { present: false, hit: null, load: hay };
    } catch {
      return { present: false, hit: null, load: [] };
    }
  }

  function tailLoad(n = 12) {
    const hay = fullLoad();
    const start = Math.max(0, hay.length - n);
    return hay.slice(start);
  }

  function missing(required = REQUIRED_RUNTIME) {
    const hay = fullLoad();
    return (required || []).filter((r) => !hay.some((h) => h.endsWith(r)));
  }

  U.aliasMap = aliasMap;
  U.REQUIRED_RUNTIME = REQUIRED_RUNTIME;
  U.norm = norm;
  U.remap = remap;
  U.fullLoad = fullLoad;
  U.inBundle = inBundle;
  U.tailLoad = tailLoad;
  U.missing = missing;
  U._pathsReady = true;
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/core/base.js");

/* ===== core/sanity/utils/core/base.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/core/base.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils/base.js
(function () {
  "use strict";
  const ns = (window.AutoPrompter = window.AutoPrompter || {});
  ns.sanity = ns.sanity || {};
  const U = (ns.sanity.utils = ns.sanity.utils || {});

  U.L = () => ns.logger || console;

  U.get = (path, root = window) =>
    String(path)
      .split(".")
      .reduce((o, k) => (o && k in o ? o[k] : undefined), root);

  U.isFn = (v) => typeof v === "function";
  U.isObj = (v) => typeof v === "object" && v !== null;

  function nowMs() {
    if (window.performance && typeof performance.now === "function") {
      return performance.timeOrigin
        ? performance.timeOrigin + performance.now()
        : Date.now();
    }
    return Date.now();
  }
  U.nowMs = nowMs;

  function makeKey(level, scope, tag) {
    return String(level) + "::" + String(scope) + "::" + String(tag);
  }

  function ensureBkShim() {
    if (ns._logBackoff) return ns._logBackoff;
    if (ns._logBackoffShim) return ns._logBackoffShim;

    const sink = ns.logger || console;
    const state = new Map();

    function baseDelay(level) {
      if (level === "error") return 250;
      if (level === "warn") return 400;
      return 800;
    }

    function jitter(ms) {
      const j = Math.floor(Math.random() * Math.min(120, ms * 0.2));
      return ms + j;
    }

    function shouldEmit(level, scope, tag) {
      const k = makeKey(level, scope, tag);
      const rec = state.get(k) || { n: 0, nextAt: 0 };
      const t = nowMs();
      if (t >= rec.nextAt) {
        rec.n += 1;
        const back = Math.min(
          120000,
          baseDelay(level) * Math.pow(2, Math.max(0, rec.n - 1)),
        );
        rec.nextAt = t + jitter(back);
        state.set(k, rec);
        return true;
      }
      return false;
    }

    function emit(level, scope, tag, payload) {
      const header = "[AP][" + scope + "] " + String(tag);
      const fn = sink[level] || sink.log || console.log;
      try {
        if (payload !== undefined) fn.call(sink, header, payload);
        else fn.call(sink, header);
      } catch {
        try {
          console.log(header, payload);
        } catch {}
      }
    }

    function log(level, scope, tag, payload) {
      if (shouldEmit(level, scope, tag)) {
        emit(level, scope, tag, payload);
        return true;
      }
      return false;
    }

    function logOnce(level, scope, tag, payload) {
      const k = "ap_once::" + makeKey(level, scope, tag);
      try {
        if (sessionStorage.getItem(k)) return false;
        sessionStorage.setItem(k, "1");
      } catch {}
      emit(level, scope, tag, payload);
      return true;
    }

    function reset() {
      state.clear();
    }

    ns._logBackoffShim = { log, logOnce, reset, shouldLog: shouldEmit };
    return ns._logBackoffShim;
  }

  if (!U.bk) {
    U.bk = function bk() {
      return ns._logBackoff || ensureBkShim();
    };
  }

  if (!U.bkLog) {
    U.bkLog = function bkLog(level, scope, tag, payload) {
      try {
        return U.bk().log(level, scope, tag, payload);
      } catch {
        return false;
      }
    };
  }

  if (!U.bkOnce) {
    U.bkOnce = function bkOnce(level, scope, tag, payload) {
      try {
        return U.bk().logOnce(level, scope, tag, payload);
      } catch {
        return false;
      }
    };
  }
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/core/time.js");

/* ===== core/sanity/utils/core/time.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/core/time.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils/time.js
(function () {
  "use strict";
  const ns = (window.AutoPrompter = window.AutoPrompter || {});
  ns.sanity = ns.sanity || {};
  const U = (ns.sanity.utils = ns.sanity.utils || {});

  U.now = function now() {
    if (window.performance && performance.now) return performance.now();
    return Date.now();
  };

  U.mark = function mark(label, data) {
    try {
      const t = U.now();
      const rec = { t, label, ...(data || {}) };
      const store = (ns.sanity.timeline = ns.sanity.timeline || []);
      store.push(rec);
      return rec;
    } catch {
      return null;
    }
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/core/utils.js");

/* ===== core/sanity/utils/core/utils.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/core/utils.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.sanity = AP.sanity || {};
  if (AP.sanity.utils && typeof AP.sanity.utils.openReport === "function") {
    try {
      AP.boot?.cp?.("sanity:utils:ready:noop");
    } catch {}
    return;
  }

  function get(path) {
    try {
      const parts = String(path).split(".");
      let o = window;
      for (const k of parts) {
        if (o == null || !(k in o)) return undefined;
        o = o[k];
      }
      return o;
    } catch {
      return undefined;
    }
  }

  function typeAt(path) {
    try {
      const v = get(path);
      return typeof v;
    } catch {
      return "undefined";
    }
  }

  function nowISO() {
    try {
      return new Date().toISOString();
    } catch {
      return "";
    }
  }

  function toConsole(results) {
    try {
      const rows = results.map((r) => ({
        id: r.id,
        ok: !!r.ok,
        info: r.info || "",
      }));
      if (console.table) console.table(rows);
      else rows.forEach((r) => console.log("[sanity]", r.id, r.ok, r.info));
    } catch {}
  }

  function openReport(results) {
    try {
      const id = "ap-sanity-report";
      const old = document.getElementById(id);
      if (old) old.remove();

      const host = document.createElement("div");
      host.id = id;
      host.style.position = "fixed";
      host.style.inset = "10px 10px auto auto";
      host.style.zIndex = "2147483647";
      host.style.background = "rgba(16,16,20,0.96)";
      host.style.color = "#e8e8ea";
      host.style.border = "1px solid #333";
      host.style.borderRadius = "12px";
      host.style.boxShadow = "0 8px 30px rgba(0,0,0,0.35)";
      host.style.padding = "12px 12px 8px 12px";
      host.style.font =
        "12px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial";

      const header = document.createElement("div");
      header.textContent = "Auto Prompter — Sanity Report";
      header.style.fontWeight = "600";
      header.style.marginBottom = "8px";

      const meta = document.createElement("div");
      meta.textContent = nowISO();
      meta.style.opacity = "0.7";
      meta.style.marginBottom = "8px";

      const close = document.createElement("button");
      close.textContent = "Close";
      close.style.marginLeft = "8px";
      close.style.padding = "4px 8px";
      close.style.border = "1px solid #555";
      close.style.background = "#1e1f25";
      close.style.color = "#ddd";
      close.style.borderRadius = "6px";
      close.style.cursor = "pointer";
      close.onclick = () => host.remove();

      const table = document.createElement("table");
      table.style.borderCollapse = "collapse";
      table.style.minWidth = "360px";
      table.style.maxWidth = "560px";
      table.style.display = "block";
      table.style.overflow = "auto";
      table.style.maxHeight = "50vh";
      table.style.border = "1px solid #2a2a2f";

      const thead = document.createElement("thead");
      const hr = document.createElement("tr");
      ["Check", "OK", "Info"].forEach((h) => {
        const th = document.createElement("th");
        th.textContent = h;
        th.style.textAlign = "left";
        th.style.padding = "6px 8px";
        th.style.borderBottom = "1px solid #2a2a2f";
        thead.appendChild(hr);
        hr.appendChild(th);
      });

      const tbody = document.createElement("tbody");
      (results || []).forEach((r) => {
        const tr = document.createElement("tr");
        const td1 = document.createElement("td");
        const td2 = document.createElement("td");
        const td3 = document.createElement("td");
        td1.textContent = r.id || "";
        td2.textContent = r.ok ? "true" : "false";
        td3.textContent = r.info || "";
        [td1, td2, td3].forEach((td) => {
          td.style.padding = "6px 8px";
          td.style.borderBottom = "1px solid #222";
          td.style.verticalAlign = "top";
          td.style.whiteSpace = "pre-wrap";
          td.style.wordBreak = "break-word";
        });
        if (!r.ok) tr.style.color = "#ffb4b4";
        tbody.appendChild(tr);
      });

      table.appendChild(thead);
      table.appendChild(tbody);

      const topRow = document.createElement("div");
      topRow.style.display = "flex";
      topRow.style.alignItems = "center";
      topRow.style.justifyContent = "space-between";
      topRow.appendChild(header);
      topRow.appendChild(close);

      host.appendChild(topRow);
      host.appendChild(meta);
      host.appendChild(table);
      document.documentElement.appendChild(host);
      return true;
    } catch {
      return false;
    }
  }

  AP.sanity.utils = { get, typeAt, nowISO, toConsole, openReport };

  try {
    AP.boot?.cp?.("sanity:utils:ready");
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/diagnostics/csp.js");

/* ===== core/sanity/utils/diagnostics/csp.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/diagnostics/csp.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils/csp.js
(function () {
  "use strict";
  const ns = (window.AutoPrompter = window.AutoPrompter || {});
  ns.sanity = ns.sanity || {};
  const U = (ns.sanity.utils = ns.sanity.utils || {});

  U.sniffCsp = function sniffCsp() {
    try {
      const pol = document.querySelector(
        'meta[http-equiv="Content-Security-Policy"]',
      );
      const val = pol ? pol.getAttribute("content") || "" : "";
      return { has: Boolean(val), policy: val };
    } catch {
      return { has: false, policy: "" };
    }
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/diagnostics/errors.js");

/* ===== core/sanity/utils/diagnostics/errors.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/diagnostics/errors.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils/errors.js
(function () {
  "use strict";
  const ns = (window.AutoPrompter = window.AutoPrompter || {});
  ns.sanity = ns.sanity || {};
  const U = (ns.sanity.utils = ns.sanity.utils || {});

  U.captureGlobalErrors = function captureGlobalErrors() {
    if (ns.sanity._errorsHooked) return;
    ns.sanity._errorsHooked = true;

    const store = (ns.sanity.errors = ns.sanity.errors || []);
    window.addEventListener(
      "error",
      (e) => {
        try {
          store.push({
            type: "error",
            msg: String(e.message || ""),
            src: e.filename || "",
            line: e.lineno || 0,
            col: e.colno || 0,
            stack: e.error && e.error.stack ? String(e.error.stack) : "",
            t: Date.now(),
          });
        } catch {}
      },
      true,
    );
    window.addEventListener(
      "unhandledrejection",
      (e) => {
        try {
          const err = e.reason || {};
          store.push({
            type: "unhandledrejection",
            msg: String(err.message || e.reason || ""),
            stack: err && err.stack ? String(err.stack) : "",
            t: Date.now(),
          });
        } catch {}
      },
      true,
    );
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/diagnostics/perf.js");

/* ===== core/sanity/utils/diagnostics/perf.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/diagnostics/perf.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils/perf.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.sanity = AP.sanity || {};
  const U = (AP.sanity.utils = AP.sanity.utils || {});
  if (U.__perfMonInstalled && typeof U.installPerfObservers === "function") {
    return; // already installed
  }

  const L = AP.logger || console;

  // --- small ring buffer for recent freeze events ---
  function ring(limit = 50) {
    const buf = [];
    return {
      push(x) {
        buf.push(x);
        if (buf.length > limit) buf.shift();
      },
      all() {
        return buf.slice();
      },
      size() {
        return buf.length;
      },
    };
  }

  const state = {
    longTaskTotal: 0,
    longTaskMax: 0,
    longTaskCount: 0,

    eventLoopLagMax: 0,
    eventLoopLagEvents: 0,

    rafGapMax: 0,
    rafStalls: 0,

    observers: { longtask: null },
    timers: { lag: null },
    raf: { handle: 0, last: 0 },

    freezes: ring(50),
  };

  function safeToast(msg, level = "info", opts) {
    try {
      AP.sanity?.utils?.toast?.(String(msg || ""), level, opts || {});
    } catch {}
  }

  function emitFreeze(reason, extra) {
    const detail = {
      reason,
      t: Date.now(),
      href: location.href,
      visible: String(document.visibilityState || "visible"),
      ...(extra || {}),
    };
    try {
      state.freezes.push(detail);
      (window.__AP_FREEZE_LOG = window.__AP_FREEZE_LOG || []).push(detail);
    } catch {}

    try {
      (L.warn || L.log).call(L, "[AP][freeze]", detail);
    } catch {}

    try {
      // Broadcast for UI/panel hooks
      window.dispatchEvent(new CustomEvent("ap:freeze", { detail }));
    } catch {}

    // best-effort telemetry
    try {
      U.bkLog && U.bkLog("warn", "perf", "freeze", detail, { sampleRate: 0.5 });
    } catch {}

    safeToast(`UI stall detected (${reason})`, "warn", {
      onceKey: `freeze_${reason}`,
    });
  }

  function startLongTaskObserver(threshold = 1000) {
    if (state.observers.longtask) return true;
    try {
      if (!("PerformanceObserver" in window)) return false;
      const supported = PerformanceObserver.supportedEntryTypes || [];
      if (!supported.includes("longtask")) return false;

      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          const dur = e.duration || 0;
          state.longTaskTotal += dur;
          state.longTaskMax = Math.max(state.longTaskMax, dur);
          state.longTaskCount += 1;
          if (dur >= threshold) {
            emitFreeze("longtask", {
              duration: Math.round(dur),
              name: e.name || "longtask",
              start: Math.round(e.startTime || 0),
            });
          }
        }
      });
      po.observe({ type: "longtask", buffered: true });
      state.observers.longtask = po;

      // keep a short public sample like old API for compatibility
      AP.sanity.longTasks = AP.sanity.longTasks || [];
      const orig = state.longTaskCount;
      setInterval(() => {
        try {
          // append a synthetic summary entry occasionally
          if (state.longTaskCount !== orig) {
            AP.sanity.longTasks.push({
              name: "summary",
              dur: state.longTaskMax,
              ts: performance.now(),
            });
            if (AP.sanity.longTasks.length > 10) AP.sanity.longTasks.shift();
          }
        } catch {}
      }, 30000);
      return true;
    } catch (e) {
      (L.debug || L.log).call(L, "longtask observer error", e);
      return false;
    }
  }

  function startEventLoopLag(interval = 500, threshold = 1200) {
    if (state.timers.lag) return true;
    let last = performance.now();
    state.timers.lag = setInterval(() => {
      const now = performance.now();
      const drift = now - last - interval;
      last = now;
      if (drift > threshold) {
        state.eventLoopLagEvents += 1;
        state.eventLoopLagMax = Math.max(state.eventLoopLagMax, drift);
        emitFreeze("event-loop-lag", {
          drift: Math.round(drift),
          interval,
        });
      }
    }, interval);
    return true;
  }

  function startRafMonitor(threshold = 2000) {
    if (state.raf.handle) return true;
    function tick(ts) {
      if (!state.raf.last) state.raf.last = ts;
      const gap = ts - state.raf.last;
      state.raf.last = ts;

      if (gap > threshold && document.visibilityState === "visible") {
        state.rafStalls += 1;
        state.rafGapMax = Math.max(state.rafGapMax, gap);
        emitFreeze("raf-gap", { gap: Math.round(gap) });
      }
      state.raf.handle = requestAnimationFrame(tick);
    }
    state.raf.handle = requestAnimationFrame(tick);
    return true;
  }

  function stopAll() {
    try {
      state.observers.longtask?.disconnect?.();
    } catch {}
    state.observers.longtask = null;

    try {
      if (state.timers.lag) clearInterval(state.timers.lag);
    } catch {}
    state.timers.lag = null;

    try {
      if (state.raf.handle) cancelAnimationFrame(state.raf.handle);
    } catch {}
    state.raf.handle = 0;
    state.raf.last = 0;
  }

  function getStats() {
    return {
      longTask: {
        total: Math.round(state.longTaskTotal),
        max: Math.round(state.longTaskMax),
        count: state.longTaskCount,
      },
      eventLoopLag: {
        max: Math.round(state.eventLoopLagMax),
        events: state.eventLoopLagEvents,
      },
      raf: {
        maxGap: Math.round(state.rafGapMax),
        stalls: state.rafStalls,
      },
      freezes: state.freezes.all(),
    };
  }

  U.installPerfObservers = function installPerfObservers(opts) {
    if (U.__perfMonInstalled) return true;
    const o = opts || {};
    startLongTaskObserver(o.longTaskThreshold || 1000);
    startEventLoopLag(o.lagInterval || 500, o.lagThreshold || 1200);
    startRafMonitor(o.rafThreshold || 2000);
    U.__perfMonInstalled = true;
    try {
      (L.info || L.log).call(L, "[AP perf] observers installed", getStats());
    } catch {}
    return true;
  };

  U.stopPerfObservers = stopAll;
  U.getPerfStats = getStats;
  U.__perfState = state;
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/diagnostics/selftest.js");

/* ===== core/sanity/utils/diagnostics/selftest.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/diagnostics/selftest.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils/selftest.js
(function () {
  "use strict";
  const ns = (window.AutoPrompter = window.AutoPrompter || {});
  ns.sanity = ns.sanity || {};
  const U = (ns.sanity.utils = ns.sanity.utils || {});

  U.selfTest = async function selfTest() {
    U.bkOnce && U.bkOnce("info", "sanity", "selftest_begin", {});
    setTimeout(
      () => Promise.reject(new Error("selftest: unhandled rejection")),
      10,
    );
    const ok = await (U.awaitCoreStart
      ? U.awaitCoreStart(200)
      : Promise.resolve(false));
    U.bkLog && U.bkLog("info", "sanity", "selftest_done", { coreOk: ok });
    return { coreOk: ok, bootId: U.bootId };
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/registry/checks-registry.js");

/* ===== core/sanity/utils/registry/checks-registry.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/registry/checks-registry.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils/checks-registry.js
(function () {
  "use strict";
  const ns = (window.AutoPrompter = window.AutoPrompter || {});
  ns.sanity = ns.sanity || {};
  const U = (ns.sanity.utils = ns.sanity.utils || {});

  const registry = [];

  U.registerSanityCheck = function registerSanityCheck(spec) {
    if (!spec || !spec.label || !spec.path || !spec.kind) return false;
    registry.push(spec);
    return true;
  };

  U.getSanityChecks = function getSanityChecks() {
    return registry.slice();
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/telemetry/bk.js");

/* ===== core/sanity/utils/telemetry/bk.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/telemetry/bk.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils/bk.js
(function () {
  "use strict";
  const ns = (window.AutoPrompter = window.AutoPrompter || {});
  ns.sanity = ns.sanity || {};
  const U = (ns.sanity.utils = ns.sanity.utils || {});

  const rnd = () =>
    window.crypto && crypto.getRandomValues
      ? [1, 2, 3, 4]
          .map(() => crypto.getRandomValues(new Uint32Array(1))[0])
          .join("-")
      : String(Math.random()).slice(2) + "-" + Date.now();

  const bootId = (U.bootId = U.bootId || window.__AP_BOOT_ID || rnd());

  function hash32(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++)
      ((h ^= s.charCodeAt(i)), (h = Math.imul(h, 16777619)));
    return h >>> 0;
  }

  function shouldSample(key, rate) {
    if (rate >= 1) return true;
    const h = hash32(String(key) + ":" + String(bootId));
    return (h % 10000) / 10000 < rate;
  }

  function tokenBucket(capacity, refillPerSec) {
    let tokens = capacity;
    let last = performance.now();
    return function take(cost = 1) {
      const now = performance.now();
      const elapsed = (now - last) / 1000;
      last = now;
      tokens = Math.min(capacity, tokens + elapsed * refillPerSec);
      if (tokens >= cost) {
        tokens -= cost;
        return true;
      }
      return false;
    };
  }

  const allow = tokenBucket(20, 10);

  U.bkLog = function bkLog(level, area, event, payload, opts) {
    const L = U.L ? U.L() : console;
    const o = opts || {};
    const key = area + ":" + event;
    const rate =
      o.sampleRate == null ? U.config?.sampleRate || 1 : o.sampleRate;
    if (!shouldSample(key, rate)) return false;
    if (!allow()) return false;

    const body = {
      bootId,
      level,
      area,
      event,
      payload,
      t: Date.now(),
      href: location.href,
      ua: navigator.userAgent,
    };

    try {
      if (typeof U.postLog === "function") U.postLog(body);
    } catch {}
    try {
      L[level === "warn" || level === "error" ? level : "info"](
        "[AP][bk]",
        body,
      );
    } catch {}

    return true;
  };

  const onceKeys = new Set();
  U.bkOnce = function bkOnce(level, area, event, payload) {
    const k = area + ":" + event;
    if (onceKeys.has(k)) return true;
    onceKeys.add(k);
    return U.bkLog(level, area, event, payload);
  };

  U.nowMs = function nowMs() {
    return performance && performance.now ? performance.now() : Date.now();
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/telemetry/heartbeat.js");

/* ===== core/sanity/utils/telemetry/heartbeat.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/telemetry/heartbeat.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils/heartbeat.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.sanity = AP.sanity || {};
  const U = (AP.sanity.utils = AP.sanity.utils || {});
  if (U.__heartbeatReady) return;

  const L = AP.logger || console;

  const hb = {
    timer: null,
    interval: 10000,
    last: 0,
    count: 0,
    paused: false,
  };

  function emitHeartbeat() {
    hb.last = Date.now();
    hb.count += 1;
    const detail = {
      t: hb.last,
      count: hb.count,
      interval: hb.interval,
      href: location.href,
      visible: String(document.visibilityState || "visible"),
    };
    try {
      (window.__AP_HEARTBEAT = window.__AP_HEARTBEAT || []).push(detail);
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent("ap:heartbeat", { detail }));
    } catch {}
    try {
      AP.boot?.cp?.("heartbeat", { count: hb.count });
    } catch {}
    try {
      U.bkLog &&
        U.bkLog("info", "perf", "heartbeat", detail, { sampleRate: 0.2 });
    } catch {}
  }

  function tick() {
    if (hb.paused) return;
    emitHeartbeat();
  }

  function startHeartbeat(intervalMs) {
    stopHeartbeat();
    hb.interval = Math.max(1000, Number(intervalMs || hb.interval) | 0);
    hb.paused = document.visibilityState === "hidden";
    try {
      document.addEventListener("visibilitychange", () => {
        hb.paused = document.visibilityState === "hidden";
      });
    } catch {}
    hb.timer = setInterval(tick, hb.interval);
    // fire an immediate first tick for liveness
    tick();
    try {
      (L.info || L.log).call(L, "[AP hb] started", { interval: hb.interval });
    } catch {}
    return true;
  }

  function stopHeartbeat() {
    try {
      if (hb.timer) clearInterval(hb.timer);
    } catch {}
    hb.timer = null;
  }

  function getHeartbeatStatus() {
    const now = Date.now();
    const age = hb.last ? now - hb.last : null;
    return {
      running: Boolean(hb.timer),
      paused: hb.paused,
      interval: hb.interval,
      last: hb.last,
      age,
      count: hb.count,
    };
  }

  U.startHeartbeat = startHeartbeat;
  U.stopHeartbeat = stopHeartbeat;
  U.getHeartbeatStatus = getHeartbeatStatus;
  U.__heartbeatReady = true;
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/telemetry/lifecycle.js");

/* ===== core/sanity/utils/telemetry/lifecycle.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/telemetry/lifecycle.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils/lifecycle.js
(function () {
  "use strict";
  const ns = (window.AutoPrompter = window.AutoPrompter || {});
  ns.sanity = ns.sanity || {};
  const U = (ns.sanity.utils = ns.sanity.utils || {});

  U.attachLifecycle = function attachLifecycle() {
    try {
      document.addEventListener(
        "visibilitychange",
        () => {
          if (U.bkLog) {
            U.bkLog("info", "sanity", "visibility", {
              state: document.visibilityState,
              t: U.nowMs ? U.nowMs() : Date.now(),
            });
          }
        },
        { passive: true },
      );
      window.addEventListener(
        "beforeunload",
        () => {
          if (U.bkLog) {
            U.bkLog("info", "sanity", "unload", {
              t: U.nowMs ? U.nowMs() : Date.now(),
            });
          }
        },
        { passive: true },
      );
    } catch {}
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/telemetry/network-memory.js");

/* ===== core/sanity/utils/telemetry/network-memory.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/telemetry/network-memory.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils/network-memory.js
(function () {
  "use strict";
  const ns = (window.AutoPrompter = window.AutoPrompter || {});
  ns.sanity = ns.sanity || {};
  const U = (ns.sanity.utils = ns.sanity.utils || {});

  U.attachEnvSignals = function attachEnvSignals() {
    try {
      window.addEventListener(
        "online",
        () => U.bkLog && U.bkLog("info", "sanity", "online", {}),
        { passive: true },
      );
      window.addEventListener(
        "offline",
        () => U.bkLog && U.bkLog("info", "sanity", "offline", {}),
        { passive: true },
      );
      if ("onmemorypressure" in window) {
        window.addEventListener(
          "memorypressure",
          (e) =>
            U.bkLog &&
            U.bkLog("warn", "sanity", "memorypressure", {
              level: e.level || "unknown",
            }),
        );
      }
    } catch {}
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/telemetry/print.js");

/* ===== core/sanity/utils/telemetry/print.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/telemetry/print.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils/print.js
(function () {
  "use strict";
  const ns = (window.AutoPrompter = window.AutoPrompter || {});
  ns.sanity = ns.sanity || {};
  const U = (ns.sanity.utils = ns.sanity.utils || {});

  if (U._printReady) return;

  function printResults(results) {
    const L = U.L ? U.L() : console;
    const okAll = (results || []).every((r) => r.ok);
    try {
      const csp = U.sniffCsp ? U.sniffCsp() : { has: false };
      if (csp.has && U.bkLog) {
        U.bkLog("info", "sanity", "csp", {
          present: true,
          sample: (csp.policy || "").slice(0, 140) + "…",
        });
      }

      if (console.table) {
        console.table(
          (results || []).map((r) => ({
            ok: r.ok ? "ok" : "fail",
            sev: r.severity || "n/a",
            label: r.label,
            path: r.path,
            kind: r.kind,
            found: r.found,
            cause: r.ok ? "" : r.cause,
          })),
        );
      } else {
        const head = okAll ? "SANITY OK" : "SANITY FAIL";
        L.info("[AP][sanity] " + head);
        for (const r of results || []) {
          const base =
            (r.ok ? "ok" : "fail") +
            " " +
            r.label +
            " (" +
            r.path +
            ") -> " +
            r.found;
          if (r.ok) L.info("[AP][sanity] " + base);
          else {
            L.warn("[AP][sanity] " + base);
            if (r.cause) L.warn("[AP][sanity]   cause: " + r.cause);
            if (r.why) L.warn("[AP][sanity]   why: " + r.why);
            if (r.fix) L.warn("[AP][sanity]   fix: " + r.fix);
          }
        }
      }

      const tail = U.tailLoad ? U.tailLoad(15) : [];
      if (tail.length && U.bkLog) {
        U.bkLog("info", "sanity", "ap_load_tail", {
          tailLen: tail.length,
          tail,
        });
      } else if (U.bkLog) {
        U.bkLog("warn", "sanity", "ap_load_empty", {
          msg: "__AP_LOAD is empty",
        });
      }
    } catch {}
    return okAll;
  }

  U.printResults = printResults;
  U._printReady = true;
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/telemetry/report.js");

/* ===== core/sanity/utils/telemetry/report.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/telemetry/report.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils/report.js
(function () {
  "use strict";
  const ns = (window.AutoPrompter = window.AutoPrompter || {});
  ns.sanity = ns.sanity || {};
  const U = (ns.sanity.utils = ns.sanity.utils || {});

  U.reportHtml = function reportHtml(results) {
    try {
      const rows = results
        .map((r) => {
          const ok = r.ok ? "ok" : "fail";
          const why = r.ok ? "" : r.why.replace(/</g, "&lt;");
          const fix = r.ok ? "" : r.fix.replace(/</g, "&lt;");
          return `<tr>
<td>${ok}</td><td>${r.label}</td><td><code>${r.path}</code></td>
<td>${r.kind}</td><td>${r.found}</td><td>${why}</td><td>${fix}</td>
</tr>`;
        })
        .join("");
      const load = U.tailLoad(20)
        .map((x) => `<li><code>${x}</code></li>`)
        .join("");
      const errs = (ns.sanity.errors || [])
        .slice(-10)
        .map(
          (e) =>
            `<li><b>${e.type}</b> ${e.msg} <em>${e.src || ""}</em><pre>${(
              e.stack || ""
            ).replace(/</g, "&lt;")}</pre></li>`,
        )
        .join("");

      return `<!doctype html>
<meta charset="utf-8">
<title>AP Sanity Report</title>
<style>
body{font-family:ui-sans-serif,system-ui;line-height:1.35;margin:16px}
table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:6px}
th{background:#f5f7fb;text-align:left} code{background:#f3f4f6;padding:1px 4px;border-radius:4px}
.ok{color:#0a6} .fail{color:#c00}
section{margin-top:18px}
</style>
<h1>AutoPrompter — Sanity Report</h1>
<section>
<table>
<thead><tr><th>ok</th><th>label</th><th>path</th><th>kind</th><th>found</th><th>why</th><th>fix</th></tr></thead>
<tbody>${rows}</tbody>
</table>
</section>
<section>
<h2>__AP_LOAD tail</h2>
<ol>${load}</ol>
</section>
<section>
<h2>Recent errors</h2>
<ol>${errs || "<li>(none)</li>"}</ol>
</section>`;
    } catch (e) {
      return `<pre>Report generation error: ${String(
        e && e.message ? e.message : e,
      )}</pre>`;
    }
  };

  U.openReport = function openReport(results) {
    try {
      const w = window.open("", "_blank", "width=980,height=800");
      if (!w) return false;
      w.document.open();
      w.document.write(U.reportHtml(results));
      w.document.close();
      return true;
    } catch {
      return false;
    }
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/telemetry/sink.js");

/* ===== core/sanity/utils/telemetry/sink.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/telemetry/sink.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils/sink.js
(function () {
  "use strict";
  const ns = (window.AutoPrompter = window.AutoPrompter || {});
  ns.sanity = ns.sanity || {};
  const U = (ns.sanity.utils = ns.sanity.utils || {});

  function pickLogUrl() {
    try {
      const me =
        document.currentScript ||
        Array.from(document.querySelectorAll("script")).slice(-1)[0];
      const fromAttr =
        me && me.getAttribute("data-ap-log-url")
          ? me.getAttribute("data-ap-log-url")
          : null;
      if (fromAttr) return fromAttr;
    } catch {}
    if (U.config && U.config.logUrl) return U.config.logUrl;
    return "/__ap/log";
  }

  const ENDPOINT = pickLogUrl();

  async function viaFetch(payload) {
    try {
      await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
        credentials: "omit",
        cache: "no-store",
      });
      return true;
    } catch {
      return false;
    }
  }

  function viaBeacon(payload) {
    try {
      if (!("sendBeacon" in navigator)) return false;
      const blob = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });
      return navigator.sendBeacon(ENDPOINT, blob);
    } catch {
      return false;
    }
  }

  U.postLog = function postLog(payload) {
    try {
      if (viaBeacon(payload)) return true;
      void viaFetch(payload);
      return true;
    } catch {
      return false;
    }
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/telemetry/snapshot.js");

/* ===== core/sanity/utils/telemetry/snapshot.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/telemetry/snapshot.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils/snapshot.js
(function () {
  "use strict";
  const ns = (window.AutoPrompter = window.AutoPrompter || {});
  ns.sanity = ns.sanity || {};
  const U = (ns.sanity.utils = ns.sanity.utils || {});

  U.envSnapshot = function envSnapshot() {
    const b = window.__AP_BUNDLE_META || {};
    const pv = performance && performance.memory ? performance.memory : null;
    return {
      ts: new Date().toISOString(),
      href: location.href,
      ua: navigator.userAgent,
      vis: document.visibilityState || "unknown",
      bundle: {
        ok: !!b.ok,
        id: b.id || "",
        files: b.files_count || 0,
        wants: b.wants_count || 0,
        ms: b.ms || 0,
        missing: b.missing || [],
        criticalMissing: b.criticalMissing || [],
        tail: (U.tailLoad && U.tailLoad(12)) || [],
      },
      perf: pv
        ? {
            jsHeapSizeLimit: pv.jsHeapSizeLimit,
            totalJSHeapSize: pv.totalJSHeapSize,
            usedJSHeapSize: pv.usedJSHeapSize,
          }
        : null,
    };
  };
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/ux/breadcrumbs.js");

/* ===== core/sanity/utils/ux/breadcrumbs.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/ux/breadcrumbs.js";try{
// ./auto-prompter/core/sanity/utils/breadcrumbs.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.sanity = AP.sanity || {};
  const U = (AP.sanity.utils = AP.sanity.utils || {});
  if (AP.sanity.bc && AP.sanity.bc.mark) {
    try {
      AP.boot?.cp?.("sanity:breadcrumbs:ready:noop");
    } catch {}
    return;
  }

  const bc = [];
  const seenOnce = new Set();

  function mark(path, stage = "ready", meta) {
    try {
      const rec = {
        t: Date.now(),
        path: String(path || ""),
        stage: String(stage || "ready"),
        ...(meta || {}),
      };
      bc.push(rec);
      // prevent flood; only emit first time per (path,stage)
      const k = rec.path + "::" + rec.stage;
      if (!seenOnce.has(k)) {
        seenOnce.add(k);
        U.bkLog && U.bkLog("info", "sanity", "bc", rec, { sampleRate: 0.2 });
      }
    } catch {}
    return true;
  }

  // wrap AP.boot.cp to also breadcrumb
  try {
    const boot = (AP.boot = AP.boot || {});
    const orig = boot.cp;
    boot.cp = function (label, payload) {
      try {
        mark("boot.cp", label || "unknown", payload || {});
      } catch {}
      if (typeof orig === "function") {
        try {
          return orig.apply(this, arguments);
        } catch {}
      }
      return undefined;
    };
  } catch {}

  function all() {
    return bc.slice();
  }
  function tail(n = 30) {
    const a = bc;
    return a.slice(Math.max(0, a.length - n));
  }

  AP.sanity.bc = { mark, all, tail };

  try {
    AP.boot?.cp?.("sanity:breadcrumbs:ready", { count: bc.length });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils/ux/toast.js");

/* ===== core/sanity/utils/ux/toast.js ===== */
(function(){var __AP_MOD="/core/sanity/utils/ux/toast.js";try{
// ./auto-prompter/core/sanity/utils/toast.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.sanity = AP.sanity || {};
  const U = (AP.sanity.utils = AP.sanity.utils || {});
  if (U.toast) return;

  function toast(msg, kind = "info", { onceKey } = {}) {
    try {
      if (onceKey) {
        const k = "ap_toast_once::" + onceKey;
        if (sessionStorage.getItem(k)) return;
        sessionStorage.setItem(k, "1");
      }
    } catch {}

    const box = document.createElement("div");
    box.textContent = String(msg || "");
    box.style.position = "fixed";
    box.style.right = "14px";
    box.style.top = "14px";
    box.style.zIndex = "2147483647";
    box.style.padding = "8px 12px";
    box.style.borderRadius = "10px";
    box.style.font =
      "12px/1.3 -apple-system,BlinkMacSystemFont,Segoe UI,Inter,Roboto,Arial";
    box.style.boxShadow = "0 8px 26px rgba(0,0,0,0.35)";
    box.style.border = "1px solid rgba(255,255,255,0.1)";
    box.style.backdropFilter = "blur(6px)";
    box.style.color = "#e9ebef";
    box.style.background =
      kind === "ok"
        ? "linear-gradient(180deg, rgba(18,36,28,0.92), rgba(12,26,20,0.92))"
        : "linear-gradient(180deg, rgba(24,26,32,0.92), rgba(18,20,26,0.92))";

    document.documentElement.appendChild(box);
    setTimeout(() => box.remove(), 2600);
    return true;
  }

  U.toast = toast;
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/core/index.js");

/* ===== core/runtime/core/index.js ===== */
(function(){var __AP_MOD="/core/runtime/core/index.js";try{
// ./auto-prompter/core/runtime/core/index.js
(function () {
  "use strict";
  const VERSION = "4.3.0";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "core/runtime/core/index.js"
    );
  } catch {}

  // ---------- tiny safe-define helpers (avoid getter-only assignment crashes)
  function getOwnDesc(obj, key) {
    try {
      return Object.getOwnPropertyDescriptor(obj, key);
    } catch {
      return undefined;
    }
  }
  function canWriteProp(obj, key) {
    const d = getOwnDesc(obj, key);
    if (!d) return true; // not defined yet → safe
    if ("set" in d) return !!d.set; // accessor: only if setter exists
    return !!d.writable; // data prop: only if writable
  }
  function tryAssign(obj, key, val) {
    try {
      if (canWriteProp(obj, key)) {
        obj[key] = val;
        return true;
      }
    } catch {}
    return false;
  }
  function tryDefineWritable(obj, key, val) {
    try {
      const d = getOwnDesc(obj, key);
      if (!d || d.configurable) {
        Object.defineProperty(obj, key, {
          configurable: true,
          enumerable: true,
          writable: true,
          value: val,
        });
        return true;
      }
    } catch {}
    return false;
  }
  function tryDefineGetter(obj, key, getter) {
    try {
      const d = getOwnDesc(obj, key);
      if (!d || d.configurable) {
        Object.defineProperty(obj, key, {
          configurable: true,
          enumerable: true,
          get: getter,
        });
        return true;
      }
    } catch {}
    return false;
  }
  function safeSetValue(obj, key, val) {
    return tryAssign(obj, key, val) || tryDefineWritable(obj, key, val);
  }
  function cp(tag, payload) {
    try {
      AP.boot?.cp?.(tag, payload);
    } catch {}
  }

  // If already wired, keep idempotent
  if (AP.AutoPrompterCore && typeof AP.AutoPrompterCore.start === "function") {
    cp("core:index:ready", { version: VERSION, reused: true });
    return;
  }

  // Ensure sub-surfaces exist (safe no-ops if loader order is loose)
  AP.coreState = AP.coreState || {};
  AP.coreDeps = AP.coreDeps || {};
  AP.corePanel = AP.corePanel || {};
  AP.coreRun = AP.coreRun || {};
  AP.coreStart = AP.coreStart || {};
  AP.coreEvents = AP.coreEvents || {};

  const L = AP.logger?.with
    ? AP.logger.with({ component: "core", file: "core/index.js" })
    : console;

  // Safe fallbacks that warn once if core pieces are missing
  const warnOnce = (tag, msg) => {
    try {
      const k = "ap_log_once::" + tag;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch {}
    (L.warn || L.log).call(L, msg);
  };

  const start =
    (AP.coreStart &&
      typeof AP.coreStart.start === "function" &&
      AP.coreStart.start) ||
    function () {
      warnOnce("core_start_missing", "[AP core] start() not available yet.");
      return false;
    };

  const stop =
    (AP.coreRun && typeof AP.coreRun.stop === "function" && AP.coreRun.stop) ||
    function () {
      warnOnce("core_stop_missing", "[AP core] stop() not available yet.");
      return false;
    };

  const run =
    (AP.coreRun && typeof AP.coreRun.run === "function" && AP.coreRun.run) ||
    function () {
      warnOnce("core_run_missing", "[AP core] run() not available yet.");
      return false;
    };

  // Wire CustomEvent bridge if available (idempotent inside implementation)
  try {
    if (AP.coreEvents && typeof AP.coreEvents.wireFacadeBridge === "function") {
      AP.coreEvents.wireFacadeBridge(start, stop);
    }
  } catch (e) {
    (L.warn || L.log).call(L, "[AP core] wireFacadeBridge failed:", e);
  }

  // Also provide a tiny inline bridge so other modules can request handles
  try {
    window.addEventListener("ap:need-start", (e) => {
      try {
        e?.detail?.provide?.(start);
      } catch {}
    });
    window.addEventListener("ap:need-stop", (e) => {
      try {
        e?.detail?.provide?.(stop);
      } catch {}
    });
  } catch {}

  // Public API facade — define with accessors to avoid conflicting writes
  const coreFacade =
    AP.AutoPrompterCore && typeof AP.AutoPrompterCore === "object"
      ? AP.AutoPrompterCore
      : {};

  // define accessor props (configurable) rather than data props
  tryDefineGetter(coreFacade, "start", () => start);
  tryDefineGetter(coreFacade, "stop", () => stop);
  tryDefineGetter(coreFacade, "run", () => run);
  tryDefineWritable(coreFacade, "__v", VERSION);

  // attach the facade safely
  if (!safeSetValue(AP, "AutoPrompterCore", coreFacade)) {
    // last resort: define a configurable accessor
    tryDefineGetter(AP, "AutoPrompterCore", () => coreFacade);
  }

  // Canonical convenience aliases (expose as accessors to avoid overwrites)
  tryDefineGetter(AP, "start", () => start);
  tryDefineGetter(AP, "stop", () => stop);

  // Soft dependency check (logs but does not hard-fail)
  try {
    if (AP.coreDeps && typeof AP.coreDeps.ensureDeps === "function") {
      const ok = AP.coreDeps.ensureDeps();
      cp("core:index:deps-check", {
        ok,
        missing: AP.coreDeps.listMissing?.() || [],
      });
    }
  } catch (e) {
    (L.warn || L.log).call(L, "[AP core] deps check failed:", e);
  }

  // Boot breadcrumb
  cp("core:index:ready", {
    version: VERSION,
    start: typeof start === "function",
    stop: typeof stop === "function",
    run: typeof run === "function",
  });
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/runtime/index.js");

/* ===== core/runtime/index.js ===== */
(function(){var __AP_MOD="/core/runtime/index.js";try{
// ./auto-prompter/core/runtime/index.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push("core/runtime/index.js");
  } catch {}

  // Ensure submodules exist (do not touch AP.AutoPrompterCore itself).
  AP.coreState = AP.coreState || {};
  AP.coreDeps = AP.coreDeps || {};
  AP.corePanel = AP.corePanel || {};
  AP.coreRun = AP.coreRun || {};
  AP.coreStart = AP.coreStart || {};
  AP.coreEvents = AP.coreEvents || {};

  // ---- Prompt readiness helpers ------------------------------------------------

  function hasParser() {
    return !!(
      AP.promptParser &&
      typeof AP.promptParser.parse === "function" &&
      !AP.promptParser.__isStub
    );
  }
  function hasEngine() {
    return !!(
      AP.promptEngine &&
      typeof AP.promptEngine.runAll === "function" &&
      !AP.promptEngine.__isStub
    );
  }
  function hasStubEngine() {
    return !!(AP.promptEngine && typeof AP.promptEngine.runAll === "function");
  }
  function promptReady(strict = true) {
    // strict=true => require real (non-stub) engine+parser.
    // strict=false => allow stub engine so controls never see "missing executor".
    const parserOK = hasParser();
    const engineOK = strict ? hasEngine() : hasStubEngine();
    return parserOK && engineOK;
  }

  /**
   * Wait until the prompt parser + engine are available before signaling core-ready.
   * We resolve early if a stub engine exists to avoid "missing executor" fallbacks.
   */
  function whenPromptReady({ onReady, timeoutMs = 5000 }) {
    let done = false;
    const start = Date.now();

    const fire = (reason) => {
      if (done) return;
      done = true;
      try {
        AP.boot?.cp?.("runtime:index:prompt-ready", {
          parser: hasParser(),
          engine: hasEngine(),
          stubEngine: hasStubEngine(),
          reason,
        });
      } catch {}
      try {
        onReady && onReady();
      } catch {}
    };

    // Fast-path
    if (promptReady(false)) return fire("immediate");

    // Also listen for explicit prompt readiness signals.
    try {
      const onEvt = () => {
        if (promptReady(false)) fire("event");
      };
      window.addEventListener("ap:prompt:parser:ready", onEvt, { once: true });
      window.addEventListener("ap:prompt:engine:ready", onEvt, { once: true });
    } catch {}

    // Poll as a fallback (covers environments without our events).
    (function tick() {
      if (done) return;
      if (promptReady(false)) return fire("poll");
      if (Date.now() - start >= timeoutMs) return fire("timeout");
      setTimeout(tick, 25);
    })();

    try {
      AP.boot?.cp?.("runtime:index:prompt-wait", { timeoutMs });
    } catch {}
  }

  // -----------------------------------------------------------------------------

  let coreReadySent = false;
  function announceCoreReady(flags) {
    if (coreReadySent) return;
    coreReadySent = true;
    try {
      // Announce readiness for gates that listen.
      if (flags?.hasStart) {
        window.dispatchEvent(new CustomEvent("ap:core-ready"));
      }
    } catch {}
    try {
      AP.boot?.cp?.("runtime:index:ready", flags || {});
    } catch {}
  }

  function wire() {
    const Core = AP.AutoPrompterCore;
    if (!Core) return false;

    // Prefer facade methods; fall back to legacy surfaces.
    const start =
      typeof Core.start === "function" ? Core.start : AP.coreStart.start;
    const stop = typeof Core.stop === "function" ? Core.stop : AP.coreRun.stop;
    const run = typeof Core.run === "function" ? Core.run : AP.coreRun.run;

    // Bridge (no-throw)
    try {
      AP.coreEvents.wireFacadeBridge &&
        AP.coreEvents.wireFacadeBridge(start, stop);
    } catch {}

    // Convenience aliases on AP (allowed to assign).
    try {
      if (!AP.start && typeof start === "function") AP.start = start;
    } catch {}
    try {
      if (!AP.stop && typeof stop === "function") AP.stop = stop;
    } catch {}

    // Wait for prompt runtime before we tell the world core is ready.
    whenPromptReady({
      onReady: () =>
        announceCoreReady({
          hasStart: typeof start === "function",
          hasStop: typeof stop === "function",
          hasRun: typeof run === "function",
        }),
      timeoutMs: 5000,
    });

    return true;
  }

  // Wire immediately if facade is present; otherwise wait for it.
  if (!wire()) {
    try {
      window.addEventListener(
        "ap:core-ready",
        () => {
          try {
            wire();
          } catch {}
        },
        { once: true }
      );
    } catch {}
  }
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/utils.js");

/* ===== core/sanity/utils.js ===== */
(function(){var __AP_MOD="/core/sanity/utils.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/utils.js
(function () {
  "use strict";
  const ns = (window.AutoPrompter = window.AutoPrompter || {});
  ns.sanity = ns.sanity || {};
  ns.sanity.utils = ns.sanity.utils || {};
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/facade.js");

/* ===== core/sanity/facade.js ===== */
(function(){var __AP_MOD="/core/sanity/facade.js";try{
// ./auto-prompter/userscript/index/facade.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/userscript/index/facade.js"
    );
  } catch {}
  // Logger with context
  const base = AP.logger?.with
    ? AP.logger.with({ component: "index", file: "facade.js" })
    : console;
  const L = {
    debug: (...a) => (base.debug || base.log).apply(base, a),
    info: (...a) => (base.info || base.log).apply(base, a),
    warn: (...a) => (base.warn || base.log).apply(base, a),
    error: (...a) => (base.error || base.log).apply(base, a),
  };
  // Public surfaces (idempotent — do not overwrite existing objects)
  AP.domUtils = AP.domUtils || {};
  AP.domQuery = AP.domQuery || {};
  AP.detectSelectors = AP.detectSelectors || {};
  AP.composer = AP.composer || {};
  AP.composerDetect = AP.composerDetect || {};
  AP.senders = AP.senders || {};
  AP.compose = AP.compose || {};
  AP.startGate = AP.startGate || {};
  AP.navWatch = AP.navWatch || {};
  AP.promptEngine = AP.promptEngine || {};
  AP.promptParser = AP.promptParser || {};
  AP.uiPanel = AP.uiPanel || {};
  AP.mountPoint = AP.mountPoint || {};
  AP.idleWait = AP.idleWait || {};
  AP.sanity = AP.sanity || {};
  // Legacy facades (non-breaking convenience)
  AP.engine = AP.promptEngine || {};
  AP.detect = AP.composerDetect || {};
  AP.io = (function () {
    const senders = AP.senders || {};
    const waiters = AP.waiters || {};
    const waitUntilIdle = AP.idleWait?.waitUntilIdle || null;
    return { ...senders, waiters, waitUntilIdle };
  })();
  AP.ui = {
    panel: AP.uiPanel || {},
    position: AP.uiPosition || {},
    dom: AP.dom || {},
  };
  AP.prompt = {
    parse: AP.promptParser?.parse || (() => []),
    renderText:
      (AP.renderers && AP.renderers.renderText) || ((t) => String(t || "")),
  };
  AP.util = { logger: AP.logger || console, backoff: AP._logBackoff || {} };
  // Boot state (ensure cp exists via boot-core-helpers or create a minimal one)
  AP.boot = AP.boot || {
    id:
      Math.random().toString(36).slice(2, 6) +
      "-" +
      (Date.now() % 1e6).toString(36),
    startedAt: Date.now(),
    trace: [],
  };
  if (typeof AP.boot.cp !== "function") {
    AP.boot.cp = function (name, extra) {
      const t = Date.now();
      const row = {
        t,
        dt: t - (AP.boot.trace[0]?.t || AP.boot.startedAt),
        name: String(name || ""),
        ...(extra || {}),
      };
      AP.boot.trace.push(row);
      try {
        (AP.logger || console).info("[AP][boot] cp:", row.name, extra || "");
      } catch {}
      try {
        window.dispatchEvent(new CustomEvent("ap:boot-cp", { detail: row }));
      } catch {}
      return row;
    };
  }
  AP.__apMainFacadeReady = true;
  L.info("[AP index] facade ready");
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/checks.js");

/* ===== core/sanity/checks.js ===== */
(function(){var __AP_MOD="/core/sanity/checks.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/checks.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.sanity = AP.sanity || {};
  const U = (AP.sanity.utils = AP.sanity.utils || {});
  const reg = AP.sanity.register || function () {};

  function okType(path, type) {
    return U.typeAt ? U.typeAt(path) === type : typeof U.get?.(path) === type;
  }

  reg(() => {
    const ok = okType("AutoPrompter", "object");
    return {
      id: "namespace:AutoPrompter",
      ok,
      info: U.typeAt?.("AutoPrompter"),
    };
  }, 100);

  reg(() => {
    const ok =
      okType("AutoPrompter.waiters.waitForVisible", "function") &&
      okType("AutoPrompter.idleWait.waitUntilIdle", "function");
    return {
      id: "io:waiters+idle",
      ok,
      info:
        (U.typeAt?.("AutoPrompter.waiters.waitForVisible") || "") +
        "," +
        (U.typeAt?.("AutoPrompter.idleWait.waitUntilIdle") || ""),
    };
  }, 90);

  reg(() => {
    const ok =
      okType("AutoPrompter.io.waitUntilIdle", "function") &&
      okType("AutoPrompter.io.value.setValue", "function") &&
      okType("AutoPrompter.io.value.getValue", "function");
    return {
      id: "io:index:value",
      ok,
      info:
        (U.typeAt?.("AutoPrompter.io.waitUntilIdle") || "") +
        ", value.set=" +
        (U.typeAt?.("AutoPrompter.io.value.setValue") || "") +
        ", value.get=" +
        (U.typeAt?.("AutoPrompter.io.value.getValue") || ""),
    };
  }, 85);

  reg(() => {
    const ok =
      okType("AutoPrompter.io.compose.compose", "function") ||
      okType("AutoPrompter.compose.composeAndSend", "function");
    return {
      id: "io:compose",
      ok,
      info:
        "compose=" +
        (U.typeAt?.("AutoPrompter.io.compose.compose") || "") +
        ", composeAndSend=" +
        (U.typeAt?.("AutoPrompter.compose.composeAndSend") || ""),
    };
  }, 80);

  reg(() => {
    const ok =
      okType("AutoPrompter.submitEnter.press", "function") ||
      okType("AutoPrompter.io.submit.submit", "function");
    return {
      id: "io:submit",
      ok,
      info:
        "submit.enter=" +
        (U.typeAt?.("AutoPrompter.submitEnter.press") || "") +
        ", io.submit=" +
        (U.typeAt?.("AutoPrompter.io.submit.submit") || ""),
    };
  }, 78);

  reg(() => {
    const ok =
      okType("AutoPrompter.promptParser.parse", "function") &&
      okType("AutoPrompter.promptEngine.runAll", "function");
    return {
      id: "prompt:parser+engine",
      ok,
      info:
        "parse=" +
        (U.typeAt?.("AutoPrompter.promptParser.parse") || "") +
        ", runAll=" +
        (U.typeAt?.("AutoPrompter.promptEngine.runAll") || ""),
    };
  }, 75);

  reg(() => {
    const ok = okType("AutoPrompter.AutoPrompterCore.start", "function");
    return {
      id: "core:start",
      ok,
      info: U.typeAt?.("AutoPrompter.AutoPrompterCore.start"),
    };
  }, 70);

  reg(() => {
    const ok = okType("AutoPrompter.uiPanel.createPanel", "function");
    return {
      id: "ui:panel",
      ok,
      info: U.typeAt?.("AutoPrompter.uiPanel.createPanel"),
    };
  }, 60);

  try {
    AP.boot?.cp?.("sanity:checks:ready");
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity/index.js");

/* ===== core/sanity/index.js ===== */
(function(){var __AP_MOD="/core/sanity/index.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity/index.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  AP.sanity = AP.sanity || {};

  if (AP.__sanityIndexReady) {
    try {
      AP.boot?.cp?.("sanity:index:ready:noop");
    } catch {}
    return;
  }
  AP.__sanityIndexReady = true;

  AP.versions = AP.versions || {};
  AP.versions.sanity = "1.0.0";

  // Public surface
  AP.sanity = {
    utils: AP.sanity.utils || {},
    register: AP.sanity.register,
    requestCoreFns: AP.sanity.requestCoreFns,
    run: AP.sanity.run,
    version: AP.versions.sanity,
  };

  try {
    AP.boot?.cp?.("sanity:index:ready", { version: AP.versions.sanity });
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();

;window.__AP_LOAD=(window.__AP_LOAD||[]);window.__AP_LOAD.push("core/sanity.js");

/* ===== core/sanity.js ===== */
(function(){var __AP_MOD="/core/sanity.js";try{
// /usr/local/bin/node
// ./auto-prompter/core/sanity.js
(function () {
  "use strict";
  const AP = (window.AutoPrompter = window.AutoPrompter || {});
  // Back-compat shim: expose window.AP.sanityRun -> AutoPrompter.sanity.run
  try {
    window.AP = window.AP || {};
    if (typeof window.AP.sanityRun !== "function") {
      window.AP.sanityRun = () => AP.sanity?.run?.();
    }
  } catch {}
  try {
    AP.boot?.cp?.("sanity:shim:ready");
  } catch {}
})();

}catch(e){try{console.warn("[AP][bundle] module error:", __AP_MOD, e && e.message ? e.message : e);(window.__AP_MODULE_ERRORS = window.__AP_MODULE_ERRORS || []).push({file:__AP_MOD, err:String(e && e.message ? e.message : e)});}catch(_){} }})();


/* ===== entry(main) ===== */
// /usr/local/bin/node
// ./auto-prompter/main.user.js


/* --- Additional coverage requires (auto-generated from repo dump v4.2.0) --- */
/* Keep to paths that exist; avoid CommonJS loaders and wrong runtime/ui/devtools/adapters paths. */

/* Devtools & telemetry (already covered above, keep here if you want extra ordering checks) */
/* @require      /core/devtools/logger.js */
/* @require      /core/devtools/loggerFacade.js */
/* @require      /core/devtools/trace.js */
/* @require      /core/devtools/noise/dom.js */
/* @require      /core/devtools/noise/index.js */
/* @require      /core/devtools/noiseStubs.js */
/* @require      /core/devtools/panelFallback.js */
/* @require      /core/devtools/telemetry/loader.telemetry.js */
/* @require      /core/devtools/telemetry/nav.boot.telemetry.js */

/* Detect (select pieces for coverage) */
/* @require      /core/detect/core/config/config.js */
/* @require      /core/detect/core/debug/debug.js */
/* @require      /core/detect/core/find/explicitSelectors.js */
/* @require      /core/detect/core/find/findComposer.js */
/* @require      /core/detect/core/find/scanLoop.js */
/* @require      /core/detect/core/hints/hints.js */
/* @require      /core/detect/core/probe/fallback/probeFallback.js */
/* @require      /core/detect/core/probe/resolve/resolve.js */
/* @require      /core/detect/core/probe/try/tryOnce.js */
/* @require      /core/detect/core/probe/util/firstMatch.js */
/* @require      /core/detect/core/probe/util/heuristics.js */
/* @require      /core/detect/core/probe/util/nearInput.js */
/* @require      /core/detect/core/probe/util/visibility.js */
/* @require      /core/detect/core/registry/try.js */
/* @require      /core/detect/core/roots/scan.js */
/* @require      /core/detect/core/sanity/sanity.js */
/* @require      /core/detect/core/waiters/waiters.js */
/* @require      /core/detect/flags.js */
/* @require      /core/detect/helpers.js */
/* @require      /core/detect/index.js */
/* @require      /core/detect/probe.js */
/* @require      /core/detect/roots.js */
/* @require      /core/detect/selectors.js */
/* @require      /core/detect/shim/flags.js */
/* @require      /core/detect/shim/helpers.js */
/* @require      /core/detect/shim/index.js */
/* @require      /core/detect/shim/probe.js */

/* Engine (select — keep explicit parts, no CommonJS index) */
/* @require      /core/engine/context.js */
/* @require      /core/engine/retries.js */
/* @require      /core/engine/steps.execute.js */
/* @require      /core/engine/steps.findComposer.js */
/* @require      /core/engine/steps.handlers.basic.js */
/* @require      /core/engine/steps.handlers.msg.js */
/* @require      /core/engine/steps.js */

/* Events & lib DOM */
/* @require      /core/events.js */
/* @require      /core/lib/dom/domFacade.js */
/* @require      /core/lib/dom/utils.js */

/* Runtime boot/nav (select) */
/* @require      /core/runtime/boot/loader/apload.js */
/* @require      /core/runtime/boot/loader/flags.js */
/* @require      /core/runtime/boot/loader/probe.js */
/* @require      /core/runtime/boot/loader/sanity.js */
/* @require      /core/runtime/boot/loader/startCore.js */
/* @require      /core/runtime/boot/loader/util.js */
/* @require      /core/runtime/boot/mountPoint.js */
/* @require      /core/runtime/boot/nav/boot/computeFlags.js */
/* @require      /core/runtime/boot/nav/boot/guards.js */
/* @require      /core/devtools/telemetry/nav.boot.telemetry.js */
/* @require      /core/runtime/boot/nav/boot/index.js */
/* @require      /core/runtime/boot/nav/boot/install.js */
/* @require      /core/runtime/boot/nav/boot/interval.js */
/* @require      /core/runtime/boot/nav/boot/longtask.js */
/* @require      /core/runtime/boot/nav/boot/ready.js */
/* @require      /core/runtime/boot/nav/boot/schedulers.js */
/* @require      /core/runtime/boot/nav/boot/start.js */
/* @require      /core/runtime/boot/nav/boot/strategy.js */
/* @require      /core/runtime/boot/nav/boot/watchdog.js */
/* @require      /core/runtime/boot/nav/flags.js */
/* @require      /core/runtime/boot/nav/hooks.js */
/* @require      /core/runtime/boot/nav/hooks/history.js */
/* @require      /core/runtime/boot/nav/hooks/index.js */
/* @require      /core/runtime/boot/nav/hooks/interval.js */
/* @require      /core/runtime/boot/nav/hooks/mutation.js */
/* @require      /core/runtime/boot/nav/index.js */
/* @require      /core/runtime/boot/nav/route.js */
/* @require      /core/runtime/boot/nav/route/changed.js */
/* @require      /core/runtime/boot/nav/route/index.js */
/* @require      /core/runtime/boot/nav/route/schedule.js */
/* @require      /core/runtime/boot/nav/scheduler.js */
/* @require      /core/runtime/boot/nav/state.js */
/* @require      /core/runtime/boot/nav/utils.js */
/* @require      /core/runtime/boot/nav/utils/dom.js */
/* @require      /core/runtime/boot/nav/utils/index.js */
/* @require      /core/runtime/boot/nav/utils/log.js */
/* @require      /core/runtime/boot/nav/utils/time.js */
/* @require      /core/runtime/boot/navWatch.js */
/* @require      /core/runtime/boot/run.js */
/* @require      /core/runtime/boot/start.js */
/* @require      /core/runtime/boot/startGate.js */
/* @require      /core/runtime/boot/state.js */

/* Runtime composer (select) */
/* @require      /core/runtime/composer/bootstrap.js */
/* @require      /core/runtime/composer/cache.js */
/* @require      /core/runtime/composer/core/index.js */
/* @require      /core/runtime/composer/core/watcher.js */
/* @require      /core/runtime/composer/probe-shim.js */
/* @require      /core/detect/index.js */

/* Runtime core/index */
/* @require      /core/runtime/core/deps.js */
/* @require      /core/runtime/core/index.js */
/* @require      /core/runtime/index.js */

/* IO (select, no CommonJS aggregators) */
/* @require      /core/runtime/io/compose.js */
/* @require      /core/runtime/io/idle.js */
/* @require      /core/runtime/io/index.js */
/* @require      /core/runtime/io/submit/button.js */
/* @require      /core/runtime/io/submit/enter.js */
/* @require      /core/runtime/io/submit/form.js */
/* @require      /core/runtime/io/value.js */
/* (removed: /core/runtime/io/value/ce/index.js — uses require) */
/* @require      /core/runtime/io/value/contentEditable.js */
/* @require      /core/runtime/io/value/standardInput.js */
/* @require      /core/runtime/io/waiters.js */
/* plugin CE writers */
/* @require      /core/plugins/ce-writers/focus.js */
/* @require      /core/plugins/ce-writers/insertBeforeInput.js */
/* @require      /core/plugins/ce-writers/insertByHTML.js */
/* @require      /core/plugins/ce-writers/insertExecCommand.js */
/* @require      /core/plugins/ce-writers/insertPaste.js */

/* Prompt, UI (top-level core/ui) */
/* @require      /core/runtime/prompt/engine.js */
/* @require      /core/runtime/prompt/parser.js */
/* @require      /core/ui/dom/attrs.js */
/* @require      /core/ui/dom/el.js */
/* @require      /core/ui/dom/index.js */
/* @require      /core/ui/dom/query.js */
/* @require      /core/ui/dom/shadow.js */
/* @require      /core/ui/dom/styles.js */
/* @require      /core/ui/dom/utils.js */
/* @require      /core/ui/dom/waitForSelector.js */
/* @require      /core/ui/index.js */
/* @require      /core/ui/panel.js */
/* @require      /core/ui/position.js */
/* @require      /core/ui/positionFallback.js */

/* Sanity (no _loadAll) */
/* @require      /core/sanity.js */
/* @require      /core/sanity/checks.js */
/* @require      /core/sanity/checks/bundle.js */
/* @require      /core/sanity/checks/cache.js */
/* @require      /core/sanity/checks/composer.js */
/* @require      /core/sanity/checks/core_ready.js */
/* @require      /core/sanity/checks/environment.js */
/* @require      /core/sanity/checks/flags.js */
/* @require      /core/sanity/checks/order.js */
/* @require      /core/sanity/checks/selectors.js */
/* @require      /core/sanity/checks/self.js */
/* @require      /core/sanity/checks/userscript.js */
/* @require      /core/sanity/facade.js */
/* @require      /core/sanity/helpers.js */
/* @require      /core/sanity/index.js */
/* @require      /core/sanity/report.js */
/* @require      /core/sanity/reporters/banner.js */
/* @require      /core/sanity/reporters/console.js */
/* @require      /core/sanity/reporters/html.js */
/* @require      /core/sanity/reporters/telemetry.js */
/* @require      /core/sanity/sanity_core/bootstrap.js */
/* @require      /core/sanity/sanity_core/index.js */
/* @require      /core/sanity/sanity_core/registry.js */
/* @require      /core/sanity/sanity_core/runner.js */
/* @require      /core/sanity/utils.js */
/* @require      /core/sanity/utils/bootstrap/boot.js */
/* @require      /core/sanity/utils/bootstrap/core-ready.js */
/* @require      /core/sanity/utils/config/config.js */
/* @require      /core/sanity/utils/config/explain.js */
/* @require      /core/sanity/utils/config/paths.js */
/* @require      /core/sanity/utils/core/base.js */
/* @require      /core/sanity/utils/core/time.js */
/* @require      /core/sanity/utils/core/utils.js */
/* @require      /core/sanity/utils/diagnostics/csp.js */
/* @require      /core/sanity/utils/diagnostics/errors.js */
/* @require      /core/sanity/utils/diagnostics/perf.js */
/* @require      /core/sanity/utils/diagnostics/selftest.js */
/* @require      /core/sanity/utils/registry/checks-registry.js */
/* @require      /core/sanity/utils/telemetry/bk.js */
/* @require      /core/sanity/utils/telemetry/heartbeat.js */
/* @require      /core/sanity/utils/telemetry/lifecycle.js */
/* @require      /core/sanity/utils/telemetry/network-memory.js */
/* @require      /core/sanity/utils/telemetry/print.js */
/* @require      /core/sanity/utils/telemetry/report.js */
/* @require      /core/sanity/utils/telemetry/sink.js */
/* @require      /core/sanity/utils/telemetry/snapshot.js */
/* @require      /core/sanity/utils/ux/breadcrumbs.js */
/* @require      /core/sanity/utils/ux/toast.js */

/* --- end Additional coverage requires --- */

/* one-line entry marker for diagnostics */
(function () {
  try {
    (window.__AP_LOAD = window.__AP_LOAD || []).push(
      "auto-prompter/main.user.js"
    );
  } catch (_) {}
})();

/* ===== AP BUNDLE META ===== */
;(function(){
  try {
    var meta = {"ok":true,"entry":"auto-prompter/main.user.js","wants_count":318,"wants_deduped":318,"files_count":318,"bytes":766209,"ms":62,"missing":[],"tail":["core/sanity/utils/telemetry/report.js","core/sanity/utils/telemetry/sink.js","core/sanity/utils/telemetry/snapshot.js","core/sanity/utils/ux/breadcrumbs.js","core/sanity/utils/ux/toast.js","core/runtime/core/index.js","core/runtime/index.js","core/sanity/utils.js","core/sanity/facade.js","core/sanity/checks.js","core/sanity/index.js","core/sanity.js"],"dupes":["/core/detect/index.js","/core/devtools/logger.js","/core/devtools/loggerFacade.js","/core/devtools/trace.js","/core/devtools/noise/dom.js","/core/devtools/noise/index.js","/core/devtools/noiseStubs.js","/core/devtools/panelFallback.js","/core/devtools/telemetry/loader.telemetry.js","/core/devtools/telemetry/nav.boot.telemetry.js","/core/detect/core/config/config.js","/core/detect/core/find/explicitSelectors.js","/core/detect/core/find/findComposer.js","/core/detect/core/find/scanLoop.js","/core/detect/core/hints/hints.js","/core/detect/core/probe/fallback/probeFallback.js","/core/detect/core/probe/resolve/resolve.js","/core/detect/core/probe/try/tryOnce.js","/core/detect/core/probe/util/firstMatch.js","/core/detect/core/probe/util/heuristics.js","/core/detect/core/probe/util/nearInput.js","/core/detect/core/probe/util/visibility.js","/core/detect/core/roots/scan.js","/core/detect/core/sanity/sanity.js","/core/detect/core/waiters/waiters.js","/core/detect/flags.js","/core/detect/helpers.js","/core/detect/index.js","/core/detect/probe.js","/core/detect/roots.js","/core/detect/selectors.js","/core/detect/shim/flags.js","/core/detect/shim/helpers.js","/core/detect/shim/index.js","/core/detect/shim/probe.js","/core/engine/context.js","/core/engine/retries.js","/core/engine/steps.execute.js","/core/engine/steps.handlers.basic.js","/core/engine/steps.handlers.msg.js","/core/engine/steps.js","/core/events.js","/core/lib/dom/domFacade.js","/core/lib/dom/utils.js","/core/runtime/boot/loader/apload.js","/core/runtime/boot/loader/flags.js","/core/runtime/boot/loader/probe.js","/core/runtime/boot/loader/sanity.js","/core/runtime/boot/loader/startCore.js","/core/runtime/boot/loader/util.js","/core/runtime/boot/mountPoint.js","/core/runtime/boot/nav/boot/computeFlags.js","/core/runtime/boot/nav/boot/guards.js","/core/devtools/telemetry/nav.boot.telemetry.js","/core/runtime/boot/nav/boot/index.js","/core/runtime/boot/nav/boot/install.js","/core/runtime/boot/nav/boot/interval.js","/core/runtime/boot/nav/boot/longtask.js","/core/runtime/boot/nav/boot/ready.js","/core/runtime/boot/nav/boot/schedulers.js","/core/runtime/boot/nav/boot/start.js","/core/runtime/boot/nav/boot/strategy.js","/core/runtime/boot/nav/boot/watchdog.js","/core/runtime/boot/nav/flags.js","/core/runtime/boot/nav/hooks.js","/core/runtime/boot/nav/hooks/history.js","/core/runtime/boot/nav/hooks/index.js","/core/runtime/boot/nav/hooks/interval.js","/core/runtime/boot/nav/hooks/mutation.js","/core/runtime/boot/nav/index.js","/core/runtime/boot/nav/route.js","/core/runtime/boot/nav/route/changed.js","/core/runtime/boot/nav/route/index.js","/core/runtime/boot/nav/route/schedule.js","/core/runtime/boot/nav/scheduler.js","/core/runtime/boot/nav/state.js","/core/runtime/boot/nav/utils.js","/core/runtime/boot/nav/utils/dom.js","/core/runtime/boot/nav/utils/index.js","/core/runtime/boot/nav/utils/log.js","/core/runtime/boot/nav/utils/time.js","/core/runtime/boot/navWatch.js","/core/runtime/boot/run.js","/core/runtime/boot/start.js","/core/runtime/boot/startGate.js","/core/runtime/boot/state.js","/core/runtime/composer/bootstrap.js","/core/runtime/composer/cache.js","/core/runtime/composer/core/watcher.js","/core/runtime/composer/probe-shim.js","/core/detect/index.js","/core/runtime/core/deps.js","/core/runtime/core/index.js","/core/runtime/index.js","/core/runtime/io/compose.js","/core/runtime/io/idle.js","/core/runtime/io/index.js","/core/runtime/io/submit/button.js","/core/runtime/io/submit/enter.js","/core/runtime/io/submit/form.js","/core/runtime/io/value.js","/core/runtime/io/value/contentEditable.js","/core/runtime/io/value/standardInput.js","/core/runtime/io/waiters.js","/core/plugins/ce-writers/focus.js","/core/plugins/ce-writers/insertBeforeInput.js","/core/plugins/ce-writers/insertByHTML.js","/core/plugins/ce-writers/insertExecCommand.js","/core/plugins/ce-writers/insertPaste.js","/core/runtime/prompt/engine.js","/core/runtime/prompt/parser.js","/core/ui/dom/attrs.js","/core/ui/dom/el.js","/core/ui/dom/index.js","/core/ui/dom/query.js","/core/ui/dom/shadow.js","/core/ui/dom/styles.js","/core/ui/dom/utils.js","/core/ui/dom/waitForSelector.js","/core/ui/index.js","/core/ui/panel.js","/core/ui/position.js","/core/ui/positionFallback.js"],"dupeBases":[],"criticalMissing":[],"debug":false,"min_expected":10,"files":["logging/core/checkpoint.js","logging/core/constants.js","logging/core/utils.js","logging/core/sinkbus.js","logging/core/emit.js","logging/logger/index.js","logging/logger.js","core/runtime/prompt/parser.js","core/runtime/prompt/engine.js","logging/mirrorSink.js","logging/uiPosition.js","logging/uiPanel.js","auto-prompter/public/static/repo_dump.js","auto-prompter/userscript/boot-core-helpers.js","auto-prompter/userscript/runtime-pickers.js","auto-prompter/userscript/index/facade.js","auto-prompter/userscript/index/composer-bridge.js","auto-prompter/userscript/index/whenReady.js","auto-prompter/userscript/index/startGateEnhance.js","auto-prompter/userscript/index/bootChecklist.js","auto-prompter/userscript/index/openBootTrace.js","auto-prompter/userscript/index/boot.js","auto-prompter/userscript/dictation/util.js","auto-prompter/userscript/dictation/constants.js","auto-prompter/userscript/dictation/events.js","auto-prompter/userscript/dictation/mic.js","auto-prompter/userscript/dictation/capture.js","auto-prompter/userscript/dictation/index.js","auto-prompter/userscript/glue/boot.js","auto-prompter/userscript/glue/bridges.js","auto-prompter/userscript/glue/shared-utils.js","auto-prompter/userscript/glue/compose-strict.js","auto-prompter/userscript/glue/gate-helpers.js","auto-prompter/userscript/glue/dictation-logger.js","auto-prompter/userscript/glue/dictation-config.js","auto-prompter/userscript/glue/dictation-session.js","auto-prompter/userscript/glue/dictation-dom.js","auto-prompter/userscript/glue/dictation-hooks.js","auto-prompter/userscript/glue/dictation-finalize.js","auto-prompter/userscript/glue/dictation-fallback.js","auto-prompter/userscript/glue/dictation-events.js","auto-prompter/userscript/glue/dictation-accept.js","auto-prompter/userscript/glue/dictation-compose.js","auto-prompter/userscript/glue/dictation-guard.js","auto-prompter/userscript/glue/dictation-site-watchers.js","auto-prompter/userscript/glue/dictation-selftest.js","auto-prompter/userscript/glue/dictation-api.js","auto-prompter/userscript/glue/dictation-glue.js","auto-prompter/userscript/glue/dictation.js","auto-prompter/userscript/glue/dev.js","auto-prompter/userscript/glue/prompt-parser-fallback.js","auto-prompter/utils/dom.js","auto-prompter/utils/config/constants.js","auto-prompter/utils/config/storage.js","auto-prompter/utils/config/templates.js","auto-prompter/utils/config/profiles.js","auto-prompter/utils/config/index.js","auto-prompter/ui/position/storage.js","auto-prompter/ui/position/geometry.js","auto-prompter/ui/position/apply.js","auto-prompter/ui/position/drag.js","auto-prompter/ui/position/keyboard.js","auto-prompter/ui/position/index.js","auto-prompter/ui/theme.js","auto-prompter/ui/panel/layout/mount.js","auto-prompter/ui/panel/layout/markup.js","auto-prompter/ui/panel/layout/toggle.js","auto-prompter/ui/panel/layout/keyboard.js","auto-prompter/ui/panel/layout/dock.js","auto-prompter/ui/panel/layout/debug.js","auto-prompter/ui/panel/layout/index.js","auto-prompter/ui/panel/tabs.js","auto-prompter/ui/panel/controls/safe.js","auto-prompter/ui/panel/controls/repeats.js","auto-prompter/ui/panel/controls/steps/styles.js","auto-prompter/ui/panel/controls/steps/row.js","auto-prompter/ui/panel/controls/ui.js","auto-prompter/ui/panel/controls/scheduler.js","auto-prompter/ui/panel/controls/form.js","auto-prompter/ui/panel/controls/buttons.js","auto-prompter/ui/panel/controls/bind.js","auto-prompter/ui/panel/controls/index.js","auto-prompter/ui/panel/profiles.js","auto-prompter/ui/panel/templates.js","auto-prompter/ui/panel.log.js","auto-prompter/ui/panel.js","auto-prompter/ui/dev/boot.js","auto-prompter/userscript/autoload.js","auto-prompter/userscript/boot.js","auto-prompter/userscript/glue/dictation-auto-reopen.js","auto-prompter/userscript/entry.js","auto-prompter/userscript/orchestrator.js","auto-prompter/userscript/probe.js","auto-prompter/userscript/repoDump.js","auto-prompter/userscript/sanity.js","auto-prompter/userscript/tryStart.js","auto-prompter/userscript/version.js","auto-prompter/userscript/bootstrap/guard.js","auto-prompter/userscript/bootstrap/start.js","auto-prompter/userscript/manifest/helpers.js","auto-prompter/userscript/manifest/parts.boot-loader.js","auto-prompter/userscript/manifest/parts.core-boot.js","auto-prompter/userscript/manifest/parts.logging-core.js","auto-prompter/userscript/manifest/parts.logging.js","auto-prompter/userscript/manifest/parts.nav-boot.js","auto-prompter/userscript/manifest/parts.nav-facades.js","auto-prompter/userscript/manifest/parts.nav-hooks.js","auto-prompter/userscript/manifest/parts.nav-route.js","auto-prompter/userscript/manifest/parts.nav-utils.js","auto-prompter/userscript/manifest/parts.sanity.js","auto-prompter/userscript/manifest/parts.ui-panel.js","auto-prompter/userscript/manifest/parts.ui-position.js","auto-prompter/userscript/manifest/parts.userscript.js","auto-prompter/userscript/manifest/parts.utils-config.js","logging/boot-shims.js","core/detect/selectors.js","core/detect/flags.js","core/detect/helpers.js","core/detect/roots.js","core/detect/core/config/config.js","core/detect/core/probe/util/visibility.js","core/detect/core/probe/util/firstMatch.js","core/detect/core/probe/util/heuristics.js","core/detect/core/probe/util/nearInput.js","core/detect/core/probe/try/tryOnce.js","core/detect/core/probe/fallback/probeFallback.js","core/detect/core/probe/resolve/resolve.js","core/detect/core/roots/scan.js","core/detect/core/find/explicitSelectors.js","core/detect/core/find/scanLoop.js","core/detect/core/find/findComposer.js","core/detect/core/hints/hints.js","core/detect/core/waiters/waiters.js","core/detect/core/sanity/sanity.js","core/detect/probe.js","core/detect/index.js","core/detect/shim/flags.js","core/detect/shim/helpers.js","core/detect/shim/index.js","core/detect/shim/probe.js","core/engine/context.js","core/engine/retries.js","core/engine/find/global-proxy.js","core/engine/find/utils.js","core/engine/find/utils.dictate.js","core/engine/find/probe.js","core/engine/find/allow.js","core/engine/find/once.js","core/engine/find/orFail.js","core/engine/find/index.js","core/engine/steps.execute.js","core/engine/steps.handlers.basic.js","core/engine/msg/utils.js","core/engine/msg/context.js","core/engine/idle/constants.js","core/engine/idle/dom.js","core/engine/idle/state.js","core/engine/idle/observer.js","core/engine/idle/waitUntilIdle.js","core/engine/msg/deps.js","core/engine/msg/helpers.focus.js","core/engine/msg/helpers.prime.js","core/engine/msg/helpers.refresh.js","core/engine/msg/helpers.sendGate.js","core/engine/msg/handler.js","core/engine/steps.handlers.msg.js","core/engine/steps.js","core/engine/index.js","core/devtools/logger.js","core/devtools/loggerFacade.js","core/devtools/trace.js","core/runtime/shared/flags.js","core/lib/dom/domFacade.js","core/lib/dom/utils.js","core/runtime/core/deps.js","core/runtime/boot/state.js","core/runtime/boot/gate.js","core/runtime/boot/loader.js","core/runtime/boot/loader/apload.js","core/runtime/boot/loader/flags.js","core/runtime/boot/loader/probe.js","core/runtime/boot/loader/sanity.js","core/runtime/boot/loader/startCore.js","core/devtools/telemetry/loader.telemetry.js","core/runtime/boot/loader/util.js","core/runtime/boot/nav/utils/log.js","core/runtime/boot/nav/utils/time.js","core/runtime/boot/nav/utils/dom.js","core/runtime/boot/nav/utils/index.js","core/runtime/boot/nav/flags.js","core/runtime/boot/nav/hooks/history.js","core/runtime/boot/nav/hooks/mutation.js","core/runtime/boot/nav/hooks/interval.js","core/runtime/boot/nav/hooks/index.js","core/runtime/boot/nav/route/changed.js","core/runtime/boot/nav/route/schedule.js","core/runtime/boot/nav/route/index.js","core/runtime/boot/nav/scheduler.js","core/runtime/boot/nav/state.js","core/runtime/boot/nav/boot/computeFlags.js","core/runtime/boot/nav/boot/guards.js","core/runtime/boot/nav/boot/ready.js","core/runtime/boot/nav/boot/watchdog.js","core/devtools/telemetry/nav.boot.telemetry.js","core/runtime/boot/nav/boot/schedulers.js","core/runtime/boot/nav/boot/install.js","core/runtime/boot/nav/boot/interval.js","core/runtime/boot/nav/boot/longtask.js","core/runtime/boot/nav/boot/strategy.js","core/runtime/boot/nav/boot/start.js","core/runtime/boot/nav/boot/index.js","core/runtime/boot/nav/utils.js","core/runtime/boot/nav/route.js","core/runtime/boot/nav/hooks.js","core/runtime/boot/nav/index.js","core/runtime/boot/startGate.js","core/runtime/boot/navWatch.js","core/runtime/boot/core.js","core/runtime/boot/run.js","core/runtime/boot/start.js","core/runtime/boot/mountPoint.js","core/runtime/composer/core/watcher.js","core/runtime/composer/cache.js","core/runtime/composer/probe-shim.js","core/runtime/composer/bootstrap.js","core/adapters/chatgpt/detector.js","core/adapters/chatgpt/patch.js","core/runtime/io/index.js","core/runtime/io/waiters.js","core/runtime/io/idle.js","core/runtime/io/compose.js","core/runtime/io/value.js","core/runtime/io/value/standardInput.js","core/runtime/io/value/contentEditable.js","core/plugins/ce-writers/focus.js","core/plugins/ce-writers/insertBeforeInput.js","core/plugins/ce-writers/insertByHTML.js","core/plugins/ce-writers/insertExecCommand.js","core/plugins/ce-writers/insertPaste.js","core/runtime/io/submit/button.js","core/runtime/io/submit/enter.js","core/runtime/io/submit/form.js","core/ui/dom/attrs.js","core/ui/dom/el.js","core/ui/dom/query.js","core/ui/dom/shadow.js","core/ui/dom/styles.js","core/ui/dom/utils.js","core/ui/dom/waitForSelector.js","core/ui/dom/index.js","core/ui/index.js","core/ui/position.js","core/ui/panel.js","core/ui/positionFallback.js","core/runtime/compat/domWait.proxy.js","core/runtime/compat/startOnce.wrap.js","core/runtime/ap/promptEngine.shim.js","core/runtime/ap/rootIndex.js","core/runtime/ap/index.js","core/devtools/noise/dom.js","core/devtools/noise/index.js","core/devtools/noiseStubs.js","core/devtools/panelFallback.js","core/events.js","core/detect/core/debug/debug.js","core/detect/core/registry/try.js","core/engine/steps.findComposer.js","core/runtime/composer/core/index.js","core/sanity/checks/bundle.js","core/sanity/checks/cache.js","core/sanity/checks/composer.js","core/sanity/checks/core_ready.js","core/sanity/checks/environment.js","core/sanity/checks/flags.js","core/sanity/checks/order.js","core/sanity/checks/selectors.js","core/sanity/checks/self.js","core/sanity/checks/userscript.js","core/sanity/helpers.js","core/sanity/report.js","core/sanity/reporters/banner.js","core/sanity/reporters/console.js","core/sanity/reporters/html.js","core/sanity/reporters/telemetry.js","core/sanity/sanity_core/bootstrap.js","core/sanity/sanity_core/index.js","core/sanity/sanity_core/registry.js","core/sanity/sanity_core/runner.js","core/sanity/utils/bootstrap/boot.js","core/sanity/utils/bootstrap/core-ready.js","core/sanity/utils/config/config.js","core/sanity/utils/config/explain.js","core/sanity/utils/config/paths.js","core/sanity/utils/core/base.js","core/sanity/utils/core/time.js","core/sanity/utils/core/utils.js","core/sanity/utils/diagnostics/csp.js","core/sanity/utils/diagnostics/errors.js","core/sanity/utils/diagnostics/perf.js","core/sanity/utils/diagnostics/selftest.js","core/sanity/utils/registry/checks-registry.js","core/sanity/utils/telemetry/bk.js","core/sanity/utils/telemetry/heartbeat.js","core/sanity/utils/telemetry/lifecycle.js","core/sanity/utils/telemetry/network-memory.js","core/sanity/utils/telemetry/print.js","core/sanity/utils/telemetry/report.js","core/sanity/utils/telemetry/sink.js","core/sanity/utils/telemetry/snapshot.js","core/sanity/utils/ux/breadcrumbs.js","core/sanity/utils/ux/toast.js","core/runtime/core/index.js","core/runtime/index.js","core/sanity/utils.js","core/sanity/facade.js","core/sanity/checks.js","core/sanity/index.js","core/sanity.js"],"server":{"version":"dev","branch":"","commit":"","generatedAt":"2025-10-21T01:13:54.857Z","node":"v23.11.0","pid":61261},"id":"cb602a15e7501945b9ee501f0b8e0454e4328901","files_hash":"b4953a76031615781c2ff2deee1ec9c89b32bffc"};
    window.__AP_BUNDLE_META = meta;
    window.AP = Object.assign(window.AP || {}, { bundleMeta: meta });

    var okMsg = "[AP][bundle] built " + meta.files_count + "/" + meta.wants_count +
                " files in " + meta.ms + "ms (" + meta.bytes + " bytes), id=" + meta.id;
    var isWarn = (meta.missing && meta.missing.length) || (meta.criticalMissing && meta.criticalMissing.length) || (meta.files_count < meta.min_expected);
    (isWarn ? console.warn : console.info).call(console, okMsg);

    if (console.groupCollapsed) console.groupCollapsed("[AP][bundle] details");

    console.info("[AP][bundle] entry:", meta.entry);
    if (typeof meta.wants_deduped === "number") {
      console.info("[AP][bundle] wants:", meta.wants_count, "deduped:", meta.wants_deduped);
    }

    if (console.table) {
      console.table((meta.tail || []).map((p,i)=>({ tail_index:i, path:p })));
    } else {
      console.info("[AP][bundle] tail:", meta.tail);
    }

    if (meta.server) {
      console.info("[AP][bundle] server:", meta.server);
    }

    // Environment snapshot (helps reproduce)
    try {
      console.info("[AP][env] href:", String(location && location.href || ""));
      console.info("[AP][env] readyState:", String(document && document.readyState || ""));
      var wm = (window.__AP_WM || []);
      console.info("[AP][env] watermarks:", wm.length, wm);
    } catch(e){}

    if (meta.dupeBases && meta.dupeBases.length) {
      console.warn("[AP][bundle] cross-alias duplicate bases collapsed:", meta.dupeBases.length);
      if (console.table) console.table(meta.dupeBases);
    }

    if (meta.dupes && meta.dupes.length) {
      console.warn("[AP][bundle] duplicate @require entries (ignored after first):", meta.dupes.length);
      if (console.table) console.table(meta.dupes.map((p,i)=>({i, path:p})));
    }

    if (meta.missing && meta.missing.length) {
      console.warn("[AP][bundle] missing modules (" + meta.missing.length + "):");
      if (console.table) console.table(meta.missing.map((p,i)=>({i, path:p})));
      else console.warn(meta.missing);
    }

    if (meta.criticalMissing && meta.criticalMissing.length) {
      console.warn("[AP][bundle] CRITICAL modules not present in bundle:");
      if (console.table) console.table(meta.criticalMissing.map((p,i)=>({i, path:p})));
    }

    // Quick probes: common attach points
    var ns = window.AutoPrompter || {};
    var parserOK = !!(
      (ns.promptParser && typeof ns.promptParser.parse === "function") ||
      (ns.core && ns.core.promptParser && typeof ns.core.promptParser.parse === "function")
    );
    var probes = [
      ["Logger", !!(ns.logger && typeof ns.logger.info === "function")],
      ["UI Panel", !!(ns.uiPanel && typeof ns.uiPanel.createPanel === "function")],
      ["UI Position", !!(ns.uiPosition && typeof ns.uiPosition.applyPosition === "function")],
      ["Core.start", !!(ns.AutoPrompterCore && typeof ns.AutoPrompterCore.start === "function")],
      ["Sanity", !!(ns.sanity && ns.sanity.utils)],
      ["Parser.parse", parserOK],
      ["Compose.send", !!(ns.compose && typeof ns.compose.composeAndSend === "function")],
      ["findComposer", !!(ns.core && typeof ns.core.findComposer === "function")]
    ];
    var anyBad = probes.some(function(p){return !p[1]});
    (anyBad ? console.warn : console.info).call(console, "[AP][bundle] Probes:", probes);
    if (anyBad) console.warn("[AP][bundle] Probe failed; scroll up for first error above—its module likely threw before attach.");

    // Surfaced runtime module failures
    var modErrs = window.__AP_MODULE_ERRORS || [];
    if (modErrs.length) {
      console.warn("[AP][bundle] module errors captured:", modErrs.length);
      if (console.table) console.table(modErrs);
      else console.warn(modErrs);
    }

    // Breadcrumbs that show exact module load sequence
    try {
      var loadSeq = (window.__AP_LOAD||[]).map(function(p, i){ return {i, path:p}; });
      console.info("[AP][bundle] __AP_LOAD length:", loadSeq.length);
      if (console.table) console.table(loadSeq);
    } catch(e){}

    // Selector sanity snapshot to debug composer detection quickly
    try {
      var cfg = (window.__AP_CFG || { selectors:{} });
      console.info("[AP][detect] selectors:", cfg.selectors);
    } catch(e){}

    if (console.groupEnd) { console.groupEnd(); }
  } catch (e) {
    try { console.warn("[AP][bundle] meta/footer error:", e && e.message ? e.message : e); } catch {}
  }
})();
})();

