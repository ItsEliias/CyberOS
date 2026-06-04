// Feature 9: Multiple repository tabs
import { useSecretStore } from '../../stores/useSecretStore';

export default function RepoTabBar() {
  const { repos, activeRepoId, setActiveRepo, removeRepo, addRepo } = useSecretStore();

  async function handleAdd() {
    const p = await window.electronAPI.selectFolder();
    if (!p) return;
    const name = p.split('/').pop() ?? 'Repo';
    const existing = repos.find((r) => r.path === p);
    if (existing) { setActiveRepo(existing.id); return; }

    const [branchRes, currentRes] = await Promise.all([
      window.electronAPI.gitBranches(p),
      window.electronAPI.gitCurrentBranch(p),
    ]);

    const repo = addRepo({
      name,
      path: p,
      currentBranch: currentRes.branch ?? 'main',
      branches: branchRes.branches ?? [],
      secretCount: 0,
    });
    setActiveRepo(repo.id);
  }

  return (
    <div className="flex items-center gap-0 border-b overflow-x-auto shrink-0"
      style={{ background: '#0a0a0f', borderColor: '#2a3347', scrollbarWidth: 'none' }}>
      {repos.map((repo) => (
        <div key={repo.id} className="flex items-center shrink-0">
          <button
            onClick={() => setActiveRepo(repo.id)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs transition-all border-b-2"
            style={{
              borderBottomColor: activeRepoId === repo.id ? '#3fb950' : 'transparent',
              background: activeRepoId === repo.id ? 'rgba(63,185,80,0.06)' : 'transparent',
              color: activeRepoId === repo.id ? '#e6edf3' : '#8b949e',
            }}>
            <span className="font-medium truncate max-w-32">{repo.name}</span>
            <span className="font-mono text-[10px]"
              style={{ color: activeRepoId === repo.id ? '#3fb950' : '#4a5568' }}>
              {repo.currentBranch}
            </span>
            {repo.secretCount > 0 && (
              <span className="text-[9px] px-1.5 rounded-full"
                style={{ background: 'rgba(248,81,73,0.15)', color: '#f85149' }}>
                {repo.secretCount}
              </span>
            )}
          </button>
          {repos.length > 1 && (
            <button
              onClick={() => removeRepo(repo.id)}
              className="px-1.5 py-1 text-xs transition-all hover:bg-white/10 mr-1 rounded"
              style={{ color: '#4a5568' }}
              title="Remove repo">×</button>
          )}
        </div>
      ))}

      {repos.length < 8 && (
        <button onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-2.5 text-xs transition-all shrink-0 hover:bg-white/5"
          style={{ color: '#8b949e' }}>
          <span>+</span>
          <span>Add Repo</span>
        </button>
      )}
    </div>
  );
}
