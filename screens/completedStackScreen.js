import React from "react";
import { Share, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenShell from "../components/ScreenShell";
import AnimatedPressable from "../components/AnimatedPressable";
import ProgressCircle from "../components/ProgressCircle";
import { APP_STYLES, COLORS } from "../theme";
import { buildShareMessage, formatCurrency, getDaysUntil } from "../utils/activity";

export default function CompletedStackScreen({ route, navigation }) {
  const { stack, total, members = [] } = route.params;
  const daysLeft = getDaysUntil(stack.deadline);
  const shareMessage = buildShareMessage(stack, total, members.length);

  const shareWin = async () => {
    await Share.share({
      message: shareMessage
    });
  };

  return (
    <ScreenShell
      title="Goal Complete"
      subtitle="A finished stack deserves a proper win moment."
      headerAction={(
        <AnimatedPressable
          onPress={() => navigation.navigate("Stacks")}
          style={[APP_STYLES.secondaryButton, { marginTop: 0, paddingVertical: 10, paddingHorizontal: 14 }]}
        >
          <Text style={APP_STYLES.secondaryButtonText}>Stacks</Text>
        </AnimatedPressable>
      )}
    >
      <View style={[APP_STYLES.heroCard, { alignItems: "center" }]}>
        <Ionicons name="trophy-outline" size={42} color={COLORS.accent2} />
        <Text style={[APP_STYLES.value, { fontSize: 34, marginTop: 16 }]}>{stack.name}</Text>
        <Text style={[APP_STYLES.subtitle, { textAlign: "center" }]}>
          {stack.completed_message || "This goal is officially done."}
        </Text>
        <View style={{ marginTop: 22 }}>
          <ProgressCircle progress={1} size={128} label="done" />
        </View>
      </View>

      <View style={APP_STYLES.card}>
        <Text style={APP_STYLES.label}>Win card</Text>
        <Text style={[APP_STYLES.subtitle, { color: COLORS.text, fontSize: 18, marginTop: 10 }]}>
          {formatCurrency(total)} saved
        </Text>
        <Text style={[APP_STYLES.subtitle, { marginTop: 8 }]}>
          Goal target: {formatCurrency(stack.goal_amount || total)}
        </Text>
        <Text style={[APP_STYLES.subtitle, { marginTop: 8 }]}>
          Team size: {members.length || stack.members?.length || 1}
        </Text>
        {daysLeft !== null ? (
          <Text style={[APP_STYLES.subtitle, { marginTop: 8, color: COLORS.accent2 }]}>
            {daysLeft >= 0 ? `Finished with ${daysLeft} days to spare` : `Finished ${Math.abs(daysLeft)} days after deadline`}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          APP_STYLES.heroCard,
          {
            backgroundColor: "rgba(255, 92, 168, 0.12)",
            borderColor: "rgba(123, 228, 149, 0.24)"
          }
        ]}
      >
        <Text style={APP_STYLES.label}>Share preview</Text>
        <Text style={[APP_STYLES.value, { fontSize: 28 }]}>{stack.name}</Text>
        <Text style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 12 }]}>
          {formatCurrency(total)} saved with {members.length || stack.members?.length || 1} teammate{(members.length || stack.members?.length || 1) === 1 ? "" : "s"}.
        </Text>
        <Text style={[APP_STYLES.subtitle, { color: COLORS.accent2, marginTop: 10 }]}>
          {daysLeft === null
            ? "Finished strong."
            : daysLeft >= 0
              ? `${daysLeft} days ahead of schedule.`
              : `${Math.abs(daysLeft)} days after the deadline, but still complete.`}
        </Text>
        <View
          style={{
            marginTop: 16,
            backgroundColor: "rgba(255,255,255,0.06)",
            borderRadius: 18,
            padding: 14,
            borderWidth: 1,
            borderColor: COLORS.border
          }}
        >
          <Text style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 0 }]}>
            {shareMessage}
          </Text>
        </View>
      </View>

      <View style={APP_STYLES.card}>
        <Text style={APP_STYLES.label}>Members</Text>
        {members.map((member) => (
          <Text key={member.id} style={[APP_STYLES.subtitle, { color: COLORS.text, marginTop: 10 }]}>
            {member.name || member.email}
          </Text>
        ))}
      </View>

      <AnimatedPressable onPress={shareWin} style={APP_STYLES.primaryButton}>
        <Text style={APP_STYLES.primaryButtonText}>Share Win Card</Text>
      </AnimatedPressable>

      <AnimatedPressable
        onPress={() => navigation.navigate("StackDetail", { stack })}
        style={APP_STYLES.secondaryButton}
      >
        <Text style={APP_STYLES.secondaryButtonText}>View Completed Stack</Text>
      </AnimatedPressable>
    </ScreenShell>
  );
}
