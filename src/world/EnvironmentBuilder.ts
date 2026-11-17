import * as THREE from 'three';

export interface ProceduralTextureSet {
  tileFloor: THREE.CanvasTexture;
  tarmac: THREE.CanvasTexture;
  wallConcrete: THREE.CanvasTexture;
  fidsScreen: THREE.CanvasTexture;
  signCorridor: THREE.CanvasTexture;
  signGate: THREE.CanvasTexture;
  signBaggage: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const mkTex = (
    w: number,
    h: number,
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
    repeatX = 1,
    repeatY = 1,
    srgb = true
  ): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    draw(ctx, w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = maxAnisotropy;
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  // Terminal terrazzo floor tiles
  const tileFloor = mkTex(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#2c333d';
      ctx.fillRect(0, 0, w, h);
      // Subtle speckle
      for (let i = 0; i < 450; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)';
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      // Tile seams
      ctx.strokeStyle = '#1b2028';
      ctx.lineWidth = 3;
      const step = w / 2;
      ctx.strokeRect(0, 0, step, step);
      ctx.strokeRect(step, 0, step, step);
      ctx.strokeRect(0, step, step, step);
      ctx.strokeRect(step, step, step, step);
    },
    18,
    18
  );

  // Outdoor tarmac asphalt with subtle grit
  const tarmac = mkTex(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#1a1e24';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 800; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.12)';
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
    },
    16,
    16
  );

  // Architectural concrete panel wall
  const wallConcrete = mkTex(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#343b46';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#292f38';
      ctx.fillRect(0, h * 0.72, w, h * 0.28);
      ctx.strokeStyle = '#1f242c';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, w - 4, h - 4);
      // Warning stripe near base
      ctx.fillStyle = '#b45309';
      ctx.fillRect(0, h * 0.7, w, 6);
    },
    6,
    1
  );

  // Flight Information Display Screen (FIDS)
  const fidsScreen = mkTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#090d14';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(0, 0, w, 44);
    ctx.fillStyle = '#090d14';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('DEPARTURES // TERMINAL 1', 18, 30);

    const rows = [
      ['FL 402', 'SINGAPORE', 'CANCELLED'],
      ['FL 819', 'TOKYO HND', 'QUARANTINE'],
      ['FL 115', 'SYDNEY', 'EVACUATION'],
      ['FL 607', 'FRANKFURT', 'DELAYED'],
      ['FL 990', 'LAST EXIT', 'GATE A1']
    ];
    ctx.font = 'bold 18px monospace';
    rows.forEach((r, idx) => {
      const y = 84 + idx * 36;
      ctx.fillStyle = idx === 4 ? '#f59e0b' : '#cbd5e1';
      ctx.fillText(r[0], 18, y);
      ctx.fillText(r[1], 125, y);
      ctx.fillStyle = idx === 4 ? '#22c55e' : '#ef4444';
      ctx.fillText(r[2], 325, y);
    });
  });

  const makeSignTex = (title: string, sub: string, bg = '#1e293b', accent = '#f59e0b') =>
    mkTex(512, 128, (ctx, w, h) => {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, 16, h);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText(title, 34, 58);
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(sub, 34, 98);
    });

  const signCorridor = makeSignTex('← GATES A1-A2   |   APRON ↑', 'BAGGAGE CLAIM →');
  const signGate = makeSignTex('BOARDING GATE A1', 'INTERNATIONAL DEPARTURES');
  const signBaggage = makeSignTex('BAGGAGE CLAIM', 'CAROUSEL 1 & 2');

  const contactShadow = mkTex(
    128,
    128,
    (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
      grad.addColorStop(0, 'rgba(0,0,0,0.62)');
      grad.addColorStop(0.6, 'rgba(0,0,0,0.22)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
    1,
    1,
    false
  );
  contactShadow.wrapS = THREE.ClampToEdgeWrapping;
  contactShadow.wrapT = THREE.ClampToEdgeWrapping;

  return {
    tileFloor,
    tarmac,
    wallConcrete,
    fidsScreen,
    signCorridor,
    signGate,
    signBaggage,
    contactShadow
  };
}

export interface SharedMaterials {
  darkMetal: THREE.MeshStandardMaterial;
  brushedSteel: THREE.MeshStandardMaterial;
  counterTop: THREE.MeshStandardMaterial;
  counterBody: THREE.MeshStandardMaterial;
  seatFabric: THREE.MeshStandardMaterial;
  amberAccent: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  aircraftHull: THREE.MeshStandardMaterial;
  aircraftStripe: THREE.MeshStandardMaterial;
  rubberTire: THREE.MeshStandardMaterial;
  suitcaseBlue: THREE.MeshStandardMaterial;
  suitcaseRed: THREE.MeshStandardMaterial;
  crateOlive: THREE.MeshStandardMaterial;
  emergencyGlow: THREE.MeshStandardMaterial;
}

export function createSharedMaterials(): SharedMaterials {
  return {
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x222730, roughness: 0.48, metalness: 0.72 }),
    brushedSteel: new THREE.MeshStandardMaterial({ color: 0x8b95a5, roughness: 0.28, metalness: 0.86 }),
    counterTop: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.3, metalness: 0.1 }),
    counterBody: new THREE.MeshStandardMaterial({ color: 0x27303f, roughness: 0.75, metalness: 0.12 }),
    seatFabric: new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.85, metalness: 0.05 }),
    amberAccent: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.45, metalness: 0.25 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      roughness: 0.12,
      metalness: 0.15,
      transparent: true,
      opacity: 0.28,
      depthWrite: false
    }),
    aircraftHull: new THREE.MeshStandardMaterial({ color: 0xd8dee9, roughness: 0.34, metalness: 0.45 }),
    aircraftStripe: new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.42, metalness: 0.25 }),
    rubberTire: new THREE.MeshStandardMaterial({ color: 0x15181c, roughness: 0.9, metalness: 0.05 }),
    suitcaseBlue: new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.65, metalness: 0.1 }),
    suitcaseRed: new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6, metalness: 0.12 }),
    crateOlive: new THREE.MeshStandardMaterial({ color: 0x3f4d36, roughness: 0.72, metalness: 0.18 }),
    emergencyGlow: new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf97316,
      emissiveIntensity: 1.4,
      roughness: 0.3
    })
  };
}

