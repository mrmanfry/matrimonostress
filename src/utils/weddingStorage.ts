/**
 * LocalStorage utility for persisting weddingId across sessions
 */

const WEDDING_ID_KEY = 'weddingId';

export const weddingStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(WEDDING_ID_KEY);
    } catch {
      return null;
    }
  },
  
  set(weddingId: string): void {
    try {
      localStorage.setItem(WEDDING_ID_KEY, weddingId);
      console.log('[weddingStorage] Saved weddingId:', weddingId);
    } catch (error) {
      console.error('[weddingStorage] Failed to save:', error);
    }
  },
  
  clear(): void {
    try {
      localStorage.removeItem(WEDDING_ID_KEY);
      console.log('[weddingStorage] Cleared weddingId');
    } catch (error) {
      console.error('[weddingStorage] Failed to clear:', error);
    }
  }
};
