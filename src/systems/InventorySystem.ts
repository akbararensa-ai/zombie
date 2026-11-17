import { InventorySnapshot } from '../game/GameState';

export class InventorySystem {
  public medkits = 1;
  public ammoPacks = 1;
  public grenades = 2;
  public battery = 100;
  public keycards = 0;
  public flashlightOn = true;
  public scannerCooldown = 0;
  public scannerActiveTimer = 0;

  public reset(): void {
    this.medkits = 1;
    this.ammoPacks = 1;
    this.grenades = 2;
    this.battery = 100;
    this.keycards = 0;
    this.flashlightOn = true;
    this.scannerCooldown = 0;
    this.scannerActiveTimer = 0;
  }

  public toggleFlashlight(): boolean {
    if (this.battery <= 1 && !this.flashlightOn) return false;
    this.flashlightOn = !this.flashlightOn;
    return this.flashlightOn;
  }

  public triggerScanner(): boolean {
    if (this.scannerCooldown > 0) return false;
    if (this.battery < 10) return false;
    this.battery = Math.max(0, this.battery - 10);
    this.scannerActiveTimer = 5.0;
    this.scannerCooldown = 10.0;
    return true;
  }

  public update(dt: number): void {
    if (this.flashlightOn) {
      // Slow tactical drain so flashlight lasts well and battery pickups feel rewarding
      this.battery = Math.max(0, this.battery - dt * 0.45);
      if (this.battery <= 0) {
        this.flashlightOn = false;
      }
    }
    if (this.scannerCooldown > 0) {
      this.scannerCooldown = Math.max(0, this.scannerCooldown - dt);
    }
    if (this.scannerActiveTimer > 0) {
      this.scannerActiveTimer = Math.max(0, this.scannerActiveTimer - dt);
    }
  }

  public getSnapshot(): InventorySnapshot {
    return {
      medkits: this.medkits,
      ammoPacks: this.ammoPacks,
      grenades: this.grenades,
      battery: Math.round(this.battery),
      keycards: this.keycards,
      flashlightOn: this.flashlightOn,
      scannerCooldown: Math.ceil(this.scannerCooldown)
    };
  }
}
