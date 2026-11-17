import { ZombieType } from '../game/GameConfig';
import { WavePhase } from '../game/GameState';
import { ZombieSpawnRequest } from '../zombies/ZombieTypes';

export interface WaveDefinition {
  waveNumber: number;
  title: string;
  totalZombies: number;
  spawnInterval: number;
  hpMultiplier: number;
  speedMultiplier: number;
  queue: ZombieSpawnRequest[];
}

export class WaveManager {
  public waveNumber = 1;
  public waveTitle = 'First Contact';
  public phase: WavePhase = 'WAITING';
  public prepTimer = 0;
  public totalZombies = 0;
  public zombiesKilled = 0;
  private spawnQueue: ZombieSpawnRequest[] = [];
  private spawnCooldown = 0;
  private spawnInterval = 2.0;
  private screamersSpawnedThisWave = 0;

  public reset(): void {
    this.waveNumber = 1;
    this.phase = 'WAITING';
    this.prepTimer = 0;
    this.totalZombies = 0;
    this.zombiesKilled = 0;
    this.spawnQueue = [];
    this.spawnCooldown = 0;
    this.screamersSpawnedThisWave = 0;
  }

  public startWave(waveNum: number): WaveDefinition {
    this.waveNumber = waveNum;
    const def = this.buildWaveDefinition(waveNum);
    this.waveTitle = def.title;
    this.totalZombies = def.totalZombies;
    this.zombiesKilled = 0;
    this.spawnQueue = [...def.queue];
    this.spawnInterval = def.spawnInterval;
    this.spawnCooldown = 0.8;
    this.screamersSpawnedThisWave = 0;
    this.phase = 'SPAWNING';
    return def;
  }

  private buildWaveDefinition(w: number): WaveDefinition {
    const queue: ZombieSpawnRequest[] = [];
    const hpMult = 1 + (w - 1) * 0.1;
    const speedMult = Math.min(1.45, 1 + (w - 1) * 0.035);
    const spawnInterval = Math.max(0.55, 2.2 - w * 0.13);

    let title = 'Outbreak Escalation';
    let count = 6 + w * 3;

    if (w === 1) {
      title = 'First Contact';
      count = 6;
      for (let i = 0; i < count; i++) {
        queue.push({ type: 'walker', hpMultiplier: 0.9, speedMultiplier: 0.95 });
      }
    } else if (w === 2) {
      title = 'Terminal Breach';
      count = 9;
      for (let i = 0; i < count; i++) {
        const type: ZombieType = i % 3 === 2 ? 'runner' : 'walker';
        queue.push({ type, hpMultiplier: hpMult, speedMultiplier: speedMult });
      }
    } else if (w === 3) {
      title = 'Aggression Spike';
      count = 13;
      for (let i = 0; i < count; i++) {
        const type: ZombieType = i % 2 === 0 ? 'walker' : i % 5 === 3 ? 'crawler' : 'runner';
        queue.push({ type, hpMultiplier: hpMult, speedMultiplier: speedMult * 1.04 });
      }
    } else if (w === 4) {
      title = 'Heavy Quarantine';
      count = 16;
      for (let i = 0; i < count; i++) {
        let type: ZombieType = 'walker';
        if (i === 5 || i === 13) type = 'brute';
        else if (i % 3 === 1) type = 'runner';
        else if (i % 4 === 2) type = 'crawler';
        queue.push({ type, hpMultiplier: hpMult, speedMultiplier: speedMult });
      }
    } else if (w === 5) {
      title = 'Mini-Boss: Gatekeeper';
      count = 15;
      for (let i = 0; i < count - 1; i++) {
        const type: ZombieType = i % 3 === 0 ? 'runner' : i % 4 === 2 ? 'crawler' : 'walker';
        queue.push({ type, hpMultiplier: hpMult, speedMultiplier: speedMult });
      }
      queue.push({
        type: 'brute',
        hpMultiplier: hpMult,
        speedMultiplier: speedMult,
        isMiniBoss: true
      });
    } else if (w >= 6 && w <= 9) {
      title = `Perimeter Siege ${w}`;
      count = 16 + (w - 5) * 3;
      let screamers = 0;
      for (let i = 0; i < count; i++) {
        let type: ZombieType = 'walker';
        if (i % 6 === 5) type = 'brute';
        else if (i % 7 === 3 && screamers < 2) {
          type = 'screamer';
          screamers++;
        } else if (i % 3 === 0) type = 'runner';
        else if (i % 4 === 1) type = 'crawler';
        queue.push({ type, hpMultiplier: hpMult, speedMultiplier: speedMult });
      }
    } else if (w === 10) {
      title = 'Boss Wave: Apex Quarantine';
      count = 22;
      for (let i = 0; i < count - 1; i++) {
        let type: ZombieType = 'runner';
        if (i % 4 === 0) type = 'walker';
        else if (i % 5 === 2) type = 'brute';
        else if (i === 7 || i === 15) type = 'screamer';
        else if (i % 4 === 3) type = 'crawler';
        queue.push({ type, hpMultiplier: hpMult, speedMultiplier: speedMult });
      }
      queue.push({
        type: 'brute',
        hpMultiplier: hpMult,
        speedMultiplier: speedMult,
        isBoss: true
      });
    } else {
      title = `Endless Survival · Wave ${w}`;
      count = Math.min(48, 22 + (w - 10) * 4);
      let screamers = 0;
      for (let i = 0; i < count; i++) {
        let type: ZombieType = 'walker';
        if (w % 5 === 0 && i === count - 1) {
          queue.push({ type: 'brute', hpMultiplier: hpMult, speedMultiplier: speedMult, isBoss: true });
          continue;
        }
        if (i % 5 === 4) type = 'brute';
        else if (i % 8 === 3 && screamers < 2) {
          type = 'screamer';
          screamers++;
        } else if (i % 2 === 0) type = 'runner';
        else if (i % 3 === 1) type = 'crawler';
        queue.push({ type, hpMultiplier: hpMult, speedMultiplier: speedMult });
      }
    }

    return {
      waveNumber: w,
      title,
      totalZombies: queue.length,
      spawnInterval,
      hpMultiplier: hpMult,
      speedMultiplier: speedMult,
      queue
    };
  }

