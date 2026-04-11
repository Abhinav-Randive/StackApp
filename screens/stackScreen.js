import React, { useState, useEffect } from "react";
import { Alert, Text, TextInput, View } from "react-native";
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
  getDaysUntil,
  getLatestMilestone,
  getNextMilestone,
  getStackProgress,
  getTargetUserIds,
  isCompletedStack
} from "../utils/activity";
import { isValidDateInput, parsePositiveAmount, sanitizeText } from "../utils/validation";

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
        deadline: draftDeadline.trim()
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
      Alert.alert("Owner can’t leave", "Delete the stack or remove other members first.");
      return;
    }

    Alert.alert("Leave stack?", "You’ll stop seeing this stack and its updates.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          await updateDoc(doc(db, "stacks", stack.id), {
            members: arrayRemove(auth.currentUser.uid)
          });
          navigation.goBack();
        }
      }
    ]);
  };

  const removeMember = async (memberId) => {
    Alert.alert("Remove member?", "They’ll lose access to this stack.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await updateDoc(doc(db, "stacks", stack.id), {
            members: arrayRemove(memberId)
          });
        }
      }
    ]);
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
    Alert.alert("Delete stack?", "This will remove the stack, contributions, and related activity.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
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
        }
      }
    ]);
  };

  return (
    <ScreenShell
      title={stack.name}
      subtitle={`$${total} saved of $${stack.goal_amount}`}
    >
      <View style={APP_STYLES.heroCard}>
        <View style={{ alignItems: "center" }}>
          <ProgressCircle progress={progress} size={120} label="complete" />
          <Text style={[APP_STYLES.subtitle, { marginTop: 16 }]}>
            {stack.members?.length || 0} members working toward this goal
          </Text>
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
            <AnimatedPressable onPress={saveStack} style={APP_STYLES.primaryButton} disabled={savingStack}>
              <Text style={APP_STYLES.primaryButtonText}>{savingStack ? "Saving..." : "Save Stack"}</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={() => setEditing(false)} style={APP_STYLES.secondaryButton} disabled={savingStack}>
              <Text style={APP_STYLES.secondaryButtonText}>Cancel</Text>
            </AnimatedPressable>
          </>
        ) : (
          <>
            {!completed ? (
              <>
                <Text style={APP_STYLES.label}>Add contribution</Text>

                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Add amount"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numeric"
                  style={APP_STYLES.input}
                />

                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Add a note or reason"
                  placeholderTextColor={COLORS.muted}
                  style={APP_STYLES.input}
                />

                <AnimatedPressable onPress={add} style={APP_STYLES.primaryButton} disabled={savingContribution}>
                  <Text style={APP_STYLES.primaryButtonText}>{savingContribution ? "Saving..." : "Add Contribution"}</Text>
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
