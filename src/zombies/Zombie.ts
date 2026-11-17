import * as THREE from 'three';
import { ZOMBIE_CONFIGS, ZombieType } from '../game/GameConfig';
import { ZombieSpawnRequest, ZombieState } from './ZombieTypes';

export class Zombie {
  public id: number;
  public active = false;
  public type: ZombieType = 'walker';
  public state: ZombieState = 'IDLE';

  public root = new THREE.Group();
  private bodyPivot = new THREE.Group();
  private headMesh: THREE.Mesh;
  private torsoMesh: THREE.Mesh;
  private armorPlate: THREE.Mesh;
  private bossCrest: THREE.Mesh;
  private leftArmPivot = new THREE.Group();
  private rightArmPivot = new THREE.Group();
  private leftLegPivot = new THREE.Group();
  private rightLegPivot = new THREE.Group();
  private eyeMat: THREE.MeshBasicMaterial;
  private skinMat: THREE.MeshStandardMaterial;
  private clothMat: THREE.MeshStandardMaterial;

  public hitMeshes: THREE.Mesh[] = [];

  public hp = 85;
  public maxHp = 85;
  public speed = 2.35;
  public damage = 14;
  public attackRange = 1.65;
  public attackCooldown = 1.15;
  public detectRange = 34;
  public scoreValue = 100;
  public radius = 0.45;
  public isMiniBoss = false;
  public isBoss = false;

  public animPhase = Math.random() * Math.PI * 2;
  public attackTimer = 0;
  public windupTimer = 0;
  public hitFlashTimer = 0;
  public deadTimer = 0;
  public screamCooldown = 4.0;
  public patrolTarget = new THREE.Vector3();
  public waypointTarget = new THREE.Vector3();
  public hasWaypoint = false;
  public pathRecalcTimer = 0;
  public stuckTimer = 0;
  public lastCheckPos = new THREE.Vector3();

