# Summon Shopper App - Project State

## Overview
Mobile shopping app for the Summon ecosystem built with Tauri + Svelte. This is the **shopper-side** application where shoppers fulfill customer orders.

## Architecture

### DNA Configuration
- **Uses**: Cart DNA only (from shared summon-dnas repository)
- **Role**: `cart` - handles cart management and order fulfillment
- **Network**: Shares DHT with summon desktop app for real-time order sync

1### Shared DNA Strategy - CRITICAL FOR SAME NETWORK
- **Problem**: Rust-to-WASM compilation is non-deterministic - same code produces different DNA hashes
- **Solution**: Build DNA once in summon, copy exact .dna file to shopper app
- **Implementation**: 
  1. Summon builds cart.dna: `/home/bur1/Holochain/summon/dnas/cart/workdir/cart.dna`
  2. Copy to shopper: `cp ../summon/dnas/cart/workdir/cart.dna workdir/cart.dna`
  3. Reference in happ.yaml: `bundled: cart.dna`
- **Benefits**: Identical DNA hash, same DHT network, real-time cart sync
- **Current DNA Hash**: `uhC0khot-UHUkOc0hMCXKsRhlc_V7S6qhLZ9povtXOwUXC6I0Et2A`

### Split Architecture
```
┌─────────────────┬─────────────────┐
│ summon (desktop)│ summon-shopper  │
│ Customer App    │ Mobile App      │
├─────────────────┼─────────────────┤
│ Products DNA    │ -               │
│ Cart DNA        │ Cart DNA        │ ← Shared
└─────────────────┴─────────────────┘
```

## Development Workflow

### Current Status ✅
- [x] Shared DNA integration complete
- [x] Symlink architecture implemented
- [x] Build system working correctly
- [x] Android deployment ready

### Testing Full Workflow
1. Start summon desktop: `cd ../summon && npm run start`
2. Start shopper mobile: `npm run network:android`
3. Both apps share same cart network for real-time testing

### Build Commands
```bash
# Development
npm run start                # 2-agent network
npm run network:android     # Android development build

# Production
npm run package             # Create .webhapp bundle
npm run build:happ          # Build .happ only
```

### Key Files
- `dnas/` → Symlink to `../summon-dnas`
- `workdir/happ.yaml` → App manifest (cart role only)
- `ui/` → Svelte frontend
- `src-tauri/` → Tauri backend for mobile/desktop

## DNA Hash Verification Commands

**CRITICAL**: Always verify both apps have identical DNA hashes before testing DHT sync:

```bash
# Check summon DNA hash
cd /home/bur1/Holochain/summon
nix develop . --command hc dna hash dnas/cart/workdir/cart.dna

# Check shopper DNA hash  
cd /home/bur1/Holochain/summon-shopper-app
nix develop . --command hc dna hash workdir/cart.dna

# Both must return: uhC0khot-UHUkOc0hMCXKsRhlc_V7S6qhLZ9povtXOwUXC6I0Et2A
```

**If hashes differ**, DNA sync is broken:
1. Rebuild summon DNA: `cd /home/bur1/Holochain/summon && npm run build:happ`
2. Copy to shopper: `cp ../summon/dnas/cart/workdir/cart.dna workdir/cart.dna`
3. Rebuild shopper happ: `npm run build:happ`

**Important**: Shopper app uses pre-built cart.dna (no source code), so package.json scripts use `hc app pack workdir` without `--recursive` flag.

## Testing DHT Network Sync

**Run both apps to test real-time cart synchronization:**
1. **Summon (customer app)**: `cd /home/bur1/Holochain/summon && npm run dev`
2. **Shopper app**: `cd /home/bur1/Holochain/summon-shopper-app && npm run network:android`

Both apps will join the same DHT network and cart actions will sync in real-time.

## Next Steps
- UI development for shopper workflows
- Integration with cart management features
- Mobile-specific UX optimizations
- Real-time order notifications

## Notes
- All DNA changes must be made in `../summon-dnas` repository
- Git operations for DNA code: `cd ../summon-dnas`
- This app intentionally excludes products DNA (customers browse, shoppers fulfill)

