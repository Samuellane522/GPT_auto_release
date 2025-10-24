# Auto Prompter
![build](https://img.shields.io/badge/build-03c82e6f2f-3b82f6?style=flat&logo=github) [![docs](https://img.shields.io/badge/docs-online-22c55e?style=flat)](https://samuellane522.github.io/GPT_auto_release/docs/) [![verify](https://img.shields.io/badge/verify-checksums-0ea5e9?style=flat)](https://samuellane522.github.io/GPT_auto_release/docs/verify.html)
Security-first userscript delivery with encrypted bundles, integrity (SRI), and versioned docs. One-click install, zero-trust verify.
> **Latest build:** `03c82e6f2f`
## Quick Start
1. Install **Tampermonkey** (Chrome/Edge/Firefox).
2. Click the button below to install the bootstrap userscript (Tampermonkey will prompt you):
[Install bootstrap.user.js](https://samuellane522.github.io/GPT_auto_release/beta-release/current/boot/auto-prompter-bootstrap.user.js)
Once installed, refresh ChatGPT — the bootstrap fetches and decrypts your encrypted bundle automatically.
## Verify a Release
Prefer “trust but verify”? We publish checksums and an integrity policy.
- **Checksums:** https://samuellane522.github.io/GPT_auto_release/download/beta/checksums.txt
- **Policy (SRI):** https://samuellane522.github.io/GPT_auto_release/download/beta/policy.json
**enc.bin SRI** (from policy):
```text
sha256-wizWGcOh/2A5QoUFnlD5dgyzofVAzYLSLxuURFj2n+8=
```
**CLI snippet:**
```bash
# Fetch checksums
curl -sSfL https://samuellane522.github.io/GPT_auto_release/download/beta/checksums.txt | sed -n '1,50p'
# (Optional) Verify entries present
grep -E 'download/beta/auto-prompter-enc.bin|beta-release/current/boot/auto-prompter-bootstrap.user.js' <<'EOF'
$(curl -sSfL https://samuellane522.github.io/GPT_auto_release/download/beta/checksums.txt)
EOF
```
Or use the hosted page: **https://samuellane522.github.io/GPT_auto_release/docs/verify.html**
## Release Artifacts
- Encrypted bundle: `https://samuellane522.github.io/GPT_auto_release/download/beta/auto-prompter-enc.bin`
- Bootstrap userscript: `https://samuellane522.github.io/GPT_auto_release/beta-release/current/boot/auto-prompter-bootstrap.user.js`
- Checksums: `https://samuellane522.github.io/GPT_auto_release/download/beta/checksums.txt`
- Key: `https://samuellane522.github.io/GPT_auto_release/download/beta/key.json`
- Docs: `https://samuellane522.github.io/GPT_auto_release/docs/`
- Versioned docs (this build): `https://samuellane522.github.io/GPT_auto_release/docs/v/03c82e6f2f/index.html`
## What this project demonstrates
- 🔐 **Security-first pipeline** — encrypted bundle + integrity (SRI) with human-verifiable checksums.
- 🚀 **One-click install** — tiny bootstrap userscript that fetches & decrypts your release.
- 🧪 **Sanity + logs** — shipping scripts tail logs and assert golden signals (`"event":"ok"`).
- 📚 **Versioned docs** — Pages site auto-generated on each ship with release snapshots.
- 🧾 **Changelog automation** — conventional commits parsed into a clear, skimmable history.
## Changelog
See **https://samuellane522.github.io/GPT_auto_release/docs/changelog.html**
