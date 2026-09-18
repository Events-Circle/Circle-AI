import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Button, Field, Icon, s } from "./ui";
import { session, explain, request, HttpError, type Models } from "./service";
import { WelcomeScreen } from "./WelcomeScreen";
export function AuthScreen({
  onSigned,
  initialError,
}: {
  onSigned: () => Promise<void>;
  initialError: string;
}) {
  const [welcome, setWelcome] = useState(true);
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (register)
        await session.register({
          email: email.trim(),
          password,
          displayName: name.trim(),
        });
      else await session.login({ email: email.trim(), password });
      await onSigned();
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy(false);
    }
  }
  if (welcome)
    return (
      <WelcomeScreen
        error={error}
        onEmail={() => {
          setRegister(true);
          setWelcome(false);
        }}
        onLogin={() => {
          setRegister(false);
          setWelcome(false);
        }}
      />
    );
  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[s.page, { paddingTop: 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to welcome"
          onPress={() => setWelcome(true)}
          disabled={busy}
          style={{
            paddingVertical: 12,
            flexDirection: "row",
            gap: 8,
            alignItems: "center",
          }}
        >
          <Icon name="arrow-back" />
          <Text style={s.body}>Back</Text>
        </Pressable>
        <LinearGradient
          colors={["#1F50E9", "#378DFC", "#67CDD4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 28, borderRadius: 25, gap: 25 }}
        >
          <Icon name="ellipse-outline" color="#fff" size={35} />
          <Text
            style={{
              fontSize: 34,
              lineHeight: 39,
              fontWeight: "800",
              color: "#fff",
            }}
          >
            Your work.{"\n"}Your presence.
          </Text>
          <Text style={{ color: "#E8F2FF", lineHeight: 21 }}>
            Your business, portfolio and next opportunity. Together on Events
            Circle.
          </Text>
        </LinearGradient>
        <Text style={s.h1}>
          {register ? "Create your account" : "Welcome back"}
        </Text>
        <Text style={s.body}>
          {register
            ? "One account for the Events Circle ecosystem."
            : "Sign in to manage your business presence."}
        </Text>
        {register && (
          <Field label="Your name" value={name} onChange={setName} />
        )}
        <Field
          label="Email address"
          value={email}
          onChange={setEmail}
          keyboard="email-address"
        />
        <Field
          label={register ? "Password · 12–128 characters" : "Password"}
          value={password}
          onChange={setPassword}
          secret
        />
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
        <Button
          label={busy ? "Connecting…" : register ? "Create account" : "Sign in"}
          disabled={busy || !email || !password || (register && !name)}
          onPress={() => void submit()}
        />
        <Button
          label={
            register
              ? "Already have an account? Sign in"
              : "New here? Create an account"
          }
          secondary
          disabled={busy}
          onPress={() => {
            setRegister(!register);
            setError("");
          }}
        />
        <Text style={[s.body, { fontSize: 12, textAlign: "center" }]}>
          Events Circle · Staging preview
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
