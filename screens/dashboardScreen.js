import { Ionicons } from "@expo/vector-icons";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import AnimatedPressable from "../components/AnimatedPressable";
import BrandLogo from "../components/BrandLogo";
import ProgressCircle from "../components/ProgressCircle";
import ScreenShell from "../components/ScreenShell";
import { auth, db } from "../firebase";
import { APP_STYLES, COLORS } from "../theme";
import { openFeedbackEmail } from "../utils/feedback";
import {
  getChallengeLabel,
  getDaysUntil,
  getInactiveDays,
  getProjectedValue,
  getStackProgress,
  STACK_TYPES
} from "../utils/activity";

export default function DashboardScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stacks, setStacks] = useState([]);
  const [totals, setTotals] = useState({});
  const [activities, setActivities] = useState([]);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "contributions"), where("user_id", "==", auth.currentUser.uid));
    return onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map(d => d.data()));
      },
      (err) => {
        setError(err?.message || "Unable to load your totals right now.");
      }
    );
  }, []);

  useEffect(() => {
    const q = query(collection(db, "notifications"));
    return onSnapshot(
      q,
      (snap) => {
        const unread = snap.docs
          .map((item) => item.data())
          .filter((item) => (item.target_user_ids || []).includes(auth.currentUser.uid))
          .filter((item) => !(item.read_by || []).includes(auth.currentUser.uid)).length;
        setUnreadCount(unread);
      },
      (err) => {
        setError(err?.message || "Unable to load notifications right now.");
      }
    );
  }, []);

  useEffect(() => {
    const q = query(collection(db, "stacks"), where("members", "array-contains", auth.currentUser.uid));
    return onSnapshot(
      q,
      (snap) => {
        setStacks(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      (err) => {
        setError(err?.message || "Unable to load your stacks right now.");
      }
    );
  }, []);

  useEffect(() => {
    return onSnapshot(
      collection(db, "contributions"),
      (snap) => {
        const nextTotals = {};

        snap.docs.forEach((item) => {
          const dataPoint = item.data();
          nextTotals[dataPoint.stack_id] = (nextTotals[dataPoint.stack_id] || 0) + (Number(dataPoint.amount) || 0);
        });

        setTotals(nextTotals);
      },
      (err) => {
        setError(err?.message || "Unable to load contribution totals right now.");
      }
    );
  }, []);

  useEffect(() => {
    const q = query(collection(db, "activities"));
    return onSnapshot(
      q,
      (snap) => {
        setActivities(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      (err) => {
        setError(err?.message || "Unable to load recent activity right now.");
      }
    );
  }, []);

  useEffect(() => {
    const q = query(collection(db, "users"), where("email", "==", auth.currentUser.email));
    return onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setProfile({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
      // Mark initial load as complete once profile is fetched
      setIsLoadingInitial(false);
    });
  }, []);

  const total = data.reduce((s, c) => s + c.amount, 0);
  const firstContributionDone = data.length > 0;
  const firstStackDone = stacks.length > 0;
  const firstFriendDone = (profile?.friends || []).length > 0;
  const onboardingTasks = [
    { label: "Create your first stack", done: firstStackDone, action: () => navigation.navigate("Stacks") },
    { label: "Add your first friend", done: firstFriendDone, action: () => navigation.navigate("Friends") },
    { label: "Make your first contribution", done: firstContributionDone, action: () => navigation.navigate("Stacks") }
  ];
  const remainingTasks = onboardingTasks.filter((item) => !item.done);
  const stackSummaries = stacks
    .map((stack) => {
      const saved = totals[stack.id] || 0;
      const progress = getStackProgress(saved, stack.goal_amount);
      const daysLeft = getDaysUntil(stack.deadline);
      const lastContribution = activities
        .filter((item) => item.stack_id === stack.id && item.type === "contribution")
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];

      return {
        ...stack,
        saved,
        progress,
        daysLeft,
        inactiveDays: getInactiveDays(lastContribution?.timestamp)
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

  const investingStacks = stackSummaries.filter((stack) => stack.stack_type === STACK_TYPES.INVESTING);
  const savingsStacks = stackSummaries.filter((stack) => stack.stack_type !== STACK_TYPES.INVESTING);
  const investingTotal = investingStacks.reduce((sum, stack) => sum + stack.saved, 0);
  const projectedInvestingTotal = investingStacks.reduce(
    (sum, stack) => sum + getProjectedValue(stack.saved, stack.risk_level, 12),
    0
  );
  const activeInvestingChallenge = investingStacks
    .filter((stack) => stack.progress < 1)
    .sort((a, b) => b.progress - a.progress)[0];

  const needsNudge = [...stackSummaries]
    .filter((stack) => stack.progress < 1)
    .sort((a, b) => (b.inactiveDays || 0) - (a.inactiveDays || 0))[0];

  const friendActivity = activities
    .filter((item) => (profile?.friends || []).includes(item.user_id))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 3);

  return (
    <ScreenShell
      title="Home"
      subtitle="Keep your savings and investing goals moving with your people."
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
      {error ? (
        <Text style={[APP_STYLES.feedbackText, { color: COLORS.danger }]}>{error}</Text>
      ) : null}
      {isLoadingInitial ? (
        <View style={{ justifyContent: "center", alignItems: "center", marginTop: 40 }}>
          <ActivityIndicator size="large" color={COLORS.accent2} />
        </View>
      ) : null}
      <View style={APP_STYLES.heroCard}>
        <BrandLogo width={140} height={64} style={{ marginBottom: 12 }} />
        <Text style={APP_STYLES.label}>Total saved</Text>
        <Text style={APP_STYLES.value}>${total}</Text>
        <Text style={[APP_STYLES.subtitle, { color: COLORS.accent2, marginTop: 12 }]}>
          Every contribution is building a habit your friends can see and celebrate.
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

      <View style={[APP_STYLES.row, { alignItems: "stretch" }]}>
        <View style={[APP_STYLES.card, { flex: 1, marginRight: 8 }]}>
          <Text style={APP_STYLES.label}>Savings goals</Text>
          <Text style={[APP_STYLES.value, { fontSize: 24 }]}>{savingsStacks.length}</Text>
          <Text style={[APP_STYLES.subtitle, { marginTop: 8 }]}>
            ${savingsStacks.reduce((sum, stack) => sum + stack.saved, 0)} currently stacked
          </Text>
        </View>
        <View style={[APP_STYLES.card, { flex: 1, marginLeft: 8 }]}>
          <Text style={APP_STYLES.label}>Investing goals</Text>
          <Text style={[APP_STYLES.value, { fontSize: 24 }]}>{investingStacks.length}</Text>
          <Text style={[APP_STYLES.subtitle, { marginTop: 8 }]}>
            ${investingTotal} now, ${projectedInvestingTotal} projected in 12m
          </Text>
        </View>
      </View>

      {!profile?.onboarding_completed || remainingTasks.length ? (
        <View style={APP_STYLES.card}>
          <Text style={APP_STYLES.label}>Getting started</Text>
          <Text style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 10 }]}>
            {remainingTasks.length
              ? `${onboardingTasks.length - remainingTasks.length} of ${onboardingTasks.length} setup steps complete`
              : "Profile setup complete. Keep going with your first stack rhythm."}
          </Text>
          {onboardingTasks.map((task) => (
            <AnimatedPressable
              key={task.label}
              onPress={task.done ? undefined : task.action}
              style={[
                task.done ? APP_STYLES.secondaryButton : APP_STYLES.primaryButton,
                { marginTop: 10 }
              ]}
              disabled={task.done}
            >
              <Text style={task.done ? APP_STYLES.secondaryButtonText : APP_STYLES.primaryButtonText}>
                {task.done ? `Done: ${task.label}` : task.label}
              </Text>
            </AnimatedPressable>
          ))}
        </View>
      ) : null}

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
        <Text style={APP_STYLES.label}>Momentum reminders</Text>
        {needsNudge ? (
          <>
            <Text style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 10, fontSize: 18 }]}>
              {needsNudge.name}
            </Text>
            <Text style={[APP_STYLES.subtitle, { marginTop: 8 }]}>
              {needsNudge.inactiveDays === null
                ? "No contribution yet. Start this stack to create momentum."
                : needsNudge.inactiveDays === 0
                  ? "Already active today. Keep the streak going."
                  : `${needsNudge.inactiveDays} day${needsNudge.inactiveDays === 1 ? "" : "s"} since the last contribution.`}
            </Text>
            <AnimatedPressable
              onPress={() => navigation.navigate("StackDetail", { stack: needsNudge })}
              style={APP_STYLES.primaryButton}
            >
              <Text style={APP_STYLES.primaryButtonText}>Nudge This Stack</Text>
            </AnimatedPressable>
          </>
        ) : (
          <Text style={APP_STYLES.emptyState}>Once you have an active stack, reminders will point you to the one losing momentum.</Text>
        )}
      </View>

      <View style={APP_STYLES.card}>
        <Text style={APP_STYLES.label}>Invest together</Text>
        {activeInvestingChallenge ? (
          <>
            <Text style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 10, fontSize: 18 }]}>
              {activeInvestingChallenge.name}
            </Text>
            <Text style={[APP_STYLES.subtitle, { marginTop: 8 }]}>
              {getChallengeLabel(activeInvestingChallenge.challenge_key)}
            </Text>
            <Text style={[APP_STYLES.subtitle, { color: COLORS.accent2, marginTop: 8 }]}>
              {Math.round(activeInvestingChallenge.progress * 100)}% of the group goal reached
            </Text>
            <AnimatedPressable
              onPress={() => navigation.navigate("StackDetail", { stack: activeInvestingChallenge })}
              style={APP_STYLES.primaryButton}
            >
              <Text style={APP_STYLES.primaryButtonText}>Open Investing Stack</Text>
            </AnimatedPressable>
          </>
        ) : (
          <Text style={APP_STYLES.emptyState}>Create an investing stack to turn saving momentum into a group investing habit.</Text>
        )}
      </View>

      <View style={APP_STYLES.card}>
        <Text style={APP_STYLES.label}>Public beta</Text>
        <Text style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 10 }]}>
          Trying the web app with friends? Send quick feedback so we can keep tightening the experience.
        </Text>
        <AnimatedPressable onPress={() => openFeedbackEmail("public-beta")} style={APP_STYLES.secondaryButton}>
          <Text style={APP_STYLES.secondaryButtonText}>Send Feedback</Text>
        </AnimatedPressable>
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
                    : item.type === "challenge"
                      ? "Started an investing challenge"
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
