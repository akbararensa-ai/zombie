import * as THREE from 'three';
import { ZombieManager } from '../zombies/ZombieManager';
import { AudioManager } from './AudioManager';
import { CollisionSystem } from './CollisionSystem';
import { WeaponManager } from './WeaponManager';

interface PooledSpark {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
}

interface ActiveGrenade {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  fuse: number;
}

interface ExplosionRing {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _spreadDir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();

export class CombatSystem {
  private raycaster = new THREE.Raycaster();
  private sparks: PooledSpark[] = [];
  private grenades: ActiveGrenade[] = [];
  private explosions: ExplosionRing[] = [];
  private grenadeGeo = new THREE.SphereGeometry(0.14, 10, 8);
  private grenadeMat = new THREE.MeshStandardMaterial({
    color: 0x3f4d36,
    emissive: 0xf97316,
    emissiveIntensity: 0.6,
    roughness: 0.4
  });
  private ringGeo = new THREE.SphereGeometry(1, 16, 12);

  constructor(private scene: THREE.Scene, particleBudget = 48) {
    const sparkGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    for (let i = 0; i < particleBudget; i++) {
      const m = new THREE.Mesh(sparkGeo, sparkMat);
      m.visible = false;
      this.scene.add(m);
      this.sparks.push({ mesh: m, vel: new THREE.Vector3(), life: 0 });
    }
  }

  public reset(): void {
    for (const s of this.sparks) {
      s.life = 0;
      s.mesh.visible = false;
    }
    for (const g of this.grenades) {
      this.scene.remove(g.mesh);
    }
    this.grenades = [];
    for (const e of this.explosions) {
      this.scene.remove(e.mesh);
      (e.mesh.material as THREE.Material).dispose();
    }
    this.explosions = [];
  }

  private spawnSparkBurst(pos: THREE.Vector3, count: number): void {
    let spawned = 0;
    for (let i = 0; i < this.sparks.length && spawned < count; i++) {
      const s = this.sparks[i];
      if (s.life > 0) continue;
      s.life = 0.24 + Math.random() * 0.14;
      s.mesh.position.copy(pos);
      s.vel.set(
        (Math.random() - 0.5) * 6,
        1.5 + Math.random() * 4,
        (Math.random() - 0.5) * 6
      );
      s.mesh.visible = true;
      spawned++;
    }
  }

  public fireWeapon(
    camera: THREE.PerspectiveCamera,
    weapons: WeaponManager,
    zombies: ZombieManager,
    collision: CollisionSystem,
    audio: AudioManager
  ): {
    fired: boolean;
    dryFire: boolean;
    hitAny: boolean;
    hitCrit: boolean;
    recoilPitch: number;
    recoilYaw: number;
  } {
    const cfg = weapons.getConfig();
    if (!weapons.consumeShot()) {
      const st = weapons.getState();
      if (st.mag === 0 && !weapons.isReloading) {
        audio.playDryFire();
        weapons.startReload();
        return {
          fired: false,
          dryFire: true,
          hitAny: false,
          hitCrit: false,
          recoilPitch: 0,
          recoilYaw: 0
        };
      }
      return {
        fired: false,
        dryFire: false,
        hitAny: false,
        hitCrit: false,
        recoilPitch: 0,
        recoilYaw: 0
      };
    }

    audio.playGunshot(cfg.id);

    camera.getWorldPosition(_rayOrigin);
    camera.getWorldDirection(_rayDir);
    _right.set(1, 0, 0).applyQuaternion(camera.quaternion);
    _up.set(0, 1, 0).applyQuaternion(camera.quaternion);

    const targets = zombies.getAliveHitMeshes();
    let hitAny = false;
    let hitCrit = false;

    for (let p = 0; p < cfg.pellets; p++) {
      _spreadDir.copy(_rayDir);
      if (cfg.spread > 0) {
        _spreadDir.addScaledVector(_right, (Math.random() - 0.5) * 2 * cfg.spread);
        _spreadDir.addScaledVector(_up, (Math.random() - 0.5) * 2 * cfg.spread);
        _spreadDir.normalize();
      }

      this.raycaster.set(_rayOrigin, _spreadDir);
      this.raycaster.far = cfg.range;

      // Check solid wall occlusion first
      const wallDist = collision.raycastObstacles(this.raycaster.ray, cfg.range, true);
      const intersects = this.raycaster.intersectObjects(targets, false);

      if (intersects.length > 0 && intersects[0].distance < wallDist) {
        const hit = intersects[0];
        const { zombieId, isHead } = hit.object.userData as {
          zombieId: number;
          isHead: boolean;
        };
        const dmg = isHead ? Math.round(cfg.damage * 1.6) : cfg.damage;
        if (zombies.damageZombieById(zombieId, dmg, isHead)) {
          hitAny = true;
          if (isHead) hitCrit = true;
          this.spawnSparkBurst(hit.point, cfg.pellets > 1 ? 2 : 5);
        }
      } else if (wallDist < cfg.range) {
        const wallPt = _rayOrigin.clone().addScaledVector(_spreadDir, wallDist);
        this.spawnSparkBurst(wallPt, 2);
      }
    }

    if (hitAny) {
      audio.playHitMarker(hitCrit);
    }

    return {
      fired: true,
      dryFire: false,
      hitAny,
      hitCrit,
      recoilPitch: cfg.recoilPitch,
      recoilYaw: cfg.recoilYaw
    };
  }

