import { initializeApp } from "firebase-admin/app";

// Initialize Firebase Admin SDK once for all functions
initializeApp();

// Export Cloud Functions v2
export { detectStuckBatches } from "./stuckBatchDetector";
export { reconcileItemCounts } from "./reconcileItemCounts";
export { getFeeForecast } from "./feeForecast";
