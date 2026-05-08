# OEM Partnership Dashboard — Static Hosting

A static, snapshot-based dashboard of OEM partnerships, ready to deploy on GitHub Pages, Netlify, Vercel, or any static host.

## ⚠ READ FIRST: Credential exposure

`data.json` contains **shared portal login credentials** (email + plaintext password) for ~30 OEM partner accounts, sourced from the Tech Partnerships - CAPS Google Sheet. If you publish this dashboard to a public URL with `SHOW_CREDENTIALS = true`, anyone with the link can read those credentials and access your partner portals.

**Before any public deployment:**

1. Open `index.html`.
2. Change `const SHOW_CREDENTIALS = true;` to `const SHOW_CREDENTIALS = false;`.
3. (Strongly recommended) Open `data.json` and remove the `portalEmail`, `portalPassword`, and `driveLink` fields from every entry — even if `SHOW_CREDENTIALS = false`, the values are still embedded in the static file and someone could read them with View Source.

The safest option is to host privately and only share the URL with teammates who already have access to those passwords.

## What's in this folder

```
oem-dashboard-public/
├── index.html          ← The dashboard (one self-contained file)
├── data.json           ← OEM partnership snapshot from HubSpot (replace to refresh)
├── api/claude.js       ← OPTIONAL Vercel serverless function for Claude-powered solution search
└── README.md           ← This file
```

## Quick deploy: GitHub Pages (free, public)

> Privacy warning: GitHub Pages on a public repo means anyone with the URL can view OEM names, POC emails, partner portal links, internal owner names, and rejection reasons. If that data is sensitive, use a private repo (requires GitHub Pro/Team) or a different hosting option.

1. Create a new repository on GitHub (e.g. `oem-dashboard`).
2. Push the contents of this folder to the repo's root:
   ```bash
   cd oem-dashboard-public
   git init
   git add .
   git commit -m "Initial OEM dashboard"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/oem-dashboard.git
   git push -u origin main
   ```
3. In GitHub: **Settings → Pages → Source → Deploy from a branch → main / root**.
4. Wait ~30 seconds. Your dashboard will be live at `https://YOUR_USERNAME.github.io/oem-dashboard/`.

## Refreshing the data

The dashboard reads from `data.json`. To refresh:

- Ask Claude in Cowork to "snapshot the latest OEM partnership data" — Claude will regenerate `data.json`.
- Or manually update `data.json` and push to GitHub. The page picks up the change on next load.

## Optional: Claude-powered solution search

The dashboard ships with two solution-search modes:

- **Offline keyword + synonym matcher** (default). Works on any static host with no API key. Knows that "Rack Mount Firewall" relates to firewall / network security, "SIEM" to log management, etc. Synonyms are defined in the `SYNONYMS` object inside `index.html` — feel free to extend.
- **Claude semantic matching** (optional). Smarter, catches subtler matches. Requires deploying a backend.

To enable Claude:

1. Get an Anthropic API key at <https://console.anthropic.com>.
2. Deploy this folder to **Vercel** (recommended for the included `api/claude.js`):
   - Push to GitHub.
   - Sign up at <https://vercel.com>, "Import Project" from your GitHub repo.
   - In **Project Settings → Environment Variables**, add `ANTHROPIC_API_KEY = sk-ant-...`.
   - Redeploy. Your URL will be like `https://oem-dashboard.vercel.app`.
3. In `index.html`, set:
   ```js
   const CLAUDE_API_URL = "/api/claude";
   ```
   (or a full URL if your backend is on a different domain).
4. Push the change. The dashboard now uses Claude for solution search, falling back to the offline matcher on errors.

Cost is roughly **a few cents per 100 searches** with Claude Haiku.

## Adapting to Netlify or Cloudflare Workers

The `api/claude.js` shape is Vercel's. For Netlify, rename to `netlify/functions/claude.js` and adjust the `handler` signature. For Cloudflare Workers, the body of the function is identical but you'll use `request`/`Response` objects instead of `req`/`res`.

## Restrict access to your team

GitHub Pages on a public repo is public. To restrict access:

- **Private GitHub repo + Pages** — requires GitHub Pro / Team / Enterprise.
- **Vercel + password** — Vercel Pro lets you password-protect deployments.
- **Vercel + Cloudflare Access** — proper SSO if you have Google Workspace or similar.
- **Netlify Identity / Auth0** — add login to the static page.

Without one of these, anyone with the URL sees the data.

## Customising

- **Title / branding** — edit the `<h1>` and `<title>` in `index.html`.
- **HubSpot links** — edit the `HUBSPOT_HOST` and `ACCOUNT_ID` constants in `index.html`.
- **Stage labels / colours** — edit the `STAGES` array in `index.html`.
- **Synonyms** — extend the `SYNONYMS` map in `index.html` to make offline search smarter.

## Maintenance: refresh data on a schedule

If you want the snapshot to auto-refresh daily, add a GitHub Action that pulls fresh HubSpot data:

```yaml
# .github/workflows/refresh.yml
name: Refresh OEM data
on:
  schedule:
    - cron: "0 6 * * *"  # 06:00 UTC daily
  workflow_dispatch:
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Fetch from HubSpot
        env:
          HUBSPOT_TOKEN: ${{ secrets.HUBSPOT_PRIVATE_APP_TOKEN }}
        run: |
          # Use HubSpot's API to fetch tickets in pipeline 0 and write data.json
          # See https://developers.hubspot.com/docs/api/crm/tickets
          # (You'll need to write a small Node script — happy to help.)
      - name: Commit refreshed data
        run: |
          git config user.name "github-actions"
          git config user.email "actions@github.com"
          git add data.json
          git diff --staged --quiet || git commit -m "chore: refresh data $(date)"
          git push
```

Ask Claude in Cowork to write the actual fetch script if you want to enable this.
