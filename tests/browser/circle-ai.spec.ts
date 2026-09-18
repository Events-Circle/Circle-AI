import { test, expect } from "@playwright/test";
const origin = "https://events-circle-api-production.up.railway.app";
test("shared sign-in, request, edit, approve plan only, logout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let plans: any[] = [];
  await page.route(origin + "/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    let data: any = {},
      status = 200;
    if (path.endsWith("/auth/login"))
      data = {
        accessToken: "test-access",
        refreshToken: "test-refresh",
        expiresIn: 600,
        tokenType: "Bearer",
      };
    else if (path.endsWith("/auth/logout")) data = {};
    else if (path.endsWith("/memberships"))
      data = [{ organizationId: "org-test", role: "OWNER" }];
    else if (path.includes("/circle-ai/")) {
      expect(req.headers()["x-organization-id"]).toBe("org-test");
      expect(req.headers().authorization).toBe("Bearer test-access");
      if (path.endsWith("/brief"))
        data = {
          providerReady: false,
          executionReady: false,
          draftCount: plans.filter((p) => p.status === "DRAFT").length,
          approvedCount: plans.filter((p) => p.status === "APPROVED").length,
          rejectedCount: 0,
          notice: "Planning only",
        };
      else if (path.endsWith("/plans") && req.method() === "POST") {
        const body = req.postDataJSON();
        expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
        data = {
          id: "plan-one",
          ...body,
          title: "Social post plan",
          response:
            "Your request has been saved. Nothing has been generated, sent, scheduled, published or purchased.",
          draft: body.prompt,
          blockedReason: "Content Studio and AI provider",
          status: "DRAFT",
          version: 1,
          createdAt: "2026-09-18T09:00:00Z",
          updatedAt: "2026-09-18T09:00:00Z",
        };
        plans = [data];
        status = 201;
      } else if (req.method() === "PATCH") {
        expect(req.postDataJSON().version).toBe(1);
        plans[0] = { ...plans[0], draft: req.postDataJSON().draft, version: 2 };
        data = plans[0];
      } else if (path.endsWith("/decision")) {
        expect(req.postDataJSON()).toEqual({
          version: 2,
          decision: "APPROVED",
        });
        plans[0] = { ...plans[0], status: "APPROVED", version: 3 };
        data = plans[0];
        status = 201;
      } else data = plans;
    } else {
      status = 404;
    }
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page
    .getByLabel("Email address", { exact: true })
    .fill("owner@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test password 123456");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByText("Your daily brief", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Your request", { exact: true })
    .fill("Create a post for my bridal package");
  await page
    .getByRole("button", { name: "Save planning request", exact: true })
    .click();
  await expect(
    page.getByText("Social post plan", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit plan", exact: true }).click();
  await page
    .getByLabel("Plan draft", { exact: true })
    .fill("A revised bridal package brief");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByText("A revised bridal package brief", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Approve plan only", exact: true })
    .click();
  await expect(
    page.getByText(
      "Plan approved only. Nothing has been published, sent or launched.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/circle-ai-workspace.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Login", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
