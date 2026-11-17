import React from 'react';
import { Home, Play, RotateCcw, Settings as SettingsIcon } from 'lucide-react';

interface PauseMenuProps {
  wave: number;
  score: number;
  onResume: () => void;
  onOpenSettings: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  wave,
  score,
  onResume,
  onOpenSettings,
  onRestart,
  onMainMenu
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-sm rounded-xl bg-[#0d121b] border border-white/15 p-6 shadow-2xl">
        <div className="text-center mb-5">
          <h2 className="font-display text-2xl font-bold tracking-wider text-white">PAUSED</h2>
          <div className="text-xs text-zinc-400 mt-1 font-mono-num">
            Wave {wave} · Score {score.toLocaleString()}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="flex items-center justify-center gap-2 py-3 rounded-lg bg-orange-500 hover:bg-orange-400 text-zinc-950 font-display font-bold text-sm tracking-wider"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center justify-center gap-2 py-3 rounded-lg bg-zinc-900 border border-white/15 hover:border-white/30 text-zinc-100 font-display font-bold text-sm tracking-wider"
          >
            <SettingsIcon className="w-4 h-4 text-orange-400" />
            <span>SETTINGS</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="flex items-center justify-center gap-2 py-3 rounded-lg bg-zinc-900 border border-white/15 hover:border-white/30 text-zinc-100 font-display font-bold text-sm tracking-wider"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>RESTART</span>
          </button>

          <button
            type="button"
            onClick={onMainMenu}
            className="flex items-center justify-center gap-2 py-3 rounded-lg bg-zinc-900 border border-white/10 hover:border-red-400/40 text-zinc-300 font-display font-bold text-sm tracking-wider"
          >
            <Home className="w-4 h-4" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
