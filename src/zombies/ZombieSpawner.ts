import * as THREE from 'three';
import { CollisionSystem } from '../systems/CollisionSystem';
import { pickValidSpawnPoint } from '../world/SpawnPoints';
import { Zombie } from './Zombie';
import { ZombieSpawnRequest } from './ZombieTypes';

export class ZombieSpawner {
  public spawnFromPool(
    pool: Zombie[],
    req: ZombieSpawnRequest,
    playerPos: THREE.Vector3,
    cameraForward: THREE.Vector3,
    collision: CollisionSystem,
    nearPos?: THREE.Vector3
  ): Zombie | null {
    const zombie = pool.find((z) => !z.active);
    if (!zombie) return null;

    let spawnPos: THREE.Vector3 | null = null;
    if (nearPos) {
      // Screamer summon offset nearby on valid ground
      for (let attempt = 0; attempt < 6; attempt++) {
        const angle = (attempt / 6) * Math.PI * 2 + Math.random() * 0.5;
        const candidate = new THREE.Vector3(
          nearPos.x + Math.cos(angle) * 3.2,
          0,
          nearPos.z + Math.sin(angle) * 3.2
        );
        if (
          !collision.isPointBlocked(candidate.x, candidate.z, 0.7) &&
          candidate.distanceTo(playerPos) > 6
        ) {
          spawnPos = candidate;
          break;
        }
      }
    }

    if (!spawnPos) {
      spawnPos = pickValidSpawnPoint(playerPos, cameraForward, collision);
    }
    if (!spawnPos) return null;

    zombie.spawn(spawnPos, req);
    return zombie;
  }
}
