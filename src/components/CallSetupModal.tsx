import React, { useState } from 'react';
import { Agent } from '../types';
import { apiFetch } from '../lib/api';
import {
  PhoneCall,
  Volume2,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  X,
  Play,
  Square,
  Bot,
} from 'lucide-react';

interface CallSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent;
  onConnected: (updatedAgent: Agent) => void;
}

export const CallSetupModal: React.FC<CallSetupModalProps> = ({
  isOpen,
  onClose,
  agent,
  onConnected,
}) => {
  const [phoneNumber, setPhoneNumber] = useState(
    agent.platformConfig.call?.phoneNumber || '+1 (800) 842-LUMI'
  );
  const [voiceName, setVoiceName] = useState<
    'Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir'
  >(agent.platformConfig.call?.voiceName || 'Kore');
  const [greetingMessage, setGreetingMessage] = useState(
    agent.platformConfig.call?.greetingMessage ||
      `Thank you for calling ${agent.name}. How may I assist you today?`
  );
  const [speechSpeed, setSpeechSpeed] = useState<number>(
    agent.platformConfig.call?.speechSpeed || 1.0
  );
  const [transferNumber, setTransferNumber] = useState(
    agent.platformConfig.call?.transferNumber || '+1 (305) 555-0199'
  );
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleTestVoice = () => {
    if (agent.customVoice?.enabled && agent.customVoice?.authorized && agent.customVoice?.audioUrl) {
      const audio = new Audio(agent.customVoice.audioUrl);
      setIsPlayingPreview(true);
      audio.onended = () => setIsPlayingPreview(false);
      audio.onerror = () => setIsPlayingPreview(false);
      audio.play().catch(() => setIsPlayingPreview(false));
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (isPlayingPreview) {
        setIsPlayingPreview(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(greetingMessage);
      utterance.rate = speechSpeed;
      utterance.onend = () => setIsPlayingPreview(false);
      utterance.onerror = () => setIsPlayingPreview(false);
      setIsPlayingPreview(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSaveCallConfig = async () => {
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/meta/call/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          phoneNumber,
          voiceName,
          greetingMessage,
          speechSpeed,
        }),
      });
      const data = await res.json();
      if (data.agent) {
        onConnected(data.agent);
        onClose();
      }
    } catch (err) {
      console.error('Call setup error', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-background rounded-2xl max-w-lg w-full shadow-2xl border border-border overflow-hidden text-foreground">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 dark:from-neutral-950 dark:to-neutral-900 px-6 py-4 text-white flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <PhoneCall className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide">AI Phone Call Agent Setup</h3>
              <p className="text-[11px] text-neutral-300">Live Voice Receptionist & Interactive Telephony</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Business Telephone Number (Direct or Inbound SIP)
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-border bg-card rounded-xl text-foreground focus:border-primary focus:outline-none"
              placeholder="+1 (800) 555-0199"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Calls to this number will be answered autonomously by your AI Agent.
            </p>
          </div>

          {agent.customVoice?.enabled && agent.customVoice?.authorized && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Authorized Custom Voice Active:</strong>{' '}
                  {agent.customVoice.voiceName || 'Your Voice'}
                </span>
              </div>
              <span className="text-[10px] font-semibold bg-amber-500/20 px-2 py-0.5 rounded-full">
                Custom Cloned Voice
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                AI Voice Persona
              </label>
              <select
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-border bg-card rounded-xl text-foreground focus:border-primary focus:outline-none"
              >
                <option value="Kore">Kore (Warm, Professional & Calm)</option>
                <option value="Zephyr">Zephyr (Bright, Friendly & Dynamic)</option>
                <option value="Puck">Puck (Polished, Energetic)</option>
                <option value="Charon">Charon (Authoritative, Reassuring)</option>
                <option value="Fenrir">Fenrir (Deep, Corporate Tone)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Voice Pace / Speed ({speechSpeed}x)
              </label>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.05"
                value={speechSpeed}
                onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                className="w-full accent-primary mt-2"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-foreground">
                Inbound Call Greeting Message
              </label>
              <button
                type="button"
                onClick={handleTestVoice}
                className="text-[11px] text-primary hover:opacity-90 font-semibold flex items-center gap-1 transition-colors"
              >
                {isPlayingPreview ? (
                  <>
                    <Square className="w-3 h-3 text-destructive fill-destructive" />
                    <span>Stop Sample</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3 h-3" />
                    <span>Preview Voice</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={2}
              value={greetingMessage}
              onChange={(e) => setGreetingMessage(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-border bg-card rounded-xl text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Human Escalation / Transfer Number
            </label>
            <input
              type="text"
              value={transferNumber}
              onChange={(e) => setTransferNumber(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-border bg-card rounded-xl text-foreground focus:border-primary focus:outline-none"
              placeholder="+1 (305) 555-0199"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              If the caller requests a human manager or an emergency arises, the agent dials this number.
            </p>
          </div>

          <div className="p-3 bg-muted rounded-xl border border-border flex items-center gap-2.5 text-xs text-foreground">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <span>Default Availability: <strong>24/7</strong> (Customizable in Agent Settings)</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveCallConfig}
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-95 shadow-xs transition-opacity"
            >
              {isSaving ? 'Activating Line...' : 'Activate Voice Line'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
