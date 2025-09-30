# Agent Development Guide for HomeDash

## CRITICAL: Design Manual Compliance

**The design_manual.md is PARAMOUNT and must be followed at ALL times. Every UI change, component update, and styling decision MUST adhere to the design manual specifications.**

## MANDATORY: Docker Compose Usage

**ALL testing and deployment MUST be done using Docker Compose. Never use standalone npm commands for testing or deployment of the full application. The application is designed to run as containerized services with proper networking and dependencies.**

## Build & Test Commands

**Primary Commands (Use Docker Compose):**

- `docker-compose up` - Start all services in development mode
- `docker-compose up -d` - Start all services in detached mode (production)
- `docker-compose up --build` - Rebuild and start all services
- `docker-compose down` - Stop all services
- `docker-compose logs -f` - View live logs from all services

**Individual Service Commands (Only for isolated development):**

- `npm run dev` - Start development server with Vite (frontend only)
- `npm run build` - Production build (frontend only)
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

## Shared Components Library

### Icon Components (`src/components/icons/`)

All SVG icons are centralized in reusable components. Always use these instead of inline SVGs.

**Available Icons:**
- `CloseIcon` - X/close icon for modals and dismissible elements
- `LoadingSpinner` - Animated loading spinner with SVG animation
- `TrashIcon` - Delete/trash icon for destructive actions
- `UploadIcon` - Upload/cloud upload icon for file uploads
- `BackArrowIcon` - Back/left arrow icon for navigation
- `WarningIcon` - Warning/alert triangle icon for errors and confirmations
- `CheckmarkIcon` - Checkmark/success icon for successful states
- `PlusIcon` - Plus/add icon for add buttons and actions
- `SettingsIcon` - Settings/gear icon for settings access

**Usage:**
```jsx
import { CloseIcon, LoadingSpinner } from '../components/icons';

<CloseIcon size={24} color="currentColor" className="custom-class" />
<LoadingSpinner size={40} />
```

**Props:**
- `size` (number): Icon size in pixels (default: 24)
- `color` (string): Icon color (default: 'currentColor')
- `className` (string): Additional CSS classes

### UI Components

#### Button Component
Standardized button with consistent styling and variants.

```jsx
import Button from '../components/Button';

<Button variant="primary" onClick={handleSave}>Save</Button>
<Button variant="secondary" onClick={handleCancel}>Cancel</Button>
<Button variant="danger" icon={<TrashIcon size={16} />}>Delete</Button>
```

**Variants:** primary, secondary, danger, danger-confirm, danger-advanced  
**Sizes:** small, medium (default), large

#### LoadingState Component
Standardized loading state with spinner and message.

```jsx
import LoadingState from '../components/LoadingState';

<LoadingState text="Loading data..." spinnerSize={40} />
```

#### ErrorState Component
Standardized error state with icon, message, and optional retry.

```jsx
import ErrorState from '../components/ErrorState';

<ErrorState
  title="Something went wrong"
  message={error}
  onRetry={handleRetry}
/>
```

#### EmptyState Component
Standardized empty state for empty lists or no data scenarios.

```jsx
import EmptyState from '../components/EmptyState';

<EmptyState
  icon="📭"
  title="No items found"
  message="Add your first item to get started"
  onAction={handleAdd}
  actionText="Add Item"
/>
```

### Utility Functions

#### File Validation (`src/utils/fileValidation.js`)

```jsx
import { validateImageFile, formatFileSize } from '../utils/fileValidation';

const validation = validateImageFile(file, 5); // 5MB max
if (!validation.valid) {
  showError(validation.error);
  return;
}
```

**Available Functions:**
- `validateImageFile(file, maxSizeMB)` - Validate image files
- `validateFile(file, allowedTypes, maxSizeMB)` - Validate any file type
- `formatFileSize(bytes)` - Format bytes to human-readable string
- `isImageFile(file)` - Check if file is an image
- `getFileExtension(filename)` - Get file extension

#### Error Handling (`src/utils/errorUtils.js`)

```jsx
import { getApiErrorMessage } from '../utils/errorUtils';

try {
  // API call
} catch (error) {
  showError(getApiErrorMessage(error));
}
```

