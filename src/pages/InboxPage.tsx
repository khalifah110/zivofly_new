import React, { useState } from 'react';
import { Plus, Star, Send, Bot, User as UserIcon, ShieldAlert, PhoneCall } from 'lucide-react';
import { toast } from 'sonner';
import { ChannelIcon } from '../components/ChannelIcon';
import { Conversation, PlatformType } from '../types';
import { apiFetch } from '../lib/api';
import { AgentResponseRating } from '../components/AgentResponseRating';
import { TakeoverSlider } from '../components/TakeoverSlider';

interface InboxPageProps {
  conversations: Conversation[];
  onNewConversation: () => void;
  onUpdateConversation: (updated: Conversation) => void;
}

export const InboxPage: React.FC<InboxPageProps> = ({
  conversations,
  onNewConversation,
  onUpdateConversation,
}) => {
  const [selectedConvId, setSelectedConvId] = useState<string>(
    conversations[0]?.id || ''
  );
  const [messageText, setMessageText] = useState('');
  const [sendAsRole, setSendAsRole] = useState<'customer' | 'human'>('customer');
  const [sending, setSending] = useState(false);

  const activeConv = conversations.find((c) => c.id === selectedConvId) || conversations[0];

  const handleTakeoverSwitch = async (target: 'human' | 'agent') => {
    if (!activeConv) return;
    try {
      const res = await apiFetch(`/api/conversations/${activeConv.id}/takeover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });

      if (res.ok) {
        const data = await res.json();
        onUpdateConversation(data.conversation);
        if (target === 'agent') {
          toast.success('Agent is answering messages automatically.');
        } else {
          toast.success('You have taken over. The agent stays quiet until switched back to Agent.');
        }
      }
    } catch {
      toast.error('Could not switch takeover status');
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
          onUpdateConversation(data.conversation);
          return;
        }
      }
      onUpdateConversation(updatedConv);
    } catch (err) {
      console.error('Error rating response:', err);
      // Still update locally for smooth UX
      const updatedMessages = activeConv.messages.map((m) =>
        m.id === messageId
          ? { ...m, rating, feedback, feedbackCreatedAt: new Date().toISOString() }
          : m
      );
      onUpdateConversation({
        ...activeConv,
        messages: updatedMessages,
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConv || sending) return;

    const content = messageText.trim();
    setMessageText('');
    setSending(true);

    try {
      const res = await apiFetch(`/api/conversations/${activeConv.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: sendAsRole,
          content,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onUpdateConversation(data.conversation);
      } else {
        toast.error('Could not send message');
      }
    } catch {
      toast.error('Could not send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-normal tracking-tight text-foreground">
            Inbox
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every conversation your agent handled, across all channels.
          </p>
        </div>

        <button
          onClick={onNewConversation}
          className="flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
        >
          <Plus className="size-4" />
          <span>New test conversation</span>
        </button>
      </div>

      {/* Master Detail Split */}
      <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
        {/* Left Column: Conversations List */}
        <div className="space-y-2">
          {conversations.length === 0 ? (
            <div className="surface-card p-6 text-center text-sm text-muted-foreground">
              No conversations yet.
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected = activeConv?.id === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`surface-card w-full p-4 text-left transition-all ${
                    isSelected ? 'border-primary ring-1 ring-primary' : 'hover:border-border/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-foreground truncate">
                      {conv.customerName}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(conv.lastMessageTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    <ChannelIcon channel={conv.platform as PlatformType} size={14} />
                    <span className="text-xs text-muted-foreground truncate">
                      {conv.customerHandle}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground line-clamp-1">
                    {conv.lastMessageText || 'No message yet'}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    {conv.status === 'human_takeover' ? (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        Human Takeover
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                        Agent Answering
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right Column: Active Conversation */}
        {activeConv ? (
          <div className="surface-card flex flex-col h-[600px] overflow-hidden">
            {/* Header */}
            <div className="border-b border-border bg-secondary/20 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <ChannelIcon channel={activeConv.platform as PlatformType} size={20} />
                </div>
                <div>
                  <h2 className="text-base font-medium text-foreground">
                    {activeConv.customerName}
                  </h2>
                  <div className="text-xs text-muted-foreground">
                    {activeConv.customerHandle} • {activeConv.platform}
                  </div>
                </div>
              </div>

              {/* Takeover Slide Bar: Human <-> Agent (Hidden for Call since human cannot take over while call is going) */}
              {activeConv.platform === 'call' ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold select-none">
                  <PhoneCall className="size-3.5 text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
                  <span>Voice Call • Handled by AI Agent</span>
                </div>
              ) : (
                <TakeoverSlider
                  status={activeConv.status}
                  onChange={handleTakeoverSwitch}
                />
              )}
            </div>

            {/* Takeover Banner (Only for non-call platforms) */}
            {activeConv.platform !== 'call' && activeConv.status === 'human_takeover' && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2 text-xs text-amber-800">
                <ShieldAlert className="size-4 shrink-0" />
                <span>
                  You have taken over. The agent stays quiet until you switch it back on.
                </span>
              </div>
            )}

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {activeConv.messages.map((m) => {
                const isCustomer = m.sender === 'customer';
                const isAgent = m.sender === 'agent';
                const isHuman = m.sender === 'human';

                return (
                  <div
                    key={m.id}
                    className={`flex gap-2.5 ${isCustomer ? 'justify-start' : 'justify-end'}`}
                  >
                    {isCustomer && (
                      <div className="size-7 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5">
                        <UserIcon className="size-3.5 text-muted-foreground" />
                      </div>
                    )}

                    {isAgent ? (
                      <AgentResponseRating
                        messageId={m.id}
                        messageText={m.text}
                        rating={m.rating}
                        feedback={m.feedback}
                        feedbackCreatedAt={m.feedbackCreatedAt}
                        onUpdateFeedback={handleMessageFeedback}
                        align="right"
                        className="max-w-[78%]"
                      >
                        <div className="rounded-2xl rounded-tr-none px-4 py-2.5 text-sm leading-relaxed bg-primary text-primary-foreground shadow-xs">
                          <div className="flex items-center gap-1.5 mb-1 text-[10px] opacity-75">
                            <span className="font-semibold">{activeConv.agentName || 'AI Agent'}</span>
                            <span>•</span>
                            <span>
                              {new Date(m.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="whitespace-pre-line">{m.text}</p>
                        </div>
                      </AgentResponseRating>
                    ) : (
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isCustomer
                            ? 'bg-secondary text-foreground rounded-tl-none'
                            : 'bg-amber-600 text-white rounded-tr-none'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] opacity-75">
                          <span>
                            {isCustomer
                              ? activeConv.customerName
                              : 'You (Human Staff)'}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(m.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="whitespace-pre-line">{m.text}</p>
                      </div>
                    )}

                    {!isCustomer && (
                      <div
                        className={`size-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          isAgent ? 'bg-primary/20 text-primary' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isAgent ? <Bot className="size-3.5" /> : <UserIcon className="size-3.5" />}
                      </div>
                    )}
                  </div>
                );
              })}
              {sending && sendAsRole === 'customer' && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pl-10">
                  <span className="size-1.5 rounded-full bg-primary animate-ping" />
                  <span>Agent is typing a reply…</span>
                </div>
              )}
            </div>

            {/* Composer Bar */}
            {activeConv.platform === 'call' ? (
              <div className="border-t border-border p-3.5 px-4 bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PhoneCall className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Live voice call session • The AI Voice Agent handles the call in real time. Human takeover is unavailable during voice calls.</span>
                </div>
                <span className="text-[11px] font-medium text-foreground/80 bg-background px-2 py-0.5 rounded-md border border-border shrink-0">
                  AI Voice Active
                </span>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="border-t border-border p-3 bg-background">
                <div className="flex items-center justify-between gap-2 mb-2 px-1">
                  <span className="text-[11px] text-muted-foreground">Send as:</span>
                  <div className="flex rounded-md border border-border p-0.5 bg-secondary/30">
                    <button
                      type="button"
                      onClick={() => setSendAsRole('customer')}
                      className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                        sendAsRole === 'customer'
                          ? 'bg-background font-medium text-foreground shadow-xs'
                          : 'text-muted-foreground'
                      }`}
                    >
                      Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setSendAsRole('human')}
                      className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                        sendAsRole === 'human'
                          ? 'bg-background font-medium text-foreground shadow-xs'
                          : 'text-muted-foreground'
                      }`}
                    >
                      Staff / Human
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={
                      sendAsRole === 'customer'
                        ? 'Type customer message (agent will reply)...'
                        : 'Type human staff reply (agent remains silent)...'
                    }
                    className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || !messageText.trim()}
                    className="size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-95 transition-opacity disabled:opacity-40 shrink-0"
                  >
                    <Send className="size-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="surface-card p-12 text-center text-sm text-muted-foreground">
            Select a conversation to inspect messages.
          </div>
        )}
      </div>
    </div>
  );
};
