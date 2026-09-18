import React, { useEffect, useState, useRef } from "react";
import { ActivityIndicator, View, Text, ScrollView } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { AuthScreen } from "./mobile/AuthScreen";
import { BusinessForm } from "./mobile/BusinessForm";
import { CircleWorkspace } from "./mobile/CircleWorkspace";
import { Button } from "./mobile/ui";
import {
  session,
  restore,
  request,
  explain,
  store,
  type Models,
} from "./mobile/service";
function Shell() {
  const [ready, setReady] = useState(false),
    [signed, setSigned] = useState(false),
    [error, setError] = useState("");
  const [members, setMembers] = useState<Models["MembershipDto"][]>([]),
    [org, setOrg] = useState("");
  const epoch = useRef(0);
  async function membership() {
    const generation = epoch.current;
    const rows = await request<Models["MembershipDto"][]>(
      "/api/v1/core/memberships",
    );
    if (generation !== epoch.current) return;
    setMembers(rows);
    setOrg((current) =>
      rows.some((m) => m.organizationId === current)
        ? current
        : rows[0]?.organizationId || "",
    );
    setSigned(true);
  }
  function reset() {
    epoch.current++;
    setSigned(false);
    setMembers([]);
    setOrg("");
  }
  useEffect(() => {
    void (async () => {
      try {
        if (await restore()) await membership();
      } catch (e) {
        setError(explain(e));
      } finally {
        setReady(true);
      }
    })();
  }, []);
  async function logout() {
    reset();
    try {
      await session.logout();
    } catch (e) {
      setError(explain(e));
    }
  }
  if (!ready)
    return <ActivityIndicator accessibilityLabel="Restoring session" />;
  if (!signed) return <AuthScreen onSigned={membership} initialError={error} />;
  return (
    <View style={{ flex: 1, backgroundColor: "#F8F8F2" }}>
      <View
        style={{
          padding: 12,
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <Text style={{ flex: 1, color: "#566A5D" }}>
          Events Circle / Growth workspace
        </Text>
        <Button label="Sign out" secondary onPress={() => void logout()} />
        {members.length > 1 &&
          members.map((m, i) => (
            <Button
              key={m.organizationId}
              label={`Business ${i + 1}${org === m.organizationId ? " · selected" : ""}`}
              secondary
              onPress={() => setOrg(m.organizationId)}
            />
          ))}
      </View>
      {org ? (
        <CircleWorkspace
          key={org}
          org={org}
          role={members.find((m) => m.organizationId === org)?.role || "VIEWER"}
          onExpired={() => {
            void store.clear();
            reset();
            setError("Your session expired. Please sign in again.");
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          <BusinessForm onSaved={membership} />
        </ScrollView>
      )}
    </View>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F8F2" }}>
        <Shell />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
