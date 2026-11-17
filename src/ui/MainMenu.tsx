import React, { useState } from 'react';
import { BookOpen, Crosshair, Map as MapIcon, Play, Settings as SettingsIcon, X } from 'lucide-react';
import {
  AIRPORT_ZONES,
  loadHighScore,
  WEAPON_ORDER,
  WEAPONS,
  WeaponId
} from '../game/GameConfig';

interface MainMenuProps {
  startWeapon: WeaponId;
  onSelectStartWeapon: (w: WeaponId) => void;
  onPlay: () => void;
  onOpenSettings: () => void;
}

type SubPanel = 'none' | 'map' | 'loadout' | 'howto';

export const MainMenu: React.FC<MainMenuProps> = ({
  startWeapon,
  onSelectStartWeapon,
  onPlay,
  onOpenSettings
}) => {
  const [panel, setPanel] = useState<SubPanel>('none');
  const best = loadHighScore();

  return (
    <div className="fixed inset-0 z-30 safe-pad flex items-center justify-between p-4 sm:p-8 lg:p-12 pointer-events-none">
      {/* Subtle left contrast scrim over live 3D airport */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(8,11,17,0.88) 0%, rgba(8,11,17,0.52) 45%, rgba(8,11,17,0.12) 100%)'
        }}
      />

      {/* Left Main Navigation Column */}
      <div className="relative z-10 pointer-events-auto flex flex-col justify-between max-w-md w-full h-full max-h-[540px]">
        <div>
          {/* Bespoke SVG Title Lockup */}
          <svg
            viewBox="0 0 380 86"
            className="w-72 sm:w-88 h-auto mb-2"
            role="img"
            aria-label="OUTBREAK: LAST EXIT"
          >
            <rect x="0" y="6" width="6" height="70" fill="#f97316" />
            <text
              x="18"
              y="44"
              fill="#f8fafc"
              fontFamily="'Chakra Petch', sans-serif"
              fontWeight="700"
              fontSize="40"
              letterSpacing="3"
            >
              OUTBREAK
            </text>
            <text
              x="20"
              y="72"
              fill="#f59e0b"
              fontFamily="'JetBrains Mono', monospace"
              fontWeight="700"
              fontSize="18"
              letterSpacing="6"
            >
              LAST EXIT
            </text>
          </svg>

          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-6">
            <span>Abandoned International Airport</span>
            <span aria-hidden="true">·</span>
            <span>Wave Survival FPS</span>
            {best.highScore > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num text-amber-400">
                  Best {best.highScore.toLocaleString()} (W{best.bestWave})
                </span>
              </>
            )}
          </div>

          {/* Primary Menu Buttons */}
          <div className="flex flex-col gap-2.5 max-w-xs">
            <button
              type="button"
              onClick={onPlay}
              className="flex items-center justify-between px-5 py-3.5 rounded-lg bg-orange-500 hover:bg-orange-400 active:scale-[0.99] text-zinc-950 font-display font-bold text-base tracking-wider transition-all shadow-lg"
            >
              <span className="flex items-center gap-2.5">
                <Play className="w-5 h-5 fill-current" />
                <span>PLAY</span>
              </span>
              <span className="text-xs font-mono-num opacity-80">{WEAPONS[startWeapon].shortName}</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPanel(panel === 'map' ? 'none' : 'map')}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-display font-bold tracking-wider transition-colors ${
                  panel === 'map'
                    ? 'bg-zinc-800 border-orange-500 text-orange-300'
                    : 'bg-[#0d121b]/85 border-white/15 hover:border-white/30 text-zinc-100'
                }`}
              >
                <MapIcon className="w-4 h-4 text-orange-400" />
                <span>MAP</span>
              </button>

              <button
                type="button"
                onClick={() => setPanel(panel === 'loadout' ? 'none' : 'loadout')}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-display font-bold tracking-wider transition-colors ${
                  panel === 'loadout'
                    ? 'bg-zinc-800 border-orange-500 text-orange-300'
                    : 'bg-[#0d121b]/85 border-white/15 hover:border-white/30 text-zinc-100'
                }`}
              >
                <Crosshair className="w-4 h-4 text-orange-400" />
                <span>LOADOUT</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center gap-2 px-4 py-3 rounded-lg bg-[#0d121b]/85 border border-white/15 hover:border-white/30 text-zinc-100 text-sm font-display font-bold tracking-wider transition-colors"
              >
                <SettingsIcon className="w-4 h-4 text-orange-400" />
                <span>SETTINGS</span>
              </button>

              <button
                type="button"
                onClick={() => setPanel(panel === 'howto' ? 'none' : 'howto')}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-display font-bold tracking-wider transition-colors ${
                  panel === 'howto'
                    ? 'bg-zinc-800 border-orange-500 text-orange-300'
                    : 'bg-[#0d121b]/85 border-white/15 hover:border-white/30 text-zinc-100'
                }`}
              >
                <BookOpen className="w-4 h-4 text-orange-400" />
                <span>HOW TO PLAY</span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-xs text-zinc-400 hidden sm:block">
          Mobile Landscape Touch · PC Mouse + WASD · Survive Endless Waves
        </div>
      </div>

      {/* Contextual Right Sub-Panel (Map / Loadout / How To Play) */}
      {panel !== 'none' && (
        <div className="relative z-20 pointer-events-auto w-full max-w-lg max-h-[84vh] overflow-y-auto rounded-xl bg-[#0d121b]/95 border border-white/15 p-5 shadow-2xl ml-4">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
            <h3 className="font-display text-base font-bold tracking-wider text-orange-400">
              {panel === 'map'
                ? 'AIRPORT SECTOR INTEL'
                : panel === 'loadout'
                  ? 'STARTING LOADOUT'
                  : 'SURVIVAL BRIEFING'}
            </h3>
            <button
              type="button"
              onClick={() => setPanel('none')}
              aria-label="Close Panel"
              className="w-8 h-8 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {panel === 'map' && (
            <div className="space-y-3 text-sm">
              {AIRPORT_ZONES.map((z) => (
                <div key={z.id} className="pb-3 border-b border-white/10 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-display font-bold text-white">
                      Zone {z.id} · {z.name}
                    </span>
                    <span className="text-xs text-amber-400">{z.boundsLabel}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{z.description}</p>
                </div>
              ))}
            </div>
          )}

          {panel === 'loadout' && (
            <div className="space-y-3">
              {WEAPON_ORDER.map((id) => {
                const w = WEAPONS[id];
                const selected = startWeapon === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectStartWeapon(id)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-colors ${
                      selected
                        ? 'bg-orange-500/15 border-orange-400'
                        : 'bg-zinc-900/80 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-display font-bold text-white">{w.name}</span>
                      <span className="text-xs font-mono-num text-orange-400">
                        {selected ? 'EQUIPPED' : `MAG ${w.magSize} / ${w.startReserve}`}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mb-2">{w.description}</p>
                    <div className="flex items-center gap-4 text-[11px] font-mono-num text-zinc-300">
                      <span>DMG {w.pellets > 1 ? `${w.damage}x${w.pellets}` : w.damage}</span>
                      <span>RATE {w.fireRate}/s</span>
                      <span>{w.automatic ? 'FULL AUTO' : 'SEMI'}</span>
                    </div>
                  </button>
                );
              })}
              <p className="text-xs text-zinc-400 pt-1">
                All three weapons are carried in combat — switch freely anytime with the Switch button or keys 1–3.
              </p>
            </div>
          )}

          {panel === 'howto' && (
            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
              <div>
                <div className="font-display font-bold text-white mb-1">MOBILE TOUCH (LANDSCAPE)</div>
                <p className="text-zinc-400">
                  Use the bottom-left virtual joystick to move and the Sprint button to dash. Drag anywhere on the right side to aim, hold FIRE for automatic rifle fire, and use Jump, Reload, Interact, and Backpack quick-slots simultaneously with multi-touch.
                </p>
              </div>
              <div>
                <div className="font-display font-bold text-white mb-1">PC BROWSER CONTROLS</div>
                <p className="text-zinc-400">
                  Click the viewport to lock mouse · WASD Move · Shift Sprint · Space Jump · Left Click Fire · R Reload · Q or 1/2/3 Switch Weapon · E Interact · F Flashlight · G Grenade · H Medkit · Tab Inventory · Esc Pause.
                </p>
              </div>
              <div>
                <div className="font-display font-bold text-white mb-1">WAVE SURVIVAL</div>
                <p className="text-zinc-400">
                  Eliminate infected waves across the terminal and apron. Wave 5 unleashes a Mini-Boss and Wave 10 brings the Apex Boss before endless survival begins. Use the 12-second prep breaks to open supply crates, activate the corridor generator, and heal.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
