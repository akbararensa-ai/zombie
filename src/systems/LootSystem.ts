import * as THREE from 'three';
import { InteractionSystem } from '../world/InteractionSystem';
import { AudioManager } from './AudioManager';

export type LootType = 'ammo' | 'medkit' | 'armor' | 'battery' | 'keycard' | 'grenade';

interface LootDrop {
  id: string;
  type: LootType;
  mesh: THREE.Group;
  life: number;
}

const LOOT_COLORS: Record<LootType, number> = {
  ammo: 0xf59e0b,
  medkit: 0x22c55e,
  armor: 0x38bdf8,
  battery: 0xfacc15,
  keycard: 0xa855f7,
  grenade: 0xef4444
};

const LOOT_LABELS: Record<LootType, string> = {
  ammo: 'Pick up Ammunition',
  medkit: 'Pick up Medkit (+1)',
  armor: 'Equip Armor Plate (+35)',
  battery: 'Pick up Battery (+45%)',
  keycard: 'Pick up Airport Keycard',
  grenade: 'Pick up Frag Grenade (+1)'
};

export class LootSystem {
  private drops: LootDrop[] = [];
  private nextId = 1;
  private coreGeo = new THREE.BoxGeometry(0.42, 0.32, 0.32);
  private ringGeo = new THREE.TorusGeometry(0.38, 0.04, 6, 16);

  constructor(
    private scene: THREE.Scene,
    private interaction: InteractionSystem,
    private audio: AudioManager,
    private onPickup: (type: LootType) => void
  ) {}

  public reset(): void {
    for (const d of this.drops) {
      this.interaction.unregister(d.id);
      this.scene.remove(d.mesh);
    }
    this.drops = [];
  }

  public spawnDrop(pos: THREE.Vector3, type: LootType): void {
    if (this.drops.length >= 16) return;

    const id = `loot_${this.nextId++}`;
    const g = new THREE.Group();
    const color = LOOT_COLORS[type];

    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.55,
      roughness: 0.3,
      metalness: 0.35
    });
    const box = new THREE.Mesh(this.coreGeo, mat);
    box.position.y = 0.45;
    g.add(box);

    const ring = new THREE.Mesh(
      this.ringGeo,
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06;
    g.add(ring);

    g.position.set(pos.x, 0, pos.z);
    this.scene.add(g);

    const drop: LootDrop = { id, type, mesh: g, life: 45 };
    this.drops.push(drop);

    this.interaction.register({
      id,
      type: 'loot',
      label: LOOT_LABELS[type],
      position: new THREE.Vector3(pos.x, 0.5, pos.z),
      radius: 2.6,
      mesh: g,
      onInteract: () => {
        this.audio.playPickup();
        this.onPickup(type);
        this.removeDrop(id);
      }
    });
  }

  public maybeDropOnZombieKill(pos: THREE.Vector3, isBossOrMini: boolean): void {
    const chance = isBossOrMini ? 1.0 : 0.32;
    if (Math.random() > chance) return;

    const roll = Math.random();
    let type: LootType = 'ammo';
    if (roll < 0.4) type = 'ammo';
    else if (roll < 0.62) type = 'medkit';
    else if (roll < 0.78) type = 'armor';
    else if (roll < 0.9) type = 'grenade';
    else if (roll < 0.97) type = 'battery';
    else type = 'keycard';

    this.spawnDrop(pos, type);
  }

  private removeDrop(id: string): void {
    this.interaction.unregister(id);
    const idx = this.drops.findIndex((d) => d.id === id);
    if (idx !== -1) {
      const [d] = this.drops.splice(idx, 1);
      this.scene.remove(d.mesh);
    }
  }

  public update(dt: number, elapsed: number): void {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.life -= dt;
      d.mesh.children[0].rotation.y = elapsed * 2.2;
      d.mesh.children[0].position.y = 0.42 + Math.sin(elapsed * 3.5 + i) * 0.08;
      if (d.life <= 0) {
        this.removeDrop(d.id);
      }
    }
  }

  public dispose(): void {
    this.reset();
    this.coreGeo.dispose();
    this.ringGeo.dispose();
  }
}
