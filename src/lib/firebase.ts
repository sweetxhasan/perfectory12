import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCMKNydjhcNLdKu9Nm-pzgq2pSRGDHVk-4",
  authDomain: "banglaquiz-sgw69.firebaseapp.com",
  databaseURL: "https://banglaquiz-sgw69-default-rtdb.firebaseio.com",
  projectId: "banglaquiz-sgw69",
  storageBucket: "banglaquiz-sgw69.firebasestorage.app",
  messagingSenderId: "1022892255338",
  appId: "1:1022892255338:web:347505a8ff6d0f1397c213"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
