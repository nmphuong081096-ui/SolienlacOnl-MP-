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

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyBtL8bXIKN-u0N1owyflN8utWZduGH7G0Q",
  authDomain: "tokyo-venture-6cbh2.firebaseapp.com",
  projectId: "tokyo-venture-6cbh2",
  storageBucket: "tokyo-venture-6cbh2.firebasestorage.app",
  messagingSenderId: "499500772379",
  appId: "1:499500772379:web:2fc9bb1e1893cbfc25dcbe",
  firestoreDatabaseId: "ai-studio-gvcn360mini-df98b4db-83bb-4ea2-a2e0-3e6d7d78efb5",
};

function getInitialFirebaseConfig(): FirebaseConfig {
  // 1. Primary: Load directly from provisioned firebase-applet-config.json
  if (firebaseConfigJson && (firebaseConfigJson as any).projectId) {
    return {
      ...DEFAULT_FIREBASE_CONFIG,
      ...(firebaseConfigJson as FirebaseConfig),
    };
  }

  // 2. Window runtime config
  const windowConfig = (window as unknown as { __FIREBASE_CONFIG__?: FirebaseConfig }).__FIREBASE_CONFIG__;
  if (windowConfig && windowConfig.projectId) {
    return {
      ...DEFAULT_FIREBASE_CONFIG,
      ...windowConfig,
    };
  }

  // 3. Saved local config
  try {
    const saved = localStorage.getItem('gvcn360_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.projectId) {
        return {
          ...DEFAULT_FIREBASE_CONFIG,
          ...parsed,
        };
      }
    }
  } catch {
    // Ignore
  }

  return DEFAULT_FIREBASE_CONFIG;
}

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let isInitialized = false;

export function initFirebase(): { app: FirebaseApp | null; db: Firestore | null } {
  if (isInitialized) {
    return { app: appInstance, db: firestoreInstance };
  }

  const config = getInitialFirebaseConfig();

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      appInstance = existingApps[0];
    } else {
      appInstance = initializeApp(config);
    }
    
    // Connect with firestoreDatabaseId if provisioned, with safe fallback
    if (config.firestoreDatabaseId) {
      try {
        firestoreInstance = getFirestore(appInstance, config.firestoreDatabaseId);
      } catch (err) {
        console.warn('Could not open named database, falling back to default:', err);
        firestoreInstance = getFirestore(appInstance);
      }
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
  if (!firestoreInstance || !appInstance) return;
  try {
    await getDocFromServer(doc(firestoreInstance, 'test', 'connection'));
  } catch (error) {
    // If connection to named database failed, attempt fallback to default database
    const config = getInitialFirebaseConfig();
    if (config.firestoreDatabaseId) {
      try {
        const defaultDb = getFirestore(appInstance);
        await getDocFromServer(doc(defaultDb, 'test', 'connection'));
        firestoreInstance = defaultDb;
        console.info('GVCN 360 MINI: Successfully fell back to default Firestore database.');
      } catch (errDefault) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error('Please check your Firebase configuration or network status.');
        }
      }
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
