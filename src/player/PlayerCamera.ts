import * as THREE from 'three';
import { WeaponId } from '../game/GameConfig';

export class PlayerCamera {
  public camera: THREE.PerspectiveCamera;
  public yaw = 0;
  public pitch = 0;
  private baseFov = 72;
  private bobTimer = 0;
  private shakeIntensity = 0;
  private recoilOffsetPitch = 0;
  private recoilOffsetYaw = 0;
  private weaponKickZ = 0;
  private muzzleFlashTimer = 0;

  // First-person weapon viewmodel + flashlight
  private weaponRig = new THREE.Group();
  private weaponModels: Record<WeaponId, THREE.Group>;
  private activeWeaponId: WeaponId = 'pistol';
  private muzzleFlashMesh: THREE.Mesh;
  private muzzleLight: THREE.PointLight;
  public flashlight: THREE.SpotLight;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(this.baseFov, aspect, 0.1, 160);
    this.camera.rotation.order = 'YXZ';

    // Tactical Flashlight attached to camera
    this.flashlight = new THREE.SpotLight(0xfff4e0, 4.2, 42, Math.PI / 5.5, 0.48, 1.4);
    this.flashlight.position.set(0.18, -0.14, -0.2);
    this.flashlight.target.position.set(0, -0.05, -10);
    this.camera.add(this.flashlight);
    this.camera.add(this.flashlight.target);

    // Muzzle flash light & star
    this.muzzleLight = new THREE.PointLight(0xffb74d, 0, 9, 2);
    this.muzzleLight.position.set(0.22, -0.14, -0.9);
    this.camera.add(this.muzzleLight);

