import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Debug: Log all available env vars
if (typeof window !== "undefined") {
  console.log("🔍 Available environment variables:");
  console.log("EXPO_PUBLIC_FIREBASE_PROJECT_ID:", process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ? "✅" : "❌");
  console.log("EXPO_PUBLIC_FIREBASE_API_KEY:", process.env.EXPO_PUBLIC_FIREBASE_API_KEY ? "✅" : "❌");
  console.log("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN:", process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ? "✅" : "❌");
  console.log("EXPO_PUBLIC_FIREBASE_APP_ID:", process.env.EXPO_PUBLIC_FIREBASE_APP_ID ? "✅" : "❌");
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyA4hH3s_hw2Mm5xAtdHvygDvZJrqaKlzk4",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "stack-bd031.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "stack-bd031",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "stack-bd031.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "59631077914",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:59631077914:web:4704a47eb06247a1615fa3"
};

console.log("🔧 Firebase Config (using values):", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  appId: firebaseConfig.appId ? "***" : "MISSING"
});

// Validate Firebase config
const requiredFields = ["apiKey", "projectId", "appId", "authDomain"];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (missingFields.length > 0) {
  console.error("❌ Firebase config missing required fields:", missingFields);
  console.error("💡 On Vercel: Ensure EXPO_PUBLIC_* env vars are set in project Settings > Environment Variables");
  console.error("   Then redeploy the project");
  throw new Error(`Firebase initialization failed. Missing: ${missingFields.join(", ")}`);
}

// Initialize Firebase (prevent double initialization)
let app;
let auth;
let db;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log("✅ Firebase app initialized");
  } else {
    app = getApps()[0];
    console.log("✅ Firebase app already initialized");
  }
  
  // Initialize auth and firestore
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("✅ Firebase services ready (auth + firestore)");
  
} catch (error) {
  console.error("❌ Firebase initialization failed:", error.message);
  console.error("📋 Full error:", error);
  
  // Provide detailed debugging info
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    console.error("🌐 Current hostname:", hostname);
    
    if (hostname.includes("vercel.app")) {
      console.error("⚠️  Running on Vercel. Checklist:");
      console.error("  1. Did you add all 6 EXPO_PUBLIC_* variables to Vercel Settings?");
      console.error("  2. Did you click 'Redeploy' after adding env vars?");
      console.error("  3. Did you add your domain to Firebase > Authentication > Authorized domains?");
    }
  }
  
  throw error;
}

export { app, auth, db };

