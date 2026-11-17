import React, { useRef, useState } from 'react';
import {
  ArrowUp,
  Backpack,
  Crosshair,
  Flame,
  Hand,
  RefreshCw,
  Repeat,
  Zap
} from 'lucide-react';
import { GameSettings } from '../game/GameConfig';
import { HUDState } from '../game/GameState';

interface MobileControlsProps {
  hud: HUDState;
  settings: GameSettings;
  onMove: (x: number, y: number) => void;
  onSprintChange: (held: boolean) => void;
  onLookDelta: (dx: number, dy: number) => void;
  onFireChange: (held: boolean) => void;
  onReload: () => void;
  onJump: () => void;
  onSwitchWeapon: () => void;
  onInteract: () => void;
  onThrowGrenade: () => void;
  onToggleInventory: () => void;
  onRequestPointerLock: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  hud,
  settings,
  onMove,
  onSprintChange,
  onLookDelta,
  onFireChange,
  onReload,
  onJump,
  onSwitchWeapon,
  onInteract,
  onThrowGrenade,
  onToggleInventory,
  onRequestPointerLock
}) => {
  const joyPointerId = useRef<number | null>(null);
  const joyOrigin = useRef({ x: 0, y: 0 });
  const lookPointerId = useRef<number | null>(null);
  const lastLookPos = useRef({ x: 0, y: 0 });
  const firePointerId = useRef<number | null>(null);

  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [sprintToggle, setSprintToggle] = useState(false);
  const [firePressed, setFirePressed] = useState(false);

  const maxRadius = 44;
  const deadZone = 0.14;

  const handleJoystickDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (joyPointerId.current !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    joyPointerId.current = e.pointerId;
    const rect = e.currentTarget.getBoundingClientRect();
    joyOrigin.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    updateJoystick(e.clientX, e.clientY);
  };

  const handleJoystickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    updateJoystick(e.clientX, e.clientY);
  };

  const handleJoystickUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (joyPointerId.current !== e.pointerId) return;
    e.stopPropagation();
    joyPointerId.current = null;
    setKnobOffset({ x: 0, y: 0 });
    onMove(0, 0);
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    const dx = clientX - joyOrigin.current.x;
    const dy = clientY - joyOrigin.current.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(maxRadius, dist);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clamped;
    const ky = Math.sin(angle) * clamped;
    setKnobOffset({ x: kx, y: ky });

    const norm = clamped / maxRadius;
    if (norm < deadZone) {
      onMove(0, 0);
    } else {
      const scaled = (norm - deadZone) / (1 - deadZone);
      onMove((kx / maxRadius) * (scaled / norm), (-ky / maxRadius) * (scaled / norm));
    }
  };

  // Camera look touch/drag surface (handles both mobile touch look & desktop click)
  const handleLookDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button === 0) {
      onRequestPointerLock();
    }
    if (lookPointerId.current !== null) return;
    lookPointerId.current = e.pointerId;
    lastLookPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleLookMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (document.pointerLockElement) {
      // Handled via global mousemove listener in App
      return;
    }
    if (lookPointerId.current !== e.pointerId) return;
    const dx = e.clientX - lastLookPos.current.x;
    const dy = e.clientY - lastLookPos.current.y;
    lastLookPos.current = { x: e.clientX, y: e.clientY };
    onLookDelta(dx * 1.45, dy * 1.45);
  };

  const handleLookUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerId.current === e.pointerId) {
      lookPointerId.current = null;
    }
  };

  // Multi-touch Fire button
  const handleFireDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    firePointerId.current = e.pointerId;
    setFirePressed(true);
    onFireChange(true);
  };

  const handleFireUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (firePointerId.current !== e.pointerId) return;
    e.stopPropagation();
    firePointerId.current = null;
    setFirePressed(false);
    onFireChange(false);
  };

  const toggleSprint = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const next = !sprintToggle;
    setSprintToggle(next);
    onSprintChange(next);
  };

  const opacity = settings.buttonOpacity;
  const scale = settings.hudScale;
  const flipped = settings.leftHanded;

  const moveCluster = (
    <div
      className={`pointer-events-auto flex items-end gap-3 ${
        flipped ? 'flex-row-reverse' : 'flex-row'
      }`}
      style={{ opacity, transform: `scale(${scale})`, transformOrigin: flipped ? 'bottom right' : 'bottom left' }}
    >
      {/* Analog Virtual Joystick */}
      <div
        onPointerDown={handleJoystickDown}
        onPointerMove={handleJoystickMove}
        onPointerUp={handleJoystickUp}
        onPointerCancel={handleJoystickUp}
        className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-zinc-900/55 border-2 border-white/20 flex items-center justify-center gameplay-surface"
      >
        <div className="w-12 h-12 rounded-full border border-white/10" />
        <div
          className="absolute w-12 h-12 rounded-full bg-orange-500/85 border-2 border-white/70 shadow-lg"
          style={{
            transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`
          }}
        />
      </div>

      {/* Sprint Toggle near Joystick */}
      <button
        type="button"
        onPointerDown={toggleSprint}
        aria-label="Toggle Sprint"
        className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${
          sprintToggle || hud.isSprinting
            ? 'bg-orange-500/85 border-orange-300 text-white'
            : 'bg-zinc-900/70 border-white/20 text-zinc-200'
        }`}
      >
        <Zap className="w-5 h-5" />
      </button>
    </div>
  );

  const actionCluster = (
    <div
      className="pointer-events-auto flex flex-col items-end gap-2.5"
      style={{ opacity, transform: `scale(${scale})`, transformOrigin: flipped ? 'bottom left' : 'bottom right' }}
    >
      {/* Contextual Interact button (only shown when near object/loot) */}
      {hud.interactPrompt && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onInteract();
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-500 text-zinc-950 font-display font-bold text-xs tracking-wider shadow-lg active:scale-95"
        >
          <Hand className="w-4 h-4" />
          <span>INTERACT</span>
        </button>
      )}

      {/* Upper utility row: Inventory, Grenade, Weapon Switch */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onToggleInventory();
          }}
          aria-label="Inventory"
          className="w-11 h-11 rounded-full bg-zinc-900/75 border border-white/20 flex items-center justify-center text-zinc-100 active:scale-95"
        >
          <Backpack className="w-4 h-4" />
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onThrowGrenade();
          }}
          aria-label="Throw Grenade"
          className="relative w-11 h-11 rounded-full bg-zinc-900/75 border border-white/20 flex items-center justify-center text-red-300 active:scale-95"
        >
          <Flame className="w-4 h-4" />
          <span className="absolute -top-1 -right-1 text-[10px] font-mono-num font-bold bg-zinc-950 border border-white/20 rounded px-1">
            {hud.inventory.grenades}
          </span>
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onSwitchWeapon();
          }}
          aria-label="Switch Weapon"
          className="w-11 h-11 rounded-full bg-zinc-900/75 border border-white/20 flex items-center justify-center text-amber-300 active:scale-95"
        >
          <Repeat className="w-4 h-4" />
        </button>
      </div>

      {/* Lower combat row: Reload (spaced from Fire), Jump, Large Fire Button */}
      <div className="flex items-end gap-3.5">
        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onReload();
          }}
          aria-label="Reload"
          className="w-12 h-12 rounded-full bg-zinc-900/75 border border-white/25 flex items-center justify-center text-zinc-100 active:scale-95"
        >
          <RefreshCw className={`w-5 h-5 ${hud.isReloading ? 'animate-spin text-orange-400' : ''}`} />
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
            onJump();
          }}
          aria-label="Jump"
          className="w-12 h-12 rounded-full bg-zinc-900/75 border border-white/25 flex items-center justify-center text-zinc-100 active:scale-95"
        >
          <ArrowUp className="w-5 h-5" />
        </button>

        {/* Primary Fire Button */}
        <button
          type="button"
          onPointerDown={handleFireDown}
          onPointerUp={handleFireUp}
          onPointerCancel={handleFireUp}
          aria-label="Fire Weapon"
          className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full border-2 flex flex-col items-center justify-center transition-transform gameplay-surface ${
            firePressed
              ? 'bg-orange-500 border-white scale-95 text-white'
              : 'bg-orange-600/80 border-orange-300/80 text-white'
          }`}
        >
          <Crosshair className="w-7 h-7" />
          <span className="font-display text-[10px] font-bold tracking-wider mt-0.5">FIRE</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-20 pointer-events-none safe-pad">
      {/* Camera Look Drag Surface spanning the viewport behind edge buttons */}
      <div
        onPointerDown={handleLookDown}
        onPointerMove={handleLookMove}
        onPointerUp={handleLookUp}
        onPointerCancel={handleLookUp}
        className="pointer-events-auto absolute inset-0 gameplay-surface"
      />

      {/* Edge Control Clusters */}
      <div
        className={`relative z-10 w-full h-full flex items-end justify-between px-4 pb-3 sm:px-6 sm:pb-5 ${
          flipped ? 'flex-row-reverse' : 'flex-row'
        }`}
      >
        {moveCluster}
        {actionCluster}
      </div>
    </div>
  );
};
