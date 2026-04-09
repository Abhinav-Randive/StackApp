import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import ScreenShell from "../components/ScreenShell";
import { APP_STYLES, COLORS } from "../theme";

export default function PublicProfileScreen({ route }) {
  const { userId } = route.params;
  const [profile, setProfile] = useState(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, "users", userId));
      if (snap.exists()) setProfile(snap.data());

      const q = query(collection(db, "contributions"), where("user_id", "==", userId));
      const res = await getDocs(q);

      const sum = res.docs.reduce((s, d) => s + d.data().amount, 0);
      setTotal(sum);
    };
    fetch();
  }, []);

  if (!profile) return null;

  return (
    <ScreenShell title="Profile" subtitle="A clean public snapshot of this saver.">
      <View style={[APP_STYLES.heroCard, { alignItems: "center" }]}>
        <View style={APP_STYLES.avatar}>
          <Ionicons name="person-outline" size={32} color={COLORS.text} />
        </View>

        <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: "700", marginTop: 14 }}>
          {profile.name || profile.email}
        </Text>

        <Text style={[APP_STYLES.subtitle, { textAlign: "center" }]}>
          {profile.bio || "No bio yet."}
        </Text>
      </View>

      <View style={APP_STYLES.card}>
        <Text style={APP_STYLES.label}>Total saved</Text>
        <Text style={APP_STYLES.value}>${total}</Text>
      </View>
    </ScreenShell>
  );
}
