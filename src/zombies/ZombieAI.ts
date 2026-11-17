import * as THREE from 'three';
import { AudioManager } from '../systems/AudioManager';
import { CollisionSystem } from '../systems/CollisionSystem';
import { NAV_WAYPOINTS, NavWaypoint } from '../world/SpawnPoints';
import { Zombie } from './Zombie';

const _dir = new THREE.Vector3();

const WAYPOINT_MAP = new Map<string, NavWaypoint>(
  NAV_WAYPOINTS.map((w) => [w.id, w])
);

function findNearestWaypoint(pos: THREE.Vector3): NavWaypoint {
  let best = NAV_WAYPOINTS[0];
  let bestDistSq = Infinity;
  for (let i = 0; i < NAV_WAYPOINTS.length; i++) {
    const wp = NAV_WAYPOINTS[i];
    const dx = wp.position.x - pos.x;
    const dz = wp.position.z - pos.z;
    const dSq = dx * dx + dz * dz;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      best = wp;
    }
  }
  return best;
}

function findNextWaypointToward(fromPos: THREE.Vector3, toPos: THREE.Vector3): THREE.Vector3 {
  const start = findNearestWaypoint(fromPos);
  const goal = findNearestWaypoint(toPos);
  if (start.id === goal.id) return toPos;

  // BFS over small 22-node airport graph (very fast)
  const queue: string[] = [start.id];
  const cameFrom = new Map<string, string | null>();
  cameFrom.set(start.id, null);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === goal.id) break;
    const node = WAYPOINT_MAP.get(curr);
    if (!node) continue;
    for (const nextId of node.neighbors) {
      if (!cameFrom.has(nextId)) {
        cameFrom.set(nextId, curr);
        queue.push(nextId);
      }
    }
  }

  // Reconstruct first step after start
  let step: string | null = goal.id;
  let prev = cameFrom.get(step) ?? null;
  while (prev && prev !== start.id) {
    step = prev;
    prev = cameFrom.get(step) ?? null;
  }

  const nextNode = WAYPOINT_MAP.get(step ?? start.id) ?? start;
  return nextNode.position;
}

export interface ZombieAIResult {
  playerHitDamage: number;
  screamerSummonPos: THREE.Vector3 | null;
}

export class ZombieAI {
  public updateZombie(
    z: Zombie,
    dt: number,
    playerPos: THREE.Vector3,
    collision: CollisionSystem,
    audio: AudioManager
  ): ZombieAIResult {
    const res: ZombieAIResult = { playerHitDamage: 0, screamerSummonPos: null };
    if (!z.active || z.state === 'DEAD') return res;

    if (z.attackTimer > 0) z.attackTimer = Math.max(0, z.attackTimer - dt);
    if (z.screamCooldown > 0) z.screamCooldown = Math.max(0, z.screamCooldown - dt);

    const dx = playerPos.x - z.root.position.x;
    const dz = playerPos.z - z.root.position.z;
    const distToPlayer = Math.hypot(dx, dz);

    // Handle active attack windup telegraph
    if (z.windupTimer > 0) {
      z.windupTimer -= dt;
      // Face player
      z.root.rotation.y = Math.atan2(dx, dz);
      if (z.windupTimer <= 0) {
        if (distToPlayer <= z.attackRange + 0.45) {
          res.playerHitDamage = z.damage;
        }
        z.attackTimer = z.attackCooldown;
        z.state = 'CHASE';
      }
      return res;
    }

    // State transitions
    if (distToPlayer <= z.attackRange && z.attackTimer <= 0) {
      z.state = 'ATTACK';
      z.windupTimer = 0.32;
      audio.playZombieGrowl(false, z.type === 'brute' || z.isBoss);
      return res;
    }

    if (distToPlayer <= z.detectRange || z.state === 'CHASE' || z.state === 'DETECT') {
      z.state = 'CHASE';
    } else {
      z.state = 'PATROL';
    }

    // Screamer special behavior: shriek and summon backup walkers
    if (
      z.type === 'screamer' &&
      z.state === 'CHASE' &&
      z.screamCooldown <= 0 &&
      distToPlayer < 26 &&
      distToPlayer > 5
    ) {
      z.screamCooldown = 14.0;
      audio.playZombieGrowl(true, false);
      res.screamerSummonPos = z.root.position.clone();
    }

    // Navigation target: direct line-of-sight vs airport waypoint graph
    z.pathRecalcTimer -= dt;
    if (z.pathRecalcTimer <= 0) {
      z.pathRecalcTimer = 0.45;
      const hasLOS = collision.hasLineOfSight(
        z.root.position.x,
        z.root.position.z,
        playerPos.x,
        playerPos.z,
        1.2
      );
      if (hasLOS || distToPlayer < 7.5) {
        z.waypointTarget.set(playerPos.x, 0, playerPos.z);
        z.hasWaypoint = false;
      } else {
        const nextWp = findNextWaypointToward(z.root.position, playerPos);
        z.waypointTarget.copy(nextWp);
        z.hasWaypoint = true;
      }
    }

    const tx = z.hasWaypoint ? z.waypointTarget.x : playerPos.x;
    const tz = z.hasWaypoint ? z.waypointTarget.z : playerPos.z;
    _dir.set(tx - z.root.position.x, 0, tz - z.root.position.z);
    const len = _dir.length();
    if (len > 0.05) {
      _dir.divideScalar(len);
    }

    // Obstacle stall detection -> add slight lateral steer to slide around corners
    z.stuckTimer += dt;
    if (z.stuckTimer > 0.6) {
      const moved = z.root.position.distanceTo(z.lastCheckPos);
      if (moved < 0.28 && distToPlayer > z.attackRange + 0.3) {
        // Rotate direction by 65 deg to slip around obstacles
        const angle = (z.id % 2 === 0 ? 1 : -1) * 1.1;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const nx = _dir.x * cos - _dir.z * sin;
        const nz = _dir.x * sin + _dir.z * cos;
        _dir.set(nx, 0, nz);
      }
      z.lastCheckPos.copy(z.root.position);
      z.stuckTimer = 0;
    }

    if (distToPlayer > z.attackRange * 0.8) {
      z.root.position.x += _dir.x * z.speed * dt;
      z.root.position.z += _dir.z * z.speed * dt;
      collision.resolveCircleMovement(z.root.position, z.radius, 1.8);

      // Smoothly rotate toward movement direction
      const targetYaw = Math.atan2(_dir.x, _dir.z);
      let diff = targetYaw - z.root.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      z.root.rotation.y += diff * Math.min(1, dt * 8);
    }

    return res;
  }
}
