import { Alert, Platform } from "react-native";

export function confirmAction(title, message) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: "Confirm", style: "destructive", onPress: () => resolve(true) }
    ]);
  });
}

export async function shareText(message) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    if (navigator.share) {
      await navigator.share({ text: message });
      return "shared";
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(message);
      return "copied";
    }

    window.prompt("Copy your share text", message);
    return "prompted";
  }

  return "native";
}
