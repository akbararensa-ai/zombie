import * as THREE from 'three';

export type InteractableType = 'door' | 'crate' | 'generator' | 'panel' | 'loot';

export interface InteractableObject {
  id: string;
  type: InteractableType;
  label: string;
  position: THREE.Vector3;
  radius: number;
  mesh: THREE.Object3D;
  isOpen?: boolean;
  used?: boolean;
  cooldown?: number;
  maxCooldown?: number;
  colliderId?: string;
  onInteract: () => void;
}

export class InteractionSystem {
  private items: InteractableObject[] = [];
  private activeTarget: InteractableObject | null = null;

  public clear(): void {
    this.items = [];
    this.activeTarget = null;
  }

  public register(obj: InteractableObject): void {
    this.items.push(obj);
  }

  public unregister(id: string): void {
    this.items = this.items.filter((i) => i.id !== id);
    if (this.activeTarget?.id === id) {
      this.activeTarget = null;
    }
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    cameraForward: THREE.Vector3
  ): InteractableObject | null {
    // Update cooldowns
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item.cooldown && item.cooldown > 0) {
        item.cooldown = Math.max(0, item.cooldown - dt);
        if (item.cooldown === 0 && item.type === 'crate') {
          item.used = false;
        }
      }
    }

    let best: InteractableObject | null = null;
    let bestScore = -Infinity;

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (item.used && item.type !== 'door') continue;
      if (item.cooldown && item.cooldown > 0) continue;

      const dx = item.position.x - playerPos.x;
      const dz = item.position.z - playerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > item.radius) continue;

      const invDist = dist > 0.01 ? 1 / dist : 1;
      const dot = (dx * invDist) * cameraForward.x + (dz * invDist) * cameraForward.z;
      // Must be roughly facing or very close
      if (dot < 0.15 && dist > 1.3) continue;

      const score = dot * 2.0 + (item.radius - dist);
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }

    this.activeTarget = best;
    return best;
  }

  public getPrompt(): string | null {
    if (!this.activeTarget) return null;
    return this.activeTarget.label;
  }

  public triggerInteract(): boolean {
    if (!this.activeTarget) return false;
    this.activeTarget.onInteract();
    return true;
  }
}
