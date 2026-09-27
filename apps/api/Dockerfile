# Cloud Run 部署 image（monorepo：從 repo 根目錄 build）
#   docker build -f apps/api/Dockerfile -t nba-api .
FROM node:20-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @nba/api...

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /repo /repo
COPY packages/shared packages/shared
COPY apps/api apps/api
WORKDIR /repo/apps/api
EXPOSE 8080
ENV PORT=8080
CMD ["pnpm", "start"]
