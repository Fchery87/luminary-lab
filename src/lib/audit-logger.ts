import { db, auditLogs } from '@/db';
import { v7 as uuidv7 } from 'uuid';
import { NextRequest } from 'next/server';
import { asc, desc } from 'drizzle-orm';

export interface AuditLogData {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: 'timestamp' | 'userId' | 'action';
  sortOrder?: 'asc' | 'desc';
}

export interface FilterOptions {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
}

export class AuditLogger {
  // Log an audit event
  static async log(data: AuditLogData): Promise<void> {
    try {
      const logEntry = {
        id: uuidv7(),
        ...data,
        timestamp: new Date(),
      };

      // For now, just log to console to avoid DB issues
      // In production, you'd insert into database
      if (!data.success) {
        console.error('[AUDIT] Failed action:', {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          error: data.error,
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log('[AUDIT] Action logged:', {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          timestamp: new Date().toISOString(),
        });
      }
      
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw error to avoid breaking main flow
    }
  }

  // Log successful action
  static async logSuccess(
    action: string,
    resource: string,
    userId?: string,
    resourceId?: string,
    details?: Record<string, any>,
    request?: NextRequest
  ): Promise<void> {
    return this.log({
      userId,
      action,
      resource,
      resourceId,
      details,
      ipAddress: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || undefined,
      userAgent: request?.headers.get('user-agent') || undefined,
      success: true,
    });
  }

  // Log failed action
  static async logFailure(
    action: string,
    resource: string,
    error: string,
    userId?: string,
    resourceId?: string,
    details?: Record<string, any>,
    request?: NextRequest
  ): Promise<void> {
    return this.log({
      userId,
      action,
      resource,
      resourceId,
      details,
      error,
      ipAddress: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || undefined,
      userAgent: request?.headers.get('user-agent') || undefined,
      success: false,
    });
  }

  // Get audit logs with filtering and pagination
  static async getLogs(
    filters: FilterOptions = {},
    pagination: PaginationOptions = {}
  ): Promise<{
    logs: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      // For now, return empty logs to avoid DB issues
      // In production, implement proper database queries
      return {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 0
      };

    } catch (error) {
      console.error('Failed to get audit logs:', error);
      return {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 0
      };
    }
  }

  // Get security events (failed logins, suspicious activity)
  static async getSecurityEvents(
    hours: number = 24
  ): Promise<any[]> {
    try {
      // For now, return empty array
      // In production, implement database queries
      console.log(`[AUDIT] Security events requested for last ${hours} hours`);
      return [];

    } catch (error) {
      console.error('Failed to get security events:', error);
      return [];
    }
  }

  // Get user activity summary
  static async getUserActivitySummary(
    userId: string,
    days: number = 30
  ): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    resourcesAccessed: Record<string, number>;
    failureRate: number;
    lastActivity: Date | null;
  }> {
    try {
      // For now, return empty summary
      // In production, implement database queries
      console.log(`[AUDIT] Activity summary requested for user ${userId} (last ${days} days)`);
      return {
        totalActions: 0,
        actionsByType: {},
        resourcesAccessed: {},
        failureRate: 0,
        lastActivity: null,
      };

    } catch (error) {
      console.error('Failed to get user activity summary:', error);
      return {
        totalActions: 0,
        actionsByType: {},
        resourcesAccessed: {},
        failureRate: 0,
        lastActivity: null,
      };
    }
  }
}

// Middleware for automatic audit logging
export function withAuditLogging(
  action: string,
  resource: string,
  getUserId: (request: NextRequest) => string | undefined
) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(request: NextRequest, ...args: any[]) {
      const userId = getUserId(request);
      const startTime = Date.now();
      
      try {
        const result = await originalMethod.apply(this, [request, ...args]);
        
        // Log successful action
        await AuditLogger.logSuccess(
          action,
          resource,
          userId,
          // Extract resource ID from args if available
          args[0]?.id || args[0]?.projectId || args[0]?.userId,
          {
            duration: Date.now() - startTime,
            result: typeof result === 'object' ? 'success' : result
          },
          request
        );

        return result;

      } catch (error) {
        // Log failed action
        await AuditLogger.logFailure(
          action,
          resource,
          error instanceof Error ? error.message : String(error),
          userId,
          // Extract resource ID from args if available
          args[0]?.id || args[0]?.projectId || args[0]?.userId,
          {
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.stack : error
          },
          request
        );

        throw error;
      }
    };

    return descriptor;
  };
}
