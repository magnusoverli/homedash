# HomeDash Backend

This is the backend proxy server for HomeDash's LLM integration features.

## Purpose

The backend server provides a proxy layer between the frontend and the Anthropic API to:

- Handle CORS restrictions (browser security prevents direct API calls)
- Validate API keys securely
- Proxy requests to Anthropic's Claude models
- Provide a list of available models

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file (optional):

```bash
cp .env.example .env
```

3. Start the server:

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:3001` by default.

## API Endpoints

### Health Check

- **GET** `/api/health`
- Returns server status

### Test API Key

- **POST** `/api/test-key`
- Body: `{ "apiKey": "sk-ant-..." }`
- Returns: `{ "valid": true/false, "message": "..." }`

### Get Available Models

- **POST** `/api/models`
- Body: `{ "apiKey": "sk-ant-..." }`
- Returns: `{ "models": [...], "valid": true/false }`

### Proxy Messages (for future LLM features)

- **POST** `/api/messages`
- Body: `{ "apiKey": "sk-ant-...", ...anthropicMessageData }`
- Proxies requests to Anthropic's messages API

## Development

The server uses:

- Express.js for the web framework
- CORS middleware for cross-origin requests
- node-fetch for making HTTP requests to Anthropic
- dotenv for environment variables

## Deployment

The backend can be deployed to:

- Heroku
- Railway
- Render
- DigitalOcean App Platform
- Any Node.js hosting service

Make sure to set the `PORT` environment variable if required by your hosting platform.