/**
 * Composite Check-In Counter Island (6 parts)
 */
export function buildCheckInCounter(mats: SharedMaterials, fidsTex: THREE.Texture): THREE.Group {
  const g = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.95, 1.3), mats.counterBody);
  base.position.set(0, 0.475, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);

  const top = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.1, 1.5), mats.counterTop);
  top.position.set(0, 1.0, 0);
  top.receiveShadow = true;
  g.add(top);

  const scaleDeck = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.8), mats.brushedSteel);
  scaleDeck.position.set(-1.35, 0.07, 1.05);
  g.add(scaleDeck);

  // Two terminal monitors
  const monMat = new THREE.MeshStandardMaterial({
    map: fidsTex,
    emissive: 0xffffff,
    emissiveMap: fidsTex,
    emissiveIntensity: 0.35,
    roughness: 0.3
  });
  for (const sx of [-0.9, 0.9]) {
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.35, 8), mats.darkMetal);
    stand.position.set(sx, 1.2, -0.2);
    g.add(stand);

    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.4, 0.05), monMat);
    screen.position.set(sx, 1.42, -0.2);
    g.add(screen);
  }

  return g;
}

/**
 * Composite Waiting Lounge 3-Seat Bench (8 parts)
 */
export function buildLoungeBench(mats: SharedMaterials): THREE.Group {
  const g = new THREE.Group();

  const beam = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.12), mats.brushedSteel);
  beam.position.set(0, 0.4, 0);
  g.add(beam);

  for (const lx of [-1.05, 1.05]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.55), mats.darkMetal);
    leg.position.set(lx, 0.2, 0);
    g.add(leg);
  }

  for (const sx of [-0.82, 0, 0.82]) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.52), mats.seatFabric);
    cushion.position.set(sx, 0.46, 0.05);
    cushion.castShadow = true;
    g.add(cushion);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.48, 0.08), mats.seatFabric);
    back.position.set(sx, 0.72, -0.2);
    back.rotation.x = -0.12;
    back.castShadow = true;
    g.add(back);
  }

  return g;
}

/**
 * Composite Baggage Carousel (6 parts + suitcases)
 */
export function buildBaggageCarousel(mats: SharedMaterials): THREE.Group {
  const g = new THREE.Group();

  const belt = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.48, 9.2), mats.darkMetal);
  belt.position.set(0, 0.24, 0);
  belt.castShadow = true;
  belt.receiveShadow = true;
  g.add(belt);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 9.4), mats.brushedSteel);
  trim.position.set(0, 0.46, 0);
  g.add(trim);

  const island = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 7.0), mats.counterBody);
  island.position.set(0, 0.55, 0);
  g.add(island);

  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 12), mats.emergencyGlow);
  beacon.position.set(0, 1.18, 0);
  g.add(beacon);

  // Abandoned suitcases
  const case1 = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.45, 0.28), mats.suitcaseBlue);
  case1.position.set(-1.1, 0.71, -2.2);
  case1.rotation.y = 0.25;
  g.add(case1);

  const case2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.26), mats.suitcaseRed);
  case2.position.set(1.05, 0.67, 1.8);
  case2.rotation.y = -0.4;
  g.add(case2);

  return g;
}

