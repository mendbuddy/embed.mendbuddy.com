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

## Deploying the Embed Widget

**The embed widget does NOT auto-deploy from git push.** It is hosted on Cloudflare Pages (`mendbuddy-widget` project) and requires a manual deploy.

### Steps to deploy after making changes:

```bash
# 1. Build the widget
cd "/Volumes/Riki Repos/embed.mendbuddy.com" && node build.js

# 2. Deploy to Cloudflare Pages (production)
CLOUDFLARE_ACCOUNT_ID=dd762b194b4bcd3ff985109a450f9611 \
CLOUDFLARE_API_TOKEN=Fr4PtHJrwtRcyyCbh9X9fuHmBLG65ZId47ZUDCdl \
npx wrangler pages deploy dist --project-name=mendbuddy-widget --branch=main --commit-dirty=true

# 3. Purge the CDN cache (must be done from Cloudflare dashboard)
#    Go to: mendbuddy.com zone > Caching > Purge Cache
#    Purge: https://embed.mendbuddy.com/v1/chat.js
#    (The API token does not have cache purge permissions)

# 4. Verify deployment
curl -s "https://embed.mendbuddy.com/v1/chat.js" | head -c 200
```

### Important notes:
- **Cloudflare Pages project name**: `mendbuddy-widget`
- **Production domain**: `embed.mendbuddy.com`
- **Branch must be `main`** for production deployment
- **Always purge cache** after deploy — the CDN caches aggressively
- **Tell the user to purge cache** since the API token lacks purge permissions
- Get credentials from `/Volumes/Riki Repos/NEW-dashboard.mendbuddy.com/credentials.md`

## Brand

- Always lowercase: **mendbuddy** (never "MendBuddy")
