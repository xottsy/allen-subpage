# Allen VPN subscription page

Fork: https://github.com/xottsy/allen-subpage/tree/codex/device-antifraud

Based on https://github.com/remnawave/subscription-page at commit
`9045728e6e197a2581c6da40f4f92b170a8bad53` (version 8.0.1).
The original AGPL-3.0-only licence is retained in `LICENCE`.

Allen changes:

- HMAC-authenticated device checks against Allen core before fetching client configurations
  or rendering browser pages, including resolved legacy links and explicit client formats.
- Requests fail closed if the check fails, times out, redirects, or returns an invalid decision.
- A blocked native client receives HTTP 200 with exactly one inert loopback placeholder named
  “Подозрительная активность, обратитесь в ТП”, plus `announce` and a support URL. Base64/VLESS,
  Xray JSON, Mihomo/Clash and sing-box formats are supported. No real connection is returned.
  Browsers receive HTTP 403 with a dedicated support page and case reference; check failures
  return 503. Rendering of subscription names/announcements depends on the client.
- When connected, browser bootstrap never contains raw protocol keys, even if the upstream
  page configuration enables their display. Successful and denied responses forbid shared caching.
- At the owner's request, the previous dark frontend from commit 324c8df1c760 is restored.
  The newer backend with inert warning subscriptions is retained. Instructions, application
  URLs, languages and visibility settings still come from the panel; no Google Fonts request.
- Current temporary core policy automatically blocks only `http` (case-insensitive, including
  `https`) in User-Agent. Device inconsistencies, unusual Happ grammar, HWID problems and
  identifier rotation only notify while keeping access. Manual administrator decisions remain.
- A self-contained Docker build builds both frontend and backend from source.

## Configuration

Keep the upstream `REMNAWAVE_PANEL_URL`, `REMNAWAVE_API_TOKEN` and `TRUST_PROXY` configuration.
Set all three Allen variables to connect enforcement:

```dotenv
ALLEN_ANTIFRAUD_URL=https://core.example/keys/antifraud/check
ALLEN_ANTIFRAUD_SECRET=<random secret shared with Allen core, at least 32 characters>
ALLEN_SUPPORT_URL=https://t.me/your_support
ALLEN_BRAND_NAME=Allen VPN
ALLEN_ANTIFRAUD_TIMEOUT_MS=2000
```

The secret stays server-side and is never exposed to the frontend. Configure `TRUST_PROXY`
for the actual trusted proxy chain; bind this service to loopback or a private container network.
No valid device decisions are cached.

```sh
cd backend
npm ci --ignore-scripts
npm run typecheck
node --test scripts/test-antifraud.cjs
cd ../frontend
npm ci --ignore-scripts
npm run typecheck
npm run cb
cd ..
docker build -t allen-subpage:local .
```

## Required routing

The public subscription hostname must route **all** subscription formats to this fork.
Do not expose Remnawave's direct `/api/sub/*` routes, legacy aliases or alternative subscription
hosts to untrusted clients, or those requests can bypass the check. Restrict direct subscription
routes on the panel host to the fork's private source address and turn off CDN/shared caches.
Preserve the other panel API routes required by core and the administrative UI.

This gate controls future subscription downloads. It cannot attest physical hardware or revoke
configuration files that were previously downloaded. It does not disable the customer's whole key.
