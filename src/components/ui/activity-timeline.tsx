'use client';

import { motion } from 'framer-motion';
import { Upload, CheckCircle2, Trash2, Clock, Palette, Plus, Activity } from 'lucide-react';

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  projectName?: string;
  styleName?: string;
  timestamp: string;
  success: boolean;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  maxItems?: number;
}

const activityIcons: Record<string, any> = {
  uploaded: Upload,
  completed: CheckCircle2,
  deleted: Trash2,
  processing: Clock,
  styled: Palette,
  created: Plus,
};

const activityColors: Record<string, string> = {
  uploaded: 'text-blue-400',
  completed: 'text-emerald-400',
  deleted: 'text-rose-400',
  processing: 'text-amber-400',
  styled: 'text-purple-400',
  created: 'text-green-400',
};

export function ActivityTimeline({ activities, maxItems = 10 }: ActivityTimelineProps) {
  const displayActivities = activities.slice(0, maxItems);

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return time.toLocaleDateString();
  };

  if (displayActivities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Activity className="w-12 h-12 text-[hsl(var(--muted-foreground))]/30 mb-3" />
        <p className="text-sm text-[hsl(var(--muted-foreground))]">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayActivities.map((activity, index) => {
        const Icon = activityIcons[activity.type] || Activity;
        const colorClass = activityColors[activity.type] || 'text-[hsl(var(--muted-foreground))]';

        return (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="flex gap-3 relative"
          >
            {/* Timeline line */}
            {index < displayActivities.length - 1 && (
              <div className="absolute left-[15px] top-[30px] bottom-[-16px] w-[2px] bg-gradient-to-b from-[hsl(var(--border))] to-transparent" />
            )}

            {/* Icon */}
            <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex items-center justify-center ${colorClass}`}>
              <Icon className="w-4 h-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-4">
              <p className="text-sm text-[hsl(var(--foreground))] leading-snug">
                {activity.description}
              </p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 font-mono">
                {formatRelativeTime(activity.timestamp)}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
