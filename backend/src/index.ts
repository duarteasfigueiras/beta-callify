import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import callsRoutes from './routes/calls';
import criteriaRoutes from './routes/criteria';
import dashboardRoutes from './routes/dashboard';

// Import database initialization
import { initDatabase, seedDatabase } from './db/init';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    // Allow localhost on any port
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/criteria', criteriaRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

    // Start server
    app.listen(PORT, () => {
      console.log(`\n========================================`);
      console.log(`Callify Backend Server`);
      console.log(`========================================`);
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
      console.log(`========================================\n`);
      console.log(`Demo credentials:`);
      console.log(`  Admin: username=admin, password=admin123`);
      console.log(`  Agent: username=agent, password=agent123`);
      console.log(`========================================\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
