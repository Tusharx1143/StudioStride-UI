/**
 * Firebase Storage upload / download helpers.
 *
 * Handles image uploads for stock photos (and future sticker images).
 * All files go under predictable paths in the default Storage bucket.
 *
 * ── Usage ──
 *   const url = await uploadFile(file, "stock-photos/mountain_view/original");
 *   const thumbUrl = await uploadFile(
 *     file,
 *     "stock-photos/mountain_view/thumbnail",
 *     { maxWidth: 320, maxHeight: 320 }
 *   );
 */

import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
  deleteObject,
  type UploadTaskSnapshot,
} from "firebase/storage";
import { getStorageInstance } from "./firebase";

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export interface UploadOptions {
  /** Optional metadata (Firebase custom metadata, content-type overrides). */
  contentType?: string;
}

/**
 * Upload a File/Blob to the given storage path.
 * Returns the download URL after upload completes.
 */
export async function uploadFile(
  file: File | Blob,
  storagePath: string,
  options?: UploadOptions
): Promise<string> {
  const storage = getStorageInstance();
  if (!storage) throw new Error("Firebase Storage not available");

  const storageRef = ref(storage, storagePath);
  const metadata = {
    contentType: options?.contentType ?? (file.type || "image/jpeg"),
  };

  const snapshot: UploadTaskSnapshot = await uploadBytesResumable(
    storageRef,
    file,
    metadata
  );

  return getDownloadURL(snapshot.ref);
}

/**
 * Delete a file at the given storage path.
 * Safe to call on non-existent paths — Firestore deletion will handle cleanup.
 */
export async function deleteFile(storagePath: string): Promise<void> {
  const storage = getStorageInstance();
  if (!storage) return;

  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err: unknown) {
    // 404 / object-not-found is harmless (already gone)
    if (err instanceof Error && "code" in err && (err as any).code === "storage/object-not-found") {
      return;
    }
    throw err;
  }
}

/**
 * Compute a stock photo's storage path from its logical id.
 */
export function stockPhotoPath(photoId: string, variant: "original" | "thumbnail" = "original"): string {
  return `stock-photos/${photoId}/${variant}`;
}
