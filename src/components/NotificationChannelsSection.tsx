import React, { useState, useEffect, useMemo } from 'react';
import {
  Check,
  CheckCheck,
  RotateCcw,
  MessageSquare,
  Smartphone,
  Mail,
  BellRing,
  ShieldCheck,
  Coins,
  Bell,
  Trash2,
  Instagram,
  Facebook,
  ShoppingBag,
  CalendarCheck,
  HelpCircle,
  UserCheck,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  Phone,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  NotificationChannelType,
  NotificationsConfig,
  WorkspaceNotification,
  WorkspaceNotificationEventType,
} from '../types';
import { TikTokLogo } from './BrandLogos';

interface NotificationChannelsSectionProps {
  value?: NotificationsConfig;
  onChange?: (config: NotificationsConfig) => void;
  workspaceId?: string | null;
  agentId?: string | null;
  agentName?: string;
  onNavigate?: (path: string) => void;
}

interface ChannelOption {
  id: NotificationChannelType;
  label: string;
  tagline: string;
  description: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  activeChipClass: string;
  inactiveChipClass: string;
  activeCardBorder: string;
  activeCardBg: string;
  iconBgActive: string;
  iconBgInactive: string;
}

const PAID_TOKEN_CHANNELS: NotificationChannelType[] = ['email', 'whatsapp', 'sms'];

const AVAILABLE_CHANNELS: ChannelOption[] = [
  {
    id: 'app_notifications',
    label: 'In-App Alerts',
    tagline: 'Live Dashboard Banners',
    badge: 'Desktop & Mobile',
    description: 'Real-time floating banners and sound chimes inside your dashboard for sales updates and booked meetings',
    icon: BellRing,
    accentColor: '#F59E0B',
    activeChipClass:
      'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20 shadow-sm',
    inactiveChipClass:
      'bg-muted/40 border-border text-muted-foreground hover:border-amber-500/50 hover:bg-amber-500/5 hover:text-foreground',
    activeCardBorder: 'border-amber-500/40 dark:border-amber-500/50',
    activeCardBg: 'bg-amber-500/5 dark:bg-amber-500/10',
    iconBgActive: 'bg-amber-600 text-white shadow-xs',
    iconBgInactive: 'bg-muted text-muted-foreground',
  },
  {
    id: 'email',
    label: 'Email',
    tagline: 'Summaries & Reports',
    badge: 'Full Reports',
    description: 'Detailed email reports for sales summaries, meetings booked, and customer conversation logs',
    icon: Mail,
    accentColor: '#6366F1',
    activeChipClass:
      'bg-indigo-500/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 shadow-sm',
    inactiveChipClass:
      'bg-muted/40 border-border text-muted-foreground hover:border-indigo-500/50 hover:bg-indigo-500/5 hover:text-foreground',
    activeCardBorder: 'border-indigo-500/40 dark:border-indigo-500/50',
    activeCardBg: 'bg-indigo-500/5 dark:bg-indigo-500/10',
    iconBgActive: 'bg-indigo-600 text-white shadow-xs',
    iconBgInactive: 'bg-muted text-muted-foreground',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    tagline: 'Instant Chat Alerts',
    badge: 'Fastest Response',
    description: 'Instant alerts for sales reporting, meetings booked, and new leads sent straight to WhatsApp',
    icon: MessageSquare,
    accentColor: '#25D366',
    activeChipClass:
      'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-sm',
    inactiveChipClass:
      'bg-muted/40 border-border text-muted-foreground hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:text-foreground',
    activeCardBorder: 'border-emerald-500/40 dark:border-emerald-500/50',
    activeCardBg: 'bg-emerald-500/5 dark:bg-emerald-500/10',
    iconBgActive: 'bg-emerald-600 text-white shadow-xs',
    iconBgInactive: 'bg-muted text-muted-foreground',
  },
  {
    id: 'sms',
    label: 'SMS Text',
    tagline: 'Direct Mobile SMS',
    badge: 'High Priority',
    description: 'Direct SMS notifications to mobile numbers for sales updates, meetings booked, and urgent inquiries',
    icon: Smartphone,
    accentColor: '#0284C7',
    activeChipClass:
      'bg-sky-500/15 border-sky-500 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20 shadow-sm',
    inactiveChipClass:
      'bg-muted/40 border-border text-muted-foreground hover:border-sky-500/50 hover:bg-sky-500/5 hover:text-foreground',
    activeCardBorder: 'border-sky-500/40 dark:border-sky-500/50',
    activeCardBg: 'bg-sky-500/5 dark:bg-sky-500/10',
    iconBgActive: 'bg-sky-600 text-white shadow-xs',
    iconBgInactive: 'bg-muted text-muted-foreground',
  },
];

