# Profiles Setup - Restoration Guide

## Overview
This document contains the exact steps to restore profiles functionality that was temporarily removed to fix Android DanglingZomeDependency issues.

**IMPORTANT**: Profiles are now implemented as a **separate DNA** (not embedded in cart DNA), matching the summon-customer architecture. This document reflects the current separate DNA approach.

## What Was Removed
The following profiles components were removed to create a profiles-free architecture for Android testing:

### 1. Profiles DNA Symlink
**Removed symlink**: `/home/bur1/Holochain/summon-shopper/dnas/profiles/`

**What this symlink points to**: `/home/bur1/Holochain/summon-customer/dnas/profiles/`

**Note**: Profiles is a separate DNA, NOT part of the cart DNA. The profiles DNA contains its own integrity and coordinator zomes.

### 2. Workspace Dependencies

**File**: `/home/bur1/Holochain/summon-shopper/Cargo.toml`
**CRITICAL - Removed to fix Android compilation errors**:
```toml
[workspace.dependencies.profiles]
path = "dnas/profiles/zomes/coordinator/profiles"

[workspace.dependencies.profiles_integrity]
path = "dnas/profiles/zomes/integrity/profiles"

[workspace.dependencies.address]
path = "dnas/profiles/zomes/coordinator/address"

[workspace.dependencies.address_integrity]
path = "dnas/profiles/zomes/integrity/address"
```
**NOTE**: These MUST be re-added to summon-shopper/Cargo.toml when restoring profiles!

**Also removed workspace members pattern**:
```toml
members = [
  "src-tauri",  
  "dnas/*/zomes/coordinator/*",
  "dnas/*/zomes/integrity/*"
]
```
This wildcard pattern includes all DNAs (cart + profiles) automatically.

### 3. hApp Manifest Role
**File**: `/home/bur1/Holochain/summon-shopper/workdir/happ.yaml`

**Removed profiles_role entry**:
```yaml
# Profiles DNA - persistent user data
- name: profiles_role
  provisioning:
    strategy: create
    deferred: false
  dna:
    bundled: ../dnas/profiles/workdir/profiles.dna
    modifiers:
      network_seed: null
      properties: null
    installed_hash: null
    clone_limit: 0
```

### 4. Frontend Role Reference
**File**: `/home/bur1/Holochain/summon-shopper/ui/src/App.svelte`

**Changed ProfilesClient role reference from**:
```javascript
profilesStore = new ProfilesStore(new ProfilesClient(client, "profiles_role"), {
```
**Back to**:
```javascript
profilesStore = new ProfilesStore(new ProfilesClient(client, "cart"), {
```

## Restoration Steps

### Step 1: Create Profiles DNA Symlink

**Create symlink to summon-customer profiles DNA:**
```bash
ln -s /home/bur1/Holochain/summon-customer/dnas/profiles /home/bur1/Holochain/summon-shopper/dnas/profiles
```

**This symlink provides access to**:
- `/home/bur1/Holochain/summon-customer/dnas/profiles/zomes/coordinator/profiles/`
- `/home/bur1/Holochain/summon-customer/dnas/profiles/zomes/coordinator/address/`  
- `/home/bur1/Holochain/summon-customer/dnas/profiles/zomes/integrity/profiles/`
- `/home/bur1/Holochain/summon-customer/dnas/profiles/zomes/integrity/address/`
- `/home/bur1/Holochain/summon-customer/dnas/profiles/workdir/profiles.dna`

### Step 2: Restore Summon-Shopper Workspace Configuration

**CRITICAL STEP - File**: `/home/bur1/Holochain/summon-shopper/Cargo.toml`

**Add back the profiles workspace dependencies** (after cart dependencies):
```toml
[workspace.dependencies.profiles]
path = "dnas/profiles/zomes/coordinator/profiles"

[workspace.dependencies.profiles_integrity]
path = "dnas/profiles/zomes/integrity/profiles"

[workspace.dependencies.address]
path = "dnas/profiles/zomes/coordinator/address"

[workspace.dependencies.address_integrity]
path = "dnas/profiles/zomes/integrity/address"
```

**Also restore wildcard workspace members**:
```toml
members = [
  "src-tauri",  
  "dnas/*/zomes/coordinator/*",
  "dnas/*/zomes/integrity/*"
]
```

**Why this is needed**: These were removed to fix Android compilation errors when profiles were absent. They MUST be restored when profiles are re-added, otherwise Android will fail to compile.

### Step 3: Add Profiles Role to hApp Manifest

**File**: `/home/bur1/Holochain/summon-shopper/workdir/happ.yaml`

**Add profiles_role** (after cart role):
```yaml
# Profiles DNA - persistent user data
- name: profiles_role
  provisioning:
    strategy: create
    deferred: false
  dna:
    bundled: ../dnas/profiles/workdir/profiles.dna
    modifiers:
      network_seed: null
      properties: null
    installed_hash: null
    clone_limit: 0
```

### Step 4: Fix Frontend Role Reference

**File**: `/home/bur1/Holochain/summon-shopper/ui/src/App.svelte`

**Change ProfilesClient role reference** (around line 52):
```javascript
// FROM:
profilesStore = new ProfilesStore(new ProfilesClient(client, "cart"), {

// TO:
profilesStore = new ProfilesStore(new ProfilesClient(client, "profiles_role"), {
```

### Step 5: Build and Test

**Build profiles DNA:**
```bash
cd /home/bur1/Holochain/summon-shopper
hc dna pack dnas/profiles/workdir
```

**Rebuild happ with profiles included:**
```bash
hc app pack workdir --recursive
```

**Test desktop (should work):**
```bash
npm start
```

**Test Android (may still have DanglingZomeDependency):**
```bash
nix develop .#androidDev
npm run network:android
```

## Verification

**Check profiles DNA builds correctly:**
```bash
cd /home/bur1/Holochain/summon-shopper
hc dna hash dnas/profiles/workdir/profiles.dna
```

**Check cart DNA hashes match:**
```bash
# In summon-customer:
hc dna hash dnas/cart/workdir/cart.dna

# In summon-shopper (via symlink):
hc dna hash dnas/cart/workdir/cart.dna
```

**Both cart DNAs should return identical hashes.**

**Verify profiles work in UI:**
- Profile creation screen should appear on first run
- Avatar should display without "Zome not found" errors
- Frontend should successfully connect to "profiles_role"

## UI Dependencies
**Both apps already have correct UI profiles dependencies:**
- `"@holochain-open-dev/profiles": "^0.501.0"` ✅
- All other @holochain-open-dev packages at compatible versions ✅

## Expected Results After Restoration
- ✅ **Desktop**: Full profiles functionality restored with separate profiles DNA
- ❌ **Android**: Likely still DanglingZomeDependency (needs Holochain community fix)
- ✅ **Network sync**: Both summon-customer and summon-shopper should communicate with shared profiles
- ✅ **Separate DNA Architecture**: Profiles isolated from cart DNA for better modularity

## Architecture Notes
- **Profiles DNA**: Separate DNA shared between summon-customer and summon-shopper via symlink
- **Cart DNA**: Separate DNA also shared via symlink to summon-dnas
- **Modular Design**: Each DNA can be enabled/disabled independently
- **Shared Source**: Both apps use identical DNA source code but build independently

## Notes
- This restoration assumes the Holochain community provides a fix for the Android DanglingZomeDependency issue
- If Android still fails, the issue is confirmed as a Holochain Android platform bug
- Desktop development can continue normally with full profiles functionality
- The separate DNA architecture provides better isolation and modularity than the previous embedded approach