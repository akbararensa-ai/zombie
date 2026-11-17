import * as THREE from 'three';
import { AudioManager } from '../systems/AudioManager';
import { CollisionSystem } from '../systems/CollisionSystem';
import { PlayerCamera } from './PlayerCamera';
import { PlayerHealth } from './PlayerHealth';
import { PlayerMovement } from './PlayerMovement';

export interface PlayerInputState {
  moveX: number; // -1..1
  moveY: number; // -1..1
  sprint: boolean;
  jumpQueued: boolean;
  fireHeld: boolean;
}

const _camForward = new THREE.Vector3();

export class PlayerController {
  public health = new PlayerHealth();
  public movement = new PlayerMovement();
  public cameraCtrl: PlayerCamera;
  public input: PlayerInputState = {
    moveX: 0,
    moveY: 0,
    sprint: false,
    jumpQueued: false,
    fireHeld: false
  };

  constructor(aspect: number) {
    this.cameraCtrl = new PlayerCamera(aspect);
  }

  public reset(): void {
    this.health.reset();
    this.movement.reset();
    this.cameraCtrl.reset();
    this.input.moveX = 0;
    this.input.moveY = 0;
    this.input.sprint = false;
    this.input.jumpQueued = false;
    this.input.fireHeld = false;
  }

  public getPosition(): THREE.Vector3 {
    return this.movement.position;
  }

  public getHorizontalForward(): THREE.Vector3 {
    this.cameraCtrl.camera.getWorldDirection(_camForward);
    _camForward.y = 0;
    if (_camForward.lengthSq() > 0.0001) {
      _camForward.normalize();
    } else {
      _camForward.set(0, 0, -1);
    }
    return _camForward;
  }

  public update(
    dt: number,
    collision: CollisionSystem,
    audio: AudioManager,
    isReloading: boolean,
    reloadProgress: number
  ): void {
    this.health.update(dt);
    const jump = this.input.jumpQueued;
    this.input.jumpQueued = false;

    this.movement.update(
      dt,
      this.input.moveX,
      this.input.moveY,
      this.input.sprint,
      jump,
      this.cameraCtrl.yaw,
      collision,
      audio
    );

    this.cameraCtrl.update(
      dt,
      this.movement.position,
      this.movement.moveSpeedRatio,
      this.movement.isSprinting,
      this.movement.isGrounded,
      this.movement.landDip,
      isReloading,
      reloadProgress
    );
  }
}
