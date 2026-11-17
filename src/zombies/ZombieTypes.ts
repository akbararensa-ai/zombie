import { ZombieType } from '../game/GameConfig';

export type ZombieState = 'IDLE' | 'PATROL' | 'DETECT' | 'CHASE' | 'ATTACK' | 'DEAD';

export interface ZombieSpawnRequest {
  type: ZombieType;
  hpMultiplier: number;
  speedMultiplier: number;
  isMiniBoss?: boolean;
  isBoss?: boolean;
}
