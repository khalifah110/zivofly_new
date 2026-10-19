import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Microsoft365Config } from '../types';
import {
  Microsoft365Logo,
  OutlookLogo,
  ExcelLogo,
  WordLogo,
  SharePointLogo,
} from './BrandLogos';

interface Microsoft365SectionProps {
  value?: Microsoft365Config;
  onChange?: (config: Microsoft365Config) => void;
  compact?: boolean;
}

export const Microsoft365Section: React.FC<Microsoft365SectionProps> = ({
  value,
  onChange,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Safe fallback state
  const config: Microsoft365Config = value || {
    outlook: { enabled: false, status: 'disconnected' },
    excel: { enabled: false, status: 'disconnected' },
    word: { enabled: false, status: 'disconnected' },
    sharepoint: { enabled: false, status: 'disconnected' },
  };

  const apps = [
    {
      key: 'outlook' as const,
      name: 'Outlook',
      logo: OutlookLogo,
      description:
        'Send automated email follow-ups, read inbound client tickets, and coordinate calendar meetings via Exchange.',
      isConnected: config.outlook?.status === 'connected',
      email: config.outlook?.accountEmail,
    },
    {
      key: 'excel' as const,
      name: 'Excel',
      logo: ExcelLogo,
      description:
        'Query live financial sheets, product stock tables, and append customer leads directly into Excel workbooks.',
      isConnected: config.excel?.status === 'connected',
      email: config.excel?.accountEmail,
    },
    {
      key: 'word' as const,
      name: 'Word',
      logo: WordLogo,
      description:
        'Draft business proposals, access company knowledge documents, and generate customized reports.',
      isConnected: config.word?.status === 'connected',
      email: config.word?.accountEmail,
    },
    {
      key: 'sharepoint' as const,
      name: 'SharePoint',
      logo: SharePointLogo,
      description:
        'Access team document libraries, corporate policies, shared sites, and enterprise knowledge repositories.',
      isConnected: config.sharepoint?.status === 'connected',
      email: config.sharepoint?.accountEmail,
    },
  ];

  const connectedCount = apps.filter((app) => app.isConnected).length;

  const handleConnect = (key: 'outlook' | 'excel' | 'word' | 'sharepoint', appName: string) => {
    const currentApp = config[key] || { enabled: false, status: 'disconnected' };
    const updated: Microsoft365Config = {
      ...config,
      [key]: {
        ...currentApp,
        enabled: true,
        status: 'connected',
        lastSyncedAt: new Date().toISOString(),
        accountEmail: 'business@office365.com',
      },
    };
    onChange?.(updated);
    toast.info('Microsoft 365 OAuth connect will be added soon.');
  };

  const handleDisconnect = (key: 'outlook' | 'excel' | 'word' | 'sharepoint', appName: string) => {
    const currentApp = config[key];
    const updated: Microsoft365Config = {
      ...config,
      [key]: {
        ...currentApp,
        enabled: false,
        status: 'disconnected',
      },
    };
    onChange?.(updated);
    toast.success(`Disconnected from ${appName}`);
  };

  return (
    <div className="space-y-4">
      {/* Main Microsoft 365 Hub Header Card */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden transition-all">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsExpanded(!isExpanded)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsExpanded(!isExpanded);
            }
          }}
          className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-muted/40 transition-colors select-none"
        >
          <div className="flex items-center gap-3.5">
            {/* Microsoft 365 Official Logo */}
            <div className="flex size-11 items-center justify-center rounded-xl bg-white dark:bg-muted border border-border shadow-xs shrink-0 p-2">
              <Microsoft365Logo className="size-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-foreground">
                  Microsoft 365
                </span>
                {connectedCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="size-3" />
                    <span>{connectedCount}/4 Connected</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
                    4 Tools Available
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connect your enterprise Microsoft 365 apps (Outlook, Excel, Word, SharePoint) to sync corporate emails, spreadsheets, and document repositories.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-xs font-semibold text-primary hidden sm:inline">
              {isExpanded ? 'Hide Apps' : 'Show Apps'}
            </span>
            <div className="p-1 rounded-lg border border-border bg-background text-muted-foreground">
              {isExpanded ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </div>
          </div>
        </div>

        {/* Expanded Apps List */}
        {isExpanded && (
          <div className="border-t border-border p-4 sm:p-6 bg-muted/20 space-y-3 animate-in fade-in duration-200">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Select & Connect Microsoft 365 Tools
            </div>

            <div className="grid grid-cols-1 gap-3">
              {apps.map((app) => {
                const LogoComponent = app.logo;
                return (
                  <div
                    key={app.key}
                    className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-border/80 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-white dark:bg-muted p-2 shrink-0 mt-0.5 sm:mt-0 shadow-2xs">
                        <LogoComponent className="size-5" />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-foreground">
                            {app.name}
                          </span>
                          {app.isConnected && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="size-2.5" />
                              <span>Active</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {app.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0 pt-1 sm:pt-0">
                      {app.isConnected ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="size-3.5" />
                            <span>Connected</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDisconnect(app.key, app.name)}
                            className="text-xs text-muted-foreground hover:text-red-500 px-2 py-1 transition-colors cursor-pointer"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConnect(app.key, app.name)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
                        >
                          <LogoComponent className="size-3.5" />
                          <span>Connect to {app.name}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
