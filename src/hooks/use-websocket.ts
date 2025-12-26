'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  WebSocketNotification,
  ProjectUpdateNotification,
  JobStatusNotification,
  ProcessingProgressNotification 
} from '@/lib/websocket-server';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  error: string | null;
  notifications: WebSocketNotification[];
  clearNotifications: () => void;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  subscribeToJob: (jobId: string) => void;
  unsubscribeFromJob: (jobId: string) => void;
  connectionError: Error | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<WebSocketNotification[]>([]);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const hasConnectedRef = useRef(false);
  const autoConnectAttemptedRef = useRef(false);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const joinProject = useCallback((projectId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-project', projectId);
    }
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-project', projectId);
    }
  }, []);

  const subscribeToJob = useCallback((jobId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('subscribe-job', jobId);
    }
  }, []);

  const unsubscribeFromJob = useCallback((jobId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('unsubscribe-job', jobId);
    }
  }, []);

  const connect = useCallback(async () => {
    // Prevent duplicate connections
    if (socketRef.current) {
      console.log('WebSocket already connected or connecting, skipping');
      return;
    }

    try {
      // Get auth token from client-side auth
      const response = await fetch('/api/auth/session', {
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        // If user is not authenticated, just skip WebSocket connection
        // Don't throw an error - this is expected behavior
        console.log(`User not authenticated (HTTP ${response.status}), skipping WebSocket connection`);
        return;
      }

      let session;
      try {
        session = await response.json();
      } catch (err) {
        console.error('Failed to parse session response:', err);
        return;
      }

      if (!session?.authenticated || !session?.user) {
        // No active session, skip WebSocket connection
        console.log('No active session, skipping WebSocket connection');
        return;
      }

      const token = session.sessionToken;
      if (!token) {
        // No token available, skip WebSocket connection
        console.log('No auth token available, skipping WebSocket connection');
        return;
      }

      // Initialize socket connection to WebSocket server
      const wsPort = process.env.WEBSOCKET_PORT || 3002;
      const wsUrl = process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_WEBSOCKET_URL || `wss://${window.location.host}`
        : `ws://localhost:${wsPort}`;

      const socketInstance = io(wsUrl, {
        auth: {
          token,
        },
        reconnection,
        reconnectionAttempts,
        reconnectionDelay,
      });

      socketRef.current = socketInstance;
      hasConnectedRef.current = true;

      // Connection events
      socketInstance.on('connect', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        setConnectionError(null);
      });

      socketInstance.on('disconnect', (reason: string) => {
        console.log('WebSocket disconnected:', reason);
        setIsConnected(false);
        hasConnectedRef.current = false; // Reset connection flag
      });

      socketInstance.on('connect_error', (err: Error) => {
        console.error('WebSocket connection error:', err);
        setError(err.message);
        setConnectionError(err);
        setIsConnected(false);
      });

      // Notification handlers
      socketInstance.on('project-update', (notification: ProjectUpdateNotification) => {
        setNotifications(prev => [notification as WebSocketNotification, ...prev].slice(0, 50)); // Keep last 50 notifications
      });

      socketInstance.on('job-status-change', (notification: JobStatusNotification) => {
        setNotifications(prev => [notification as WebSocketNotification, ...prev].slice(0, 50));
      });

      socketInstance.on('processing-progress', (notification: ProcessingProgressNotification) => {
        setNotifications(prev => [notification as WebSocketNotification, ...prev].slice(0, 50));
      });

      socketInstance.on('error', (notification: WebSocketNotification) => {
        setNotifications(prev => [notification, ...prev].slice(0, 50));
      });

      setSocket(socketInstance);

    } catch (err) {
      const error = err as Error;
      console.error('Failed to initialize WebSocket:', error);
      setError(error.message);
      setConnectionError(error);
    }
  }, [reconnection, reconnectionAttempts, reconnectionDelay]);

  useEffect(() => {
    if (autoConnect && !autoConnectAttemptedRef.current) {
      autoConnectAttemptedRef.current = true;
      // Use setTimeout to defer setState call, avoiding cascading renders
      const timerId = setTimeout(() => {
        connect();
      }, 0);

      return () => clearTimeout(timerId);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      hasConnectedRef.current = false; // Reset connection flag
      autoConnectAttemptedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  return {
    socket,
    isConnected,
    error,
    notifications,
    clearNotifications,
    joinProject,
    leaveProject,
    subscribeToJob,
    unsubscribeFromJob,
    connectionError,
  };
}
