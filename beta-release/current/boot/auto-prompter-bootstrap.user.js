// /usr/local/bin/node
// ./auto-prompter/main.user.js
// ==UserScript==
// @name         ChatGPT Auto Prompter — Repo Bundle Entry
// @namespace    incoglane03.autoprompter
// @version      6.9.5
// @description  Full bundle entry with runtime + sanity + UI + repo-dump coverage audit.
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @run-at       document-start
// @inject-into  page
// @grant        none
// @noframes
//
// NOTE: We intentionally DO NOT @require the generated `/auto-prompter/userscript/bundle.user.js`
// to avoid double-loading the same code. We also exclude server-only `.mjs` and non-JS assets.
//
// Repo meta (for telemetry/debug):
//   branch: development
//   commit: d3e63c6ca8af
//   repo-dump: v4.2.0 (2025-10-12 11:56:38)
//   working tree: M:20 A:0 D:0 ??:4

/* --- Logging (first) --- */
/* @require      /logging/boot-shims.js */
/* @require      /logging/logger.js */
/* @require      /logging/mirrorSink.js */
/* @require      /logging/uiPanel.js */
/* @require      /logging/uiPosition.js */
/* (logging internals for full coverage/audits) */
/* @require      /logging/core/checkpoint.js */
/* @require      /logging/core/constants.js */
/* @require      /logging/core/emit.js */
/* @require      /logging/core/sinkbus.js */
/* @require      /logging/core/utils.js */
/* @require      /logging/logger/index.js */

/* --- Repo dump (generated; step 3) --- */
/* @require      /auto-prompter/public/static/repo_dump.js */

/* --- Detect surfaces (ordered: config/util → probe/roots → find → sanity → index) --- */
/* tops (definitions used by deep core) */
/* @require      /core/detect/selectors.js */
/* @require      /core/detect/flags.js */
/* @require      /core/detect/helpers.js */
/* @require      /core/detect/roots.js */

/* deep core: config + probe utils */
/* @require      /core/detect/core/config/config.js */
/* @require      /core/detect/core/probe/util/visibility.js */
/* @require      /core/detect/core/probe/util/firstMatch.js */
/* @require      /core/detect/core/probe/util/heuristics.js */
/* @require      /core/detect/core/probe/util/nearInput.js */

/* deep core: probe + registry + roots */
/* @require      /core/detect/core/probe/try/tryOnce.js */
/* @require      /core/detect/core/probe/fallback/probeFallback.js */
/* @require      /core/detect/core/probe/resolve/resolve.js */
/* @require      /core/detect/core/roots/scan.js */

/* deep core: find pipeline */
/* @require      /core/detect/core/find/explicitSelectors.js */
/* @require      /core/detect/core/find/scanLoop.js */
/* @require      /core/detect/core/find/findComposer.js */

/* deep core: hints + waiters + sanity */
/* @require      /core/detect/core/hints/hints.js */
/* @require      /core/detect/core/waiters/waiters.js */
/* @require      /core/detect/core/sanity/sanity.js */

/* optional top-level legacy probe (kept for coverage/back-compat) */
/* @require      /core/detect/probe.js */

/* NOW wire the detect facade (after all deep core pieces are present) */
/* @require      /core/detect/index.js */

/* shims (load after core/index; they no-op if already wired) */
/* @require      /core/detect/shim/flags.js */
/* @require      /core/detect/shim/helpers.js */
/* @require      /core/detect/shim/index.js */
/* @require      /core/detect/shim/probe.js */

/* --- Engine (steps + handlers) — REAL EXECUTOR BEFORE PROMPT ENGINE --- */
/* Base engine context + retries */
/* @require      /core/engine/context.js */
/* @require      /core/engine/retries.js */

/* --- Engine Find (modular replacement for steps.findComposer.js) --- */
/* @require      /core/engine/find/global-proxy.js */
/* @require      /core/engine/find/utils.js */
/* @require      /core/engine/find/utils.dictate.js */
/* @require      /core/engine/find/probe.js */
/* @require      /core/engine/find/allow.js */
/* @require      /core/engine/find/once.js */
/* @require      /core/engine/find/orFail.js */
/* @require      /core/engine/find/index.js */

