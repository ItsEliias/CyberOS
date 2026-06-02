import { useState } from 'react';
import type { Session } from '@shared/types';

interface SessionSetupProps {
  onStart: (opts: Partial<Session>) => void;
}

export default function SessionSetup({ onStart }: SessionSetupProps) {
  const [labName, setLabName] = useState('');
  const [platform, setPlatform] = useState<'HTB'|'THM'|'CTF'|'Other'>('HTB');
  const [difficulty, setDifficulty] = useState<'Easy'|'Medium'|'Hard'|'Insane'|''>('Medium');
  const [labType, setLabType] = useState('HTB/THM Linux');
  const [ip, setIp] = useState('');
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMins, setTimerMins] = useState(120);

  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="w-[480px] panel p-6">
        <h2 className="text-base font-semibold text-[var(--accent)] mb-4">New Session</h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="input-group col-span-2">
            <label>Lab / Machine Name</label>
            <input
              type="text"
              value={labName}
              onChange={e => setLabName(e.target.value)}
              placeholder="e.g. Lame, Mr Robot"
              className="w-full"
            />
          </div>
          <div className="input-group">
            <label>Platform</label>
            <select value={platform} onChange={e => setPlatform(e.target.value as never)} className="w-full">
              {['HTB','THM','CTF','Other'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value as never)} className="w-full">
              {['Easy','Medium','Hard','Insane'].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="input-group col-span-2">
            <label>Lab Type</label>
            <select value={labType} onChange={e => setLabType(e.target.value)} className="w-full">
              {['HTB/THM Linux','HTB/THM Windows','CTF','Cisco/Networking','Web App','OSINT/CTF','Other'].map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="input-group col-span-2">
            <label>Target IP (optional)</label>
            <input
              type="text"
              value={ip}
              onChange={e => setIp(e.target.value)}
              placeholder="10.10.10.x"
              className="w-full font-mono"
            />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <input
              type="checkbox"
              checked={timerEnabled}
              onChange={e => setTimerEnabled(e.target.checked)}
              id="timer-cb"
            />
            <label htmlFor="timer-cb" className="text-sm text-[var(--text-dim)] cursor-pointer">
              Exam Mode (timer)
            </label>
            {timerEnabled && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={timerMins}
                  onChange={e => setTimerMins(parseInt(e.target.value) || 120)}
                  className="w-20 text-sm"
                  min={10}
                  max={600}
                />
                <span className="text-xs text-[var(--text-muted)]">mins</span>
              </div>
            )}
          </div>
        </div>
        <button
          className="btn-accent w-full py-2.5"
          onClick={() => onStart({
            name: labName || 'New Session',
            labName: labName || 'New Session',
            platform,
            difficulty,
            labType: labType as never,
            ip,
            timerEnabled,
            timerMins,
          })}
        >
          Start Session
        </button>
      </div>
    </div>
  );
}
