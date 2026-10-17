import { Storage } from "@google-cloud/storage"

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || ""

let storage: Storage | null = null

function getStorage(): Storage {
  // No explicit config — uses the same Application Default Credentials as
  // Vertex AI / Firestore Admin (GOOGLE_APPLICATION_CREDENTIALS locally,
  // attached service account on Cloud Run).
  if (!storage) storage = new Storage()
  return storage
}

export function getBucket() {
  if (!BUCKET_NAME) throw new Error("GCS_BUCKET_NAME is not configured")
  return getStorage().bucket(BUCKET_NAME)
}
