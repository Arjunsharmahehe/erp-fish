# syntax=docker/dockerfile:1
FROM oven/bun:1.4.4 AS bun
FROM node:22-bookworm-slim AS dependencies
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile

FROM dependencies AS api
ENV NODE_ENV=production PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app/apps/api
# Install the Chromium revision matching the lockfile, not an unrelated system browser.
RUN bun x playwright install --with-deps chromium \
    && apt-get update && apt-get install -y --no-install-recommends xvfb xauth \
    && rm -rf /var/lib/apt/lists/*
COPY packages/shared /app/packages/shared
COPY apps/api/src /app/apps/api/src
COPY docker/api-entrypoint.sh /usr/local/bin/erp-fish-api
RUN mkdir -p /data/browser \
    && chown -R node:node /data \
    && chmod 755 /usr/local/bin/erp-fish-api
USER node
EXPOSE 3001
ENTRYPOINT ["/usr/local/bin/erp-fish-api"]

FROM dependencies AS web-build
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_TELEMETRY_DISABLED=1
COPY packages/shared /app/packages/shared
COPY apps/api/src /app/apps/api/src
COPY apps/web /app/apps/web
WORKDIR /app/apps/web
RUN bun run build

FROM node:22-bookworm-slim AS web
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=web-build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=web-build --chown=node:node /app/apps/web/public ./apps/web/public
COPY --from=web-build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
