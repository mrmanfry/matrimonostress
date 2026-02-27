const KEY = 'wedsapp_active_mode';

export type ActiveMode = 'couple' | 'planner';

export const modeStorage = {
  get(): ActiveMode | null {
    try {
      const val = localStorage.getItem(KEY);
      if (val === 'couple' || val === 'planner') return val;
      return null;
    } catch {
      return null;
    }
  },
  set(mode: ActiveMode): void {
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      // silent
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // silent
    }
  },
};
