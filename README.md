# HomeDash - Family Activity Management System

A comprehensive family activity management application with intelligent school schedule extraction, Spond sports integration, and AI-powered family coordination tools.

## 🎯 Overview

HomeDash is a modern React-based family dashboard that helps families manage schedules, activities, homework, and sports team coordination. It features AI-powered school schedule extraction from images, Spond API integration for sports activities, and a beautiful design system optimized for family use.

## ✨ Key Features

### 📅 Family Activity Management

- **Multi-member support**: Add and manage multiple family members with color-coded organization
- **Activity scheduling**: Create, edit, and manage activities for each family member
- **Week-based navigation**: Intuitive week selector for viewing family schedules
- **Activity types**: Support for manual activities, school schedules, and sports events

### 🤖 AI-Powered School Schedule Extraction

- **Image-to-schedule conversion**: Upload school timetable images and extract structured schedule data
- **Anthropic Claude integration**: Advanced AI vision capabilities for accurate text extraction
- **Bulk schedule import**: Automatically create recurring school activities for the entire academic year
- **Homework extraction**: Extract homework assignments from school plan images

### ⚽ Sports Team Integration (Spond)

- **Spond API integration**: Connect to sports teams and automatically sync activities
- **Group management**: Select which sports groups to sync for each family member
- **Event synchronization**: Import training sessions, matches, and team events
- **Authentication management**: Secure credential storage with token lifecycle tracking

### 🎨 Design System

