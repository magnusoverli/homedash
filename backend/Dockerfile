FROM node:24-slim

# Add OCI labels for GitHub Container Registry linking
LABEL org.opencontainers.image.source="https://github.com/magnusoverli/homedash"
LABEL org.opencontainers.image.description="HomeDash - A modern home dashboard application (Backend API)"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.title="HomeDash Backend"
LABEL org.opencontainers.image.vendor="magnusoverli"

WORKDIR /app

# Install ALL system dependencies in one layer for better caching
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    tzdata \
    wget \
    gosu \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user early (before file copies)
RUN groupadd -r nodejs && useradd -r -g nodejs backend

# Copy package files first (leverage cache when code changes)
COPY backend/package*.json ./

# Install dependencies (all for development support)
RUN npm ci && npm cache clean --force

# Copy shared utilities (to parent of app directory)
COPY shared/ /shared/

# Copy backend application code
COPY backend/ .

# Change ownership of app and shared directories
RUN chown -R backend:nodejs /app && \
    chown -R backend:nodejs /shared

# Create entrypoint script to fix volume permissions
RUN echo '#!/bin/sh\n\
mkdir -p /app/data\n\
chown -R backend:nodejs /app/data\n\
exec gosu backend:nodejs "$@"' > /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Use entrypoint to fix permissions then drop to backend user
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
