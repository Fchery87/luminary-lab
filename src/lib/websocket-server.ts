import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth';
import { processingJobs, projects } from '@/db';
import { eq } from 'drizzle-orm';
import { db } from '@/db';

let io: SocketIOServer | null = null;

export function getWebSocketServer() {
  if (!io) {
    throw new Error('WebSocket server not initialized. Call initializeWebSocketServer first.');
  }
  return io;
}

export function initializeWebSocketServer() {
  if (io) {
    console.log('WebSocket server already initialized');
    return io;
  }

  const httpServer = createServer();
  
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_APP_URL 
        : ["http://localhost:3000", "http://localhost:3001"],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify token with Better Auth
      const session = await auth.api.getSession({
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      if (!session) {
        return next(new Error('Invalid authentication token'));
      }

      // Attach user data to socket
      socket.data.userId = session.user.id;
      socket.data.email = session.user.email;
      next();
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    console.log(`User ${userId} connected to WebSocket`);

    // Join user-specific room for private notifications
    socket.join(`user:${userId}`);

    // Join project-specific rooms
    socket.on('join-project', (projectId: string) => {
      socket.join(`project:${projectId}`);
      console.log(`User ${userId} joined project room: ${projectId}`);
    });

    socket.on('leave-project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
      console.log(`User ${userId} left project room: ${projectId}`);
    });

    // Handle job status updates
    socket.on('subscribe-job', (jobId: string) => {
      socket.join(`job:${jobId}`);
      console.log(`User ${userId} subscribed to job: ${jobId}`);
    });

    socket.on('unsubscribe-job', (jobId: string) => {
      socket.leave(`job:${jobId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected from WebSocket`);
    });
  });

  // Start server on a different port
  const wsPort = process.env.WEBSOCKET_PORT ? parseInt(process.env.WEBSOCKET_PORT) : 3002;
  httpServer.listen(wsPort, () => {
    console.log(`WebSocket server running on port ${wsPort}`);
  });

  return io;
}

// Notification functions
export async function notifyUserProjectUpdate(userId: string, projectId: string, update: {
  type: 'status_change' | 'progress' | 'error' | 'completed';
  data: any;
}) {
  try {
    const io = getWebSocketServer();
    io.to(`user:${userId}`).emit('project-update', {
      projectId,
      ...update,
      timestamp: new Date().toISOString(),
    });

    // Also send to project-specific room
    io.to(`project:${projectId}`).emit('project-update', {
      projectId,
      ...update,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to send project update notification:', error);
  }
}

export async function notifyJobStatusChange(jobId: string, status: string, data?: any) {
  try {
    const io = getWebSocketServer();
    io.to(`job:${jobId}`).emit('job-status-change', {
      jobId,
      status,
      data,
      timestamp: new Date().toISOString(),
    });

    // If job has an associated project, also notify project room
    const [job] = await db
      .select({ projectId: processingJobs.projectId })
      .from(processingJobs)
      .where(eq(processingJobs.id, jobId))
      .limit(1);

    if (job) {
      const [project] = await db
        .select({ userId: projects.userId })
        .from(projects)
        .where(eq(projects.id, job.projectId))
        .limit(1);

      if (project) {
        await notifyUserProjectUpdate(project.userId, job.projectId, {
          type: status === 'completed' ? 'completed' : 'status_change',
          data: { jobId, status, ...data }
        });
      }
    }
  } catch (error) {
    console.error('Failed to send job status notification:', error);
  }
}

export async function notifyProcessingProgress(jobId: string, progress: number, message?: string) {
  try {
    const io = getWebSocketServer();
    io.to(`job:${jobId}`).emit('processing-progress', {
      jobId,
      progress,
      message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to send processing progress notification:', error);
  }
}

export async function notifyError(userId: string, error: {
  type: 'processing_error' | 'upload_error' | 'subscription_error';
  message: string;
  projectId?: string;
  jobId?: string;
}) {
  try {
    const io = getWebSocketServer();
    const notification = {
      ...error,
      timestamp: new Date().toISOString(),
    };

    io.to(`user:${userId}`).emit('error', notification);

    if (error.projectId) {
      io.to(`project:${error.projectId}`).emit('error', notification);
    }

    if (error.jobId) {
      io.to(`job:${error.jobId}`).emit('error', notification);
    }
  } catch (error) {
    console.error('Failed to send error notification:', error);
  }
}

// Types for client-side usage
export interface WebSocketNotification {
  type: 'project-update' | 'job-status-change' | 'processing-progress' | 'error';
  timestamp: string;
  data: any;
}

export interface ProjectUpdateNotification extends WebSocketNotification {
  type: 'project-update';
  projectId: string;
  updateType: 'status_change' | 'progress' | 'error' | 'completed';
  data: any;
}

export interface JobStatusNotification extends WebSocketNotification {
  type: 'job-status-change';
  jobId: string;
  status: string;
  data: any;
}

export interface ProcessingProgressNotification extends WebSocketNotification {
  type: 'processing-progress';
  jobId: string;
  progress: number;
  message?: string;
}
