# ナレッジWS を Cloud Run で動かすためのコンテナ定義（Next.js standalone）。
# ビルドは Cloud Build（gcloud run deploy --source）が行うため、手元にDockerは不要。

# --- ビルド段階 ---
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- 実行段階（最小イメージ） ---
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Cloud Run は 0.0.0.0 で待ち受ける必要がある。PORT は Cloud Run が渡す（既定8080）。
ENV HOSTNAME=0.0.0.0
ENV PORT=8080
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 8080
CMD ["node", "server.js"]
