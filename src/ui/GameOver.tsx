import React from 'react';
import { Home, RotateCcw, Trophy } from 'lucide-react';
import { GameOverStats } from '../game/GameState';

interface GameOverProps {
  stats: GameOverStats;
  onRestart: () => void;
  onMainMenu: () => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const GameOver: React.FC<GameOverProps> = ({ stats, onRestart, onMainMenu }) => {
  const rows = [
    { label: 'Highest Wave', value: String(stats.highestWave) },
    { label: 'Zombies Defeated', value: String(stats.kills) },
    { label: 'Shots Fired', value: String(stats.shotsFired) },
    { label: 'Accuracy', value: `${stats.accuracy}%` },
    { label: 'Survival Time', value: formatDuration(stats.survivalTime) },
    { label: 'Final Score', value: stats.score.toLocaleString() }
  ];

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-xl bg-[#0d121b] border border-red-500/30 p-6 shadow-2xl">
        <div className="text-center mb-5">
          <div className="text-xs font-mono-num tracking-widest text-red-400 mb-1">
            TERMINAL OVERRUN
          </div>
          <h2 className="font-display text-3xl font-bold tracking-wider text-white">GAME OVER</h2>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-amber-300 font-mono-num">
            <Trophy className="w-4 h-4" />
            <span>
              {stats.isNewRecord
                ? `NEW RECORD: ${stats.highScore.toLocaleString()}`
                : `High Score: ${stats.highScore.toLocaleString()} (Wave ${stats.bestWave})`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {rows.map((r) => (
            <div
              key={r.label}
              className="rounded-lg bg-zinc-900/90 border border-white/10 px-3 py-2.5"
            >
              <div className="text-[11px] text-zinc-400">{r.label}</div>
              <div className="font-mono-num text-base font-bold text-white mt-0.5">{r.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="flex items-center justify-center gap-2 py-3 rounded-lg bg-orange-500 hover:bg-orange-400 text-zinc-950 font-display font-bold text-sm tracking-wider"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART</span>
          </button>

          <button
            type="button"
            onClick={onMainMenu}
            className="flex items-center justify-center gap-2 py-3 rounded-lg bg-zinc-900 border border-white/15 hover:border-white/30 text-zinc-100 font-display font-bold text-sm tracking-wider"
          >
            <Home className="w-4 h-4" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
