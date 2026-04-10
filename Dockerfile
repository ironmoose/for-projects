FROM oven/bun:1.3.4 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Build web assets — only copy what vite needs (@domain types + web source)
FROM base AS build
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY tsconfig.json ./
COPY src/domain/ src/domain/
COPY src/web/ src/web/
RUN cd src/web && bun x vite build

# Runtime
FROM base
COPY --from=deps /app/node_modules node_modules/
COPY --from=build /app/src/web/dist src/web/dist/
COPY package.json ./
COPY src/ src/

# Run as non-root user (bun user is built into oven/bun base image)
RUN mkdir -p /app/data && chown -R bun:bun /app/data
USER bun

ENV PM_HOST=0.0.0.0
ENV PM_PORT=3000
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
