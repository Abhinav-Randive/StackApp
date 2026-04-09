import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import ScreenShell from "../components/ScreenShell";
import { APP_STYLES, COLORS } from "../theme";

export default function LeaderboardScreen({ navigation }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, "users"));

      const results = await Promise.all(
        snap.docs.map(async (u) => {
          const q = query(collection(db, "contributions"), where("user_id", "==", u.id));
          const res = await getDocs(q);
          const total = res.docs.reduce((s, d) => s + d.data().amount, 0);

          return { id: u.id, ...u.data(), total };
        })
      );

      results.sort((a, b) => b.total - a.total);
      setUsers(results);
    };

    fetch();
  }, []);

  return (
    <ScreenShell
      title="Leaderboard"
      subtitle="Friendly competition, now styled like the rest of the app."
      headerAction={<Ionicons name="trophy-outline" size={20} color={COLORS.accent2} />}
    >
      {users.map((u, i) => (
        <TouchableOpacity
          key={u.id}
          onPress={() => navigation.navigate("PublicProfile", { userId: u.id })}
          style={APP_STYLES.card}
        >
          <Text style={APP_STYLES.label}>#{i + 1}</Text>
          <Text style={[APP_STYLES.subtitle, { color: COLORS.text, fontSize: 17, marginTop: 8 }]}>
            {u.name || u.email}
          </Text>
          <Text style={[APP_STYLES.subtitle, { color: COLORS.accent2, marginTop: 6 }]}>
            ${u.total}
          </Text>
        </TouchableOpacity>
      ))}
      {!users.length ? <Text style={APP_STYLES.emptyState}>No leaderboard data yet.</Text> : null}
    </ScreenShell>
  );
}
