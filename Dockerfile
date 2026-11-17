# Build Stage 1

FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

# Copy the manifest, the lockfile and the pnpm settings (pnpm-workspace.yaml for pnpm 10 and later, .npmrc for older releases)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# Install exactly what the lockfile records
RUN pnpm install --frozen-lockfile

# Copy the entire project
COPY . ./

# Build the project
RUN pnpm run build

# Build Stage 2

FROM node:22-alpine
WORKDIR /app

# Only `.output` folder is needed from the build stage
COPY --from=build /app/.output/ ./

# Change the port and host
ENV PORT=80
ENV HOST=0.0.0.0

EXPOSE 80

CMD ["node", "/app/server/index.mjs"]