- **HomeDash Design Manual compliance**: Consistent purple-based color palette (#6704FF)
- **Responsive design**: Mobile-first approach with elegant desktop layouts
- **Grid-based layout**: 48×48px base grid with 5px corner radius system
- **Accessibility**: WCAG compliant with proper focus states and keyboard navigation

### 🔧 Technical Features

- **React 19**: Latest React features with modern development practices
- **TypeScript/JSDoc**: Type safety and enhanced development experience
- **Vite**: Lightning-fast development and optimized production builds
- **Docker deployment**: Production-ready containerized deployment
- **SQLite database**: Lightweight, reliable data storage
- **Express.js backend**: Secure API proxy and data management

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Prerequisites**
   - Docker
   - Docker Compose

2. **Portable Deployment** (Works on any system)

   ```bash
   # Clone the repository
   git clone <repository-url>
   cd homedash2

   # Start the application (automatically detects your system's IP/hostname)
   docker-compose up -d

   # Access the application
   # Local: http://localhost:3000
   # Network: http://<your-system-ip>:3000
   ```

   **The application automatically detects your hostname/IP** - no configuration needed!

3. **Advanced Deployment Options**

   **Standard deployment (automatic hostname detection):**

   ```bash
   docker-compose up -d
   ```

   **Custom API URL (for reverse proxies, custom domains):**

   ```bash
   # Edit docker-compose.custom.yml to set your custom VITE_API_URL
   docker-compose -f docker-compose.yml -f docker-compose.custom.yml up -d
   ```

   **Production deployment:**

   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

## 🌐 Network Access & Deployment

### Automatic Hostname Detection

The application is designed for **zero-configuration deployment**:

- **Local access**: `http://localhost:3000`
- **Network access**: `http://<server-ip>:3000`
- **Domain access**: `http://yourdomain.com:3000`

The frontend automatically detects the hostname you're using and configures the API calls accordingly. This means:

✅ **Works out of the box** on any Docker-enabled system  
✅ **No IP configuration needed**  
✅ **Portable across different environments**  
✅ **Scales from localhost to production**

### Deployment Examples

| Scenario          | Access URL                            | Configuration                   |
| ----------------- | ------------------------------------- | ------------------------------- |
| Local development | `http://localhost:3000`               | `docker-compose up -d`          |
| Home server       | `http://192.168.1.100:3000`           | `docker-compose up -d`          |
| Cloud server      | `http://your-server-ip:3000`          | `docker-compose up -d`          |
| Custom domain     | `http://homedash.yourdomain.com:3000` | `docker-compose up -d`          |
| Reverse proxy     | `https://homedash.yourdomain.com`     | Use `docker-compose.custom.yml` |

2. **Legacy: Deploy the application**

   ```bash
   # Clone the repository
   git clone <repository-url>
   cd homedash2

   # Start all services
   docker-compose up --build -d
   ```

3. **Access the application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:3001`

### Development Setup

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
npm run backend:install

# Start both frontend and backend in development mode
npm run dev:all
```

**Development URLs:**

- Frontend (Vite): `http://localhost:5173`
- Backend API: `http://localhost:3001`

## 🏗️ Architecture

### Frontend (React 19 + Vite)

```
src/
├── components/              # React components
│   ├── Header.jsx          # Main navigation header
│   ├── MainPage.jsx        # Family dashboard main view
│   ├── PersonCard.jsx      # Individual family member cards
│   ├── PersonWeekCard.jsx  # Weekly activity view per person
│   ├── ActivityBlock.jsx   # Individual activity display
│   ├── ActivityModal.jsx   # Activity creation/editing
│   ├── ScheduleModal.jsx   # School schedule upload interface
│   ├── Settings.jsx        # Application settings and AI configuration
│   └── ...
├── contexts/               # React context providers
├── services/              # API communication layers
├── styles/                # Global CSS and design system
└── config/                # Application configuration
```

### Backend (Express.js + SQLite)

```
backend/
├── server.js              # Main Express server
├── database.js            # SQLite database setup and queries
├── data/                  # SQLite database files
└── src/                   # Backend source structure
```

### Docker Architecture

- **homedash-app**: Frontend React application (port 3000)
- **homedash-backend**: Express.js API server (port 3001)
- **homedash-network**: Bridge network for service communication
- **homedash-data**: Persistent volume for database storage

## 🔧 Core Components

### Family Member Management

- Add, edit, and delete family members
- Color-coded organization for easy identification
- Individual settings and preferences per member

### Activity Management

- Manual activity creation and editing
- Time-based scheduling with start/end times
- Activity types: manual, school_schedule, school_activity, spond
- Recurring activity support

### School Schedule Integration

1. **Upload school timetable images** through the Schedule Modal
2. **AI extraction** using Anthropic Claude vision models
3. **Automatic parsing** of schedule data into structured format
4. **Bulk import** creates recurring activities for the school year
5. **Homework extraction** from uploaded images

### Spond Sports Integration

1. **Credential management** - securely store Spond login credentials
2. **Group selection** - choose which sports teams to sync
3. **Activity synchronization** - automatically import team events
4. **Token lifecycle tracking** - monitor authentication status

## 🤖 AI Configuration

### Anthropic Claude Integration

- **Vision-capable models**: Support for image analysis and text extraction
- **Model selection**: Choose from available Claude models (Sonnet, Haiku, etc.)
- **API key validation**: Real-time validation of Anthropic API credentials
- **Prompt optimization**: Two prompt versions (original and optimized) for extraction

### Supported Models

- `claude-3-5-sonnet-20241022` (recommended for vision tasks)
- `claude-3-5-haiku-20241022` (faster processing)
- Additional models fetched dynamically from Anthropic API

## 🔒 Security & Privacy

### Data Protection

- **Encrypted credential storage**: Spond credentials secured in database
- **API key proxy**: Anthropic API keys never stored on server
- **Local database**: All family data stored locally in SQLite
- **GDPR compliance**: User consent and data deletion capabilities

### Authentication Flow

- **Spond integration**: Username/password authentication with token management
- **Anthropic API**: API key validation without permanent storage
- **Session management**: Secure token lifecycle with automatic refresh

## 📱 Usage Guide

### Getting Started

1. **Add family members** using the "+" button in the main interface
2. **Configure AI settings** in the Settings panel with your Anthropic API key
3. **Upload school schedules** using the Schedule Modal for automatic extraction
4. **Connect Spond accounts** in Settings for sports activity synchronization

### School Schedule Extraction

1. Navigate to Settings and configure your Anthropic API key
2. Click the "School Schedule" button on a family member card
3. Upload a clear image of the school timetable
4. Review and confirm the extracted schedule data
5. Activities are automatically created for the entire school year

### Spond Integration

1. Go to Settings and find the Spond Integration section
2. Enter Spond credentials for each family member
3. Select which sports groups to synchronize
4. Activities will be automatically imported and updated

## 🧪 Development & Testing

### Available Scripts

```bash
# Development
npm run dev                 # Start frontend development server
npm run dev:backend        # Start backend development server
npm run dev:all            # Start both frontend and backend

# Building
npm run build              # Build frontend for production
npm run preview            # Preview production build

# Testing
npm run test               # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Generate test coverage report

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues automatically
npm run format             # Format code with Prettier
npm run typecheck          # Run TypeScript type checking
```

### Testing Strategy

- **Unit tests**: React Testing Library for component testing
- **Integration tests**: Full application workflow testing
- **API testing**: Backend endpoint validation
- **E2E testing**: Vitest + jsdom for complete user flows

## 🐳 Docker Deployment

### Production Deployment

```bash
# Start production environment
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Update and restart
docker-compose up --build -d
```

### Development with Docker

```bash
# Use override configuration for development
docker-compose -f docker-compose.yml -f docker-compose.override.yml up

# View specific service logs
docker-compose logs -f homedash-backend
```

### Environment Configuration

#### API Configuration

Create a `.env` file in the root directory (optional - defaults work automatically):

```env
# Frontend configuration
VITE_API_URL=http://localhost:3001  # Optional - auto-detects by default

# Backend configuration
NODE_ENV=production
PORT=3001
```

#### Timezone Configuration

The containers are timezone-aware and default to `Europe/Oslo`. To change the timezone:

1. **For development** - Edit `docker-compose.override.yml`:

```yaml
services:
  homedash-app:
    environment:
      - TZ=America/New_York # Change to your timezone
  homedash-backend:
    environment:
      - TZ=America/New_York # Change to your timezone
```

2. **For production** - Edit `docker-compose.prod.yml`:

```yaml
services:
  homedash-app:
    environment:
      - TZ=Europe/London # Change to your timezone
  homedash-backend:
    environment:
      - TZ=Europe/London # Change to your timezone
```

**Common timezones:**

- `Europe/Oslo`, `Europe/London`, `Europe/Berlin`
- `America/New_York`, `America/Los_Angeles`, `America/Chicago`
- `Asia/Tokyo`, `Asia/Singapore`, `Asia/Shanghai`
- `Australia/Sydney`, `Australia/Melbourne`
- `UTC` (for universal time)

Find your timezone: [List of tz database time zones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)

## 🎨 Design System

### Color Palette

- **Primary Purple**: `#6704FF` - Main brand color for buttons and accents
- **Purple Variants**: Light (`#B781FF`), Dark (`#4D04B1`), Extra Dark (`#310268`)
- **Pastell Colors**: 9 avatar colors for family member identification
- **Neutral Colors**: White, light gray, gray, dark gray for backgrounds and text

### Typography

- **Sans Display Family**: Light (100), Regular (400), Medium (500), SemiBold (600), Bold (700)
- **Sans Condensed**: For compact layouts and data-heavy interfaces

### Layout System

- **48×48px grid**: Base grid system for consistent spacing
- **5px corner radius**: Consistent rounded corners throughout
- **Card-based design**: Content organized in visually distinct cards
- **Responsive breakpoints**: Mobile-first with desktop enhancements

## 📚 API Documentation

### Backend Endpoints

#### Family Members

- `GET /api/family-members` - List all family members
- `POST /api/family-members` - Create new family member
- `PUT /api/family-members/:id` - Update family member
- `DELETE /api/family-members/:id` - Delete family member

#### Activities

- `GET /api/activities` - List activities (supports filtering)
- `POST /api/activities` - Create new activity
- `PUT /api/activities/:id` - Update activity
- `DELETE /api/activities/:id` - Delete activity

#### School Schedule Extraction

- `POST /api/extract-school-plan` - Extract schedule from uploaded image

#### Spond Integration

- `POST /api/test-spond-credentials` - Validate Spond credentials
- `GET /api/spond-groups/:memberId` - Fetch available sports groups
- `POST /api/spond-activities/:memberId/sync` - Synchronize activities

#### Anthropic API Proxy

- `POST /api/test-key` - Validate Anthropic API key
- `POST /api/models` - Fetch available Claude models
- `POST /api/messages` - Proxy messages to Anthropic API

## 🤝 Contributing

### Development Workflow

1. Follow the HomeDash Design Manual for all UI changes
2. Use Docker Compose for testing and deployment
3. Maintain test coverage for new features
4. Follow React 19 best practices and functional components

### Code Style

- **ESLint + Prettier**: Automated code formatting
- **Single quotes**: Consistent string formatting
- **2-space indentation**: Clean, readable code
- **Functional components**: React hooks and modern patterns

## 📄 License

This project follows all design specifications from the HomeDash Design Manual and integrates with third-party services (Spond, Anthropic) through their respective APIs.

## 🛠️ Troubleshooting

### Common Issues

**Docker startup issues:**

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Restart services
docker-compose restart
```

**API connection issues:**

- Verify backend is running on port 3001
- Check Docker network configuration
- Ensure environment variables are set correctly

**Spond integration issues:**

- Verify credentials are correct
- Check token expiration status
- Review sync logs in backend console

**AI extraction issues:**

- Confirm Anthropic API key is valid
- Ensure uploaded images are clear and readable
- Check selected model supports vision capabilities

For additional support, refer to the `SPOND_API_INTEGRATION.md` and `design_manual.md` files for detailed technical documentation.
