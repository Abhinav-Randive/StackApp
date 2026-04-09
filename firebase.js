import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA4hH3s_hw2Mm5xAtdHvygDvZJrqaKlzk4",
  authDomain: "stack-bd031.firebaseapp.com",
  projectId: "stack-bd031",
  storageBucket: "stack-bd031.firebasestorage.app",
  messagingSenderId: "59631077914",
  appId: "1:59631077914:web:8cf60da353eb9536615fa3"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);