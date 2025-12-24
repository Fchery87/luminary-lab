import 'server-only';
import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/lib/auth';

// Get the actual auth instance (not the Proxy)
// toNextJsHandler needs the real betterAuth instance
const authInstance = getAuth();
const { GET, POST } = toNextJsHandler(authInstance);

export { GET, POST };
