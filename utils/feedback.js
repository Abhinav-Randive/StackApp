import { Linking } from "react-native";

const FEEDBACK_EMAIL = "abhinavrandive770@gmail.com";

export async function openFeedbackEmail(context = "general") {
  const subject = encodeURIComponent(`Stack feedback: ${context}`);
  const body = encodeURIComponent(
    [
      "What were you trying to do?",
      "",
      "What happened?",
      "",
      "What would make this better?"
    ].join("\n")
  );

  const url = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
  await Linking.openURL(url);
}
