# Agent Development Guide for HomeDash

## CRITICAL: Design Manual Compliance

**The design_manual.md is PARAMOUNT and must be followed at ALL times. Every UI change, component update, and styling decision MUST adhere to the design manual specifications.**

## Build & Test Commands

- `npm run dev` - Start development server with Vite
- `npm run build` - Production build
- `npm run lint` - Run ESLint checks
- `npm run format` - Auto-format with Prettier
- `npm test` - Run all tests with Vitest
- `npm run test -- path/to/test.jsx` - Run single test file
- `npm run test:watch` - Run tests in watch mode
- `npm run typecheck` - Type checking (TypeScript/JSDoc)

## Code Style Guidelines

- **Framework**: React 19 with Vite, using JSX (not TypeScript)
- **Imports**: Use ES6 modules, React imports at top, components next, then styles
- **Formatting**: Prettier config: single quotes, semicolons, 2-space indent, 80-char lines
- **Components**: Functional components only, export default at end of file
- **Testing**: Vitest + React Testing Library, test files in `__tests__` folders
- **File Structure**: Components in `src/components/`, styles in `src/styles/`
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Error Handling**: Use try-catch blocks, console.error for debugging
- **Accessibility**: Include proper ARIA labels, semantic HTML, keyboard navigation

## Docker Deployment

### Architecture

The HomeDash application is deployed using Docker Compose with two services:

1. **homedash-app** (Frontend) - React application served on port 3000
2. **homedash-backend** (Backend Proxy) - Express server handling Anthropic API communication on port 3001

### Quick Start

#### Production Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

#### Development Mode

The `docker-compose.override.yml` file automatically configures development settings:

```bash
# Start in development mode (with hot reload for backend)
docker-compose up

# Rebuild after dependency changes
docker-compose up --build
```

### Configuration

#### Environment Variables

Create a `.env` file in the root directory:

```env
# API URL for frontend to connect to backend
VITE_API_URL=http://localhost:3001

# Backend configuration
NODE_ENV=production
PORT=3001
```

#### Service Communication

- **Internal Network**: Services communicate via `homedash-network` bridge network
- **Frontend → Backend**: Uses `http://homedash-backend:3001` internally
- **External Access**:
  - Frontend: `http://localhost:3000`
  - Backend API: `http://localhost:3001`

### Backend Proxy Features

The backend proxy (`backend/server.js`) provides:

1. **API Key Validation** (`/api/test-key`)
   - Validates Anthropic API keys
   - Checks for authentication and credit availability

2. **Model Discovery** (`/api/models`)
   - Returns available Claude models
   - Validates API key before returning models

3. **Message Proxying** (`/api/messages`)
   - Forwards requests to Anthropic API
   - Handles authentication headers
   - Returns responses to frontend

4. **Health Check** (`/api/health`)
   - Used by Docker health checks
   - Returns server status

### Security Considerations

1. **Non-root Users**: Both containers run as non-root users
2. **API Key Handling**: API keys are never stored on the server, passed through from frontend
3. **CORS Configuration**: Properly configured for production/development environments
4. **Health Checks**: Automatic container restart on failure

### Troubleshooting

#### Backend Connection Issues

If the frontend cannot connect to the backend:

1. Check both services are running:

   ```bash
   docker-compose ps
   ```

2. Verify health status:

   ```bash
   docker-compose ps | grep healthy
   ```

3. Check backend logs:

   ```bash
   docker-compose logs homedash-backend
   ```

4. Test backend directly:
   ```bash
   curl http://localhost:3001/api/health
   ```

#### CORS Errors

The backend automatically configures CORS based on `NODE_ENV`:

- **Production**: Allows `localhost:3000` and internal Docker network
- **Development**: Allows `localhost:5173` (Vite dev server) and `localhost:3000`

#### Rebuilding After Changes

```bash
# Rebuild specific service
docker-compose build homedash-backend

# Rebuild all services
docker-compose build

# Force rebuild with no cache
docker-compose build --no-cache
```

### Production Deployment Checklist

- [ ] Set `NODE_ENV=production` in environment
- [ ] Configure `VITE_API_URL` to match your domain
- [ ] Use reverse proxy (nginx/traefik) for SSL termination
- [ ] Set up monitoring for health endpoints
- [ ] Configure restart policies
- [ ] Set resource limits if needed
- [ ] Implement log rotation

### Docker Commands Reference

```bash
# View running containers
docker-compose ps

# Stream logs
docker-compose logs -f [service-name]

# Execute command in container
docker-compose exec homedash-backend sh

# Restart specific service
docker-compose restart homedash-backend

# Remove all containers and networks
docker-compose down

# Remove all including volumes
docker-compose down -v
```
