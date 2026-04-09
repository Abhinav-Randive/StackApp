import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, TextInput
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db, auth } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import ScreenShell from "../components/ScreenShell";
import { APP_STYLES, COLORS } from "../theme";

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (snap.exists()) setProfile(snap.data());
    };
    fetch();
  }, []);

  const save = async () => {
    await updateDoc(doc(db, "users", auth.currentUser.uid), profile);
    setEditing(false);
  };

  if (!profile) return null;

  return (
    <ScreenShell title="Profile" subtitle="Keep your identity polished across every shared stack.">
      <View style={[APP_STYLES.heroCard, { alignItems: "center" }]}>
        <View style={APP_STYLES.avatar}>
          <Ionicons name="person-outline" size={32} color={COLORS.text} />
        </View>

        {editing ? (
          <TextInput
            value={profile.name}
            onChangeText={(t) => setProfile({ ...profile, name: t })}
            placeholder="Name"
            placeholderTextColor={COLORS.muted}
            style={[APP_STYLES.input, { width: "100%", textAlign: "center" }]}
          />
        ) : (
          <Text style={{ color: COLORS.text, marginTop: 14, fontSize: 22, fontWeight: "700" }}>
            {profile.name || "Your name"}
          </Text>
        )}

        <Text style={[APP_STYLES.label, { marginTop: 20, alignSelf: "flex-start" }]}>Bio</Text>

        {editing ? (
          <TextInput
            value={profile.bio}
            onChangeText={(t) => setProfile({ ...profile, bio: t })}
            placeholder="Tell people what you're saving for"
            placeholderTextColor={COLORS.muted}
            multiline
            style={[APP_STYLES.input, { width: "100%", minHeight: 96, textAlignVertical: "top" }]}
          />
        ) : (
          <Text style={[APP_STYLES.subtitle, { color: COLORS.text, alignSelf: "flex-start" }]}>
            {profile.bio || "Add a short bio so friends know what you are building toward."}
          </Text>
        )}

        <TouchableOpacity
          onPress={editing ? save : () => setEditing(true)}
          style={editing ? APP_STYLES.primaryButton : APP_STYLES.secondaryButton}
        >
          <Text style={editing ? APP_STYLES.primaryButtonText : APP_STYLES.secondaryButtonText}>
            {editing ? "Save" : "Edit Profile"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenShell>
  );
}
