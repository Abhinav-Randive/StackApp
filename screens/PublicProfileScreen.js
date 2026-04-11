import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "firebase/firestore";
import ScreenShell from "../components/ScreenShell";
import AnimatedPressable from "../components/AnimatedPressable";
import { APP_STYLES, COLORS } from "../theme";
import {
  buildProfileBadges,
  formatCurrency,
  getContributionStreak,
  getInitials
} from "../utils/activity";
import { getDemoUserById } from "../utils/demoUsers";

export default function PublicProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const [profile, setProfile] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        setError("");
        const demoUser = getDemoUserById(userId);
        const userSnap = await getDoc(doc(db, "users", userId));

        if (userSnap.exists()) {
          setProfile({ id: userId, ...userSnap.data(), isDemo: false });
        } else if (demoUser) {
          setProfile({ ...demoUser, isDemo: true });
        } else {
          setError("This profile is unavailable right now.");
          return;
        }

        const contributionQuery = query(collection(db, "contributions"), where("user_id", "==", userId));
        const contributionSnap = await getDocs(contributionQuery);
        setContributions(contributionSnap.docs.map((item) => ({ id: item.id, ...item.data() })));

        const activityQuery = query(collection(db, "activities"), where("user_id", "==", userId));
        const activitySnap = await getDocs(activityQuery);
        setActivities(activitySnap.docs.map((item) => ({ id: item.id, ...item.data() })));
      } catch (err) {
        const demoUser = getDemoUserById(userId);
        if (demoUser) {
          setProfile({ ...demoUser, isDemo: true });
          setContributions([]);
          setActivities([]);
          setError("");
          return;
        }

        setError(err?.message || "Unable to load this profile right now.");
      }
    };

    fetch();
  }, [userId]);

  if (!profile) {
    return (
      <ScreenShell title="Profile" subtitle="Loading this saver’s public snapshot.">
        {error ? (
          <Text style={[APP_STYLES.feedbackText, { color: COLORS.danger }]}>{error}</Text>
        ) : null}
      </ScreenShell>
    );
  }

  const totalSaved = profile.isDemo
    ? profile.stats?.totalSaved || 0
    : contributions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const streakDays = profile.isDemo
    ? profile.stats?.streakDays || 0
    : getContributionStreak(contributions);

  const completedStacks = profile.isDemo
    ? (profile.completedStacks || []).map((name) => ({ id: `demo-${name}`, name }))
    : [...new Map(
      activities
        .filter((item) => item.type === "milestone" && Number(item.metadata?.milestone) === 100 && item.stack_name)
        .map((item) => [item.stack_name, { id: item.stack_id || item.stack_name, name: item.stack_name, stackId: item.stack_id }])
    ).values()];

  const badges = buildProfileBadges({
    totalSaved,
    completedCount: profile.isDemo ? profile.stats?.completedCount || completedStacks.length : completedStacks.length,
    friendCount: (profile.friends || []).length,
    streakDays,
    stackCount: profile.isDemo ? profile.stats?.stackCount || 0 : new Set(activities.map((item) => item.stack_name).filter(Boolean)).size
  });

  return (
    <ScreenShell title="Profile" subtitle="A public snapshot of how this saver is showing up.">
      {error ? (
        <Text style={[APP_STYLES.feedbackText, { color: COLORS.danger }]}>{error}</Text>
      ) : null}

      <View style={[APP_STYLES.heroCard, { alignItems: "center" }]}>
        <View style={[APP_STYLES.avatar, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
          <Text style={{ color: COLORS.text, fontSize: 26, fontWeight: "800" }}>
            {getInitials(profile.name, profile.email)}
          </Text>
        </View>

        <Text style={{ color: COLORS.text, fontSize: 24, fontWeight: "800", marginTop: 14 }}>
          {profile.name || profile.email}
        </Text>

        <Text style={[APP_STYLES.subtitle, { textAlign: "center" }]}>
          {profile.bio || "No bio yet."}
        </Text>

        {profile.isDemo ? (
          <Text style={[APP_STYLES.subtitle, { color: COLORS.accent2, marginTop: 10 }]}>
            Demo community profile
          </Text>
        ) : null}
      </View>

      <View style={[APP_STYLES.row, { alignItems: "stretch" }]}>
        <View style={[APP_STYLES.card, { flex: 1, marginRight: 8 }]}>
          <Text style={APP_STYLES.label}>Total saved</Text>
          <Text style={[APP_STYLES.value, { fontSize: 24 }]}>{formatCurrency(totalSaved)}</Text>
        </View>
        <View style={[APP_STYLES.card, { flex: 1, marginLeft: 8 }]}>
          <Text style={APP_STYLES.label}>Streak</Text>
          <Text style={[APP_STYLES.value, { fontSize: 24 }]}>{streakDays}d</Text>
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
          completedStacks.slice(0, 3).map((stack) => (
            stack.stackId ? (
              <AnimatedPressable
                key={stack.id}
                onPress={() => navigation.navigate("StackDetail", { stack: { id: stack.stackId, name: stack.name } })}
                style={[APP_STYLES.secondaryButton, { marginTop: 10 }]}
              >
                <Text style={APP_STYLES.secondaryButtonText}>{stack.name}</Text>
              </AnimatedPressable>
            ) : (
              <View key={stack.id} style={[APP_STYLES.card, { marginTop: 10, padding: 14, borderRadius: 16 }]}>
                <Text style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 0 }]}>{stack.name}</Text>
              </View>
            )
          ))
        ) : (
          <Text style={APP_STYLES.emptyState}>Completed stacks will show up here as this saver reaches their goals.</Text>
        )}
      </View>
    </ScreenShell>
  );
}
