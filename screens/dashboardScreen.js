import React, { useEffect, useState } from "react";
import { TouchableOpacity, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import ScreenShell from "../components/ScreenShell";
import { APP_STYLES, COLORS } from "../theme";

export default function DashboardScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const q = query(collection(db, "contributions"), where("user_id", "==", auth.currentUser.uid));
    return onSnapshot(q, snap => {
      setData(snap.docs.map(d => d.data()));
    });
  }, []);

  useEffect(() => {
    const q = query(collection(db, "notifications"));
    return onSnapshot(q, (snap) => {
      const unread = snap.docs
        .map((item) => item.data())
        .filter((item) => (item.target_user_ids || []).includes(auth.currentUser.uid))
        .filter((item) => !(item.read_by || []).includes(auth.currentUser.uid)).length;
      setUnreadCount(unread);
    });
  }, []);

  const total = data.reduce((s, c) => s + c.amount, 0);

  return (
    <ScreenShell
      title="Home"
      subtitle="A quick snapshot of your savings momentum."
      headerAction={(
        <TouchableOpacity onPress={() => navigation.navigate("Notifications")} style={{ position: "relative", padding: 4 }}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.accent2} />
          {unreadCount ? (
            <View style={{ position: "absolute", right: -2, top: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
              <Text style={{ color: "#1C1020", fontSize: 10, fontWeight: "800" }}>{unreadCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      )}
    >
      <View style={APP_STYLES.heroCard}>
        <Text style={APP_STYLES.label}>Total saved</Text>
        <Text style={APP_STYLES.value}>${total}</Text>
        <Text style={[APP_STYLES.subtitle, { color: COLORS.accent2, marginTop: 12 }]}>
          Every contribution is moving your stacks forward.
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate("Leaderboard")} style={APP_STYLES.secondaryButton}>
          <Text style={APP_STYLES.secondaryButtonText}>View Leaderboard</Text>
        </TouchableOpacity>
      </View>
    </ScreenShell>
  );
}
