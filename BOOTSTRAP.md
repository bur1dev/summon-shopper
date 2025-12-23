# Bootstrap Server Configuration - Solution Guide

## Date: 2025-12-22

## Problem

Need to run two separate Holochain apps (summon-customer and summon-shopper) on the same machine and have them communicate via shared DNAs (order_finder.dna, cart.dna, profiles.dna).

## The Solution

The issue was **NOT** about bootstrap server setup - it was about **environment variable scope** in npm scripts.

### Root Cause

**Issue 1: UI_PORT Scope**

Shopper's network script had `UI_PORT=1420` inside the first command only:
```json
"network": "npm run build:happ && concurrently -k \"UI_PORT=1420 npm start -w ui\" \"npm run launch:happ\""
```

This meant `$UI_PORT` was **empty** when `launch:happ` ran, causing the command to become:
```
hc-spin -n 1 workdir/summon-shopper.happ --ui-port --bootstrap-url http://127.0.0.1:39101
```

Electron then parsed all arguments as **positional** instead of **flags**, causing:
```
Error: hc spin takes exactly one argument but got 2 arguments
```

**Issue 2: Wrong Launch Script**

Shopper's `network` was calling `npm run launch` (Tauri dev) instead of `npm run launch:happ` (hc-spin).

**Issue 3: Hardcoded IP in Tauri Config**

`src-tauri/tauri.conf.json` had:
```json
"devUrl": "http://192.168.0.119:1420"
```
Instead of `localhost:1420`, causing Tauri to wait for wrong IP address.

### The Fix

**1. File: `/home/bur1/Holochain/summon-shopper/package.json`**

Move `UI_PORT=1420` **before** `concurrently` (applies to both commands):
```json
"network": "npm run build:happ && UI_PORT=1420 concurrently -k \"npm start -w ui\" \"npm run launch:happ\""
```

Call `launch:happ` instead of `launch`:
```json
"network": "... \"npm run launch:happ\""  // Not "npm run launch"
```

Add bootstrap flags to `launch:happ`:
```json
"launch:happ": "hc-spin -n $AGENTS workdir/summon-shopper.happ --ui-port $UI_PORT --bootstrap-url http://127.0.0.1:39101 --signaling-url ws://127.0.0.1:39101"
```

**2. File: `/home/bur1/Holochain/summon-shopper/src-tauri/tauri.conf.json`**

Change devUrl to localhost:
```json
"devUrl": "http://localhost:1420"
```

## How to Run Both Apps

**Terminal 1: Bootstrap Server** (optional - hc-spin starts its own, but explicit is better)
```bash
kitsune2-bootstrap-srv --listen 127.0.0.1:39101
```

**Terminal 2: Customer App**
```bash
cd /home/bur1/Holochain/summon-customer
npm start
```

**Terminal 3: Shopper App**
```bash
cd /home/bur1/Holochain/summon-shopper
npm start
```

## Verification

Check logs for this line in BOTH apps:
```
network: NetworkConfig { bootstrap_url: Url2 { url: "http://127.0.0.1:39101/" }, signal_url: Url2 { url: "ws://127.0.0.1:39101/" }
```

Both apps will now:
- ✅ Connect to the same bootstrap server (39101)
- ✅ Join the same DHT network
- ✅ Communicate via shared DNAs (order_finder, cart, profiles)

## Key Lessons

1. **Environment variables in npm scripts**: When using `concurrently`, set env vars BEFORE the command, not inside quoted strings
2. **hc-spin vs Tauri**: For bootstrap configuration, use `hc-spin` directly (launch:happ), not Tauri dev (launch)
3. **Argument parsing**: Missing env var values cause Electron to misparse command-line flags as positional arguments
4. **Match configurations**: Both apps must use the same script structure for bootstrap to work
5. **Tauri devUrl**: Always use `localhost` not hardcoded IP addresses

## Customer App Configuration (Reference)

Customer app already had correct configuration:
```json
"network": "hc s clean && npm run build:happ && UI_PORT=8888 concurrently \"npm start -w ui\" \"npm run launch:happ\"",
"launch:happ": "WASM_LOG=warn hc-spin -n $AGENTS workdir/summon.happ --ui-port $UI_PORT --bootstrap-url http://127.0.0.1:39101 --signaling-url ws://127.0.0.1:39101"
```

Notice: `UI_PORT=8888` is set BEFORE `concurrently`, and bootstrap flags are in `launch:happ`.

## What the Holochain Devs Said (Discord Reference)

**matthme's recommendation:**
- Run dedicated bootstrap server in separate terminal: `kitsune2-bootstrap-srv --listen 127.0.0.1:39101`
- Pass `--bootstrap-url http://127.0.0.1:39101 --signaling-url ws://127.0.0.1:39101` to hc-spin in BOTH apps
- hc-spin may start its own bootstrap but will use the explicit one you pass

**Key insight:** The flags work when called from command line hc-spin, but the npm package version wrapped by Electron doesn't parse them correctly if $UI_PORT is missing.
