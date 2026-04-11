import React, { useEffect, useState } from "react";
import {
  Text, TextInput, View
} from "react-native";
import { db, auth } from "../firebase";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where
} from "firebase/firestore";
import ScreenShell from "../components/ScreenShell";
import AnimatedPressable from "../components/AnimatedPressable";
import { APP_STYLES, COLORS } from "../theme";
import {
  buildProfileBadges,
  formatCurrency,
  getContributionStreak,
  getInitials,
  isCompletedStack
} from "../utils/activity";
import { sanitizeText } from "../utils/validation";

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [stacks, setStacks] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => onSnapshot(
    doc(db, "users", auth.currentUser.uid),
    (snap) => {
      if (!snap.exists()) return;
      const nextProfile = snap.data();
      setProfile(nextProfile);
      setNameDraft(nextProfile.name || "");
      setBioDraft(nextProfile.bio || "");
    }
  ), []);

  useEffect(() => {
    const q = query(collection(db, "stacks"), where("members", "array-contains", auth.currentUser.uid));
    return onSnapshot(q, (snap) => {
      setStacks(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, "contributions"), where("user_id", "==", auth.currentUser.uid));
    return onSnapshot(q, (snap) => {
      setContributions(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
    });
  }, []);

  const saveProfile = async () => {
    const safeName = sanitizeText(nameDraft, 40);
    const safeBio = sanitizeText(bioDraft, 180);

    if (!safeName) {
      setError("Add a name so your friends can recognize you.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        name: safeName,
        bio: safeBio
      });
      setEditing(false);
    } catch (err) {
      setError(err?.message || "Unable to save your profile right now.");
    } finally {
      setSaving(false);
    }
  };

  if (!profile) {
    return null;
  }

  const totalSaved = contributions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const completedStacks = stacks.filter((stack) => {
    const total = contributions
      .filter((item) => item.stack_id === stack.id)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    return isCompletedStack(stack, total);
  });
  const streakDays = getContributionStreak(contributions);
  const badges = buildProfileBadges({
    totalSaved,
    completedCount: completedStacks.length,
    friendCount: (profile.friends || []).length,
    streakDays,
    stackCount: stacks.length
  });

  return (
    <ScreenShell title="Profile" subtitle="Show your momentum, your wins, and the people you’re building with.">
      <View style={[APP_STYLES.heroCard, { alignItems: "center" }]}>
        <View style={[APP_STYLES.avatar, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
          <Text style={{ color: COLORS.text, fontSize: 26, fontWeight: "800" }}>
            {getInitials(profile.name, profile.email)}
          </Text>
        </View>

        {editing ? (
          <TextInput
            value={nameDraft}
            onChangeText={setNameDraft}
            placeholder="Name"
            placeholderTextColor={COLORS.muted}
            style={[APP_STYLES.input, { width: "100%", textAlign: "center" }]}
          />
        ) : (
          <Text style={{ color: COLORS.text, marginTop: 14, fontSize: 24, fontWeight: "800" }}>
            {profile.name || "Your name"}
          </Text>
        )}

        <Text style={[APP_STYLES.subtitle, { marginTop: 6 }]}>
          {profile.email}
        </Text>

        {editing ? (
          <TextInput
            value={bioDraft}
            onChangeText={setBioDraft}
            placeholder="Tell people what you’re stacking toward"
            placeholderTextColor={COLORS.muted}
            multiline
            style={[APP_STYLES.input, { width: "100%", minHeight: 96, textAlignVertical: "top" }]}
          />
        ) : (
          <Text style={[APP_STYLES.subtitle, { color: COLORS.text, textAlign: "center", marginTop: 16 }]}>
            {profile.bio || "Add a short bio so friends know what you’re building toward."}
          </Text>
        )}

        <View style={[APP_STYLES.row, { marginTop: 16 }]}>
          <View style={[APP_STYLES.card, { flex: 1, marginTop: 0, marginRight: 8, padding: 14 }]}>
            <Text style={APP_STYLES.label}>Saved</Text>
            <Text style={[APP_STYLES.subtitle, { color: COLORS.text, fontSize: 20, marginTop: 8 }]}>
              {formatCurrency(totalSaved)}
            </Text>
          </View>
          <View style={[APP_STYLES.card, { flex: 1, marginTop: 0, marginLeft: 8, padding: 14 }]}>
            <Text style={APP_STYLES.label}>Streak</Text>
            <Text style={[APP_STYLES.subtitle, { color: COLORS.text, fontSize: 20, marginTop: 8 }]}>
              {streakDays} day{streakDays === 1 ? "" : "s"}
            </Text>
          </View>
        </View>
      </View>

      {error ? (
        <Text style={[APP_STYLES.feedbackText, { color: COLORS.danger }]}>{error}</Text>
      ) : null}

      <View style={[APP_STYLES.row, { alignItems: "stretch" }]}>
        <View style={[APP_STYLES.card, { flex: 1, marginRight: 8 }]}>
          <Text style={APP_STYLES.label}>Friends</Text>
          <Text style={[APP_STYLES.value, { fontSize: 26 }]}>{(profile.friends || []).length}</Text>
        </View>
        <View style={[APP_STYLES.card, { flex: 1, marginLeft: 8 }]}>
          <Text style={APP_STYLES.label}>Completed</Text>
          <Text style={[APP_STYLES.value, { fontSize: 26 }]}>{completedStacks.length}</Text>
        </View>
      </View>

      <View style={APP_STYLES.card}>
        <Text style={APP_STYLES.label}>Badges</Text>
        <View style={[APP_STYLES.row, { flexWrap: "wrap", alignItems: "flex-start", marginTop: 10 }]}>
          {badges.map((badge) => (
            <View
              key={badge}
              style={{
                backgroundColor: COLORS.accentSoft,
                borderColor: "rgba(123, 228, 149, 0.25)",
                borderWidth: 1,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 9,
                marginRight: 8,
                marginBottom: 8
              }}
            >
              <Text style={{ color: COLORS.accent2, fontWeight: "700" }}>{badge}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={APP_STYLES.card}>
        <Text style={APP_STYLES.label}>Completed stacks</Text>
        {completedStacks.length ? (
          completedStacks.slice(0, 4).map((stack) => (
            <AnimatedPressable
              key={stack.id}
              onPress={() => navigation.navigate("StackDetail", { stack })}
              style={[APP_STYLES.secondaryButton, { marginTop: 10 }]}
            >
              <Text style={APP_STYLES.secondaryButtonText}>{stack.name}</Text>
            </AnimatedPressable>
          ))
        ) : (
          <Text style={APP_STYLES.emptyState}>Complete a stack to turn your wins into a visible track record.</Text>
        )}
      </View>

      <AnimatedPressable
        onPress={editing ? saveProfile : () => setEditing(true)}
        style={editing ? APP_STYLES.primaryButton : APP_STYLES.secondaryButton}
        disabled={saving}
      >
        <Text style={editing ? APP_STYLES.primaryButtonText : APP_STYLES.secondaryButtonText}>
          {saving ? "Saving..." : editing ? "Save Profile" : "Edit Profile"}
        </Text>
      </AnimatedPressable>

      {editing ? (
        <AnimatedPressable onPress={() => setEditing(false)} style={APP_STYLES.secondaryButton} disabled={saving}>
          <Text style={APP_STYLES.secondaryButtonText}>Cancel</Text>
        </AnimatedPressable>
      ) : null}

      <AnimatedPressable onPress={() => navigation.navigate("Friends")} style={APP_STYLES.secondaryButton}>
        <Text style={APP_STYLES.secondaryButtonText}>Manage Friends</Text>
      </AnimatedPressable>
    </ScreenShell>
  );
}
