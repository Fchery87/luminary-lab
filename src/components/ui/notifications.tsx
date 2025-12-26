'use client';

import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useWebSocket } from '@/hooks/use-websocket';
import { WebSocketNotification } from '@/lib/websocket-server';
import * as React from 'react';

interface NotificationToastProps {
  notifications: WebSocketNotification[];
}

export function NotificationToast({ notifications }: NotificationToastProps) {
  const handleProjectUpdate = useCallback((notification: any) => {
    const { updateType, projectId, data } = notification;

    switch (updateType) {
      case 'completed':
        toast.success('Project completed!', {
          description: `Your photo has been processed successfully.`,
          action: {
            label: 'View',
            onClick: () => {
              window.location.href = `/compare/${projectId}`;
            },
          },
        });
        break;
      case 'status_change':
        toast.info('Project status updated', {
          description: `Project status: ${data.status}`,
        });
        break;
      case 'error':
        toast.error('Project processing failed', {
          description: data.message || 'An error occurred during processing.',
        });
        break;
    }
  }, []);

  const handleJobStatusChange = useCallback((notification: any) => {
    const { status, data } = notification;

    switch (status) {
      case 'completed':
        toast.success('Processing completed!', {
          description: 'Your image has been processed successfully.',
        });
        break;
      case 'failed':
        toast.error('Processing failed', {
          description: data?.message || 'Processing failed due to an error.',
        });
        break;
      case 'processing':
        toast.info('Processing started', {
          description: 'Your image is now being processed.',
        });
        break;
    }
  }, []);

  const handleProcessingProgress = useCallback((notification: any) => {
    const { progress, message } = notification;

    if (progress % 25 === 0 || progress === 100) {
      toast.message('Processing...', {
        description: message || `Progress: ${progress}%`,
        duration: 2000,
      });
    }
  }, []);

  const handleError = useCallback((notification: any) => {
    const { type, message } = notification;

    toast.error('Error', {
      description: message || 'An unexpected error occurred.',
    });
  }, []);

  useEffect(() => {
    // Process new notifications and show toasts
    const latestNotification = notifications[0];
    if (!latestNotification) return;

    const { type } = latestNotification;

    switch (type) {
      case 'project-update':
        handleProjectUpdate(latestNotification);
        break;
      case 'job-status-change':
        handleJobStatusChange(latestNotification);
        break;
      case 'processing-progress':
        handleProcessingProgress(latestNotification);
        break;
      case 'error':
        handleError(latestNotification);
        break;
    }
  }, [notifications, handleProjectUpdate, handleJobStatusChange, handleProcessingProgress, handleError]);

  // This component doesn't render anything visible
  // It just handles the side effect of showing toasts
  return null;
}

// Hook to explicitly connect to WebSocket for pages that need it
export function useConnectWebSocket() {
  const websocket = useWebSocket({
    autoConnect: true, // Auto-connect for pages that call this hook
  });

  const { isConnected } = websocket;

  // Connect immediately when hook is called
  React.useEffect(() => {
    if (!isConnected && websocket.socket === null) {
      // The useWebSocket hook handles connection automatically with autoConnect: true
    }
  }, [isConnected, websocket.socket]);

  return websocket;
}

// Hook to wrap WebSocket with notifications
export function useWebSocketNotifications() {
  const websocket = useWebSocket({
    autoConnect: false, // Don't auto-connect, let components decide
  });

  return websocket;
}

// Provider component for entire app
export function WebSocketNotificationProvider({ children }: { children: React.ReactNode }) {
  const { notifications } = useWebSocketNotifications();

  return (
    <>
      {children}
      <NotificationToast notifications={notifications} />
    </>
  );
}
