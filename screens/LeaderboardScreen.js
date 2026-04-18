import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import ScreenShell from "../components/ScreenShell";
import { db } from "../firebase";
import { APP_STYLES, COLORS } from "../theme";
import { getContributionStreak } from "../utils/activity";

export default function LeaderboardScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all contributions at once (single query)
        const contributionsSnap = await getDocs(collection(db, "contributions"));
        
        const contributionsByUser = {};
        const contributionListByUser = {};
        contributionsSnap.docs.forEach((doc) => {
          const data = doc.data();
          const userId = data.user_id;
          if (!contributionsByUser[userId]) {
            contributionsByUser[userId] = 0;
            contributionListByUser[userId] = [];
          }
          contributionsByUser[userId] += data.amount || 0;
          contributionListByUser[userId].push(data);
        });

        const usersSnap = await getDocs(collection(db, "users"));
        const stacksSnap = await getDocs(collection(db, "stacks"));
        const completedCountsByUser = {};

        stacksSnap.docs.forEach((docItem) => {
          const stack = docItem.data();
          if (stack.status !== "completed" && !stack.completed_at) {
            return;
          }

          (stack.members || []).forEach((memberId) => {
            completedCountsByUser[memberId] = (completedCountsByUser[memberId] || 0) + 1;
          });
        });

        const results = usersSnap.docs
          .map((u) => ({
            id: u.id,
            ...u.data(),
            total: contributionsByUser[u.id] || 0,
            streak: getContributionStreak(contributionListByUser[u.id] || []),
            completedStacks: completedCountsByUser[u.id] || 0,
            contributionCount: (contributionListByUser[u.id] || []).length
          }))
          .filter((u) => u.total > 0)
          .sort((a, b) => {
            if (b.streak !== a.streak) return b.streak - a.streak;
            if (b.completedStacks !== a.completedStacks) return b.completedStacks - a.completedStacks;
            return b.contributionCount - a.contributionCount;
          });

        setUsers(results);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError("Failed to load leaderboard. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, []);

  if (loading) {
    return (
      <ScreenShell
        title="Leaderboard"
        subtitle="See who is building the strongest investing and saving habits."
        headerAction={<Ionicons name="trophy-outline" size={20} color={COLORS.accent2} />}
      >
        <View style={{ justifyContent: "center", alignItems: "center", marginTop: 40 }}>
          <ActivityIndicator size="large" color={COLORS.accent2} />
        </View>
      </ScreenShell>
    );
  }

  if (error) {
    return (
      <ScreenShell
        title="Leaderboard"
        subtitle="See who is building the strongest investing and saving habits."
        headerAction={<Ionicons name="trophy-outline" size={20} color={COLORS.accent2} />}
      >
        <Text style={[APP_STYLES.emptyState, { color: COLORS.danger }]}>{error}</Text>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Leaderboard"
      subtitle="See who is building the strongest investing and saving habits."
      headerAction={<Ionicons name="trophy-outline" size={20} color={COLORS.accent2} />}
    >
      {users.map((u, i) => (
        <TouchableOpacity
          key={u.id}
          onPress={() => navigation.navigate("PublicProfile", { userId: u.id })}
          style={APP_STYLES.card}
        >
          <Text style={APP_STYLES.label}>#{i + 1}</Text>
          <Text style={[APP_STYLES.subtitle, { color: COLORS.text, fontSize: 17, marginTop: 8 }]}>
            {u.name || u.email}
          </Text>
        <Text style={[APP_STYLES.subtitle, { color: COLORS.accent2, marginTop: 6 }]}>
            {u.streak} day streak · {u.completedStacks} completed · {u.contributionCount} moves
        </Text>
      </TouchableOpacity>
      ))}
      {!users.length ? <Text style={APP_STYLES.emptyState}>No leaderboard data yet.</Text> : null}
    </ScreenShell>
  );
}
