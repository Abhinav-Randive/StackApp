import { StyleSheet } from "react-native";

export const COLORS = {
  bg: ["#140f1f", "#1b1530", "#12201b"],
  card: "rgba(23, 20, 38, 0.82)",
  cardStrong: "rgba(34, 28, 54, 0.92)",
  border: "rgba(255, 255, 255, 0.08)",
  text: "#FFF7FB",
  subtext: "#CDBFD2",
  muted: "#9F92AD",
  input: "rgba(255, 255, 255, 0.08)",
  accent: "#FF5CA8",
  accent2: "#7BE495",
  accentSoft: "rgba(123, 228, 149, 0.16)",
  danger: "#FF7D92",
  tab: "#120f1f"
};

export const APP_STYLES = StyleSheet.create({
  screen: {
    flex: 1
  },
  safeArea: {
    flex: 1
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0.3
  },
  subtitle: {
    color: COLORS.subtext,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8
  },
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginTop: 14
  },
  heroCard: {
    backgroundColor: COLORS.cardStrong,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderRadius: 26,
    padding: 22,
    marginTop: 20
  },
  label: {
    color: COLORS.subtext,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  value: {
    color: COLORS.text,
    fontSize: 29,
    fontWeight: "800",
    marginTop: 8
  },
  input: {
    backgroundColor: COLORS.input,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: COLORS.text,
    marginTop: 14
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14
  },
  primaryButtonText: {
    color: "#1C1020",
    fontSize: 15,
    fontWeight: "800"
  },
  secondaryButton: {
    backgroundColor: COLORS.accentSoft,
    borderColor: "rgba(123, 228, 149, 0.3)",
    borderWidth: 1,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12
  },
  secondaryButtonText: {
    color: COLORS.accent2,
    fontSize: 15,
    fontWeight: "700"
  },
  dangerButton: {
    backgroundColor: "rgba(255, 125, 146, 0.14)",
    borderColor: "rgba(255, 125, 146, 0.34)",
    borderWidth: 1,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12
  },
  dangerButtonText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: "700"
  },
  row: {
    flexDirection: "row",
    alignItems: "center"
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyState: {
    color: COLORS.subtext,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 18
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12
  }
});