/**
 * Composite Security Scanner Arch (5 parts)
 */
export function buildSecurityScanner(mats: SharedMaterials): THREE.Group {
  const g = new THREE.Group();
  const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.35, 0.75), mats.counterTop);
  leftPillar.position.set(-0.78, 1.175, 0);
  leftPillar.castShadow = true;
  g.add(leftPillar);

  const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.35, 0.75), mats.counterTop);
  rightPillar.position.set(0.78, 1.175, 0);
  rightPillar.castShadow = true;
  g.add(rightPillar);

  const header = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.34, 0.78), mats.darkMetal);
  header.position.set(0, 2.42, 0);
  g.add(header);

  const led = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), mats.emergencyGlow);
  led.position.set(0, 2.42, 0.38);
  g.add(led);

  return g;
}

/**
 * Composite Luggage Trolley (6 parts)
 */
export function buildLuggageTrolley(mats: SharedMaterials): THREE.Group {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 1.25), mats.brushedSteel);
  deck.position.set(0, 0.22, 0);
  g.add(deck);

  const handleFrame = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.95, 0.08), mats.brushedSteel);
  handleFrame.position.set(0, 0.7, 0.58);
  g.add(handleFrame);

  for (const wx of [-0.32, 0.32]) {
    for (const wz of [-0.48, 0.48]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 10), mats.rubberTire);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.11, wz);
      g.add(wheel);
    }
  }

  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.42, 0.46), mats.suitcaseRed);
  bag.position.set(0, 0.47, -0.08);
  bag.rotation.y = 0.14;
  g.add(bag);

  return g;
}

/**
 * Composite Commercial Airliner (11 parts)
 */
export function buildAirliner(mats: SharedMaterials): THREE.Group {
  const g = new THREE.Group();

  // Fuselage
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 22, 16), mats.aircraftHull);
  fuselage.rotation.z = Math.PI / 2;
  fuselage.position.set(0, 3.6, 0);
  fuselage.castShadow = true;
  fuselage.receiveShadow = true;
  g.add(fuselage);

  // Orange livery stripe
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(2.13, 2.13, 20.5, 16), mats.aircraftStripe);
  stripe.rotation.z = Math.PI / 2;
  stripe.position.set(0, 3.6, 0);
  stripe.scale.set(1, 0.18, 1);
  g.add(stripe);

  // Nose cone
  const nose = new THREE.Mesh(new THREE.ConeGeometry(2.1, 4.4, 16), mats.aircraftHull);
  nose.rotation.z = -Math.PI / 2;
  nose.position.set(13.2, 3.55, 0);
  nose.castShadow = true;
  g.add(nose);

  // Cockpit windshield
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 1.8), mats.darkMetal);
  cockpit.position.set(11.6, 4.35, 0);
  cockpit.rotation.z = -0.3;
  g.add(cockpit);

  // Swept Left & Right Wings
  const wingGeo = new THREE.BoxGeometry(4.8, 0.28, 13.5);
  const leftWing = new THREE.Mesh(wingGeo, mats.aircraftHull);
  leftWing.position.set(-0.5, 3.0, -7.8);
  leftWing.rotation.y = 0.24;
  leftWing.castShadow = true;
  g.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeo, mats.aircraftHull);
  rightWing.position.set(-0.5, 3.0, 7.8);
  rightWing.rotation.y = -0.24;
  rightWing.castShadow = true;
  g.add(rightWing);

  // Twin Turbofan Engines
  const engGeo = new THREE.CylinderGeometry(0.78, 0.72, 3.0, 12);
  for (const ez of [-6.0, 6.0]) {
    const engine = new THREE.Mesh(engGeo, mats.brushedSteel);
    engine.rotation.z = Math.PI / 2;
    engine.position.set(0.8, 2.05, ez);
    engine.castShadow = true;
    g.add(engine);
  }

  // Vertical Tail Fin + Horizontal Stabilizers
  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.4, 0.35), mats.aircraftStripe);
  tailFin.position.set(-10.2, 6.5, 0);
  tailFin.rotation.z = 0.28;
  tailFin.castShadow = true;
  g.add(tailFin);

  const hStab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 8.2), mats.aircraftHull);
  hStab.position.set(-10.5, 4.3, 0);
  g.add(hStab);

  // Landing Gear Struts & Wheels
  const gearPositions: [number, number][] = [
    [9.5, 0],
    [-1.2, -2.2],
    [-1.2, 2.2]
  ];
  for (const [gx, gz] of gearPositions) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.7, 8), mats.brushedSteel);
    strut.position.set(gx, 1.0, gz);
    g.add(strut);

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.36, 12), mats.rubberTire);
    tire.rotation.x = Math.PI / 2;
    tire.position.set(gx, 0.45, gz);
    g.add(tire);
  }

  return g;
}

