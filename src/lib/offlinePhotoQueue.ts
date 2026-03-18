/**
 * Offline Photo Queue — IndexedDB-based queue for uploading photos
 * when the user is offline (common at Italian wedding venues).
 */

const DB_NAME = "memories-reel-queue";
const STORE_NAME = "pending-photos";
const DB_VERSION = 1;

import { getOutputFormat } from "@/lib/cameraFilters";

export interface QueuedPhoto {
  id: string;
  blob: Blob;
  token: string;
  fingerprint: string;
  guestName: string | null;
  filmType: string;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueue(photo: QueuedPhoto): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(photo);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dequeue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllPending(): Promise<QueuedPhoto[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Upload a single queued photo to the Edge Function.
 * Returns true if successful (or should be discarded), false if should retry.
 */
async function uploadOne(
  photo: QueuedPhoto,
  supabaseUrl: string
): Promise<boolean> {
  const formData = new FormData();
  formData.append("token", photo.token);
  formData.append("fingerprint", photo.fingerprint);
  const { getOutputFormat } = await import("@/lib/cameraFilters");
  formData.append("photo", photo.blob, `photo.${getOutputFormat().ext}`);
  if (photo.guestName) formData.append("guest_name", photo.guestName);
  if (photo.filmType) formData.append("film_type", photo.filmType);

  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/upload-camera-photo`,
      { method: "POST", body: formData }
    );

    if (!res.ok && res.status >= 500) {
      return false; // Retry later
    }

    const data = await res.json();

    // If camera expired or film full, discard the photo
    if (
      data.error === "camera_expired" ||
      data.error === "camera_inactive" ||
      data.error === "invalid_token" ||
      data.error === "film_full"
    ) {
      return true; // Discard
    }

    if (data.success || data.error === "shots_exhausted") {
      return true; // Done or skip
    }

    return false;
  } catch {
    return false; // Network error, retry later
  }
}

/**
 * Flush the entire queue sequentially (one at a time to avoid rate limiting).
 * Returns the number of successfully uploaded/discarded photos.
 */
export async function flushQueue(supabaseUrl: string): Promise<number> {
  const pending = await getAllPending();
  let processed = 0;

  for (const photo of pending) {
    const ok = await uploadOne(photo, supabaseUrl);
    if (ok) {
      await dequeue(photo.id);
      processed++;
    } else {
      // Stop on first failure (likely network issue)
      break;
    }
  }

  return processed;
}

/**
 * Setup beforeunload warning and online listener for auto-flush.
 */
export function setupOfflineHandlers(
  supabaseUrl: string,
  onFlushComplete?: (count: number) => void
) {
  const handleOnline = async () => {
    const count = await flushQueue(supabaseUrl);
    onFlushComplete?.(count);
  };

  window.addEventListener("online", handleOnline);

  const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
    const count = await getPendingCount();
    if (count > 0) {
      e.preventDefault();
      e.returnValue =
        "Hai foto in attesa di caricamento! Aspetta il ritorno della rete prima di chiudere.";
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}
