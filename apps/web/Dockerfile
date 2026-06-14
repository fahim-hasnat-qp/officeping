FROM node:20-alpine AS build
RUN npm i -g pnpm@10
WORKDIR /app

# Copy workspace manifests and lockfile
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/

# Install — pnpm symlinks stay intact inside this single layer
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

ARG VITE_API_URL=""
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_VAPID_PUBLIC_KEY=""
ARG VITE_DEMO_MODE="true"
ENV VITE_API_URL=$VITE_API_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID \
    VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY \
    VITE_DEMO_MODE=$VITE_DEMO_MODE

RUN pnpm --filter @officeping/shared build && pnpm --filter @officeping/web build

FROM nginx:alpine AS runtime
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
