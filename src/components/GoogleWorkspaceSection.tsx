import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  GoogleWorkspaceConfig,
  GoogleWorkspaceIntegrationStatus,
  GoogleWorkspaceServiceIdentifier,
} from '../types';
import {
  GoogleWorkspaceLogo,
  GmailLogo,
  GoogleDriveLogo,
  GoogleDocsLogo,
  GoogleSheetsLogo,
  GoogleCalendarLogo,
} from './BrandLogos';
import {
  createEmptyGoogleConnectionsMap,
  getGoogleWorkspaceIntegrationConnections,
  GOOGLE_WORKSPACE_SERVICE_MAP,
  GoogleIntegrationConnectionRecord,
  GoogleWorkspaceUiKey,
  processGoogleWorkspaceOAuthCallbackFromUrl,
  startGoogleWorkspaceOAuth,
  syncGoogleWorkspaceConfigWithRecords,
} from '../lib/supabaseService';

interface GoogleWorkspaceSectionProps {
  value?: GoogleWorkspaceConfig;
  onChange?: (config: GoogleWorkspaceConfig) => void;
  workspaceId?: string | null;
  agentId?: string | null;
  compact?: boolean;
}

export const GoogleWorkspaceSection: React.FC<GoogleWorkspaceSectionProps> = ({
  value,
  onChange,
  workspaceId,
  agentId,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [connectionsByService, setConnectionsByService] = useState<
    Record<
      GoogleWorkspaceServiceIdentifier,
      GoogleIntegrationConnectionRecord | null
    >
  >(() => createEmptyGoogleConnectionsMap());
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(false);
  const [connectingService, setConnectingService] =
    useState<GoogleWorkspaceServiceIdentifier | null>(null);
  const [oauthDiagnosticError, setOauthDiagnosticError] = useState<{
    appName: string;
    service: GoogleWorkspaceServiceIdentifier;
    message: string;
  } | null>(null);

  const valueRef = useRef<GoogleWorkspaceConfig | undefined>(value);
  valueRef.current = value;
  const onChangeRef = useRef<typeof onChange>(onChange);
  onChangeRef.current = onChange;

  const applyConnectionsToParent = useCallback(
    (
      nextMap: Record<
        GoogleWorkspaceServiceIdentifier,
        GoogleIntegrationConnectionRecord | null
      >
    ) => {
      setConnectionsByService(nextMap);
      if (onChangeRef.current) {
        const synced = syncGoogleWorkspaceConfigWithRecords(
          valueRef.current,
          nextMap
        );
        onChangeRef.current(synced);
      }
    },
    []
  );

  // Load real connection statuses from `public.integration_connections` and handle any OAuth callback query params
  useEffect(() => {
    let cancelled = false;

    const initializeGoogleIntegrations = async () => {
      setIsLoadingStatus(true);
      try {
        // 1. Check if the browser URL contains a Google OAuth callback (?google_oauth=success|error)
        const callbackRes = await processGoogleWorkspaceOAuthCallbackFromUrl({
          workspaceId,
          agentId,
        });

        if (cancelled) return;

        if (callbackRes.handled) {
          if (callbackRes.connectionsByService) {
            applyConnectionsToParent(callbackRes.connectionsByService);
          }
          if (callbackRes.outcome === 'success') {
            setOauthDiagnosticError(null);
            toast.success(
              callbackRes.message ||
                `Connected ${callbackRes.serviceLabel || 'Google Workspace'} successfully!`
            );
          } else if (callbackRes.outcome === 'error') {
            const errMessage =
              callbackRes.message ||
              'Google Workspace authorization could not be completed.';
            setOauthDiagnosticError({
              appName: callbackRes.serviceLabel || 'Google Workspace',
              service: callbackRes.service || 'gmail',
              message: errMessage,
            });
            toast.error(errMessage, { duration: 8000 });
          }
          // If callback already fetched fresh connections from Supabase, we are up to date
          if (callbackRes.connectionsByService) {
            return;
          }
        }

        // 2. Query actual connection records from `public.integration_connections`
        const { connectionsByService: freshMap } =
          await getGoogleWorkspaceIntegrationConnections({
            workspaceId,
            agentId,
          });

        if (!cancelled) {
          applyConnectionsToParent(freshMap);
        }
      } catch (err: any) {
        // If user is not authenticated yet, keep default disconnected map without inventing records
        if (!cancelled) {
          setConnectionsByService(createEmptyGoogleConnectionsMap());
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStatus(false);
        }
      }
    };

    void initializeGoogleIntegrations();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, agentId, applyConnectionsToParent]);

  const getAppRecordState = (
    key: GoogleWorkspaceUiKey
  ): {
    service: GoogleWorkspaceServiceIdentifier;
    status: GoogleWorkspaceIntegrationStatus;
    email?: string;
    lastError?: string | null;
  } => {
    const service = GOOGLE_WORKSPACE_SERVICE_MAP[key];
    const record = connectionsByService[service];
    if (!record) {
      return {
        service,
        status: 'disconnected',
        email: undefined,
        lastError: null,
      };
    }

    return {
      service,
      status: record.status,
      email: record.account_email || undefined,
      lastError: record.last_error || null,
    };
  };

  const apps: Array<{
    key: GoogleWorkspaceUiKey;
    service: GoogleWorkspaceServiceIdentifier;
    name: string;
    logo: React.FC<{ className?: string }>;
    description: string;
    status: GoogleWorkspaceIntegrationStatus;
    isConnected: boolean;
    email?: string;
    lastError?: string | null;
  }> = [
    {
      key: 'gmail',
      name: 'Gmail',
      logo: GmailLogo,
      description:
        'Send automated booking confirmations, draft replies to client inquiries, and read inbound requests.',
      ...getAppRecordState('gmail'),
      isConnected: getAppRecordState('gmail').status === 'connected',
    },
    {
      key: 'drive',
      name: 'Google Drive',
      logo: GoogleDriveLogo,
      description:
        'Store shared client assets, access product catalogs and media folders, and archive generated receipts.',
      ...getAppRecordState('drive'),
      isConnected: getAppRecordState('drive').status === 'connected',
    },
    {
      key: 'docs',
      name: 'Google Docs',
      logo: GoogleDocsLogo,
      description:
        'Read standard operating procedures, extract policy guidelines, and generate formatted agreements.',
      ...getAppRecordState('docs'),
      isConnected: getAppRecordState('docs').status === 'connected',
    },
    {
      key: 'sheets',
      name: 'Google Sheets',
      logo: GoogleSheetsLogo,
      description:
        'Sync live product catalogues, pricing lists, or capture leads directly into your Google spreadsheets.',
      ...getAppRecordState('sheets'),
      isConnected: getAppRecordState('sheets').status === 'connected',
    },
    {
      key: 'calendar',
      name: 'Google Calendar',
      logo: GoogleCalendarLogo,
      description:
        'Check real-time slot availability, schedule customer bookings, and dispatch Google Meet invites.',
      ...getAppRecordState('calendar'),
      isConnected: getAppRecordState('calendar').status === 'connected',
    },
  ];

  const connectedCount = apps.filter((app) => app.isConnected).length;

  const handleConnect = async (
    key: GoogleWorkspaceUiKey,
    appName: string
  ) => {
    const service = GOOGLE_WORKSPACE_SERVICE_MAP[key];
    if (connectingService) {
      return;
    }

    setConnectingService(service);
    setOauthDiagnosticError(null);

    try {
      const { authorizationUrl } = await startGoogleWorkspaceOAuth({
        service,
        workspaceId,
        agentId,
      });

      // Redirect browser to Google OAuth authorization URL returned by the Edge Function
      window.location.href = authorizationUrl;
    } catch (err: any) {
      setConnectingService(null);
      const errMsg =
        err?.message ||
        `Could not start Google OAuth for ${appName}. Please try again.`;
      setOauthDiagnosticError({
        appName,
        service,
        message: errMsg,
      });
      toast.error(errMsg, { duration: 8000 });
    }
  };

  const handleDisconnect = (_key: GoogleWorkspaceUiKey, appName: string) => {
    // The deployed `google_workspace` Edge Function currently supports only `action: "start"`.
    // Do not perform an insecure direct deletion from the browser; preserve the real database state.
    toast.info(
      `Disconnecting ${appName} requires a backend disconnect action in the google_workspace Edge Function to revoke stored OAuth tokens.`
    );
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
                    {isLoadingStatus ? 'Checking status…' : '5 Tools Available'}
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

            {oauthDiagnosticError && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3.5 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="size-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-300">
                      {oauthDiagnosticError.appName} Connection Error
                    </p>
                    <p className="text-[11px] text-red-600/90 dark:text-red-400/90 leading-relaxed break-words">
                      {oauthDiagnosticError.message}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOauthDiagnosticError(null)}
                  className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline shrink-0 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {apps.map((app) => {
                const LogoComponent = app.logo;
                const isThisConnecting = connectingService === app.service;
                const isAnyConnecting = connectingService !== null;

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
                          {app.status === 'connected' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="size-2.5" />
                              <span>Active</span>
                            </span>
                          )}
                          {app.status === 'expired' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <AlertCircle className="size-2.5" />
                              <span>Expired</span>
                            </span>
                          )}
                          {app.status === 'error' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                              <AlertCircle className="size-2.5" />
                              <span>Error</span>
                            </span>
                          )}
                          {app.email && (
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {app.email}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {app.description}
                        </p>
                        {app.status === 'error' && app.lastError && (
                          <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
                            {app.lastError}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0 pt-1 sm:pt-0">
                      {app.status === 'connected' ? (
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
                      ) : app.status === 'expired' || app.status === 'error' ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border ${
                              app.status === 'expired'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                            }`}
                          >
                            <AlertCircle className="size-3.5" />
                            <span>
                              {app.status === 'expired' ? 'Expired' : 'Error'}
                            </span>
                          </span>
                          <button
                            type="button"
                            disabled={isAnyConnecting}
                            onClick={() => handleConnect(app.key, app.name)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isThisConnecting ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" />
                                <span>Connecting…</span>
                              </>
                            ) : (
                              <>
                                <RefreshCw className="size-3.5" />
                                <span>Reconnect to {app.name}</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isAnyConnecting}
                          onClick={() => handleConnect(app.key, app.name)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isThisConnecting ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin" />
                              <span>Connecting to {app.name}…</span>
                            </>
                          ) : (
                            <>
                              <LogoComponent className="size-3.5" />
                              <span>Connect to {app.name}</span>
                            </>
                          )}
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

