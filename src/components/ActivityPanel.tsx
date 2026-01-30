import React, { useMemo } from 'react';
import { ActivityEvent } from '../types';
import {
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  Shield,
  X,
  Clock,
  Activity,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '../utils';

interface ActivityPanelProps {
  events: ActivityEvent[];
  onClose: () => void;
}

interface GroupedEvent {
  userId: string;
  userName: string;
  events: ActivityEvent[];
}

const getActivityIcon = (type: ActivityEvent['type'], details: any) => {
  switch (type) {
    case 'OP':
      if (details?.opType === 'create') return Plus;
      if (details?.opType === 'update') return Pencil;
      if (details?.opType === 'delete') return Trash2;
      return Activity;
    case 'MEMBER_JOINED':
      return UserPlus;
    case 'MEMBER_ROLE_CHANGED':
      return Shield;
    case 'MEMBER_REMOVED':
      return Trash2;
    default:
      return Activity;
  }
};

const getActivityColor = (type: ActivityEvent['type'], details: any) => {
  switch (type) {
    case 'OP':
      if (details?.opType === 'create') return 'text-green-600 bg-green-100';
      if (details?.opType === 'update') return 'text-amber-600 bg-amber-100';
      if (details?.opType === 'delete') return 'text-red-600 bg-red-100';
      return 'text-slate-600 bg-slate-100';
    case 'MEMBER_JOINED':
      return 'text-indigo-600 bg-indigo-100';
    case 'MEMBER_ROLE_CHANGED':
      return 'text-purple-600 bg-purple-100';
    case 'MEMBER_REMOVED':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-slate-600 bg-slate-100';
  }
};

const getActivityDescription = (event: ActivityEvent) => {
  const { type, details } = event;

  switch (type) {
    case 'OP':
      if (details?.opType === 'create') {
        const count = details?.count || 1;
        return `created ${count} ${count === 1 ? 'item' : 'items'}`;
      }
      if (details?.opType === 'update') {
        return 'updated an item';
      }
      if (details?.opType === 'delete') {
        const count = details?.count || 1;
        return `deleted ${count} ${count === 1 ? 'item' : 'items'}`;
      }
      return 'performed an action';
    case 'MEMBER_JOINED':
      return 'joined the board';
    case 'MEMBER_ROLE_CHANGED':
      return `changed role to ${details?.newRole?.toLowerCase() || 'member'}`;
    case 'MEMBER_REMOVED':
      return 'was removed from the board';
    default:
      return 'performed an action';
  }
};

const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const formatTimeGroup = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return 'Just now';
  if (hours < 24) return 'Today';
  if (days < 2) return 'Yesterday';
  if (days < 7) return 'This week';

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const generateColorFromName = (name: string): string => {
  const colors = [
    'bg-red-100 text-red-700',
    'bg-orange-100 text-orange-700',
    'bg-amber-100 text-amber-700',
    'bg-yellow-100 text-yellow-700',
    'bg-lime-100 text-lime-700',
    'bg-green-100 text-green-700',
    'bg-emerald-100 text-emerald-700',
    'bg-teal-100 text-teal-700',
    'bg-cyan-100 text-cyan-700',
    'bg-sky-100 text-sky-700',
    'bg-blue-100 text-blue-700',
    'bg-indigo-100 text-indigo-700',
    'bg-violet-100 text-violet-700',
    'bg-purple-100 text-purple-700',
    'bg-fuchsia-100 text-fuchsia-700',
    'bg-pink-100 text-pink-700',
    'bg-rose-100 text-rose-700',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

export function ActivityPanel({ events, onClose }: ActivityPanelProps) {
  const groupedEvents = useMemo(() => {
    if (events.length === 0) return [];

    const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp);

    const groups: { timeLabel: string; userGroups: GroupedEvent[] }[] = [];
    let currentTimeLabel = '';
    let currentUserGroups: GroupedEvent[] = [];

    sorted.forEach((event) => {
      const timeLabel = formatTimeGroup(event.timestamp);

      if (timeLabel !== currentTimeLabel) {
        if (currentUserGroups.length > 0) {
          groups.push({ timeLabel: currentTimeLabel, userGroups: currentUserGroups });
        }
        currentTimeLabel = timeLabel;
        currentUserGroups = [];
      }

      const existingGroup = currentUserGroups.find((g) => g.userId === event.userId);
      if (existingGroup) {
        existingGroup.events.push(event);
      } else {
        currentUserGroups.push({
          userId: event.userId,
          userName: event.userName,
          events: [event],
        });
      }
    });

    if (currentUserGroups.length > 0) {
      groups.push({ timeLabel: currentTimeLabel, userGroups: currentUserGroups });
    }

    return groups;
  }, [events]);

  return (
    <div className="fixed inset-0 z-[150] overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-out animate-in slide-in-from-right-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Activity
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {events.length} {events.length === 1 ? 'event' : 'events'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-80px)] p-6">
          {events.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-8">
              {groupedEvents.map((timeGroup) => (
                <div key={timeGroup.timeLabel} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {timeGroup.timeLabel}
                    </span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                  </div>

                  <div className="space-y-4">
                    {timeGroup.userGroups.map((userGroup) => (
                      <UserActivityGroup
                        key={userGroup.userId}
                        userGroup={userGroup}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserActivityGroup({ userGroup }: { userGroup: GroupedEvent }) {
  const { userName, events } = userGroup;
  const avatarColor = generateColorFromName(userName);

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
            avatarColor
          )}
        >
          {getInitials(userName)}
        </div>
        {events.length > 1 && (
          <div className="w-px flex-1 bg-slate-200 dark:bg-slate-800 mt-2" />
        )}
      </div>

      {/* Activities */}
      <div className="flex-1 min-w-0 space-y-3">
        <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
          {userName}
        </p>

        {events.map((event, index) => {
          const Icon = getActivityIcon(event.type, event.details);
          const colorClass = getActivityColor(event.type, event.details);
          const isLast = index === events.length - 1;

          return (
            <div
              key={event.id}
              className={cn(
                'flex items-start gap-3 pb-3',
                !isLast && 'border-b border-slate-100 dark:border-slate-800'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                  colorClass
                )}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {getActivityDescription(event)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatRelativeTime(event.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <MoreHorizontal className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
        No activity yet
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
        When team members create, update, or delete items, or when members join the board, you'll see it here.
      </p>
    </div>
  );
}
