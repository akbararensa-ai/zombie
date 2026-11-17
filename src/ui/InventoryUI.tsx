import React from 'react';
import { Cross, Flame, Flashlight, Package, Radar, X } from 'lucide-react';
import { HUDState } from '../game/GameState';

interface InventoryUIProps {
  open: boolean;
  hud: HUDState;
  onClose: () => void;
  onUseMedkit: () => void;
  onUseAmmo: () => void;
  onThrowGrenade: () => void;
  onToggleFlashlight: () => void;
  onTriggerScanner: () => void;
}

export const InventoryUI: React.FC<InventoryUIProps> = ({
  open,
  hud,
  onClose,
  onUseMedkit,
  onUseAmmo,
  onThrowGrenade,
  onToggleFlashlight,
  onTriggerScanner
}) => {
  if (!open) return null;

  const inv = hud.inventory;

  return (
    <div className="pointer-events-auto fixed bottom-20 left-1/2 -translate-x-1/2 z-30 w-[min(92vw,440px)] rounded-xl bg-[#0d121b]/95 border border-white/15 p-3 shadow-2xl">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 text-xs font-display font-bold tracking-wider text-orange-400">
          <span>QUICK INVENTORY</span>
          <span className="text-zinc-500">·</span>
          <span className="text-zinc-300 font-mono-num">BAT {inv.battery}%</span>
          {inv.keycards > 0 && (
            <>
              <span className="text-zinc-500">·</span>
              <span className="text-purple-300 font-mono-num">KEYCARDS {inv.keycards}</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Inventory"
          className="w-8 h-8 flex items-center justify-center rounded-md bg-white/10 hover:bg-white/20 text-zinc-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => {
            onUseMedkit();
            onClose();
          }}
          disabled={inv.medkits <= 0 || hud.hp >= hud.maxHp}
          className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-lg bg-zinc-900/90 border border-white/10 hover:border-emerald-400/50 disabled:opacity-40 text-xs"
        >
          <Cross className="w-4 h-4 text-emerald-400" />
          <span className="font-medium text-zinc-100">Medkit</span>
          <span className="font-mono-num text-[11px] text-emerald-300">x{inv.medkits}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onUseAmmo();
            onClose();
          }}
          disabled={inv.ammoPacks <= 0}
          className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-lg bg-zinc-900/90 border border-white/10 hover:border-amber-400/50 disabled:opacity-40 text-xs"
        >
          <Package className="w-4 h-4 text-amber-400" />
          <span className="font-medium text-zinc-100">Ammo</span>
          <span className="font-mono-num text-[11px] text-amber-300">x{inv.ammoPacks}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onThrowGrenade();
            onClose();
          }}
          disabled={inv.grenades <= 0}
          className="flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-lg bg-zinc-900/90 border border-white/10 hover:border-red-400/50 disabled:opacity-40 text-xs"
        >
          <Flame className="w-4 h-4 text-red-400" />
          <span className="font-medium text-zinc-100">Grenade</span>
          <span className="font-mono-num text-[11px] text-red-300">x{inv.grenades}</span>
        </button>

        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={onToggleFlashlight}
            className={`flex-1 flex items-center justify-center gap-1 rounded-md border text-[11px] font-medium px-1.5 ${
              inv.flashlightOn
                ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                : 'bg-zinc-900/90 border-white/10 text-zinc-300'
            }`}
          >
            <Flashlight className="w-3.5 h-3.5" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onTriggerScanner();
              onClose();
            }}
            disabled={inv.scannerCooldown > 0 || inv.battery < 10}
            className="flex-1 flex items-center justify-center gap-1 rounded-md bg-zinc-900/90 border border-white/10 hover:border-sky-400/50 disabled:opacity-40 text-[11px] font-medium text-sky-200 px-1.5"
          >
            <Radar className="w-3.5 h-3.5" />
            <span>{inv.scannerCooldown > 0 ? `${inv.scannerCooldown}s` : 'Scan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
