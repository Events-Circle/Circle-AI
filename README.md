# Events Circle — Circle AI

Expo / React Native planning workspace using the same Core accounts and Presence sign-in/up screens. Requirements come from the Circle AI screenshot's content and Events Circle modular architecture, not its UI. New workspace design uses warm neutrals, green accents and clear action cards.

## First slice

Quick actions for lead growth, weekly planning, lead replies, social posts and listing promotion; saved requests, editable drafts, owner approval/rejection, activity pagination, capability-aware daily-brief shell. Core data remains the source of truth. There are no seeded sample KPIs.

**This is a planning foundation, not live generative AI.** No provider is configured, and replies explicitly say so. Approval stores intent only. Publishing, scheduling, messages and ad spend are unavailable pending provider and owning-module integrations. Business Brain belongs to shared Core, not this frontend.

## Run

Node >=22.12, pnpm 10.30.3. `corepack pnpm install --frozen-lockfile`, then `corepack pnpm start`. Override EXPO_PUBLIC_API_URL only with the reviewed Core HTTPS origin (without /api/v1 suffix). Never add AI/database/storage keys here. Existing Core must first deploy the Circle AI branch and enable circle-ai, otherwise the app shows an explicit unavailable message after login.

Use the same existing account as Presence. New users can register and create a Core business. Native tokens use SecureStore with a Circle AI-specific key; browser sessions remain memory-only. Accounts are shared, app sessions are not automatically shared between installed applications.

## Verify

`corepack pnpm check`, `corepack pnpm export:mobile`, `corepack pnpm export:web`, `corepack pnpm exec playwright install chromium`, `corepack pnpm test:ui`.

The app has its own bundle IDs (com.eventscircle.circleai). No Presence EAS project ID or signing identity has been reused. Link a new EAS project before requesting native builds. Browser exports are QA surfaces, not a deployed public site. Live web needs Core CORS configuration. No live customer data is changed by tests.

## Ownership

Backend, migrations and AI gateway: Events-Circle/Event-Circle-Main-Core. Frontend: this repository. `contracts/source.json` pins Core contracts. Auth/session foundation and screens were extracted from Presence commit 4d9f34a417e0c114b9637af94e51a819750b7e6c with only Circle AI welcome naming and app-local secure storage key changed. Do not fork server authentication or business rules. Shared UI packaging across repos is a follow-up, not claimed complete here.

See the Core docs/circle-ai-handoff.md for API, permission, security and next-slice requirements.
