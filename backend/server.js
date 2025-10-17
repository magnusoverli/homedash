import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import { initDatabase } from './database.js';
import { cleanupExpiredTokens } from './utils/auth.js';

import authRoutes from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import llmRoutes from './routes/llm.js';
import familyRoutes from './routes/family.js';
import activitiesRoutes from './routes/activities.js';
import homeworkRoutes from './routes/homework.js';
import schoolPlanRoutes from './routes/schoolPlan.js';
import spondRoutes from './routes/spond.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6,
    threshold: 1024,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (process.env.NODE_ENV === 'production') {
        return callback(null, true);
      }

      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:3001',
      ];

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      try {
        const validPorts = ['3000', '3001', '5173'];
        const requestPort = new URL(origin).port;

        if (validPorts.includes(requestPort)) {
          return callback(null, true);
        }
      } catch (e) {
        // Invalid URL
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json());

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/debug/device-info', (req, res) => {
  const deviceInfo = req.body;
  console.log('\n📱 DEVICE DETECTION:');
  console.log('==================');
  console.log(`Device Type: ${deviceInfo.deviceType}`);
  console.log(`Is Mobile: ${deviceInfo.isMobile}`);
  console.log(`Is Tablet: ${deviceInfo.isTablet}`);
  console.log(`Is Touch: ${deviceInfo.isTouch}`);
  console.log(`Orientation: ${deviceInfo.orientation}`);
  console.log(
    `Screen Size: ${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`
  );
  console.log(`User Agent: ${deviceInfo.userAgent}`);
  console.log('==================\n');
  res.json({ received: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api', llmRoutes);
app.use('/api/family-members', familyRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api', schoolPlanRoutes);
app.use('/api/spond', spondRoutes);

initDatabase()
  .then(() => {
    console.log('✅ Database initialization complete');
    cleanupExpiredTokens();
    setInterval(cleanupExpiredTokens, 24 * 60 * 60 * 1000);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 HomeDash Backend Server Started`);
      console.log(`📡 Server listening on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🗜️  Compression: Enabled (gzip/deflate, threshold: 1KB)`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
  });
