import { useEffect, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { GameSettings, loadSettings, saveSettings, WeaponId } from './game/GameConfig';
import { GameManager } from './game/GameManager';
import {
  createInitialHUDState,
  GameOverStats,
  HUDState,
  ScreenMode
} from './game/GameState';
import { GameHUD } from './ui/GameHUD';
import { GameOver } from './ui/GameOver';
import { InventoryUI } from './ui/InventoryUI';
import { MainMenu } from './ui/MainMenu';
import { MobileControls } from './ui/MobileControls';
import { PauseMenu } from './ui/PauseMenu';
import { Settings } from './ui/Settings';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<GameManager | null>(null);

  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [screenMode, setScreenMode] = useState<ScreenMode>('MENU');
  const [hud, setHud] = useState<HUDState>(() => createInitialHUDState('pistol'));
  const [gameOverStats, setGameOverStats] = useState<GameOverStats | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [startWeapon, setStartWeapon] = useState<WeaponId>('pistol');
  const [contextLost, setContextLost] = useState(false);

  const screenModeRef = useRef<ScreenMode>('MENU');
  screenModeRef.current = screenMode;

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const gm = new GameManager(mount, settings, {
      onHUDUpdate: (nextHud) => setHud(nextHud),
      onScreenModeChange: (mode, stats) => {
        setScreenMode(mode);
        if (stats) setGameOverStats(stats);
        if (mode !== 'PLAYING') {
          setInventoryOpen(false);
        }
      },
      onContextLost: (lost) => setContextLost(lost)
    });
    gameRef.current = gm;

    // Desktop keyboard & pointer-lock mouse support
    const keys = new Set<string>();
    const syncKeyboardMove = () => {
      if (!gameRef.current || screenModeRef.current !== 'PLAYING') return;
      const x =
        (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
        (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      const y =
        (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
        (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      gameRef.current.setMoveInput(x, y);
      gameRef.current.setSprint(keys.has('ShiftLeft') || keys.has('ShiftRight'));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const gmInst = gameRef.current;
      if (!gmInst) return;

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (screenModeRef.current === 'PLAYING') {
          gmInst.pauseGame();
        } else if (screenModeRef.current === 'PAUSED') {
          gmInst.resumeGame();
        }
        return;
      }

      if (screenModeRef.current !== 'PLAYING') return;

      keys.add(e.code);
      syncKeyboardMove();

      if (e.code === 'Space') {
        e.preventDefault();
        gmInst.triggerJump();
      } else if (e.code === 'KeyR') {
        gmInst.triggerReload();
      } else if (e.code === 'KeyE') {
        gmInst.triggerInteract();
      } else if (e.code === 'KeyQ') {
        gmInst.switchWeapon();
      } else if (e.code === 'Digit1') {
        gmInst.switchWeapon('pistol');
      } else if (e.code === 'Digit2') {
        gmInst.switchWeapon('rifle');
      } else if (e.code === 'Digit3') {
        gmInst.switchWeapon('shotgun');
      } else if (e.code === 'KeyF') {
        gmInst.toggleFlashlight();
      } else if (e.code === 'KeyG') {
        gmInst.throwGrenade();
      } else if (e.code === 'KeyH') {
        gmInst.useMedkit();
      } else if (e.code === 'KeyV') {
        gmInst.triggerScanner();
      } else if (e.code === 'Tab' || e.code === 'KeyI') {
        e.preventDefault();
        setInventoryOpen((prev) => !prev);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
      syncKeyboardMove();
    };

    const onBlur = () => {
      keys.clear();
      gameRef.current?.setMoveInput(0, 0);
      gameRef.current?.setSprint(false);
      gameRef.current?.setFireHeld(false);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (screenModeRef.current !== 'PLAYING') return;
      if (document.pointerLockElement) {
        gameRef.current?.addLookDelta(e.movementX, e.movementY);
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (screenModeRef.current !== 'PLAYING') return;
      if (document.pointerLockElement && e.button === 0) {
        gameRef.current?.setFireHeld(true);
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0 && document.pointerLockElement) {
        gameRef.current?.setFireHeld(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      gm.dispose();
      gameRef.current = null;
    };
  }, []);

  const handleUpdateSettings = (next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
    gameRef.current?.updateSettings(next);
  };

  const handleSelectStartWeapon = (w: WeaponId) => {
    setStartWeapon(w);
    gameRef.current?.setStartWeapon(w);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0c10]">
      {/* Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="w-full h-full" />

      {/* Context Lost graceful fallback */}
      {contextLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0c10]/95 p-6 text-center">
          <div>
            <div className="font-display text-xl font-bold text-orange-400 mb-2">
              GRAPHICS CONTEXT PAUSED
            </div>
            <p className="text-sm text-zinc-400">
              Restoring WebGL rendering pipeline...
            </p>
          </div>
        </div>
      )}

      {/* Main Menu */}
      {screenMode === 'MENU' && (
        <MainMenu
          startWeapon={startWeapon}
          onSelectStartWeapon={handleSelectStartWeapon}
          onPlay={() => gameRef.current?.startNewGame()}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {/* Active Gameplay HUD & Multi-Touch Controls */}
      {screenMode === 'PLAYING' && (
        <>
          <GameHUD
            hud={hud}
            settings={settings}
            onPause={() => gameRef.current?.pauseGame()}
          />
          <MobileControls
            hud={hud}
            settings={settings}
            onMove={(x, y) => gameRef.current?.setMoveInput(x, y)}
            onSprintChange={(held) => gameRef.current?.setSprint(held)}
            onLookDelta={(dx, dy) => gameRef.current?.addLookDelta(dx, dy)}
            onFireChange={(held) => gameRef.current?.setFireHeld(held)}
            onReload={() => gameRef.current?.triggerReload()}
            onJump={() => gameRef.current?.triggerJump()}
            onSwitchWeapon={() => gameRef.current?.switchWeapon()}
            onInteract={() => gameRef.current?.triggerInteract()}
            onThrowGrenade={() => gameRef.current?.throwGrenade()}
            onToggleInventory={() => setInventoryOpen((p) => !p)}
            onRequestPointerLock={() => gameRef.current?.requestPointerLock()}
          />
          <InventoryUI
            open={inventoryOpen}
            hud={hud}
            onClose={() => setInventoryOpen(false)}
            onUseMedkit={() => gameRef.current?.useMedkit()}
            onUseAmmo={() => gameRef.current?.useAmmoPack()}
            onThrowGrenade={() => gameRef.current?.throwGrenade()}
            onToggleFlashlight={() => gameRef.current?.toggleFlashlight()}
            onTriggerScanner={() => gameRef.current?.triggerScanner()}
          />
        </>
      )}

      {/* Pause Menu */}
      {screenMode === 'PAUSED' && (
        <PauseMenu
          wave={hud.wave}
          score={hud.score}
          onResume={() => gameRef.current?.resumeGame()}
          onOpenSettings={() => setSettingsOpen(true)}
          onRestart={() => gameRef.current?.startNewGame()}
          onMainMenu={() => gameRef.current?.returnToMenu()}
        />
      )}

      {/* Game Over Screen */}
      {screenMode === 'GAME_OVER' && gameOverStats && (
        <GameOver
          stats={gameOverStats}
          onRestart={() => gameRef.current?.startNewGame()}
          onMainMenu={() => gameRef.current?.returnToMenu()}
        />
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <Settings
          settings={settings}
          onChange={handleUpdateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Mobile Portrait Orientation Prompt */}
      <div className="portrait-lock-overlay hidden fixed inset-0 z-50 flex-col items-center justify-center bg-[#0a0c10] p-6 text-center">
        <RotateCw className="w-12 h-12 text-orange-400 mb-4" />
        <h2 className="font-display text-xl font-bold tracking-wider text-white mb-2">
          ROTATE TO LANDSCAPE
        </h2>
        <p className="text-sm text-zinc-400 max-w-xs">
          OUTBREAK: LAST EXIT is designed for landscape mobile gameplay so dual-thumb aiming and firing remain unobstructed.
        </p>
      </div>
    </div>
  );
}
