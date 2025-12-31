# Nix-Shell Troubleshooting Guide

## Common Error: Database Connection Pool Error

When you see errors like:
```
unable to open database file: /tmp/nix-shell.XXXXX/...../databases/dht/...
```

This means Holochain is trying to access a stale or corrupted temp database from a previous nix-shell session.

## Diagnosis Commands

**1. Check for running holochain processes:**
```bash
ps aux | grep -E "(holochain|lair-keystore)" | grep -v grep
```

**2. List nix-shell temp folders:**
```bash
ls -la /tmp/ | grep nix-shell
```

**3. List holochain data in those folders:**
```bash
ls -la /tmp/nix-shell.*/h* 2>/dev/null | head -20
```

## Fix Commands

**IMPORTANT: Only run these exact commands. Do not modify or run other commands on /tmp/nix-shell folders.**

**Step 1 - Kill all holochain processes:**
```bash
pkill -f holochain; pkill -f lair-keystore
```

**Step 2 - If processes persist, force kill by PID:**
```bash
kill -9 <PID1> <PID2>
```

**Step 3 - Remove all nix-shell temp folders:**
```bash
rm -rf /tmp/nix-shell.*
```

**Step 4 - Verify cleanup:**
```bash
ps aux | grep -E "(holochain|lair-keystore)" | grep -v grep
ls /tmp/nix-shell.* 2>/dev/null
```

Both commands should return nothing.

## What Gets Deleted

- Temporary Holochain conductor databases (DHT data, source chain)
- Lair keystore temp files
- Test data from previous dev sessions (carts, orders, profiles)

## What Does NOT Get Deleted

- Source code
- Configuration files
- Anything outside `/tmp/`
