import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import auth from './routes/auth.js';
import catalog from './routes/catalog.js';
import orders from './routes/orders.js';
import finance from './routes/finance.js';
import swift from './routes/swift.js';
import management from './routes/management.js';
import partners from './routes/partners.js';
import business from './routes/business.js';
import accessControl from './routes/access-control.js';
import clientRequests from './routes/client-requests.js';
import advancedOperations from './routes/advanced-operations.js';
import operationsHub from './routes/operations-hub.js';
import { connectDatabase, disconnectDatabase, databaseConnected } from './db.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
const allowedOrigins = process.env.WEB_ORIGIN?.split(',').map(x => x.trim()).filter(Boolean);
app.use(cors(allowedOrigins?.length ? { origin: allowedOrigins } : (process.env.NODE_ENV === 'production' ? { origin: false } : { origin: true })));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }), auth);
app.use('/api/catalog', catalog);
app.use('/api/orders', orders);
app.use('/api/finance', finance);
app.use('/api/swift', swift);
app.use('/api/management', management);
app.use('/api/partners', partners);
app.use('/api/business', business);
app.use('/api/access', accessControl);
app.use('/api/client-requests', clientRequests);
app.use('/api/operations', advancedOperations);
app.use('/api/operations-hub', operationsHub);
// Liveness: process is running; does not imply database readiness.
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'GLH API', version: '0.6.41' }));
// Readiness: only reports ready after a real PostgreSQL round-trip.
app.get('/api/ready', async (_req, res) => {
  try {
    await (await import('./db.js')).prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', database: 'connected', service: 'GLH API', version: '0.6.41' });
  } catch (error) {
    res.status(503).json({ status: 'not_ready', database: 'unavailable', service: 'GLH API', version: '0.6.41', message: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});
app.use(express.static(path.resolve(__dirname, '../../web')));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'حدث خطأ داخلي' });
});
const port = Number(process.env.PORT || 4000);
const server = app.listen(port, '0.0.0.0', () => console.log(`GLH API listening on ${port}`));
// Do not falsely report a healthy application when the database is unreachable.
connectDatabase().then(() => console.log('GLH PostgreSQL connection verified')).catch(error => {
  console.error('GLH database connection failed:', error.message);
});
async function shutdown(signal) {
  console.log(`${signal}: shutting down GLH`);
  server.close(async () => { try { await disconnectDatabase(); } finally { process.exit(0); } });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

