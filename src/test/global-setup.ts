export default function globalSetup() {
  // Set environment before modules load
  if (!process.env.REDIS_URL) {
    process.env.REDIS_URL = "redis://localhost:6379";
  }
}
