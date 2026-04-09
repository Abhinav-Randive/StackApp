import React from "react";
import { ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { APP_STYLES, COLORS } from "../theme";

export default function ScreenShell({
  title,
  subtitle,
  children,
  scroll = true,
  contentContainerStyle,
  headerAction
}) {
  const Content = scroll ? ScrollView : View;
  const contentProps = scroll
    ? { contentContainerStyle: [APP_STYLES.content, contentContainerStyle] }
    : { style: [APP_STYLES.content, { flex: 1 }, contentContainerStyle] };

  return (
    <LinearGradient
      colors={COLORS.bg}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={APP_STYLES.screen}
    >
      <SafeAreaView style={APP_STYLES.safeArea}>
        <Content {...contentProps}>
          {(title || subtitle || headerAction) && (
            <View style={APP_STYLES.row}>
              <View style={{ flex: 1 }}>
                {title ? <Text style={APP_STYLES.title}>{title}</Text> : null}
                {subtitle ? <Text style={APP_STYLES.subtitle}>{subtitle}</Text> : null}
              </View>
              {headerAction}
            </View>
          )}
          {children}
        </Content>
      </SafeAreaView>
    </LinearGradient>
  );
}
