import React, { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { auth, db } from "../firebase";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import ScreenShell from "../components/ScreenShell";
import AnimatedPressable from "../components/AnimatedPressable";
import { APP_STYLES, COLORS } from "../theme";
import { createNotification, formatActivityLine, formatCurrency, getInitials } from "../utils/activity";
import { DEMO_ACTIVITIES } from "../utils/demoUsers";
import { sanitizeText } from "../utils/validation";

export default function FeedScreen({ navigation }) {
  const [activities, setActivities] = useState([]);
  const [profile, setProfile] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [filter, setFilter] = useState("All");
  const [stackIds, setStackIds] = useState([]);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query(collection(db, "activities"), orderBy("timestamp", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        setError(err?.message || "Unable to load activity right now.");
      }
    );
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (snap.exists()) {
        setProfile(snap.data());
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "stacks"), where("members", "array-contains", auth.currentUser.uid));
    return onSnapshot(
      q,
      (snap) => {
        setStackIds(snap.docs.map((item) => item.id));
      },
      (err) => {
        setError(err?.message || "Unable to load your stack filter right now.");
      }
    );
  }, []);

  const toggleLike = async (item) => {
    const hasLiked = (item.likes || []).includes(auth.currentUser.uid);
    const actionKey = `like-${item.id}`;
    try {
      setBusyKey(actionKey);
      setError("");
      await updateDoc(doc(db, "activities", item.id), {
        likes: hasLiked ? arrayRemove(auth.currentUser.uid) : arrayUnion(auth.currentUser.uid)
      });

      if (!hasLiked && item.user_id && item.user_id !== auth.currentUser.uid) {
        await createNotification({
          type: "like",
          user: profile?.name || auth.currentUser.email?.split("@")[0] || "Someone",
          userId: auth.currentUser.uid,
          stack: { id: item.stack_id, name: item.stack_name },
          targetUserIds: [item.user_id]
        });
      }
    } catch (err) {
      setError(err?.message || "Unable to update like right now.");
    } finally {
      setBusyKey("");
    }
  };

  const submitComment = async (item) => {
    const text = sanitizeText(drafts[item.id] || "", 220);

    if (!text) {
      setError("Enter a comment before posting.");
      return;
    }

    const comment = {
      id: `${Date.now()}-${auth.currentUser.uid}`,
      user: profile?.name || auth.currentUser.email?.split("@")[0] || "Someone",
      user_id: auth.currentUser.uid,
      text,
      timestamp: Date.now()
    };

    const actionKey = `comment-${item.id}`;
    try {
      setBusyKey(actionKey);
      setError("");
      await updateDoc(doc(db, "activities", item.id), {
        comments: arrayUnion(comment)
      });

      if (item.user_id && item.user_id !== auth.currentUser.uid) {
        await createNotification({
          type: "comment",
          user: comment.user,
          userId: auth.currentUser.uid,
          stack: { id: item.stack_id, name: item.stack_name },
          text,
          targetUserIds: [item.user_id]
        });
      }

      setDrafts((current) => ({ ...current, [item.id]: "" }));
    } catch (err) {
      setError(err?.message || "Unable to post comment right now.");
    } finally {
      setBusyKey("");
    }
  };

  const toggleReaction = async (item, reactionType) => {
    const reactionUsers = item.reactions?.[reactionType] || [];
    const hasReacted = reactionUsers.includes(auth.currentUser.uid);

    const actionKey = `reaction-${reactionType}-${item.id}`;
    try {
      setBusyKey(actionKey);
      setError("");
      await updateDoc(doc(db, "activities", item.id), {
        [`reactions.${reactionType}`]: hasReacted
          ? arrayRemove(auth.currentUser.uid)
          : arrayUnion(auth.currentUser.uid)
      });

      if (!hasReacted && item.user_id && item.user_id !== auth.currentUser.uid) {
        await createNotification({
          type: "reaction",
          user: profile?.name || auth.currentUser.email?.split("@")[0] || "Someone",
          userId: auth.currentUser.uid,
          stack: { id: item.stack_id, name: item.stack_name },
          text: reactionType,
          targetUserIds: [item.user_id]
        });
      }
    } catch (err) {
      setError(err?.message || "Unable to update reaction right now.");
    } finally {
      setBusyKey("");
    }
  };

  const openStack = async (stackId) => {
    if (!stackId) {
      return;
    }

    try {
      const stackSnap = await getDoc(doc(db, "stacks", stackId));
      if (stackSnap.exists()) {
        navigation.navigate("StackDetail", { stack: { id: stackSnap.id, ...stackSnap.data() } });
      }
    } catch (err) {
      setError(err?.message || "Unable to open that stack right now.");
    }
  };

  const seedDemoActivity = async () => {
    try {
      setError("");
      await Promise.all(
        DEMO_ACTIVITIES.map((item, index) => setDoc(doc(db, "activities", item.id), {
          ...item,
          timestamp: Date.now() - index * 1000 * 60 * 22
        }))
      );
    } catch (err) {
      setError(err?.message || "Unable to load demo activity right now.");
    }
  };

  const filteredActivities = activities.filter((item) => {
    if (filter === "Friends") {
      return (profile?.friends || []).includes(item.user_id);
    }

    if (filter === "My Stacks") {
      return stackIds.includes(item.stack_id) || item.user_id === auth.currentUser.uid;
    }

    return true;
  });

  return (
    <ScreenShell
      title="Activity"
      subtitle="See what the community is adding in real time."
      headerAction={(
        <AnimatedPressable
          onPress={seedDemoActivity}
          style={[APP_STYLES.secondaryButton, { marginTop: 0, paddingVertical: 10, paddingHorizontal: 14 }]}
        >
          <Text style={APP_STYLES.secondaryButtonText}>Load Demo</Text>
        </AnimatedPressable>
      )}
    >
      {error ? (
        <Text style={[APP_STYLES.feedbackText, { color: COLORS.danger }]}>{error}</Text>
      ) : null}
      <View style={[APP_STYLES.row, { marginTop: 14 }]}>
        {["All", "My Stacks", "Friends"].map((label) => (
          <AnimatedPressable
            key={label}
            onPress={() => setFilter(label)}
            style={[
              filter === label ? APP_STYLES.primaryButton : APP_STYLES.secondaryButton,
              { flex: 1, marginTop: 0, marginRight: label === "Friends" ? 0 : 8, paddingVertical: 12 }
            ]}
          >
            <Text style={filter === label ? APP_STYLES.primaryButtonText : APP_STYLES.secondaryButtonText}>
              {label}
            </Text>
          </AnimatedPressable>
        ))}
      </View>

      {filteredActivities.map((item) => (
        <View key={item.id} style={APP_STYLES.card}>
          <Text style={[APP_STYLES.label, { color: COLORS.accent2 }]}>Recent contribution</Text>
          <AnimatedPressable
            onPress={() => navigation.navigate("PublicProfile", { userId: item.user_id })}
            style={[APP_STYLES.row, { marginTop: 12, justifyContent: "flex-start" }]}
          >
            <View style={[APP_STYLES.avatar, { width: 42, height: 42, borderRadius: 21 }]}>
              <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: "800" }}>
                {getInitials(item.user)}
              </Text>
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 0, fontSize: 16 }]}>
                {item.user || "Someone"}
              </Text>
              <Text style={[APP_STYLES.subtitle, { marginTop: 2 }]}>
                {item.type === "contribution" ? formatCurrency(item.amount) : item.type}
              </Text>
            </View>
          </AnimatedPressable>
          <Text style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 10 }]}>
            {formatActivityLine(item)}
          </Text>
          {item.stack_name ? (
            <AnimatedPressable
              onPress={() => openStack(item.stack_id)}
              style={[APP_STYLES.secondaryButton, { marginTop: 10, paddingVertical: 10 }]}
            >
              <Text style={APP_STYLES.secondaryButtonText}>Open {item.stack_name}</Text>
            </AnimatedPressable>
          ) : null}
          {item.text ? (
            <View style={[APP_STYLES.card, { marginTop: 12, padding: 14, borderRadius: 16 }]}>
              <Text style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 0 }]}>
                {["\"", item.text, "\""].join("")}
              </Text>
            </View>
          ) : null}

          <View style={[APP_STYLES.row, { marginTop: 14 }]}>
            <AnimatedPressable
              onPress={() => toggleLike(item)}
              style={[APP_STYLES.secondaryButton, { flex: 1, marginTop: 0, marginRight: 8 }]}
              disabled={busyKey === `like-${item.id}`}
            >
              <Text style={APP_STYLES.secondaryButtonText}>
                {(item.likes || []).includes(auth.currentUser.uid) ? "Liked" : "Like"} ({item.likes?.length || 0})
              </Text>
            </AnimatedPressable>
            {["heart", "fire", "clap"].map((reaction) => (
              <AnimatedPressable
                key={reaction}
                onPress={() => toggleReaction(item, reaction)}
                style={[APP_STYLES.secondaryButton, { marginTop: 0, marginRight: reaction === "clap" ? 0 : 8, paddingHorizontal: 12 }]}
              disabled={busyKey === `reaction-${reaction}-${item.id}`}
            >
              <Text style={APP_STYLES.secondaryButtonText}>
                  {reaction === "heart" ? "Love" : reaction === "fire" ? "Fire" : "Cheer"} ({item.reactions?.[reaction]?.length || 0})
              </Text>
            </AnimatedPressable>
          ))}
          </View>

          {(item.comments || []).map((comment, index) => (
            <View key={`${comment.id || "comment"}-${index}`} style={[APP_STYLES.card, { padding: 12, borderRadius: 16 }]}>
              <AnimatedPressable onPress={() => navigation.navigate("PublicProfile", { userId: comment.user_id })}>
                <Text style={[APP_STYLES.label, { color: COLORS.accent }]}>{comment.user}</Text>
              </AnimatedPressable>
              <Text style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 6 }]}>
                {comment.text}
              </Text>
            </View>
          ))}

          <TextInput
            placeholder="Add a comment"
            placeholderTextColor={COLORS.muted}
            value={drafts[item.id] || ""}
            onChangeText={(value) => setDrafts((current) => ({ ...current, [item.id]: value }))}
            style={APP_STYLES.input}
          />
          <AnimatedPressable onPress={() => submitComment(item)} style={APP_STYLES.primaryButton} disabled={busyKey === `comment-${item.id}`}>
            <Text style={APP_STYLES.primaryButtonText}>{busyKey === `comment-${item.id}` ? "Posting..." : "Post Comment"}</Text>
          </AnimatedPressable>
        </View>
      ))}
      {!filteredActivities.length ? (
        <Text style={APP_STYLES.emptyState}>No activity yet. New contributions will show up here.</Text>
      ) : null}
    </ScreenShell>
  );
}
