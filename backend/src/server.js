import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import analysisRoutes from './routes/analysis.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'hipermove-backend',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  });
});

// Mount Analysis Routes
app.use('/api/analysis', analysisRoutes);

// Catch-all 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler (avoids leaking stack traces or credentials)
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message
  });
});

// Start listening if run directly
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[HiperMove Backend] Server listening on port ${PORT}`);
  console.log(`[HiperMove Backend] Health check: http://localhost:${PORT}/api/health`);
});

export default app;
