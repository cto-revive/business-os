FROM node:22.13.0-bookworm-slim AS build

WORKDIR /app
ENV COREPACK_HOME=/corepack

# Keep the package-manager version aligned with package.json and pnpm-lock.yaml.
RUN npm install --global --force pnpm@11.24.0

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build
RUN pnpm prune --prod

FROM node:22.13.0-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    WEB_PORT=3000 \
    API_PORT=3001

COPY --from=build /app ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "tooling/healthcheck.mjs"]

CMD ["node", "tooling/start-production.mjs"]
