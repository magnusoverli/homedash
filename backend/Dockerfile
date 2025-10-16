FROM node:20-slim

# Add OCI labels for GitHub Container Registry linking
LABEL org.opencontainers.image.source="https://github.com/magnusoverli/homedash"
LABEL org.opencontainers.image.description="HomeDash - A modern home dashboard application (Backend API)"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.title="HomeDash Backend"
LABEL org.opencontainers.image.vendor="magnusoverli"

WORKDIR /app

# Install timezone data and wget for health checks
RUN apt-get update && apt-get install -y tzdata wget && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY backend/package*.json ./

# Install dependencies (all for development support)
RUN npm ci && npm cache clean --force

# Copy shared utilities first (to parent of app directory)
COPY shared/ /shared/

# Copy backend application code
COPY backend/ .

# Create non-root user for security
RUN groupadd -r nodejs && useradd -r -g nodejs backend

# Create data directory and change ownership
RUN mkdir -p /app/data && \
    chown -R backend:nodejs /app && \
    chown -R backend:nodejs /shared

# Switch to non-root user
USER backend

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
