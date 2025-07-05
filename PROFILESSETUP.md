# Profiles Setup - Restoration Guide

## Overview
This document contains the exact steps to restore profiles functionality that was temporarily removed to fix Android DanglingZomeDependency issues.

## What Was Removed
The following profiles components were removed to create a profiles-free DNA for Android testing:

### 1. DNA Manifest Entries
**File**: `/home/bur1/Holochain/summon-dnas/cart/workdir/dna.yaml`

**Removed from integrity zomes section** (around line 12):
```yaml
  - name: profiles_integrity
    hash: null
    bundled: '../../../summon/target/wasm32-unknown-unknown/release/profiles_integrity.wasm'
    dependencies: null
    dylib: null
```

**Removed from coordinator zomes section** (around line 25):
```yaml
  - name: profiles
    hash: null
    bundled: '../../../summon/target/wasm32-unknown-unknown/release/profiles.wasm'
    dependencies:
    - name: profiles_integrity
    dylib: null
```

### 2. Workspace Dependencies

**File**: `/home/bur1/Holochain/summon/Cargo.toml`
**Removed workspace dependencies** (around lines 19-23):
```toml
[workspace.dependencies.profiles]
path = "dnas/cart/zomes/coordinator/profiles"

[workspace.dependencies.profiles_integrity]
path = "dnas/cart/zomes/integrity/profiles"
```

**File**: `/home/bur1/Holochain/summon-shopper/Cargo.toml`
**CRITICAL - Removed to fix Android compilation errors** (lines 25-29):
```toml
[workspace.dependencies.profiles]
path = "dnas/cart/zomes/coordinator/profiles"

[workspace.dependencies.profiles_integrity]
path = "dnas/cart/zomes/integrity/profiles"
```
**NOTE**: These MUST be re-added to summon-shopper/Cargo.toml when restoring profiles!

### 3. Profiles Zome Directories
**Deleted directories**:
- `/home/bur1/Holochain/summon-dnas/cart/zomes/coordinator/profiles/`
- `/home/bur1/Holochain/summon-dnas/cart/zomes/integrity/profiles/`

## Restoration Steps

### Step 1: Recreate Profiles Zome Directories

**Create coordinator profiles directory:**
```bash
mkdir -p /home/bur1/Holochain/summon-dnas/cart/zomes/coordinator/profiles/src
```

**Create integrity profiles directory:**
```bash
mkdir -p /home/bur1/Holochain/summon-dnas/cart/zomes/integrity/profiles/src
```

### Step 2: Create Cargo.toml Files

**File**: `/home/bur1/Holochain/summon-dnas/cart/zomes/coordinator/profiles/Cargo.toml`
```toml
[package]
name = "profiles"
version = "0.0.1"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]
name = "profiles"

[dependencies]
hdk = { workspace = true }
serde = { workspace = true }
holochain_serialized_bytes = { workspace = true }
profiles_integrity = { path = "../../integrity/profiles" }
hc_zome_profiles_coordinator = { git = "https://github.com/holochain-open-dev/profiles", branch = "main-0.5" }
```

**File**: `/home/bur1/Holochain/summon-dnas/cart/zomes/integrity/profiles/Cargo.toml`
```toml
[package]
name = "profiles_integrity"
version = "0.0.1"
edition = "2021"

[lib]
crate-type = ["cdylib", "rlib"]
name = "profiles_integrity"

[dependencies]
hc_zome_profiles_integrity = { git = "https://github.com/holochain-open-dev/profiles", branch = "main-0.5" }
hdi = { workspace = true }
serde = { workspace = true }
holochain_serialized_bytes = { workspace = true }
```

### Step 3: Create lib.rs Files

**File**: `/home/bur1/Holochain/summon-dnas/cart/zomes/coordinator/profiles/src/lib.rs`
```rust
extern crate hc_zome_profiles_coordinator;
```

**File**: `/home/bur1/Holochain/summon-dnas/cart/zomes/integrity/profiles/src/lib.rs`
```rust
extern crate hc_zome_profiles_integrity;
```

### Step 4: Restore Workspace Dependencies

**File**: `/home/bur1/Holochain/summon/Cargo.toml`

**Add back to workspace dependencies section** (after line 17):
```toml
[workspace.dependencies.profiles]
path = "dnas/cart/zomes/coordinator/profiles"

[workspace.dependencies.profiles_integrity]
path = "dnas/cart/zomes/integrity/profiles"
```

### Step 5: Restore DNA Manifest

**File**: `/home/bur1/Holochain/summon-dnas/cart/workdir/dna.yaml`

**Add back to integrity zomes section** (after cart_integrity):
```yaml
  - name: profiles_integrity
    hash: null
    bundled: '../../../summon/target/wasm32-unknown-unknown/release/profiles_integrity.wasm'
    dependencies: null
    dylib: null
```

**Add back to coordinator zomes section** (after cart coordinator):
```yaml
  - name: profiles
    hash: null
    bundled: '../../../summon/target/wasm32-unknown-unknown/release/profiles.wasm'
    dependencies:
    - name: profiles_integrity
    dylib: null
```

### Step 6: Restore Summon-Shopper Workspace Dependencies

**CRITICAL STEP - File**: `/home/bur1/Holochain/summon-shopper/Cargo.toml`

**Add back the profiles workspace dependencies** (after cart dependencies):
```toml
[workspace.dependencies.profiles]
path = "dnas/cart/zomes/coordinator/profiles"

[workspace.dependencies.profiles_integrity]
path = "dnas/cart/zomes/integrity/profiles"
```

**Why this is needed**: These were removed to fix Android compilation errors when profiles were absent. They MUST be restored when profiles are re-added, otherwise Android will fail to compile.

### Step 7: Rebuild and Test

**Rebuild DNA with profiles:**
```bash
cd /home/bur1/Holochain/summon
cargo clean
npm run build:happ
```

**Copy to shopper app:**
```bash
cp dnas/cart/workdir/cart.dna /home/bur1/Holochain/summon-shopper/workdir/cart.dna
```

**Test desktop (should work):**
```bash
cd /home/bur1/Holochain/summon
npm start
```

**Test Android (may still have DanglingZomeDependency):**
```bash
cd /home/bur1/Holochain/summon-shopper
nix develop .#androidDev
npm run network:android
```

## Verification

**Check DNA hashes match:**
```bash
# In summon:
hc dna hash dnas/cart/workdir/cart.dna

# In summon-shopper:
hc dna hash workdir/cart.dna
```

**Both should return identical hashes.**

## UI Dependencies
**Both apps already have correct UI profiles dependencies:**
- `"@holochain-open-dev/profiles": "^0.501.0"` ✅
- All other @holochain-open-dev packages at compatible versions ✅

## Expected Results After Restoration
- ✅ **Desktop**: Full profiles functionality restored
- ❌ **Android**: Likely still DanglingZomeDependency (needs Holochain community fix)
- ✅ **Network sync**: Both desktop apps should communicate with profiles

## Notes
- This restoration assumes the Holochain community provides a fix for the Android DanglingZomeDependency issue
- If Android still fails, the issue is confirmed as a Holochain Android platform bug
- Desktop development can continue normally with profiles functionality