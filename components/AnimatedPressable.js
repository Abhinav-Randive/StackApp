import React from "react";
import { TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

export default function AnimatedPressable({ children, onPress, style, disabled = false }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        activeOpacity={disabled ? 1 : 0.9}
        disabled={disabled}
        onPressIn={() => {
          if (disabled) return;
          scale.value = withSpring(0.96);
        }}
        onPressOut={() => {
          if (disabled) return;
          scale.value = withSpring(1);
        }}
        onPress={() => {
          if (disabled) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress && onPress();
        }}
        style={[style, disabled ? { opacity: 0.55 } : null]}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}
