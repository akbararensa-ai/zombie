import { PLAYER_CONFIG } from '../game/GameConfig';

export class PlayerHealth {
  public hp = PLAYER_CONFIG.maxHp;
  public maxHp = PLAYER_CONFIG.maxHp;
  public armor = 25;
  public maxArmor = PLAYER_CONFIG.maxArmor;
  private damageCooldownTimer = 0;
  public damageFlash = 0;

  public reset(): void {
    this.hp = this.maxHp;
    this.armor = 25;
    this.damageCooldownTimer = 0;
    this.damageFlash = 0;
  }

  public update(dt: number): void {
    if (this.damageCooldownTimer > 0) {
      this.damageCooldownTimer = Math.max(0, this.damageCooldownTimer - dt);
    }
    if (this.damageFlash > 0) {
      this.damageFlash = Math.max(0, this.damageFlash - dt * 2.8);
    }
  }

  public takeDamage(amount: number): boolean {
    if (this.hp <= 0 || this.damageCooldownTimer > 0) return false;
    this.damageCooldownTimer = PLAYER_CONFIG.damageCooldown;
    this.damageFlash = 1.0;

    let remaining = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, Math.ceil(amount * 0.55));
      this.armor -= absorbed;
      remaining -= absorbed;
    }

    this.hp = Math.max(0, this.hp - remaining);
    return true;
  }

  public heal(amount: number): boolean {
    if (this.hp >= this.maxHp) return false;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return true;
  }

  public addArmor(amount: number): boolean {
    if (this.armor >= this.maxArmor) return false;
    this.armor = Math.min(this.maxArmor, this.armor + amount);
    return true;
  }

  public isDead(): boolean {
    return this.hp <= 0;
  }
}
