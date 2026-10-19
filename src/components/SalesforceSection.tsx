import React, { useState } from 'react';
import {
  TrendingUp,
  Megaphone,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Headset,
} from 'lucide-react';
import { toast } from 'sonner';
import { SalesforceConfig } from '../types';
import { SalesforceLogo } from './BrandLogos';

interface SalesforceSectionProps {
  value?: SalesforceConfig;
  onChange?: (config: SalesforceConfig) => void;
  compact?: boolean;
}

export const SalesforceSection: React.FC<SalesforceSectionProps> = ({
  value,
  onChange,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Safe fallback state
  const config: SalesforceConfig = value || {
    salesAndServiceCloud: { enabled: false, status: 'disconnected' },
    marketingCloud: { enabled: false, status: 'disconnected' },
  };

  const isSalesAndServiceConnected = Boolean(
    config.salesAndServiceCloud?.status === 'connected' ||
    config.salesCloud?.status === 'connected' ||
    config.serviceCloud?.status === 'connected'
  );

  const isMarketingCloudConnected = Boolean(
    config.marketingCloud?.status === 'connected'
  );

  const services = [
    {
      key: 'salesAndServiceCloud' as const,
      name: 'Salesforce Sales Cloud & Service Cloud',
      shortName: 'Sales Cloud & Service Cloud',
      icon: TrendingUp,
      accentBg: 'bg-[#00A1E0]/10 text-[#00A1E0] dark:text-[#38bdf8] border-[#00A1E0]/20',
      description:
        'Capture and qualify sales leads, manage deal opportunities, and automatically route and resolve customer service cases and tickets.',
      isConnected: isSalesAndServiceConnected,
      email:
        config.salesAndServiceCloud?.accountEmail ||
        config.salesCloud?.accountEmail ||
        config.serviceCloud?.accountEmail ||
        'admin@salesforce.org',
      tags: ['Leads & Deals', 'Accounts & Contacts', 'Cases & Support Tickets'],
    },
    {
      key: 'marketingCloud' as const,
      name: 'Salesforce Marketing Cloud',
      shortName: 'Marketing Cloud',
      icon: Megaphone,
      accentBg: 'bg-[#00A1E0]/10 text-[#00A1E0] dark:text-[#38bdf8] border-[#00A1E0]/20',
      description:
        'Automate cross-channel customer journeys, trigger targeted campaign email sequences, and synchronize audience subscriber lists.',
      isConnected: isMarketingCloudConnected,
      email: config.marketingCloud?.accountEmail || 'marketing@salesforce.org',
      tags: ['Customer Journeys', 'Automated Campaigns', 'Subscriber Lists'],
    },
  ];

  const connectedCount = services.filter((s) => s.isConnected).length;

  const handleConnect = (serviceKey: 'salesAndServiceCloud' | 'marketingCloud', serviceName: string) => {
    let updated: SalesforceConfig;

    if (serviceKey === 'salesAndServiceCloud') {
      const now = new Date().toISOString();
      const email = 'admin@salesforce.org';
      updated = {
        ...config,
        salesAndServiceCloud: {
          enabled: true,
          status: 'connected',
          lastSyncedAt: now,
          accountEmail: email,
        },
        salesCloud: {
          enabled: true,
          status: 'connected',
          lastSyncedAt: now,
          accountEmail: email,
        },
        serviceCloud: {
          enabled: true,
          status: 'connected',
          lastSyncedAt: now,
          accountEmail: email,
        },
        contacts: {
          enabled: true,
          status: 'connected',
          lastSyncedAt: now,
          accountEmail: email,
        },
      };
    } else {
      updated = {
        ...config,
        marketingCloud: {
          enabled: true,
          status: 'connected',
          lastSyncedAt: new Date().toISOString(),
          accountEmail: 'marketing@salesforce.org',
        },
      };
    }

    onChange?.(updated);
    toast.info('Salesforce OAuth connect will be added soon.');
  };

  const handleDisconnect = (serviceKey: 'salesAndServiceCloud' | 'marketingCloud', serviceName: string) => {
    let updated: SalesforceConfig;

    if (serviceKey === 'salesAndServiceCloud') {
      updated = {
        ...config,
        salesAndServiceCloud: { enabled: false, status: 'disconnected' },
        salesCloud: { enabled: false, status: 'disconnected' },
        serviceCloud: { enabled: false, status: 'disconnected' },
        contacts: { enabled: false, status: 'disconnected' },
      };
    } else {
      updated = {
        ...config,
        marketingCloud: { enabled: false, status: 'disconnected' },
      };
    }

    onChange?.(updated);
    toast.success(`Disconnected from ${serviceName}`);
  };

  return (
    <div className="space-y-4">
      {/* Main Salesforce Hub Card */}
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
            {/* Salesforce Official Cloud Logo */}
            <div className="flex size-11 items-center justify-center rounded-xl bg-white dark:bg-muted border border-border shadow-xs shrink-0 p-2">
              <SalesforceLogo className="size-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-foreground">
                  Salesforce
                </span>
                {connectedCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="size-3" />
                    <span>{connectedCount}/2 Services Connected</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
                    2 Services Available
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                Divided into Salesforce Sales Cloud & Service Cloud and Salesforce Marketing Cloud to sync customer records, support cases, and automated campaigns.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <span className="text-xs font-semibold text-primary hidden sm:inline">
              {isExpanded ? 'Hide Services' : 'Show Services'}
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

        {/* Divided Services List */}
        {isExpanded && (
          <div className="border-t border-border p-4 sm:p-6 bg-muted/20 space-y-3 animate-in fade-in duration-200">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Salesforce Services
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {services.map((service) => {
                const IconComponent = service.icon;
                return (
                  <div
                    key={service.key}
                    className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:border-border/80 transition-all"
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`flex size-11 items-center justify-center rounded-xl border ${service.accentBg} shrink-0 mt-0.5 sm:mt-0 shadow-2xs`}
                      >
                        <IconComponent className="size-5.5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-foreground">
                            {service.name}
                          </span>
                          {service.isConnected && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="size-3" />
                              <span>Connected</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                          {service.description}
                        </p>

                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {service.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground border border-border/70 font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0 pt-1 sm:pt-0">
                      {service.isConnected ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="size-3.5" />
                            <span>Active</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDisconnect(service.key, service.name)}
                            className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl border border-border hover:border-destructive/30 transition-colors cursor-pointer"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConnect(service.key, service.name)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
                        >
                          <SalesforceLogo className="size-3.5" />
                          <span>Connect to {service.shortName}</span>
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
