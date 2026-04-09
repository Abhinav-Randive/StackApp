import React, { useEffect, useState } from "react";
import {
  Text,
  TouchableOpacity
} from "react-native";
import { db, auth } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion
} from "firebase/firestore";
import ScreenShell from "../components/ScreenShell";
import { APP_STYLES, COLORS } from "../theme";

export default function InviteScreen({ route, navigation }) {
  const { stack } = route.params;
  const [friends, setFriends] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchFriends = async () => {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const friendIds = userDoc.data()?.friends || [];

      const friendData = await Promise.all(
        friendIds.map(async (id) => {
          const docSnap = await getDoc(doc(db, "users", id));
          return { id, ...docSnap.data() };
        })
      );

      setFriends(friendData);
    };

    fetchFriends();
  }, []);

  const invite = async (friendId) => {
    try {
      setBusyId(friendId);
      setError("");
      await updateDoc(doc(db, "stacks", stack.id), {
        members: arrayUnion(friendId)
      });

      navigation.goBack();
    } catch (err) {
      setError(err?.message || "Unable to invite friend right now.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <ScreenShell
      title="Invite Friends"
      subtitle={`Add people to ${stack.name} with the same shared look and feel.`}
      headerAction={(
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingLeft: 16 }}>
          <Text style={{ color: COLORS.accent2, fontWeight: "700" }}>Back</Text>
        </TouchableOpacity>
      )}
    >
      {error ? (
        <Text style={[APP_STYLES.feedbackText, { color: COLORS.danger }]}>{error}</Text>
      ) : null}
      {friends.map((friend) => (
        <TouchableOpacity
          key={friend.id}
          onPress={() => invite(friend.id)}
          style={[APP_STYLES.card, busyId === friend.id ? { opacity: 0.55 } : null]}
          disabled={!!busyId}
        >
          <Text style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 0 }]}>
            {busyId === friend.id ? "Inviting..." : friend.email}
          </Text>
        </TouchableOpacity>
      ))}
      {!friends.length ? (
        <Text style={APP_STYLES.emptyState}>Add friends first, then they will show up here to invite.</Text>
      ) : null}
    </ScreenShell>
  );
}
