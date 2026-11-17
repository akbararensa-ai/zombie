import React from 'react';
import { Pause, Shield, Heart } from 'lucide-react';
import { GameSettings } from '../game/GameConfig';
import { HUDState } from '../game/GameState';

interface GameHUDProps {
  hud: HUDState;
  settings: GameSettings;
  onPause: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const GameHUD: React.FC<GameHUDProps> = ({ hud, settings, onPause }) => {
  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const armorPct = Math.max(0, Math.min(100, (hud.armor / hud.maxArmor) * 100));
  const hpLow = hud.hp <= 30;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 safe-pad flex flex-col justify-between">
      {/* Damage edge vignette */}
      {hud.damageFlash > 0.02 && (
        <div
          className="pointer-events-none fixed inset-0"
          style={{
            background:
              'radial-gradient(circle at center, transparent 52%, rgba(220, 38, 38, 0.65) 100%)',
            opacity: hud.damageFlash
          }}
        />
      )}

      {/* TOP BAR: Edge-aligned minimal clusters */}
      <div
        className="flex items-start justify-between px-3 pt-2 sm:px-5 sm:pt-3 gap-2"
        style={{ transform: `scale(${settings.hudScale})`, transformOrigin: 'top center' }}
      >
        {/* TOP LEFT: HP, Armor & Pause */}
        <div className="flex items-center gap-2.5 bg-[#0b0f17]/75 border border-white/10 rounded-lg px-2.5 py-2">
          <button
            type="button"
            onClick={onPause}
            aria-label="Pause Game"
            className="pointer-events-auto flex items-center justify-center w-9 h-9 rounded-md bg-white/10 hover:bg-orange-500/30 active:scale-95 text-zinc-100 transition-colors"
          >
            <Pause className="w-4 h-4" />
          </button>

          <div className="flex flex-col gap-1.5 min-w-[118px] sm:min-w-[148px]">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1 font-display font-bold tracking-wider text-zinc-200">
                <Heart className={`w-3.5 h-3.5 ${hpLow ? 'text-red-400' : 'text-emerald-400'}`} />
                HP
              </span>
              <span className={`font-mono-num font-bold ${hpLow ? 'text-red-400' : 'text-white'}`}>
                {hud.hp}
              </span>
            </div>
            <div className="h-2 w-full bg-zinc-800 rounded-sm overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${
                  hpLow ? 'bg-red-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${hpPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="flex items-center gap-1 text-sky-300 font-medium">
                <Shield className="w-3 h-3" />
                ARMOR
              </span>
              <span className="font-mono-num text-sky-200">{hud.armor}</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-sm overflow-hidden">
              <div
                className="h-full bg-sky-400 transition-all duration-150"
                style={{ width: `${armorPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* TOP CENTER: Wave & Remaining */}
        <div className="flex flex-col items-center bg-[#0b0f17]/75 border border-white/10 rounded-lg px-3.5 py-1.5 text-center">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-display font-bold tracking-wider text-orange-400">
            <span>WAVE {hud.wave}</span>
            <span className="text-zinc-500">/</span>
            <span className="text-zinc-100 font-mono-num">
              {hud.wavePhase === 'PREP_BREAK'
                ? `NEXT IN ${hud.prepCountdown}s`
                : `${hud.zombiesRemaining} LEFT`}
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 whitespace-nowrap">{hud.waveTitle}</div>
        </div>

        {/* TOP RIGHT: Score, Timer, Zone */}
        <div className="flex flex-col items-end bg-[#0b0f17]/75 border border-white/10 rounded-lg px-3 py-1.5 text-right">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm">
            <span className="font-mono-num font-bold text-amber-400">
              {hud.score.toLocaleString()}
            </span>
            <span className="text-zinc-600">·</span>
            <span className="font-mono-num text-zinc-200">{formatTime(hud.survivalTime)}</span>
          </div>
          <div className="text-[11px] text-zinc-400 whitespace-nowrap">{hud.zoneName}</div>
        </div>
      </div>

      {/* CENTER: Crosshair, Hit Marker, Scanner Ring, Announcement */}
      <div className="relative flex-1 flex items-center justify-center">
        {hud.announcement && (
          <div className="absolute top-6 px-4 py-1.5 rounded bg-[#0b0f17]/85 border border-orange-500/40 font-display text-xs sm:text-sm font-bold tracking-widest text-orange-300">
            {hud.announcement}
          </div>
        )}

        {/* Bio-scanner directional pips */}
        {hud.scannerActive && (
          <div className="absolute w-44 h-44 rounded-full border border-amber-400/35 pointer-events-none">
            {hud.scannerBlips.map((b, idx) => {
              const r = Math.min(82, (b.distance / 45) * 82);
              const x = Math.sin(b.angleRad) * r;
              const y = -Math.cos(b.angleRad) * r;
              return (
                <div
                  key={idx}
                  className={`absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 ${
                    b.isBoss ? 'bg-red-500 w-3 h-3' : 'bg-amber-400'
                  }`}
                  style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
                />
              );
            })}
          </div>
        )}

        {/* Crosshair */}
        <div className="relative w-7 h-7 flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-white/95" />
          <div className="absolute top-0 w-[2px] h-2 bg-white/80" />
          <div className="absolute bottom-0 w-[2px] h-2 bg-white/80" />
          <div className="absolute left-0 h-[2px] w-2 bg-white/80" />
          <div className="absolute right-0 h-[2px] w-2 bg-white/80" />

          {/* Hit marker X */}
          {hud.hitMarkerTimer > 0 && (
            <svg
              viewBox="0 0 24 24"
              className={`absolute inset-0 w-7 h-7 ${
                hud.hitMarkerCrit ? 'text-orange-400' : 'text-white'
              }`}
              stroke="currentColor"
              strokeWidth="2.4"
            >
              <line x1="4" y1="4" x2="9" y2="9" />
              <line x1="20" y1="4" x2="15" y2="9" />
              <line x1="4" y1="20" x2="9" y2="15" />
              <line x1="20" y1="20" x2="15" y2="15" />
            </svg>
          )}
        </div>

        {/* Contextual Interact hint */}
        {hud.interactPrompt && (
          <div className="absolute bottom-20 px-3 py-1 rounded bg-[#0b0f17]/85 border border-amber-400/50 text-xs font-medium text-amber-200">
            {hud.interactPrompt}
          </div>
        )}

        {/* PC Pointer Lock subtle hint */}
        {!hud.pointerLocked && (
          <div className="hidden md:block absolute top-16 text-[11px] text-zinc-400/80 bg-[#0b0f17]/60 px-2.5 py-1 rounded">
            Click viewport to lock mouse · Drag or Mouse Look · WASD Move · E Interact
          </div>
        )}
      </div>

      {/* BOTTOM CENTER: Compact Weapon & Ammo Counter */}
      <div className="flex justify-center pb-2.5 sm:pb-4">
        <div className="flex flex-col items-center bg-[#0b0f17]/75 border border-white/10 rounded-lg px-4 py-1.5 min-w-[168px]">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xs font-bold tracking-wider text-orange-400">
              {hud.weaponName}
            </span>
            <span className="font-mono-num text-lg font-bold text-white">
              {hud.magAmmo}
            </span>
            <span className="font-mono-num text-xs text-zinc-400">/ {hud.reserveAmmo}</span>
          </div>
          {hud.isReloading && (
            <div className="w-full h-1 bg-zinc-800 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-orange-400"
                style={{ width: `${Math.round(hud.reloadProgress * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
