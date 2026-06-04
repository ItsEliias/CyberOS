// CredVault — useCredVaultStore
// Zustand store matching the spec interface exactly.
// Re-exports from store/index.ts so the spec-named path is always available.

export { useStore as useCredVaultStore, type View as ActiveView } from '../store/index'
export type { Store as CredVaultState } from '../store/index'
