import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
  Pressable,
  StyleSheet,
} from "react-native";
import { Button, Field, Icon } from "./ui";
import { authorization, origin, request, explain, HttpError } from "./service";
import type { components } from "../src/api/schema";
type Plan = components["schemas"]["PlanDto"];
type Brief = components["schemas"]["BriefDto"];
const actions = [
  ["GROW_LEADS", "Get more leads", "Find the next opportunity"],
  ["PLAN_WEEK", "Create my week", "Plan a considered content rhythm"],
  ["REPLY_LEADS", "Reply to new leads", "Prepare a thoughtful response"],
  [
    "PROMOTE_LISTING",
    "Promote my best listing",
    "Outline a campaign before spending",
  ],
  ["CREATE_POST", "Create a post", "Start with your offer and audience"],
] as const;
type Kind = (typeof actions)[number][0] | "GENERAL";
function requestId() {
  // A deduplication ID, never an authorization token.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const n = Math.floor(Math.random() * 16);
    return (c === "x" ? n : (n & 3) | 8).toString(16);
  });
}
function PlanCard({
  plan,
  owner,
  writable,
  busy,
  save,
  decide,
}: {
  plan: Plan;
  owner: boolean;
  writable: boolean;
  busy: boolean;
  save: (p: Plan, draft: string) => void;
  decide: (p: Plan, decision: "APPROVED" | "REJECTED") => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(plan.draft);
  useEffect(() => {
    setDraft(plan.draft);
    setEditing(false);
  }, [plan.version]);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>{plan.title}</Text>
        <Text style={styles.status}>{plan.status}</Text>
      </View>
      <Text style={styles.meta}>
        {new Date(plan.createdAt).toLocaleString()}
      </Text>
      <Text style={styles.prompt}>{plan.prompt}</Text>
      <Text style={styles.body}>{plan.response}</Text>
      {editing ? (
        <Field label="Plan draft" value={draft} onChange={setDraft} />
      ) : (
        <Text style={styles.draft}>{plan.draft}</Text>
      )}
      <Text style={styles.blocker}>
        Execution unavailable · {plan.blockedReason}
      </Text>
      {plan.status === "APPROVED" && (
        <Text style={styles.body}>
          Plan approved only. Nothing has been published, sent or launched.
        </Text>
      )}
      {plan.status === "DRAFT" && (
        <View style={styles.controls}>
          {writable && (
            <Button
              label={editing ? "Save draft" : "Edit plan"}
              secondary
              disabled={busy || (editing && !draft.trim())}
              onPress={() => (editing ? save(plan, draft) : setEditing(true))}
            />
          )}
          {owner && !editing && (
            <>
              <Button
                label="Approve plan only"
                disabled={busy}
                onPress={() => decide(plan, "APPROVED")}
              />
              <Button
                label="Reject"
                secondary
                disabled={busy}
                onPress={() => decide(plan, "REJECTED")}
              />
            </>
          )}
        </View>
      )}
    </View>
  );
}
export function CircleWorkspace({
  org,
  role,
  onExpired,
}: {
  org: string;
  role: string;
  onExpired: () => void;
}) {
  const [plans, setPlans] = useState<Plan[]>([]),
    [brief, setBrief] = useState<Brief | null>(null);
  const [tab, setTab] = useState<"Assistant" | "Activity">("Assistant");
  const [prompt, setPrompt] = useState(""),
    [kind, setKind] = useState<Kind>("GENERAL");
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [cursor, setCursor] = useState("");
  const mounted = useRef(true),
    pending = useRef<{ requestId: string; kind: Kind; prompt: string } | null>(
      null,
    );
  const writable = role === "OWNER" || role === "EDITOR";
  async function list(next = "") {
    const r = await fetch(
      `${origin}/api/v1/circle-ai/plans?limit=20${next ? "&cursor=" + encodeURIComponent(next) : ""}`,
      {
        headers: {
          Authorization: await authorization(),
          "X-Organization-Id": org,
        },
        credentials: "omit",
        redirect: "error",
        signal: AbortSignal.timeout(30000),
      },
    );
    if (!r.ok)
      throw new HttpError(
        r.status,
        r.status === 404
          ? "Circle AI is not enabled on this API yet. Its backend migration and deployment must be completed first."
          : "Could not load activity.",
      );
    const rows = (await r.json()) as Plan[];
    if (mounted.current) {
      setPlans((p) => (next ? [...p, ...rows] : rows));
      setCursor(r.headers.get("X-Next-Cursor") || "");
    }
  }
  async function refresh() {
    await list();
    const b = await request<Brief>("/api/v1/circle-ai/brief", { org });
    if (mounted.current) setBrief(b);
  }
  function fail(e: unknown) {
    if (!mounted.current) return;
    setError(explain(e));
    if (e instanceof HttpError && e.status === 401) onExpired();
  }
  useEffect(() => {
    mounted.current = true;
    void refresh()
      .catch(fail)
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => {
      mounted.current = false;
    };
  }, []);
  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      if (mounted.current) await refresh();
    } catch (e) {
      fail(e);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function submit() {
    const text = prompt.trim();
    if (!text) return;
    if (
      !pending.current ||
      pending.current.prompt !== text ||
      pending.current.kind !== kind
    )
      pending.current = { requestId: requestId(), prompt: text, kind };
    await run(async () => {
      await request("/api/v1/circle-ai/plans", {
        method: "POST",
        org,
        body: pending.current,
      });
      pending.current = null;
      if (mounted.current) setPrompt("");
    });
  }
  return (
    <ScrollView
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heading}>
        <View>
          <Text style={styles.brand}>Circle AI</Text>
          <Text style={styles.subtitle}>Your growth, with intention.</Text>
        </View>
        <Icon name="sparkles-outline" color="#38554A" size={32} />
      </View>
      <View style={styles.nav}>
        {(["Assistant", "Activity"] as const).map((t) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: t === tab }}
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.selected]}
          >
            <Text style={styles.tabText}>{t}</Text>
          </Pressable>
        ))}
        <Button
          label="Refresh"
          secondary
          disabled={busy || loading}
          onPress={() => void run(async () => {})}
        />
      </View>
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {loading && <ActivityIndicator accessibilityLabel="Loading Circle AI" />}
      {!loading && tab === "Assistant" && (
        <>
          <View style={styles.brief}>
            <Text style={styles.title}>Your daily brief</Text>
            <Text style={styles.meta}>
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
            <Text style={styles.body}>
              Live lead counts, qualified leads, top campaign and today's post
              will appear when their source modules are connected. No sample
              numbers are shown.
            </Text>
            {brief && (
              <>
                <Text style={styles.numbers}>
                  {brief.draftCount} drafts · {brief.approvedCount} approved
                  plans
                </Text>
                <Text style={styles.meta}>
                  All-time planning totals, not daily performance
                </Text>
              </>
            )}
          </View>
          <Text style={styles.title}>What would you like to work on?</Text>
          <View style={styles.actions}>
            {actions.map(([value, label, detail]) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{
                  selected: value === kind,
                  disabled: !writable,
                }}
                disabled={!writable || busy}
                onPress={() => {
                  setKind(value);
                  setPrompt(label);
                }}
                style={[styles.action, kind === value && styles.selected]}
              >
                <Text style={styles.actionTitle}>{label}</Text>
                <Text style={styles.meta}>{detail}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.card}>
            <Text style={styles.title}>Start a conversation</Text>
            <Text style={styles.body}>
              Planning intake, not a live AI chat yet. Save your request, refine
              the draft, then approve the plan for future execution.
            </Text>
            <Field label="Your request" value={prompt} onChange={setPrompt} />
            <Button
              label={busy ? "Saving…" : "Save planning request"}
              disabled={
                !writable ||
                busy ||
                !brief ||
                !prompt.trim() ||
                prompt.length > 4000
              }
              onPress={() => void submit()}
            />
            <Text style={styles.meta}>
              Up to 4,000 characters. Only owners can approve plans. Approval
              never spends money or sends messages.
            </Text>
          </View>
        </>
      )}
      <Text style={styles.title}>
        {tab === "Activity" ? "Planning activity" : "Conversation & plans"}
      </Text>
      {!loading && !plans.length && (
        <Text style={styles.body}>
          No saved requests yet. Your first plan will appear here.
        </Text>
      )}
      {plans.map((p) => (
        <PlanCard
          key={p.id}
          plan={p}
          owner={role === "OWNER"}
          writable={writable}
          busy={busy}
          save={(plan, draft) =>
            void run(() =>
              request(`/api/v1/circle-ai/plans/${plan.id}`, {
                method: "PATCH",
                org,
                body: { draft, version: plan.version },
              }),
            )
          }
          decide={(plan, decision) =>
            void run(() =>
              request(`/api/v1/circle-ai/plans/${plan.id}/decision`, {
                method: "POST",
                org,
                body: { decision, version: plan.version },
              }),
            )
          }
        />
      ))}
      {!!cursor && (
        <Button
          label="Load earlier requests"
          secondary
          disabled={busy}
          onPress={() => {
            setBusy(true);
            void list(cursor)
              .catch(fail)
              .finally(() => {
                if (mounted.current) setBusy(false);
              });
          }}
        />
      )}
      <Text style={styles.meta}>
        Business Brain and AI-generated suggestions await the shared Core AI
        gateway. Publishing, scheduling, replies and campaigns require their
        owning modules and connected accounts.
      </Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: {
    padding: 22,
    gap: 22,
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    paddingBottom: 60,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  brand: {
    fontSize: 36,
    fontWeight: "800",
    color: "#193D32",
    letterSpacing: -1.5,
  },
  subtitle: { color: "#5F7068", fontSize: 16, marginTop: 6 },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  nav: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  tab: { padding: 14, borderRadius: 8 },
  selected: { backgroundColor: "#DCE8D9" },
  tabText: { color: "#193D32", fontWeight: "700" },
  brief: {
    padding: 22,
    gap: 12,
    backgroundColor: "#E8EDDF",
    borderLeftWidth: 4,
    borderLeftColor: "#526B45",
    borderRadius: 8,
  },
  title: { fontSize: 19, fontWeight: "700", color: "#243E33" },
  body: { fontSize: 14, lineHeight: 22, color: "#53625B" },
  meta: { fontSize: 12, lineHeight: 19, color: "#647068" },
  numbers: { fontSize: 22, fontWeight: "700", color: "#243E33" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  action: {
    flexGrow: 1,
    flexBasis: 210,
    padding: 18,
    gap: 7,
    backgroundColor: "#EFEFE7",
    borderRadius: 8,
  },
  actionTitle: { color: "#243E33", fontWeight: "700", fontSize: 15 },
  card: {
    padding: 20,
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E5DB",
    borderRadius: 12,
  },
  status: { fontSize: 11, fontWeight: "700", color: "#536B44" },
  prompt: { fontSize: 16, fontWeight: "600", lineHeight: 24, color: "#243E33" },
  draft: {
    padding: 16,
    backgroundColor: "#F5F5EF",
    color: "#35483D",
    lineHeight: 22,
  },
  blocker: { fontSize: 12, color: "#806128", lineHeight: 20 },
  controls: { gap: 10 },
  error: { color: "#A92C35", lineHeight: 22 },
});
