import React, { useState, useEffect } from "react";
import { Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db, auth } from "../firebase";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where
} from "firebase/firestore";
import ScreenShell from "../components/ScreenShell";
import AnimatedPressable from "../components/AnimatedPressable";
import { APP_STYLES, COLORS } from "../theme";
import ProgressCircle from "../components/ProgressCircle";
import {
  createActivity,
  createNotification,
  buildShareMessage,
  getChallengeDescription,
  getChallengeLabel,
  getDaysUntil,
  getLatestMilestone,
  getNextMilestone,
  getProjectedValue,
  getStackProgress,
  getStackTypeLabel,
  getTargetUserIds,
  INVESTING_CHALLENGES,
  INVESTING_RISK_LEVELS,
  STACK_TYPES,
  isCompletedStack
} from "../utils/activity";
import { isValidDateInput, parsePositiveAmount, sanitizeText } from "../utils/validation";
import { confirmAction } from "../utils/platform";

export default function StackScreen({ route, navigation }) {
  const { stack: initialStack } = route.params;
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [data, setData] = useState([]);
  const [profile, setProfile] = useState(null);
  const [stack, setStack] = useState(initialStack);
  const [members, setMembers] = useState([]);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(initialStack.name || "");
  const [draftGoal, setDraftGoal] = useState(String(initialStack.goal_amount || ""));
  const [draftDeadline, setDraftDeadline] = useState(initialStack.deadline || "");
  const [draftStackType, setDraftStackType] = useState(initialStack.stack_type || STACK_TYPES.SAVINGS);
  const [draftRiskLevel, setDraftRiskLevel] = useState(initialStack.risk_level || "Balanced");
  const [draftChallengeKey, setDraftChallengeKey] = useState(initialStack.challenge_key || "consistency");
  const [savingContribution, setSavingContribution] = useState(false);
  const [savingStack, setSavingStack] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "stacks", initialStack.id), async (snap) => {
      if (!snap.exists()) {
        navigation.goBack();
        return;
      }

      const nextStack = { id: snap.id, ...snap.data() };
      setStack(nextStack);
      setDraftName(nextStack.name || "");
      setDraftGoal(String(nextStack.goal_amount || ""));
      setDraftDeadline(nextStack.deadline || "");
      setDraftStackType(nextStack.stack_type || STACK_TYPES.SAVINGS);
      setDraftRiskLevel(nextStack.risk_level || "Balanced");
      setDraftChallengeKey(nextStack.challenge_key || "consistency");

      const memberProfiles = await Promise.all(
        (nextStack.members || []).map(async (memberId) => {
          const memberSnap = await getDoc(doc(db, "users", memberId));
          return { id: memberId, ...(memberSnap.data() || {}) };
        })
      );
      setMembers(memberProfiles);
    });

    return unsubscribe;
  }, [initialStack.id, navigation]);

  useEffect(() => {
    const q = query(collection(db, "contributions"), where("stack_id", "==", initialStack.id));
    return onSnapshot(q, snap => {
      setData(snap.docs.map(d => d.data()));
    });
  }, [initialStack.id]);

  useEffect(() => {
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (snap.exists()) {
        setProfile(snap.data());
      }
    };

    fetchProfile();
  }, []);

  const total = data.reduce((s, c) => s + c.amount, 0);
  const progress = getStackProgress(total, stack.goal_amount);
  const latestMilestone = getLatestMilestone(progress);
  const nextMilestone = getNextMilestone(progress);
  const daysLeft = getDaysUntil(stack.deadline);
  const completed = isCompletedStack(stack, total);

  const add = async () => {
    const parsedAmount = parsePositiveAmount(amount);
    if (!parsedAmount) {
      setError("Enter a valid contribution greater than 0.");
      return;
    }

    try {
      setSavingContribution(true);
      setError("");
      await addDoc(collection(db, "contributions"), {
        user_id: auth.currentUser.uid,
        stack_id: stack.id,
        amount: parsedAmount,
        note: sanitizeText(note, 120),
        timestamp: Date.now()
      });

      await createActivity({
        type: "contribution",
        user: profile?.name || auth.currentUser.email?.split("@")[0] || "Someone",
        userId: auth.currentUser.uid,
        stack,
        amount: parsedAmount,
        text: sanitizeText(note, 120),
        targetUserIds: getTargetUserIds(stack, auth.currentUser.uid)
      });

      await createNotification({
        type: "contribution",
        user: profile?.name || auth.currentUser.email?.split("@")[0] || "Someone",
        userId: auth.currentUser.uid,
        stack,
        amount: parsedAmount,
        text: sanitizeText(note, 120),
        targetUserIds: getTargetUserIds(stack, auth.currentUser.uid),
      });

      const nextProgress = getStackProgress(total + parsedAmount, stack.goal_amount);
      const reachedMilestone = getLatestMilestone(nextProgress);

      if (reachedMilestone > (stack.last_milestone || 0)) {
        await updateDoc(doc(db, "stacks", stack.id), {
          last_milestone: reachedMilestone
        });

        await createActivity({
          type: "milestone",
          user: profile?.name || auth.currentUser.email?.split("@")[0] || "Someone",
          userId: auth.currentUser.uid,
          stack,
          targetUserIds: getTargetUserIds(stack, auth.currentUser.uid),
          metadata: { milestone: reachedMilestone }
        });

        await createNotification({
          type: "milestone",
          user: profile?.name || auth.currentUser.email?.split("@")[0] || "Someone",
          userId: auth.currentUser.uid,
          stack,
          targetUserIds: getTargetUserIds(stack, auth.currentUser.uid),
          metadata: { milestone: reachedMilestone }
        });
      }

      if (!isCompletedStack(stack, total) && getStackProgress(total + parsedAmount, stack.goal_amount) >= 1) {
        const completedAt = Date.now();
        const completedMessage = buildShareMessage(stack, total + parsedAmount, members.length || stack.members?.length || 1);

        await updateDoc(doc(db, "stacks", stack.id), {
          status: "completed",
          completed_at: completedAt,
          completed_message: completedMessage
        });

        navigation.navigate("CompletedStack", {
          stack: {
            ...stack,
            status: "completed",
            completed_at: completedAt,
            completed_message: completedMessage
          },
          total: total + parsedAmount,
          members
        });
      }

      setAmount("");
      setNote("");
    } catch (err) {
      setError(err?.message || "Unable to save contribution right now.");
    } finally {
      setSavingContribution(false);
    }
  };

  const archiveStack = async () => {
    try {
      setArchiving(true);
      setError("");
      await updateDoc(doc(db, "stacks", stack.id), {
        archived_at: Date.now(),
        status: "completed"
      });
    } catch (err) {
      setError(err?.message || "Unable to archive this stack right now.");
    } finally {
      setArchiving(false);
    }
  };

  const saveStack = async () => {
    const safeName = sanitizeText(draftName, 60);
    const parsedGoal = parsePositiveAmount(draftGoal);

    if (!safeName) {
      setError("Enter a stack name.");
      return;
    }

    if (!parsedGoal) {
      setError("Enter a valid goal amount greater than 0.");
      return;
    }

    if (!isValidDateInput(draftDeadline.trim())) {
      setError("Deadline must use YYYY-MM-DD.");
      return;
    }

    try {
      setSavingStack(true);
      setError("");
      await updateDoc(doc(db, "stacks", stack.id), {
        name: safeName,
        goal_amount: parsedGoal,
        deadline: draftDeadline.trim(),
        stack_type: draftStackType,
        risk_level: draftStackType === STACK_TYPES.INVESTING ? draftRiskLevel : "",
        challenge_key: draftStackType === STACK_TYPES.INVESTING ? draftChallengeKey : ""
      });
      setEditing(false);
    } catch (err) {
      setError(err?.message || "Unable to save stack changes right now.");
    } finally {
      setSavingStack(false);
    }
  };

  const leaveStack = async () => {
    if (stack.owner_id === auth.currentUser.uid) {
      setError("Owners can’t leave their own stack. Delete it or remove other members first.");
      return;
    }

    const confirmed = await confirmAction("Leave stack?", "You’ll stop seeing this stack and its updates.");
    if (!confirmed) {
      return;
    }

    await updateDoc(doc(db, "stacks", stack.id), {
      members: arrayRemove(auth.currentUser.uid)
    });
    navigation.goBack();
  };

  const removeMember = async (memberId) => {
    const confirmed = await confirmAction("Remove member?", "They’ll lose access to this stack.");
    if (!confirmed) {
      return;
    }

    await updateDoc(doc(db, "stacks", stack.id), {
      members: arrayRemove(memberId)
    });
  };

  const toggleAdmin = async (memberId, shouldPromote) => {
    try {
      setError("");
      await updateDoc(doc(db, "stacks", stack.id), {
        admin_ids: shouldPromote ? arrayUnion(memberId) : arrayRemove(memberId)
      });
    } catch (err) {
      setError(err?.message || "Unable to update this member right now.");
    }
  };

  const removeStack = async () => {
    const confirmed = await confirmAction(
      "Delete stack?",
      "This will remove the stack, contributions, and related activity."
    );
    if (!confirmed) {
      return;
    }

    try {
      setError("");
      const contributionSnapshot = await getDocs(
        query(collection(db, "contributions"), where("stack_id", "==", stack.id))
      );
      const activitySnapshot = await getDocs(
        query(collection(db, "activities"), where("stack_id", "==", stack.id))
      );
      const notificationSnapshot = await getDocs(
        query(collection(db, "notifications"), where("stack_id", "==", stack.id))
      );

      await Promise.all([
        ...contributionSnapshot.docs.map((item) => deleteDoc(item.ref)),
        ...activitySnapshot.docs.map((item) => deleteDoc(item.ref)),
        ...notificationSnapshot.docs.map((item) => deleteDoc(item.ref))
      ]);

      await deleteDoc(doc(db, "stacks", stack.id));
      navigation.navigate("Main", {
        screen: "Stacks",
        params: {
          deletedStackId: stack.id,
          deletedAt: Date.now()
        }
      });
    } catch (err) {
      setError(err?.message || "Unable to delete this stack right now.");
    }
  };

  return (
    <ScreenShell
      title={stack.name}
      subtitle={`$${total} saved of $${stack.goal_amount}`}
      headerAction={(
        <AnimatedPressable
          onPress={() => navigation.goBack()}
          style={[APP_STYLES.secondaryButton, { marginTop: 0, paddingVertical: 10, paddingHorizontal: 14, flexDirection: "row" }]}
        >
          <Ionicons name="chevron-back" size={18} color={COLORS.accent2} style={{ marginRight: 6 }} />
          <Text style={APP_STYLES.secondaryButtonText}>Back</Text>
        </AnimatedPressable>
      )}
    >
      <View style={APP_STYLES.heroCard}>
        <View style={{ alignItems: "center" }}>
          <ProgressCircle progress={progress} size={120} label="complete" />
          <Text style={[APP_STYLES.label, { color: COLORS.accent2, marginTop: 16 }]}>
            {getStackTypeLabel(stack.stack_type)}
          </Text>
          <Text style={[APP_STYLES.subtitle, { marginTop: 16 }]}>
            {stack.members?.length || 0} members working toward this goal
          </Text>
          {stack.stack_type === STACK_TYPES.INVESTING ? (
            <>
              <Text style={[APP_STYLES.subtitle, { color: COLORS.accent2, marginTop: 8 }]}>
                {stack.risk_level || "Balanced"} profile
              </Text>
              <Text style={[APP_STYLES.subtitle, { marginTop: 8 }]}>
                {getChallengeLabel(stack.challenge_key)}
              </Text>
              <Text style={[APP_STYLES.subtitle, { color: COLORS.accent, marginTop: 8 }]}>
                1 year projection: ${getProjectedValue(total, stack.risk_level, 12)}
              </Text>
            </>
          ) : null}
          {completed ? (
            <Text style={[APP_STYLES.subtitle, { color: COLORS.accent, marginTop: 8 }]}>
              This stack is complete.
            </Text>
          ) : nextMilestone ? (
            <Text style={[APP_STYLES.subtitle, { color: COLORS.accent2, marginTop: 8 }]}>
              Next milestone: {nextMilestone}%
            </Text>
          ) : (
            <Text style={[APP_STYLES.subtitle, { color: COLORS.accent, marginTop: 8 }]}>
              Goal complete
            </Text>
          )}
          {latestMilestone > 0 ? (
            <Text style={[APP_STYLES.subtitle, { color: COLORS.accent, marginTop: 8 }]}>
              Celebration unlocked at {latestMilestone}%
            </Text>
          ) : null}
          {daysLeft !== null ? (
            <Text style={[APP_STYLES.subtitle, { marginTop: 8 }]}>
              {daysLeft >= 0 ? `${daysLeft} days until deadline` : `${Math.abs(daysLeft)} days past deadline`}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={APP_STYLES.card}>
        {error ? (
          <Text style={[APP_STYLES.feedbackText, { color: COLORS.danger }]}>{error}</Text>
        ) : null}
        {editing ? (
          <>
            <Text style={APP_STYLES.label}>Edit stack</Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Stack name"
              placeholderTextColor={COLORS.muted}
              style={APP_STYLES.input}
            />
            <TextInput
              value={draftGoal}
              onChangeText={setDraftGoal}
              placeholder="Goal amount"
              placeholderTextColor={COLORS.muted}
              keyboardType="numeric"
              style={APP_STYLES.input}
            />
            <TextInput
              value={draftDeadline}
              onChangeText={setDraftDeadline}
              placeholder="Deadline (YYYY-MM-DD)"
              placeholderTextColor={COLORS.muted}
              style={APP_STYLES.input}
            />
            <View style={[APP_STYLES.row, { marginTop: 14 }]}>
              {[STACK_TYPES.SAVINGS, STACK_TYPES.INVESTING].map((type) => (
                <AnimatedPressable
                  key={type}
                  onPress={() => setDraftStackType(type)}
                  style={[
                    draftStackType === type ? APP_STYLES.primaryButton : APP_STYLES.secondaryButton,
                    { flex: 1, marginTop: 0, marginRight: type === STACK_TYPES.SAVINGS ? 8 : 0, paddingVertical: 12 }
                  ]}
                >
                  <Text style={draftStackType === type ? APP_STYLES.primaryButtonText : APP_STYLES.secondaryButtonText}>
                    {getStackTypeLabel(type)}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
            {draftStackType === STACK_TYPES.INVESTING ? (
              <>
                <Text style={[APP_STYLES.label, { marginTop: 14 }]}>Risk profile</Text>
                <View style={[APP_STYLES.row, { marginTop: 10, flexWrap: "wrap", alignItems: "flex-start" }]}>
                  {INVESTING_RISK_LEVELS.map((level) => (
                    <AnimatedPressable
                      key={level}
                      onPress={() => setDraftRiskLevel(level)}
                      style={[
                        draftRiskLevel === level ? APP_STYLES.primaryButton : APP_STYLES.secondaryButton,
                        { marginTop: 0, marginRight: 8, marginBottom: 8, paddingVertical: 10, paddingHorizontal: 14 }
                      ]}
                    >
                      <Text style={draftRiskLevel === level ? APP_STYLES.primaryButtonText : APP_STYLES.secondaryButtonText}>
                        {level}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </View>
                <Text style={[APP_STYLES.label, { marginTop: 6 }]}>Social challenge</Text>
                {Object.values(INVESTING_CHALLENGES).map((challenge) => (
                  <AnimatedPressable
                    key={challenge.key}
                    onPress={() => setDraftChallengeKey(challenge.key)}
                    style={[
                      draftChallengeKey === challenge.key ? APP_STYLES.primaryButton : APP_STYLES.secondaryButton,
                      { marginTop: 10, alignItems: "flex-start" }
                    ]}
                  >
                    <Text style={draftChallengeKey === challenge.key ? APP_STYLES.primaryButtonText : APP_STYLES.secondaryButtonText}>
                      {challenge.label}
                    </Text>
                    <Text
                      style={[
                        APP_STYLES.subtitle,
                        { marginTop: 6, color: draftChallengeKey === challenge.key ? "#1C1020" : COLORS.subtext }
                      ]}
                    >
                      {challenge.description}
                    </Text>
                  </AnimatedPressable>
                ))}
              </>
            ) : null}
            <AnimatedPressable onPress={saveStack} style={APP_STYLES.primaryButton} disabled={savingStack}>
              <Text style={APP_STYLES.primaryButtonText}>{savingStack ? "Saving..." : "Save Stack"}</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={() => setEditing(false)} style={APP_STYLES.secondaryButton} disabled={savingStack}>
              <Text style={APP_STYLES.secondaryButtonText}>Cancel</Text>
            </AnimatedPressable>
          </>
        ) : (
          <>
            {stack.stack_type === STACK_TYPES.INVESTING ? (
              <View style={[APP_STYLES.card, { marginTop: 0, marginBottom: 12, borderRadius: 18, padding: 14 }]}>
                <Text style={APP_STYLES.label}>Investing setup</Text>
                <Text style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 10 }]}>
                  {stack.risk_level || "Balanced"} risk profile
                </Text>
                <Text style={[APP_STYLES.subtitle, { marginTop: 6 }]}>
                  {getChallengeLabel(stack.challenge_key)}
                </Text>
                <Text style={[APP_STYLES.subtitle, { marginTop: 6, color: COLORS.accent2 }]}>
                  {getChallengeDescription(stack.challenge_key)}
                </Text>
              </View>
            ) : null}
            {!completed ? (
              <>
                <Text style={APP_STYLES.label}>Add contribution</Text>

                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder={stack.stack_type === STACK_TYPES.INVESTING ? "Add investing amount" : "Add amount"}
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numeric"
                  style={APP_STYLES.input}
                />

                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder={stack.stack_type === STACK_TYPES.INVESTING ? "Why are you investing today?" : "Add a note or reason"}
                  placeholderTextColor={COLORS.muted}
                  style={APP_STYLES.input}
                />

                <AnimatedPressable onPress={add} style={APP_STYLES.primaryButton} disabled={savingContribution}>
                  <Text style={APP_STYLES.primaryButtonText}>
                    {savingContribution
                      ? "Saving..."
                      : stack.stack_type === STACK_TYPES.INVESTING
                        ? "Add to Investing Goal"
                        : "Add Contribution"}
                  </Text>
                </AnimatedPressable>

                <AnimatedPressable
                  onPress={() => navigation.navigate("Invite", { stack })}
                  style={APP_STYLES.secondaryButton}
                  disabled={savingContribution}
                >
                  <Text style={APP_STYLES.secondaryButtonText}>Invite Friends</Text>
                </AnimatedPressable>
              </>
            ) : (
              <>
                <Text style={APP_STYLES.label}>Completed</Text>
                <Text style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 10 }]}>
                  This stack is done. You can review it, share the win, or archive it.
                </Text>
                <AnimatedPressable
                  onPress={() => navigation.navigate("CompletedStack", { stack, total, members })}
                  style={APP_STYLES.primaryButton}
                >
                  <Text style={APP_STYLES.primaryButtonText}>Open Celebration</Text>
                </AnimatedPressable>
                <AnimatedPressable onPress={archiveStack} style={APP_STYLES.secondaryButton} disabled={archiving}>
                  <Text style={APP_STYLES.secondaryButtonText}>
                    {stack.archived_at ? "Archived" : archiving ? "Archiving..." : "Archive Stack"}
                  </Text>
                </AnimatedPressable>
              </>
            )}
          </>
        )}

        {stack.owner_id === auth.currentUser.uid ? (
          <>
            {!editing ? (
              <AnimatedPressable onPress={() => setEditing(true)} style={APP_STYLES.secondaryButton}>
                <Text style={APP_STYLES.secondaryButtonText}>Edit Stack</Text>
              </AnimatedPressable>
            ) : null}
            <AnimatedPressable onPress={removeStack} style={APP_STYLES.dangerButton}>
              <Text style={APP_STYLES.dangerButtonText}>Delete Stack</Text>
            </AnimatedPressable>
          </>
        ) : (
          <AnimatedPressable onPress={leaveStack} style={APP_STYLES.dangerButton}>
            <Text style={APP_STYLES.dangerButtonText}>Leave Stack</Text>
          </AnimatedPressable>
        )}
      </View>

      <View style={APP_STYLES.card}>
        <Text style={APP_STYLES.label}>Members</Text>
        {members.map((member) => (
          <View
            key={member.id}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}
          >
            <View>
              <Text style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 0 }]}>
                {member.name || member.email}
              </Text>
              <Text style={[APP_STYLES.subtitle, { marginTop: 4 }]}>
                {member.id === stack.owner_id ? "Owner" : (stack.admin_ids || []).includes(member.id) ? "Admin" : "Member"}
              </Text>
            </View>
            <View style={[APP_STYLES.row, { marginLeft: 12 }]}>
              {stack.owner_id === auth.currentUser.uid && member.id !== auth.currentUser.uid ? (
                <AnimatedPressable
                  onPress={() => toggleAdmin(member.id, !(stack.admin_ids || []).includes(member.id))}
                  style={[APP_STYLES.secondaryButton, { marginTop: 0, paddingVertical: 10, paddingHorizontal: 14, marginRight: 8 }]}
                >
                  <Text style={APP_STYLES.secondaryButtonText}>
                    {(stack.admin_ids || []).includes(member.id) ? "Remove Admin" : "Make Admin"}
                  </Text>
                </AnimatedPressable>
              ) : null}
              {stack.owner_id === auth.currentUser.uid && member.id !== auth.currentUser.uid ? (
                <AnimatedPressable
                  onPress={() => removeMember(member.id)}
                  style={[APP_STYLES.dangerButton, { marginTop: 0, paddingVertical: 10, paddingHorizontal: 14 }]}
                >
                  <Text style={APP_STYLES.dangerButtonText}>Remove</Text>
                </AnimatedPressable>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      {!!data.length && (
        <View style={APP_STYLES.card}>
          <Text style={APP_STYLES.label}>Recent contributions</Text>
          {data
            .slice()
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5)
            .map((item, index) => (
              <View key={`${item.timestamp}-${index}`} style={{ marginTop: 10 }}>
                <Text style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 0 }]}>
                  ${item.amount}
                </Text>
                {item.note ? (
                  <Text style={[APP_STYLES.subtitle, { marginTop: 4 }]}>
                    {item.note}
                  </Text>
                ) : null}
              </View>
            ))}
        </View>
      )}
    </ScreenShell>
  );
}