/**
 * Composite Ground-Handling Truck (7 parts)
 */
export function buildGroundTruck(mats: SharedMaterials, isFuelTruck: boolean): THREE.Group {
  const g = new THREE.Group();

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.45, 2.1), mats.darkMetal);
  chassis.position.set(0, 0.65, 0);
  g.add(chassis);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.45, 1.95), mats.amberAccent);
  cab.position.set(1.55, 1.55, 0);
  cab.castShadow = true;
  g.add(cab);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 1.7), mats.darkMetal);
  windshield.position.set(2.28, 1.75, 0);
  g.add(windshield);

  if (isFuelTruck) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.0, 14), mats.brushedSteel);
    tank.rotation.z = Math.PI / 2;
    tank.position.set(-0.85, 1.65, 0);
    tank.castShadow = true;
    g.add(tank);
  } else {
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.4, 2.0), mats.counterTop);
    cargo.position.set(-0.85, 1.55, 0);
    cargo.castShadow = true;
    g.add(cargo);
  }

  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.18, 8), mats.emergencyGlow);
  beacon.position.set(1.55, 2.36, 0);
  g.add(beacon);

  for (const wx of [-1.6, 1.5]) {
    for (const wz of [-1.02, 1.02]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 12), mats.rubberTire);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.42, wz);
      g.add(wheel);
    }
  }

  return g;
}

/**
 * Composite Boarding Airstairs (5 parts)
 */
export function buildAirstairs(mats: SharedMaterials): THREE.Group {
  const g = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.55, 1.7), mats.amberAccent);
  base.position.set(0, 0.42, 0);
  g.add(base);

  const ramp = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.3, 1.35), mats.brushedSteel);
  ramp.position.set(0.2, 1.9, 0);
  ramp.rotation.z = 0.58;
  ramp.castShadow = true;
  g.add(ramp);

  const platform = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 1.5), mats.brushedSteel);
  platform.position.set(2.05, 3.05, 0);
  g.add(platform);

  for (const wz of [-0.75, 0.75]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10), mats.rubberTire);
    w.rotation.x = Math.PI / 2;
    w.position.set(-1.1, 0.32, wz);
    g.add(w);

    const w2 = w.clone();
    w2.position.set(1.1, 0.32, wz);
    g.add(w2);
  }

  return g;
}

/**
 * Composite Supply Crate (4 parts)
 */
export function buildSupplyCrate(mats: SharedMaterials): THREE.Group {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.75, 0.85), mats.crateOlive);
  box.position.set(0, 0.375, 0);
  box.castShadow = true;
  box.receiveShadow = true;
  g.add(box);

  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.12, 0.92), mats.darkMetal);
  lid.position.set(0, 0.78, 0);
  g.add(lid);

  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.08), mats.emergencyGlow);
  latch.position.set(0, 0.65, 0.44);
  g.add(latch);

  return g;
}

/**
 * Composite Emergency Generator (5 parts)
 */
export function buildEmergencyGenerator(mats: SharedMaterials): THREE.Group {
  const g = new THREE.Group();

  const skid = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 1.2), mats.darkMetal);
  skid.position.set(0, 0.09, 0);
  g.add(skid);

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.25, 1.0), mats.amberAccent);
  body.position.set(0, 0.8, 0);
  body.castShadow = true;
  g.add(body);

  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.8, 8), mats.brushedSteel);
  exhaust.position.set(-0.6, 1.75, 0);
  g.add(exhaust);

  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.08), mats.darkMetal);
  panel.position.set(0.45, 0.9, 0.52);
  g.add(panel);

  const indicator = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.05), mats.emergencyGlow);
  indicator.position.set(0.45, 1.05, 0.56);
  g.add(indicator);

  return g;
}

/**
 * Composite Dry Terminal Palm Planter (5 parts)
 */
export function buildTerminalPlanter(mats: SharedMaterials): THREE.Group {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.5, 0.65, 10), mats.counterTop);
  pot.position.set(0, 0.325, 0);
  pot.castShadow = true;
  g.add(pot);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 2.2, 8), mats.counterBody);
  trunk.position.set(0, 1.5, 0);
  g.add(trunk);

  const frondMat = new THREE.MeshStandardMaterial({ color: 0x3f5e3a, roughness: 0.85 });
  for (let i = 0; i < 5; i++) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.35, 5), frondMat);
    const angle = (i / 5) * Math.PI * 2;
    frond.position.set(Math.cos(angle) * 0.55, 2.55, Math.sin(angle) * 0.55);
    frond.rotation.z = -Math.cos(angle) * 1.1;
    frond.rotation.x = Math.sin(angle) * 1.1;
    g.add(frond);
  }
  return g;
}
