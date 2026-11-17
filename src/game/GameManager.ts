import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PlayerController } from '../player/PlayerController';
import { AudioManager } from '../systems/AudioManager';
import { CollisionSystem } from '../systems/CollisionSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { InventorySystem } from '../systems/InventorySystem';
import { LootSystem, LootType } from '../systems/LootSystem';
import { WaveManager } from '../systems/WaveManager';
import { WeaponManager } from '../systems/WeaponManager';
import { AirportMap } from '../world/AirportMap';
import { InteractionSystem } from '../world/InteractionSystem';
import { getAirportZoneAt } from '../world/SpawnPoints';
import { ZombieManager } from '../zombies/ZombieManager';
import {
  GameSettings,
  loadHighScore,
  QUALITY_PRESETS,
  saveHighScore,
  WeaponId,
  WEAPONS
} from './GameConfig';
import { GameLoop } from './GameLoop';
import { createInitialHUDState, GameOverStats, HUDState, ScannerBlip, ScreenMode } from './GameState';

export interface GameManagerListener {
  onHUDUpdate: (hud: HUDState) => void;
  onScreenModeChange: (mode: ScreenMode, stats?: GameOverStats) => void;
  onContextLost?: (lost: boolean) => void;
}

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class GameManager {
  public screenMode: ScreenMode = 'MENU';
  public settings: GameSettings;
  public audio: AudioManager;

  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private isSoftwareGl: boolean;
  private scene: THREE.Scene;
  private menuCamera: THREE.PerspectiveCamera;
  private envRT: THREE.WebGLRenderTarget;

  private collision = new CollisionSystem();
  private interaction = new InteractionSystem();
  private player: PlayerController;
  private airport: AirportMap;
  private zombies: ZombieManager;
  private waves = new WaveManager();
  private weapons: WeaponManager;
  private combat: CombatSystem;
  private loot: LootSystem;
  private inventory = new InventorySystem();
  private loop: GameLoop;

  private elapsed = 0;
  private survivalTime = 0;
  private score = 0;
  private kills = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private hitMarkerTimer = 0;
  private hitMarkerCrit = false;
  private announcementText: string | null = null;
  private announcementTimer = 0;
  private hudSyncTimer = 0;
  private startWeapon: WeaponId = 'pistol';
  private pointerLocked = false;
  private fireQueued = false;

  constructor(
    container: HTMLElement,
    initialSettings: GameSettings,
    private listener: GameManagerListener
  ) {
    this.container = container;
    this.settings = { ...initialSettings };
    this.audio = new AudioManager(this.settings);
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const aspect = width / height;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance'
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.applyRendererQuality();

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x0b0f17);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0x0b0f17, QUALITY_PRESETS[this.settings.quality].fogDensity);

    // Mandatory studio environment reflection
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmrem.dispose();

    // Cameras
    this.menuCamera = new THREE.PerspectiveCamera(58, aspect, 0.2, 180);
    this.player = new PlayerController(aspect);
    this.scene.add(this.player.cameraCtrl.camera);

    this.weapons = new WeaponManager(this.startWeapon);

    // World
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.airport = new AirportMap(
      this.scene,
      maxAniso,
      this.settings.quality,
      this.collision,
      this.interaction,
      this.audio,
      {
        onSupplyCrateOpened: () => {
          this.weapons.refillCurrentOrAll(0.45);
          this.inventory.medkits = Math.min(4, this.inventory.medkits + 1);
          this.inventory.grenades = Math.min(4, this.inventory.grenades + 1);
          this.inventory.battery = Math.min(100, this.inventory.battery + 35);
          this.showAnnouncement('SUPPLY CRATE RESUPPLIED', 2.2);
          this.pushHUD();
        },
        onGeneratorActivated: (bonus) => {
          this.score += bonus;
          this.showAnnouncement('EMERGENCY POWER RESTORED (+150)', 2.8);
          this.pushHUD();
        },
        onDoorToggled: (isOpen) => {
          this.showAnnouncement(isOpen ? 'APRON ACCESS OPENED' : 'APRON ACCESS SEALED', 1.6);
        }
      }
    );

    // Loot & Combat
    this.loot = new LootSystem(this.scene, this.interaction, this.audio, (type) => {
      this.handleLootPickup(type);
    });
    this.combat = new CombatSystem(
      this.scene,
      QUALITY_PRESETS[this.settings.quality].particlePoolSize
    );

    // Zombies
    this.zombies = new ZombieManager(
      this.scene,
      this.airport.textures.contactShadow,
      26,
      this.audio,
      {
        onPlayerDamaged: (amount) => {
          if (this.screenMode !== 'PLAYING') return;
          if (this.player.health.takeDamage(amount)) {
            this.audio.playPlayerHurt();
            this.player.cameraCtrl.addShake(0.16);
            if (this.player.health.isDead()) {
              this.triggerGameOver();
            }
          }
        },
        onZombieKilled: (z, isHeadshot) => {
          this.kills++;
          this.score += z.scoreValue + (isHeadshot ? 35 : 0);
          this.waves.notifyZombieKilled();
          this.loot.maybeDropOnZombieKill(z.root.position, z.isBoss || z.isMiniBoss);
        },
        onScreamerSummon: (pos) => {
          if (!this.waves.canScreamerSummon()) return;
          this.showAnnouncement('SCREAMER ALERT · REINFORCEMENTS!', 2.2);
          const fwd = this.player.getHorizontalForward();
          for (let i = 0; i < 2; i++) {
            this.zombies.spawn(
              { type: 'walker', hpMultiplier: 1.0, speedMultiplier: 1.05 },
              this.player.getPosition(),
              fwd,
              this.collision,
              pos
            );
          }
        }
      }
    );

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.menuCamera);
    }

    this.bindEvents();
    this.loop = new GameLoop(this.renderer, this.isSoftwareGl, (dt) => this.tick(dt));
    this.loop.start();
  }

  private applyRendererQuality(): void {
    const preset = QUALITY_PRESETS[this.settings.quality];
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, preset.pixelRatioMax)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && preset.shadows;
    if (this.scene?.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = preset.fogDensity;
    }
    this.airport?.applyQuality(this.settings.quality, !this.isSoftwareGl);
  }

  public updateSettings(next: GameSettings): void {
    this.settings = { ...next };
    this.audio.applySettings(this.settings);
    this.applyRendererQuality();
  }

  public setStartWeapon(w: WeaponId): void {
    this.startWeapon = w;
  }

  public startNewGame(): void {
    this.audio.unlock();
    this.player.reset();
    this.weapons.reset(this.startWeapon);
    this.player.cameraCtrl.setWeaponModel(this.startWeapon);
    this.zombies.reset();
    this.combat.reset();
    this.loot.reset();
    this.inventory.reset();
    this.waves.reset();

    this.survivalTime = 0;
    this.score = 0;
    this.kills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.hitMarkerTimer = 0;
    this.fireQueued = false;

    // Seed 2 starter pickups in terminal wings to reward exploration
    this.loot.spawnDrop(new THREE.Vector3(-12, 0, 18), 'ammo');
    this.loot.spawnDrop(new THREE.Vector3(12, 0, 18), 'armor');

    const w1 = this.waves.startWave(1);
    this.audio.playWaveStart();
    this.showAnnouncement(`WAVE 1 · ${w1.title.toUpperCase()}`, 3.0);

    this.screenMode = 'PLAYING';
    this.listener.onScreenModeChange('PLAYING');
    this.pushHUD();
  }

  public pauseGame(): void {
    if (this.screenMode !== 'PLAYING') return;
    this.player.input.fireHeld = false;
    this.player.input.moveX = 0;
    this.player.input.moveY = 0;
    this.player.input.sprint = false;
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    this.screenMode = 'PAUSED';
    this.listener.onScreenModeChange('PAUSED');
  }

  public resumeGame(): void {
    if (this.screenMode !== 'PAUSED') return;
    this.audio.unlock();
    this.screenMode = 'PLAYING';
    this.listener.onScreenModeChange('PLAYING');
  }

  public returnToMenu(): void {
    this.player.input.fireHeld = false;
    this.player.input.moveX = 0;
    this.player.input.moveY = 0;
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    this.zombies.reset();
    this.screenMode = 'MENU';
    this.listener.onScreenModeChange('MENU');
  }

  private triggerGameOver(): void {
    this.audio.playGameOver();
    this.player.input.fireHeld = false;
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }

    const prevBest = loadHighScore();
    const saved = saveHighScore(this.score, this.waves.waveNumber);
    const accuracy =
      this.shotsFired > 0 ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0;

    const stats: GameOverStats = {
      highestWave: this.waves.waveNumber,
      kills: this.kills,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      accuracy,
      survivalTime: this.survivalTime,
      score: this.score,
      highScore: saved.highScore,
      bestWave: saved.bestWave,
      isNewRecord: this.score > prevBest.highScore && this.score > 0
    };

    this.screenMode = 'GAME_OVER';
    this.listener.onScreenModeChange('GAME_OVER', stats);
  }

  // Controls exposed to React MobileControls & PC keyboard handlers
  public setMoveInput(x: number, y: number): void {
    this.player.input.moveX = x;
    this.player.input.moveY = y;
  }

  public setSprint(held: boolean): void {
    this.player.input.sprint = held;
  }

  public triggerJump(): void {
    this.player.input.jumpQueued = true;
  }

  public addLookDelta(dx: number, dy: number): void {
    if (this.screenMode !== 'PLAYING') return;
    this.player.cameraCtrl.addLookDelta(dx, dy, this.settings.cameraSensitivity);
  }

  public setFireHeld(held: boolean): void {
    this.audio.unlock();
    if (held && !this.player.input.fireHeld) {
      this.fireQueued = true;
    }
    this.player.input.fireHeld = held;
  }

  public triggerReload(): void {
    if (this.screenMode !== 'PLAYING') return;
    if (this.weapons.startReload()) {
      this.audio.playReload();
    }
  }

  public switchWeapon(target?: WeaponId): void {
    if (this.screenMode !== 'PLAYING') return;
    const next = this.weapons.switchWeapon(target);
    this.player.cameraCtrl.setWeaponModel(next);
    this.audio.playReload();
    this.pushHUD();
  }

  public triggerInteract(): void {
    if (this.screenMode !== 'PLAYING') return;
    this.interaction.triggerInteract();
    this.pushHUD();
  }

  public useMedkit(): void {
    if (this.screenMode !== 'PLAYING') return;
    if (this.inventory.medkits <= 0) return;
    if (this.player.health.heal(45)) {
      this.inventory.medkits--;
      this.audio.playPickup();
      this.showAnnouncement('MEDKIT APPLIED (+45 HP)', 1.5);
      this.pushHUD();
    }
  }

  public useAmmoPack(): void {
    if (this.screenMode !== 'PLAYING') return;
    if (this.inventory.ammoPacks <= 0) return;
    this.inventory.ammoPacks--;
    this.weapons.refillCurrentOrAll(0.45);
    this.audio.playReload();
    this.showAnnouncement('AMMO PACK EQUIPPED', 1.5);
    this.pushHUD();
  }

  public throwGrenade(): void {
    if (this.screenMode !== 'PLAYING') return;
    if (this.inventory.grenades <= 0) return;
    this.inventory.grenades--;
    this.combat.throwGrenade(this.player.cameraCtrl.camera);
    this.audio.playReload();
    this.pushHUD();
  }

  public toggleFlashlight(): void {
    if (this.screenMode !== 'PLAYING') return;
    const on = this.inventory.toggleFlashlight();
    this.player.cameraCtrl.flashlight.visible = on;
    this.audio.playPickup();
    this.pushHUD();
  }

  public triggerScanner(): void {
    if (this.screenMode !== 'PLAYING') return;
    if (this.inventory.triggerScanner()) {
      this.audio.playPickup();
      this.showAnnouncement('BIO-SCANNER ACTIVE', 2.0);
      this.pushHUD();
    }
  }

  public requestPointerLock(): void {
    if (this.screenMode !== 'PLAYING') return;
    const el = this.renderer.domElement;
    if (document.pointerLockElement !== el && el.requestPointerLock) {
      try {
        void el.requestPointerLock();
      } catch {
        // Ignore on unsupported mobile browsers
      }
    }
  }

  private handleLootPickup(type: LootType): void {
    if (type === 'ammo') {
      this.weapons.refillCurrentOrAll(0.35);
      this.showAnnouncement('+AMMUNITION', 1.4);
    } else if (type === 'medkit') {
      this.inventory.medkits = Math.min(4, this.inventory.medkits + 1);
      this.showAnnouncement('+1 MEDKIT', 1.4);
    } else if (type === 'armor') {
      this.player.health.addArmor(35);
      this.showAnnouncement('+35 ARMOR', 1.4);
    } else if (type === 'battery') {
      this.inventory.battery = Math.min(100, this.inventory.battery + 45);
      this.showAnnouncement('+45% BATTERY', 1.4);
    } else if (type === 'keycard') {
      this.inventory.keycards++;
      this.score += 100;
      this.showAnnouncement('KEYCARD ACQUIRED (+100)', 1.8);
    } else if (type === 'grenade') {
      this.inventory.grenades = Math.min(4, this.inventory.grenades + 1);
      this.showAnnouncement('+1 FRAG GRENADE', 1.4);
    }
    this.pushHUD();
  }

  private showAnnouncement(text: string, duration: number): void {
    this.announcementText = text;
    this.announcementTimer = duration;
  }

  private tick(dt: number): void {
    this.elapsed += dt;
    this.airport.update(dt, this.elapsed);

    if (this.screenMode === 'MENU') {
      // Smooth atmospheric camera pan across the Abandoned Airport & Airliner
      const t = this.elapsed * 0.14;
      this.menuCamera.position.set(
        Math.sin(t) * 26,
        7.5 + Math.sin(t * 1.4) * 1.6,
        -12 + Math.cos(t) * 26
      );
      this.menuCamera.lookAt(-2, 2.2, -20);
      this.renderer.render(this.scene, this.menuCamera);
      return;
    }

    if (this.screenMode === 'PAUSED' || this.screenMode === 'GAME_OVER') {
      this.renderer.render(this.scene, this.player.cameraCtrl.camera);
      return;
    }

    // PLAYING simulation
    this.survivalTime += dt;
    if (this.announcementTimer > 0) {
      this.announcementTimer -= dt;
      if (this.announcementTimer <= 0) this.announcementText = null;
    }
    if (this.hitMarkerTimer > 0) {
      this.hitMarkerTimer = Math.max(0, this.hitMarkerTimer - dt);
    }

    const reloadFinished = this.weapons.update(dt);
    if (reloadFinished) {
      this.audio.playPickup();
    }

    this.inventory.update(dt);
    this.player.cameraCtrl.flashlight.visible =
      this.inventory.flashlightOn && this.inventory.battery > 0;

    this.player.update(
      dt,
      this.collision,
      this.audio,
      this.weapons.isReloading,
      this.weapons.getReloadProgress()
    );

    // Weapon firing (semi-auto edge OR full-auto held)
    const cfg = this.weapons.getConfig();
    const wantsFire = cfg.automatic ? this.player.input.fireHeld : this.fireQueued;
    this.fireQueued = false;

    if (wantsFire) {
      const result = this.combat.fireWeapon(
        this.player.cameraCtrl.camera,
        this.weapons,
        this.zombies,
        this.collision,
        this.audio
      );
      if (result.fired) {
        this.shotsFired++;
        this.player.cameraCtrl.triggerRecoil(result.recoilPitch, result.recoilYaw);
        if (result.hitAny) {
          this.shotsHit++;
          this.hitMarkerTimer = 0.14;
          this.hitMarkerCrit = result.hitCrit;
        }
      }
    }

    const playerPos = this.player.getPosition();
    const camFwd = this.player.getHorizontalForward();

    // Interactions & Loot
    this.interaction.update(dt, playerPos, camFwd);
    this.loot.update(dt, this.elapsed);

    // Zombies & Combat projectiles
    this.zombies.update(dt, this.elapsed, playerPos, this.collision);
    this.combat.update(dt, this.zombies, this.collision, this.audio, (shake) => {
      this.player.cameraCtrl.addShake(shake);
    });

    // Wave progression
    const maxActive = QUALITY_PRESETS[this.settings.quality].maxActiveZombies;
    const waveStep = this.waves.update(dt, this.zombies.getActiveCount(), maxActive);
    if (waveStep.spawnNext) {
      this.zombies.spawn(waveStep.spawnNext, playerPos, camFwd, this.collision);
    }
    if (waveStep.waveCompleted) {
      this.audio.playWaveComplete();
      this.score += this.waves.waveNumber * 200;
      this.showAnnouncement(
        `WAVE ${this.waves.waveNumber} CLEARED · PREPARE FOR NEXT WAVE`,
        3.5
      );
    }
    if (waveStep.startNextWave) {
      const next = this.waves.startWave(this.waves.waveNumber + 1);
      this.audio.playWaveStart();
      this.showAnnouncement(`WAVE ${next.waveNumber} · ${next.title.toUpperCase()}`, 3.0);
    }

    this.renderer.render(this.scene, this.player.cameraCtrl.camera);

    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.065) {
      this.hudSyncTimer = 0;
      this.pushHUD();
    }
  }

  private computeScannerBlips(): ScannerBlip[] {
    if (this.inventory.scannerActiveTimer <= 0) return [];
    const blips: ScannerBlip[] = [];
    const pPos = this.player.getPosition();
    const yaw = this.player.cameraCtrl.yaw;

    for (const z of this.zombies.pool) {
      if (!z.active || z.state === 'DEAD') continue;
      const dx = z.root.position.x - pPos.x;
      const dz = z.root.position.z - pPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 45) continue;
      const worldAngle = Math.atan2(dx, -dz);
      const relAngle = worldAngle + yaw;
      blips.push({ angleRad: relAngle, distance: dist, isBoss: z.isBoss || z.isMiniBoss });
    }
    return blips;
  }

  private pushHUD(): void {
    const pPos = this.player.getPosition();
    const zone = getAirportZoneAt(pPos.x, pPos.z);
    const wCfg = this.weapons.getConfig();
    const wSt = this.weapons.getState();

    const state: HUDState = {
      ...createInitialHUDState(this.weapons.currentWeapon),
      hp: Math.ceil(this.player.health.hp),
      maxHp: this.player.health.maxHp,
      armor: Math.ceil(this.player.health.armor),
      maxArmor: this.player.health.maxArmor,
      wave: this.waves.waveNumber,
      waveTitle: this.waves.waveTitle,
      wavePhase: this.waves.phase,
      prepCountdown: Math.ceil(this.waves.prepTimer),
      zombiesRemaining: this.waves.getZombiesRemaining(),
      totalWaveZombies: this.waves.totalZombies,
      score: this.score,
      survivalTime: this.survivalTime,
      kills: this.kills,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      weaponId: wCfg.id,
      weaponName: wCfg.name,
      magAmmo: wSt.mag,
      magSize: wCfg.magSize,
      reserveAmmo: wSt.reserve,
      isReloading: this.weapons.isReloading,
      reloadProgress: this.weapons.getReloadProgress(),
      isSprinting: this.player.movement.isSprinting,
      zoneName: `Zone ${zone.id} · ${zone.name}`,
      interactPrompt: this.interaction.getPrompt(),
      hitMarkerTimer: this.hitMarkerTimer,
      hitMarkerCrit: this.hitMarkerCrit,
      damageFlash: this.player.health.damageFlash,
      announcement: this.announcementText,
      inventory: this.inventory.getSnapshot(),
      scannerActive: this.inventory.scannerActiveTimer > 0,
      scannerBlips: this.computeScannerBlips(),
      pointerLocked: this.pointerLocked
    };

    this.listener.onHUDUpdate(state);
  }

  private onResize = (): void => {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    const aspect = w / h;
    this.menuCamera.aspect = aspect;
    this.menuCamera.updateProjectionMatrix();
    this.player.cameraCtrl.camera.aspect = aspect;
    this.player.cameraCtrl.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onPointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    this.pushHUD();
  };

  private onContextLost = (e: Event): void => {
    e.preventDefault();
    this.listener.onContextLost?.(true);
  };

  private onContextRestored = (): void => {
    this.listener.onContextLost?.(false);
  };

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  public dispose(): void {
    this.loop.stop();
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);

    this.airport.dispose();
    this.zombies.dispose();
    this.combat.dispose();
    this.loot.dispose();
    this.audio.dispose();
    this.envRT.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
