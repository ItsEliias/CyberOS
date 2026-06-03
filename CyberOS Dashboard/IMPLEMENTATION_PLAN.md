# CyberOS Dashboard — Implementation Plan

This document outlines the implementation strategy, file changes, and migration steps for upgrading the CyberOS Dashboard from a single-screen v1 application to the v2 multi-screen unified ecosystem monitor, as specified in the `01_CyberOS_Dashboard.md` prompt and `CYBEROS_DESIGN_BIBLE.md`.

## 1. Overview of Changes

The v2 implementation transforms the Dashboard into a robust, multi-view control plane capable of monitoring all 12 ecosystem applications. The key architectural shifts include:
- **Multi-Screen Layout:** Moving from a single page to a sidebar-navigated application with Dashboard, Profile, Ecosystem, and Settings views.
- **Enhanced Data Models:** Expanding the TypeScript definitions to strongly type all 12 applications and both the new and legacy event schemas.
- **Robust IPC & Watchers:** Implementing `fs.watch` for real-time config and event updates, replacing basic polling where possible, while keeping debounced fallbacks.
- **Design Bible Compliance:** Adopting the strict color palette, typography (JetBrains Mono), and component aesthetics defined in the CYBEROS_DESIGN_BIBLE.md.

## 2. File Manifest

### 2.1. Files Created (New Architecture)

**Store & State Management**
- `src/renderer/stores/useDashboardStore.ts`: Primary Zustand store managing config, events, alerts, active view, and settings.
- `src/renderer/types/ecosystem.ts`: Comprehensive type definitions for all 12 apps, shared context, and events.

**Hooks & Utilities**
- `src/renderer/hooks/useConfigWatcher.ts`: Manages config polling and push updates.
- `src/renderer/hooks/useEventFeed.ts`: Manages event feed subscriptions.
- `src/renderer/utils/configParser.ts`: Builds the 12 App Cards from the raw config.
- `src/renderer/utils/eventParser.ts`: Normalizes the legacy and new event schemas.
- `src/renderer/utils/alertEngine.ts`: Evaluates system state to generate warnings (e.g., offline apps, stale events).
- `src/renderer/utils/timeAgo.ts`: Time formatting and streak calculations.

**Layout Components**
- `src/renderer/components/layout/TitleBar.tsx`: Custom frameless macOS-style title bar.
- `src/renderer/components/layout/Sidebar.tsx`: Navigation sidebar with active session context strip.
- `src/renderer/components/layout/StatusBar.tsx`: Bottom bar with VPN and UTC time.

**Dashboard View Components**
- `src/renderer/components/dashboard/ActiveSessionBanner.tsx`: Shows current lab context.
- `src/renderer/components/dashboard/OperatorProfileCard.tsx`: Mini profile card with stats.
- `src/renderer/components/dashboard/SkillRadar.tsx`: Animated SVG spider chart.
- `src/renderer/components/dashboard/EcosystemHealthBar.tsx`: 12-dot health indicator.
- `src/renderer/components/dashboard/AppStatusGrid.tsx`: 3x4 grid container.
- `src/renderer/components/dashboard/AppStatusCard.tsx`: Individual app card.
- `src/renderer/components/dashboard/ActivityFeed.tsx`: Live scrolling event feed.

**Profile View Components**
- `src/renderer/components/profile/StatsRow.tsx`: 4 metric cards.
- `src/renderer/components/profile/StreakCalendar.tsx`: GitHub-style activity heatmap.
- `src/renderer/components/profile/SkillRadarLarge.tsx`: Full-size radar chart.
- `src/renderer/components/profile/LabHistoryTable.tsx`: Sortable lab history.

**Ecosystem View Components**
- `src/renderer/components/ecosystem/ConfigInspector.tsx`: Config file health.
- `src/renderer/components/ecosystem/AppStatusTable.tsx`: Detailed table of all 12 apps.
- `src/renderer/components/ecosystem/EventLog.tsx`: Searchable full event log.
- `src/renderer/components/ecosystem/SharedContextInspector.tsx`: Live shared context viewer.

**Settings View**
- `src/renderer/views/SettingsView.tsx`: User preferences and config paths.

**Shared Components**
- `src/renderer/components/shared/MetricCard.tsx`, `StatusBadge.tsx`, `TimeAgo.tsx`, `Toast.tsx`.

### 2.2. Files Modified

- `src/main/main.ts`: Updated to support larger default window size and register new IPC handlers.
- `src/main/ipc/dashboard.ts`: (New file) Extracted IPC handlers for config reading, app launching, and file watching.
- `src/main/preload.ts`: Expanded the contextBridge to include `startWatching`, `onConfigChanged`, and `onEventsChanged`.
- `src/shared/types.ts`: Updated to mirror `ecosystem.ts` for main process usage.
- `src/renderer/App.tsx`: Completely rewritten to act as the router/layout wrapper for the new multi-screen architecture.
- `src/renderer/globals.css`: Updated with Design Bible global styles, scrollbars, and selection colors.
- `tailwind.config.js`: Updated with the exact Design Bible color tokens.
- `src/renderer/index.html`: Added JetBrains Mono font import.
- `src/renderer/env.d.ts`: Updated type definitions for the expanded `window.electronAPI`.

## 3. Migration Strategy

The new code has been written alongside the old v1 code to ensure a safe transition.

1. **Build Verification:** Run `npm run build` or `npm run typecheck` to ensure the new TypeScript definitions and components compile without errors.
2. **Cleanup:** Once validated, the old v1 components in `src/renderer/components/` (e.g., `Header.tsx`, `Footer.tsx`, old `AppCard.tsx`) and the old store (`src/renderer/store/index.ts`) can be safely deleted.
3. **Execution:** Run `npm start` to launch the electron-vite development server and verify the UI renders correctly.

## 4. Validation Steps

To confirm the implementation meets all requirements:
1. **Design Bible Compliance:** Verify the background is `#0a0a0f`, panels are `#12131a`, and the accent color is `#4a9eff`. Verify the typography uses Inter and JetBrains Mono.
2. **Multi-Screen Navigation:** Click through the Sidebar to ensure Dashboard, Profile, Ecosystem, and Settings views render correctly.
3. **Data Parsing:** Ensure all 12 apps appear in the AppStatusGrid and EcosystemHealthBar.
4. **Event Handling:** Verify the Activity Feed populates and auto-scrolls. Check that legacy events (`appName`/`eventType`) and new events (`app`/`event`) both display correctly.
5. **Animations:** Verify the Skill Radar draws from the center on mount, and the Active Session Banner slides down smoothly.
6. **Graceful Failure:** Temporarily rename `~/cybertools-config.json` to test the error boundary state. It should show a clean error message rather than crashing.
