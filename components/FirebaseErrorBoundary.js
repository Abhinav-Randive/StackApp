import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { firebaseError } from "../firebase";
import { APP_STYLES, COLORS } from "../theme";

/**
 * Wraps screens to show Firebase error if initialization failed
 */
export function FirebaseErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(!!firebaseError);

  useEffect(() => {
    if (firebaseError) {
      console.error("🚨 Firebase Error detected in boundary");
      setHasError(true);
    }
  }, []);

  if (hasError && firebaseError) {
    return (
      <View style={[APP_STYLES.screen, { justifyContent: "center", padding: 20 }]}>
        <Text style={[APP_STYLES.label, { color: COLORS.danger, marginBottom: 16 }]}>
          Firebase Configuration Error
        </Text>
        <Text style={[APP_STYLES.subtitle, { color: COLORS.text }]}>
          {firebaseError.message}
        </Text>
        <Text style={[APP_STYLES.subtitle, { marginTop: 20, color: COLORS.muted }]}>
          If on Vercel:
          {"\n"}1. Add EXPO_PUBLIC_* env vars
          {"\n"}2. Click "Redeploy"
          {"\n"}3. Refresh this page
        </Text>
      </View>
    );
  }

  return children;
}

export default FirebaseErrorBoundary;
