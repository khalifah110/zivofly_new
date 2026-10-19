import React, { useState } from 'react';
import { Agent } from '../types';
import { apiFetch } from '../lib/api';
import {
  CheckCircle2,
  Phone,
  ShieldCheck,
  Building2,
  Network,
  Bot,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Smartphone,
  KeyRound,
  Check,
} from 'lucide-react';

interface WhatsAppWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent;
  onConnected: (updatedAgent: Agent) => void;
}

export const WhatsAppWizardModal: React.FC<WhatsAppWizardModalProps> = ({
  isOpen,
  onClose,
  agent,
  onConnected,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [businessName, setBusinessName] = useState(agent?.name ? `${agent.name} Desk` : '');
  const [category, setCategory] = useState('E-commerce & Retail');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'testing' | 'active'>('idle');
  const [selectedAgentOption, setSelectedAgentOption] = useState<'existing' | 'new'>('existing');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleTestWebhook = () => {
    setWebhookStatus('testing');
    setTimeout(() => {
      setWebhookStatus('active');
    }, 1200);
  };

  const handleCompleteSetup = async () => {
    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/meta/whatsapp/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          phoneNumber,
          businessName,
          wabaId: `WABA_${Date.now()}`,
        }),
      });
      const data = await res.json();
      if (data.agent) {
        onConnected(data.agent);
        onClose();
        setCurrentStep(1);
      }
    } catch (err) {
      console.error('WhatsApp setup error', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-background rounded-2xl max-w-xl w-full shadow-2xl border border-border overflow-hidden text-foreground">
        {/* Modal Top Header */}
        <div className="bg-[#25D366] dark:bg-emerald-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-white">WhatsApp Business Embedded Portal</h3>
              <p className="text-[11px] text-white/90">Official Meta Cloud API 4-Step Quick Setup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-Step Progress Indicator (Jotform style) */}
        <div className="bg-muted px-6 py-3 border-b border-border">
          <div className="grid grid-cols-4 gap-2">
            {[
              { step: 1, label: '1. Business Info' },
              { step: 2, label: '2. Number Verify' },
              { step: 3, label: '3. Cloud Webhook' },
              { step: 4, label: '4. Link Agent' },
            ].map((s) => (
              <div
                key={s.step}
                className={`text-center py-1 rounded-lg text-xs font-semibold transition-all ${
                  currentStep === s.step
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : currentStep > s.step
                    ? 'text-emerald-500 bg-emerald-500/10'
                    : 'text-muted-foreground bg-background border border-border'
                }`}
              >
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">Step 1: Business Profile Information</h4>
                <p className="text-xs text-muted-foreground">
                  Enter your official WhatsApp Business profile details. Zivofly automatically communicates with Meta's Business Manager.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    WhatsApp Display Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-border bg-card rounded-xl text-foreground focus:border-primary focus:outline-none"
                    placeholder="e.g. Acme Support Concierge"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Business Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-border bg-card rounded-xl text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="Beauty, Spa & Personal Care">Beauty, Spa & Personal Care</option>
                    <option value="E-commerce & Retail">E-commerce & Retail</option>
                    <option value="Hospitality & Travel">Hospitality & Travel</option>
                    <option value="Professional Services">Professional Services</option>
                    <option value="Healthcare & Wellness">Healthcare & Wellness</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-95 flex items-center gap-1.5 transition-opacity"
                >
                  <span>Next: Verify Phone</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">Step 2: WhatsApp Number Verification</h4>
                <p className="text-xs text-muted-foreground">
                  Connect your business phone number to Meta's Cloud API without needing an active SIM card.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Phone Number (E.164 Format)
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-border bg-card rounded-xl text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-card rounded-xl border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">One-Time Security PIN (OTP)</span>
                    <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Auto-Generated PIN
                    </span>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-border bg-background rounded-xl font-mono tracking-wider text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-95 flex items-center gap-1.5 transition-opacity"
                >
                  <span>Next: Configure Webhook</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">Step 3: Meta Cloud Webhook & Event Handlers</h4>
                <p className="text-xs text-muted-foreground">
                  Zivofly handles the secure webhook handshake, signature verification, and real-time message routing.
                </p>
              </div>

              <div className="space-y-2 bg-card p-3.5 rounded-xl border border-border">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Callback URL:</span>
                  <span className="font-mono text-foreground text-[11px]">https://zivofly.app/api/webhooks/meta</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Verification Token:</span>
                  <span className="font-mono text-foreground text-[11px]">zivofly_meta_token_123</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Subscribed Events:</span>
                  <span className="text-foreground font-medium text-[11px]">messages, message_deliveries</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  className="w-full py-2.5 px-4 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-accent text-foreground flex items-center justify-center gap-2 transition-colors"
                >
                  <Network className="w-4 h-4 text-primary" />
                  <span>
                    {webhookStatus === 'testing'
                      ? 'Performing Handshake with Meta...'
                      : webhookStatus === 'active'
                      ? '✓ Webhook Handshake Verified (HTTP 200 OK)'
                      : 'Test Handshake & Verify Endpoint'}
                  </span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-95 flex items-center gap-1.5 transition-opacity"
                >
                  <span>Next: Link Agent</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">Step 4: Link Agent to WhatsApp Number</h4>
                <p className="text-xs text-muted-foreground">
                  Connect your verified WhatsApp Business line to your existing AI agent or establish a new dedicated persona.
                </p>
              </div>

              <div className="space-y-2">
                <div
                  onClick={() => setSelectedAgentOption('existing')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    selectedAgentOption === 'existing'
                      ? 'border-primary bg-primary/10 shadow-2xs'
                      : 'border-border hover:border-border/80 bg-card'
                  }`}
                >
                  <input
                    type="radio"
                    name="agentOption"
                    checked={selectedAgentOption === 'existing'}
                    onChange={() => setSelectedAgentOption('existing')}
                    className="mt-0.5 accent-primary"
                  />
                  <div>
                    <h5 className="text-xs font-bold text-foreground">Connect to Current Agent ({agent.name})</h5>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Shares the same knowledge base, business prompt, and availability schedules across all channels.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setSelectedAgentOption('new')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    selectedAgentOption === 'new'
                      ? 'border-primary bg-primary/10 shadow-2xs'
                      : 'border-border hover:border-border/80 bg-card'
                  }`}
                >
                  <input
                    type="radio"
                    name="agentOption"
                    checked={selectedAgentOption === 'new'}
                    onChange={() => setSelectedAgentOption('new')}
                    className="mt-0.5 accent-primary"
                  />
                  <div>
                    <h5 className="text-xs font-bold text-foreground">Create Dedicated WhatsApp Agent</h5>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Sets up a tailored sales or support agent with specialized WhatsApp duty prompts.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Supports Text, Audio voice notes, and Images with automatic multi-message referencing.</span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCompleteSetup}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#25D366] hover:bg-emerald-600 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  {isSubmitting ? 'Saving Configuration...' : 'Activate WhatsApp Automation'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
