import React, { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { db, auth } from "../firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  where
} from "firebase/firestore";
import ScreenShell from "../components/ScreenShell";
import AnimatedPressable from "../components/AnimatedPressable";
import BrandLogo from "../components/BrandLogo";
import { APP_STYLES, COLORS } from "../theme";
import ProgressCircle from "../components/ProgressCircle";
import { getDaysUntil, getNextMilestone, getStackProgress, isCompletedStack } from "../utils/activity";
import { isValidDateInput, parsePositiveAmount, sanitizeText } from "../utils/validation";

export default function HomeScreen({ navigation, route }) {
  const [stacks, setStacks] = useState([]);
  const [totals, setTotals] = useState({});
  const [name, setName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [search, setSearch] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query(collection(db, "stacks"), where("members", "array-contains", auth.currentUser.uid));
    return onSnapshot(
      q,
      (snap) => {
        setStacks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (err) => {
        setError(err?.message || "Unable to load stacks right now.");
      }
    );
  }, []);

  useEffect(() => {
    const deletedStackId = route?.params?.deletedStackId;

    if (!deletedStackId) return;

    setStacks((current) => current.filter((item) => item.id !== deletedStackId));
    setTotals((current) => {
      const next = { ...current };
      delete next[deletedStackId];
      return next;
    });
  }, [route?.params?.deletedStackId]);

  useEffect(() => {
    return onSnapshot(
      collection(db, "contributions"),
      (snap) => {
        const nextTotals = {};

        snap.docs.forEach((docItem) => {
          const item = docItem.data();
          nextTotals[item.stack_id] = (nextTotals[item.stack_id] || 0) + (Number(item.amount) || 0);
        });

        setTotals(nextTotals);
      },
      (err) => {
        setError(err?.message || "Unable to load stack totals right now.");
      }
    );
  }, []);

  const createStack = async () => {
    const safeName = sanitizeText(name, 60);
    const parsedGoal = parsePositiveAmount(goalAmount);

    if (!safeName) {
      setError("Enter a stack name.");
      return;
    }

    if (!parsedGoal) {
      setError("Enter a valid goal amount greater than 0.");
      return;
    }

    if (!isValidDateInput(deadline.trim())) {
      setError("Deadline must use YYYY-MM-DD.");
      return;
    }

    try {
      setCreating(true);
      setError("");
      await addDoc(collection(db, "stacks"), {
        name: safeName,
        goal_amount: parsedGoal,
        deadline: deadline.trim() || "",
        members: [auth.currentUser.uid],
        admin_ids: [],
        owner_id: auth.currentUser.uid,
        status: "active",
        created_at: Date.now(),
        last_milestone: 0
      });

      setName("");
      setGoalAmount("");
      setDeadline("");
    } catch (err) {
      setError(err?.message || "Unable to create stack right now.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScreenShell title="Stacks" subtitle="Open a stack and keep the progress moving.">
      <View style={APP_STYLES.heroCard}>
        <BrandLogo width={132} height={58} style={{ marginBottom: 10 }} />
        <Text style={APP_STYLES.label}>Create a new stack</Text>
        <TextInput
          placeholder="Stack name"
          placeholderTextColor={COLORS.muted}
          value={name}
          onChangeText={setName}
          style={APP_STYLES.input}
        />
        <TextInput
          placeholder="Goal amount"
          placeholderTextColor={COLORS.muted}
          value={goalAmount}
          onChangeText={setGoalAmount}
          keyboardType="numeric"
          style={APP_STYLES.input}
        />
        <TextInput
          placeholder="Deadline (YYYY-MM-DD)"
          placeholderTextColor={COLORS.muted}
          value={deadline}
          onChangeText={setDeadline}
          style={APP_STYLES.input}
        />
        {error ? (
          <Text style={[APP_STYLES.feedbackText, { color: COLORS.danger }]}>{error}</Text>
        ) : null}
        <AnimatedPressable onPress={createStack} style={APP_STYLES.primaryButton} disabled={creating}>
          <Text style={APP_STYLES.primaryButtonText}>{creating ? "Creating..." : "Create Stack"}</Text>
        </AnimatedPressable>
      </View>

      <View style={[APP_STYLES.row, { marginTop: 14 }]}>
        <AnimatedPressable
          onPress={() => setShowCompleted(false)}
          style={[showCompleted ? APP_STYLES.secondaryButton : APP_STYLES.primaryButton, { flex: 1, marginTop: 0, marginRight: 8 }]}
        >
          <Text style={showCompleted ? APP_STYLES.secondaryButtonText : APP_STYLES.primaryButtonText}>Active</Text>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={() => setShowCompleted(true)}
          style={[showCompleted ? APP_STYLES.primaryButton : APP_STYLES.secondaryButton, { flex: 1, marginTop: 0 }]}
        >
          <Text style={showCompleted ? APP_STYLES.primaryButtonText : APP_STYLES.secondaryButtonText}>Completed</Text>
        </AnimatedPressable>
      </View>

      <TextInput
        placeholder="Search stacks"
        placeholderTextColor={COLORS.muted}
        value={search}
        onChangeText={setSearch}
        style={APP_STYLES.input}
      />

      {stacks
        .filter((s) => {
          const total = totals[s.id] || 0;
          const matchesStatus = showCompleted ? isCompletedStack(s, total) : !isCompletedStack(s, total);
          const matchesSearch = !search.trim()
            || (s.name || "").toLowerCase().includes(search.trim().toLowerCase());
          return matchesStatus && matchesSearch;
        })
        .map((s) => {
          const total = totals[s.id] || 0;
          const progress = getStackProgress(total, s.goal_amount);
          const nextMilestone = getNextMilestone(progress);
          const daysLeft = getDaysUntil(s.deadline);
          const completed = isCompletedStack(s, total);

          return (
            <AnimatedPressable
              key={s.id}
              onPress={() => navigation.navigate("StackDetail", { stack: s })}
              style={[APP_STYLES.card, { flexDirection: "row", alignItems: "center" }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[APP_STYLES.label, { color: completed ? COLORS.accent : COLORS.accent2 }]}>
                  {completed ? "Completed stack" : "Group stack"}
                </Text>
                <Text style={[APP_STYLES.subtitle, { color: COLORS.text, fontSize: 18, marginTop: 10 }]}>
                  {s.name}
                </Text>
                <Text style={[APP_STYLES.subtitle, { marginTop: 8 }]}>
                  ${total} of ${s.goal_amount || 0}
                </Text>
                {completed ? (
                  <Text style={[APP_STYLES.subtitle, { color: COLORS.accent, marginTop: 8 }]}>
                    Finished and archived-ready
                  </Text>
                ) : nextMilestone ? (
                  <Text style={[APP_STYLES.subtitle, { color: COLORS.accent2, marginTop: 8 }]}>
                    Next milestone: {nextMilestone}%
                  </Text>
                ) : (
                  <Text style={[APP_STYLES.subtitle, { color: COLORS.accent, marginTop: 8 }]}>
                    Goal reached
                  </Text>
                )}
                {daysLeft !== null ? (
                  <Text style={[APP_STYLES.subtitle, { marginTop: 6 }]}>
                    {daysLeft >= 0 ? `${daysLeft} days left` : `${Math.abs(daysLeft)} days overdue`}
                  </Text>
                ) : null}
                {!completed && daysLeft !== null && daysLeft <= 3 ? (
                  <Text style={[APP_STYLES.subtitle, { marginTop: 6, color: COLORS.accent }]}>
                    Reminder: this goal is coming up fast.
                  </Text>
                ) : null}
              </View>
              <ProgressCircle progress={completed ? 1 : progress} size={68} />
            </AnimatedPressable>
          );
        })}
      {!stacks.filter((s) => {
        const total = totals[s.id] || 0;
        const matchesStatus = showCompleted ? isCompletedStack(s, total) : !isCompletedStack(s, total);
        const matchesSearch = !search.trim()
          || (s.name || "").toLowerCase().includes(search.trim().toLowerCase());
        return matchesStatus && matchesSearch;
      }).length ? (
        <Text style={APP_STYLES.emptyState}>
          {search.trim() ? "No stacks match that search yet." : "No stacks yet. When one is created, it will land here."}
        </Text>
      ) : null}
    </ScreenShell>
  );
}
