import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import ScreenShell from "../components/ScreenShell";
import AnimatedPressable from "../components/AnimatedPressable";
import BrandLogo from "../components/BrandLogo";
import { APP_STYLES, COLORS } from "../theme";
import { isValidEmail, normalizeEmail } from "../utils/validation";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async () => {
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const profileSnap = await getDoc(doc(db, "users", userCredential.user.uid));
      const profile = profileSnap.exists() ? profileSnap.data() : null;
      navigation.replace(profile?.onboarding_completed ? "Main" : "Onboarding");
    } catch (err) {
      setError(err?.message || "Unable to sign in right now.");
    } finally {
      setLoading(false);
    }
  };

  const signup = async () => {
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const user = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      await setDoc(doc(db, "users", user.user.uid), {
        email: normalizedEmail,
        friends: [],
        onboarding_completed: false,
        bio: "",
        name: ""
      });
      navigation.replace("Onboarding");
    } catch (err) {
      setError(err?.message || "Unable to create your account right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell
      scroll={false}
      contentContainerStyle={{ justifyContent: "center" }}
      title="Stack"
      subtitle="Pick up where you left off with one clean, consistent home for every savings screen."
    >
      <View style={APP_STYLES.heroCard}>
        <BrandLogo width={168} height={76} style={{ alignSelf: "center", marginBottom: 14 }} />
        <Text style={APP_STYLES.label}>Welcome back</Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor={COLORS.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={APP_STYLES.input}
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor={COLORS.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={APP_STYLES.input}
        />

        {error ? (
          <Text style={[APP_STYLES.feedbackText, { color: COLORS.danger }]}>{error}</Text>
        ) : null}

        <AnimatedPressable onPress={login} style={APP_STYLES.primaryButton} disabled={loading}>
          <Text style={APP_STYLES.primaryButtonText}>{loading ? "Working..." : "Login"}</Text>
        </AnimatedPressable>

        <AnimatedPressable onPress={signup} style={APP_STYLES.secondaryButton} disabled={loading}>
          <Text style={APP_STYLES.secondaryButtonText}>Create account</Text>
        </AnimatedPressable>
      </View>
    </ScreenShell>
  );
}