    const flashGeo = new THREE.OctahedronGeometry(0.08, 0);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.9
    });
    this.muzzleFlashMesh = new THREE.Mesh(flashGeo, flashMat);
    this.muzzleFlashMesh.visible = false;
    this.weaponRig.add(this.muzzleFlashMesh);

    this.weaponModels = {
      pistol: this.buildPistolModel(),
      rifle: this.buildRifleModel(),
      shotgun: this.buildShotgunModel()
    };

    Object.values(this.weaponModels).forEach((m) => {
      m.visible = false;
      this.weaponRig.add(m);
    });
    this.weaponModels.pistol.visible = true;

    this.weaponRig.position.set(0.24, -0.22, -0.42);
    this.camera.add(this.weaponRig);
  }

  private buildPistolModel(): THREE.Group {
    const g = new THREE.Group();
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x1e242b, roughness: 0.35, metalness: 0.78 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.82, metalness: 0.1 });
    const sightMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.058, 0.28), gunMat);
    slide.position.set(0, 0.03, -0.04);
    g.add(slide);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.03, 0.22), gripMat);
    frame.position.set(0, -0.01, -0.02);
    g.add(frame);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.13, 0.068), gripMat);
    grip.position.set(0, -0.07, 0.055);
    grip.rotation.x = 0.22;
    g.add(grip);

    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.014, 0.014), sightMat);
    frontSight.position.set(0, 0.065, -0.16);
    g.add(frontSight);

    return g;
  }

  private buildRifleModel(): THREE.Group {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 0.4, metalness: 0.72 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x3b4252, roughness: 0.32, metalness: 0.85 });
    const magMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.65, metalness: 0.2 });

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.085, 0.38), bodyMat);
    receiver.position.set(0, 0.01, -0.02);
    g.add(receiver);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.34, 8), railMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.025, -0.35);
    g.add(barrel);

    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.065, 0.24), railMat);
    handguard.position.set(0, 0.015, -0.25);
    g.add(handguard);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.17, 0.075), magMat);
    mag.position.set(0, -0.09, -0.07);
    mag.rotation.x = -0.15;
    g.add(mag);

    const optic = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.046, 0.11), bodyMat);
    optic.position.set(0, 0.074, -0.02);
    g.add(optic);

    return g;
  }

  private buildShotgunModel(): THREE.Group {
    const g = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x2b313a, roughness: 0.36, metalness: 0.8 });
    const stockMat = new THREE.MeshStandardMaterial({ color: 0x4b3621, roughness: 0.76, metalness: 0.08 });

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.08, 0.28), metalMat);
    receiver.position.set(0, 0.01, 0.02);
    g.add(receiver);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.44, 10), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.032, -0.3);
    g.add(barrel);

    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.36, 8), metalMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, -0.005, -0.26);
    g.add(tube);

    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.052, 0.17), stockMat);
    pump.position.set(0, -0.012, -0.24);
    g.add(pump);

    return g;
  }

  public setWeaponModel(id: WeaponId): void {
    this.activeWeaponId = id;
    (Object.keys(this.weaponModels) as WeaponId[]).forEach((k) => {
      this.weaponModels[k].visible = k === id;
    });
    this.weaponKickZ = 0.08;
  }

  public reset(): void {
    this.yaw = 0;
    this.pitch = 0;
    this.shakeIntensity = 0;
    this.recoilOffsetPitch = 0;
    this.recoilOffsetYaw = 0;
    this.weaponKickZ = 0;
    this.muzzleFlashTimer = 0;
    this.flashlight.visible = true;
  }

  public addLookDelta(dx: number, dy: number, sensitivity: number): void {
    const scale = 0.0024 * sensitivity;
    this.yaw -= dx * scale;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * scale, -1.35, 1.35);
  }

  public triggerRecoil(pitchAmt: number, yawAmt: number): void {
    this.recoilOffsetPitch += pitchAmt;
    this.recoilOffsetYaw += (Math.random() - 0.5) * 2 * yawAmt;
    this.weaponKickZ = Math.min(0.14, this.weaponKickZ + 0.065);
    this.muzzleFlashTimer = 0.045;
    this.muzzleFlashMesh.position.set(0, 0.035, this.activeWeaponId === 'pistol' ? -0.24 : -0.56);
    this.muzzleFlashMesh.rotation.z = Math.random() * Math.PI;
  }

  public addShake(amount: number): void {
    this.shakeIntensity = Math.min(0.35, this.shakeIntensity + amount);
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    moveRatio: number,
    isSprinting: boolean,
    isGrounded: boolean,
    landDip: number,
    isReloading: boolean,
    reloadProgress: number
  ): void {
    // Exponential recoil recovery
    this.recoilOffsetPitch = THREE.MathUtils.damp(this.recoilOffsetPitch, 0, 12, dt);
    this.recoilOffsetYaw = THREE.MathUtils.damp(this.recoilOffsetYaw, 0, 12, dt);
    this.shakeIntensity = THREE.MathUtils.damp(this.shakeIntensity, 0, 10, dt);
    this.weaponKickZ = THREE.MathUtils.damp(this.weaponKickZ, 0, 15, dt);

    // Subtle head bobbing when moving
    if (isGrounded && moveRatio > 0.08) {
      this.bobTimer += dt * (isSprinting ? 13.5 : 8.5);
    }
    const bobAmp = isGrounded ? moveRatio * (isSprinting ? 0.042 : 0.022) : 0;
    const bobY = Math.sin(this.bobTimer) * bobAmp;
    const bobX = Math.cos(this.bobTimer * 0.5) * bobAmp * 0.7;

    // Camera shake
    const shakeX = (Math.random() - 0.5) * this.shakeIntensity * 0.14;
    const shakeY = (Math.random() - 0.5) * this.shakeIntensity * 0.14;

    this.camera.position.set(
      playerPos.x + bobX,
      playerPos.y + bobY - landDip,
      playerPos.z
    );

    this.camera.rotation.set(
      THREE.MathUtils.clamp(this.pitch + this.recoilOffsetPitch + shakeY, -1.45, 1.45),
      this.yaw + this.recoilOffsetYaw + shakeX,
      0,
      'YXZ'
    );

    // Sprint FOV kick
    const targetFov = isSprinting ? 78 : this.baseFov;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 9, dt);
      this.camera.updateProjectionMatrix();
    }

    // Weapon viewmodel sway + reload tilt
    const reloadDip = isReloading ? Math.sin(reloadProgress * Math.PI) * 0.16 : 0;
    const reloadTilt = isReloading ? Math.sin(reloadProgress * Math.PI) * 0.65 : 0;
    this.weaponRig.position.set(
      0.24 + bobX * 0.4,
      -0.22 - reloadDip + bobY * 0.4,
      -0.42 + this.weaponKickZ
    );
    this.weaponRig.rotation.set(reloadTilt + this.weaponKickZ * 1.4, 0, isReloading ? -0.35 : 0);

    // Muzzle flash
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      this.muzzleFlashMesh.visible = true;
      this.muzzleLight.intensity = 4.5;
    } else {
      this.muzzleFlashMesh.visible = false;
      this.muzzleLight.intensity = 0;
    }
  }
}
