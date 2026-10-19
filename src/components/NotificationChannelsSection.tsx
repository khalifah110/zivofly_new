import React, { useState, useEffect } from 'react';
import {
  Check,
  CheckCheck,
  RotateCcw,
  MessageSquare,
  Smartphone,
  Mail,
  BellRing,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  NotificationChannelType,
  NotificationsConfig,
  WhatsAppNotificationDetails,
  SmsNotificationDetails,
  EmailNotificationDetails,
} from '../types';

interface NotificationChannelsSectionProps {
  value?: NotificationsConfig;
  onChange?: (config: NotificationsConfig) => void;
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

const AVAILABLE_CHANNELS: ChannelOption[] = [
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
];

export const NotificationChannelsSection: React.FC<NotificationChannelsSectionProps> = ({
  value,
  onChange,
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

  const toggleChannel = (channelId: NotificationChannelType) => {
    const channels = internalConfig.channels || [];
    const exists = channels.includes(channelId);
    let newChannels: NotificationChannelType[];

    if (exists) {
      newChannels = channels.filter((c) => c !== channelId);
      const label = AVAILABLE_CHANNELS.find((c) => c.id === channelId)?.label || channelId;
      toast.info(`Disabled ${label} notifications`);
    } else {
      newChannels = [...channels, channelId];
      const label = AVAILABLE_CHANNELS.find((c) => c.id === channelId)?.label || channelId;
      toast.success(`Enabled ${label} notifications`);
    }

    const updated: NotificationsConfig = {
      ...internalConfig,
      channels: newChannels,
    };
    updateConfig(updated);
  };

  const selectAllChannels = () => {
    const allIds: NotificationChannelType[] = ['whatsapp', 'sms', 'email', 'app_notifications'];
    const updated: NotificationsConfig = {
      ...internalConfig,
      channels: allIds,
    };
    updateConfig(updated);
    toast.success('Enabled all notification channels');
  };

  const clearAllChannels = () => {
    const updated: NotificationsConfig = {
      ...internalConfig,
      channels: [],
    };
    updateConfig(updated);
    toast.info('Disabled all notification channels');
  };

  const updateWhatsApp = (patch: Partial<WhatsAppNotificationDetails>) => {
    const updated: NotificationsConfig = {
      ...internalConfig,
      details: {
        ...internalConfig.details,
        whatsapp: {
          ...(internalConfig.details?.whatsapp || { phoneNumber: '' }),
          ...patch,
        },
      },
    };
    updateConfig(updated);
  };

  const updateSms = (patch: Partial<SmsNotificationDetails>) => {
    const updated: NotificationsConfig = {
      ...internalConfig,
      details: {
        ...internalConfig.details,
        sms: {
          ...(internalConfig.details?.sms || { phoneNumber: '' }),
          ...patch,
        },
      },
    };
    updateConfig(updated);
  };

  const updateEmail = (patch: Partial<EmailNotificationDetails>) => {
    const updated: NotificationsConfig = {
      ...internalConfig,
      details: {
        ...internalConfig.details,
        email: {
          ...(internalConfig.details?.email || { emailAddress: '' }),
          ...patch,
        },
      },
    };
    updateConfig(updated);
  };

  const updateAppNotifications = (patch: { target?: string; soundAlerts?: boolean }) => {
    const updated: NotificationsConfig = {
      ...internalConfig,
      details: {
        ...internalConfig.details,
        app_notifications: {
          target: internalConfig.details?.app_notifications?.target || 'Account Owner',
          soundAlerts: internalConfig.details?.app_notifications?.soundAlerts ?? true,
          ...patch,
        },
      },
    };
    updateConfig(updated);
  };

  const activeChannelsCount = internalConfig.channels.length;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs space-y-7">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h3 className="text-base font-bold text-foreground tracking-tight">
            Notification Channels & Activity Alerts
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Select where the agent should instantly notify your team about sales reports, meetings booked, and customer activity. Ideal if you don't have an automated reporting system.
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

      {/* 3. INTERACTIVE FULL-CARD TOGGLE DISPLAY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {AVAILABLE_CHANNELS.map((channel) => {
          const isSelected = (internalConfig.channels || []).includes(channel.id);
          const Icon = channel.icon;

          return (
            <div
              key={channel.id}
              className={`rounded-2xl border-2 transition-all p-4.5 flex flex-col justify-between gap-4 ${
                isSelected
                  ? `${channel.activeCardBorder} ${channel.activeCardBg} shadow-xs`
                  : 'border-border/70 bg-card/60 hover:border-border hover:bg-card'
              }`}
            >
              {/* Card Top Row with Toggle Switch */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-10 items-center justify-center rounded-xl transition-all ${
                      isSelected ? channel.iconBgActive : channel.iconBgInactive
                    }`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        {channel.label}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isSelected
                            ? 'bg-background/80 text-foreground border-border'
                            : 'bg-muted text-muted-foreground border-border/50'
                        }`}
                      >
                        {channel.badge}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                      {channel.tagline}
                    </p>
                  </div>
                </div>

                {/* High Visibility Toggle Switch Button */}
                <button
                  type="button"
                  onClick={() => toggleChannel(channel.id)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    isSelected ? 'bg-primary' : 'bg-muted-foreground/30 dark:bg-muted'
                  }`}
                  role="switch"
                  aria-checked={isSelected}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isSelected ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {channel.description}
              </p>

              {/* Channel Inline Quick Settings (When Enabled) */}
              {isSelected && (
                <div className="pt-3 border-t border-border/60 mt-1 space-y-3">
                  {channel.id === 'whatsapp' && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground flex items-center justify-between">
                        <span>WhatsApp Phone Number</span>
                        <span className="text-[10px] font-normal text-muted-foreground">e.g. +1 (555) 234-5678</span>
                      </label>
                      <input
                        type="tel"
                        value={internalConfig.details?.whatsapp?.phoneNumber || ''}
                        onChange={(e) => updateWhatsApp({ phoneNumber: e.target.value })}
                        placeholder="+1 (555) 234-5678"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                      />
                    </div>
                  )}

                  {channel.id === 'sms' && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-foreground flex items-center justify-between">
                        <span>Mobile Number for SMS</span>
                        <span className="text-[10px] font-normal text-muted-foreground">e.g. +1 (555) 987-6543</span>
                      </label>
                      <input
                        type="tel"
                        value={internalConfig.details?.sms?.phoneNumber || ''}
                        onChange={(e) => updateSms({ phoneNumber: e.target.value })}
                        placeholder="+1 (555) 987-6543"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                      />
                    </div>
                  )}

                  {channel.id === 'email' && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground">
                        Email Address for Notifications
                      </label>
                      <input
                        type="email"
                        value={internalConfig.details?.email?.emailAddress || ''}
                        onChange={(e) => updateEmail({ emailAddress: e.target.value })}
                        placeholder="alerts@yourdomain.com"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                      />
                    </div>
                  )}

                  {channel.id === 'app_notifications' && (
                    <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-background border border-border/80">
                      <div className="flex items-center gap-2">
                        {internalConfig.details?.app_notifications?.soundAlerts !== false ? (
                          <Volume2 className="size-4 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <VolumeX className="size-4 text-muted-foreground" />
                        )}
                        <span className="text-xs font-semibold text-foreground">
                          Sound Chime & Audible Ping
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateAppNotifications({
                            soundAlerts: internalConfig.details?.app_notifications?.soundAlerts === false,
                          })
                        }
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          internalConfig.details?.app_notifications?.soundAlerts !== false
                            ? 'bg-amber-600'
                            : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            internalConfig.details?.app_notifications?.soundAlerts !== false
                              ? 'translate-x-4'
                              : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
