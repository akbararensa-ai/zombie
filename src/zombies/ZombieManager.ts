import * as THREE from 'three';
import { AudioManager } from '../systems/AudioManager';
import { CollisionSystem } from '../systems/CollisionSystem';
import { Zombie } from './Zombie';
import { ZombieAI } from './ZombieAI';
import { ZombieSpawner } from './ZombieSpawner';
import { ZombieSpawnRequest } from './ZombieTypes';

export interface ZombieManagerCallbacks {
  onPlayerDamaged: (amount: number) => void;
  onZombieKilled: (zombie: Zombie, isHeadshot: boolean) => void;
  onScreamerSummon: (pos: THREE.Vector3) => void;
}

export class ZombieManager {
  public pool: Zombie[] = [];
  private ai = new ZombieAI();
  private spawner = new ZombieSpawner();
  private hitMeshCache: THREE.Mesh[] = [];

  constructor(
    scene: THREE.Scene,
    contactShadowTex: THREE.Texture,
    poolCapacity = 26,
    private audio: AudioManager,
    private callbacks: ZombieManagerCallbacks
  ) {
    for (let i = 0; i < poolCapacity; i++) {
      const z = new Zombie(i, contactShadowTex);
      this.pool.push(z);
      scene.add(z.root);
    }
  }

  public reset(): void {
    for (const z of this.pool) {
      z.despawn();
    }
  }

  public getActiveCount(): number {
    let count = 0;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active && this.pool[i].state !== 'DEAD') count++;
    }
    return count;
  }

  public spawn(
    req: ZombieSpawnRequest,
    playerPos: THREE.Vector3,
    cameraForward: THREE.Vector3,
    collision: CollisionSystem,
    nearPos?: THREE.Vector3
  ): boolean {
    return (
      this.spawner.spawnFromPool(
        this.pool,
        req,
        playerPos,
        cameraForward,
        collision,
        nearPos
      ) !== null
    );
  }

  public getAliveHitMeshes(): THREE.Mesh[] {
    this.hitMeshCache.length = 0;
    for (let i = 0; i < this.pool.length; i++) {
      const z = this.pool[i];
      if (z.active && z.state !== 'DEAD') {
        for (let j = 0; j < z.hitMeshes.length; j++) {
          this.hitMeshCache.push(z.hitMeshes[j]);
        }
      }
    }
    return this.hitMeshCache;
  }

  public damageZombieById(id: number, amount: number, isHeadshot: boolean): boolean {
    const z = this.pool[id];
    if (!z || !z.active || z.state === 'DEAD') return false;
    const killed = z.takeDamage(amount);
    if (killed) {
      this.callbacks.onZombieKilled(z, isHeadshot);
    }
    return true;
  }

  public damageInRadius(center: THREE.Vector3, radius: number, maxDamage: number): number {
    let kills = 0;
    for (let i = 0; i < this.pool.length; i++) {
      const z = this.pool[i];
      if (!z.active || z.state === 'DEAD') continue;
      const d = z.root.position.distanceTo(center);
      if (d <= radius) {
        const falloff = 1 - (d / radius) * 0.6;
        const dmg = Math.round(maxDamage * falloff);
        const killed = z.takeDamage(dmg);
        if (killed) {
          kills++;
          this.callbacks.onZombieKilled(z, false);
        }
      }
    }
    return kills;
  }

  public update(
    dt: number,
    elapsed: number,
    playerPos: THREE.Vector3,
    collision: CollisionSystem
  ): void {
    // Simple zombie-zombie separation so hordes fan out rather than stacking in one point
    for (let i = 0; i < this.pool.length; i++) {
      const a = this.pool[i];
      if (!a.active || a.state === 'DEAD') continue;
      for (let j = i + 1; j < this.pool.length; j++) {
        const b = this.pool[j];
        if (!b.active || b.state === 'DEAD') continue;
        const dx = a.root.position.x - b.root.position.x;
        const dz = a.root.position.z - b.root.position.z;
        const minDist = a.radius + b.radius;
        const distSq = dx * dx + dz * dz;
        if (distSq > 0.0001 && distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          const push = (minDist - dist) * 0.35;
          const nx = dx / dist;
          const nz = dz / dist;
          a.root.position.x += nx * push;
          a.root.position.z += nz * push;
          b.root.position.x -= nx * push;
          b.root.position.z -= nz * push;
        }
      }
    }

    for (let i = 0; i < this.pool.length; i++) {
      const z = this.pool[i];
      if (!z.active) continue;
      if (z.state !== 'DEAD') {
        const res = this.ai.updateZombie(z, dt, playerPos, collision, this.audio);
        if (res.playerHitDamage > 0) {
          this.callbacks.onPlayerDamaged(res.playerHitDamage);
        }
        if (res.screamerSummonPos) {
          this.callbacks.onScreamerSummon(res.screamerSummonPos);
        }
      }
      z.updateVisuals(dt, elapsed);
    }
  }

  public dispose(): void {
    for (const z of this.pool) {
      z.dispose();
    }
    this.pool = [];
  }
}
