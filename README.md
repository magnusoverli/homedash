# HomeDash Web Application

A modern web application built with React and Vite, following the HomeDash Design System.

## Features

- **Sticky Header**: Navigation header with brand logo and settings icon
- **Responsive Design**: Mobile-first approach with responsive layouts
- **HomeDash Design System**: Complete implementation of the design manual
- **Docker Ready**: Production-optimized Docker deployment
- **Modern Stack**: React 18 + Vite for fast development and builds

## Quick Start with Docker

### Prerequisites
- Docker
- Docker Compose

### Deployment

1. Clone or extract this project
2. Navigate to the project directory
3. Build and start the application:

```bash
docker-compose up --build -d
```

The application will be available at `http://localhost:3000`

### Management Commands

```bash
# View logs
docker-compose logs -f homedash-app

# Stop the application
docker-compose down

# Restart the application
docker-compose restart homedash-app

# Rebuild and restart
docker-compose up --build -d
```

## Development

If you want to run the application in development mode:

```bash
cd homedash-app
npm install
npm run dev
```

## Design System

This application follows the HomeDash Design System specifications:

- **Colors**: Purple-based color palette (#6704FF primary)
- **Typography**: Sans Display family with multiple weights
- **Grid**: 48×48px base grid with 5px corner radius system
- **Components**: Card-based layout with consistent spacing
- **Accessibility**: WCAG compliant with proper focus states

## Architecture

- **Frontend**: React 18 with Vite
- **Styling**: CSS with CSS custom properties
- **Deployment**: Multi-stage Docker build
- **Server**: Serve (static file server)
- **Container**: Alpine Linux for minimal footprint

## Project Structure

```
homedash-app/
├── src/
│   ├── components/          # React components
│   │   ├── Header.jsx      # Sticky header component
│   │   ├── Header.css      # Header styles
│   │   ├── MainPage.jsx    # Main page component
│   │   ├── MainPage.css    # Main page styles
│   │   └── SettingsIcon.jsx # Settings icon component
│   ├── styles/
│   │   └── globals.css     # Global styles and design system
│   ├── App.jsx            # Main application component
│   └── index.css          # Base styles
├── Dockerfile             # Multi-stage production build
└── .dockerignore         # Docker ignore patterns
```

## Health Monitoring

The application includes health checks that verify the service is running correctly. Check the container health with:

```bash
docker-compose ps
```