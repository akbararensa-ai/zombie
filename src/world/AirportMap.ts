import * as THREE from 'three';
import { QualityLevel, QUALITY_PRESETS } from '../game/GameConfig';
import { AudioManager } from '../systems/AudioManager';
import { CollisionSystem } from '../systems/CollisionSystem';
import {
  buildAirliner,
  buildAirstairs,
  buildBaggageCarousel,
  buildCheckInCounter,
  buildEmergencyGenerator,
  buildGroundTruck,
  buildLoungeBench,
  buildLuggageTrolley,
  buildSecurityScanner,
  buildSupplyCrate,
  buildTerminalPlanter,
  createProceduralTextures,
  createSharedMaterials,
  ProceduralTextureSet,
  SharedMaterials
} from './EnvironmentBuilder';
import { InteractionSystem } from './InteractionSystem';

interface FlickerLight {
  light: THREE.PointLight;
  baseIntensity: number;
  phase: number;
}

export interface AirportMapCallbacks {
  onSupplyCrateOpened: () => void;
  onGeneratorActivated: (scoreBonus: number) => void;
  onDoorToggled: (isOpen: boolean) => void;
}

export class AirportMap {
  public root = new THREE.Group();
  public textures: ProceduralTextureSet;
  public mats: SharedMaterials;
  private flickerLights: FlickerLight[] = [];
  private terminalBoostLights: THREE.PointLight[] = [];
  private generatorActiveTimer = 0;
  private animatedDoors: {
    mesh: THREE.Mesh;
    closedX: number;
    openX: number;
    targetOpen: boolean;
  }[] = [];
  private dirKeyLight: THREE.DirectionalLight;

  constructor(
    scene: THREE.Scene,
    maxAnisotropy: number,
    quality: QualityLevel,
    private collision: CollisionSystem,
    private interaction: InteractionSystem,
    private audio: AudioManager,
    private callbacks: AirportMapCallbacks
  ) {
    this.textures = createProceduralTextures(maxAnisotropy);
    this.mats = createSharedMaterials();

    this.dirKeyLight = this.setupLighting(scene, quality);
    this.buildFloorsAndCeilings();
    this.buildWallsAndZones();
    this.buildZoneADepartureTerminal();
    this.buildZoneBBoardingGate();
    this.buildZoneCBaggageClaim();
    this.buildZoneDCorridorAndPower();
    this.buildZoneEAirportApron();

    scene.add(this.root);
  }

  private setupLighting(scene: THREE.Scene, quality: QualityLevel): THREE.DirectionalLight {
    const preset = QUALITY_PRESETS[quality];

    // Cool overcast night sky / warm tarmac bounce
    const hemi = new THREE.HemisphereLight(0x7c97b8, 0x2a241e, 0.85);
    this.root.add(hemi);

    // Warm flood/moonlight directional key light
    const keyLight = new THREE.DirectionalLight(0xffdfb8, 1.35);
    keyLight.position.set(28, 42, -26);
    keyLight.castShadow = preset.shadows;
    keyLight.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 120;
    const d = 52;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.root.add(keyLight);

    // Interior terminal emergency & skylight points (kept lean for mobile performance)
    const addPoint = (
      x: number,
      y: number,
      z: number,
      color: number,
      intensity: number,
      distance: number,
      flicker = false
    ) => {
      const p = new THREE.PointLight(color, intensity, distance, 1.6);
      p.position.set(x, y, z);
      this.root.add(p);
      if (flicker) {
        this.flickerLights.push({ light: p, baseIntensity: intensity, phase: Math.random() * 10 });
      }
      return p;
    };

    // Departure terminal amber emergency lighting
    addPoint(0, 5.2, 22, 0xffb366, 3.2, 34, false);
    addPoint(-16, 4.8, 22, 0xf97316, 2.1, 24, true);
    addPoint(16, 4.8, 22, 0x93c5fd, 2.2, 24, false);

    // Boarding gate & Baggage claim
    addPoint(-36, 4.8, 8, 0x7dd3fc, 2.6, 28, false);
    addPoint(36, 4.8, 8, 0xfbbf24, 2.5, 28, true);

    // Corridor & Apron floodlight
    addPoint(0, 4.2, -1, 0xf97316, 2.4, 22, true);
    addPoint(-12, 8.5, -24, 0xe0f2fe, 3.4, 42, false);
    addPoint(16, 8.5, -26, 0xfde68a, 3.0, 40, false);

    // Boost lights triggered by Emergency Generator
    const b1 = addPoint(0, 5.8, 18, 0xe0f2fe, 0, 40, false);
    const b2 = addPoint(0, 4.8, -2, 0xe0f2fe, 0, 32, false);
    this.terminalBoostLights.push(b1, b2);

    return keyLight;
  }

