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

export default function FriendsScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [friends, setFriends] = useState([]);

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
    const q = query(collection(db, "users"), where("email", "==", email));
    const res = await getDocs(q);

    if (res.empty) return;

    const friend = res.docs[0];

    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      friends: arrayUnion(friend.id)
    });

    setEmail("");
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

        <TouchableOpacity onPress={add} style={APP_STYLES.primaryButton}>
          <Text style={APP_STYLES.primaryButtonText}>Add Friend</Text>
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
