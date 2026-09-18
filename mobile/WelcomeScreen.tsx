import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "./ui";

export function WelcomeScreen({
  onEmail,
  onLogin,
  error,
}: {
  onEmail: () => void;
  onLogin: () => void;
  error: string;
}) {
  const { height, width } = useWindowDimensions();
  const titleSize = Math.min(34, (Math.min(width, 480) - 80) / 9);
  const entrance = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduceMotion(value);
      })
      .catch(() => {
        if (mounted) setReduceMotion(true);
      });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    if (reduceMotion !== false) {
      entrance.setValue(1);
      return;
    }
    entrance.setValue(0);
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, entrance]);
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scroll}
      bounces={false}
    >
      <View style={[styles.canvas, { minHeight: Math.max(700, height - 60) }]}>
        <View pointerEvents="none" style={styles.topArt}>
          <Image
            source={require("../assets/welcome-blue-folds.png")}
            resizeMode="cover"
            style={{ width: "100%", height: "100%" }}
            accessible={false}
          />
          <LinearGradient
            colors={["#D6E7EE00", "#D6E7EE"]}
            style={styles.artFade}
          />
        </View>
        <View style={styles.brand}>
          <Svg width={38} height={38} viewBox="0 0 40 40" accessible={false}>
            <Path
              d="M11 4 H29 L38 20 L29 36 H11 L2 20 Z"
              fill="none"
              stroke="#111B29"
              strokeWidth="2.5"
            />
            <Circle cx="20" cy="20" r="10" fill="#111B29" />
          </Svg>
          <Animated.View
            style={{
              alignSelf: "stretch",
              opacity: entrance,
              transform: [
                {
                  translateY: entrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            }}
          >
            <Text
              accessibilityRole="header"
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={[
                styles.title,
                { fontSize: titleSize, lineHeight: titleSize + 4 },
              ]}
            >
              {"Events Circle\nCircle AI."}
            </Text>
            <Text style={styles.description}>
              Your work deserves to be seen.
            </Text>
          </Animated.View>
        </View>
        <View style={styles.actions}>
          <Text style={styles.prompt}>Don’t have an account?</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign up with email"
            onPress={onEmail}
            style={({ pressed }) => [styles.email, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.emailText}>Sign up with email</Text>
            <Icon name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Login"
            onPress={onLogin}
            style={styles.login}
          >
            <Text style={styles.loginText}>
              Already a member? <Text style={styles.link}>Login</Text>
            </Text>
          </Pressable>
          <Text style={styles.separator}>Or continue with</Text>
          <View style={styles.socialRow}>
            <View
              accessibilityLabel="Facebook sign-up, coming soon"
              style={styles.social}
            >
              <Icon name="logo-facebook" color="#1877F2" size={22} />
              <Text style={styles.socialText}>Facebook</Text>
            </View>
            <View
              accessibilityLabel="Google sign-up, coming soon"
              style={styles.social}
            >
              <Icon name="logo-google" color="#4285F4" size={20} />
              <Text style={styles.socialText}>Google</Text>
            </View>
          </View>
          <Text style={styles.unavailable}>
            Google & Facebook sign-up coming soon
          </Text>
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#D6E7EE" },
  scroll: { flexGrow: 1, alignItems: "center" },
  canvas: {
    width: "100%",
    maxWidth: 480,
    overflow: "hidden",
    backgroundColor: "#D6E7EE",
  },
  topArt: {
    overflow: "hidden",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  artFade: { position: "absolute", bottom: 0, left: 0, right: 0, height: 90 },
  separator: {
    textAlign: "center",
    color: "#536674",
    fontSize: 12,
    marginBottom: 16,
  },
  brand: {
    marginTop: 310,
    paddingHorizontal: 40,
    zIndex: 1,
    alignItems: "flex-start",
  },
  title: {
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -1.2,
    fontWeight: "700",
    color: "#101921",
    marginTop: 16,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: "#3E5360",
    marginTop: 12,
    maxWidth: 330,
    minHeight: 38,
  },
  actions: {
    marginTop: "auto",
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 12,
    zIndex: 2,
  },
  prompt: {
    fontSize: 13,
    color: "#28343E",
    textAlign: "center",
    marginBottom: 14,
  },
  socialRow: { flexDirection: "row", gap: 12 },
  social: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    minHeight: 46,
    borderRadius: 7,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 2,
    borderColor: "#BACCD7",
  },
  socialText: { fontSize: 13, color: "#333A48" },
  unavailable: {
    color: "#536674",
    fontSize: 10,
    textAlign: "center",
    marginVertical: 8,
  },
  email: {
    minHeight: 50,
    backgroundColor: "#292739",
    borderColor: "#171626",
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emailText: { fontSize: 14, fontWeight: "500", color: "#FFFFFF" },
  login: { minHeight: 48, justifyContent: "center", alignItems: "center" },
  loginText: { fontSize: 13, color: "#34414B" },
  link: { color: "#365CBD", fontWeight: "600" },
  error: { color: "#9D2838", fontSize: 13, textAlign: "center" },
});
