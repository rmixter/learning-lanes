/**
 * Firebase Configuration
 * Initialize Firebase App, Auth, and Firestore instances
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Firebase configuration - replace with your actual config
// You can get this from Firebase Console > Project Settings > Your Apps
const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY || 'your-api-key',
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'your-sender-id',
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID || 'your-app-id',
};

// Initialize Firebase (singleton pattern to prevent multiple instances)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

function initializeFirebase(): FirebaseApp {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  return app;
}

// Initialize on import
app = initializeFirebase();
auth = getAuth(app);
db = getFirestore(app);

export { app, auth, db };
export default app;
