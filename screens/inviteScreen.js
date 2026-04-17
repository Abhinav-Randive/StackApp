import React, { useEffect, useState } from "react";
import {
  Text,
  TextInput,
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
  const [search, setSearch] = useState("");
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

  const filteredFriends = friends.filter((friend) => {
    const queryValue = search.trim().toLowerCase();
    if (!queryValue) {
      return true;
    }

    return `${friend.name || ""} ${friend.email || ""}`.toLowerCase().includes(queryValue);
  });

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

      <TextInput
        placeholder="Search friends to invite"
        placeholderTextColor={COLORS.muted}
        value={search}
        onChangeText={setSearch}
        style={APP_STYLES.input}
      />

      {filteredFriends.map((friend) => {
        const alreadyInStack = (stack.members || []).includes(friend.id);

        return (
        <TouchableOpacity
          key={friend.id}
          onPress={() => (alreadyInStack ? null : invite(friend.id))}
          style={[
            APP_STYLES.card,
            busyId === friend.id ? { opacity: 0.55 } : null,
            alreadyInStack ? { borderColor: COLORS.accent2 } : null
          ]}
          disabled={!!busyId || alreadyInStack}
        >
          <Text style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 0 }]}>
            {friend.name || friend.email}
          </Text>
          <Text style={[APP_STYLES.subtitle, { marginTop: 6 }]}>
            {alreadyInStack ? "Already in this stack" : busyId === friend.id ? "Inviting..." : friend.email}
          </Text>
        </TouchableOpacity>
        );
      })}
      {!filteredFriends.length ? (
        <Text style={APP_STYLES.emptyState}>
          {friends.length ? "No friends match that search yet." : "Add friends first, then they will show up here to invite."}
        </Text>
      ) : null}
    </ScreenShell>
  );
}
