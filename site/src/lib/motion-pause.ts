/** Shared pause for looping motion: hero glow, launcher pulse, and the agent clock. */

type Listener = (paused: boolean) => void;

let paused = false;
const listeners = new Set<Listener>();

export function motionPaused() {
  return paused;
}

export function subscribeMotion(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setMotionPaused(next: boolean) {
  paused = next;
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("motion-paused", next);
  }
  listeners.forEach((listener) => listener(next));
}