  public applyQuality(quality: QualityLevel, shadowsEnabled: boolean): void {
    const preset = QUALITY_PRESETS[quality];
    this.dirKeyLight.castShadow = shadowsEnabled && preset.shadows;
    if (this.dirKeyLight.shadow.mapSize.width !== preset.shadowMapSize) {
      this.dirKeyLight.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
      this.dirKeyLight.shadow.map?.dispose();
      this.dirKeyLight.shadow.map = null;
    }
  }

  private buildFloorsAndCeilings(): void {
    // Indoor terminal floor (Zones A, B, C, D: X[-48..48], Z[-12..34])
    const indoorFloorMat = new THREE.MeshStandardMaterial({
      map: this.textures.tileFloor,
      roughness: 0.42,
      metalness: 0.1
    });
    const indoorFloor = new THREE.Mesh(new THREE.PlaneGeometry(96, 46), indoorFloorMat);
    indoorFloor.rotation.x = -Math.PI / 2;
    indoorFloor.position.set(0, 0, 11);
    indoorFloor.receiveShadow = true;
    this.root.add(indoorFloor);

    // Extended outdoor tarmac ground (Zone E + beyond playable fence so no floating box!)
    const tarmacMat = new THREE.MeshStandardMaterial({
      map: this.textures.tarmac,
      roughness: 0.88,
      metalness: 0.04
    });
    const tarmac = new THREE.Mesh(new THREE.PlaneGeometry(240, 180), tarmacMat);
    tarmac.rotation.x = -Math.PI / 2;
    tarmac.position.set(0, -0.02, -52);
    tarmac.receiveShadow = true;
    this.root.add(tarmac);

    // Terminal high roof / skylight beams (Y = 6.2)
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x161b22, roughness: 0.85, metalness: 0.25 });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(96, 0.35, 46), roofMat);
    roof.position.set(0, 6.4, 11);
    this.root.add(roof);

    // Instanced structural pillars across terminal
    const pillarGeo = new THREE.BoxGeometry(0.9, 6.2, 0.9);
    const pillarPositions: [number, number][] = [
      [-16, 28], [16, 28],
      [-16, 14], [16, 14],
      [-32, 20], [-32, 0],
      [32, 20], [32, 0]
    ];
    const pillars = new THREE.InstancedMesh(pillarGeo, this.mats.brushedSteel, pillarPositions.length);
    pillars.castShadow = true;
    pillars.receiveShadow = true;
    const dummy = new THREE.Object3D();
    pillarPositions.forEach(([px, pz], idx) => {
      dummy.position.set(px, 3.1, pz);
      dummy.updateMatrix();
      pillars.setMatrixAt(idx, dummy.matrix);
      this.collision.addBox(`pillar_${idx}`, px, pz, 0.9, 0.9, 6.2, true);
    });
    pillars.instanceMatrix.needsUpdate = true;
    pillars.computeBoundingSphere();
    this.root.add(pillars);
  }

  private addWall(
    id: string,
    cx: number,
    cz: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    registerCollision = true,
    blocksSight = true
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(cx, h * 0.5, cz);
    mesh.castShadow = h > 2.5;
    mesh.receiveShadow = true;
    this.root.add(mesh);
    if (registerCollision) {
      this.collision.addBox(id, cx, cz, w, d, h, blocksSight);
    }
    return mesh;
  }

  private buildWallsAndZones(): void {
    const wallMat = new THREE.MeshStandardMaterial({
      map: this.textures.wallConcrete,
      roughness: 0.78,
      metalness: 0.1
    });

    // South exterior terminal facade (Z = 34) with glass central entrance
    this.addWall('wall_south_w', -28, 34, 40, 6.2, 0.8, wallMat);
    this.addWall('wall_south_e', 28, 34, 40, 6.2, 0.8, wallMat);
    this.addWall('wall_south_glass', 0, 34, 16, 6.2, 0.4, this.mats.glass, true, false);

    // West & East terminal outer walls
    this.addWall('wall_west_outer', -48, 11, 0.8, 6.2, 46, wallMat);
    this.addWall('wall_east_outer', 48, 11, 0.8, 6.2, 46, wallMat);

    // Zone A <-> Zone B divider (X = -24, wide archway Z ∈ [12, 22])
    this.addWall('wall_ab_s', -24, 28, 0.7, 6.2, 12, wallMat);
    this.addWall('wall_ab_n', -24, 1, 0.7, 6.2, 22, wallMat);
    this.addWall('wall_ab_lintel', -24, 17, 0.7, 2.0, 10, wallMat, false);
    this.root.children[this.root.children.length - 1].position.y = 5.2;

    // Zone A <-> Zone C divider (X = 24, wide archway Z ∈ [12, 22])
    this.addWall('wall_ac_s', 24, 28, 0.7, 6.2, 12, wallMat);
    this.addWall('wall_ac_n', 24, 1, 0.7, 6.2, 22, wallMat);
    this.addWall('wall_ac_lintel', 24, 17, 0.7, 2.0, 10, wallMat, false);
    this.root.children[this.root.children.length - 1].position.y = 5.2;

    // Zone A <-> Zone D divider (Z = 10, two wide archways X ∈ [-14,-4] and [4,14])
    this.addWall('wall_ad_w', -19, 10, 10, 6.2, 0.7, wallMat);
    this.addWall('wall_ad_c', 0, 10, 8, 6.2, 0.7, wallMat);
    this.addWall('wall_ad_e', 19, 10, 10, 6.2, 0.7, wallMat);

    // North Terminal -> Apron curtain wall (Z = -12)
    // West Boarding Gate glass overlook with gate exit at X ∈ [-37, -31]
    this.addWall('wall_bn_w', -42.5, -12, 11, 6.2, 0.7, wallMat);
    this.addWall('wall_bn_glass', -27.5, -12, 7, 4.5, 0.35, this.mats.glass, true, false);
    // East Baggage Claim wall with exit at X ∈ [31, 37]
    this.addWall('wall_cn_e', 42.5, -12, 11, 6.2, 0.7, wallMat);
    this.addWall('wall_cn_glass', 27.5, -12, 7, 4.5, 0.35, this.mats.glass, true, false);

    // Central Corridor -> Apron wall (Z = -12) with 3 exits: X = -12 (door), X = 0 (open breached gate), X = 12 (door)
    this.addWall('wall_dn_w', -19.5, -12, 9, 6.2, 0.7, wallMat);
    this.addWall('wall_dn_ml', -6.5, -12, 7, 6.2, 0.7, wallMat);
    this.addWall('wall_dn_mr', 6.5, -12, 7, 6.2, 0.7, wallMat);
    this.addWall('wall_dn_e', 19.5, -12, 9, 6.2, 0.7, wallMat);

    // Two Interactive Blast/Access Doors at X = -12 and X = 12
    this.createAccessDoor('door_apron_w', -12, -12, 'Access Door (West Apron)');
    this.createAccessDoor('door_apron_e', 12, -12, 'Access Door (East Apron)');
  }

  private createAccessDoor(id: string, cx: number, cz: number, label: string): void {
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(3.8, 3.6, 0.35), this.mats.amberAccent);
    doorMesh.position.set(cx, 1.8, cz);
    doorMesh.castShadow = true;
    this.root.add(doorMesh);

    this.collision.addBox(id, cx, cz, 3.8, 0.5, 3.6, true);
    const doorState = {
      mesh: doorMesh,
      closedX: cx,
      openX: cx + 3.4,
      targetOpen: false
    };
    this.animatedDoors.push(doorState);

    const doorObj = {
      id,
      type: 'door' as const,
      label: `Open ${label}`,
      position: new THREE.Vector3(cx, 1.2, cz),
      radius: 3.4,
      mesh: doorMesh,
      isOpen: false,
      colliderId: id,
      onInteract: () => {
        doorState.targetOpen = !doorState.targetOpen;
        doorObj.isOpen = doorState.targetOpen;
        doorObj.label = `${doorState.targetOpen ? 'Close' : 'Open'} ${label}`;
        this.collision.setColliderEnabled(id, !doorState.targetOpen);
        this.callbacks.onDoorToggled(doorState.targetOpen);
        this.audio.playReload();
      }
    };
    this.interaction.register(doorObj);
  }

  private buildZoneADepartureTerminal(): void {
    // Check-in counters
    const c1 = buildCheckInCounter(this.mats, this.textures.fidsScreen);
    c1.position.set(-9, 0, 21);
    this.root.add(c1);
    this.collision.addBox('checkin_w', -9, 21, 4.6, 1.6, 1.4, false);

    const c2 = buildCheckInCounter(this.mats, this.textures.fidsScreen);
    c2.position.set(9, 0, 21);
    this.root.add(c2);
    this.collision.addBox('checkin_e', 9, 21, 4.6, 1.6, 1.4, false);

    // Waiting Lounge Benches
    const benchCoords: [number, number, number][] = [
      [-10, 28, 0],
      [-5, 28, 0],
      [5, 28, 0],
      [10, 28, 0],
      [0, 15.5, 0]
    ];
    benchCoords.forEach(([bx, bz, rot], i) => {
      const bench = buildLoungeBench(this.mats);
      bench.position.set(bx, 0, bz);
      bench.rotation.y = rot;
      this.root.add(bench);
      this.collision.addBox(`bench_a_${i}`, bx, bz, 2.7, 0.85, 1.0, false);
    });

    // Terminal Palms
    for (const [px, pz, idx] of [[-19, 14, 1], [19, 14, 2]] as [number, number, number][]) {
      const palm = buildTerminalPlanter(this.mats);
      palm.position.set(px, 0, pz);
      this.root.add(palm);
      this.collision.addBox(`palm_a_${idx}`, px, pz, 1.3, 1.3, 2.5, false);
    }

    // Main Departure FIDS Overhead Board
    const fidsMat = new THREE.MeshStandardMaterial({
      map: this.textures.fidsScreen,
      emissive: 0xffffff,
      emissiveMap: this.textures.fidsScreen,
      emissiveIntensity: 0.55,
      roughness: 0.25
    });
    const fidsBoard = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.6, 0.25), fidsMat);
    fidsBoard.position.set(0, 4.1, 10.6);
    this.root.add(fidsBoard);

    // Directional signage
    const signMat = new THREE.MeshStandardMaterial({
      map: this.textures.signCorridor,
      emissive: 0xffffff,
      emissiveMap: this.textures.signCorridor,
      emissiveIntensity: 0.35
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.1, 0.18), signMat);
    sign.position.set(0, 5.2, 24);
    this.root.add(sign);
  }

  private buildZoneBBoardingGate(): void {
    // Security Scanner Arches
    for (const [sx, sz, idx] of [[-29, 17, 1], [-29, 14, 2]] as [number, number, number][]) {
      const arch = buildSecurityScanner(this.mats);
      arch.position.set(sx, 0, sz);
      arch.rotation.y = Math.PI / 2;
      this.root.add(arch);
    }

    // Boarding gate seating
    const bCoords: [number, number][] = [
      [-40, 14],
      [-40, 8],
      [-40, 2],
      [-32, 4]
    ];
    bCoords.forEach(([bx, bz], i) => {
      const bench = buildLoungeBench(this.mats);
      bench.position.set(bx, 0, bz);
      bench.rotation.y = Math.PI / 2;
      this.root.add(bench);
      this.collision.addBox(`bench_b_${i}`, bx, bz, 0.9, 2.7, 1.0, false);
    });

    // Gate Counter
    const counter = buildCheckInCounter(this.mats, this.textures.fidsScreen);
    counter.position.set(-38, 0, -6.5);
    this.root.add(counter);
    this.collision.addBox('gate_counter_b', -38, -6.5, 4.6, 1.6, 1.4, false);

    // Gate Sign
    const gSignMat = new THREE.MeshStandardMaterial({
      map: this.textures.signGate,
      emissive: 0xffffff,
      emissiveMap: this.textures.signGate,
      emissiveIntensity: 0.38
    });
    const gSign = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.0, 0.16), gSignMat);
    gSign.position.set(-34, 4.6, -11.4);
    this.root.add(gSign);

    // Supply Crate in Gate B
    this.createSupplyCrate('crate_gate_b', -44.5, 22);
  }

  private buildZoneCBaggageClaim(): void {
    // Twin Baggage Carousels
    for (const [cx, cz, idx] of [[33, 8, 1], [42, 8, 2]] as [number, number, number][]) {
      const carousel = buildBaggageCarousel(this.mats);
      carousel.position.set(cx, 0, cz);
      this.root.add(carousel);
      this.collision.addBox(`carousel_${idx}`, cx, cz, 3.4, 9.4, 1.2, false);
    }

    // Luggage Trolleys
    for (const [tx, tz, rot, idx] of [
      [28, 18, 0.4, 1],
      [38, 20, -0.8, 2],
      [29, -4, 1.2, 3]
    ] as [number, number, number, number][]) {
      const trolley = buildLuggageTrolley(this.mats);
      trolley.position.set(tx, 0, tz);
      trolley.rotation.y = rot;
      this.root.add(trolley);
      this.collision.addBox(`trolley_${idx}`, tx, tz, 1.0, 1.3, 1.1, false);
    }

    // Baggage Sign
    const bSignMat = new THREE.MeshStandardMaterial({
      map: this.textures.signBaggage,
      emissive: 0xffffff,
      emissiveMap: this.textures.signBaggage,
      emissiveIntensity: 0.38
    });
    const bSign = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.0, 0.16), bSignMat);
    bSign.position.set(34, 4.6, -11.4);
    this.root.add(bSign);

    this.createSupplyCrate('crate_baggage_c', 44.5, 22);
  }

  private buildZoneDCorridorAndPower(): void {
    // Central Security Kiosk cover
    const kiosk = buildCheckInCounter(this.mats, this.textures.fidsScreen);
    kiosk.position.set(0, 0, 3);
    this.root.add(kiosk);
    this.collision.addBox('corridor_kiosk', 0, 3, 4.6, 1.6, 1.4, false);

    // Storage lockers / cover crates
    for (const [cx, cz, idx] of [[-18, 5, 1], [18, 5, 2]] as [number, number, number][]) {
      const crate = buildSupplyCrate(this.mats);
      crate.position.set(cx, 0, cz);
      this.root.add(crate);
      this.collision.addBox(`cover_d_${idx}`, cx, cz, 1.35, 0.95, 0.9, false);
    }

    // Emergency Generator (Interactable!)
    const gen = buildEmergencyGenerator(this.mats);
    gen.position.set(-19, 0, -6);
    this.root.add(gen);
    this.collision.addBox('generator_d', -19, -6, 2.2, 1.2, 1.5, false);

    const genObj = {
      id: 'generator_d',
      type: 'generator' as const,
      label: 'Activate Emergency Generator (+Power & +150 Score)',
      position: new THREE.Vector3(-19, 1.0, -6),
      radius: 3.3,
      mesh: gen,
      used: false,
      cooldown: 0,
      onInteract: () => {
        this.generatorActiveTimer = 25;
        genObj.cooldown = 35;
        this.audio.playWaveComplete();
        this.callbacks.onGeneratorActivated(150);
      }
    };
    this.interaction.register(genObj);

    // Corridor crate
    this.createSupplyCrate('crate_corridor_d', 19, -6);
  }

  private buildZoneEAirportApron(): void {
    // Parked Commercial Airliner
    const plane = buildAirliner(this.mats);
    plane.position.set(-7, 0, -34);
    plane.rotation.y = 0.14;
    this.root.add(plane);
    // Register simplified collision boxes for fuselage and wings
    this.collision.addBox('plane_fuselage', -7, -34, 22, 4.4, 5.2, true);
    this.collision.addBox('plane_wings', -7.5, -34, 5.5, 22, 3.2, false);

    // Boarding Airstairs near aircraft forward door
    const stairs = buildAirstairs(this.mats);
    stairs.position.set(1.2, 0, -28.5);
    stairs.rotation.y = -Math.PI / 2;
    this.root.add(stairs);
    this.collision.addBox('plane_stairs', 1.2, -28.5, 2.0, 4.0, 3.2, false);

    // Ground-handling Fuel Truck & Cargo Tug
    const fuelTruck = buildGroundTruck(this.mats, true);
    fuelTruck.position.set(22, 0, -25);
    fuelTruck.rotation.y = -0.35;
    this.root.add(fuelTruck);
    this.collision.addBox('apron_fuel_truck', 22, -25, 4.8, 2.3, 2.4, true);

    const cargoTruck = buildGroundTruck(this.mats, false);
    cargoTruck.position.set(-34, 0, -28);
    cargoTruck.rotation.y = 0.65;
    this.root.add(cargoTruck);
    this.collision.addBox('apron_cargo_truck', -34, -28, 4.4, 2.4, 2.4, true);

    // Cargo cover crates on Apron
    this.createSupplyCrate('crate_apron_e', 14, -39);

    // Perimeter Chain-Link Airport Fence Posts (InstancedMesh)
    const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 6);
    const postPositions: [number, number][] = [];
    for (let x = -52; x <= 52; x += 6.5) {
      postPositions.push([x, -53]);
    }
    for (let z = -53; z <= -14; z += 6.5) {
      postPositions.push([-52, z], [52, z]);
    }
    const posts = new THREE.InstancedMesh(postGeo, this.mats.brushedSteel, postPositions.length);
    const dummy = new THREE.Object3D();
    postPositions.forEach(([px, pz], idx) => {
      dummy.position.set(px, 1.6, pz);
      dummy.updateMatrix();
      posts.setMatrixAt(idx, dummy.matrix);
    });
    posts.instanceMatrix.needsUpdate = true;
    posts.computeBoundingSphere();
    this.root.add(posts);

    // Semi-transparent fence panels along North & Side perimeters
    const fenceMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.7,
      metalness: 0.5,
      transparent: true,
      opacity: 0.42,
      wireframe: true
    });
    const northFence = new THREE.Mesh(new THREE.PlaneGeometry(104, 3.0, 26, 2), fenceMat);
    northFence.position.set(0, 1.5, -53);
    this.root.add(northFence);
  }

  private createSupplyCrate(id: string, x: number, z: number): void {
    const crate = buildSupplyCrate(this.mats);
    crate.position.set(x, 0, z);
    this.root.add(crate);
    this.collision.addBox(id, x, z, 1.35, 0.95, 0.9, false);

    const obj = {
      id,
      type: 'crate' as const,
      label: 'Open Supply Crate (Ammo & Supplies)',
      position: new THREE.Vector3(x, 0.7, z),
      radius: 2.8,
      mesh: crate,
      used: false,
      cooldown: 0,
      onInteract: () => {
        obj.used = true;
        obj.cooldown = 32; // Respawns after 32s
        this.audio.playPickup();
        this.callbacks.onSupplyCrateOpened();
      }
    };
    this.interaction.register(obj);
  }

  public update(dt: number, elapsed: number): void {
    // Flickering emergency lights
    for (let i = 0; i < this.flickerLights.length; i++) {
      const f = this.flickerLights[i];
      const wave =
        Math.sin(elapsed * 9.5 + f.phase) * 0.3 +
        Math.sin(elapsed * 23.0 + f.phase * 2.1) * 0.2;
      f.light.intensity = Math.max(0.25, f.baseIntensity * (0.85 + wave));
    }

    // Emergency generator boost lights
    if (this.generatorActiveTimer > 0) {
      this.generatorActiveTimer = Math.max(0, this.generatorActiveTimer - dt);
      const target = this.generatorActiveTimer > 0 ? 4.2 : 0;
      for (const l of this.terminalBoostLights) {
        l.intensity = THREE.MathUtils.damp(l.intensity, target, 5, dt);
      }
    } else {
      for (const l of this.terminalBoostLights) {
        if (l.intensity > 0.01) {
          l.intensity = THREE.MathUtils.damp(l.intensity, 0, 3, dt);
        }
      }
    }

    // Smooth sliding doors
    for (const d of this.animatedDoors) {
      const targetX = d.targetOpen ? d.openX : d.closedX;
      d.mesh.position.x = THREE.MathUtils.damp(d.mesh.position.x, targetX, 8, dt);
    }
  }

  public dispose(): void {
    this.root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
    Object.values(this.textures).forEach((t) => t.dispose());
    this.root.parent?.remove(this.root);
  }
}
