import { getApps, initializeApp, type FirebaseOptions } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

// Firebase project config for "Little Voice API" — hardcoded directly as requested
// (no environment variables). This mirrors the public web config from the
// Firebase console; it is safe to ship in client bundles by design.
const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDAscg59W-TYyKDG0Omza-SHFdk8GMI78s",
  authDomain: "perfectoryvoices.firebaseapp.com",
  databaseURL: "https://perfectoryvoices-default-rtdb.firebaseio.com",
  projectId: "perfectoryvoices",
  storageBucket: "perfectoryvoices.firebasestorage.app",
  messagingSenderId: "1076501740892",
  appId: "1:1076501740892:web:60b84226a436fa34151599",
  measurementId: "G-G13NGHEGQ9",
}

export const firebaseApp = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig)
export const firebaseAuth = getAuth(firebaseApp)
export const firestoreDb = getFirestore(firebaseApp)
