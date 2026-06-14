FROM node:20-alpine AS base
RUN npm i -g pnpm@10

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend
RUN pnpm --filter @officeping/shared build
RUN pnpm --filter @officeping/backend build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN npm i -g pnpm@10
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --prod --frozen-lockfile
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
EXPOSE 3000
CMD ["sh", "-c", "pnpm --filter @officeping/backend run migration:run:prod && node apps/backend/dist/main.js"]
