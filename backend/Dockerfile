FROM node:20-alpine

# Add OCI labels for GitHub Container Registry linking
LABEL org.opencontainers.image.source="https://github.com/magnusoverli/homedash"
LABEL org.opencontainers.image.description="HomeDash - A modern home dashboard application (Backend API)"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.title="HomeDash Backend"
LABEL org.opencontainers.image.vendor="magnusoverli"

WORKDIR /app

# Install timezone data
RUN apk add --no-cache tzdata

# Copy package files
COPY package*.json ./

# Install dependencies (all for development support)
RUN npm ci && npm cache clean --force

# Copy application code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S backend -u 1001

# Change ownership
RUN chown -R backend:nodejs /app

# Switch to non-root user
USER backend

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the application
CMD ["node", "server.js"]