const WORKSPACE_NOTIFICATIONS_STORAGE_PREFIX = 'zivofly_workspace_notifications_v1_';

function createInitialWorkspaceNotifications(
  workspaceId: string,
  agentId?: string | null,
  agentName?: string
): WorkspaceNotification[] {
  const now = Date.now();
  const displayAgentName = agentName?.trim() || 'AI Concierge';
  const agentRoute = agentId ? `/agents/${agentId}` : '/agents';

  return [
    {
      id: `notif_${workspaceId}_1`,
      workspaceId,
      agentId: agentId || undefined,
      category: 'agent_activities',
      eventType: 'human_assistance',
      channelOrEventLabel: 'Agent Activity · Human Handoff',
      title: 'Human assistance required',
      message: `${displayAgentName} flagged a customer conversation requesting a custom enterprise quote.`,
      createdAt: new Date(now - 4 * 60 * 1000).toISOString(),
      read: false,
      targetRoute: '/inbox',
      pushMetadata: {
        pushChannelId: 'agent_handoff',
        priority: 'high',
        deepLinkUrl: '/inbox',
      },
    },
    {
      id: `notif_${workspaceId}_2`,
      workspaceId,
      agentId: agentId || undefined,
      category: 'communication_channels',
      eventType: 'whatsapp_message',
      channelOrEventLabel: 'WhatsApp',
      title: 'New WhatsApp message',
      message: 'Customer asked about express delivery availability and order tracking for #ORD-4092.',
      createdAt: new Date(now - 14 * 60 * 1000).toISOString(),
      read: false,
      targetRoute: '/inbox',
      pushMetadata: {
        pushChannelId: 'channel_whatsapp',
        priority: 'high',
        deepLinkUrl: '/inbox',
      },
    },
    {
      id: `notif_${workspaceId}_3`,
      workspaceId,
      agentId: agentId || undefined,
      category: 'business_activities',
      eventType: 'new_sale',
      channelOrEventLabel: 'Business Activity · Sale',
      title: 'New sale received',
      message: 'Completed order for Premium Annual Package ($240.00) assisted via automated checkout link.',
      createdAt: new Date(now - 38 * 60 * 1000).toISOString(),
      read: false,
      targetRoute: '/inbox',
      pushMetadata: {
        pushChannelId: 'business_sales',
        priority: 'high',
        deepLinkUrl: '/inbox',
      },
    },
    {
      id: `notif_${workspaceId}_4`,
      workspaceId,
      agentId: agentId || undefined,
      category: 'business_activities',
      eventType: 'new_booking',
      channelOrEventLabel: 'Business Activity · Booking',
      title: 'New booking received',
      message: 'Consultation appointment scheduled for tomorrow at 2:30 PM and synced to calendar.',
      createdAt: new Date(now - 65 * 60 * 1000).toISOString(),
      read: false,
      targetRoute: '/inbox',
      pushMetadata: {
        pushChannelId: 'business_bookings',
        priority: 'normal',
        deepLinkUrl: '/inbox',
      },
    },
    {
      id: `notif_${workspaceId}_5`,
      workspaceId,
      agentId: agentId || undefined,
      category: 'communication_channels',
      eventType: 'instagram_message',
      channelOrEventLabel: 'Instagram',
      title: 'New Instagram message',
      message: '@ElenaStudio sent a DM inquiring about product sizing and restock dates.',
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      read: true,
      targetRoute: '/inbox',
      pushMetadata: {
        pushChannelId: 'channel_instagram',
        priority: 'normal',
        deepLinkUrl: '/inbox',
      },
    },
    {
      id: `notif_${workspaceId}_6`,
      workspaceId,
      agentId: agentId || undefined,
      category: 'business_activities',
      eventType: 'customer_inquiry',
      channelOrEventLabel: 'Business Activity · Inquiry',
      title: 'New customer inquiry',
      message: 'New lead submitted contact details requesting a callback regarding bulk pricing.',
      createdAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      read: true,
      targetRoute: '/inbox',
      pushMetadata: {
        pushChannelId: 'business_inquiries',
        priority: 'normal',
        deepLinkUrl: '/inbox',
      },
    },
    {
      id: `notif_${workspaceId}_7`,
      workspaceId,
      agentId: agentId || undefined,
      category: 'communication_channels',
      eventType: 'facebook_message',
      channelOrEventLabel: 'Facebook Messenger',
      title: 'New Facebook message',
      message: 'Marcus Vance messaged your Facebook Page asking for store opening hours this weekend.',
      createdAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      read: true,
      targetRoute: '/inbox',
      pushMetadata: {
        pushChannelId: 'channel_facebook',
        priority: 'normal',
        deepLinkUrl: '/inbox',
      },
    },
    {
      id: `notif_${workspaceId}_8`,
      workspaceId,
      agentId: agentId || undefined,
      category: 'communication_channels',
      eventType: 'tiktok_activity',
      channelOrEventLabel: 'TikTok',
      title: 'New TikTok activity',
      message: 'New comment on your pinned product showcase video: "How can I order this?"',
      createdAt: new Date(now - 7 * 60 * 60 * 1000).toISOString(),
      read: true,
      targetRoute: '/inbox',
      pushMetadata: {
        pushChannelId: 'channel_tiktok',
        priority: 'normal',
        deepLinkUrl: '/inbox',
      },
    },
    {
      id: `notif_${workspaceId}_9`,
      workspaceId,
      agentId: agentId || undefined,
      category: 'agent_activities',
      eventType: 'agent_resumed',
      channelOrEventLabel: 'Agent Activity · Status',
      title: 'Agent resumed',
      message: `${displayAgentName} is active and responding to incoming customer conversations.`,
      createdAt: new Date(now - 12 * 60 * 60 * 1000).toISOString(),
      read: true,
      targetRoute: agentRoute,
      pushMetadata: {
        pushChannelId: 'agent_status',
        priority: 'normal',
        deepLinkUrl: agentRoute,
      },
    },
    {
      id: `notif_${workspaceId}_10`,
      workspaceId,
      agentId: agentId || undefined,
      category: 'agent_activities',
      eventType: 'agent_paused',
      channelOrEventLabel: 'Agent Activity · Status',
      title: 'Agent paused',
      message: `${displayAgentName} was temporarily paused for knowledge base updates.`,
      createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      read: true,
      targetRoute: agentRoute,
      pushMetadata: {
        pushChannelId: 'agent_status',
        priority: 'normal',
        deepLinkUrl: agentRoute,
      },
    },
    {
      id: `notif_${workspaceId}_11`,
      workspaceId,
      agentId: agentId || undefined,
      category: 'agent_activities',
      eventType: 'agent_error',
      channelOrEventLabel: 'Agent Activity · Alert',
      title: 'Agent error or failure',
      message: 'External spreadsheet sync timed out once and automatically recovered on retry.',
      createdAt: new Date(now - 30 * 60 * 60 * 1000).toISOString(),
      read: true,
      targetRoute: agentRoute,
      pushMetadata: {
        pushChannelId: 'agent_alerts',
        priority: 'high',
        deepLinkUrl: agentRoute,
      },
    },
  ];
}

