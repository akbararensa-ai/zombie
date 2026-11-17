import * as THREE from 'three';

export interface ColliderBox {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxY: number;
  blocksSight: boolean;
  enabled: boolean;
}

const _rayBox = new THREE.Box3();
const _rayHit = new THREE.Vector3();

export class CollisionSystem {
  private colliders: ColliderBox[] = [];
  private worldBounds = { minX: -52.5, maxX: 52.5, minZ: -52.5, maxZ: 33.2 };

  public clear(): void {
    this.colliders = [];
  }

  public addBox(
    id: string,
    cx: number,
    cz: number,
    width: number,
    depth: number,
    maxY = 4.0,
    blocksSight = true
  ): ColliderBox {
    const box: ColliderBox = {
      id,
      minX: cx - width * 0.5,
      maxX: cx + width * 0.5,
      minZ: cz - depth * 0.5,
      maxZ: cz + depth * 0.5,
      maxY,
      blocksSight,
      enabled: true
    };
    this.colliders.push(box);
    return box;
  }

  public addMinMaxBox(
    id: string,
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    maxY = 4.0,
    blocksSight = true
  ): ColliderBox {
    const box: ColliderBox = {
      id,
      minX,
      maxX,
      minZ,
      maxZ,
      maxY,
      blocksSight,
      enabled: true
    };
    this.colliders.push(box);
    return box;
  }

  public setColliderEnabled(id: string, enabled: boolean): void {
    for (let i = 0; i < this.colliders.length; i++) {
      if (this.colliders[i].id === id) {
        this.colliders[i].enabled = enabled;
      }
    }
  }

  /**
   * Resolves horizontal circle vs AABB collisions with smooth wall sliding.
   */
  public resolveCircleMovement(
    pos: THREE.Vector3,
    radius: number,
    actorHeight = 1.6
  ): void {
    // World boundary clamp
    pos.x = THREE.MathUtils.clamp(
      pos.x,
      this.worldBounds.minX + radius,
      this.worldBounds.maxX - radius
    );
    pos.z = THREE.MathUtils.clamp(
      pos.z,
      this.worldBounds.minZ + radius,
      this.worldBounds.maxZ - radius
    );

    // 2 iterations handles corners cleanly
    for (let iter = 0; iter < 2; iter++) {
      for (let i = 0; i < this.colliders.length; i++) {
        const c = this.colliders[i];
        if (!c.enabled) continue;
        // Allow jumping over low props if feet are above maxY
        if (pos.y - actorHeight > c.maxY - 0.15) continue;

        const closestX = THREE.MathUtils.clamp(pos.x, c.minX, c.maxX);
        const closestZ = THREE.MathUtils.clamp(pos.z, c.minZ, c.maxZ);
        const dx = pos.x - closestX;
        const dz = pos.z - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < radius * radius) {
          if (distSq > 0.000001) {
            const dist = Math.sqrt(distSq);
            const push = radius - dist;
            pos.x += (dx / dist) * push;
            pos.z += (dz / dist) * push;
          } else {
            // Inside box center fallback: push out nearest edge
            const penLeft = Math.abs(pos.x - c.minX);
            const penRight = Math.abs(c.maxX - pos.x);
            const penTop = Math.abs(pos.z - c.minZ);
            const penBottom = Math.abs(c.maxZ - pos.z);
            const minPen = Math.min(penLeft, penRight, penTop, penBottom);
            if (minPen === penLeft) pos.x = c.minX - radius;
            else if (minPen === penRight) pos.x = c.maxX + radius;
            else if (minPen === penTop) pos.z = c.minZ - radius;
            else pos.z = c.maxZ + radius;
          }
        }
      }
    }
  }

  public isPointBlocked(x: number, z: number, radius = 0.5): boolean {
    if (
      x < this.worldBounds.minX + radius ||
      x > this.worldBounds.maxX - radius ||
      z < this.worldBounds.minZ + radius ||
      z > this.worldBounds.maxZ - radius
    ) {
      return true;
    }

    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (!c.enabled) continue;
      if (
        x + radius > c.minX &&
        x - radius < c.maxX &&
        z + radius > c.minZ &&
        z - radius < c.maxZ
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns distance to nearest solid wall/obstacle hit by ray, or Infinity if clear.
   */
  public raycastObstacles(
    ray: THREE.Ray,
    maxDistance: number,
    ignoreLowCover = false
  ): number {
    let closest = maxDistance;
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (!c.enabled || !c.blocksSight) continue;
      if (ignoreLowCover && c.maxY < 1.35) continue;

      _rayBox.min.set(c.minX, 0, c.minZ);
      _rayBox.max.set(c.maxX, c.maxY, c.maxZ);
      const hit = ray.intersectBox(_rayBox, _rayHit);
      if (hit) {
        const dist = ray.origin.distanceTo(_rayHit);
        if (dist < closest) {
          closest = dist;
        }
      }
    }
    return closest < maxDistance ? closest : Infinity;
  }

  public hasLineOfSight(
    fromX: number,
    fromZ: number,
    toX: number,
    toZ: number,
    eyeY = 1.25
  ): boolean {
    const dx = toX - fromX;
    const dz = toZ - fromZ;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) return true;

    const ray = new THREE.Ray(
      new THREE.Vector3(fromX, eyeY, fromZ),
      new THREE.Vector3(dx / dist, 0, dz / dist)
    );
    return this.raycastObstacles(ray, dist, true) === Infinity;
  }
}
