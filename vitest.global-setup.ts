export default function globalSetup() {
  process.env.REDIS_URL = "redis://localhost:6379";
  // NODE_ENV is read-only, not modifying it here
}
