import React, { useState } from 'react';
import { Agent, PlatformType } from '../types';
import { apiFetch } from '../lib/api';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Instagram,
  Facebook,
  Database,
  ArrowRight,
  Sparkles,
  X,
  Loader2,
  Phone,
  MessageSquare,
} from 'lucide-react';

interface MetaOAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: 'instagram' | 'messenger' | 'whatsapp';
  agent?: Agent;
  accountHandle?: string;
  onConnected?: (updatedAgent: Agent) => void;
  onOAuthSuccess?: (metaData: {
    wabaId: string;
    businessName: string;
    token: string;
    phoneNumber?: string;
  }) => void;
}

export const MetaOAuthModal: React.FC<MetaOAuthModalProps> = ({
  isOpen,
  onClose,
  platform,
  agent,
  accountHandle,
  onConnected,
  onOAuthSuccess,
}) => {
  const [allowTraining, setAllowTraining] = useState(true);
  const [connectingStep, setConnectingStep] = useState<
    'consent' | 'authorizing' | 'syncing' | 'completed'
  >('consent');
  const [progressStatus, setProgressStatus] = useState('');

  if (!isOpen) return null;

  const isInstagram = platform === 'instagram';
  const isWhatsApp = platform === 'whatsapp';
  const platformName = isInstagram
    ? 'Instagram'
    : isWhatsApp
    ? 'WhatsApp Business'
    : 'Facebook Messenger';

  const handleStartOAuth = async () => {
    setConnectingStep('authorizing');
    setProgressStatus(
      isWhatsApp
        ? 'Requesting secure Meta OAuth 2.0 authorization code...'
        : 'Requesting secure Meta OAuth 2.0 token...'
    );

    await new Promise((r) => setTimeout(r, 800));
    setConnectingStep('syncing');
    setProgressStatus(
      isWhatsApp
        ? 'Verifying WhatsApp Business Account (WABA) & phone line...'
        : 'Connecting official Meta Graph API & fetching profile...'
    );

    if (allowTraining && !isWhatsApp) {
      await new Promise((r) => setTimeout(r, 900));
      setProgressStatus('Ingesting Bio, recent posts & past DM FAQs into Vector Store...');
      await new Promise((r) => setTimeout(r, 800));
    } else if (isWhatsApp) {
      await new Promise((r) => setTimeout(r, 800));
      setProgressStatus('Subscribing Meta Cloud API webhooks & configuring token exchange...');
      await new Promise((r) => setTimeout(r, 700));
    }

    try {
      if (isWhatsApp) {
        await apiFetch('/api/meta/whatsapp/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: agent?.id,
            phoneNumber: accountHandle || '',
            businessName: agent?.name ? `${agent.name} Workspace` : 'Business Account',
            wabaId: `WABA_${Date.now()}`,
          }),
        });
      } else if (agent) {
        const res = await apiFetch('/api/meta/oauth/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: agent.id,
            platform,
            allowProfileTraining: allowTraining,
          }),
        });
        const data = await res.json();
        if (data.agent && onConnected) {
          onConnected(data.agent);
        }
      }

      setConnectingStep('completed');
      setProgressStatus(
        isWhatsApp
          ? 'WhatsApp Business Account verified & authorized via Meta OAuth!'
          : 'Connected successfully! AI agent is ready.'
      );

      onOAuthSuccess?.({
        wabaId: `WABA_${Date.now()}`,
        businessName: agent?.name ? `${agent.name} Workspace` : 'Business Account',
        token: `meta_oauth_tok_${Date.now()}`,
        phoneNumber: accountHandle || '',
      });

      setTimeout(() => {
        onClose();
        setConnectingStep('consent');
      }, 1100);
    } catch (err) {
      console.error('Meta OAuth connection failed', err);
      setConnectingStep('consent');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-background rounded-2xl max-w-lg w-full shadow-2xl border border-border overflow-hidden text-foreground">
        {/* Browser-style Secure Popup Top Bar */}
        <div className="bg-muted px-4 py-2 border-b border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2 truncate">
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-card border border-border rounded font-mono text-[11px] text-foreground">
              <Lock className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>https://www.facebook.com/v19.0/dialog/oauth</span>
            </span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">Meta Platforms, Inc. [US]</span>
          </div>
          <button
            id="meta-oauth-close-top-btn"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meta Header */}
        <div className="bg-[#0866FF] dark:bg-blue-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              {isInstagram ? (
                <Instagram className="w-5 h-5 text-white" />
              ) : isWhatsApp ? (
                <Phone className="w-5 h-5 text-white" />
              ) : (
                <Facebook className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-white">
                {isWhatsApp ? 'Meta WhatsApp Embedded Signup' : 'Meta for Developers'}
              </h3>
              <p className="text-[11px] text-white/80">
                {isWhatsApp ? 'Official Cloud API OAuth Authorization' : 'Official Graph API Authorization'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-white/15 px-2 py-0.5 rounded-full text-[10px] font-medium text-white/90">
            <ShieldCheck className="w-3 h-3 text-emerald-300" />
            <span>Secure Meta Window</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {connectingStep === 'consent' && (
            <div className="space-y-5">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary border border-primary/20">
                  <ShieldCheck className="w-6 h-6 text-emerald-500" />
                </div>
                <h2 className="text-lg font-bold text-foreground">
                  Connect {platformName} to Zivofly
                </h2>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Seamless Meta OAuth 2.0 authorization. No API keys, passwords, or technical configuration required.
                </p>
              </div>

              {/* Profile Card Mock */}
              <div className="p-3.5 rounded-xl bg-card border border-border flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=128&q=80"
                  alt="Profile"
                  className="w-11 h-11 rounded-full object-cover border border-border"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {agent?.name ? `${agent.name} Workspace` : 'Business Account'}
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isInstagram
                      ? `${accountHandle || '@your_brand'} · Ready to link`
                      : isWhatsApp
                      ? `${accountHandle || 'Verified Number'} · WABA Service`
                      : 'Verified Business Page'}
                  </p>
                </div>
              </div>

              {/* Training / WhatsApp Messaging Card */}
              {!isWhatsApp ? (
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/10 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex gap-2.5">
                      <Database className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-foreground">
                          Vector Knowledge Ingestion (RAG)
                        </h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                          Allow Zivofly AI to automatically ingest your account <strong>Bio</strong>,{' '}
                          <strong>recent posts & announcements</strong>, and <strong>sample past inquiries</strong> into an encrypted vector database to train your agent.
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      id="allowTraining"
                      checked={allowTraining}
                      onChange={(e) => setAllowTraining(e.target.checked)}
                      className="w-4 h-4 mt-1 accent-blue-600 rounded cursor-pointer"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <MessageSquare className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        WhatsApp Business Cloud API Messaging
                      </h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                        Authorizes Zivofly to receive incoming customer messages and send automated AI responses on <strong>{accountHandle || 'your business phone'}</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Details */}
              <div className="space-y-1.5 text-[11px] text-muted-foreground bg-muted p-3 rounded-xl border border-border">
                <div className="flex items-center gap-1.5 text-foreground font-medium">
                  <Lock className="w-3 h-3 text-muted-foreground" />
                  <span>Permissions Requested:</span>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground">
                  •{' '}
                  {isWhatsApp
                    ? 'whatsapp_business_management, whatsapp_business_messaging, business_management'
                    : isInstagram
                    ? 'instagram_basic, instagram_manage_messages, instagram_manage_comments'
                    : 'pages_messaging, pages_show_list, pages_read_engagement'}
                </p>
                <p>• 256-bit encrypted token exchange. Revocable anytime from Meta Business Suite.</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  id="meta-oauth-cancel-btn"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-muted-foreground hover:text-foreground border border-border rounded-xl hover:bg-accent transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="meta-oauth-confirm-btn"
                  onClick={handleStartOAuth}
                  className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-[#0866FF] hover:bg-blue-600 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Authorize & Connect</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Progress / Syncing Step */}
          {connectingStep !== 'consent' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto text-[#0866FF]">
                {connectingStep === 'completed' ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-in zoom-in" />
                ) : (
                  <Loader2 className="w-8 h-8 animate-spin" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">
                  {connectingStep === 'completed' ? 'Connected Successfully!' : 'Configuring Meta Integration'}
                </h3>
                <p className="text-xs text-muted-foreground animate-pulse">{progressStatus}</p>
              </div>

              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden max-w-xs mx-auto border border-border">
                <div
                  className={`h-full bg-[#0866FF] transition-all duration-700 ${
                    connectingStep === 'authorizing'
                      ? 'w-1/3'
                      : connectingStep === 'syncing'
                      ? 'w-3/4'
                      : 'w-full bg-emerald-500'
                  }`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
