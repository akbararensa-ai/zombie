import * as THREE from 'three';
import { PLAYER_CONFIG } from '../game/GameConfig';
import { AudioManager } from '../systems/AudioManager';
import { CollisionSystem } from '../systems/CollisionSystem';

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _wishDir = new THREE.Vector3();

export class PlayerMovement {
  public position = new THREE.Vector3(0, PLAYER_CONFIG.eyeHeight, 24);
  public velocity = new THREE.Vector3();
  public isGrounded = true;
  public isSprinting = false;
  public moveSpeedRatio = 0;
  public landDip = 0;
  private stepTimer = 0;

  public reset(): void {
    this.position.set(0, PLAYER_CONFIG.eyeHeight, 24);
    this.velocity.set(0, 0, 0);
    this.isGrounded = true;
    this.isSprinting = false;
    this.moveSpeedRatio = 0;
    this.landDip = 0;
    this.stepTimer = 0;
  }

  public update(
    dt: number,
    moveInputX: number, // -1..1 (strafe)
    moveInputY: number, // -1..1 (forward positive)
    sprintHeld: boolean,
    jumpPressed: boolean,
    yaw: number,
    collision: CollisionSystem,
    audio: AudioManager
  ): void {
    // Horizontal basis from yaw
    _forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    _right.set(Math.cos(yaw), 0, -Math.sin(yaw));

    _wishDir.set(0, 0, 0);
    _wishDir.addScaledVector(_forward, moveInputY);
    _wishDir.addScaledVector(_right, moveInputX);
    const inputMag = Math.min(1, _wishDir.length());
    if (inputMag > 0.001) {
      _wishDir.normalize();
    }

    this.isSprinting = sprintHeld && moveInputY > 0.15 && inputMag > 0.25 && this.isGrounded;
    const maxSpeed = this.isSprinting ? PLAYER_CONFIG.sprintSpeed : PLAYER_CONFIG.walkSpeed;
    const targetVx = _wishDir.x * maxSpeed * inputMag;
    const targetVz = _wishDir.z * maxSpeed * inputMag;

    const rate = inputMag > 0.05 ? PLAYER_CONFIG.acceleration : PLAYER_CONFIG.deceleration;
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVx, rate, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVz, rate, dt);

    // Jump & gravity
    if (jumpPressed && this.isGrounded) {
      this.velocity.y = PLAYER_CONFIG.jumpVelocity;
      this.isGrounded = false;
    }

    this.velocity.y -= PLAYER_CONFIG.gravity * dt;
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.y += this.velocity.y * dt;

    // Ground clamp + landing feedback
    if (this.position.y <= PLAYER_CONFIG.eyeHeight) {
      if (!this.isGrounded && this.velocity.y < -3.0) {
        this.landDip = Math.min(0.14, Math.abs(this.velocity.y) * 0.015);
        audio.playFootstep(true);
      }
      this.position.y = PLAYER_CONFIG.eyeHeight;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Resolve horizontal airport collisions
    collision.resolveCircleMovement(this.position, PLAYER_CONFIG.radius, PLAYER_CONFIG.eyeHeight);

    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.moveSpeedRatio = THREE.MathUtils.clamp(horizSpeed / PLAYER_CONFIG.sprintSpeed, 0, 1);

    // Footsteps
    if (this.isGrounded && horizSpeed > 1.2) {
      this.stepTimer -= dt * (this.isSprinting ? 1.55 : 1.0);
      if (this.stepTimer <= 0) {
        this.stepTimer = 0.44;
        audio.playFootstep(this.isSprinting);
      }
    } else {
      this.stepTimer = 0.1;
    }

    this.landDip = THREE.MathUtils.damp(this.landDip, 0, 12, dt);
  }
}
