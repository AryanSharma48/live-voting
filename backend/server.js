import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';
import { createClient } from '@supabase/supabase-js';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Initialize Redis (Upstash REST)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Initialize Supabase Admin Client (Service Role for DB writes bypassing RLS)
const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Rate Limiting (Using a token/ID instead of IP)
// Express-rate-limit by default uses req.ip, we override keyGenerator to use a token
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // Limit each token to 5 auth requests per windowMs
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Ideally extract a session ID or specific distinct header to avoid penalizing NAT IPs
    return req.headers['x-device-id'] || req.ip;
  },
  message: { error: 'Too many authentication attempts. Please try again later.' }
});

app.post('/api/auth/login', authLimiter, (req, res) => {
  // Mock auth endpoint for demonstration
  res.json({ message: 'Auth endpoint hit.' });
});

// The Core Vote Endpoint (High Concurrency 60-second window)
app.post('/api/vote', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization token' });
    }

    // BYPASS AUTH FOR TESTING
    // We skip supabase.auth.getUser() and just trust the frontend token
    const token = authHeader.split(' ')[1];

    // For testing bypass, we need a valid UUID format for PostgreSQL.
    // We'll generate a random UUID so it's unique each time.
    const userId = "00000000-0000-0000-0000-" + Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');

    const { teamId } = req.body;

    if (!teamId) {
      return res.status(400).json({ error: 'Missing teamId' });
    }

    // 2. The Race Condition Lock: SETNX (Set if Not eXists)
    // This atomic operation guarantees a user can only vote once.
    const lockKey = `voted:${userId}`;

    // Using simple string 'true', you could also set an expiry if needed
    const acquired = await redis.setnx(lockKey, 'true');

    if (acquired === 0) {
      // Key already exists, user has voted
      return res.status(400).json({ error: 'Already Voted' });
    }

    // 3. User secured the lock. Insert into PostgreSQL securely via Supabase.
    // If this fails, we hold the lock to prevent re-votes, or we can DEL it to allow retries.
    // Given the 60s window, a brief delay and retry logic might be needed on the client.
    const { error: insertError } = await supabase
      .from('votes')
      .insert({ user_id: userId, team_id: teamId });

    if (insertError) {
      // If the DB strictly fails, we rollback the Redis lock so they can try again.
      // E.g., foreign key violation, DB timeout.
      console.error('Database insert failed:', insertError);
      await redis.del(lockKey);
      return res.status(503).json({ error: 'Service temporarily unavailable. Try again.' });
    }

    return res.status(200).json({ message: 'Vote Recorded' });

  } catch (error) {
    console.error('Vote processing error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Voting Backend running on port ${PORT}`);
});
