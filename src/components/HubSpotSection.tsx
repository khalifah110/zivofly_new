import React from 'react';
import {
  CheckCircle2,
  Users,
  BadgeDollarSign,
  Ticket,
  SendHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { HubSpotConfig } from '../types';
import { HubSpotLogo } from './BrandLogos';

interface HubSpotSectionProps {
  value?: HubSpotConfig;
  onChange?: (config: HubSpotConfig) => void;
  compact?: boolean;
}

export const HubSpotSection: React.FC<HubSpotSectionProps> = ({
  value,
  onChange,
  compact = false,
}) => {
  // Safe fallback state
  const config: HubSpotConfig = value || {
    enabled: false,
    status: 'disconnected',
  };

  const isConnected = Boolean(
    config.enabled ||
    config.status === 'connected' ||
    config.contacts?.status === 'connected' ||
    config.deals?.status === 'connected' ||
    config.serviceHub?.status === 'connected' ||
    config.marketingForms?.status === 'connected'
  );

  const accountEmail = config.accountEmail || config.contacts?.accountEmail || 'business@hubspot.com';
  const portalId = config.portalId || '48291034';

  const handleConnect = () => {
    const updated: HubSpotConfig = {
      enabled: true,
      status: 'connected',
      accountEmail,
      portalId,
      connectedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
      contacts: { enabled: true, status: 'connected', accountEmail },
      deals: { enabled: true, status: 'connected', accountEmail },
      serviceHub: { enabled: true, status: 'connected', accountEmail },
      marketingForms: { enabled: true, status: 'connected', accountEmail },
    };
    onChange?.(updated);
    toast.info('HubSpot OAuth connect will be added soon.');
  };

  const handleDisconnect = () => {
    const updated: HubSpotConfig = {
      enabled: false,
      status: 'disconnected',
      contacts: { enabled: false, status: 'disconnected' },
      deals: { enabled: false, status: 'disconnected' },
      serviceHub: { enabled: false, status: 'disconnected' },
      marketingForms: { enabled: false, status: 'disconnected' },
    };
    onChange?.(updated);
    toast.success('Disconnected from HubSpot');
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden transition-all">
      <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          {/* HubSpot Official Sprocket Logo */}
          <div className="flex size-11 items-center justify-center rounded-xl bg-white dark:bg-muted border border-border shadow-xs shrink-0 p-2">
            <HubSpotLogo className="size-6" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground">
                HubSpot
              </span>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="size-3" />
                  <span>Connected</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
                  Available
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
              Connect your HubSpot account to automatically synchronize customer contacts, track deals, and log conversation tickets in real time.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          {isConnected ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="size-3.5" />
                <span>Active</span>
              </span>
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl border border-border hover:border-destructive/30 transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
            >
              <HubSpotLogo className="size-3.5" />
              <span>Connect to HubSpot</span>
            </button>
          )}
        </div>
      </div>

      {/* Connected Details Banner */}
      {isConnected && (
        <div className="border-t border-border px-5 py-4 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-semibold text-foreground">Connected Account:</span>
            <span className="font-mono text-[11px] bg-background px-2 py-0.5 rounded border border-border text-foreground">
              {accountEmail}
            </span>
            <span className="text-[11px] text-muted-foreground">
              (Portal: {portalId})
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3 text-[#FF7A59]" /> Contacts
            </span>
            <span className="inline-flex items-center gap-1">
              <BadgeDollarSign className="size-3 text-[#FF7A59]" /> Deals
            </span>
            <span className="inline-flex items-center gap-1">
              <Ticket className="size-3 text-[#FF7A59]" /> Tickets
            </span>
            <span className="inline-flex items-center gap-1">
              <SendHorizontal className="size-3 text-[#FF7A59]" /> Forms
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
