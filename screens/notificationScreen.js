import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebase";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc
} from "firebase/firestore";
import ScreenShell from "../components/ScreenShell";
import AnimatedPressable from "../components/AnimatedPressable";
import { APP_STYLES, COLORS } from "../theme";
import { formatNotificationLine } from "../utils/activity";

export default function NotificationScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query(collection(db, "notifications"), orderBy("timestamp", "desc"));
    return onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((item) => (item.target_user_ids || []).includes(auth.currentUser.uid))
        );
      },
      (err) => {
        setError(err?.message || "Unable to load notifications right now.");
      }
    );
  }, []);

  const markAsRead = async (itemId) => {
    await updateDoc(doc(db, "notifications", itemId), {
      read_by: arrayUnion(auth.currentUser.uid)
    });
  };

  const openNotification = async (item) => {
    await markAsRead(item.id);

    if (item.stack_id) {
      const stackSnap = await getDoc(doc(db, "stacks", item.stack_id));
      if (stackSnap.exists()) {
        navigation.navigate("StackDetail", {
          stack: { id: stackSnap.id, ...stackSnap.data() }
        });
      }
    }
  };

  const markAllAsRead = async () => {
    await Promise.all(
      items
        .filter((item) => !(item.read_by || []).includes(auth.currentUser.uid))
        .map((item) =>
          updateDoc(doc(db, "notifications", item.id), {
            read_by: arrayUnion(auth.currentUser.uid)
          })
        )
    );
  };

  const unreadCount = items.filter((item) => !(item.read_by || []).includes(auth.currentUser.uid)).length;

  return (
    <ScreenShell
      title="Notifications"
      subtitle={unreadCount ? `${unreadCount} unread updates` : "You’re all caught up."}
      headerAction={(
        <AnimatedPressable
          onPress={markAllAsRead}
          style={[APP_STYLES.secondaryButton, { marginTop: 0, paddingVertical: 10, paddingHorizontal: 14 }]}
        >
          <Text style={APP_STYLES.secondaryButtonText}>Read all</Text>
        </AnimatedPressable>
      )}
    >
      {error ? (
        <Text style={[APP_STYLES.feedbackText, { color: COLORS.danger }]}>{error}</Text>
      ) : null}
      {items.map((item) => (
        <AnimatedPressable
          key={item.id}
          onPress={() => openNotification(item)}
          style={[
            APP_STYLES.card,
            APP_STYLES.row,
            !(item.read_by || []).includes(auth.currentUser.uid) ? { borderColor: COLORS.accent2 } : null
          ]}
        >
          <Ionicons name="notifications-outline" size={18} color={COLORS.accent} />
          <Text style={{ color: COLORS.text, marginLeft: 10, flex: 1 }}>
            {formatNotificationLine(item)}
          </Text>
          {!(item.read_by || []).includes(auth.currentUser.uid) ? (
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.accent2 }} />
          ) : null}
        </AnimatedPressable>
      ))}
      {!items.length ? (
        <Text style={APP_STYLES.emptyState}>No notifications yet. Activity updates will land here.</Text>
      ) : null}
    </ScreenShell>
  );
}
