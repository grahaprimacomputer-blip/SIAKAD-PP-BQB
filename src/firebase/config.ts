import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  onSnapshot,
  writeBatch
} from 'firebase/firestore';

// Default config from firebase-applet-config.json or fallback
const firebaseConfig = {
  apiKey: "AIzaSyDummyKeyForMockingPurposesOnly",
  authDomain: "f8e7099d-9eb3-4355-959f-e518195857cc.firebaseapp.com",
  projectId: "f8e7099d-9eb3-4355-959f-e518195857cc",
  storageBucket: "f8e7099d-9eb3-4355-959f-e518195857cc.firebasestorage.app",
  messagingSenderId: "114032605470",
  appId: "1:114032605470:web:mockAppIdForDevPurposesOnly"
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let isFirestoreAvailable = false;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app);
  isFirestoreAvailable = true;
} catch (err) {
  console.warn("Firebase initialization notice:", err);
  isFirestoreAvailable = false;
}

export { app, db, isFirestoreAvailable };
export { collection, getDocs, setDoc, doc, deleteDoc, onSnapshot, writeBatch };
