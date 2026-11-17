import { WEAPON_ORDER, WEAPONS, WeaponConfig, WeaponId } from '../game/GameConfig';

export interface WeaponRuntimeState {
  mag: number;
  reserve: number;
}

export class WeaponManager {
  public currentWeapon: WeaponId = 'pistol';
  public states: Record<WeaponId, WeaponRuntimeState>;
  private fireCooldown = 0;
  public isReloading = false;
  private reloadTimer = 0;

  constructor(startWeapon: WeaponId = 'pistol') {
    this.currentWeapon = startWeapon;
    this.states = this.createInitialStates();
  }

  private createInitialStates(): Record<WeaponId, WeaponRuntimeState> {
    return {
      pistol: { mag: WEAPONS.pistol.magSize, reserve: WEAPONS.pistol.startReserve },
      rifle: { mag: WEAPONS.rifle.magSize, reserve: WEAPONS.rifle.startReserve },
      shotgun: { mag: WEAPONS.shotgun.magSize, reserve: WEAPONS.shotgun.startReserve }
    };
  }

  public reset(startWeapon: WeaponId = 'pistol'): void {
    this.currentWeapon = startWeapon;
    this.states = this.createInitialStates();
    this.fireCooldown = 0;
    this.isReloading = false;
    this.reloadTimer = 0;
  }

  public getConfig(): WeaponConfig {
    return WEAPONS[this.currentWeapon];
  }

  public getState(): WeaponRuntimeState {
    return this.states[this.currentWeapon];
  }

  public getReloadProgress(): number {
    if (!this.isReloading) return 0;
    const cfg = this.getConfig();
    return 1 - Math.max(0, this.reloadTimer / cfg.reloadTime);
  }

  public switchWeapon(target?: WeaponId): WeaponId {
    const next =
      target ??
      WEAPON_ORDER[(WEAPON_ORDER.indexOf(this.currentWeapon) + 1) % WEAPON_ORDER.length];
    if (next === this.currentWeapon) return next;
    this.currentWeapon = next;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.fireCooldown = 0.18;
    return next;
  }

  public canFire(): boolean {
    if (this.isReloading || this.fireCooldown > 0) return false;
    return this.states[this.currentWeapon].mag > 0;
  }

  public consumeShot(): boolean {
    if (!this.canFire()) return false;
    const cfg = this.getConfig();
    this.states[this.currentWeapon].mag--;
    this.fireCooldown = 1 / cfg.fireRate;
    return true;
  }

  public startReload(): boolean {
    if (this.isReloading) return false;
    const cfg = this.getConfig();
    const st = this.states[this.currentWeapon];
    if (st.mag >= cfg.magSize || st.reserve <= 0) return false;
    this.isReloading = true;
    this.reloadTimer = cfg.reloadTime;
    return true;
  }

  public addAmmo(weapon: WeaponId, amount: number): void {
    const cfg = WEAPONS[weapon];
    const st = this.states[weapon];
    st.reserve = Math.min(cfg.maxReserve, st.reserve + amount);
  }

  public refillCurrentOrAll(fraction = 0.5): void {
    for (const id of WEAPON_ORDER) {
      const cfg = WEAPONS[id];
      this.addAmmo(id, Math.ceil(cfg.maxReserve * fraction));
    }
  }

  public update(dt: number): boolean {
    if (this.fireCooldown > 0) {
      this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    }

    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const cfg = this.getConfig();
        const st = this.states[this.currentWeapon];
        const needed = cfg.magSize - st.mag;
        const load = Math.min(needed, st.reserve);
        st.mag += load;
        st.reserve -= load;
        this.isReloading = false;
        this.reloadTimer = 0;
        return true; // reload finished
      }
    }
    return false;
  }
}