  public throwGrenade(camera: THREE.PerspectiveCamera): void {
    const mesh = new THREE.Mesh(this.grenadeGeo, this.grenadeMat);
    camera.getWorldPosition(mesh.position);
    camera.getWorldDirection(_rayDir);
    mesh.position.addScaledVector(_rayDir, 0.7);
    mesh.position.y -= 0.15;

    const vel = _rayDir.clone().multiplyScalar(15.5);
    vel.y += 4.2;

    this.scene.add(mesh);
    this.grenades.push({ mesh, vel, fuse: 1.55 });
  }

  public update(
    dt: number,
    zombies: ZombieManager,
    collision: CollisionSystem,
    audio: AudioManager,
    onExplosionShake: (intensity: number) => void
  ): void {
    // Update sparks
    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.mesh.visible = false;
        continue;
      }
      s.vel.y -= 12 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
    }

    // Update active grenades
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.fuse -= dt;
      g.vel.y -= 16 * dt;
      g.mesh.position.addScaledVector(g.vel, dt);
      g.mesh.rotation.x += dt * 8;
      g.mesh.rotation.z += dt * 5;

      if (g.mesh.position.y <= 0.16) {
        g.mesh.position.y = 0.16;
        g.vel.y = Math.abs(g.vel.y) * 0.42;
        g.vel.x *= 0.72;
        g.vel.z *= 0.72;
      }
      collision.resolveCircleMovement(g.mesh.position, 0.18, 0.3);

      if (g.fuse <= 0) {
        // Detonate stylized low-poly amber shockwave!
        audio.playExplosion();
        zombies.damageInRadius(g.mesh.position, 7.5, 240);
        this.spawnSparkBurst(g.mesh.position, 16);
        onExplosionShake(0.32);

        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xf97316,
          transparent: true,
          opacity: 0.75,
          wireframe: false
        });
        const ring = new THREE.Mesh(this.ringGeo, ringMat);
        ring.position.copy(g.mesh.position);
        ring.scale.setScalar(0.5);
        this.scene.add(ring);
        this.explosions.push({ mesh: ring, life: 0.42, maxLife: 0.42 });

        this.scene.remove(g.mesh);
        this.grenades.splice(i, 1);
      }
    }

    // Update explosion shockwave spheres
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const e = this.explosions[i];
      e.life -= dt;
      if (e.life <= 0) {
        this.scene.remove(e.mesh);
        (e.mesh.material as THREE.Material).dispose();
        this.explosions.splice(i, 1);
        continue;
      }
      const prog = 1 - e.life / e.maxLife;
      e.mesh.scale.setScalar(0.8 + prog * 6.8);
      (e.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - prog) * 0.75;
    }
  }

  public dispose(): void {
    this.reset();
    this.grenadeGeo.dispose();
    this.grenadeMat.dispose();
    this.ringGeo.dispose();
  }
}
