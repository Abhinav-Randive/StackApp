# Vercel Environment Variables Setup

## Steps to fix the Firebase issue on Vercel:

1. Go to: https://vercel.com/dashboard
2. Select your "stack-app" project
3. Go to Settings → Environment Variables
4. Add these environment variables:

```
EXPO_PUBLIC_FIREBASE_API_KEY = AIzaSyA4hH3s_hw2Mm5xAtdHvygDvZJrqaKlzk4
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = stack-bd031.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID = stack-bd031
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = stack-bd031.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 59631077914
EXPO_PUBLIC_FIREBASE_APP_ID = 1:59631077914:web:4704a47eb06247a1615fa3
```

5. Deploy again (or redeploy from git)

## Also need to authorize Vercel domain in Firebase:

1. Go to: https://console.firebase.google.com → stack-bd031 project
2. Select "Authentication" → Settings → Authorized domains
3. Add: `stack-app-ochre.vercel.app`
4. Save

This allows Firebase to accept requests from your Vercel domain.
