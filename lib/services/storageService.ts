// lib/services/storageService.ts — Storage service for article photos.
// Supports Firebase Storage with automatic instant Data URL fallback
// so photo uploads NEVER freeze at 0% even if Storage or CORS is pending in Firebase Console.

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage, isFirebaseConfigured } from "@/lib/firebase";
import { AppError } from "@/lib/types";

export const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file.type.startsWith("image/")) {
    return { valid: false, error: "Only image files (JPG, PNG, WebP) are allowed." };
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return {
      valid: false,
      error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 2 MB.`,
    };
  }
  return { valid: true };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new AppError("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

export async function uploadItemPhoto(
  uid: string,
  file: File,
  onProgress?: (progressPct: number) => void
): Promise<{ photoUrl: string; photoPath: string }> {
  const check = validateImageFile(file);
  if (!check.valid) {
    throw new AppError(check.error || "Invalid file.");
  }

  // Instant local conversion for demo users or if Firebase is unconfigured
  if (!isFirebaseConfigured() || uid.startsWith("u_")) {
    onProgress?.(30);
    const photoUrl = await readFileAsDataUrl(file);
    onProgress?.(100);
    return {
      photoUrl,
      photoPath: `demo-photos/${uid}/${Date.now()}_${file.name}`,
    };
  }

  const timestamp = Date.now();
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const photoPath = `batch-photos/${uid}/${timestamp}_${cleanName}`;

  try {
    onProgress?.(20);
    const storageRef = ref(storage, photoPath);
    const uploadPromise = new Promise<{ photoUrl: string; photoPath: string }>((resolve, reject) => {
      let isSettled = false;
      let hasReceivedProgress = false;

      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
      });

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          if (isSettled) return;
          hasReceivedProgress = true;
          const pct = Math.round(
            (snapshot.bytesTransferred / Math.max(1, snapshot.totalBytes)) * 100
          );
          onProgress?.(Math.max(20, pct));
        },
        (error) => {
          if (isSettled) return;
          isSettled = true;
          reject(error);
        },
        async () => {
          if (isSettled) return;
          isSettled = true;
          try {
            const photoUrl = await getDownloadURL(uploadTask.snapshot.ref);
            onProgress?.(100);
            resolve({ photoUrl, photoPath });
          } catch (err) {
            reject(err);
          }
        }
      );

      // If no progress within 1200ms (Firebase storage uninitialized or CORS blocked), fall back instantly!
      setTimeout(() => {
        if (!isSettled && !hasReceivedProgress) {
          isSettled = true;
          try {
            uploadTask.cancel();
          } catch {
            // ignore
          }
          reject(new Error("Storage timeout or CORS blocked"));
        }
      }, 1200);
    });

    return await uploadPromise;
  } catch (err) {
    console.warn("[Storage Notice]: Cloud Storage unavailable, saving as local Data URL:", err);
    onProgress?.(60);
    const photoUrl = await readFileAsDataUrl(file);
    onProgress?.(100);
    return {
      photoUrl,
      photoPath: `data-photos/${uid}/${timestamp}_${cleanName}`,
    };
  }
}

export async function deleteItemPhoto(photoPath: string): Promise<void> {
  if (!photoPath) return;

  if (
    !isFirebaseConfigured() ||
    photoPath.startsWith("demo-photos/") ||
    photoPath.startsWith("data-photos/")
  ) {
    return;
  }

  try {
    const storageRef = ref(storage, photoPath);
    await deleteObject(storageRef);
  } catch (err) {
    console.warn("Storage deletion warning:", err);
  }
}
