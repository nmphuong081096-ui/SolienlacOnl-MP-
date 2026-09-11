import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  type Firestore,
  collection,
  doc,
  getDocs,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

export interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  firestoreDatabaseId?: string;
  databaseId?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

function getInitialFirebaseConfig(): FirebaseConfig | null {
  // 1. Primary: Load directly from provisioned firebase-applet-config.json
  if (firebaseConfigJson && firebaseConfigJson.projectId) {
    return firebaseConfigJson as FirebaseConfig;
  }

  // 2. Window runtime config
  const windowConfig = (window as unknown as { __FIREBASE_CONFIG__?: FirebaseConfig }).__FIREBASE_CONFIG__;
  if (windowConfig && windowConfig.projectId) {
    return windowConfig;
  }

  // 3. Vite env safely
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
  const apiKey = metaEnv.VITE_FIREBASE_API_KEY;
  const projectId = metaEnv.VITE_FIREBASE_PROJECT_ID;
  if (projectId && apiKey) {
    return {
      apiKey,
      authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
      messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: metaEnv.VITE_FIREBASE_APP_ID,
    };
  }

  // 4. Saved local config
  try {
    const saved = localStorage.getItem('gvcn360_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.projectId) return parsed;
    }
  } catch {
    // Ignore
  }

  return null;
}

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let isInitialized = false;

export function initFirebase(): { app: FirebaseApp | null; db: Firestore | null } {
  if (isInitialized) {
    return { app: appInstance, db: firestoreInstance };
  }

  const config = getInitialFirebaseConfig();
  if (!config || !config.projectId) {
    console.info('GVCN 360 MINI: Firebase config not found. Falling back to LocalStorage.');
    isInitialized = true;
    return { app: null, db: null };
  }

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      appInstance = existingApps[0];
    } else {
      appInstance = initializeApp(config);
    }
    
    // CRITICAL: Connect with firestoreDatabaseId if provisioned
    if (config.firestoreDatabaseId) {
      firestoreInstance = getFirestore(appInstance, config.firestoreDatabaseId);
    } else {
      firestoreInstance = getFirestore(appInstance);
    }
    
    console.info('GVCN 360 MINI: Connected to Cloud Firestore project:', config.projectId);

    // Validate connection asynchronously
    testConnection();
  } catch (err) {
    console.warn('GVCN 360 MINI: Failed to initialize Firebase:', err);
    appInstance = null;
    firestoreInstance = null;
  }

  isInitialized = true;
  return { app: appInstance, db: firestoreInstance };
}

async function testConnection() {
  if (!firestoreInstance) return;
  try {
    await getDocFromServer(doc(firestoreInstance, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration or network status.');
    }
  }
}

export function getDb(): Firestore | null {
  if (!isInitialized) {
    initFirebase();
  }
  return firestoreInstance;
}

export function isFirestoreActive(): boolean {
  return getDb() !== null;
}

export {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
};
