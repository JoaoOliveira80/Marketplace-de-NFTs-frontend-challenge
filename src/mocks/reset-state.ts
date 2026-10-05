export function resetMockState(): { clearedKeys: number } {
  let clearedKeys = 0;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const appKeys = Object.keys(storage).filter((key) => key.startsWith("kurio-"));
    for (const key of appKeys) {
      storage.removeItem(key);
      clearedKeys += 1;
    }
  }
  return { clearedKeys };
}