**Available Functions:**
- `getApiErrorMessage(error, response)` - Get user-friendly error message
- `getHttpStatusMessage(statusCode)` - Get HTTP status message
- `isNetworkError(error)` - Check if error is network-related
- `isTimeoutError(error)` - Check if error is timeout-related
- `formatErrorForLogging(error, context)` - Format error for logging
- `handleAsyncError(operation, errorCallback, context)` - Error handler wrapper

## Anthropic API Integration

### Official Documentation

**Reference**: [Anthropic API Overview](https://docs.anthropic.com/en/api/overview)

All Anthropic API integration must follow the official documentation. Key requirements:

### Authentication

- **Header Required**: `x-api-key` with your API key
- **Content Type**: `application/json` for all requests
- **API Version**: `anthropic-version: 2023-06-01` (current stable version)

### API Endpoints Used

1. **Messages API**: `POST https://api.anthropic.com/v1/messages`
   - Primary endpoint for Claude conversations
   - Used for API key validation and actual LLM interactions

2. **Models API**: `GET https://api.anthropic.com/v1/models`
   - Fetches available Claude models dynamically
   - Returns current model list with capabilities

### Request Size Limits

- **Standard endpoints** (Messages, Models): 32 MB maximum
- **Files API**: 500 MB maximum
- **Batch API**: 256 MB maximum

### Current Claude Models (Examples)

Based on official documentation, current models include:

- `claude-opus-4-1-20250805` - Most capable model
- `claude-sonnet-4-20250514` - Balanced performance
- `claude-3-5-sonnet-20241022` - High-level capabilities
- `claude-3-5-haiku-20241022` - Fastest response times

### API Integration Best Practices

- **Always use timeouts**: 10s for validation, 30s for messages
- **Handle all HTTP status codes**: 401 (auth), 400 (bad request), 500 (server error)
- **No fallback data**: API failures should surface as errors, not masked with cached data
- **Proxy through backend**: Never expose API keys in frontend code

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
  - Frontend: `http://localhost:3000` (or custom port via docker-compose)
  - Backend API: `http://localhost:3001` (fixed port)
- **Dynamic API URL Detection**: 
  - The frontend automatically detects the backend URL at runtime using `window.location.protocol` and `window.location.hostname`
  - Works on any port mapping (e.g., `3000:3000`, `3030:3000`, `8080:3000`)
  - Backend must always be accessible on port 3001 of the same hostname

### Backend Proxy Features

The backend proxy (`backend/server.js`) provides secure API integration following [Anthropic API documentation](https://docs.anthropic.com/en/api/overview):

1. **API Key Validation** (`POST /api/test-key`)
   - Validates Anthropic API keys using Messages API endpoint
   - Returns `{ valid: true/false, message: "..." }`
   - 10-second timeout with proper error handling
   - No fallback - real validation only

2. **Dynamic Model Discovery** (`POST /api/models`)
   - Fetches available Claude models from `https://api.anthropic.com/v1/models`
   - Returns `{ models: [...] }` with current model list
   - 10-second timeout, no hardcoded fallback models
   - Proper error responses for API failures

3. **Message Proxying** (`POST /api/messages`)
   - Forwards requests to `https://api.anthropic.com/v1/messages`
   - Handles authentication headers (`x-api-key`, `anthropic-version`)
   - 30-second timeout for LLM responses
   - Streams responses back to frontend

4. **Health Check** (`GET /api/health`)
   - Used by Docker health checks
   - Returns `{ status: 'ok', timestamp: '...' }`

5. **Family & Activity Data APIs**
   - SQLite database operations for family members and activities
   - Settings management for application configuration

### Security Considerations

1. **Non-root Users**: Both containers run as non-root users
2. **API Key Handling**: API keys are never stored on the server, passed through from frontend
3. **CORS Configuration**: Properly configured for production/development environments
4. **Health Checks**: Automatic container restart on failure
5. **Access Control**: Optional password protection for UI access (see Access Control section below)

### Access Control (Optional)

HomeDash supports optional password protection for the entire UI. This is controlled by a single environment variable that both enables/disables the feature and serves as the password.

#### How It Works

1. **Disabled by Default**: If `ACCESS_PASSWORD` is not set, the UI is accessible without any authentication
2. **Enable with Password**: Set `ACCESS_PASSWORD` in docker-compose.yml to enable protection
3. **Session-Based**: Uses secure tokens that are valid until server restart
4. **Automatic Detection**: Frontend automatically detects if auth is required

#### Setup

In `docker-compose.yml`, uncomment and set the `ACCESS_PASSWORD` variable:

```yaml
environment:
  - NODE_ENV=production
  - PORT=3001
  - TZ=Europe/Oslo
  - ACCESS_PASSWORD=your_secure_password_here
```

#### How Authentication Works

1. **Backend**: 
   - Checks for `ACCESS_PASSWORD` environment variable
   - If set, requires `x-access-token` header on all API requests (except health, auth status, and login endpoints)
   - Issues session tokens on successful password validation
   - Tokens are stored in-memory (cleared on server restart)

2. **Frontend**:
   - On load, checks `/api/auth/status` to see if auth is required
   - If required, shows login screen before rendering the app
   - Stores token in localStorage after successful login
   - Automatically includes token in all API requests via `x-access-token` header

3. **Endpoints**:
   - `GET /api/auth/status` - Check if access control is enabled (no auth required)
   - `POST /api/auth/login` - Login with password, returns session token (no auth required)
   - `POST /api/auth/logout` - Invalidate session token
   - All other endpoints - Require valid `x-access-token` header if access control is enabled

#### Security Notes

- Tokens are in-memory only (lost on server restart, requiring re-login)
- This is a simple protection mechanism suitable for trusted networks
- For internet-facing deployments, consider adding HTTPS and more robust authentication
- Password is set in plain text in docker-compose (use secrets or env files for better security)

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

#### Anthropic API Issues

Common LLM integration problems and solutions:

1. **API Key Validation Fails**:

   ```bash
   # Test API key validation
   curl -X POST http://localhost:3001/api/test-key \
     -H "Content-Type: application/json" \
     -d '{"apiKey":"your-api-key-here"}'
   ```

   - Check for `ETIMEDOUT` errors indicating network issues
   - Verify API key format (should start with `sk-ant-`)
   - Ensure no proxy/firewall blocking `api.anthropic.com`

2. **Models Not Loading**:

   ```bash
   # Test model fetching
   curl -X POST http://localhost:3001/api/models \
     -H "Content-Type: application/json" \
     -d '{"apiKey":"your-api-key-here"}'
   ```

   - Should return `{ models: [...] }` with no fallback data
   - If fails, check Anthropic API status and network connectivity

3. **Message API Timeouts**:
   - Default 30-second timeout for LLM responses
   - Check backend logs for `AbortError` indicating timeouts
   - Network issues may require longer timeouts or retry logic

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

## Git Commit Guidelines

### Default Commit Behavior

**IMPORTANT**: When asked to "commit changes" or similar, you MUST commit ALL changes in the repository, not just the ones worked on in the current session, unless explicitly told otherwise by the user.

### Commit Process

1. **Always check status first**:

   ```bash
   git status
   git diff --stat  # Review all changes
   ```

2. **Stage ALL changes by default**:

   ```bash
   git add -A  # Stages all changes (new, modified, deleted files)
   ```

3. **Write descriptive commit messages**:
   - First line: brief summary (50 chars or less)
   - Blank line
   - Detailed explanation of changes if needed
   - Use conventional commit format (feat:, fix:, docs:, etc.)

4. **Example commit workflow**:

   ```bash
   # Check what has changed
   git status
   git diff --stat

   # Stage everything
   git add -A

   # Commit with descriptive message
   git commit -m "feat: add feature X and update configurations

   - Added new component for feature X
   - Updated Docker configuration for better networking
   - Fixed bug in existing component Y
   - Updated documentation"
   ```

### Exceptions

Only commit partial changes when the user explicitly requests it, such as:

- "Commit only the homework changes"
- "Don't include the Docker files in the commit"
- "Stage and commit just the frontend changes"

In these cases, use selective staging:

```bash
git add [specific files or directories]
git commit -m "message"
```
