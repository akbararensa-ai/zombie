import React from 'react';
import { Volume2, VolumeX, X } from 'lucide-react';
import { GameSettings, QualityLevel } from '../game/GameConfig';

interface SettingsProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onChange, onClose }) => {
  const update = <K extends keyof GameSettings>(key: K, val: GameSettings[K]) => {
    onChange({ ...settings, [key]: val });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-[#0d121b] border border-white/15 p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
          <h2 className="font-display text-lg font-bold tracking-wider text-white">SETTINGS</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Settings"
            className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 text-sm">
          {/* Graphics Quality */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="font-medium text-zinc-200">Graphics Quality</span>
              <span className="text-xs text-zinc-400">Mobile Performance Target: 30–60 FPS</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as QualityLevel[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => update('quality', q)}
                  className={`py-2.5 rounded-lg font-display font-bold uppercase text-xs border transition-colors ${
                    settings.quality === q
                      ? 'bg-orange-500 border-orange-400 text-zinc-950'
                      : 'bg-zinc-900 border-white/10 text-zinc-300 hover:border-white/25'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Camera Sensitivity */}
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="font-medium text-zinc-200">Camera Sensitivity</span>
              <span className="font-mono-num text-orange-400">
                {settings.cameraSensitivity.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.4"
              max="2.2"
              step="0.05"
              value={settings.cameraSensitivity}
              onChange={(e) => update('cameraSensitivity', parseFloat(e.target.value))}
              className="w-full accent-orange-500"
            />
          </div>

          {/* HUD Scale & Button Opacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="font-medium text-zinc-200">HUD Scale</span>
                <span className="font-mono-num text-orange-400">
                  {Math.round(settings.hudScale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.25"
                step="0.05"
                value={settings.hudScale}
                onChange={(e) => update('hudScale', parseFloat(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <span className="font-medium text-zinc-200">Button Opacity</span>
                <span className="font-mono-num text-orange-400">
                  {Math.round(settings.buttonOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.4"
                max="1.0"
                step="0.05"
                value={settings.buttonOpacity}
                onChange={(e) => update('buttonOpacity', parseFloat(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>
          </div>

          {/* Left-handed layout */}
          <div className="flex items-center justify-between py-2 border-t border-b border-white/10">
            <div>
              <div className="font-medium text-zinc-200">Left-Handed Controls</div>
              <div className="text-xs text-zinc-400">Swaps virtual joystick and fire cluster</div>
            </div>
            <button
              type="button"
              onClick={() => update('leftHanded', !settings.leftHanded)}
              className={`px-4 py-2 rounded-lg font-display text-xs font-bold ${
                settings.leftHanded
                  ? 'bg-orange-500 text-zinc-950'
                  : 'bg-zinc-800 text-zinc-300'
              }`}
            >
              {settings.leftHanded ? 'ENABLED' : 'OFF'}
            </button>
          </div>

          {/* Audio Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-200">Audio Output</span>
              <button
                type="button"
                onClick={() => update('muted', !settings.muted)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                  settings.muted
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-zinc-800 text-zinc-200'
                }`}
              >
                {settings.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>{settings.muted ? 'Muted' : 'Active'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">Master</span>
                  <span className="font-mono-num text-zinc-200">
                    {Math.round(settings.masterVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.masterVolume}
                  onChange={(e) => update('masterVolume', parseFloat(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">Ambience</span>
                  <span className="font-mono-num text-zinc-200">
                    {Math.round(settings.musicVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.musicVolume}
                  onChange={(e) => update('musicVolume', parseFloat(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">SFX</span>
                  <span className="font-mono-num text-zinc-200">
                    {Math.round(settings.sfxVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={(e) => update('sfxVolume', parseFloat(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-zinc-950 font-display font-bold text-sm tracking-wider"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
