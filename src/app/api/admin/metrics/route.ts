/**
 * Admin dashboard metrics endpoint
 * Returns aggregated system health and performance data
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { metricsCollector } from "@/lib/metrics";
import { queryMonitor } from "@/lib/query-monitor";
import { errorTracker } from "@/lib/error-tracker";
import { queueMonitor } from "@/lib/queue-monitor";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    // TODO: Add admin role check
    // if (!session?.user?.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metrics = metricsCollector.getSummary();
    const slowQueries = queryMonitor.getStatistics();
    const errors = errorTracker.getStatistics();
    const queues = queueMonitor.getStatistics();

    const dashboard = {
      timestamp: Date.now(),
      metrics: {
        queries: metrics,
        endpoints: metricsCollector.getSummary(),
        cache: metricsCollector.getSummary(),
      },
      performance: {
        slowQueries,
        errorRate: errors.errorRate,
        avgEndpointTime: metrics?.avg || 0,
      },
      errors: {
        total: errors.total,
        byType: errors.byType,
        bySeverity: errors.bySeverity,
        topErrors: errorTracker.getTopErrors(5),
      },
      queue: {
        ...queues,
        health: queueMonitor.getQueueHealth(),
      },
      recentLogs: logger.getRecentLogs(50),
    };

    logger.info("Admin metrics accessed", {
      userId: session.user.id,
    });

    return NextResponse.json(dashboard);
  } catch (error) {
    logger.error("Failed to fetch admin metrics", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 },
    );
  }
}
