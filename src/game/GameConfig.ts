export type WeaponId = 'pistol' | 'rifle' | 'shotgun';
export type ZombieType = 'walker' | 'runner' | 'brute' | 'screamer' | 'crawler';
export type QualityLevel = 'low' | 'medium' | 'high';
export type AirportZoneId = 'A' | 'B' | 'C' | 'D' | 'E';

export interface WeaponConfig {
  id: WeaponId;
  name: string;
  shortName: string;
  damage: number;
  fireRate: number; // shots per second
  automatic: boolean;
  magSize: number;
  startReserve: number;
  maxReserve: number;
  reloadTime: number; // seconds
  pellets: number;
  spread: number; // radians
  recoilPitch: number;
  recoilYaw: number;
  range: number;
  accentColor: string;
  description: string;
}

export const WEAPONS: Record<WeaponId, WeaponConfig> = {
  pistol: {
    id: 'pistol',
    name: 'G19 Tactical',
    shortName: 'PISTOL',
    damage: 34,
    fireRate: 4.5,
    automatic: false,
    magSize: 15,
    startReserve: 75,
    maxReserve: 120,
    reloadTime: 1.25,
    pellets: 1,
    spread: 0.008,
    recoilPitch: 0.022,
    recoilYaw: 0.008,
    range: 75,
    accentColor: '#f59e0b',
    description: 'Reliable sidearm with crisp handling and fast reloads.'
  },
  rifle: {
    id: 'rifle',
    name: 'MK-18 Carbine',
    shortName: 'RIFLE',
    damage: 26,
    fireRate: 9.2,
    automatic: true,
    magSize: 30,
    startReserve: 120,
    maxReserve: 210,
    reloadTime: 1.75,
    pellets: 1,
    spread: 0.016,
    recoilPitch: 0.018,
    recoilYaw: 0.012,
    range: 95,
    accentColor: '#ea580c',
    description: 'Full-auto carbine built for sustained terminal crowd control.'
  },
  shotgun: {
    id: 'shotgun',
    name: 'M870 Breacher',
    shortName: 'SHOTGUN',
    damage: 22, // x8 pellets = 176 max close range
    fireRate: 1.25,
    automatic: false,
    magSize: 6,
    startReserve: 30,
    maxReserve: 54,
    reloadTime: 2.1,
    pellets: 8,
    spread: 0.075,
    recoilPitch: 0.065,
    recoilYaw: 0.025,
    range: 36,
    accentColor: '#ef4444',
    description: 'Devastating close-quarters spread for corridors and Brutes.'
  }
};

export const WEAPON_ORDER: WeaponId[] = ['pistol', 'rifle', 'shotgun'];

export interface ZombieTypeConfig {
  type: ZombieType;
  label: string;
  hp: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  detectRange: number;
  score: number;
  scale: number;
  skinColor: number;
  clothColor: number;
  eyeColor: number;
}

export const ZOMBIE_CONFIGS: Record<ZombieType, ZombieTypeConfig> = {
  walker: {
    type: 'walker',
    label: 'Walker',
    hp: 85,
    speed: 2.35,
    damage: 14,
    attackRange: 1.65,
    attackCooldown: 1.15,
    detectRange: 34,
    score: 100,
    scale: 1.0,
    skinColor: 0x6f7f69,
    clothColor: 0x3b424c,
    eyeColor: 0xffa726
  },
  runner: {
    type: 'runner',
    label: 'Runner',
    hp: 58,
    speed: 4.95,
    damage: 12,
    attackRange: 1.55,
    attackCooldown: 0.85,
    detectRange: 42,
    score: 140,
    scale: 0.94,
    skinColor: 0x85665d,
    clothColor: 0x7c2d12,
    eyeColor: 0xff3d00
  },
  brute: {
    type: 'brute',
    label: 'Brute',
    hp: 290,
    speed: 1.75,
    damage: 28,
    attackRange: 2.05,
    attackCooldown: 1.65,
    detectRange: 36,
    score: 280,
    scale: 1.38,
    skinColor: 0x566057,
    clothColor: 0x1f2937,
    eyeColor: 0xf97316
  },
  screamer: {
    type: 'screamer',
    label: 'Screamer',
    hp: 105,
    speed: 2.85,
    damage: 13,
    attackRange: 1.6,
    attackCooldown: 1.2,
    detectRange: 44,
    score: 220,
    scale: 1.0,
    skinColor: 0x8b947e,
    clothColor: 0x854d0e,
    eyeColor: 0xfacc15
  },
  crawler: {
    type: 'crawler',
    label: 'Crawler',
    hp: 52,
    speed: 3.15,
    damage: 11,
    attackRange: 1.45,
    attackCooldown: 0.95,
    detectRange: 30,
    score: 130,
    scale: 0.88,
    skinColor: 0x636e61,
    clothColor: 0x334155,
    eyeColor: 0xfb923c
  }
};

