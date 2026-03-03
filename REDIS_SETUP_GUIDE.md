# Redis Setup Guide

## Problem
The application shows repeated `[ioredis] Unhandled error event: undefined` errors in the terminal when Redis is not properly configured.

## Root Cause
- `REDIS_URL` in `.env` is a placeholder: `redis://username:password@host:port`
- The Redis client cannot connect and continuously retries (up to 20 times)
- Without proper error handlers, unhandled connection errors flood the terminal

## Solution: Setup Redis

### Option 1: Local Redis (Development)

#### macOS with Homebrew
```bash
# Install Redis
brew install redis

# Start Redis server
brew services start redis

# Verify connection
redis-cli ping
# Output: PONG
```

#### Ubuntu/Debian
```bash
# Install Redis
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server

# Verify connection
redis-cli ping
# Output: PONG
```

#### Docker (All platforms)
```bash
# Run Redis in Docker
docker run -d -p 6379:6379 --name redis redis:latest

# Verify connection
redis-cli ping
# Output: PONG
```

### Option 2: Managed Redis (Production)

#### Redis Cloud (Recommended for production)
1. Go to https://redis.cloud/
2. Create a free account
3. Create a new database
4. Copy the connection string (looks like: `redis://default:password@host:port`)

#### AWS ElastiCache
1. Create ElastiCache Redis cluster in AWS Console
2. Get the endpoint URL
3. Use format: `redis://default:password@endpoint:6379`

#### Heroku Redis Add-on
```bash
heroku addons:create heroku-redis:premium-0
heroku config:get REDIS_URL
```

## Configuration

### Update .env

Replace the placeholder with your actual Redis URL:

```env
# BEFORE (doesn't work)
REDIS_URL=redis://username:password@host:port

# AFTER (local development)
REDIS_URL=redis://localhost:6379

# AFTER (with auth)
REDIS_URL=redis://:password@localhost:6379

# AFTER (production)
REDIS_URL=redis://default:your-password@redis-host.redis.cloud:12345
```

### .env Format
- Local (no password): `redis://localhost:6379`
- Local (with password): `redis://:mypassword@localhost:6379`
- Remote: `redis://default:password@host.redis.cloud:port`
- Using database: `redis://localhost:6379/1` (database 1 instead of default 0)

## Verify Setup

### Option 1: Check in Terminal
```bash
# Terminal 1: Start dev server
bun dev

# Terminal 2: Monitor Redis
redis-cli MONITOR

# You should see commands flowing through Redis
```

### Option 2: Test Connection
```bash
# Run this in your project directory
node -e "
const Redis = require('ioredis');
const url = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(url);
redis.ping().then(() => {
  console.log('✅ Redis connected!');
  process.exit(0);
}).catch(err => {
  console.error('❌ Redis connection failed:', err.message);
  process.exit(1);
});
"
```

## Troubleshooting

### Error: Connection refused
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```
**Solution**: Start Redis server or check the REDIS_URL is correct

### Error: Invalid password
```
Error: NOAUTH Authentication required
```
**Solution**: Add correct password to REDIS_URL

### Error: Hostname not found
```
Error: getaddrinfo ENOTFOUND redis-host.redis.cloud
```
**Solution**: Check hostname spelling and internet connectivity

### Unhandled error events
```
[ioredis] Unhandled error event: undefined
```
**Solution**: This is now handled with proper error listeners (see queue.ts)

## What Changed

Updated `src/lib/queue.ts` to add proper error handling:

```typescript
// Error handlers added
redisSingleton.on("error", (error) => {
  console.error("[Redis] Connection error:", error.message);
});

redisSingleton.on("connect", () => {
  console.log("[Redis] Connected successfully");
});

redisSingleton.on("reconnecting", () => {
  console.log("[Redis] Reconnecting...");
});
```

Now errors are properly logged instead of being unhandled.

## Testing Image Processing Queue

After setting up Redis:

1. Upload an image via the web interface
2. Check terminal for queue events:
   ```
   Job started...
   Job progress: 25%
   Job progress: 50%
   Job completed!
   ```

3. Monitor Redis (in separate terminal):
   ```bash
   redis-cli
   > KEYS *
   > HGETALL bull:image processing:1
   ```

## Queue Commands (for debugging)

```bash
redis-cli

# Check all queue data
KEYS 'bull:*'

# Get job data
HGETALL bull:image\ processing:1

# Get waiting jobs
LLEN bull:image\ processing:waiting

# Clear all jobs (WARNING: removes all data)
FLUSHDB
```

## CI/CD Deployment

### Environment Variables
Set `REDIS_URL` in your deployment platform:

**Vercel**:
- Settings → Environment Variables
- Add `REDIS_URL` with your Redis Cloud URL

**Heroku**:
- Automatically set if using `heroku-redis` add-on
- Verify: `heroku config | grep REDIS_URL`

**Docker**:
```dockerfile
ENV REDIS_URL=redis://redis:6379
```

### Docker Compose Example
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      REDIS_URL: redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:latest
    ports:
      - "6379:6379"
```

## Performance Tuning

For production, consider:

```env
# Increase max connections if processing many jobs
REDIS_URL=redis://default:password@host:port?maxRetriesPerRequest=5

# Use connection pooling
# Configure in queue.ts:
redis: {
  host: 'host',
  port: 6379,
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  enableOfflineQueue: false,
  connectionName: 'bull-queue'
}
```

## Status Check

After configuration, you should see in terminal logs:
```
✅ [Redis] Connected successfully
✅ [Queue] Image processing queue initialized
```

NOT:
```
❌ [ioredis] Unhandled error event: undefined
❌ MaxRetriesPerRequestError
```

---

**Your application is now properly configured for background job processing.**
