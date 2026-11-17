import * as THREE from 'three';

export class GameLoop {
  private frameId = 0;
  private running = false;
  private lastTime = 0;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private isSoftwareGl: boolean,
    private onTick: (dt: number) => void
  ) {}

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.scheduleNext();
  }

  public stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
  }

  private scheduleNext(): void {
    if (!this.running) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => this.tick());
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  private tick(): void {
    if (!this.running) return;
    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.onTick(dt);
    this.scheduleNext();
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (!this.running) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }
}
