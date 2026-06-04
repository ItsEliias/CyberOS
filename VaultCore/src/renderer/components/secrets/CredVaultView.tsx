// Feature 8: CredVault bidirectional sync view wrapper
import CredVaultSync from './CredVaultSync';
import { useSecretStore } from '../../stores/useSecretStore';

export default function CredVaultView() {
  const { repos, activeRepoId } = useSecretStore();
  const activeRepo = repos.find(r => r.id === activeRepoId);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-lg mx-auto px-5 py-6">
        <div className="mb-6">
          <div className="text-sm font-semibold" style={{ color: '#e6edf3' }}>CredVault Sync</div>
          <div className="text-[11px] mt-0.5" style={{ color: '#8b949e' }}>
            Bidirectional sync with the GhostVault / CredVault ecosystem app
          </div>
          {activeRepo && (
            <div className="text-[10px] mt-1 font-mono" style={{ color: '#4a5568' }}>
              Active repo: {activeRepo.name}
            </div>
          )}
        </div>
        <CredVaultSync />
      </div>
    </div>
  );
}
