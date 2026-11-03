# Allen VPN subscription page

Fork: https://github.com/xottsy/allen-subpage/tree/codex/device-antifraud

Based on https://github.com/remnawave/subscription-page at commit
`9045728e6e197a2581c6da40f4f92b170a8bad53` (version 8.0.1).
The original AGPL-3.0-only licence is retained in `LICENCE`.

Allen changes:

- HMAC-authenticated device checks against Allen core before fetching client configurations
  or rendering browser pages, including resolved legacy links and explicit client formats.
- Requests fail closed if the check fails, times out, redirects, or returns an invalid decision.
- A blocked device receives HTTP 403, an `announce` header and a support URL. Browsers receive
  a dedicated support page with a case reference. How a native application displays an HTTP
  error or `announce` depends on that application's support; no real connection is returned.
- When connected, browser bootstrap never contains raw protocol keys, even if the upstream
  page configuration enables their display. Successful and denied responses forbid shared caching.
- Allen page layout and branding; system font fallbacks without Google Fonts requests.
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
