// lib/services/storageService.ts — Firebase Storage service for article photos.
// Supports progress tracking, deletion, and local demo fallback.

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

export async function uploadItemPhoto(
  uid: string,
  file: File,
  onProgress?: (progressPct: number) => void
): Promise<{ photoUrl: string; photoPath: string }> {
  const check = validateImageFile(file);
  if (!check.valid) {
    throw new AppError(check.error || "Invalid file.");
  }

  // Fallback for local demo mode without real Firebase Storage
  if (!isFirebaseConfigured()) {
    onProgress?.(50);
    const photoUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    onProgress?.(100);
    return {
      photoUrl,
      photoPath: `demo-photos/${uid}/${Date.now()}_${file.name}`,
    };
  }

  // Real Firebase Storage upload
  const timestamp = Date.now();
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const photoPath = `batch-photos/${uid}/${timestamp}_${cleanName}`;
  const storageRef = ref(storage, photoPath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const pct = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.(pct);
      },
      (error) => {
        reject(new AppError(`Upload failed: ${error.message}`));
      },
      async () => {
        try {
          const photoUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ photoUrl, photoPath });
        } catch (err) {
          reject(new AppError("Failed to retrieve uploaded photo URL.", err));
        }
      }
    );
  });
}

export async function deleteItemPhoto(photoPath: string): Promise<void> {
  if (!photoPath) return;

  // Skip deletion for local demo data
  if (!isFirebaseConfigured() || photoPath.startsWith("demo-photos/")) {
    return;
  }

  try {
    const storageRef = ref(storage, photoPath);
    await deleteObject(storageRef);
  } catch (err) {
    // If already deleted or not found, silently ignore to avoid blocking form submission
    console.warn("Storage deletion warning:", err);
  }
}