  public getZombiesRemaining(): number {
    return Math.max(0, this.totalZombies - this.zombiesKilled);
  }

  public notifyZombieKilled(): void {
    this.zombiesKilled++;
  }

  public canScreamerSummon(): boolean {
    if (this.screamersSpawnedThisWave >= 4) return false;
    this.screamersSpawnedThisWave += 2;
    this.totalZombies += 2;
    return true;
  }

  public update(
    dt: number,
    activeZombieCount: number,
    maxActiveZombies: number
  ): {
    spawnNext: ZombieSpawnRequest | null;
    waveCompleted: boolean;
    startNextWave: boolean;
  } {
    const out: {
      spawnNext: ZombieSpawnRequest | null;
      waveCompleted: boolean;
      startNextWave: boolean;
    } = {
      spawnNext: null,
      waveCompleted: false,
      startNextWave: false
    };

    if (this.phase === 'WAITING') {
      return out;
    }

    if (this.phase === 'PREP_BREAK') {
      this.prepTimer -= dt;
      if (this.prepTimer <= 0) {
        this.prepTimer = 0;
        out.startNextWave = true;
      }
      return out;
    }

    if (this.phase === 'SPAWNING') {
      this.spawnCooldown -= dt;
      if (this.spawnCooldown <= 0 && this.spawnQueue.length > 0) {
        if (activeZombieCount < maxActiveZombies) {
          out.spawnNext = this.spawnQueue.shift() ?? null;
          this.spawnCooldown = this.spawnInterval;
        } else {
          this.spawnCooldown = 0.35;
        }
      }
      if (this.spawnQueue.length === 0) {
        this.phase = 'ACTIVE';
      }
    }

    if (
      (this.phase === 'ACTIVE' || this.phase === 'SPAWNING') &&
      this.spawnQueue.length === 0 &&
      activeZombieCount === 0
    ) {
      this.phase = 'PREP_BREAK';
      this.prepTimer = 12.0; // 12-second preparation break between waves
      out.waveCompleted = true;
    }

    return out;
  }
}