export interface QualityPreset {
  pixelRatioMax: number;
  shadows: boolean;
  shadowMapSize: number;
  maxActiveZombies: number;
  particlePoolSize: number;
  fogDensity: number;
}

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  low: {
    pixelRatioMax: 1.0,
    shadows: false,
    shadowMapSize: 512,
    maxActiveZombies: 10,
    particlePoolSize: 28,
    fogDensity: 0.015
  },
  medium: {
    pixelRatioMax: 1.45,
    shadows: true,
    shadowMapSize: 1024,
    maxActiveZombies: 16,
    particlePoolSize: 48,
    fogDensity: 0.013
  },
  high: {
    pixelRatioMax: 2.0,
    shadows: true,
    shadowMapSize: 2048,
    maxActiveZombies: 22,
    particlePoolSize: 72,
    fogDensity: 0.0115
  }
};

export interface GameSettings {
  hudScale: number; // 0.8 - 1.25
  buttonOpacity: number; // 0.4 - 1.0
  cameraSensitivity: number; // 0.4 - 2.2
  leftHanded: boolean;
  quality: QualityLevel;
  masterVolume: number; // 0 - 1
  musicVolume: number; // 0 - 1
  sfxVolume: number; // 0 - 1
  muted: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  hudScale: 1.0,
  buttonOpacity: 0.82,
  cameraSensitivity: 1.0,
  leftHanded: false,
  quality: 'medium',
  masterVolume: 0.8,
  musicVolume: 0.45,
  sfxVolume: 0.85,
  muted: false
};

export const PLAYER_CONFIG = {
  eyeHeight: 1.68,
  radius: 0.42,
  walkSpeed: 5.4,
  sprintSpeed: 8.2,
  acceleration: 26,
  deceleration: 18,
  jumpVelocity: 6.4,
  gravity: 18.5,
  maxHp: 100,
  maxArmor: 100,
  damageCooldown: 0.45
};

export interface AirportZoneInfo {
  id: AirportZoneId;
  name: string;
  subtitle: string;
  boundsLabel: string;
  description: string;
}

export const AIRPORT_ZONES: AirportZoneInfo[] = [
  {
    id: 'A',
    name: 'Departure Terminal',
    subtitle: 'Check-In Concourse',
    boundsLabel: 'South Sector',
    description: 'Check-in counters, abandoned luggage islands, flickering flight boards, and wide cover pillars.'
  },
  {
    id: 'B',
    name: 'Boarding Gate',
    subtitle: 'Gates A1 – A2',
    boundsLabel: 'West Wing',
    description: 'Security checkpoint arches, passenger seating rows, and shattered glass overlooking the tarmac.'
  },
  {
    id: 'C',
    name: 'Baggage Claim',
    subtitle: 'Carousel Hall',
    boundsLabel: 'East Wing',
    description: 'Twin oval conveyor carousels, scattered suitcases, luggage carts, and flankable walkways.'
  },
  {
    id: 'D',
    name: 'Airport Corridor',
    subtitle: 'Transit & Power Room',
    boundsLabel: 'North Connector',
    description: 'Flickering transit hallway, lockable access doors, emergency generator, and supply lockers.'
  },
  {
    id: 'E',
    name: 'Airport Apron',
    subtitle: 'Active Tarmac',
    boundsLabel: 'North Exterior',
    description: 'Parked commercial airliner, boarding airstairs, ground-handling trucks, and floodlit runway perimeter.'
  }
];

const SETTINGS_STORAGE_KEY = 'outbreak_last_exit_settings_v1';
const HIGHSCORE_STORAGE_KEY = 'outbreak_last_exit_highscore_v1';

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadHighScore(): { highScore: number; bestWave: number } {
  try {
    const raw = localStorage.getItem(HIGHSCORE_STORAGE_KEY);
    if (!raw) return { highScore: 0, bestWave: 0 };
    const parsed = JSON.parse(raw);
    return {
      highScore: Number(parsed.highScore) || 0,
      bestWave: Number(parsed.bestWave) || 0
    };
  } catch {
    return { highScore: 0, bestWave: 0 };
  }
}

export function saveHighScore(score: number, wave: number): { highScore: number; bestWave: number } {
  const current = loadHighScore();
  const next = {
    highScore: Math.max(current.highScore, score),
    bestWave: Math.max(current.bestWave, wave)
  };
  try {
    localStorage.setItem(HIGHSCORE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
  return next;
}
