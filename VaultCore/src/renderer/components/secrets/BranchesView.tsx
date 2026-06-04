// Feature 3: Branch comparison view
import { useSecretStore } from '../../stores/useSecretStore';
import { BranchDiff } from './GitDiffViewer';

export default function BranchesView() {
  const { repos, activeRepoId } = useSecretStore();
  const activeRepo = repos.find(r => r.id === activeRepoId);

  if (!activeRepo) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8">
        <div className="text-4xl mb-3" style={{ opacity: 0.2 }}>⌥</div>
        <div className="text-sm font-medium mb-1" style={{ color: '#8b949e' }}>No repository selected</div>
        <div className="text-[11px]" style={{ color: '#4a5568' }}>
          Add and select a repository in the Repositories view first
        </div>
      </div>
    );
  }

  if (activeRepo.branches.length < 2) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-8">
        <div className="text-4xl mb-3" style={{ opacity: 0.2 }}>⌥</div>
        <div className="text-sm font-medium mb-1" style={{ color: '#8b949e' }}>Not enough branches</div>
        <div className="text-[11px]" style={{ color: '#4a5568' }}>
          Repository "{activeRepo.name}" needs at least 2 branches to compare
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-5 py-3 border-b shrink-0 flex items-center gap-3"
        style={{ borderColor: '#2a3347' }}>
        <div>
          <div className="text-sm font-semibold" style={{ color: '#e6edf3' }}>Branch Comparison</div>
          <div className="text-[11px]" style={{ color: '#8b949e' }}>
            {activeRepo.name} · {activeRepo.branches.length} branches
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <BranchDiff repoPath={activeRepo.path} branches={activeRepo.branches} />
      </div>
    </div>
  );
}
