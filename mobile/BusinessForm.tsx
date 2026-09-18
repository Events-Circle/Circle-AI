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
export function BusinessForm({
  supplier,
  org,
  onSaved,
}: {
  supplier?: Models["SupplierResponseDto"];
  org?: string;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(supplier?.businessName || "");
  const [category, setCategory] = useState(supplier?.category || "");
  const [city, setCity] = useState(supplier?.city || "");
  const [email, setEmail] = useState(supplier?.contactEmail || "");
  const [phone, setPhone] = useState(supplier?.contactPhone || "");
  const [inquiries, setInquiries] = useState(supplier?.acceptInquiries ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true);
    setError("");
    try {
      if (!name.trim() || !category.trim() || !city.trim())
        throw new HttpError(
          400,
          "Business name, category and city are required.",
        );
      await request("/api/v1/core/suppliers" + (supplier ? "/current" : ""), {
        method: supplier ? "PUT" : "POST",
        ...(org ? { org } : {}),
        body: {
          businessName: name.trim(),
          category: category.trim(),
          city: city.trim(),
          contactEmail: email.trim() || null,
          contactPhone: phone.trim() || null,
          acceptInquiries: inquiries,
          serviceAreas: supplier?.serviceAreas || [],
        },
      });
      await onSaved();
    } catch (e) {
      setError(explain(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 16 }}>
      <Text style={s.h2}>
        {supplier ? "Business identity" : "Set up your business"}
      </Text>
      <Text style={s.body}>
        Your business identity is shared across Events Circle.
      </Text>
      <Field label="Business name" value={name} onChange={setName} />
      <Field
        label="Category · e.g. Event planner"
        value={category}
        onChange={setCategory}
      />
      <Field label="City" value={city} onChange={setCity} />
      <Field
        label="Contact email"
        value={email}
        onChange={setEmail}
        keyboard="email-address"
      />
      <Field
        label="Phone · international format, e.g. +961…"
        value={phone}
        onChange={setPhone}
      />
      <View style={s.row}>
        <Text style={s.label}>Accept inquiries</Text>
        <Switch value={inquiries} onValueChange={setInquiries} />
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <Button
        label={busy ? "Saving…" : "Save business"}
        disabled={busy}
        onPress={() => void save()}
      />
    </View>
  );
}
