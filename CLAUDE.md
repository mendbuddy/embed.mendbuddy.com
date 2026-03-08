# mendbuddy Embed Widget — Project Rules

## Rule: Cross-Project Impact Check

**After completing any embed widget change, check whether it depends on or affects the backend API.**

mendbuddy has 3 codebases that share the same API:
- **Backend + Dashboard** (`/Volumes/Riki Repos/NEW-dashboard.mendbuddy.com/`) — Cloudflare Worker API + React admin dashboard
- **iOS app** (`/Volumes/Riki Repos/mendbuddy-ios/`) — Swift iOS app consuming the API
- **Embed widget** (this repo) — embeddable customer-facing chat widget

**When you change how the widget calls the API:**
1. Verify the backend endpoint exists and returns what you expect — check the route handler in the backend project
2. If you need a new endpoint or changed response shape, **tell the user** so they can update the backend first
3. The chat streaming endpoint (`/workspaces/:id/threads/:threadId/stream`) is the most critical — any changes to SSE format affect both this widget and the iOS app

**When the backend has changed and you're updating the widget to match:**
1. Read the actual backend route to confirm the response shape
2. Test against the live API (`https://api.mendbuddy.com`), not localhost

## Brand

- Always lowercase: **mendbuddy** (never "MendBuddy")
