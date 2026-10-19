import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { GoogleWorkspaceConfig, GoogleSheetToolConfig } from '../types';
import {
  GoogleWorkspaceLogo,
  GmailLogo,
  GoogleDriveLogo,
  GoogleDocsLogo,
  GoogleSheetsLogo,
  GoogleCalendarLogo,
} from './BrandLogos';

interface GoogleWorkspaceSectionProps {
  value?: GoogleWorkspaceConfig;
  onChange?: (config: GoogleWorkspaceConfig) => void;
  compact?: boolean;
}

export const GoogleWorkspaceSection: React.FC<GoogleWorkspaceSectionProps> = ({
  value,
  onChange,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Safe fallback state
  const config: GoogleWorkspaceConfig = value || {
    gmail: { enabled: false, status: 'disconnected' },
    drive: { enabled: false, status: 'disconnected' },
    docs: { enabled: false, status: 'disconnected' },
    sheets: { enabled: false, columns: [], sheetName: 'Sheet1', status: 'disconnected' },
    calendar: { enabled: false, status: 'disconnected' },
  };

  const apps = [
    {
      key: 'gmail' as const,
      name: 'Gmail',
      logo: GmailLogo,
      description:
        'Send automated booking confirmations, draft replies to client inquiries, and read inbound requests.',
      isConnected: config.gmail?.status === 'connected',
      email: config.gmail?.accountEmail,
    },
    {
      key: 'drive' as const,
      name: 'Google Drive',
      logo: GoogleDriveLogo,
      description:
        'Store shared client assets, access product catalogs and media folders, and archive generated receipts.',
      isConnected: config.drive?.status === 'connected',
      email: config.drive?.accountEmail,
    },
    {
      key: 'docs' as const,
      name: 'Google Docs',
      logo: GoogleDocsLogo,
      description:
        'Read standard operating procedures, extract policy guidelines, and generate formatted agreements.',
      isConnected: config.docs?.status === 'connected',
      email: config.docs?.accountEmail,
    },
    {
      key: 'sheets' as const,
      name: 'Google Sheets',
      logo: GoogleSheetsLogo,
      description:
        'Sync live product catalogues, pricing lists, or capture leads directly into your Google spreadsheets.',
      isConnected: config.sheets?.status === 'connected',
      email: undefined,
    },
    {
      key: 'calendar' as const,
      name: 'Google Calendar',
      logo: GoogleCalendarLogo,
      description:
        'Check real-time slot availability, schedule customer bookings, and dispatch Google Meet invites.',
      isConnected: config.calendar?.status === 'connected',
      email: config.calendar?.accountEmail,
    },
  ];

  const connectedCount = apps.filter((app) => app.isConnected).length;

  const handleConnect = (key: 'gmail' | 'drive' | 'docs' | 'sheets' | 'calendar', appName: string) => {
    if (key === 'sheets') {
      const currentSheets: GoogleSheetToolConfig = config.sheets || {
        enabled: false,
        columns: [],
        sheetName: 'Sheet1',
      };
      const updated: GoogleWorkspaceConfig = {
        ...config,
        sheets: {
          ...currentSheets,
          enabled: true,
          status: 'connected',
          lastSyncedAt: new Date().toISOString(),
        },
      };
      onChange?.(updated);
    } else {
      const currentApp = config[key] || { enabled: false, status: 'disconnected' };
      const updated: GoogleWorkspaceConfig = {
        ...config,
        [key]: {
          ...currentApp,
          enabled: true,
          status: 'connected',
          lastSyncedAt: new Date().toISOString(),
          accountEmail: 'business@workspace.com',
        },
      };
      onChange?.(updated);
    }

    toast.info('Google OAuth connect will be added soon.');
  };

  const handleDisconnect = (key: 'gmail' | 'drive' | 'docs' | 'sheets' | 'calendar', appName: string) => {
    if (key === 'sheets') {
      const currentSheets: GoogleSheetToolConfig = config.sheets || {
        enabled: false,
        columns: [],
        sheetName: 'Sheet1',
      };
      const updated: GoogleWorkspaceConfig = {
        ...config,
        sheets: {
          ...currentSheets,
          enabled: false,
          status: 'disconnected',
        },
      };
      onChange?.(updated);
    } else {
      const currentApp = config[key];
      const updated: GoogleWorkspaceConfig = {
        ...config,
        [key]: {
          ...currentApp,
          enabled: false,
          status: 'disconnected',
        },
      };
      onChange?.(updated);
    }

    toast.success(`Disconnected from ${appName}`);
  };

  return (
    <div className="space-y-4">
      {/* Main Google Workspace Hub Header Card */}
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
            {/* Google Workspace Official Logo */}
            <div className="flex size-11 items-center justify-center rounded-xl bg-white dark:bg-muted border border-border shadow-xs shrink-0 p-2">
              <GoogleWorkspaceLogo className="size-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-foreground">
                  Google Workspace
                </span>
                {connectedCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="size-3" />
                    <span>{connectedCount}/5 Connected</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
                    5 Tools Available
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automate Gmail, Google Drive, Google Docs, Google Sheets, and Google Calendar directly within your agent workflows.
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
              Select & Connect Google Workspace Tools
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