/* @require      /core/engine/steps.execute.js */
/* @require      /core/engine/steps.handlers.basic.js */

/* Engine (msg) — real implementation */
/* @require      /core/engine/msg/utils.js */
/* @require      /core/engine/msg/context.js */

/* Idle (split modules; load before anything that calls AP.idleWait) */
/* @require      /core/engine/idle/constants.js */
/* @require      /core/engine/idle/dom.js */
/* @require      /core/engine/idle/state.js */
/* @require      /core/engine/idle/observer.js */
/* @require      /core/engine/idle/waitUntilIdle.js */

/* Message pipeline deps + handlers */
/* @require      /core/engine/msg/deps.js */
/* @require      /core/engine/msg/helpers.focus.js */
/* @require      /core/engine/msg/helpers.prime.js */
/* @require      /core/engine/msg/helpers.refresh.js */
/* @require      /core/engine/msg/helpers.sendGate.js */
/* @require      /core/engine/msg/handler.js */

/* @require      /core/engine/steps.handlers.msg.js */
/* @require      /core/engine/steps.js */

// @require /core/engine/index.js

/* --- Core runtime: shared, boot, composer, io, prompt, ui, compat, adapters --- */
/* shared (map old runtime/shared → devtools & lib) */
/* @require      /core/devtools/logger.js */
/* @require      /core/devtools/loggerFacade.js */
/* @require      /core/devtools/trace.js */
/* @require      /core/runtime/shared/flags.js */
/* @require      /core/lib/dom/domFacade.js */
/* @require      /core/lib/dom/utils.js */

/* runtime core */
/* @require      /core/runtime/core/deps.js */
/* @require      /core/runtime/core/index.js */

/* boot core */
/* @require      /core/runtime/boot/state.js */
/* @require      /core/runtime/boot/gate.js */
/* @require      /core/runtime/boot/loader.js */
/* @require      /core/runtime/boot/loader/apload.js */
/* @require      /core/runtime/boot/loader/flags.js */
/* @require      /core/runtime/boot/loader/probe.js */
/* @require      /core/runtime/boot/loader/sanity.js */
/* @require      /core/runtime/boot/loader/startCore.js */
/* @require      /core/devtools/telemetry/loader.telemetry.js */
/* @require      /core/runtime/boot/loader/util.js */

/* --- nav (utils split, flags, hooks, route, scheduler/state, boot, facades, entry) --- */
/* utils split (provide AP.nav.utils before everything that consumes it) */
/* @require      /core/runtime/boot/nav/utils/log.js */
/* @require      /core/runtime/boot/nav/utils/time.js */
/* @require      /core/runtime/boot/nav/utils/dom.js */
/* @require      /core/runtime/boot/nav/utils/index.js */

/* flags */
/* @require      /core/runtime/boot/nav/flags.js */

/* hooks (modular) */
/* @require      /core/runtime/boot/nav/hooks/history.js */
/* @require      /core/runtime/boot/nav/hooks/mutation.js */
/* @require      /core/runtime/boot/nav/hooks/interval.js */
/* @require      /core/runtime/boot/nav/hooks/index.js */

/* route (modular) */
/* @require      /core/runtime/boot/nav/route/changed.js */
/* @require      /core/runtime/boot/nav/route/schedule.js */
/* @require      /core/runtime/boot/nav/route/index.js */

/* timing + state */
/* @require      /core/runtime/boot/nav/scheduler.js */
/* @require      /core/runtime/boot/nav/state.js */

/* nav boot orchestrators (ORDER MATTERS) */
/* base helpers */
/* @require      /core/runtime/boot/nav/boot/computeFlags.js */
/* @require      /core/runtime/boot/nav/boot/guards.js */
/* @require      /core/runtime/boot/nav/boot/ready.js */
/* @require      /core/runtime/boot/nav/boot/watchdog.js */
/* helper modules that start.js depends on */
/* @require      /core/devtools/telemetry/nav.boot.telemetry.js */
/* @require      /core/runtime/boot/nav/boot/schedulers.js */
/* @require      /core/runtime/boot/nav/boot/install.js */
/* @require      /core/runtime/boot/nav/boot/interval.js */
/* @require      /core/runtime/boot/nav/boot/longtask.js */
/* @require      /core/runtime/boot/nav/boot/strategy.js */
/* orchestrator entrypoints */
/* @require      /core/runtime/boot/nav/boot/start.js */
/* @require      /core/runtime/boot/nav/boot/index.js */

