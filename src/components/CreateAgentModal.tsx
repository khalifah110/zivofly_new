import React, { useState } from 'react';
import {
  Agent,
  CustomVoiceConfig,
  GoogleSheetToolConfig,
  GoogleWorkspaceConfig,
  Microsoft365Config,
  SalesforceConfig,
  HubSpotConfig,
  PlatformType,
} from '../types';
import { apiFetch } from '../lib/api';
import { Bot, X, Instagram, Phone, Facebook, PhoneCall } from 'lucide-react';
import { GoogleSheetToolSection } from './GoogleSheetToolSection';
import { GoogleWorkspaceSection } from './GoogleWorkspaceSection';
import { Microsoft365Section } from './Microsoft365Section';
import { SalesforceSection } from './SalesforceSection';
import { HubSpotSection } from './HubSpotSection';
import { GOOGLE_SHEET_TEMPLATES } from '../data/sheetTemplates';
import { CustomAgentVoiceSection } from './CustomAgentVoiceSection';

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgentCreated: (agent: Agent) => void;
}

export const CreateAgentModal: React.FC<CreateAgentModalProps> = ({
  isOpen,
  onClose,
  onAgentCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roleAndDuties, setRoleAndDuties] = useState('');
  const [customVoice, setCustomVoice] = useState<CustomVoiceConfig | undefined>(undefined);
  const [platforms, setPlatforms] = useState<PlatformType[]>(['whatsapp', 'instagram']);
  const [sheetToolConfig, setSheetToolConfig] = useState<GoogleSheetToolConfig>(
    GOOGLE_SHEET_TEMPLATES[0].config
  );
  const [googleWorkspaceConfig, setGoogleWorkspaceConfig] = useState<GoogleWorkspaceConfig>({
    gmail: { enabled: false, status: 'disconnected' },
    drive: { enabled: false, status: 'disconnected' },
    docs: { enabled: false, status: 'disconnected' },
    sheets: GOOGLE_SHEET_TEMPLATES[0].config,
    calendar: { enabled: false, status: 'disconnected' },
  });
  const [microsoft365Config, setMicrosoft365Config] = useState<Microsoft365Config>({
    outlook: { enabled: false, status: 'disconnected' },
    excel: { enabled: false, status: 'disconnected' },
    word: { enabled: false, status: 'disconnected' },
    sharepoint: { enabled: false, status: 'disconnected' },
  });
  const [salesforceConfig, setSalesforceConfig] = useState<SalesforceConfig>({
    salesCloud: { enabled: false, status: 'disconnected' },
    serviceCloud: { enabled: false, status: 'disconnected' },
    contacts: { enabled: false, status: 'disconnected' },
    marketingCloud: { enabled: false, status: 'disconnected' },
  });
  const [hubspotConfig, setHubspotConfig] = useState<HubSpotConfig>({
    contacts: { enabled: false, status: 'disconnected' },
    deals: { enabled: false, status: 'disconnected' },
    serviceHub: { enabled: false, status: 'disconnected' },
    marketingForms: { enabled: false, status: 'disconnected' },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const togglePlatform = (p: PlatformType) => {
    const list = platforms || [];
    if (list.includes(p)) {
      setPlatforms(list.filter((x) => x !== p));
    } else {
      setPlatforms([...list, p]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || 'Multi-platform automated AI agent with database integration',
          roleAndDuties:
            roleAndDuties ||
            'You are an executive customer concierge. Warmly and professionally answer questions, check pricing and stock, provide booking assistance, and clarify business policies.',
          customVoice,
          platforms,
          whatItRepliesTo: {
            replyDMs: true,
            replyComments: true,
            commentKeywords: 'price, delivery, how much',
            replyTags: true,
            tagAllowedAccounts: '@partner, @reseller',
          },
          tools: {
            googleSheet: googleWorkspaceConfig.sheets || sheetToolConfig,
            googleWorkspace: googleWorkspaceConfig,
            microsoft365: microsoft365Config,
            salesforce: salesforceConfig,
            hubspot: hubspotConfig,
          },
        }),
      });
      const data = await res.json();
      if (data.agent) {
        onAgentCreated(data.agent);
        onClose();
        setName('');
        setDescription('');
        setRoleAndDuties('');
        setCustomVoice(undefined);
      }
    } catch (err) {
      console.error('Agent creation error', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-background rounded-2xl max-w-2xl w-full shadow-2xl border border-border overflow-hidden text-foreground flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Create New AI Agent</h3>
              <p className="text-xs text-muted-foreground">
                Configure your agent identity, communication channels, and Google Sheet database tool.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          <form id="createAgentForm" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Agent Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Customer Support Concierge"
                  className="w-full px-3 py-2 text-xs border border-border bg-card rounded-xl focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Short Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Handles appointments and inventory queries"
                  className="w-full px-3 py-2 text-xs border border-border bg-card rounded-xl focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Role & Duties Prompt
              </label>
              <textarea
                rows={2}
                value={roleAndDuties}
                onChange={(e) => setRoleAndDuties(e.target.value)}
                placeholder="Specify duties, tone, and guidance (e.g. Welcome customers warmly, check database for product prices and availability, take booking requests)..."
                className="w-full px-3 py-2 text-xs border border-border bg-card rounded-xl focus:border-primary focus:outline-none"
              />
            </div>

            {/* Custom Agent Voice (under Roles and Duties) */}
            <CustomAgentVoiceSection
              value={customVoice}
              onChange={setCustomVoice}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Enabled Platforms
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'whatsapp' as PlatformType, name: 'WhatsApp', icon: Phone },
                  { id: 'instagram' as PlatformType, name: 'Instagram', icon: Instagram },
                  { id: 'messenger' as PlatformType, name: 'Messenger', icon: Facebook },
                  { id: 'call' as PlatformType, name: 'Phone Calls', icon: PhoneCall },
                ].map((p) => {
                  const active = (platforms || []).includes(p.id);
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlatform(p.id)}
                      className={`p-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                        active
                          ? 'border-primary bg-primary/10 text-primary font-semibold'
                          : 'border-border text-muted-foreground hover:border-border/80'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section: Agent tools - Google Workspace, Microsoft 365, Salesforce, HubSpot */}
            <div className="pt-2 border-t border-border space-y-4">
              <GoogleWorkspaceSection
                value={googleWorkspaceConfig}
                onChange={(updated) => {
                  setGoogleWorkspaceConfig(updated);
                  if (updated.sheets) {
                    setSheetToolConfig(updated.sheets);
                  }
                }}
              />
              <Microsoft365Section
                value={microsoft365Config}
                onChange={setMicrosoft365Config}
              />
              <SalesforceSection
                value={salesforceConfig}
                onChange={setSalesforceConfig}
              />
              <HubSpotSection
                value={hubspotConfig}
                onChange={setHubspotConfig}
              />
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="createAgentForm"
            disabled={isSubmitting || !name.trim()}
            className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Creating agent…' : 'Create Agent'}
          </button>
        </div>
      </div>
    </div>
  );
};
