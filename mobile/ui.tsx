import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { authorization, origin } from "./service";
export const C = {
  ink: "#102249",
  muted: "#667797",
  blue: "#235AFF",
  line: "#E2E9F5",
  bg: "#F5F8FE",
  green: "#13845B",
};
export function Icon({
  name,
  size = 21,
  color = C.blue,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
export function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.button,
        secondary ? s.secondary : s.primary,
        { opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[s.buttonText, { color: secondary ? C.blue : "#fff" }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Heading({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.heading}>
      <Text style={s.h2}>{title}</Text>
      {action && onPress && (
        <Pressable accessibilityRole="button" onPress={onPress} hitSlop={10}>
          <Text style={s.link}>{action} ›</Text>
        </Pressable>
      )}
    </View>
  );
}
export function Field({
  label,
  value,
  onChange,
  secret = false,
  multiline = false,
  keyboard = "default",
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  secret?: boolean;
  multiline?: boolean;
  keyboard?: "default" | "email-address" | "decimal-pad";
}) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secret}
        multiline={multiline}
        keyboardType={keyboard}
        autoCapitalize={
          keyboard === "email-address" || secret ? "none" : "sentences"
        }
        autoCorrect={!secret && keyboard !== "email-address"}
        style={[
          s.input,
          multiline && { minHeight: 105, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}
export function Tag({ text }: { text: string }) {
  return <Text style={s.tag}>{text}</Text>;
}
export function Planned({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <Heading title={title} />
      <Card>
        <View style={s.row}>
          <Icon name="layers-outline" />
          <Tag text="Coming later" />
        </View>
        <Text style={s.body}>{description}</Text>
      </Card>
    </>
  );
}
export function Photo({
  id,
  org,
  height = 150,
}: {
  id?: string | null;
  org: string;
  height?: number;
}) {
  const [headers, setHeaders] = useState<Record<string, string>>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true;
    setHeaders(undefined);
    setFailed(false);
    if (id)
      authorization()
        .then((value) => {
          if (current)
            setHeaders({ Authorization: value, "X-Organization-Id": org });
        })
        .catch(() => {
          if (current) setFailed(true);
        });
    return () => {
      current = false;
    };
  }, [id, org]);
  if (!id || failed)
    return (
      <LinearGradient
        colors={["#E7EEFF", "#E4F8F8"]}
        style={{
          height,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 12,
        }}
      >
        <Icon name="image-outline" size={28} color="#8399BD" />
      </LinearGradient>
    );
  if (!headers)
    return (
      <View style={{ height, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  return (
    <Image
      accessibilityLabel="Business image"
      source={{ uri: `${origin}/api/v1/core/media/${id}/file`, headers }}
      onError={() => setFailed(true)}
      style={{ height, width: "100%", borderRadius: 12 }}
    />
  );
}
export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  page: {
    padding: 22,
    gap: 18,
    width: "100%",
    maxWidth: 650,
    alignSelf: "center",
    paddingBottom: 35,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  h1: { fontSize: 30, fontWeight: "800", color: C.ink, letterSpacing: -0.9 },
  h2: { fontSize: 18, fontWeight: "700", color: C.ink },
  body: { fontSize: 14, lineHeight: 21, color: C.muted },
  label: { fontSize: 13, fontWeight: "600", color: C.ink },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 5,
  },
  link: { color: C.blue, fontSize: 13, fontWeight: "600" },
  card: {
    padding: 17,
    gap: 13,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 19,
    backgroundColor: "#fff",
  },
  button: {
    minHeight: 46,
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primary: { backgroundColor: C.blue },
  secondary: {
    backgroundColor: "#EEF3FF",
    borderColor: "#DCE6FF",
    borderWidth: 1,
  },
  buttonText: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#D4DEEF",
    borderRadius: 12,
    padding: 13,
    minHeight: 48,
    fontSize: 16,
    color: C.ink,
    backgroundColor: "#fff",
  },
  tag: {
    fontSize: 11,
    color: "#49618E",
    backgroundColor: "#EDF2FB",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    overflow: "hidden",
  },
  error: {
    color: "#9E263E",
    backgroundColor: "#FFF0F2",
    padding: 13,
    borderRadius: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: "48%", flexGrow: 1 },
  divider: { height: 1, backgroundColor: C.line },
});