## Android USB Bridge Setup (WSL + Windows)

### Overview
The Android deployment uses USB bridging from Windows to WSL. This setup is brittle and requires specific steps after every restart.

### Initial Setup (One-time)
1. **Phone Setup**:
   - Enable Developer Options: Settings > About > Tap Build Number 7 times
   - Enable USB Debugging: Settings > Developer Options > USB Debugging
   - Enable "Disable adb authorization timeout" (prevents 7-day timeout)
2. **Windows Setup**:
   - Install usbipd: `winget install usbipd`
   - Run PowerShell as Administrator for all usbipd commands

### After Every Restart (Windows/Phone)
This must be done in **Windows PowerShell (as Administrator)**:

```powershell
# CRUCIAL COMMAND - Direct attach using hardware ID (PREFERRED METHOD)
usbipd attach --wsl --hardware-id 22b8:2e81

# Alternative: Check and bind if needed
usbipd list
# Find your device (usually BUSID 2-4, VID:PID 22b8:2e81/2e82)
# Look for "Motorola ADB Interface" or "moto g 5G - 2024"
usbipd bind --busid 2-4      # if not already bound
usbipd attach --wsl --busid 2-4
```

### Verify Connection
In WSL (inside `nix develop .#androidDev`):
```bash
# Should show your device
adb devices
```

### Troubleshooting

#### Device shows "unauthorized"
- Check phone for "Allow USB debugging?" popup
- Tap "ALLOW" and check "Always allow from this computer"
- If no popup: Settings > Developer Options > Revoke USB debugging authorizations

#### Device not detected in WSL
```powershell
# In Windows PowerShell (as Admin)
usbipd detach --busid 2-4
usbipd attach --wsl --busid 2-4
```

#### ADB daemon issues
```bash
# In WSL
adb kill-server
adb start-server
adb devices
```

#### Common States
- **"Not shared"** → Run `usbipd bind --busid 2-4`
- **"Shared (forced)"** → Run `usbipd attach --wsl --busid 2-4`
- **"Attached"** → Good, device should appear in WSL
- **"unauthorized"** → Allow USB debugging on phone

**USB Bridge**: This setup is fragile and requires manual intervention after every restart

 Current Directory Structure:

  /home/bur1/Holochain/
  ├── summon/                    # Desktop app (customer)
  │   ├── dnas -> ../summon-dnas # SYMLINK to shared DNA repo
  │   └── .git/                  # Git repo: summon
  ├── summon-shopper-app/        # Mobile app (shopper)
  │   ├── dnas -> /absolute/path/summon-dnas # SYMLINK to shared DNA repo
  │   ├── workdir/cart.dna       # COPIED from summon (for build)
  │   └── .git/                  # Git repo: summon-shopper-app
  └── summon-dnas/               # Shared DNA source code
      ├── cart/                  # Cart DNA source
      ├── products/              # Products DNA source
      └── .git/                  # Git repo: summon-dnas

  Git Repositories (3 separate repos):

  1. summon - Desktop customer app
  2. summon-shopper-app - Mobile shopper app
  3. summon-dnas - Shared DNA source code

  Why You See "dnas" in Source Control:

  The issue is that VS Code/your IDE is showing you git repositories from MULTIPLE directories. When you see "dnas" in source control, you're probably looking at the
  summon-dnas repository, not the shopper app repository.

  How the Architecture Actually Works:

  Development Workflow:

  1. DNA changes → Edit in summon-dnas/ → Commit to summon-dnas repo
  2. Summon app changes → Edit in summon/ → Commit to summon repo
  3. Shopper app changes → Edit in summon-shopper-app/ → Commit to summon-shopper-app repo

  Build Process:

  1. Summon builds DNA from symlinked summon-dnas source → Creates summon/dnas/cart/workdir/cart.dna
  2. Copy DNA to shopper → cp summon/dnas/cart/workdir/cart.dna summon-shopper-app/workdir/cart.dna
  3. Both apps use identical DNA → Same DHT network