/* legacy facades (keep for back-compat and telemetry wiring) */
/* @require      /core/runtime/boot/nav/utils.js */
/* @require      /core/runtime/boot/nav/route.js */
/* @require      /core/runtime/boot/nav/hooks.js */

/* tiny entry that defers to navBoot.start */
/* @require      /core/runtime/boot/nav/index.js */

/* remaining boot pieces */
/* @require      /core/runtime/boot/startGate.js */
/* @require      /core/runtime/boot/navWatch.js */
/* (removed: /core/runtime/boot/panel.js — not present in repo) */
/* @require      /core/runtime/boot/core.js */
/* @require      /core/runtime/boot/run.js */
/* @require      /core/runtime/boot/start.js */
/* @require      /core/runtime/boot/mountPoint.js */

/* composer */
/* @require      /core/runtime/composer/core/watcher.js */
/* @require      /core/runtime/composer/cache.js */
/* @require      /core/runtime/composer/probe-shim.js */
/* @require      /core/runtime/composer/bootstrap.js */
/* @require      /core/detect/index.js */

/* adapters (use top-level core/adapters) */
/* @require      /core/adapters/chatgpt/detector.js */
/* @require      /core/adapters/chatgpt/patch.js */

/* IO */
/* (removed: /core/runtime/io/_loadAll.js — CommonJS aggregator) */
/* @require      /core/runtime/io/index.js */
/* @require      /core/runtime/io/waiters.js */
/* @require      /core/runtime/io/idle.js */
/* @require      /core/runtime/io/compose.js */
/* @require      /core/runtime/io/value.js */
/* @require      /core/runtime/io/value/standardInput.js */
/* @require      /core/runtime/io/value/contentEditable.js */
/* plugin CE writers (replace runtime/io/value/ce/*) */
/* @require      /core/plugins/ce-writers/focus.js */
/* @require      /core/plugins/ce-writers/insertBeforeInput.js */
/* @require      /core/plugins/ce-writers/insertByHTML.js */
/* @require      /core/plugins/ce-writers/insertExecCommand.js */
/* @require      /core/plugins/ce-writers/insertPaste.js */
/* submit + senders */
/* @require      /core/runtime/io/submit/button.js */
/* @require      /core/runtime/io/submit/enter.js */
/* @require      /core/runtime/io/submit/form.js */

/* Prompt + UI (map runtime/ui → core/ui) */
/* @require      /core/runtime/prompt/parser.js */
/* ⚠️ After engine parts are loaded above, wire the real prompt engine */
/* @require      /core/runtime/prompt/engine.js */
/* @require      /core/ui/dom/attrs.js */
/* @require      /core/ui/dom/el.js */
/* @require      /core/ui/dom/query.js */
/* @require      /core/ui/dom/shadow.js */
/* @require      /core/ui/dom/styles.js */
/* @require      /core/ui/dom/utils.js */
/* @require      /core/ui/dom/waitForSelector.js */
/* @require      /core/ui/dom/index.js */
/* @require      /core/ui/index.js */
/* @require      /core/ui/position.js */
/* @require      /core/ui/panel.js */
/* @require      /core/ui/positionFallback.js */

/* compat + entry */
/* @require      /core/runtime/compat/domWait.proxy.js */
/* @require      /core/runtime/compat/startOnce.wrap.js */
/* @require      /core/runtime/ap/promptEngine.shim.js */
/* @require      /core/runtime/ap/rootIndex.js */
/* @require      /core/runtime/ap/index.js */
/* @require      /core/runtime/index.js */

/* devtools (map runtime/devtools → core/devtools) */
/* @require      /core/devtools/noise/dom.js */
/* @require      /core/devtools/noise/index.js */
/* @require      /core/devtools/noiseStubs.js */
/* @require      /core/devtools/panelFallback.js */

