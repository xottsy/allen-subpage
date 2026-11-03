FROM node:24-bookworm-slim AS frontend-build
WORKDIR /build
RUN npm install --global npm@12.2.1 --no-audit --no-fund
COPY frontend/package*.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY frontend/ .
RUN npm run typecheck && npm run cb

FROM node:24-bookworm-slim AS backend-build
WORKDIR /opt/app
RUN npm install --global npm@12.2.1 --no-audit --no-fund

COPY backend/package*.json ./
COPY backend/tsconfig.json ./
COPY backend/tsconfig.build.json ./

RUN npm ci --ignore-scripts --no-audit --no-fund

COPY backend/ .

RUN npm run typecheck && node --test scripts/test-antifraud.cjs && npm run build \
    && npm run trace

FROM node:24-bookworm-slim
WORKDIR /opt/app

LABEL org.opencontainers.image.title="Allen VPN Subscription Page"
LABEL org.opencontainers.image.description="Allen VPN subscription page with device checks"
LABEL org.opencontainers.image.url="https://github.com/xottsy/allen-subpage"
LABEL org.opencontainers.image.source="https://github.com/xottsy/allen-subpage"
LABEL org.opencontainers.image.vendor="Allen VPN; based on Remnawave"
LABEL org.opencontainers.image.licenses="AGPL-3.0"
LABEL org.opencontainers.image.documentation="https://docs.rw"


RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY --from=backend-build /opt/app/dist ./dist

COPY --from=frontend-build /build/dist/ ./frontend/
COPY backend/ecosystem.config.js ./
COPY backend/docker-entrypoint.sh ./

ENV PM2_DISABLE_VERSION_CHECK=true
ENV NODE_OPTIONS="--max-old-space-size=16384"

RUN npm install pm2 -g \
&& rm -rf /usr/local/lib/node_modules/npm \
        /usr/local/lib/node_modules/corepack \
        /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
        /usr/local/include/node

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --start-interval=2s --retries=3 \
    CMD curl -fsS -o /dev/null --max-time 2 "http://127.0.0.1:${APP_PORT:-3010}/internal/health" || exit 1

ENTRYPOINT [ "/bin/sh", "docker-entrypoint.sh" ]

CMD [ "pm2-runtime", "start", "ecosystem.config.js", "--env", "production" ]
