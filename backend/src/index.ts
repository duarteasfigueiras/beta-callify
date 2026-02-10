import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { csrfProtection } from './middleware/csrf';
import { inputLengthValidation } from './middleware/validateInput';
import { requestIdMiddleware } from './middleware/requestId';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import callsRoutes from './routes/calls';
import criteriaRoutes from './routes/criteria';
import dashboardRoutes from './routes/dashboard';
import alertsRoutes from './routes/alerts';
import webhooksRoutes from './routes/webhooks';
import n8nRoutes from './routes/n8n';
import categoriesRoutes from './routes/categories';
import stripeRoutes from './routes/stripe';

// Import database initialization
import { initDatabase, seedDatabase } from './db/init';

// Import retention service
import { startRetentionScheduler, getRetentionPolicy } from './services/retention';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

console.log('Environment PORT:', process.env.PORT);
console.log('Using PORT:', PORT);

// ===========================================
// SECURITY MIDDLEWARE
// ===========================================

// SECURITY: Unique request ID for every request (tracing in logs)
app.use(requestIdMiddleware);

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || "http://localhost:5173"],
    },
  },
  crossOriginEmbedderPolicy: false,  // Allow embedding for audio playback
}));

// Global rate limiter - 100 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Strict rate limiter for auth endpoints - 5 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,  // Don't count successful logins
});

// CORS - Specific origins only (more secure)
// SECURITY: Only allow localhost in development, never in production
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins: string[] = [
  ...(isProduction ? [] : ['http://localhost:5173', 'http://localhost:3000']),
  process.env.FRONTEND_URL,
  // Also allow www version of the frontend URL
  process.env.FRONTEND_URL?.replace('https://', 'https://www.'),
].filter((origin): origin is string => typeof origin === 'string' && origin.length > 0);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin header (server-to-server: webhooks, n8n, Stripe)
    // SECURITY: This is safe because browsers ALWAYS send Origin for cross-origin requests.
    // Non-browser tools (curl, webhooks) don't have cookies, so credentials aren't at risk.
    // Browser requests with "Origin: null" (sandboxed iframes) are the string "null",
    // which is NOT falsy and will be rejected by the allowedOrigins check below.
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow Vercel preview deployments in development
    if (process.env.NODE_ENV !== 'production' && /^https:\/\/.*\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    console.warn('CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// Stripe webhook needs raw body for signature verification - MUST be before express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));  // Limit body size (enough for transcriptions)

// SECURITY: Validate input field lengths on all POST/PUT/PATCH requests
app.use(inputLengthValidation);

// SECURITY: CSRF protection (double-submit cookie pattern)
app.use(csrfProtection);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
// Apply strict rate limiting to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/recover-password', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/criteria', criteriaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/n8n', n8nRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/stripe', stripeRoutes);

// SECURITY: security.txt for vulnerability disclosure (RFC 9116)
app.get('/.well-known/security.txt', (req, res) => {
  res.type('text/plain').send(
    `Contact: mailto:security@aicoachcall.com\n` +
    `Preferred-Languages: en, pt\n` +
    `Canonical: https://www.aicoachcall.com/.well-known/security.txt\n` +
    `Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()}\n`
  );
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Retention policy endpoint
app.get('/api/retention-policy', (req, res) => {
  res.json(getRetentionPolicy());
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('Starting Callify backend server...');

    // Initialize database
    await initDatabase();
    await seedDatabase();

    // Start retention policy scheduler
    startRetentionScheduler();

    // Start server - bind to 0.0.0.0 for Railway
    const HOST = '0.0.0.0';
    console.log(`Attempting to start server on ${HOST}:${PORT}...`);
    app.listen(PORT, HOST, () => {
      console.log(`\n========================================`);
      console.log(`Callify Backend Server`);
      console.log(`========================================`);
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
      console.log(`n8n Integration: http://localhost:${PORT}/api/n8n/health`);
      console.log(`Retention policy: 60 days (auto-cleanup enabled)`);
      console.log(`========================================\n`);
      // SECURITY: Don't log credentials in production
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] Demo credentials available - check .env.example`);
      }
      console.log(`========================================\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();


