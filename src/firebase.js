import { firebaseConfig, hasFirebaseConfig } from "./firebase-config.js";

const FIREBASE_VERSION = "10.12.5";
const APP_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`;
const DB_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-database.js`;
const AUTH_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`;

let corePromise;
let authPromise;

export async function initializeFirebase({ authenticate = false } = {}) {
  if (!hasFirebaseConfig()) throw new Error("Firebase has not been configured yet.");
  if (!corePromise) {
    corePromise = Promise.all([import(APP_URL), import(DB_URL)]).then(([appModule, databaseModule]) => {
      const app = appModule.getApps().length
        ? appModule.getApp()
        : appModule.initializeApp(firebaseConfig);
      return {
        app,
        databaseModule,
        db: databaseModule.getDatabase(app)
      };
    });
  }

  const core = await corePromise;
  if (!authenticate) return core;
  if (!authPromise) authPromise = initializeAnonymousAuth(core.app);
  return {
    ...core,
    ...(await authPromise)
  };
}

async function initializeAnonymousAuth(app) {
  const authModule = await import(AUTH_URL);
  const auth = authModule.getAuth(app);
  await authModule.setPersistence(auth, authModule.browserLocalPersistence);
  await auth.authStateReady?.();

  let user = auth.currentUser;
  if (!user) {
    try {
      const credential = await authModule.signInAnonymously(auth);
      user = credential.user;
    } catch (error) {
      throw new Error(
        "Anonymous Firebase Authentication is not enabled. Turn it on in Firebase Console under Authentication, Sign-in method.",
        { cause: error }
      );
    }
  }
  return { auth, authModule, user };
}
