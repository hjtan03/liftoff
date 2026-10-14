/** Runs onFrame with progress 0..1 on each animation frame; returns a cancel function. A zero duration completes at once. */
export function tween(
  durationMs: number,
  onFrame: (progress: number) => void,
  onDone?: () => void,
): () => void {
  if (durationMs <= 0) {
    onFrame(1);
    onDone?.();
    return () => {};
  }
  let frameHandle = 0;
  const startedAt = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, Math.max(0, (now - startedAt) / durationMs));
    onFrame(progress);
    if (progress < 1) frameHandle = requestAnimationFrame(step);
    else onDone?.();
  };
  frameHandle = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frameHandle);
}

export function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

export function prefersReducedMotion(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}
