import React, { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { db, auth } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where
} from "firebase/firestore";
import ScreenShell from "../components/ScreenShell";
import AnimatedPressable from "../components/AnimatedPressable";
import BrandLogo from "../components/BrandLogo";
import { APP_STYLES, COLORS } from "../theme";
import ProgressCircle from "../components/ProgressCircle";
import {
  createActivity,
  getChallengeLabel,
  getDaysUntil,
  getNextMilestone,
  getProjectedValue,
  getStackProgress,
  getStackTypeLabel,
  INVESTING_CHALLENGES,
  INVESTING_RISK_LEVELS,
  STACK_TYPES,
  isCompletedStack
} from "../utils/activity";
import { isValidDateInput, parsePositiveAmount, sanitizeText } from "../utils/validation";

export default function HomeScreen({ navigation, route }) {
  const [stacks, setStacks] = useState([]);
  const [totals, setTotals] = useState({});
  const [name, setName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [stackType, setStackType] = useState(STACK_TYPES.SAVINGS);
  const [riskLevel, setRiskLevel] = useState("Balanced");
  const [challengeKey, setChallengeKey] = useState("consistency");
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
      const createdStack = await addDoc(collection(db, "stacks"), {
        name: safeName,
        goal_amount: parsedGoal,
        deadline: deadline.trim() || "",
        members: [auth.currentUser.uid],
        admin_ids: [],
        owner_id: auth.currentUser.uid,
        stack_type: stackType,
        risk_level: stackType === STACK_TYPES.INVESTING ? riskLevel : "",
        challenge_key: stackType === STACK_TYPES.INVESTING ? challengeKey : "",
        status: "active",
        created_at: Date.now(),
        last_milestone: 0
      });

      if (stackType === STACK_TYPES.INVESTING) {
        const profileSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        await createActivity({
          type: "challenge",
          user: profileSnap.data()?.name || auth.currentUser.email?.split("@")[0] || "Someone",
          userId: auth.currentUser.uid,
          stack: {
            id: createdStack.id,
            name: safeName,
            stack_type: stackType,
            risk_level: riskLevel,
            challenge_key: challengeKey
          },
          metadata: {
            challenge: challengeKey,
            risk_level: riskLevel
          }
        });
      }

      setName("");
      setGoalAmount("");
      setDeadline("");
      setStackType(STACK_TYPES.SAVINGS);
      setRiskLevel("Balanced");
      setChallengeKey("consistency");
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
        <View style={[APP_STYLES.row, { marginTop: 14 }]}>
          {[STACK_TYPES.SAVINGS, STACK_TYPES.INVESTING].map((type) => (
            <AnimatedPressable
              key={type}
              onPress={() => setStackType(type)}
              style={[
                stackType === type ? APP_STYLES.primaryButton : APP_STYLES.secondaryButton,
                { flex: 1, marginTop: 0, marginRight: type === STACK_TYPES.SAVINGS ? 8 : 0, paddingVertical: 12 }
              ]}
            >
              <Text style={stackType === type ? APP_STYLES.primaryButtonText : APP_STYLES.secondaryButtonText}>
                {getStackTypeLabel(type)}
              </Text>
            </AnimatedPressable>
          ))}
        </View>
        {stackType === STACK_TYPES.INVESTING ? (
          <>
            <Text style={[APP_STYLES.label, { marginTop: 16 }]}>Risk profile</Text>
            <View style={[APP_STYLES.row, { marginTop: 10, flexWrap: "wrap", alignItems: "flex-start" }]}>
              {INVESTING_RISK_LEVELS.map((level) => (
                <AnimatedPressable
                  key={level}
                  onPress={() => setRiskLevel(level)}
                  style={[
                    riskLevel === level ? APP_STYLES.primaryButton : APP_STYLES.secondaryButton,
                    { marginTop: 0, marginRight: 8, marginBottom: 8, paddingVertical: 10, paddingHorizontal: 14 }
                  ]}
                >
                  <Text style={riskLevel === level ? APP_STYLES.primaryButtonText : APP_STYLES.secondaryButtonText}>
                    {level}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
            <Text style={[APP_STYLES.label, { marginTop: 8 }]}>Social challenge</Text>
            {Object.values(INVESTING_CHALLENGES).map((challenge) => (
              <AnimatedPressable
                key={challenge.key}
                onPress={() => setChallengeKey(challenge.key)}
                style={[
                  challengeKey === challenge.key ? APP_STYLES.primaryButton : APP_STYLES.secondaryButton,
                  { marginTop: 10, alignItems: "flex-start" }
                ]}
              >
                <Text style={challengeKey === challenge.key ? APP_STYLES.primaryButtonText : APP_STYLES.secondaryButtonText}>
                  {challenge.label}
                </Text>
                <Text
                  style={[
                    APP_STYLES.subtitle,
                    {
                      marginTop: 6,
                      color: challengeKey === challenge.key ? "#1C1020" : COLORS.subtext
                    }
                  ]}
                >
                  {challenge.description}
                </Text>
              </AnimatedPressable>
            ))}
          </>
        ) : null}
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
                  {completed ? "Completed stack" : `${getStackTypeLabel(s.stack_type)} stack`}
                </Text>
                <Text style={[APP_STYLES.subtitle, { color: COLORS.text, fontSize: 18, marginTop: 10 }]}>
                  {s.name}
                </Text>
                <Text style={[APP_STYLES.subtitle, { marginTop: 8 }]}>
                  ${total} of ${s.goal_amount || 0}
                </Text>
                {s.stack_type === STACK_TYPES.INVESTING ? (
                  <>
                    <Text style={[APP_STYLES.subtitle, { color: COLORS.accent2, marginTop: 8 }]}>
                      {s.risk_level || "Balanced"} profile
                    </Text>
                    <Text style={[APP_STYLES.subtitle, { marginTop: 6 }]}>
                      {getChallengeLabel(s.challenge_key)}
                    </Text>
                    <Text style={[APP_STYLES.subtitle, { color: COLORS.accent, marginTop: 6 }]}>
                      12m projection: ${getProjectedValue(total, s.risk_level, 12)}
                    </Text>
                  </>
                ) : null}
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
