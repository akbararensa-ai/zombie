import { WeaponId } from './GameConfig';

export type ScreenMode = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
export type WavePhase = 'WAITING' | 'SPAWNING' | 'ACTIVE' | 'PREP_BREAK';

export interface InventorySnapshot {
  medkits: number;
  ammoPacks: number;
  grenades: number;
  battery: number; // 0 - 100
  keycards: number;
  flashlightOn: boolean;
  scannerCooldown: number;
}

export interface ScannerBlip {
  angleRad: number; // relative to player forward
  distance: number;
  isBoss: boolean;
}

export interface HUDState {
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  wave: number;
  waveTitle: string;
  wavePhase: WavePhase;
  prepCountdown: number;
  zombiesRemaining: number;
  totalWaveZombies: number;
  score: number;
  survivalTime: number;
  kills: number;
  shotsFired: number;
  shotsHit: number;
  weaponId: WeaponId;
  weaponName: string;
  magAmmo: number;
  magSize: number;
  reserveAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
  isSprinting: boolean;
  zoneName: string;
  interactPrompt: string | null;
  hitMarkerTimer: number;
  hitMarkerCrit: boolean;
  damageFlash: number;
  announcement: string | null;
  inventory: InventorySnapshot;
  scannerActive: boolean;
  scannerBlips: ScannerBlip[];
  pointerLocked: boolean;
}

export interface GameOverStats {
  highestWave: number;
  kills: number;
  shotsFired: number;
  shotsHit: number;
  accuracy: number;
  survivalTime: number;
  score: number;
  highScore: number;
  bestWave: number;
  isNewRecord: boolean;
}

export function createInitialHUDState(startWeapon: WeaponId = 'pistol'): HUDState {
  return {
    hp: 100,
    maxHp: 100,
    armor: 25,
    maxArmor: 100,
    wave: 1,
    waveTitle: 'First Contact',
    wavePhase: 'WAITING',
    prepCountdown: 0,
    zombiesRemaining: 0,
    totalWaveZombies: 0,
    score: 0,
    survivalTime: 0,
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    weaponId: startWeapon,
    weaponName: 'G19 Tactical',
    magAmmo: 15,
    magSize: 15,
    reserveAmmo: 75,
    isReloading: false,
    reloadProgress: 0,
    isSprinting: false,
    zoneName: 'Departure Terminal',
    interactPrompt: null,
    hitMarkerTimer: 0,
    hitMarkerCrit: false,
    damageFlash: 0,
    announcement: null,
    inventory: {
      medkits: 1,
      ammoPacks: 1,
      grenades: 2,
      battery: 100,
      keycards: 0,
      flashlightOn: true,
      scannerCooldown: 0
    },
    scannerActive: false,
    scannerBlips: [],
    pointerLocked: false
  };
}
