# Summon Shopper App - Project State

## Overview
Mobile shopping app for the Summon ecosystem built with Tauri + Svelte. This is the **shopper-side** application where shoppers fulfill customer orders.

## Architecture

### DNA Configuration
- **Uses**: Cart DNA only (from shared summon-dnas repository)
- **Role**: `cart` - handles cart management and order fulfillment
- **Network**: Shares DHT with summon desktop app for real-time order sync

### Shared DNA Strategy
- **Implementation**: Symbolic link to `../summon-dnas`
- **Pattern**: `dnas -> ../summon-dnas` (entire directory symlink)
- **Benefits**: Single source of truth, instant updates, simplified development

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

## Next Steps
- UI development for shopper workflows
- Integration with cart management features
- Mobile-specific UX optimizations
- Real-time order notifications

## Notes
- All DNA changes must be made in `../summon-dnas` repository
- Git operations for DNA code: `cd ../summon-dnas`
- This app intentionally excludes products DNA (customers browse, shoppers fulfill)