/* --- AP facade + events --- */
/* @require      /core/events.js */
/* @require      /auto-prompter/userscript/boot-core-helpers.js */
/* @require      /auto-prompter/userscript/runtime-pickers.js */
/* @require      /auto-prompter/userscript/index/facade.js */
/* @require      /auto-prompter/userscript/index/composer-bridge.js */
/* @require      /auto-prompter/userscript/index/whenReady.js */
/* @require      /auto-prompter/userscript/index/startGateEnhance.js */
/* @require      /auto-prompter/userscript/index/bootChecklist.js */
/* @require      /auto-prompter/userscript/index/openBootTrace.js */
/* @require      /auto-prompter/userscript/index/boot.js */
/* --- Dictation (modular core; loads before glue) --- */
/* @require      /auto-prompter/userscript/dictation/util.js */
/* @require      /auto-prompter/userscript/dictation/constants.js */
/* @require      /auto-prompter/userscript/dictation/events.js */
/* @require      /auto-prompter/userscript/dictation/mic.js */
/* @require      /auto-prompter/userscript/dictation/capture.js */
/* @require      /auto-prompter/userscript/dictation/index.js */

/* Glue (loads after index to ensure window.AutoPrompter exists) */
/* base */
/* @require      /auto-prompter/userscript/glue/boot.js */
/* @require      /auto-prompter/userscript/glue/bridges.js */
/* @require      /auto-prompter/userscript/glue/shared-utils.js */
/* @require      /auto-prompter/userscript/glue/compose-strict.js */
/* @require      /auto-prompter/userscript/glue/gate-helpers.js */

/* dictation (modularized; order matters) */
/* logging + config first so others have cp() + flags */
/* @require      /auto-prompter/userscript/glue/dictation-logger.js */
/* @require      /auto-prompter/userscript/glue/dictation-config.js */

/* core state + dom helpers used by hooks/finalize */
/* @require      /auto-prompter/userscript/glue/dictation-session.js */
/* @require      /auto-prompter/userscript/glue/dictation-dom.js */

/* wrap site mic + capture early */
/* @require      /auto-prompter/userscript/glue/dictation-hooks.js */

/* merge + watchers + global event bridge */
/* @require      /auto-prompter/userscript/glue/dictation-finalize.js */
/* @require      /auto-prompter/userscript/glue/dictation-fallback.js */
/* @require      /auto-prompter/userscript/glue/dictation-events.js */

/* acceptance helpers */
/* @require      /auto-prompter/userscript/glue/dictation-accept.js */

/* compose/send + submit guard */
/* @require      /auto-prompter/userscript/glue/dictation-compose.js */
/* @require      /auto-prompter/userscript/glue/dictation-guard.js */

/* legacy site watchers (safe, optional) */
/* @require      /auto-prompter/userscript/glue/dictation-site-watchers.js */

/* diagnostics */
/* @require      /auto-prompter/userscript/glue/dictation-selftest.js */

/* public API BEFORE bootstrapper so ensure() exists */
/* @require      /auto-prompter/userscript/glue/dictation-api.js */

/* bootstrapper that calls ensure(); keep AFTER API */
/* @require      /auto-prompter/userscript/glue/dictation-glue.js */

/* legacy stub (no-op after modular glue) */
/* @require      /auto-prompter/userscript/glue/dictation.js */

/* dev + parser fallback keep at end of glue cluster */
/* @require      /auto-prompter/userscript/glue/dev.js */
/* @require      /auto-prompter/userscript/glue/prompt-parser-fallback.js */

/* --- Auto-Prompter (config + UI position + panel) --- */
/* @require      /auto-prompter/utils/dom.js */
/* config */
/* @require      /auto-prompter/utils/config/constants.js */
/* @require      /auto-prompter/utils/config/storage.js */
/* @require      /auto-prompter/utils/config/templates.js */
/* @require      /auto-prompter/utils/config/profiles.js */
/* @require      /auto-prompter/utils/config/index.js */

/* position system */
/* @require      /auto-prompter/ui/position/storage.js */
/* @require      /auto-prompter/ui/position/geometry.js */
/* @require      /auto-prompter/ui/position/apply.js */
/* @require      /auto-prompter/ui/position/drag.js */
/* @require      /auto-prompter/ui/position/keyboard.js */
/* @require      /auto-prompter/ui/position/index.js */