function getEventIconConfig(eventType: WorkspaceNotificationEventType): {
  icon: React.ComponentType<{ className?: string }>;
  bgClass: string;
  iconClass: string;
  badgeClass: string;
} {
  switch (eventType) {
    case 'whatsapp_message':
      return {
        icon: Phone,
        bgClass: 'bg-emerald-500/15 border-emerald-500/30',
        iconClass: 'text-[#25D366]',
        badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
      };
    case 'instagram_message':
      return {
        icon: Instagram,
        bgClass: 'bg-pink-500/15 border-pink-500/30',
        iconClass: 'text-[#E1306C]',
        badgeClass: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20',
      };
    case 'facebook_message':
      return {
        icon: Facebook,
        bgClass: 'bg-blue-500/15 border-blue-500/30',
        iconClass: 'text-[#0866FF]',
        badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
      };
    case 'tiktok_activity':
      return {
        icon: TikTokLogo,
        bgClass: 'bg-neutral-500/15 border-neutral-500/30',
        iconClass: 'text-foreground',
        badgeClass: 'bg-muted text-foreground border-border',
      };
    case 'new_sale':
      return {
        icon: ShoppingBag,
        bgClass: 'bg-emerald-500/15 border-emerald-500/30',
        iconClass: 'text-emerald-600 dark:text-emerald-400',
        badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
      };
    case 'new_booking':
      return {
        icon: CalendarCheck,
        bgClass: 'bg-indigo-500/15 border-indigo-500/30',
        iconClass: 'text-indigo-600 dark:text-indigo-400',
        badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
      };
    case 'customer_inquiry':
      return {
        icon: HelpCircle,
        bgClass: 'bg-sky-500/15 border-sky-500/30',
        iconClass: 'text-sky-600 dark:text-sky-400',
        badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
      };
    case 'human_assistance':
      return {
        icon: UserCheck,
        bgClass: 'bg-amber-500/15 border-amber-500/30',
        iconClass: 'text-amber-600 dark:text-amber-400',
        badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
      };
    case 'agent_paused':
      return {
        icon: PauseCircle,
        bgClass: 'bg-amber-500/15 border-amber-500/30',
        iconClass: 'text-amber-600 dark:text-amber-400',
        badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
      };
    case 'agent_resumed':
      return {
        icon: PlayCircle,
        bgClass: 'bg-emerald-500/15 border-emerald-500/30',
        iconClass: 'text-emerald-600 dark:text-emerald-400',
        badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
      };
    case 'agent_error':
      return {
        icon: AlertTriangle,
        bgClass: 'bg-destructive/15 border-destructive/30',
        iconClass: 'text-destructive',
        badgeClass: 'bg-destructive/10 text-destructive border-destructive/20',
      };
  }
}

