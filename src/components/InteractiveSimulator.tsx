import React, { useState, useRef } from 'react';
import { Agent, ChatMessage, PlatformType } from '../types';
import { apiFetch } from '../lib/api';
import { AgentResponseRating } from './AgentResponseRating';
import {
  Instagram,
  Phone,
  Facebook,
  PhoneCall,
  Send,
  Mic,
  Image as ImageIcon,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Bot,
  User,
  CheckCircle2,
  Tag,
  MessageSquare,
  Radio,
  Layers,
  PhoneIncoming,
  PhoneOff,
} from 'lucide-react';

interface InteractiveSimulatorProps {
  agent: Agent;
  initialPlatform?: PlatformType;
}

export const InteractiveSimulator: React.FC<InteractiveSimulatorProps> = ({
  agent,
  initialPlatform = 'instagram',
}) => {
  const [platform, setPlatform] = useState<PlatformType>(initialPlatform);
  const [contextType, setContextType] = useState<'dm' | 'comment' | 'tag' | 'call'>('dm');
  const [inputText, setInputText] = useState('');
  const [inputText2, setInputText2] = useState('');
  const [isMultiMessageMode, setIsMultiMessageMode] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callTimerId, setCallTimerId] = useState<any>(null);
  const [ttsAudioMuted, setTtsAudioMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Messages in current simulation
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init_1',
      sender: 'agent',
      text:
        platform === 'call'
          ? agent.platformConfig.call?.greetingMessage || 'Thank you for calling! How may I assist you today?'
          : `Hello! Welcome to ${agent.name}. How can I help you with our services, appointments, or products today?`,
      timestamp: new Date().toISOString(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendSingleOrMulti = async () => {
    if (!inputText.trim() && !attachedImage) return;

    const outgoingPayload: Array<{
      text: string;
      mediaType?: 'text' | 'image' | 'audio';
      mediaBase64?: string;
    }> = [];

    // Message 1
    outgoingPayload.push({
      text: inputText,
      mediaType: attachedImage ? 'image' : isRecordingVoice ? 'audio' : 'text',
      mediaBase64: attachedImage || undefined,
    });

    // If multi-message mode is on and second message has text
    if (isMultiMessageMode && inputText2.trim()) {
      outgoingPayload.push({
        text: inputText2,
        mediaType: 'text',
      });
    }

    // Add customer messages to local view
    const newCustMsgs: ChatMessage[] = outgoingPayload.map((m, idx) => ({
      id: `sim_cust_${Date.now()}_${idx}`,
      sender: 'customer',
      text: m.text,
      timestamp: new Date().toISOString(),
      mediaType: m.mediaType,
      mediaUrl: m.mediaBase64,
    }));

    setMessages((prev) => [...prev, ...newCustMsgs]);
    setInputText('');
    setInputText2('');
    setAttachedImage(null);
    setIsRecordingVoice(false);
    setIsLoading(true);

    try {
      const res = await apiFetch('/api/chat/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          platform,
          customerName: 'Alex Mercer',
          customerHandle: platform === 'instagram' ? '@alex_m' : '+1 (305) 991-8822',
          messages: outgoingPayload,
          contextType: platform === 'call' ? 'call' : contextType,
        }),
      });

      const data = await res.json();

      if (data.skipped) {
        setMessages((prev) => [
          ...prev,
          {
            id: `sys_${Date.now()}`,
            sender: 'agent',
            text: `[Automated Comment Filter]: ${data.reason}`,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else if (data.paused) {
        setMessages((prev) => [
          ...prev,
          {
            id: `sys_${Date.now()}`,
            sender: 'agent',
            text: `[Agent Paused]: ${data.message}`,
            timestamp: new Date().toISOString(),
          },
        ]);
      } else if (data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `sim_agent_${Date.now()}`,
            sender: 'agent',
            text: data.reply,
            timestamp: new Date().toISOString(),
            referencedMessageIds: data.referencedMessageIds,
          },
        ]);

        // Voice playback for Call mode or unmuted audio
        if ((platform === 'call' || !ttsAudioMuted) && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(data.reply.replace(/[*#]/g, ''));
          utterance.rate = agent.platformConfig.call?.speechSpeed || 1.0;
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (err) {
      console.error('Simulation error', err);
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleStartCall = () => {
    setIsCalling(true);
    setCallDuration(0);
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    setCallTimerId(interval);

    const greeting =
      agent.platformConfig.call?.greetingMessage ||
      `Thank you for calling ${agent.name || 'our support desk'}. How may I assist you today?`;

    setMessages([
      {
        id: `call_init_${Date.now()}`,
        sender: 'agent',
        text: greeting,
        timestamp: new Date().toISOString(),
      },
    ]);

    if (!ttsAudioMuted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(greeting);
      utterance.rate = agent.platformConfig.call?.speechSpeed || 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleEndCall = () => {
    setIsCalling(false);
    if (callTimerId) clearInterval(callTimerId);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Channel Switcher */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-600 animate-pulse" />
            <h2 className="text-xl font-bold text-neutral-900">Interactive Channel Simulator</h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Test multi-message handling, voice notes, images, comment keyword triggers, and live voice calls.
          </p>
        </div>

        {/* Channel Selector */}
        <div className="flex items-center gap-1.5 bg-muted p-1.5 rounded-2xl border border-border">
          {[
            { id: 'instagram' as PlatformType, name: 'Instagram', icon: Instagram, color: 'text-[#E1306C]' },
            { id: 'whatsapp' as PlatformType, name: 'WhatsApp', icon: Phone, color: 'text-[#25D366]' },
            { id: 'messenger' as PlatformType, name: 'Messenger', icon: Facebook, color: 'text-[#0866FF]' },
            { id: 'call' as PlatformType, name: 'Phone Call', icon: PhoneCall, color: 'text-amber-500' },
          ].map((item) => {
            const isSelected = platform === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setPlatform(item.id);
                  if (item.id === 'call') {
                    setContextType('call');
                  } else {
                    setContextType('dm');
                  }
                  setMessages([
                    {
                      id: `init_${Date.now()}`,
                      sender: 'agent',
                      text:
                        item.id === 'call'
                          ? agent.platformConfig.call?.greetingMessage || 'Thank you for calling! How may I assist you today?'
                          : `Hello! Welcome to ${agent.name} on ${item.name}. How may I help you today?`,
                      timestamp: new Date().toISOString(),
                    },
                  ]);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-card text-foreground shadow-xs border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? item.color : ''}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Simulator Device Frame */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Device Mockup */}
        <div className="lg:col-span-8 bg-card rounded-3xl border border-border shadow-xs flex flex-col overflow-hidden">
          {/* Device Header Bar */}
          <div
            className={`p-4 px-6 text-white flex items-center justify-between transition-colors ${
              platform === 'instagram'
                ? 'bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF]'
                : platform === 'whatsapp'
                ? 'bg-[#075E54]'
                : platform === 'messenger'
                ? 'bg-[#0866FF]'
                : 'bg-neutral-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                {platform === 'instagram' ? (
                  <Instagram className="w-5 h-5" />
                ) : platform === 'whatsapp' ? (
                  <Phone className="w-5 h-5" />
                ) : platform === 'messenger' ? (
                  <Facebook className="w-5 h-5" />
                ) : (
                  <PhoneCall className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold leading-tight">{agent.name}</h3>
                <p className="text-[10px] text-white/80 leading-none mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {platform === 'call'
                    ? isCalling
                      ? `In Call · ${formatSeconds(callDuration)}`
                      : 'Voice Line Ready'
                    : 'Online · Automated by Zivofly'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTtsAudioMuted(!ttsAudioMuted)}
                title={ttsAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                {ttsAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() =>
                  setMessages([
                    {
                      id: `init_${Date.now()}`,
                      sender: 'agent',
                      text: `Hello! I'm ${agent.name}. Feel free to ask about our hours, pricing, bookings, or services!`,
                      timestamp: new Date().toISOString(),
                    },
                  ])
                }
                title="Reset Chat"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Special Context Toggles for Instagram */}
          {platform === 'instagram' && (
            <div className="bg-muted p-2.5 px-6 border-b border-border flex items-center gap-3 text-xs">
              <span className="font-semibold text-muted-foreground">Simulate:</span>
              <button
                onClick={() => setContextType('dm')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  contextType === 'dm' ? 'bg-card text-foreground shadow-2xs border border-border' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Direct Message (DM)
              </button>
              <button
                onClick={() => setContextType('comment')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  contextType === 'comment' ? 'bg-card text-foreground shadow-2xs border border-border' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Comment (Keyword Filtered)
              </button>
              <button
                onClick={() => setContextType('tag')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  contextType === 'tag' ? 'bg-card text-foreground shadow-2xs border border-border' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Account Tag
              </button>
            </div>
          )}

          {/* Call Screen Interface when platform === 'call' */}
          {platform === 'call' && (
            <div className="p-6 bg-neutral-950 text-white flex flex-col items-center justify-center space-y-4 border-b border-border">
              <div className="relative">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center border-2 ${
                    isCalling
                      ? 'border-emerald-500 bg-emerald-500/20 animate-pulse'
                      : 'border-neutral-700 bg-neutral-800'
                  }`}
                >
                  <PhoneCall className={`w-8 h-8 ${isCalling ? 'text-emerald-400' : 'text-neutral-400'}`} />
                </div>
              </div>

              <div className="text-center">
                <h4 className="text-base font-bold">{agent.platformConfig.call?.phoneNumber || '+1 (800) 842-LUMI'}</h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {isCalling
                    ? agent.customVoice?.enabled && agent.customVoice?.authorized
                      ? `Connected · Speaking with Custom Voice (${agent.customVoice.voiceName || 'Your Voice'})`
                      : `Connected · Voice: ${agent.platformConfig.call?.voiceName || 'Kore'}`
                    : agent.customVoice?.enabled && agent.customVoice?.authorized
                    ? `Ready · Custom Voice (${agent.customVoice.voiceName || 'Your Voice'}) Enabled`
                    : 'Press Call to Dial'}
                </p>
              </div>

              {/* Call Controls */}
              <div className="flex items-center gap-4 pt-2">
                {!isCalling ? (
                  <button
                    type="button"
                    onClick={handleStartCall}
                    className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/30 transition-all"
                  >
                    <PhoneIncoming className="w-4 h-4" />
                    <span>Dial / Call Agent</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEndCall}
                    className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>Hang Up</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Message Thread Feed */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 max-h-[400px] min-h-[300px] bg-background/50">
            {messages.map((msg) => {
              const isCust = msg.sender === 'customer';
              return (
                <div key={msg.id} className={`flex flex-col ${isCust ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-muted-foreground mb-1 px-1">
                    {isCust ? 'Alex Mercer (Customer)' : agent.name}
                  </span>

                  {!isCust ? (
                    <AgentResponseRating
                      messageId={msg.id}
                      messageText={msg.text}
                      rating={msg.rating}
                      feedback={msg.feedback}
                      feedbackCreatedAt={msg.feedbackCreatedAt}
                      onUpdateFeedback={(msgId, rating, feedback) => {
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === msgId
                              ? { ...m, rating, feedback, feedbackCreatedAt: new Date().toISOString() }
                              : m
                          )
                        );
                      }}
                      align="left"
                      className="max-w-md"
                    >
                      <div className="p-3.5 rounded-2xl rounded-tl-xs bg-card border border-border text-foreground text-xs leading-relaxed shadow-2xs w-full">
                        {/* Media attachments */}
                        {msg.mediaType === 'image' && msg.mediaUrl && (
                          <div className="mb-2">
                            <img
                              src={msg.mediaUrl}
                              alt="Inquiry"
                              referrerPolicy="no-referrer"
                              className="rounded-lg max-h-40 w-full object-cover"
                            />
                          </div>
                        )}
                        {msg.mediaType === 'audio' && (
                          <div className="flex items-center gap-2 mb-1.5 p-1.5 bg-muted text-foreground rounded-lg border border-border">
                            <Volume2 className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="text-[11px] font-semibold">Voice Note Audio</span>
                          </div>
                        )}

                        <div className="whitespace-pre-wrap">{msg.text}</div>

                        {/* Referenced Message Highlight */}
                        {msg.referencedMessageIds && msg.referencedMessageIds.length > 1 && (
                          <div className="mt-2 pt-2 border-t border-border text-[10px] text-primary font-semibold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>Referenced & answered multiple messages simultaneously</span>
                          </div>
                        )}
                      </div>
                    </AgentResponseRating>
                  ) : (
                    <div className="max-w-md p-3.5 rounded-2xl rounded-tr-xs bg-primary text-primary-foreground shadow-2xs font-medium text-xs leading-relaxed">
                      {/* Media attachments */}
                      {msg.mediaType === 'image' && msg.mediaUrl && (
                        <div className="mb-2">
                          <img
                            src={msg.mediaUrl}
                            alt="Inquiry"
                            referrerPolicy="no-referrer"
                            className="rounded-lg max-h-40 w-full object-cover"
                          />
                        </div>
                      )}
                      {msg.mediaType === 'audio' && (
                        <div className="flex items-center gap-2 mb-1.5 p-1.5 bg-white/20 text-white rounded-lg">
                          <Volume2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[11px] font-semibold">Voice Note Audio</span>
                        </div>
                      )}

                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                <span>{agent.name} is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Interactive Input Form */}
          <div className="p-4 border-t border-border bg-card space-y-3">
            {/* Multi-message mode toggle */}
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setIsMultiMessageMode(!isMultiMessageMode)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  isMultiMessageMode
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  {isMultiMessageMode ? 'Multi-Message Test: Active (2 Messages)' : '+ Test 2 Messages at Once'}
                </span>
              </button>

              <div className="flex items-center gap-2">
                {attachedImage && (
                  <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Photo Attached
                  </span>
                )}
                {isRecordingVoice && (
                  <span className="text-[11px] text-amber-500 font-semibold flex items-center gap-1">
                    <Volume2 className="w-3 h-3 animate-pulse" /> Voice Mode Active
                  </span>
                )}
              </div>
            </div>

            {/* First Message Box */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isMultiMessageMode && handleSendSingleOrMulti()}
                placeholder={
                  platform === 'call'
                    ? 'Speak or type what the caller says...'
                    : contextType === 'comment'
                    ? 'Type a post comment (e.g. "What is the price of the facial?")...'
                    : 'Type first customer message (e.g. "Do you have free parking?")...'
                }
                className="flex-1 px-4 py-2.5 text-xs border border-border bg-background text-foreground rounded-xl focus:border-primary focus:outline-none"
              />

              {/* Photo attach button */}
              <button
                type="button"
                onClick={() => {
                  setAttachedImage(
                    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80'
                  );
                }}
                title="Attach Sample Photo"
                className="p-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* Voice Note toggle */}
              <button
                type="button"
                onClick={() => {
                  setIsRecordingVoice(!isRecordingVoice);
                  if (!inputText) {
                    setInputText('Hello! Inquiring about your weekend hours and cancellation policy.');
                  }
                }}
                title="Simulate Voice Note"
                className={`p-2.5 rounded-xl border transition-colors ${
                  isRecordingVoice
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>

              {!isMultiMessageMode && (
                <button
                  type="button"
                  disabled={isLoading || (!inputText.trim() && !attachedImage)}
                  onClick={handleSendSingleOrMulti}
                  className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:opacity-95 disabled:opacity-50 transition-opacity flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Second Message Box (for Multi-Message Testing) */}
            {isMultiMessageMode && (
              <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                <input
                  type="text"
                  value={inputText2}
                  onChange={(e) => setInputText2(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendSingleOrMulti()}
                  placeholder='Type second consecutive message (e.g. "What are your business hours?")...'
                  className="flex-1 px-4 py-2 text-xs border border-primary/40 bg-primary/5 text-foreground rounded-xl focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  disabled={isLoading || (!inputText.trim() && !inputText2.trim())}
                  onClick={handleSendSingleOrMulti}
                  className="px-5 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:opacity-95 disabled:opacity-50 transition-opacity flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <span>Send Both at Once</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Scenario Presets */}
        <div className="lg:col-span-4 bg-card rounded-3xl p-6 border border-border shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-foreground">1-Click Test Scenarios</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Click any scenario to immediately demonstrate agent reasoning, RAG facts, and multimodal handling.
          </p>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                setIsMultiMessageMode(true);
                setInputText('Hi! Where are you located?');
                setInputText2('And what are your operating hours?');
              }}
              className="w-full text-left p-3 rounded-2xl border border-border bg-background/50 hover:border-primary/40 hover:bg-accent transition-all text-xs space-y-1 group"
            >
              <span className="font-bold text-foreground block group-hover:text-primary">
                1. Multi-Message Test (Parking + Price)
              </span>
              <p className="text-[11px] text-muted-foreground">
                Sends 2 consecutive questions. Agent will reply referencing both 1 & 2 sequentially.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMultiMessageMode(false);
                setContextType('comment');
                setInputText('Can you send me the link and price for your massage?');
              }}
              className="w-full text-left p-3 rounded-2xl border border-border bg-background/50 hover:border-pink-500/40 hover:bg-accent transition-all text-xs space-y-1 group"
            >
              <span className="font-bold text-foreground block group-hover:text-pink-500">
                2. Instagram Comment with Keyword Match
              </span>
              <p className="text-[11px] text-muted-foreground">
                Matches "price" and "link" keyword filters, prompting an auto-reply.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMultiMessageMode(false);
                setIsRecordingVoice(true);
                setInputText('Hello, what are your cancellation policies for bridal parties?');
              }}
              className="w-full text-left p-3 rounded-2xl border border-border bg-background/50 hover:border-amber-500/40 hover:bg-accent transition-all text-xs space-y-1 group"
            >
              <span className="font-bold text-foreground block group-hover:text-amber-500">
                3. Voice Note Simulation (Audio Inquiry)
              </span>
              <p className="text-[11px] text-muted-foreground">
                Simulates incoming voice memo and synthesizes audio voice response.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsMultiMessageMode(false);
                setAttachedImage(
                  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80'
                );
                setInputText('Do you have this specific botanical skincare line in stock?');
              }}
              className="w-full text-left p-3 rounded-2xl border border-border bg-background/50 hover:border-emerald-500/40 hover:bg-accent transition-all text-xs space-y-1 group"
            >
              <span className="font-bold text-foreground block group-hover:text-emerald-500">
                4. Image Attachment (Skincare Bottle)
              </span>
              <p className="text-[11px] text-muted-foreground">
                Attaches a treatment photo to test visual comprehension.
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
