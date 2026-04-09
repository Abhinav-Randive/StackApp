import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import ScreenShell from "../components/ScreenShell";
import AnimatedPressable from "../components/AnimatedPressable";
import { APP_STYLES, COLORS } from "../theme";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    await signInWithEmailAndPassword(auth, email, password);
    navigation.replace("Main");
  };

  const signup = async () => {
    const user = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", user.user.uid), { email, friends: [] });
    navigation.replace("Main");
  };

  return (
    <ScreenShell
      scroll={false}
      contentContainerStyle={{ justifyContent: "center" }}
      title="Stack"
      subtitle="Pick up where you left off with one clean, consistent home for every savings screen."
    >
      <View style={APP_STYLES.heroCard}>
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

        <AnimatedPressable onPress={login} style={APP_STYLES.primaryButton}>
          <Text style={APP_STYLES.primaryButtonText}>Login</Text>
        </AnimatedPressable>

        <AnimatedPressable onPress={signup} style={APP_STYLES.secondaryButton}>
          <Text style={APP_STYLES.secondaryButtonText}>Create account</Text>
        </AnimatedPressable>
      </View>
    </ScreenShell>
  );
}