/* panel */
/* @require      /auto-prompter/ui/theme.js */
/* (monolithic layout.js intentionally NOT required) */
/* @require      /auto-prompter/ui/panel/layout/mount.js */
/* @require      /auto-prompter/ui/panel/layout/markup.js */
/* @require      /auto-prompter/ui/panel/layout/toggle.js */
/* @require      /auto-prompter/ui/panel/layout/keyboard.js */
/* @require      /auto-prompter/ui/panel/layout/dock.js */
/* @require      /auto-prompter/ui/panel/layout/debug.js */
/* @require      /auto-prompter/ui/panel/layout/index.js */
/* @require      /auto-prompter/ui/panel/tabs.js */
/* @require      /auto-prompter/ui/panel/controls/safe.js */
/* @require      /auto-prompter/ui/panel/controls/repeats.js */
/* @require      /auto-prompter/ui/panel/controls/steps/styles.js */
/* @require      /auto-prompter/ui/panel/controls/steps/row.js */
/* @require      /auto-prompter/ui/panel/controls/ui.js */
/* @require      /auto-prompter/ui/panel/controls/scheduler.js */

/* @require      /auto-prompter/ui/panel/controls/form.js */
/* @require      /auto-prompter/ui/panel/controls/buttons.js */
/* @require      /auto-prompter/ui/panel/controls/bind.js */
/* @require      /auto-prompter/ui/panel/controls/index.js */
/* @require      /auto-prompter/ui/panel/profiles.js */
/* @require      /auto-prompter/ui/panel/templates.js */
/* @require      /auto-prompter/ui/panel.log.js */
/* @require      /auto-prompter/ui/panel.js */

/* dev helpers (optional; safe to include) */
/* @require      /auto-prompter/ui/dev/boot.js */

/* --- Userscript entry + helpers (manifest will be built after parts below) --- */
/* top-level userscript helpers */
/* @require      /auto-prompter/userscript/autoload.js */
/* @require      /auto-prompter/userscript/boot.js */
/* @require      /auto-prompter/userscript/glue/dictation-auto-reopen.js */
/* @require      /auto-prompter/userscript/entry.js */
/* @require      /auto-prompter/userscript/orchestrator.js */
/* @require      /auto-prompter/userscript/probe.js */

/* @require      /auto-prompter/userscript/repoDump.js */
/* @require      /auto-prompter/userscript/sanity.js */
/* @require      /auto-prompter/userscript/tryStart.js */
/* @require      /auto-prompter/userscript/version.js */

/* Userscript bootstrap (split) */
/* @require      /auto-prompter/userscript/bootstrap/guard.js */
/* @require      /auto-prompter/userscript/bootstrap/start.js */

/* manifest composition (parts) — helpers + parts first */
/* @require      /auto-prompter/userscript/manifest/helpers.js */
/* @require      /auto-prompter/userscript/manifest/parts.boot-loader.js */
/* @require      /auto-prompter/userscript/manifest/parts.core-boot.js */
/* @require      /auto-prompter/userscript/manifest/parts.logging-core.js */
/* @require      /auto-prompter/userscript/manifest/parts.logging.js */
/* @require      /auto-prompter/userscript/manifest/parts.nav-boot.js */
/* @require      /auto-prompter/userscript/manifest/parts.nav-facades.js */
/* @require      /auto-prompter/userscript/manifest/parts.nav-hooks.js */
/* @require      /auto-prompter/userscript/manifest/parts.nav-route.js */
/* @require      /auto-prompter/userscript/manifest/parts.nav-utils.js */
/* @require      /auto-prompter/userscript/manifest/parts.sanity.js */
/* @require      /auto-prompter/userscript/manifest/parts.ui-panel.js */
/* @require      /auto-prompter/userscript/manifest/parts.ui-position.js */
/* @require      /auto-prompter/userscript/manifest/parts.userscript.js */
/* @require      /auto-prompter/userscript/manifest/parts.utils-config.js */

/* build manifest after all parts are registered */
/* (deprecated single-file manifest.js intentionally removed) */

// ==/UserScript==

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
// __AP_BOOT {"encUrl":"https://samuellane522.github.io/GPT_auto_release/download/beta/auto-prompter-enc.bin","encSri":"sha256-wizWGcOh/2A5QoUFnlD5dgyzofVAzYLSLxuURFj2n+8=","id":"03c82e6f2f","ts":"2025-10-27T11:22:34.538Z"}
