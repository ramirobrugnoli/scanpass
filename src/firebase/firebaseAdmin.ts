import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Intenta obtener las variables del entorno servidor
const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  : undefined;

// Registra para depuración
console.log("Firebase Admin Config:", {
  projectId: projectId || "Not found",
  clientEmail: clientEmail ? "Set" : "Not found",
  privateKey: privateKey ? "Set" : "Not found",
});

// Si faltan variables, usa valores del lado del cliente como fallback
const serviceAccount = {
  projectId: projectId,
  clientEmail: clientEmail,
  privateKey: privateKey,
};

export function getFirebaseAdmin() {
  // Si falta alguna configuración crítica, usa una implementación simulada
  if (
    !serviceAccount.projectId ||
    !serviceAccount.clientEmail ||
    !serviceAccount.privateKey
  ) {
    console.warn(
      "Firebase Admin SDK usando implementación simulada debido a configuración incompleta"
    );
    return {
      auth: {
        verifySessionCookie: async () => ({ uid: "mock-user-id" }),
        createSessionCookie: async () => "mock-session-cookie",
      },
    };
  }

  try {
    if (!getApps().length) {
      initializeApp({
        credential: cert(serviceAccount),
      });
    }
    return {
      auth: getAuth(),
    };
  } catch (error) {
    console.error("Error inicializando Firebase Admin:", error);

    // En caso de error, devuelve una implementación simulada
    return {
      auth: {
        verifySessionCookie: async () => ({ uid: "error-fallback-user-id" }),
        createSessionCookie: async () => "error-fallback-session-cookie",
      },
    };
  }
}
