import React, { useState } from 'react';
import { Agent, PlatformType } from '../types';
import { apiFetch } from '../lib/api';
import {
  Instagram,
  Phone,
  Facebook,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  Settings,
  ShieldCheck,
  Power,
  Play,
  ArrowUpRight,
  Database,
  Sliders,
  Volume2,
  MessageSquareText,
  Filter,
} from 'lucide-react';

interface ChannelHubProps {
  agent: Agent;
  onUpdateAgent: (updated: Agent) => void;
  onOpenMetaOAuth: (platform: 'instagram' | 'messenger') => void;
  onOpenWhatsAppWizard: () => void;
  onOpenCallSetup: () => void;
  onOpenSimulator: (platform: PlatformType) => void;
  onRequestManualPause: () => void;
}

export const ChannelHub: React.FC<ChannelHubProps> = ({
  agent,
  onUpdateAgent,
  onOpenMetaOAuth,
  onOpenWhatsAppWizard,
  onOpenCallSetup,
  onOpenSimulator,
  onRequestManualPause,
}) => {
  const [editingKeywords, setEditingKeywords] = useState(false);
  const [keywordInput, setKeywordInput] = useState(
    agent.platformConfig.instagram?.commentKeywords?.join(', ') || 'price, cost, link, buy, book, hours'
  );

  const handleToggleInstagramSetting = async (
    key: 'replyDMs' | 'replyComments' | 'replyTags'
  ) => {
    const currentIg = agent.platformConfig.instagram || {
      connected: false,
      replyDMs: true,
      replyComments: true,
      replyTags: true,
      commentKeywords: ['price', 'link', 'info'],
      tagAllowedAccounts: ['*'],
      trainedOnBioAndPosts: false,
    };

    const updated = {
      ...agent,
      platformConfig: {
        ...agent.platformConfig,
        instagram: {
          ...currentIg,
          [key]: !currentIg[key],
        },
      },
    };

    onUpdateAgent(updated);

    try {
      await apiFetch(`/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveKeywords = async () => {
    const keywords = keywordInput
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const updated = {
      ...agent,
      platformConfig: {
        ...agent.platformConfig,
        instagram: {
          ...(agent.platformConfig.instagram || {
            connected: false,
            replyDMs: true,
            replyComments: true,
            replyTags: true,
            tagAllowedAccounts: ['*'],
            trainedOnBioAndPosts: false,
          }),
          commentKeywords: keywords,
        },
      },
    };

    onUpdateAgent(updated);
    setEditingKeywords(false);

    try {
      await apiFetch(`/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const igConfig = agent.platformConfig.instagram;
  const waConfig = agent.platformConfig.whatsapp;
  const msConfig = agent.platformConfig.messenger;
  const callConfig = agent.platformConfig.call;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Quick Controls */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-neutral-200/80 shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200">
                Multi-Platform Automation Hub
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  agent.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    agent.status === 'active' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
                  }`}
                />
                {agent.status === 'active' ? 'Agent Live 24/7' : 'Agent Paused'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">
              Deploy AI across WhatsApp, Instagram, Messenger & Calls
            </h1>
            <p className="text-sm text-neutral-500 max-w-2xl leading-relaxed">
              Build and orchestrate enterprise-grade agents without code or complex Meta settings.
              Trained on your business knowledge base, social bio, and previous customer inquiries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {agent.status === 'active' ? (
              <button
                type="button"
                onClick={onRequestManualPause}
                className="px-4 py-2.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 rounded-xl flex items-center gap-2 transition-colors"
              >
                <Power className="w-3.5 h-3.5 text-neutral-500" />
                <span>Pause Agent</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await apiFetch(`/api/agents/${agent.id}/toggle-status`, {
                      method: 'POST',
                    });
                    const data = await res.json();
                    if (data.agent) onUpdateAgent(data.agent);
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-2 shadow-sm transition-colors"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Resume Agent</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenSimulator('instagram')}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl flex items-center gap-2 shadow-sm transition-colors"
            >
              <Play className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>Launch Test Sandbox</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Channels Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. INSTAGRAM AUTOMATION */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs flex flex-col justify-between hover:border-neutral-300 transition-all group">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center text-white shadow-sm">
                  <Instagram className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    Instagram Automation
                    {igConfig?.connected ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Meta OAuth Connected
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                        Not Connected
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {igConfig?.connected
                      ? `${igConfig.igUsername || '@lumina_spa'} · 34.8K Followers`
                      : 'Connect via Meta OAuth 2.0 without technical setup'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onOpenSimulator('instagram')}
                title="Test Instagram Chat"
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
              >
                <Play className="w-4 h-4" />
              </button>
            </div>

            {/* Instagram Specific Toggles (DMs, Comments, Tags) */}
            <div className="p-4 bg-neutral-50/70 rounded-2xl border border-neutral-200/60 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold text-neutral-800">Reply to Direct Messages (DMs)</span>
                  <p className="text-[11px] text-neutral-500">
                    Understands text, images, and voice notes with multi-message referencing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleInstagramSetting('replyDMs')}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                    igConfig?.replyDMs ? 'bg-neutral-900' : 'bg-neutral-300'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform transform absolute top-1 ${
                      igConfig?.replyDMs ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="border-t border-neutral-200/60 pt-3 flex items-start justify-between">
                <div className="space-y-0.5 flex-1 pr-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-neutral-800">Reply to Comments</span>
                    <button
                      onClick={() => setEditingKeywords(!editingKeywords)}
                      className="text-[10px] text-indigo-600 hover:underline font-semibold"
                    >
                      {editingKeywords ? 'Done' : 'Edit Keywords'}
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Replies only when comments contain specific keywords (e.g. price, link, book).
                  </p>
                  {!editingKeywords ? (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(igConfig?.commentKeywords || ['price', 'link', 'cost']).map((kw) => (
                        <span
                          key={kw}
                          className="px-2 py-0.5 bg-white border border-neutral-200 rounded text-[10px] text-neutral-600 font-mono"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1.5">
                      <input
                        type="text"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        placeholder="price, cost, link, buy, discount"
                        className="w-full px-2.5 py-1 text-xs border border-neutral-300 rounded-lg bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleSaveKeywords}
                        className="px-2 py-1 text-[11px] font-semibold bg-neutral-900 text-white rounded-md"
                      >
                        Save Trigger Keywords
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleInstagramSetting('replyComments')}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                    igConfig?.replyComments ? 'bg-neutral-900' : 'bg-neutral-300'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform transform absolute top-1 ${
                      igConfig?.replyComments ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="border-t border-neutral-200/60 pt-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold text-neutral-800">Reply to Story & Post Tags</span>
                  <p className="text-[11px] text-neutral-500">
                    Instantly engages when followers or partner brands tag your account.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleInstagramSetting('replyTags')}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                    igConfig?.replyTags ? 'bg-neutral-900' : 'bg-neutral-300'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform transform absolute top-1 ${
                      igConfig?.replyTags ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Profile RAG Status */}
            <div className="flex items-center gap-2 text-[11px] text-neutral-600 bg-neutral-100/60 p-2.5 rounded-xl">
              <Database className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                {igConfig?.trainedOnBioAndPosts
                  ? 'Trained on Bio, recent posts & past DM FAQs (Vector database indexed)'
                  : 'Vector training ready upon Meta OAuth connection'}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onOpenMetaOAuth('instagram')}
              className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 flex items-center justify-center gap-2 shadow-2xs transition-colors"
            >
              <Instagram className="w-3.5 h-3.5" />
              <span>{igConfig?.connected ? 'Reconnect Meta OAuth' : 'Connect Instagram via Meta'}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenSimulator('instagram')}
              className="py-2.5 px-3.5 text-xs font-semibold rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 transition-colors"
            >
              Test Live
            </button>
          </div>
        </div>

        {/* 2. WHATSAPP AUTOMATION */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs flex flex-col justify-between hover:border-neutral-300 transition-all group">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#25D366] flex items-center justify-center text-white shadow-sm">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    WhatsApp Business
                    {waConfig?.connected ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Cloud API Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                        Setup Required
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {waConfig?.connected
                      ? `${waConfig.phoneNumber} · ${waConfig.businessName}`
                      : 'Jotform-style 4-step embedded phone connection'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onOpenSimulator('whatsapp')}
                title="Test WhatsApp Chat"
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
              >
                <Play className="w-4 h-4" />
              </button>
            </div>

            {/* WhatsApp Features Showcase */}
            <div className="p-4 bg-neutral-50/70 rounded-2xl border border-neutral-200/60 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-800">4-Step Embedded Setup</span>
                <span className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Webhook
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Connects phone numbers without complex Meta developer app management. Auto-provisions webhooks and token verification.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2.5 bg-white rounded-xl border border-neutral-200 space-y-0.5">
                  <span className="font-semibold text-neutral-800 block">Multimodal AI</span>
                  <span className="text-neutral-500">Text, Images, Audio Voice Notes</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-neutral-200 space-y-0.5">
                  <span className="font-semibold text-neutral-800 block">Multi-Message Sync</span>
                  <span className="text-neutral-500">References 2+ inquiries simultaneously</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-neutral-600 bg-neutral-100/60 p-2.5 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
              <span>Availability: <strong>24/7</strong> default with instant human takeover toggle in chat.</span>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onOpenWhatsAppWizard}
              className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 flex items-center justify-center gap-2 shadow-2xs transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{waConfig?.connected ? 'Manage WhatsApp Portal' : 'Launch 4-Step Portal'}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenSimulator('whatsapp')}
              className="py-2.5 px-3.5 text-xs font-semibold rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 transition-colors"
            >
              Test Live
            </button>
          </div>
        </div>

        {/* 3. FACEBOOK MESSENGER AUTOMATION */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs flex flex-col justify-between hover:border-neutral-300 transition-all group">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0866FF] flex items-center justify-center text-white shadow-sm">
                  <Facebook className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    Facebook Messenger
                    {msConfig?.connected ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Page Linked
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                        Not Connected
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {msConfig?.connected
                      ? `${msConfig.pageName || 'Connected Page'}`
                      : 'Meta OAuth 2.0 with instant Bio & Chat training'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onOpenSimulator('messenger')}
                title="Test Messenger Chat"
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
              >
                <Play className="w-4 h-4" />
              </button>
            </div>

            {/* Messenger Feature Parity Showcase */}
            <div className="p-4 bg-neutral-50/70 rounded-2xl border border-neutral-200/60 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-800">Feature Parity with Instagram</span>
                <span className="text-blue-700 font-medium text-[11px] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  Full RAG Ingestion
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Trained on page description, past FAQs, and posts. Supports text, voice notes, and image recognition.
              </p>

              <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                <Power className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                <span>
                  <strong>Manual Switch Off Guard:</strong> If paused manually, chats are held for human takeover. When re-enabled, knowledge auto-syncs with all missed conversations.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-neutral-600 bg-neutral-100/60 p-2.5 rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Human Takeover & RLHF Star Rating enabled for every conversation.</span>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onOpenMetaOAuth('messenger')}
              className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 flex items-center justify-center gap-2 shadow-2xs transition-colors"
            >
              <Facebook className="w-3.5 h-3.5" />
              <span>{msConfig?.connected ? 'Reconnect Facebook Page' : 'Connect via Meta OAuth'}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenSimulator('messenger')}
              className="py-2.5 px-3.5 text-xs font-semibold rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 transition-colors"
            >
              Test Live
            </button>
          </div>
        </div>

        {/* 4. CALL (PHONE VOICE AI AGENT) */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs flex flex-col justify-between hover:border-neutral-300 transition-all group">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-neutral-900 to-neutral-700 flex items-center justify-center text-white shadow-sm">
                  <PhoneCall className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                    Inbound Phone Call Agent
                    {callConfig?.connected ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Line Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                        Configure Line
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {callConfig?.connected
                      ? `${callConfig.phoneNumber || '+1 (800) 842-LUMI'} · Voice: ${callConfig.voiceName}`
                      : 'Connect your business line or assign dedicated SIP line'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onOpenSimulator('call')}
                title="Test Call Simulator"
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
              >
                <Play className="w-4 h-4" />
              </button>
            </div>

            {/* Phone Agent Details */}
            <div className="p-4 bg-neutral-50/70 rounded-2xl border border-neutral-200/60 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-800">Voice Receptionist Engine</span>
                <span className="text-neutral-600 font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-neutral-200">
                  {callConfig?.voiceName || 'Kore'} ({callConfig?.speechSpeed || 1.0}x)
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed italic">
                "{callConfig?.greetingMessage || 'Thank you for calling. How may I assist you today?'}"
              </p>

              <div className="p-2.5 bg-white rounded-xl border border-neutral-200 flex items-center justify-between text-[11px]">
                <span className="text-neutral-500">Human Transfer Line:</span>
                <span className="font-medium text-neutral-800">{callConfig?.transferNumber || '+1 (305) 555-0199'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-neutral-600 bg-neutral-100/60 p-2.5 rounded-xl">
              <Volume2 className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
              <span>Real-time voice synthesis and interactive telephony call testing.</span>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onOpenCallSetup}
              className="flex-1 py-2.5 px-4 text-xs font-semibold rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 flex items-center justify-center gap-2 shadow-2xs transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{callConfig?.connected ? 'Configure Phone Agent' : 'Set Up Business Line'}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenSimulator('call')}
              className="py-2.5 px-3.5 text-xs font-semibold rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 transition-colors"
            >
              Test Call
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
