# Multi-stage build for optimized production image
FROM node:24-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build the application without setting VITE_API_URL to enable dynamic detection
RUN npm run build

# Production stage
FROM node:24-slim AS production

# Add OCI labels for GitHub Container Registry linking
LABEL org.opencontainers.image.source="https://github.com/magnusoverli/homedash"
LABEL org.opencontainers.image.description="HomeDash - A modern home dashboard application (Frontend)"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.title="HomeDash App"
LABEL org.opencontainers.image.vendor="magnusoverli"

WORKDIR /app

# Install timezone data and serve to serve the static files
RUN apt-get update && apt-get install -y tzdata && rm -rf /var/lib/apt/lists/* && \
    npm install -g serve

# Create non-root user for security
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs homedash

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Change ownership of the app directory
RUN chown -R homedash:nodejs /app

# Switch to non-root user
USER homedash

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start the application - serve on default 0.0.0.0:3000
CMD ["serve", "-s", "dist", "-p", "3000"]