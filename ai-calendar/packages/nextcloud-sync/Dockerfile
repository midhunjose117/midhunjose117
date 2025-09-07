FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json turbo.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/nextcloud-sync/package.json packages/nextcloud-sync/package.json
RUN npm i -g turbo && npm ci --ignore-scripts

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/packages/nextcloud-sync/dist ./dist
COPY --from=build /app/packages/nextcloud-sync/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3002
CMD ["node", "dist/index.js"]

