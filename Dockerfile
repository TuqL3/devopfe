
# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.12.0

# Stage 1: Dependencies
FROM node:${NODE_VERSION}-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

# Stage 2: Development
FROM deps AS development

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Stage 3: Build production assets
FROM deps AS build

COPY . .

RUN npm run build

# Stage 4: Production runtime
FROM nginxinc/nginx-unprivileged:stable-alpine AS production

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
