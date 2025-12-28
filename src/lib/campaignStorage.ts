/**
 * Campaign Storage Utilities
 * 
 * Provides robust storage for RSVP campaign state with:
 * - IndexedDB for large images (supports multi-MB data)
 * - localStorage for small metadata
 * - Graceful fallbacks
 */

const DB_NAME = 'rsvp_campaign_db';
const DB_VERSION = 1;
const STORE_NAME = 'campaign_images';
const IMAGE_KEY = 'current_campaign_image';

// Open or create IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Save image to IndexedDB
 * @returns true if successful, false if failed
 */
export async function saveImageToIDB(imageBase64: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(imageBase64, IMAGE_KEY);
      
      request.onsuccess = () => {
        db.close();
        resolve(true);
      };
      request.onerror = () => {
        console.warn('IndexedDB save failed:', request.error);
        db.close();
        resolve(false);
      };
    });
  } catch (e) {
    console.warn('IndexedDB unavailable:', e);
    return false;
  }
}

/**
 * Load image from IndexedDB
 * @returns base64 string or null if not found
 */
export async function loadImageFromIDB(): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(IMAGE_KEY);
      
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch (e) {
    console.warn('IndexedDB load failed:', e);
    return null;
  }
}

/**
 * Clear image from IndexedDB
 */
export async function clearImageFromIDB(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(IMAGE_KEY);
    db.close();
  } catch (e) {
    console.warn('IndexedDB clear failed:', e);
  }
}

/**
 * Compress image for storage
 * Reduces image size to prevent memory issues on mobile
 * 
 * @param base64Image - Original base64 image
 * @param maxWidth - Maximum width in pixels (default 800)
 * @param quality - JPEG quality 0-1 (default 0.7)
 * @returns Compressed base64 image
 */
export async function compressImageForStorage(
  base64Image: string, 
  maxWidth: number = 800, 
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      
      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context failed'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Export as JPEG with quality setting
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = base64Image;
  });
}

/**
 * Estimate base64 string size in bytes
 */
export function estimateBase64Size(base64: string): number {
  // Remove data URL prefix if present
  const base64Data = base64.split(',')[1] || base64;
  // Base64 encodes 3 bytes into 4 characters
  return Math.ceil((base64Data.length * 3) / 4);
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
