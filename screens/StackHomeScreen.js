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
import { APP_STYLES, COLORS } from "../theme";
import ProgressCircle from "../components/ProgressCircle";
import { getDaysUntil, getNextMilestone, getStackProgress } from "../utils/activity";

export default function HomeScreen({ navigation }) {
  const [stacks, setStacks] = useState([]);
  const [totals, setTotals] = useState({});
  const [name, setName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    const q = query(collection(db, "stacks"), where("members", "array-contains", auth.currentUser.uid));
    return onSnapshot(q, snap => {
      setStacks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, "contributions"), (snap) => {
      const nextTotals = {};

      snap.docs.forEach((docItem) => {
        const item = docItem.data();
        nextTotals[item.stack_id] = (nextTotals[item.stack_id] || 0) + (Number(item.amount) || 0);
      });

      setTotals(nextTotals);
    });
  }, []);

  const createStack = async () => {
    if (!name.trim() || !goalAmount.trim()) return;

    await addDoc(collection(db, "stacks"), {
      name: name.trim(),
      goal_amount: Number(goalAmount),
      deadline: deadline.trim() || "",
      members: [auth.currentUser.uid],
      owner_id: auth.currentUser.uid,
      created_at: Date.now(),
      last_milestone: 0
    });

    setName("");
    setGoalAmount("");
    setDeadline("");
  };

  return (
    <ScreenShell title="Stacks" subtitle="Open a stack and keep the progress moving.">
      <View style={APP_STYLES.heroCard}>
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
        <AnimatedPressable onPress={createStack} style={APP_STYLES.primaryButton}>
          <Text style={APP_STYLES.primaryButtonText}>Create Stack</Text>
        </AnimatedPressable>
      </View>

      {stacks.map((s) => (
        (() => {
          const total = totals[s.id] || 0;
          const progress = getStackProgress(total, s.goal_amount);
          const nextMilestone = getNextMilestone(progress);
          const daysLeft = getDaysUntil(s.deadline);

          return (
        <AnimatedPressable
          key={s.id}
          onPress={() => navigation.navigate("StackDetail", { stack: s })}
          style={[APP_STYLES.card, { flexDirection: "row", alignItems: "center" }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[APP_STYLES.label, { color: COLORS.accent2 }]}>Group stack</Text>
            <Text style={[APP_STYLES.subtitle, { color: COLORS.text, fontSize: 18, marginTop: 10 }]}>
              {s.name}
            </Text>
            <Text style={[APP_STYLES.subtitle, { marginTop: 8 }]}>
              ${total} of ${s.goal_amount || 0}
            </Text>
            {nextMilestone ? (
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
          </View>
          <ProgressCircle progress={progress} size={68} />
        </AnimatedPressable>
          );
        })()
      ))}
      {!stacks.length ? (
        <Text style={APP_STYLES.emptyState}>No stacks yet. When one is created, it will land here.</Text>
      ) : null}
    </ScreenShell>
  );
}
