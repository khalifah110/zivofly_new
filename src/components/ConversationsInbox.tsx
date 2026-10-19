import React, { useState, useEffect } from 'react';
import { Agent, ChatMessage, Conversation, PlatformType } from '../types';
import { apiFetch } from '../lib/api';
import { AgentResponseRating } from './AgentResponseRating';
import { TakeoverSlider } from './TakeoverSlider';
import {
  MessageSquare,
  Instagram,
  Phone,
  Facebook,
  PhoneCall,
  UserCheck,
  Bot,
  Star,
  Send,
  Sparkles,
  CheckCircle2,
  Volume2,
  Image as ImageIcon,
  User,
  ShieldCheck,
  RefreshCw,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface ConversationsInboxProps {
  agent: Agent;
}

export const ConversationsInbox: React.FC<ConversationsInboxProps> = ({ agent }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [humanReplyText, setHumanReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [catchUpNotification, setCatchUpNotification] = useState<string | null>(null);

  const fetchConversations = async () => {
    try {
      const res = await apiFetch(`/api/conversations?agentId=${agent.id}&platform=${filterPlatform}`);
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
        if (!selectedConvId && data.conversations.length > 0) {
          setSelectedConvId(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [agent.id, filterPlatform]);

  const activeConv = conversations.find((c) => c.id === selectedConvId);

  useEffect(() => {
    if (activeConv) {
      setCatchUpNotification(null);
    }
  }, [selectedConvId]);

  const handleToggleTakeover = async (target?: 'human' | 'agent') => {
    if (!activeConv) return;
    try {
      const res = await apiFetch(`/api/conversations/${activeConv.id}/takeover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const data = await res.json();
      if (data.conversation) {
        setConversations((prev) =>
          prev.map((c) => (c.id === data.conversation.id ? data.conversation : c))
        );
        if (data.resumed && data.catchUpNote) {
          setCatchUpNotification(data.catchUpNote);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendHumanReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv || !humanReplyText.trim()) return;

    try {
      const res = await apiFetch(`/api/conversations/${activeConv.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: humanReplyText,
          sender: 'human',
        }),
      });
      const data = await res.json();
      if (data.conversation) {
        setConversations((prev) =>
          prev.map((c) => (c.id === data.conversation.id ? data.conversation : c))
        );
        setHumanReplyText('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMessageFeedback = async (messageId: string, rating: number, feedback: string) => {
    if (!activeConv) return;
    try {
      const res = await apiFetch(`/api/conversations/${activeConv.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          rating,
          feedbackComment: feedback,
        }),
      });

      const updatedMessages = activeConv.messages.map((m) =>
        m.id === messageId
          ? { ...m, rating, feedback, feedbackCreatedAt: new Date().toISOString() }
          : m
      );

      const updatedConv: Conversation = {
        ...activeConv,
        messages: updatedMessages,
      };

      if (res.ok) {
        const data = await res.json();
        if (data.conversation) {
          setConversations((prev) =>
            prev.map((c) => (c.id === data.conversation.id ? data.conversation : c))
          );
          return;
        }
      }

      setConversations((prev) =>
        prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const renderPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="w-4 h-4 text-[#E1306C]" />;
      case 'whatsapp':
        return <Phone className="w-4 h-4 text-[#25D366]" />;
      case 'messenger':
        return <Facebook className="w-4 h-4 text-[#0866FF]" />;
      case 'call':
        return <PhoneCall className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-neutral-800" />
            <h2 className="text-xl font-bold text-neutral-900">Unified Conversation Inbox</h2>
            <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
              Live Monitoring
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Monitor real-time interactions across all channels. Take over mid-conversation anytime, and rate responses to train accuracy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['all', 'instagram', 'whatsapp', 'messenger', 'call'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPlatform(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                filterPlatform === p
                  ? 'bg-neutral-900 text-white shadow-2xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Main Inbox Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px]">
        {/* Left: Conversation Thread List */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-neutral-200/80 shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-900">
              Conversations ({conversations.length})
            </span>
            <button
              onClick={fetchConversations}
              title="Refresh messages"
              className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 text-xs">
                No active conversations yet. Send a test message in the Test Simulator to see it here!
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`p-4 cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-neutral-50 border-l-4 border-neutral-900'
                        : 'hover:bg-neutral-50/60'
                    }`}
                  >
                    <div className="relative shrink-0">
                      {conv.customerAvatar ? (
                        <img
                          src={conv.customerAvatar}
                          alt={conv.customerName}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover border border-neutral-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-xs text-neutral-700">
                          {conv.customerName.slice(0, 1)}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-xs">
                        {renderPlatformIcon(conv.platform)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-neutral-900 truncate">
                          {conv.customerName}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {new Date(conv.lastMessageTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 truncate">
                        {conv.lastMessageText || 'New inquiry'}
                      </p>

                      <div className="flex items-center gap-1.5 mt-2">
                        {conv.status === 'human_takeover' ? (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Human Takeover
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            AI Active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Conversation Thread & Takeover Controls */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-neutral-200/80 shadow-xs flex flex-col overflow-hidden">
          {activeConv ? (
            <>
              {/* Conversation Top Header */}
              <div className="p-4 px-6 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-4 bg-neutral-50/50">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {activeConv.customerAvatar ? (
                      <img
                        src={activeConv.customerAvatar}
                        alt={activeConv.customerName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-neutral-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center font-bold text-xs text-neutral-700">
                        {activeConv.customerName.slice(0, 1)}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-xs">
                      {renderPlatformIcon(activeConv.platform)}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                      {activeConv.customerName}
                      <span className="text-[11px] font-normal text-neutral-500">
                        {activeConv.customerHandle}
                      </span>
                    </h3>
                    <p className="text-[11px] text-neutral-400 capitalize">
                      Channel: {activeConv.platform} · Handled by {agent.name}
                    </p>
                  </div>
                </div>

                {/* Human / Agent Takeover Slide Bar (Hidden for Call since human cannot take over while call is going) */}
                {activeConv.platform === 'call' ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold select-none">
                    <PhoneCall className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
                    <span>Voice Call · Handled by AI Agent</span>
                  </div>
                ) : (
                  <TakeoverSlider
                    status={activeConv.status}
                    onChange={(target) => handleToggleTakeover(target)}
                  />
                )}
              </div>

              {/* Catch-Up / Takeover Notification Banner */}
              {catchUpNotification && (
                <div className="bg-blue-50 border-b border-blue-200 p-3 px-6 text-xs text-blue-900 flex items-center gap-2 animate-in fade-in">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    <strong>Context Catch-Up Complete:</strong> {catchUpNotification}
                  </span>
                </div>
              )}

              {activeConv.platform !== 'call' && activeConv.status === 'human_takeover' && (
                <div className="bg-amber-50 border-b border-amber-200 p-2.5 px-6 text-xs text-amber-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span>
                    <strong>Human Takeover Active:</strong> Automated AI responses are paused for this customer. Type below to reply directly.
                  </span>
                </div>
              )}

              {/* Message History Feed */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 max-h-[460px]">
                {activeConv.messages.map((msg) => {
                  const isCustomer = msg.sender === 'customer';
                  const isHuman = msg.sender === 'human';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                          {isCustomer ? activeConv.customerName : isHuman ? 'Human Owner' : agent.name}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {!isCustomer && !isHuman ? (
                        <AgentResponseRating
                          messageId={msg.id}
                          messageText={msg.text}
                          rating={msg.rating}
                          feedback={msg.feedback}
                          feedbackCreatedAt={msg.feedbackCreatedAt}
                          onUpdateFeedback={handleMessageFeedback}
                          align="right"
                          className="max-w-md"
                        >
                          <div className="p-3.5 rounded-2xl rounded-tr-xs bg-neutral-900 text-white dark:bg-neutral-800 text-xs leading-relaxed shadow-2xs w-full">
                            {/* Audio voice note indicator */}
                            {msg.mediaType === 'audio' && (
                              <div className="flex items-center gap-2 mb-2 p-2 bg-white/10 rounded-lg">
                                <Volume2 className="w-4 h-4 shrink-0" />
                                <span className="text-[11px] font-medium">Voice Note / Audio Inquiry</span>
                              </div>
                            )}

                            {/* Image attachment */}
                            {msg.mediaType === 'image' && msg.mediaUrl && (
                              <div className="mb-2">
                                <img
                                  src={msg.mediaUrl}
                                  alt="Attached"
                                  referrerPolicy="no-referrer"
                                  className="rounded-lg max-h-48 w-full object-cover border border-white/20"
                                />
                              </div>
                            )}

                            <div className="whitespace-pre-wrap">{msg.text}</div>

                            {/* Multi-message referenced reply tag */}
                            {msg.referencedMessageIds && msg.referencedMessageIds.length > 1 && (
                              <div className="mt-2 pt-2 border-t border-white/20 text-[10px] text-white/80 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-300" />
                                <span>Referenced {msg.referencedMessageIds.length} customer messages simultaneously</span>
                              </div>
                            )}
                          </div>
                        </AgentResponseRating>
                      ) : (
                        <div
                          className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isCustomer
                              ? 'bg-neutral-100 text-neutral-900 rounded-tl-xs'
                              : 'bg-amber-500 text-white rounded-tr-xs'
                          }`}
                        >
                          {/* Audio voice note indicator */}
                          {msg.mediaType === 'audio' && (
                            <div className="flex items-center gap-2 mb-2 p-2 bg-neutral-200/50 dark:bg-white/10 rounded-lg">
                              <Volume2 className="w-4 h-4 shrink-0" />
                              <span className="text-[11px] font-medium">Voice Note / Audio Inquiry</span>
                            </div>
                          )}

                          {/* Image attachment */}
                          {msg.mediaType === 'image' && msg.mediaUrl && (
                            <div className="mb-2">
                              <img
                                src={msg.mediaUrl}
                                alt="Attached"
                                referrerPolicy="no-referrer"
                                className="rounded-lg max-h-48 w-full object-cover border border-neutral-300"
                              />
                            </div>
                          )}

                          <div className="whitespace-pre-wrap">{msg.text}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Human Direct Reply Box (Disabled for active voice calls) */}
              {activeConv.platform === 'call' ? (
                <div className="p-3.5 px-6 border-t border-neutral-100 bg-neutral-50/80 text-xs text-neutral-500 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Live phone call log · Human takeover is unavailable while call is active.</span>
                  </div>
                  <span className="text-[11px] font-medium text-neutral-700 bg-white px-2 py-0.5 rounded-md border border-neutral-200 shadow-2xs">
                    AI Voice Active
                  </span>
                </div>
              ) : (
                <div className="p-4 border-t border-neutral-100 bg-neutral-50/50">
                  <form onSubmit={handleSendHumanReply} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={humanReplyText}
                      onChange={(e) => setHumanReplyText(e.target.value)}
                      placeholder={
                        activeConv.status === 'human_takeover'
                          ? 'Type a human reply to the customer...'
                          : 'Take over first, or send an owner message...'
                      }
                      className="flex-1 px-4 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:ring-1 focus:ring-neutral-900 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!humanReplyText.trim()}
                      className="px-4 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      <span>Send</span>
                      <Send className="w-3 h-3" />
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-12 text-center text-neutral-400 text-xs">
              Select a conversation on the left to review message logs.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