function formatNotificationTime(isoString: string): string {
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs)) return 'Just now';

  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const NotificationChannelsSection: React.FC<NotificationChannelsSectionProps> = ({
  value,
  onChange,
  workspaceId,
  agentId,
  agentName,
  onNavigate,
}) => {
  const [internalConfig, setInternalConfig] = useState<NotificationsConfig>(() => {
    return (
      value || {
        channels: ['email'],
        details: {
          email: { emailAddress: 'admin@example.com' },
          whatsapp: { phoneNumber: '', countryCode: '+1' },
          sms: { phoneNumber: '' },
          app_notifications: { target: 'Account Owner', soundAlerts: true },
        },
      }
    );
  });

  // State for token cost confirmation prompt
  const [pendingTokenChannel, setPendingTokenChannel] = useState<NotificationChannelType | 'all' | null>(null);

  // Resolve active workspace key for strict workspace isolation
  const resolvedWorkspaceKey = (workspaceId && workspaceId.trim()) || 'active_workspace';
  const storageKey = `${WORKSPACE_NOTIFICATIONS_STORAGE_PREFIX}${resolvedWorkspaceKey}`;

  const [notifications, setNotifications] = useState<WorkspaceNotification[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((item) => item && item.workspaceId === resolvedWorkspaceKey);
        }
      }
    } catch {
      // ignore storage read error
    }
    return createInitialWorkspaceNotifications(resolvedWorkspaceKey, agentId, agentName);
  });

  // Reload workspace-scoped notifications when active workspace changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setNotifications(
            parsed.filter((item) => item && item.workspaceId === resolvedWorkspaceKey)
          );
          return;
        }
      }
    } catch {
      // ignore
    }
    const seeded = createInitialWorkspaceNotifications(resolvedWorkspaceKey, agentId, agentName);
    setNotifications(seeded);
  }, [storageKey, resolvedWorkspaceKey, agentId, agentName]);

  const persistNotifications = (updated: WorkspaceNotification[]) => {
    const workspaceOnly = updated.filter((item) => item.workspaceId === resolvedWorkspaceKey);
    setNotifications(workspaceOnly);
    try {
      localStorage.setItem(storageKey, JSON.stringify(workspaceOnly));
    } catch {
      // ignore storage write error
    }
  };

  // Sync with prop if provided externally
  useEffect(() => {
    if (value) {
      setInternalConfig(value);
    }
  }, [value]);

  const updateConfig = (newConfig: NotificationsConfig) => {
    setInternalConfig(newConfig);
    if (onChange) {
      onChange(newConfig);
    }
  };

  const applyEnableChannel = (channelId: NotificationChannelType) => {
    const channels = internalConfig.channels || [];
    if (channels.includes(channelId)) return;
    const newChannels: NotificationChannelType[] = [...channels, channelId];
    const label = AVAILABLE_CHANNELS.find((c) => c.id === channelId)?.label || channelId;
    toast.success(`Enabled ${label} notifications`);

    const updated: NotificationsConfig = {
      ...internalConfig,
      channels: newChannels,
    };
    updateConfig(updated);
  };

  const toggleChannel = (channelId: NotificationChannelType) => {
    const channels = internalConfig.channels || [];
    const exists = channels.includes(channelId);

    if (exists) {
      const newChannels = channels.filter((c) => c !== channelId);
      const label = AVAILABLE_CHANNELS.find((c) => c.id === channelId)?.label || channelId;
      toast.info(`Disabled ${label} notifications`);

      const updated: NotificationsConfig = {
        ...internalConfig,
        channels: newChannels,
      };
      updateConfig(updated);
    } else {
      if (PAID_TOKEN_CHANNELS.includes(channelId)) {
        setPendingTokenChannel(channelId);
        return;
      }
      applyEnableChannel(channelId);
    }
  };

  const applySelectAllChannels = () => {
    const allIds: NotificationChannelType[] = ['app_notifications', 'email', 'whatsapp', 'sms'];
    const updated: NotificationsConfig = {
      ...internalConfig,
      channels: allIds,
    };
    updateConfig(updated);
    toast.success('Enabled all notification channels');
  };

  const selectAllChannels = () => {
    const channels = internalConfig.channels || [];
    const needsTokenPrompt = PAID_TOKEN_CHANNELS.some((id) => !channels.includes(id));
    if (needsTokenPrompt) {
      setPendingTokenChannel('all');
      return;
    }
    applySelectAllChannels();
  };

  const clearAllChannels = () => {
    const updated: NotificationsConfig = {
      ...internalConfig,
      channels: [],
    };
    updateConfig(updated);
    toast.info('Disabled all notification channels');
  };

  const handleConfirmTokenChannel = () => {
    if (!pendingTokenChannel) return;
    if (pendingTokenChannel === 'all') {
      applySelectAllChannels();
    } else {
      applyEnableChannel(pendingTokenChannel);
    }
    setPendingTokenChannel(null);
  };

  const pendingChannelLabel =
    pendingTokenChannel === 'all'
      ? 'Email, WhatsApp & SMS Text'
      : AVAILABLE_CHANNELS.find((c) => c.id === pendingTokenChannel)?.label || '';

  const activeChannelsCount = internalConfig.channels.length;

  // Sort notifications newest first and strictly for current workspace
  const sortedNotifications = useMemo(() => {
    return [...notifications]
      .filter((n) => n.workspaceId === resolvedWorkspaceKey)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications, resolvedWorkspaceKey]);

  const unreadCount = useMemo(
    () => sortedNotifications.filter((n) => !n.read).length,
    [sortedNotifications]
  );

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    persistNotifications(updated);
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) return;
    const updated = notifications.map((n) => ({ ...n, read: true }));
    persistNotifications(updated);
    toast.success('Marked all notifications as read');
  };

  const handleDeleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notifications.filter((n) => n.id !== id);
    persistNotifications(updated);
    toast.info('Notification deleted');
  };

  const handleOpenNotification = (item: WorkspaceNotification) => {
    if (!item.read) {
      handleMarkAsRead(item.id);
    }
    if (item.targetRoute && onNavigate) {
      onNavigate(item.targetRoute);
    } else {
      toast.info(`${item.title} — ${item.channelOrEventLabel}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* EXISTING NOTIFICATION CHANNELS CARD                          */}
      {/* ============================================================ */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs space-y-6">
        {/* 1. Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h3 className="text-base font-bold text-foreground tracking-tight">
              Notification Channels & Activity Alerts
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Select where the agent should instantly notify your team about sales reports, meetings booked, and customer activity. Ideal if you don&apos;t have an automated reporting system.
            </p>
          </div>

          {/* Quick Summary Pill & Actions */}
          <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
            <button
              type="button"
              onClick={activeChannelsCount === AVAILABLE_CHANNELS.length ? clearAllChannels : selectAllChannels}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-muted/60 hover:bg-muted text-foreground shadow-2xs hover:shadow-xs active:scale-[0.98] transition-all cursor-pointer"
            >
              {activeChannelsCount === AVAILABLE_CHANNELS.length ? (
                <RotateCcw className="size-3.5 text-muted-foreground" />
              ) : (
                <CheckCheck className="size-3.5 text-primary" />
              )}
              <span>{activeChannelsCount === AVAILABLE_CHANNELS.length ? 'Clear All' : 'Select All'}</span>
            </button>
            <div
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                activeChannelsCount > 0
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25'
              }`}
            >
              <ShieldCheck className="size-3.5" />
              <span>
                {activeChannelsCount === 0
                  ? 'No Channels'
                  : `${activeChannelsCount} of ${AVAILABLE_CHANNELS.length} Active`}
              </span>
            </div>
          </div>
        </div>

        {/* 2. DISTINCT HIGH-VISIBILITY TOGGLE CHIPS / BUTTONS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Notification Channel Selection
            </label>
            <span className="text-[11px] text-muted-foreground">
              Toggle on to configure instant routing
            </span>
          </div>

          {/* Segmented Chip Toggle Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {AVAILABLE_CHANNELS.map((channel) => {
              const isSelected = (internalConfig.channels || []).includes(channel.id);
              const Icon = channel.icon;

              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => toggleChannel(channel.id)}
                  className={`group relative flex items-center justify-between gap-2.5 rounded-xl border-2 px-3.5 py-3 transition-all cursor-pointer select-none text-left ${
                    isSelected ? channel.activeChipClass : channel.inactiveChipClass
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex size-8 items-center justify-center rounded-lg transition-transform group-hover:scale-105 shrink-0 ${
                        isSelected ? channel.iconBgActive : channel.iconBgInactive
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold truncate text-foreground">
                        {channel.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {isSelected ? 'Active' : 'Off'}
                      </div>
                    </div>
                  </div>

                  {/* Switch indicator badge */}
                  <div
                    className={`flex size-5.5 items-center justify-center rounded-full border transition-all shrink-0 ${
                      isSelected
                        ? 'bg-foreground text-background border-transparent shadow-xs'
                        : 'border-border bg-background/80 text-muted-foreground group-hover:border-foreground/40'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="size-3 stroke-[3]" />
                    ) : (
                      <div className="size-1.5 rounded-full bg-muted-foreground/50 group-hover:bg-foreground/60" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Token Cost Confirmation Modal */}
        {pendingTokenChannel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-background rounded-2xl max-w-md w-full shadow-2xl border border-border overflow-hidden text-foreground">
              <div className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto text-amber-500 border border-amber-500/20">
                  <Coins className="w-6 h-6" />
                </div>

                <div className="text-center space-y-1.5">
                  <h3 className="text-base font-bold text-foreground">
                    Enable {pendingChannelLabel}?
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Adding <span className="font-semibold text-foreground">{pendingChannelLabel}</span> notifications will cost you tokens each time an alert is sent.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setPendingTokenChannel(null)}
                    className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent border border-border rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmTokenChannel}
                    className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MOBILE-STYLE NOTIFICATION INBOX                              */}
      {/* ============================================================ */}
      <div
        id="notification-inbox-section"
        className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs space-y-5"
      >
        {/* Inbox Header & Top Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                <Bell className="size-4" />
              </div>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                Notification Inbox
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Stay updated with important activities and conversations happening across your business.
            </p>
          </div>

          {/* Inbox Controls: All Notifications, Unread Count Badge, Mark All as Read */}
          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center shrink-0">
            <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground">
              <span>All Notifications</span>
              <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-mono text-muted-foreground border border-border">
                {sortedNotifications.length}
              </span>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border ${
                unreadCount > 0
                  ? 'bg-primary/10 text-primary border-primary/25'
                  : 'bg-muted/40 text-muted-foreground border-border'
              }`}
            >
              <span
                className={`size-2 rounded-full ${
                  unreadCount > 0 ? 'bg-primary animate-pulse' : 'bg-muted-foreground/40'
                }`}
              />
              <span>{unreadCount} Unread</span>
            </span>

            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background hover:bg-accent px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCheck className="size-3.5 text-primary" />
              <span>Mark All as Read</span>
            </button>
          </div>
        </div>

        {/* Mobile Notification Shade Container */}
        <div className="rounded-2xl border border-border/80 bg-muted/25 p-3 sm:p-4 space-y-2.5 max-h-[560px] overflow-y-auto">
          {sortedNotifications.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Bell className="size-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground">
                You&apos;re all caught up on workspace activity.
              </p>
            </div>
          ) : (
            sortedNotifications.map((item) => {
              const { icon: EventIcon, bgClass, iconClass, badgeClass } = getEventIconConfig(
                item.eventType
              );

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenNotification(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenNotification(item);
                    }
                  }}
                  className={`group relative flex items-start justify-between gap-3.5 rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer select-none ${
                    item.read
                      ? 'border-border/70 bg-card/75 hover:bg-card text-muted-foreground'
                      : 'border-primary/30 bg-card shadow-xs hover:border-primary/50 text-foreground'
                  }`}
                >
                  {/* Left: Channel/Event Icon + Content */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`flex size-10 items-center justify-center rounded-xl border shrink-0 mt-0.5 ${bgClass}`}
                    >
                      <EventIcon className={`size-4.5 ${iconClass}`} />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      {/* Top Meta Row: Channel/Event Label + Time Received + Read/Unread Indicator */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-tight ${badgeClass}`}
                        >
                          {item.channelOrEventLabel}
                        </span>

                        <span className="text-[11px] font-mono text-muted-foreground">
                          {formatNotificationTime(item.createdAt)}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            item.read
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              item.read ? 'bg-muted-foreground/50' : 'bg-primary'
                            }`}
                          />
                          <span>{item.read ? 'Read' : 'Unread'}</span>
                        </span>
                      </div>

                      {/* Notification Title */}
                      <div className="flex items-center gap-1.5">
                        <h4
                          className={`text-xs sm:text-sm truncate ${
                            item.read
                              ? 'font-semibold text-foreground/85'
                              : 'font-bold text-foreground'
                          }`}
                        >
                          {item.title}
                        </h4>
                        <ChevronRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>

                      {/* Short Notification Message */}
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {item.message}
                      </p>
                    </div>
                  </div>

                  {/* Right: Individual Card Actions (Mark as Read & Delete Notification) */}
                  <div className="flex items-center gap-1.5 shrink-0 self-center">
                    {!item.read && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        title="Mark as Read"
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background hover:bg-accent px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition-colors cursor-pointer"
                      >
                        <Check className="size-3 text-primary" />
                        <span className="hidden sm:inline">Mark as Read</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleDeleteNotification(item.id, e)}
                      title="Delete Notification"
                      aria-label={`Delete notification ${item.title}`}
                      className="inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive p-1.5 text-muted-foreground transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
