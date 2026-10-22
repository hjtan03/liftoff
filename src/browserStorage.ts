/**
 * localStorage that never throws: private windows, blocked site data and
 * full quotas all read as "nothing saved" and silently skip the write.
 */

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readStorage(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    storage()?.setItem(key, value);
  } catch {
    // Storage unavailable: the game still plays, it just won't remember.
  }
}
