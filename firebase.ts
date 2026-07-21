import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, collection, query, orderBy, getDocFromServer } from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import firebaseConfig from './firebase-applet-config.json';
import { MonitoringReport } from './types';

const app = initializeApp(firebaseConfig);

export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

let cachedAccessToken: string | null = null;
try {
  cachedAccessToken = localStorage.getItem('baeknyeon_google_access_token');
} catch (e) {
  console.error("Failed to read google access token from localStorage", e);
}

export const signInWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, googleProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken) {
    cachedAccessToken = credential.accessToken;
    try {
      localStorage.setItem('baeknyeon_google_access_token', credential.accessToken);
    } catch (e) {
      console.error("Failed to save google access token", e);
    }
  }
  return result.user;
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setGoogleAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (token) {
      localStorage.setItem('baeknyeon_google_access_token', token);
    } else {
      localStorage.removeItem('baeknyeon_google_access_token');
    }
  } catch (e) {
    console.error("Failed to set google access token", e);
  }
};

export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
  try {
    localStorage.removeItem('baeknyeon_google_access_token');
  } catch {}
};

// Test connection on boot as mandated by the Firebase Integration skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Client is offline.");
    }
  }
}
testConnection();

// --- Hardened Firestore Error Handling ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Firestore Database Services ---

export const saveReport = async (report: MonitoringReport): Promise<MonitoringReport> => {
  const isNew = !report.id;
  const reportId = report.id || doc(collection(db, 'reports')).id;
  
  // Clean empty strings or nulls
  const cleanedReport: MonitoringReport = {
    ...report,
    id: reportId,
    category: report.category || '백년서원',
    createdAt: isNew ? Date.now() : report.createdAt,
    lastUpdated: Date.now(),
    otherOpinion: report.otherOpinion || '',
    submitterPhone: report.submitterPhone || '',
    submitterSign: report.submitterSign || null,
    photo1: null, // Do NOT store photos in database for privacy and performance
    photo2: null,
    photo3: null,
    photo4: null,
  };

  const path = `reports/${reportId}`;
  try {
    const docRef = doc(db, 'reports', reportId);
    await setDoc(docRef, cleanedReport);
    return cleanedReport;
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
    throw error;
  }
};

export const fetchAllReports = async (): Promise<MonitoringReport[]> => {
  const path = 'reports';
  try {
    const reportsQuery = query(collection(db, 'reports'), orderBy('lastUpdated', 'desc'));
    const querySnapshot = await getDocs(reportsQuery);
    const results: MonitoringReport[] = [];
    querySnapshot.forEach((doc) => {
      results.push(doc.data() as MonitoringReport);
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    throw error;
  }
};
