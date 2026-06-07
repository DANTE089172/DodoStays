# Multi-stage Dockerfile for DodoStays Next.js frontend
# Optimized for production using standalone output mode (~150MB final image)

# ==========================================
# Stage 1: Install dependencies
# ==========================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install libc6-compat for Next.js binary compatibility on Alpine
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with --legacy-peer-deps (required for MUI v6 peer dep mismatches)
RUN npm ci --legacy-peer-deps --omit=dev

# ==========================================
# Stage 2: Build the application
# ==========================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Build-time environment variables
# These NEXT_PUBLIC_* vars are inlined into the JS bundle at build time
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:5080
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

ARG NEXT_PUBLIC_MAPBOX_TOKEN=
ENV NEXT_PUBLIC_MAPBOX_TOKEN=${NEXT_PUBLIC_MAPBOX_TOKEN}

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Build the Next.js application (generates standalone output)
RUN npm run build

# ==========================================
# Stage 3: Production runtime
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install libc6-compat for runtime compatibility
RUN apk add --no-cache libc6-compat

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nextjs

# Copy public assets
COPY --from=build /app/public ./public

# Copy standalone build output (Next.js creates this with output: 'standalone')
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static assets (required for client-side hydration)
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy i18n message files (next-intl needs these at runtime)
COPY --from=build --chown=nextjs:nodejs /app/messages ./messages

# Switch to non-root user
USER nextjs

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Expose the application port
EXPOSE 3000

# Health check to ensure the container is ready
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

# Start the Next.js server (standalone mode uses server.js)
CMD ["node", "server.js"]