  constructor(id: number, contactShadowTex: THREE.Texture) {
    this.id = id;

    this.skinMat = new THREE.MeshStandardMaterial({ color: 0x6f7f69, roughness: 0.78, metalness: 0.05 });
    this.clothMat = new THREE.MeshStandardMaterial({ color: 0x3b424c, roughness: 0.85, metalness: 0.08 });
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0xffa726 });
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.45, metalness: 0.65 });

    // Ground contact shadow
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 1.15),
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.52
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.02;
    this.root.add(shadowPlane);

    this.root.add(this.bodyPivot);

    // Legs (pivoted at hip y = 0.78)
    const legGeo = new THREE.BoxGeometry(0.22, 0.76, 0.24);
    const leftLeg = new THREE.Mesh(legGeo, this.clothMat);
    leftLeg.position.y = -0.38;
    leftLeg.castShadow = true;
    this.leftLegPivot.position.set(-0.16, 0.78, 0);
    this.leftLegPivot.add(leftLeg);
    this.bodyPivot.add(this.leftLegPivot);

    const rightLeg = new THREE.Mesh(legGeo, this.clothMat);
    rightLeg.position.y = -0.38;
    rightLeg.castShadow = true;
    this.rightLegPivot.position.set(0.16, 0.78, 0);
    this.rightLegPivot.add(rightLeg);
    this.bodyPivot.add(this.rightLegPivot);

    // Torso
    this.torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.74, 0.32), this.clothMat);
    this.torsoMesh.position.set(0, 1.15, 0);
    this.torsoMesh.castShadow = true;
    this.torsoMesh.userData = { zombieId: id, isHead: false };
    this.bodyPivot.add(this.torsoMesh);

    // Tactical Brute Armor Vest
    this.armorPlate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.54, 0.38), armorMat);
    this.armorPlate.position.set(0, 1.18, 0);
    this.armorPlate.visible = false;
    this.armorPlate.userData = { zombieId: id, isHead: false };
    this.bodyPivot.add(this.armorPlate);

    // Head + Glowing Infected Eyes
    this.headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.4, 0.38), this.skinMat);
    this.headMesh.position.set(0, 1.74, 0.02);
    this.headMesh.castShadow = true;
    this.headMesh.userData = { zombieId: id, isHead: true };
    this.bodyPivot.add(this.headMesh);

    const eyeGeo = new THREE.BoxGeometry(0.08, 0.05, 0.04);
    const leftEye = new THREE.Mesh(eyeGeo, this.eyeMat);
    leftEye.position.set(-0.09, 0.04, 0.19);
    const rightEye = new THREE.Mesh(eyeGeo, this.eyeMat);
    rightEye.position.set(0.09, 0.04, 0.19);
    this.headMesh.add(leftEye, rightEye);

    // Boss hazard crest
    this.bossCrest = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 0),
      new THREE.MeshBasicMaterial({ color: 0xf97316 })
    );
    this.bossCrest.position.set(0, 2.22, 0);
    this.bossCrest.visible = false;
    this.bodyPivot.add(this.bossCrest);

    // Arms (pivoted at shoulder y = 1.44)
    const armGeo = new THREE.BoxGeometry(0.18, 0.68, 0.18);
    const lArm = new THREE.Mesh(armGeo, this.skinMat);
    lArm.position.y = -0.28;
    lArm.castShadow = true;
    lArm.userData = { zombieId: id, isHead: false };
    this.leftArmPivot.position.set(-0.39, 1.44, 0);
    this.leftArmPivot.add(lArm);
    this.bodyPivot.add(this.leftArmPivot);

    const rArm = new THREE.Mesh(armGeo, this.skinMat);
    rArm.position.y = -0.28;
    rArm.castShadow = true;
    rArm.userData = { zombieId: id, isHead: false };
    this.rightArmPivot.position.set(0.39, 1.44, 0);
    this.rightArmPivot.add(rArm);
    this.bodyPivot.add(this.rightArmPivot);

    this.hitMeshes = [this.headMesh, this.torsoMesh, this.armorPlate, lArm, rArm];
    this.root.visible = false;
  }

  public spawn(pos: THREE.Vector3, req: ZombieSpawnRequest): void {
    const cfg = ZOMBIE_CONFIGS[req.type];
    this.type = req.type;
    this.isMiniBoss = Boolean(req.isMiniBoss);
    this.isBoss = Boolean(req.isBoss);
    this.active = true;
    this.state = 'CHASE';

    const bossHpMult = this.isBoss ? 3.2 : this.isMiniBoss ? 2.0 : 1.0;
    const bossScale = this.isBoss ? 1.25 : this.isMiniBoss ? 1.12 : 1.0;

    this.maxHp = Math.round(cfg.hp * req.hpMultiplier * bossHpMult);
    this.hp = this.maxHp;
    this.speed = cfg.speed * req.speedMultiplier * (this.isBoss ? 1.08 : 1.0);
    this.damage = Math.round(cfg.damage * (this.isBoss ? 1.55 : this.isMiniBoss ? 1.25 : 1.0));
    this.attackRange = cfg.attackRange * bossScale;
    this.attackCooldown = cfg.attackCooldown;
    this.detectRange = cfg.detectRange;
    this.scoreValue = Math.round(cfg.score * (this.isBoss ? 5 : this.isMiniBoss ? 3 : 1));

    const totalScale = cfg.scale * bossScale;
    this.radius = req.type === 'brute' ? 0.65 * bossScale : 0.44;
    this.root.scale.setScalar(totalScale);
    this.root.position.copy(pos);
    this.root.position.y = 0;

    // Configure appearance per archetype
    this.skinMat.color.setHex(cfg.skinColor);
    this.skinMat.emissive.setHex(0x000000);
    this.clothMat.color.setHex(this.isBoss ? 0x7f1d1d : cfg.clothColor);
    this.eyeMat.color.setHex(this.isBoss ? 0xff1744 : cfg.eyeColor);

    this.armorPlate.visible = req.type === 'brute' || this.isMiniBoss || this.isBoss;
    this.bossCrest.visible = this.isMiniBoss || this.isBoss;

    // Reset body posture
    this.bodyPivot.rotation.set(0, 0, 0);
    this.bodyPivot.position.set(0, 0, 0);
    if (req.type === 'crawler') {
      this.bodyPivot.rotation.x = 1.28;
      this.bodyPivot.position.set(0, 0.36, -0.4);
    }

    this.attackTimer = 0;
    this.windupTimer = 0;
    this.hitFlashTimer = 0;
    this.deadTimer = 0;
    this.screamCooldown = 3.5;
    this.hasWaypoint = false;
    this.pathRecalcTimer = 0;
    this.stuckTimer = 0;
    this.lastCheckPos.copy(pos);

    this.root.visible = true;
  }

  public takeDamage(amount: number): boolean {
    if (!this.active || this.state === 'DEAD') return false;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlashTimer = 0.12;
    this.skinMat.emissive.setHex(0xff5722);
    if (this.hp <= 0) {
      this.state = 'DEAD';
      this.deadTimer = 1.1;
      return true;
    }
    return false;
  }

  public updateVisuals(dt: number, elapsed: number): boolean {
    if (!this.active) return false;

    // Hit flash decay
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      if (this.hitFlashTimer <= 0) {
        this.skinMat.emissive.setHex(0x000000);
      }
    }

    if (this.state === 'DEAD') {
      this.deadTimer -= dt;
      const t = 1 - Math.max(0, this.deadTimer / 1.1);
      this.bodyPivot.rotation.x = THREE.MathUtils.lerp(this.bodyPivot.rotation.x, -Math.PI / 2, dt * 8);
      this.bodyPivot.position.y = THREE.MathUtils.lerp(this.bodyPivot.position.y, -0.25, dt * 4);
      if (t > 0.65) {
        this.root.position.y -= dt * 0.7;
      }
      if (this.deadTimer <= 0) {
        this.despawn();
        return false;
      }
      return true;
    }

    // Alive animations
    if (this.bossCrest.visible) {
      this.bossCrest.rotation.y = elapsed * 2.5;
    }

    const pace = this.type === 'runner' ? 11.5 : this.type === 'crawler' ? 8.5 : 5.5;
    this.animPhase += dt * pace;

    if (this.windupTimer > 0) {
      // Attack lunge windup telegraph
      const swing = Math.sin((1 - this.windupTimer / 0.32) * Math.PI);
      this.leftArmPivot.rotation.x = -1.6 - swing * 1.1;
      this.rightArmPivot.rotation.x = -1.6 - swing * 1.1;
      this.bodyPivot.rotation.x = this.type === 'crawler' ? 1.28 : 0.22 * swing;
    } else if (this.state === 'CHASE' || this.state === 'PATROL') {
      const swing = Math.sin(this.animPhase) * 0.55;
      this.leftLegPivot.rotation.x = swing;
      this.rightLegPivot.rotation.x = -swing;

      if (this.type === 'crawler') {
        this.leftArmPivot.rotation.x = -1.4 + Math.sin(this.animPhase) * 0.5;
        this.rightArmPivot.rotation.x = -1.4 - Math.sin(this.animPhase) * 0.5;
      } else {
        this.leftArmPivot.rotation.x = -1.25 + Math.sin(this.animPhase * 0.5) * 0.22;
        this.rightArmPivot.rotation.x = -1.25 - Math.sin(this.animPhase * 0.5) * 0.22;
      }
      this.bodyPivot.rotation.z = Math.sin(this.animPhase * 0.5) * (this.type === 'walker' ? 0.08 : 0.04);
    } else {
      // Idle sway
      this.leftLegPivot.rotation.x = 0;
      this.rightLegPivot.rotation.x = 0;
      this.leftArmPivot.rotation.x = -0.35 + Math.sin(elapsed * 2 + this.id) * 0.08;
      this.rightArmPivot.rotation.x = -0.35 - Math.sin(elapsed * 2 + this.id) * 0.08;
    }

    return true;
  }

  public despawn(): void {
    this.active = false;
    this.root.visible = false;
    this.skinMat.emissive.setHex(0x000000);
  }

  public dispose(): void {
    this.root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose());
        else m.material?.dispose();
      }
    });
  }
}
