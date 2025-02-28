import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

export function getFirebaseAdmin() {
  if (!getApps().length) {
    console.log("Service Account:", serviceAccount);
    initializeApp({
      credential: cert(serviceAccount as any),
    });
  }
  return {
    auth: getAuth(),
  };
}
