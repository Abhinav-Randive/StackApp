import React, { useEffect, useState } from "react";
import { TouchableOpacity, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db, auth } from "../firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import ScreenShell from "../components/ScreenShell";
import { APP_STYLES, COLORS } from "../theme";
import AnimatedPressable from "../components/AnimatedPressable";
import ProgressCircle from "../components/ProgressCircle";
import { getDaysUntil, getStackProgress } from "../utils/activity";

export default function DashboardScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stacks, setStacks] = useState([]);
  const [totals, setTotals] = useState({});
  const [activities, setActivities] = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "contributions"), where("user_id", "==", auth.currentUser.uid));
    return onSnapshot(q, snap => {
      setData(snap.docs.map(d => d.data()));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, "notifications"));
    return onSnapshot(q, (snap) => {
      const unread = snap.docs
        .map((item) => item.data())
        .filter((item) => (item.target_user_ids || []).includes(auth.currentUser.uid))
        .filter((item) => !(item.read_by || []).includes(auth.currentUser.uid)).length;
      setUnreadCount(unread);
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, "stacks"), where("members", "array-contains", auth.currentUser.uid));
    return onSnapshot(q, (snap) => {
      setStacks(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "contributions"), (snap) => {
      const nextTotals = {};

      snap.docs.forEach((item) => {
        const dataPoint = item.data();
        nextTotals[dataPoint.stack_id] = (nextTotals[dataPoint.stack_id] || 0) + (Number(dataPoint.amount) || 0);
      });

      setTotals(nextTotals);
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, "activities"));
    return onSnapshot(q, (snap) => {
      setActivities(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));
    return onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setProfile({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    });
  }, []);

  const total = data.reduce((s, c) => s + c.amount, 0);
  const stackSummaries = stacks
    .map((stack) => {
      const saved = totals[stack.id] || 0;
      const progress = getStackProgress(saved, stack.goal_amount);
      const daysLeft = getDaysUntil(stack.deadline);

      return {
        ...stack,
        saved,
        progress,
        daysLeft
      };
    })
    .sort((a, b) => b.progress - a.progress);

  const continueStack = [...stackSummaries]
    .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))[0];

  const closestToGoal = [...stackSummaries]
    .filter((stack) => stack.progress < 1)
    .sort((a, b) => b.progress - a.progress)[0];

  const dueSoon = [...stackSummaries]
    .filter((stack) => stack.daysLeft !== null)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0];

  const friendActivity = activities
    .filter((item) => (profile?.friends || []).includes(item.user_id))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 3);

  return (
    <ScreenShell
      title="Home"
      subtitle="A smarter view of what needs your attention next."
      headerAction={(
        <TouchableOpacity onPress={() => navigation.navigate("Notifications")} style={{ position: "relative", padding: 4 }}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.accent2} />
          {unreadCount ? (
            <View style={{ position: "absolute", right: -2, top: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
              <Text style={{ color: "#1C1020", fontSize: 10, fontWeight: "800" }}>{unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      )}
    >
      <View style={APP_STYLES.heroCard}>
        <Text style={APP_STYLES.label}>Total saved</Text>
        <Text style={APP_STYLES.value}>${total}</Text>
        <Text style={[APP_STYLES.subtitle, { color: COLORS.accent2, marginTop: 12 }]}>
          Every contribution is moving your stacks forward.
        </Text>
        <View style={[APP_STYLES.row, { marginTop: 14 }]}>
          <TouchableOpacity onPress={() => navigation.navigate("Leaderboard")} style={[APP_STYLES.secondaryButton, { flex: 1, marginTop: 0, marginRight: 8 }]}>
            <Text style={APP_STYLES.secondaryButtonText}>Leaderboard</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Stacks")} style={[APP_STYLES.primaryButton, { flex: 1, marginTop: 0 }]}>
            <Text style={APP_STYLES.primaryButtonText}>Open Stacks</Text>
          </TouchableOpacity>
        </View>
      </View>

      {continueStack ? (
        <AnimatedPressable
          onPress={() => navigation.navigate("StackDetail", { stack: continueStack })}
          style={[APP_STYLES.card, { flexDirection: "row", alignItems: "center" }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[APP_STYLES.label, { color: COLORS.accent2 }]}>Continue where you left off</Text>
            <Text style={[APP_STYLES.subtitle, { color: COLORS.text, fontSize: 18, marginTop: 8 }]}>
              {continueStack.name}
            </Text>
            <Text style={[APP_STYLES.subtitle, { marginTop: 8 }]}>
              ${continueStack.saved} of ${continueStack.goal_amount}
            </Text>
          </View>
          <ProgressCircle progress={continueStack.progress} size={72} />
        </AnimatedPressable>
      ) : null}

      <View style={[APP_STYLES.row, { alignItems: "stretch" }]}>
        <View style={[APP_STYLES.card, { flex: 1, marginRight: 8 }]}>
          <Text style={APP_STYLES.label}>Closest to goal</Text>
          {closestToGoal ? (
            <>
              <Text style={[APP_STYLES.subtitle, { color: COLORS.text, fontSize: 18, marginTop: 10 }]}>
                {closestToGoal.name}
              </Text>
              <Text style={[APP_STYLES.subtitle, { marginTop: 8 }]}>
                {Math.round(closestToGoal.progress * 100)}% complete
              </Text>
              <Text style={[APP_STYLES.subtitle, { color: COLORS.accent2, marginTop: 8 }]}>
                ${(closestToGoal.goal_amount || 0) - closestToGoal.saved} left
              </Text>
            </>
          ) : (
            <Text style={APP_STYLES.emptyState}>Create a stack to see your closest win.</Text>
          )}
        </View>

        <View style={[APP_STYLES.card, { flex: 1, marginLeft: 8 }]}>
          <Text style={APP_STYLES.label}>Due soon</Text>
          {dueSoon ? (
            <>
              <Text style={[APP_STYLES.subtitle, { color: COLORS.text, fontSize: 18, marginTop: 10 }]}>
                {dueSoon.name}
              </Text>
              <Text style={[APP_STYLES.subtitle, { marginTop: 8 }]}>
                {dueSoon.daysLeft >= 0 ? `${dueSoon.daysLeft} days left` : `${Math.abs(dueSoon.daysLeft)} days overdue`}
              </Text>
              <Text style={[APP_STYLES.subtitle, { color: COLORS.accent2, marginTop: 8 }]}>
                ${dueSoon.saved} saved so far
              </Text>
            </>
          ) : (
            <Text style={APP_STYLES.emptyState}>Add a deadline to a stack to track urgency here.</Text>
          )}
        </View>
      </View>

      <View style={APP_STYLES.card}>
        <Text style={APP_STYLES.label}>Recent friend activity</Text>
        {friendActivity.length ? (
          friendActivity.map((item) => (
            <View key={item.id} style={{ marginTop: 12 }}>
              <Text style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 0 }]}>
                {item.user || "Someone"}
              </Text>
              <Text style={[APP_STYLES.subtitle, { marginTop: 4 }]}>
                {item.stack_name ? `${item.stack_name}` : "Activity update"}
              </Text>
              <Text style={[APP_STYLES.subtitle, { color: COLORS.accent2, marginTop: 4 }]}>
                {item.type === "contribution"
                  ? `Added $${item.amount || 0}`
                  : item.type === "milestone"
                    ? `Hit ${item.metadata?.milestone || 0}%`
                    : item.type === "comment"
                      ? "Left a comment"
                      : "Shared an update"}
              </Text>
            </View>
          ))
        ) : (
          <Text style={APP_STYLES.emptyState}>Add friends to start seeing their momentum here.</Text>
        )}
      </View>
    </ScreenShell>
  );
}
