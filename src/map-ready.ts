import type { MapReadyCallbackData } from './definitions';

export class MapReadyQueue {
  private ready = false;
  private readyData?: MapReadyCallbackData;
  private pending: ((data: MapReadyCallbackData) => void)[] = [];

  deliver(data: MapReadyCallbackData): void {
    if (this.ready) {
      return;
    }
    this.ready = true;
    this.readyData = data;
    const callbacks = this.pending;
    this.pending = [];
    for (const cb of callbacks) {
      cb(data);
    }
  }

  whenReady(cb: (data: MapReadyCallbackData) => void): void {
    if (this.ready && this.readyData != null) {
      const data = this.readyData;
      queueMicrotask(() => cb(data));
      return;
    }
    this.pending.push(cb);
  }

  clear(): void {
    this.ready = false;
    this.readyData = undefined;
    this.pending = [];
  }
}
