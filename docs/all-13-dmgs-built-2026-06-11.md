# All 13 polished CyberOS DMGs

Built: 2026-06-11 — cyberos-dmg-builder agent
Boot-fix applied (working-tree overlay, not committed) for: NetworkMap, CredVault, GhostVault, PlaybookStudio, Cyberlab Companion.
NetLab: already had correct imports on the polish branch — fix commit had no NetLab files; built clean without overlay.
All overlays reverted after build. Working tree clean on exit.

| App | Branch | DMG path | Build status |
|---|---|---|---|
| Cybertools Launcher | ui/cybertools-launcher-shadcn-pilot | `Cybertools Launcher/dist/CyberTools Launcher-1.0.0-arm64.dmg` | PASS |
| Cyberlab Companion | ui/cyberlab-companion-redesign | `Cyberlab Companion/dist/CyberLab Companion-1.0.0-arm64.dmg` | PASS (boot-fix overlay applied) |
| SignalBoard | ui/signalboard-polish | `SignalBoard/dist/SignalBoard-1.0.0-arm64.dmg` | PASS |
| ReportForge | ui/reportforge-polish | `ReportForge/dist/ReportForge-1.0.0-arm64.dmg` | PASS |
| VaultCore | ui/vaultcore-polish | `VaultCore/dist/VaultCore-1.0.0-arm64.dmg` | PASS |
| ReconDesk | ui/recondesk-polish | `ReconDesk/dist/ReconDesk-1.0.0-arm64.dmg` | PASS |
| CredVault | ui/credvault-polish | `CredVault/dist/CredVault-1.0.0-arm64.dmg` | PASS (boot-fix overlay applied) |
| GhostVault | ui/ghostvault-polish | `GhostVault/dist/GhostVault-1.0.0-arm64.dmg` | PASS (boot-fix overlay applied) |
| NetworkMap | ui/networkmap-polish | `NetworkMap/dist/NetworkMap-1.0.0-arm64.dmg` | PASS (boot-fix overlay applied) |
| PlaybookStudio | ui/playbookstudio-polish | `PlaybookStudio/dist/PlaybookStudio-1.0.0-arm64.dmg` | PASS (boot-fix overlay applied) |
| NetLab | ui/netlab-polish | `NetLab/dist/NetLab-1.0.0-arm64.dmg` | PASS |
| TerminalLink | ui/terminallink-polish | `TerminalLink/dist/TermLink-1.0.0-arm64.dmg` | PASS |
| CyberOS Dashboard | ui/cyberos-dashboard-polish | `CyberOS Dashboard/dist/CyberOS Dashboard-2.0.0-arm64.dmg` | PASS |

Note: TerminalLink's DMG filename is `TermLink-1.0.0-arm64.dmg` (matches the `productName` in its package.json).
Note: CyberOS Dashboard version is 2.0.0 (matches its package.json).

## Install (operator runs in Terminal from /Users/codyliddell/Documents/Claude/Projects/CyberOS)

```bash
BASE="/Users/codyliddell/Documents/Claude/Projects/CyberOS"

# Mount + copy each DMG to /Applications/
for entry in \
  "Cybertools Launcher/dist/CyberTools Launcher-1.0.0-arm64.dmg" \
  "Cyberlab Companion/dist/CyberLab Companion-1.0.0-arm64.dmg" \
  "SignalBoard/dist/SignalBoard-1.0.0-arm64.dmg" \
  "ReportForge/dist/ReportForge-1.0.0-arm64.dmg" \
  "VaultCore/dist/VaultCore-1.0.0-arm64.dmg" \
  "ReconDesk/dist/ReconDesk-1.0.0-arm64.dmg" \
  "CredVault/dist/CredVault-1.0.0-arm64.dmg" \
  "GhostVault/dist/GhostVault-1.0.0-arm64.dmg" \
  "NetworkMap/dist/NetworkMap-1.0.0-arm64.dmg" \
  "PlaybookStudio/dist/PlaybookStudio-1.0.0-arm64.dmg" \
  "NetLab/dist/NetLab-1.0.0-arm64.dmg" \
  "TerminalLink/dist/TermLink-1.0.0-arm64.dmg" \
  "CyberOS Dashboard/dist/CyberOS Dashboard-2.0.0-arm64.dmg"; do
  dmg="$BASE/$entry"
  echo "Mounting: $dmg"
  mountpoint=$(hdiutil attach "$dmg" -nobrowse -quiet | awk 'END {print $NF}')
  if [ -n "$mountpoint" ]; then
    app=$(ls "$mountpoint"/*.app 2>/dev/null | head -1)
    if [ -n "$app" ]; then
      appname=$(basename "$app")
      cp -R "$app" /Applications/
      echo "  Installed: $appname"
    fi
    hdiutil detach "$mountpoint" -quiet
  fi
done
```

## Launch all 13 (operator runs after install)

```bash
for app in \
  "CyberTools Launcher.app" \
  "CyberLab Companion.app" \
  "SignalBoard.app" \
  "ReportForge.app" \
  "VaultCore.app" \
  "ReconDesk.app" \
  "CredVault.app" \
  "GhostVault.app" \
  "NetworkMap.app" \
  "PlaybookStudio.app" \
  "NetLab.app" \
  "TermLink.app" \
  "CyberOS Dashboard.app"; do
  open -n "/Applications/$app"
done
```
