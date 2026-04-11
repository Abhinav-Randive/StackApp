import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import ScreenShell from "../components/ScreenShell";
import AnimatedPressable from "../components/AnimatedPressable";
import { APP_STYLES, COLORS } from "../theme";
import { sanitizeText } from "../utils/validation";
import Logo from "../logo1.svg";

export default function OnboardingScreen({ navigation }) {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const finishOnboarding = async () => {
    const safeName = sanitizeText(name, 50);
    const safeBio = sanitizeText(bio, 180);

    if (!safeName) {
      setError("Add your name so friends know who you are.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        name: safeName,
        bio: safeBio,
        onboarding_completed: true,
        onboarding_completed_at: Date.now()
      });
      navigation.replace("Main");
    } catch (err) {
      setError(err?.message || "Unable to finish onboarding right now.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenShell
      scroll={false}
      contentContainerStyle={{ justifyContent: "center" }}
      title="Get Set Up"
      subtitle="A quick setup so your first stack feels intentional from the start."
    >
      <View style={APP_STYLES.heroCard}>
        <Logo width={160} height={72} style={{ alignSelf: "center", marginBottom: 16 }} />
        <Text style={APP_STYLES.label}>Start here</Text>
        <Text style={[APP_STYLES.subtitle, { color: COLORS.text }]}>
          Tell people who you are, then we will send you to your dashboard to create a stack, add a friend, and make your first contribution.
        </Text>

        <TextInput
          placeholder="Your name"
          placeholderTextColor={COLORS.muted}
          value={name}
          onChangeText={setName}
          style={APP_STYLES.input}
        />

        <TextInput
          placeholder="What are you saving for?"
          placeholderTextColor={COLORS.muted}
          value={bio}
          onChangeText={setBio}
          multiline
          style={[APP_STYLES.input, { minHeight: 96, textAlignVertical: "top" }]}
        />

        {error ? (
          <Text style={[APP_STYLES.feedbackText, { color: COLORS.danger }]}>{error}</Text>
        ) : null}

        <AnimatedPressable onPress={finishOnboarding} style={APP_STYLES.primaryButton} disabled={saving}>
          <Text style={APP_STYLES.primaryButtonText}>{saving ? "Saving..." : "Finish Setup"}</Text>
        </AnimatedPressable>
      </View>
    </ScreenShell>
  );
}
