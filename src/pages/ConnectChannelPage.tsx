import React, { useState } from 'react';
import { Check, Lock, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { CHANNELS } from '../lib/channels';
import { Agent, GoogleSheetToolConfig, PlatformType } from '../types';
import { apiFetch } from '../lib/api';
import { GoogleSheetToolSection } from '../components/GoogleSheetToolSection';
import { GOOGLE_SHEET_TEMPLATES } from '../data/sheetTemplates';
import { MetaOAuthModal } from '../components/MetaOAuthModal';

interface ConnectChannelPageProps {
  channelKey: string;
  agents: Agent[];
  onNavigate: (path: string) => void;
  onConnectionCreated: (newConn: any) => void;
  onAgentCreated: (newAgent: Agent) => void;
}

export const ConnectChannelPage: React.FC<ConnectChannelPageProps> = ({
  channelKey,
  agents,
  onNavigate,
  onConnectionCreated,
  onAgentCreated,
}) => {
  const channel = CHANNELS[channelKey] || CHANNELS.whatsapp;
  const isCall = channel.key === 'call';
  const isMeta = channel.key === 'instagram' || channel.key === 'messenger';

  const [step, setStep] = useState(0);
  const [accountHandle, setAccountHandle] = useState('');

  const [trainingOptions, setTrainingOptions] = useState({
    bio: true,
    posts: true,
    messages: true,
  });

  const [isMetaOAuthModalOpen, setIsMetaOAuthModalOpen] = useState(false);
  const [metaOAuthConnected, setMetaOAuthConnected] = useState(false);
  const [metaOAuthData, setMetaOAuthData] = useState<{
    wabaId?: string;
    businessName?: string;
    token?: string;
    phoneNumber?: string;
  } | null>(null);

  const [agentChoice, setAgentChoice] = useState<'existing' | 'new'>(
    agents.length > 0 ? 'existing' : 'new'
  );
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id || '');
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentDuties, setNewAgentDuties] = useState('');
  const [sheetToolConfig, setSheetToolConfig] = useState<GoogleSheetToolConfig>(
    GOOGLE_SHEET_TEMPLATES[0].config
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isMetaWindowStep =
    channel.steps[step] === 'Confirm it in the secure Meta window' ||
    (channel.key === 'whatsapp' && step === 1);

  const handleMetaOAuthSuccess = (data: {
    wabaId: string;
    businessName: string;
    token: string;
    phoneNumber?: string;
  }) => {
    setMetaOAuthConnected(true);
    setMetaOAuthData(data);
    toast.success('Confirmed in the secure Meta window!');
  };

  const handleNext = () => {
    if (step === 0 && !accountHandle.trim()) {
      toast.error('Please enter an account or phone number');
      return;
    }
    if (isMetaWindowStep && !metaOAuthConnected) {
      setIsMetaOAuthModalOpen(true);
      toast.info('Please confirm your account in the secure Meta window first');
      return;
    }
    if (step < channel.steps.length - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    let finalAgentId = selectedAgentId;

    try {
      // If user chose to create a new agent
      if (agentChoice === 'new') {
        const agentName = newAgentName.trim() || `${channel.name} Assistant`;
        const res = await apiFetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: agentName,
            description: `Agent automated for ${channel.name} with Google Sheet integration`,
            roleAndDuties:
              newAgentDuties.trim() ||
              `Assist customers who reach out via ${channel.name}. Query the connected Google Sheet database for prices, availability, and products.`,
            platforms: [channel.key as PlatformType],
            tools: {
              googleSheet: sheetToolConfig,
            },
          }),
        });
        if (res.ok) {
          const agentData = await res.json();
          finalAgentId = agentData.agent.id;
          onAgentCreated(agentData.agent);
        }
      }

      // Create the channel connection
      const connRes = await apiFetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: channel.key,
          display_name: accountHandle,
          handle: accountHandle,
          agent_id: finalAgentId || null,
          reply_dms: true,
          reply_comments: channel.supportsComments,
          reply_tags: channel.key === 'instagram',
          comment_keywords: ['price', 'cost', 'hours', 'book'],
          always_on: true,
          meta_oauth_connected: metaOAuthConnected,
          waba_id: metaOAuthData?.wabaId || 'WABA_882910398',
        }),
      });

      if (connRes.ok) {
        const connData = await connRes.json();
        onConnectionCreated(connData.data);
        toast.success(`Connected ${channel.name} successfully!`);
        onNavigate('/dashboard');
      } else {
        toast.error('Failed to create connection');
      }
    } catch {
      toast.error('Could not complete setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => onNavigate('/dashboard')}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← All channels
      </button>

      <h1 className="mt-4 text-4xl font-normal tracking-tight text-foreground">
        Connect {channel.name}
      </h1>
      <p className="mt-2 text-muted-foreground">{channel.tagline}</p>

      {/* Steps Pill List */}
      <ol className="mt-8 flex flex-wrap gap-2">
        {channel.steps.map((stepLabel, idx) => (
          <li
            key={stepLabel}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
              idx === step
                ? 'border-primary bg-accent text-accent-foreground font-medium'
                : idx < step
                ? 'border-border text-muted-foreground'
                : 'border-border text-muted-foreground/70'
            }`}
          >
            {idx < step ? (
              <Check className="size-3 text-primary" />
            ) : (
              <span>{idx + 1}</span>
            )}
            <span>{stepLabel}</span>
          </li>
        ))}
      </ol>

      {/* Step Content Card */}
      <div className="surface-card mt-6 p-7">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-medium tracking-tight text-foreground">
              {channel.steps[0]}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isMeta ? (
                <>
                  We open a secure {channel.name} window. You approve access there —
                  your password never reaches us.
                </>
              ) : (
                'Enter the business number your customers already call.'
              )}
            </p>

            <div className="space-y-2 pt-2">
              <label htmlFor="account" className="text-xs font-medium text-foreground">
                {channel.key === 'instagram'
                  ? 'Instagram username'
                  : channel.key === 'messenger'
                  ? 'Facebook Page name'
                  : 'Business phone number'}
              </label>
              <input
                id="account"
                type="text"
                value={accountHandle}
                onChange={(e) => setAccountHandle(e.target.value)}
                placeholder={
                  channel.key === 'instagram'
                    ? '@yourbusiness'
                    : channel.key === 'messenger'
                    ? 'Your Business Page'
                    : '+1 (555) 000-0000'
                }
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-medium tracking-tight text-foreground">
              {channel.steps[1]}
            </h2>

            {isMetaWindowStep ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Authorize Zivofly directly in the secure Meta window to verify ownership of your WhatsApp Business number. No API keys or passwords required.
                </p>

                {!metaOAuthConnected ? (
                  <div className="rounded-xl border border-border bg-secondary/30 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-[#0866FF]/10 text-[#0866FF] flex items-center justify-center font-bold text-xs">
                          M
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">
                            Meta Embedded Signup (OAuth 2.0)
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Official authorization window via Meta Platforms
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 border border-amber-500/20">
                        <Lock className="size-3" />
                        Pending
                      </span>
                    </div>

                    <div className="rounded-lg bg-background border border-border p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Number to verify:</span>
                        <span className="font-medium text-foreground">{accountHandle || '+1 (305) 890-4421'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Permissions:</span>
                        <span className="font-mono text-[11px] text-foreground">whatsapp_business_messaging</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Token security:</span>
                        <span className="text-foreground">256-bit encrypted handshake</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      id="open-meta-oauth-btn"
                      onClick={() => setIsMetaOAuthModalOpen(true)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0866FF] hover:bg-[#0055D6] py-3 px-4 text-sm font-semibold text-white shadow-sm transition-all cursor-pointer"
                    >
                      <span>Connect with Meta OAuth</span>
                      <ExternalLink className="size-4" />
                    </button>

                    <p className="text-[11px] text-center text-muted-foreground">
                      Clicking opens the secure Meta popup window to authorize your WhatsApp Business line.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="size-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">
                            Meta Account Connected
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Verified via secure Meta OAuth dialog
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 border border-emerald-500/20">
                        <Check className="size-3" />
                        Authorized
                      </span>
                    </div>

                    <div className="rounded-lg bg-background/80 border border-emerald-500/20 p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Business:</span>
                        <span className="font-medium text-foreground">
                          {metaOAuthData?.businessName || 'Business Account'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">WABA ID:</span>
                        <span className="font-mono text-foreground">
                          {metaOAuthData?.wabaId || 'Verified'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Verified Handle:</span>
                        <span className="font-medium text-foreground">{accountHandle || 'Connected'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Meta Graph Status:</span>
                        <span className="text-emerald-600 font-medium">OAuth 2.0 Token Active (v19.0)</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      id="reopen-meta-oauth-btn"
                      onClick={() => setIsMetaOAuthModalOpen(true)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-border bg-background hover:bg-accent py-2 px-3 text-xs font-medium text-foreground transition-colors cursor-pointer"
                    >
                      <RefreshCw className="size-3.5" />
                      <span>Re-open Meta window or switch account</span>
                    </button>
                  </div>
                )}
              </div>
            ) : !isCall ? (
              <div className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Choose what your agent may learn from. The more it knows, the better it
                  sounds like you.
                </p>
                {[
                  { key: 'bio', label: 'Profile and bio' },
                  { key: 'posts', label: 'Posts and captions' },
                  { key: 'messages', label: 'Previous conversations' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4 hover:bg-accent/40 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={trainingOptions[item.key as keyof typeof trainingOptions]}
                      onChange={(e) =>
                        setTrainingOptions((prev) => ({
                          ...prev,
                          [item.key]: e.target.checked,
                        }))
                      }
                      className="size-4 rounded accent-primary"
                    />
                    <span className="text-sm text-foreground font-medium">
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-secondary/60 p-4 text-sm text-muted-foreground">
                We send a one-time verification to {accountHandle || 'your number'} to
                confirm you own the line.
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-medium tracking-tight text-foreground">
              {channel.steps[2]}
            </h2>

            <div className="space-y-3">
              <label
                className={`flex items-center gap-3 rounded-xl border border-border p-4 ${
                  agents.length > 0 ? 'cursor-pointer' : 'opacity-60'
                }`}
              >
                <input
                  type="radio"
                  name="agentChoice"
                  disabled={agents.length === 0}
                  checked={agentChoice === 'existing'}
                  onChange={() => setAgentChoice('existing')}
                  className="size-4 accent-primary"
                />
                <span className="text-sm font-medium text-foreground">
                  Use existing agent
                </span>
              </label>

              {agentChoice === 'existing' && agents.length > 0 && (
                <div className="ml-5 space-y-2 border-l border-border pl-5">
                  {agents.map((ag) => (
                    <label
                      key={ag.id}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-colors ${
                        selectedAgentId === ag.id
                          ? 'border-primary bg-accent'
                          : 'border-border hover:bg-accent/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="existingAgent"
                          checked={selectedAgentId === ag.id}
                          onChange={() => setSelectedAgentId(ag.id)}
                          className="size-4 accent-primary"
                        />
                        <span className="text-sm font-medium text-foreground">
                          {ag.name}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                        {ag.roleAndDuties}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4">
                <input
                  type="radio"
                  name="agentChoice"
                  checked={agentChoice === 'new'}
                  onChange={() => setAgentChoice('new')}
                  className="size-4 accent-primary"
                />
                <span className="text-sm font-medium text-foreground">
                  Create a new agent
                </span>
              </label>

              {agentChoice === 'new' && (
                <div className="ml-5 space-y-3 border-l border-border pl-5 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Agent name
                    </label>
                    <input
                      type="text"
                      value={newAgentName}
                      onChange={(e) => setNewAgentName(e.target.value)}
                      placeholder="e.g. VIP Concierge, Night Support"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      What should this agent do?
                    </label>
                    <textarea
                      rows={3}
                      value={newAgentDuties}
                      onChange={(e) => setNewAgentDuties(e.target.value)}
                      placeholder="Describe what this agent does, what it should never do, and how it sounds."
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  {/* Section: Tool (Google Sheet Database) */}
                  <div className="pt-2">
                    <GoogleSheetToolSection
                      value={sheetToolConfig}
                      onChange={setSheetToolConfig}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-medium tracking-tight text-foreground">
              {channel.steps[3]}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ready to go live. Your AI agent will be connected to your account and
              ready to assist customers around the clock.
            </p>

            <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Channel:</span>
                <span className="font-medium text-foreground">{channel.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account handle:</span>
                <span className="font-medium text-foreground">{accountHandle}</span>
              </div>
              {metaOAuthConnected && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Meta OAuth:</span>
                  <span className="font-medium text-emerald-600 flex items-center gap-1">
                    <Check className="size-3" />
                    Verified ({metaOAuthData?.wabaId || 'WABA_882910398'})
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Selected agent:</span>
                <span className="font-medium text-foreground">
                  {agentChoice === 'new'
                    ? newAgentName || 'New Assistant'
                    : agents.find((a) => a.id === selectedAgentId)?.name || 'Default Agent'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleNext}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 transition-opacity disabled:opacity-50"
          >
            {isSubmitting
              ? 'Connecting…'
              : step === channel.steps.length - 1
              ? 'Finish and go live'
              : 'Continue'}
          </button>
        </div>
      </div>

      <MetaOAuthModal
        isOpen={isMetaOAuthModalOpen}
        onClose={() => setIsMetaOAuthModalOpen(false)}
        platform={
          channel.key === 'whatsapp'
            ? 'whatsapp'
            : channel.key === 'instagram'
            ? 'instagram'
            : 'messenger'
        }
        accountHandle={accountHandle}
        onOAuthSuccess={handleMetaOAuthSuccess}
      />
    </div>
  );
};
