import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db, auth } from "../firebase";
import {
  collection, query, where, getDocs,
  doc, updateDoc, arrayUnion, getDoc
} from "firebase/firestore";
import ScreenShell from "../components/ScreenShell";
import { APP_STYLES, COLORS } from "../theme";
import { isValidEmail, normalizeEmail } from "../utils/validation";

export default function FriendsScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [friends, setFriends] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const user = await getDoc(doc(db, "users", auth.currentUser.uid));
      const ids = user.data()?.friends || [];

      const data = await Promise.all(ids.map(async (id) => {
        const snap = await getDoc(doc(db, "users", id));
        return { id, ...snap.data() };
      }));

      setFriends(data);
    };

    fetch();
  }, []);

  const add = async () => {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const q = query(collection(db, "users"), where("email", "==", normalizedEmail));
      const res = await getDocs(q);

      if (res.empty) {
        setError("No user found with that email.");
        return;
      }

      const friend = res.docs[0];
      if (friend.id === auth.currentUser.uid) {
        setError("You can’t add yourself.");
        return;
      }

      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        friends: arrayUnion(friend.id)
      });

      setEmail("");
    } catch (err) {
      setError(err?.message || "Unable to add friend right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell title="Friends" subtitle="Bring people into your circle and keep the energy shared.">
      <View style={APP_STYLES.heroCard}>
        <Text style={APP_STYLES.label}>Add by email</Text>

          <TextInput
            placeholder="Enter email"
            placeholderTextColor={COLORS.muted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={APP_STYLES.input}
          />
        {error ? (
          <Text style={[APP_STYLES.feedbackText, { color: COLORS.danger }]}>{error}</Text>
        ) : null}

        <TouchableOpacity onPress={add} style={[APP_STYLES.primaryButton, loading ? { opacity: 0.55 } : null]} disabled={loading}>
          <Text style={APP_STYLES.primaryButtonText}>{loading ? "Adding..." : "Add Friend"}</Text>
        </TouchableOpacity>
      </View>

      {friends.map((f) => (
        <TouchableOpacity
          key={f.id}
          onPress={() => navigation.navigate("PublicProfile", { userId: f.id })}
          style={[APP_STYLES.card, APP_STYLES.row]}
        >
          <Ionicons name="person-outline" size={18} color={COLORS.accent2} />
          <Text style={{ color: COLORS.text, marginLeft: 10, fontSize: 16 }}>
            {f.name || f.email}
          </Text>
        </TouchableOpacity>
      ))}
      {!friends.length ? (
        <Text style={APP_STYLES.emptyState}>No friends added yet. Invite someone to get started.</Text>
      ) : null}
    </ScreenShell>
  );
}
