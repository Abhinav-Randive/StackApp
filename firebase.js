import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Debug: Log all available env vars
if (typeof window !== "undefined") {
  console.log("🔍 Firebase Initialization Debug:");
  console.log("Node env:", process.env.NODE_ENV);
  console.log("EXPO_PUBLIC_FIREBASE_PROJECT_ID:", process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ? "✅ set" : "❌ missing");
  console.log("EXPO_PUBLIC_FIREBASE_API_KEY:", process.env.EXPO_PUBLIC_FIREBASE_API_KEY ? "✅ set" : "❌ missing");
  console.log("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN:", process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ? "✅ set" : "❌ missing");
  console.log("EXPO_PUBLIC_FIREBASE_APP_ID:", process.env.EXPO_PUBLIC_FIREBASE_APP_ID ? "✅ set" : "❌ missing");
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyA4hH3s_hw2Mm5xAtdHvygDvZJrqaKlzk4",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "stack-bd031.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "stack-bd031",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "stack-bd031.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "59631077914",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:59631077914:web:4704a47eb06247a1615fa3"
};

console.log("🔧 Firebase Config Using:", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain
});

// Initialize Firebase (prevent double initialization)
let app;
let auth;
let db;
let firebaseError = null;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log("✅ Firebase app initialized successfully");
  } else {
    app = getApps()[0];
    console.log("✅ Firebase app already initialized");
  }
  
  // Initialize auth and firestore
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("✅ Firebase auth and firestore ready");
  
} catch (error) {
  console.error("❌ Firebase initialization error:", error.message);
  console.error("📋 Full error details:", error);
  
  firebaseError = error;
  
  // Provide detailed debugging info
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    console.error("🌐 Running on:", hostname);
    
    if (hostname.includes("vercel.app")) {
      console.error("⚠️ VERCEL DEPLOYMENT CHECKLIST:");
      console.error("  1️⃣ Go to https://vercel.com/dashboard → select 'stack-app'");
      console.error("  2️⃣ Settings → Environment Variables");
      console.error("  3️⃣ Add all 6 EXPO_PUBLIC_* variables (copy from your .env file)");
      console.error("  4️⃣ Click 'Redeploy' from Deployments tab");
      console.error("  5️⃣ Also add your domain to Firebase Console > Authentication > Authorized domains");
    }
  }
}

// Export auth and db (may be undefined if initialization failed)
export { app, auth, db, firebaseError };

