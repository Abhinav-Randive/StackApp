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
  updateDoc,
  where
} from "firebase/firestore";
import ScreenShell from "../components/ScreenShell";
import AnimatedPressable from "../components/AnimatedPressable";
import { APP_STYLES, COLORS } from "../theme";
import { createNotification, formatActivityLine } from "../utils/activity";

export default function FeedScreen() {
  const [activities, setActivities] = useState([]);
  const [profile, setProfile] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [filter, setFilter] = useState("All");
  const [stackIds, setStackIds] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "activities"), orderBy("timestamp", "desc"));
    return onSnapshot(q, snap => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
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
    return onSnapshot(q, (snap) => {
      setStackIds(snap.docs.map((item) => item.id));
    });
  }, []);

  const toggleLike = async (item) => {
    const hasLiked = (item.likes || []).includes(auth.currentUser.uid);

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
  };

  const submitComment = async (item) => {
    const text = (drafts[item.id] || "").trim();

    if (!text) return;

    const comment = {
      id: `${Date.now()}-${auth.currentUser.uid}`,
      user: profile?.name || auth.currentUser.email?.split("@")[0] || "Someone",
      user_id: auth.currentUser.uid,
      text,
      timestamp: Date.now()
    };

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
  };

  const toggleReaction = async (item, reactionType) => {
    const reactionUsers = item.reactions?.[reactionType] || [];
    const hasReacted = reactionUsers.includes(auth.currentUser.uid);

    await updateDoc(doc(db, "activities", item.id), {
      [`reactions.${reactionType}`]: hasReacted
        ? arrayRemove(auth.currentUser.uid)
        : arrayUnion(auth.currentUser.uid)
    });
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
    <ScreenShell title="Activity" subtitle="See what the community is adding in real time.">
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
          <Text style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 10 }]}>
            {formatActivityLine(item)}
          </Text>
          {item.stack_name ? (
            <Text style={[APP_STYLES.subtitle, { marginTop: 8 }]}>Stack: {item.stack_name}</Text>
          ) : null}

          <View style={[APP_STYLES.row, { marginTop: 14 }]}>
            <AnimatedPressable
              onPress={() => toggleLike(item)}
              style={[APP_STYLES.secondaryButton, { flex: 1, marginTop: 0, marginRight: 8 }]}
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
              >
                <Text style={APP_STYLES.secondaryButtonText}>
                  {reaction === "heart" ? "H" : reaction === "fire" ? "F" : "C"} ({item.reactions?.[reaction]?.length || 0})
                </Text>
              </AnimatedPressable>
            ))}
          </View>

          {(item.comments || []).map((comment) => (
            <View key={comment.id} style={[APP_STYLES.card, { padding: 12, borderRadius: 16 }]}>
              <Text style={[APP_STYLES.label, { color: COLORS.accent }]}>{comment.user}</Text>
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
          <AnimatedPressable onPress={() => submitComment(item)} style={APP_STYLES.primaryButton}>
            <Text style={APP_STYLES.primaryButtonText}>Post Comment</Text>
          </AnimatedPressable>
        </View>
      ))}
      {!filteredActivities.length ? (
        <Text style={APP_STYLES.emptyState}>No activity yet. New contributions will show up here.</Text>
      ) : null}
    </ScreenShell>
  );
}
