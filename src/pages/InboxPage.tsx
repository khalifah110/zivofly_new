import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Send,
  Bot,
  User as UserIcon,
  ShieldAlert,
  PhoneCall,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { ChannelIcon } from '../components/ChannelIcon';
import { Conversation, ConversationStatus, PlatformType } from '../types';
import { apiFetch } from '../lib/api';
import { AgentResponseRating } from '../components/AgentResponseRating';
import { TakeoverSlider } from '../components/TakeoverSlider';

interface InboxPageProps {
  conversations: Conversation[];
  onNewConversation: () => void;
  onUpdateConversation: (updated: Conversation) => void;
}

type InboxFilterType = 'all' | 'unread' | 'human_needed' | 'human_handling';

const FRONTEND_CONVERSATION_STATUS_STORAGE_KEY = 'zivofly_inbox_conv_status_overrides_v1';

const INITIAL_FALLBACK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_handoff_1',
    agentId: 'agent_default',
    agentName: 'AI Concierge',
    userId: 'user_default',
    platform: 'whatsapp',
    customerName: 'Daniel Mercer',
    customerHandle: '+1 (415) 890-4412',
    lastMessageText: 'Can you approve a custom 25% enterprise discount for 40 seats and send a custom contract?',
    lastMessageTime: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    unread: true,
    status: 'human_needed',
    handoffReason: 'Customer requested custom enterprise contract pricing outside standard knowledge base.',
    messages: [
      {
        id: 'msg_h1_1',
        sender: 'customer',
        text: 'Hi! We are looking to onboard our 40-person team this week.',
        timestamp: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg_h1_2',
        sender: 'agent',
        text: 'Welcome Daniel! I would be glad to help with your team onboarding. Our standard Business plan supports unlimited seats.',
        timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg_h1_3',
        sender: 'customer',
        text: 'Can you approve a custom 25% enterprise discount for 40 seats and send a custom contract?',
        timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'conv_ai_2',
    agentId: 'agent_default',
    agentName: 'AI Concierge',
    userId: 'user_default',
    platform: 'instagram',
    customerName: 'Elena Rostova',
    customerHandle: '@elena.studio',
    lastMessageText: 'Perfect, thank you for confirming the express shipping timeline!',
    lastMessageTime: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    unread: false,
    status: 'agent_active',
    messages: [
      {
        id: 'msg_a2_1',
        sender: 'customer',
        text: 'How long does express delivery take to New York?',
        timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg_a2_2',
        sender: 'agent',
        text: 'Express delivery to New York takes 1–2 business days with full tracking provided as soon as your order ships.',
        timestamp: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg_a2_3',
        sender: 'customer',
        text: 'Perfect, thank you for confirming the express shipping timeline!',
        timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'conv_human_3',
    agentId: 'agent_default',
    agentName: 'AI Concierge',
    userId: 'user_default',
    platform: 'messenger',
    customerName: 'Marcus Vance',
    customerHandle: 'Marcus Vance',
    lastMessageText: 'I have updated your invoice billing address and sent a revised copy to your email.',
    lastMessageTime: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
    unread: false,
    status: 'human_takeover',
    handoffReason: 'Billing invoice adjustment requested by customer.',
    messages: [
      {
        id: 'msg_m3_1',
        sender: 'customer',
        text: 'Hello, I need to change the VAT number on last month’s invoice.',
        timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg_m3_2',
        sender: 'human',
        text: 'I have updated your invoice billing address and sent a revised copy to your email.',
        timestamp: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'conv_resolved_4',
    agentId: 'agent_default',
    agentName: 'AI Concierge',
    userId: 'user_default',
    platform: 'whatsapp',
    customerName: 'Sophia Lin',
    customerHandle: '+1 (310) 555-0194',
    lastMessageText: 'Got it, see you tomorrow at 2:30 PM!',
    lastMessageTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    unread: false,
    status: 'resolved',
    messages: [
      {
        id: 'msg_r4_1',
        sender: 'customer',
        text: 'Can I confirm my consultation booking for tomorrow?',
        timestamp: new Date(Date.now() - 3.2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg_r4_2',
        sender: 'agent',
        text: 'Your consultation is confirmed for tomorrow at 2:30 PM. We look forward to speaking with you!',
        timestamp: new Date(Date.now() - 3.1 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg_r4_3',
        sender: 'customer',
        text: 'Got it, see you tomorrow at 2:30 PM!',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
];

export function renderConversationStatusBadge(status: ConversationStatus) {
  switch (status) {
    case 'human_needed':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 border border-orange-500/35 px-2 py-0.5 text-[10px] font-bold text-orange-700 dark:text-orange-300 shrink-0">
          <span className="size-1.5 rounded-full bg-orange-500 animate-pulse" />
          <span>Human Needed</span>
        </span>
      );
    case 'human_takeover':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 shrink-0">
          <span className="size-1.5 rounded-full bg-blue-500" />
          <span>Human Handling</span>
        </span>
      );
    case 'resolved':
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-500/10 border border-neutral-500/25 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 dark:text-neutral-300 shrink-0">
          <span className="size-1.5 rounded-full bg-neutral-400" />
          <span>Resolved</span>
        </span>
      );
    case 'agent_active':
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          <span>AI Handling</span>
        </span>
      );
  }
}

export const InboxPage: React.FC<InboxPageProps> = ({
  conversations,
  onNewConversation,
  onUpdateConversation,
}) => {
  // Frontend status/unread/reason overrides so status transitions work seamlessly
  const [statusOverrides, setStatusOverrides] = useState<
    Record<
      string,
      {
        status?: ConversationStatus;
        handoffReason?: string;
        unread?: boolean;
      }
    >
  >(() => {
    try {
      const raw = localStorage.getItem(FRONTEND_CONVERSATION_STATUS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [fallbackConversations, setFallbackConversations] = useState<Conversation[]>(
    INITIAL_FALLBACK_CONVERSATIONS
  );

  // Merge prop conversations (or fallback conversations if none exist yet) with frontend overrides
  const displayConversations = useMemo(() => {
    const baseList =
      conversations && conversations.length > 0 ? conversations : fallbackConversations;

    return baseList.map((conv) => {
      const override = statusOverrides[conv.id];
      if (!override) return conv;
      return {
        ...conv,
        status: override.status ?? conv.status,
        handoffReason:
          override.handoffReason !== undefined ? override.handoffReason : conv.handoffReason,
        unread: override.unread !== undefined ? override.unread : conv.unread,
      };
    });
  }, [conversations, fallbackConversations, statusOverrides]);

  const [activeFilter, setActiveFilter] = useState<InboxFilterType>('all');
  const [selectedConvId, setSelectedConvId] = useState<string>(
    displayConversations[0]?.id || ''
  );
  const [messageText, setMessageText] = useState('');
  const [sendAsRole, setSendAsRole] = useState<'customer' | 'human'>('customer');
  const [sending, setSending] = useState(false);

  // Live filter counts
  const unreadCount = useMemo(
    () => displayConversations.filter((c) => c.unread).length,
    [displayConversations]
  );
  const humanNeededCount = useMemo(
    () => displayConversations.filter((c) => c.status === 'human_needed').length,
    [displayConversations]
  );
  const humanHandlingCount = useMemo(
    () => displayConversations.filter((c) => c.status === 'human_takeover').length,
    [displayConversations]
  );

  // Filtered conversations list
  const filteredConversations = useMemo(() => {
    return displayConversations.filter((conv) => {
      if (activeFilter === 'unread') return conv.unread;
      if (activeFilter === 'human_needed') return conv.status === 'human_needed';
      if (activeFilter === 'human_handling') return conv.status === 'human_takeover';
      return true;
    });
  }, [displayConversations, activeFilter]);

  const activeConv =
    filteredConversations.find((c) => c.id === selectedConvId) ||
    displayConversations.find((c) => c.id === selectedConvId) ||
    filteredConversations[0] ||
    displayConversations[0];

  // Keep selectedConvId valid when switching filters
  useEffect(() => {
    if (
      filteredConversations.length > 0 &&
      !filteredConversations.some((c) => c.id === selectedConvId)
    ) {
      setSelectedConvId(filteredConversations[0].id);
    }
  }, [activeFilter, filteredConversations, selectedConvId]);

  const saveOverride = (
    convId: string,
    patch: { status?: ConversationStatus; handoffReason?: string; unread?: boolean }
  ) => {
    setStatusOverrides((prev) => {
      const next = {
        ...prev,
        [convId]: {
          ...(prev[convId] || {}),
          ...patch,
        },
      };
      try {
        localStorage.setItem(FRONTEND_CONVERSATION_STATUS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage error
      }
      return next;
    });
  };

  const applyConversationUpdate = (updated: Conversation) => {
    saveOverride(updated.id, {
      status: updated.status,
      handoffReason: updated.handoffReason,
      unread: updated.unread,
    });
    setFallbackConversations((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    onUpdateConversation(updated);
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConvId(conv.id);
    if (conv.unread) {
      applyConversationUpdate({ ...conv, unread: false });
    }
  };

  const handleStatusChange = async (
    nextStatus: ConversationStatus,
    reason?: string
  ) => {
    if (!activeConv) return;

    const nextHandoffReason =
      nextStatus === 'human_needed'
        ? reason ||
          activeConv.handoffReason ||
          'AI agent flagged this conversation for human review.'
        : activeConv.handoffReason;

    const optimisticConv: Conversation = {
      ...activeConv,
      status: nextStatus,
      handoffReason: nextHandoffReason,
      unread: false,
    };

    // Update frontend state immediately
    applyConversationUpdate(optimisticConv);

    if (nextStatus === 'human_takeover') {
      setSendAsRole('human');
    }

    try {
      const res = await apiFetch(`/api/conversations/${activeConv.id}/takeover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          handoffReason: nextHandoffReason,
          conversation: optimisticConv,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.conversation) {
          applyConversationUpdate({
            ...optimisticConv,
            ...data.conversation,
            status: nextStatus,
            handoffReason: nextHandoffReason,
          });
        }
      }
    } catch {
      // Frontend state is already updated
    }

    if (nextStatus === 'human_takeover') {
      toast.success('Conversation status updated to Human Handling. AI auto-replies are paused.');
    } else if (nextStatus === 'agent_active') {
      toast.success('Conversation returned to AI Handling. Automatic replies resumed.');
    } else if (nextStatus === 'human_needed') {
      toast.warning('Conversation flagged as Human Needed. AI auto-replies paused.');
    } else if (nextStatus === 'resolved') {
      toast.info('Conversation marked as Resolved.');
    }
  };

  const handleTakeoverSwitch = async (target: 'human' | 'agent') => {
    await handleStatusChange(target === 'human' ? 'human_takeover' : 'agent_active');
  };

  const handleMessageFeedback = async (
    messageId: string,
    rating: number,
    feedback: string,
    tags: string[] = []
  ): Promise<void> => {
    if (!activeConv) {
      throw new Error('No active conversation selected.');
    }

    const targetMsg = activeConv.messages.find((m) => m.id === messageId);

    const res = await apiFetch(`/api/conversations/${activeConv.id}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: activeConv.agentId || null,
        messageId,
        feedbackId: targetMsg?.feedbackId || null,
        rating,
        feedbackComment: feedback,
        tags,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data?.error || `Failed to save feedback (HTTP ${res.status}).`
      );
    }

    if (data?.conversation) {
      applyConversationUpdate(data.conversation);
      return;
    }

    const savedFb = data?.feedback;
    const updatedMessages = activeConv.messages.map((m) =>
      m.id === messageId
        ? {
            ...m,
            rating: savedFb?.rating ?? rating,
            feedback: savedFb?.comment ?? feedback,
            feedbackTags: Array.isArray(savedFb?.tags) ? savedFb.tags : tags,
            feedbackId: savedFb?.id ?? m.feedbackId,
            feedbackCreatedAt: savedFb?.created_at ?? new Date().toISOString(),
          }
        : m
    );

    applyConversationUpdate({
      ...activeConv,
      messages: updatedMessages,
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConv || sending) return;

    const content = messageText.trim();
    setMessageText('');
    setSending(true);

    const nowIso = new Date().toISOString();
    const newMsg = {
      id: `msg_${Date.now()}`,
      sender: sendAsRole,
      text: content,
      timestamp: nowIso,
    };

    // Only allow automatic AI replies when conversation is in 'agent_active' (AI Handling)
    const isAiHandling = activeConv.status === 'agent_active';

    try {
      const res = await apiFetch(`/api/conversations/${activeConv.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: sendAsRole,
          sender: sendAsRole,
          content,
          text: content,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.conversation) {
          applyConversationUpdate({
            ...data.conversation,
            status: activeConv.status,
            handoffReason: activeConv.handoffReason,
          });
          setSending(false);
          return;
        }
      }
    } catch {
      // Fallback to local message append for frontend-only conversations
    }

    const nextMessages = [...activeConv.messages, newMsg];
    let lastText = content;
    let lastTime = nowIso;

    if (sendAsRole === 'customer' && isAiHandling) {
      const aiReplyTime = new Date(Date.now() + 400).toISOString();
      const aiReplyText = `Thank you for reaching out, ${activeConv.customerName}! I have logged your message and am assisting you right away.`;
      nextMessages.push({
        id: `msg_${Date.now() + 1}`,
        sender: 'agent',
        text: aiReplyText,
        timestamp: aiReplyTime,
      });
      lastText = aiReplyText;
      lastTime = aiReplyTime;
    }

    applyConversationUpdate({
      ...activeConv,
      messages: nextMessages,
      lastMessageText: lastText,
      lastMessageTime: lastTime,
    });
    setSending(false);
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
          className="flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors cursor-pointer"
        >
          <Plus className="size-4" />
          <span>New test conversation</span>
        </button>
      </div>

      {/* Inbox Status Filters Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
            activeFilter === 'all'
              ? 'border-primary bg-primary text-primary-foreground shadow-2xs'
              : 'border-border bg-card text-foreground hover:bg-accent'
          }`}
        >
          <span>All</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
              activeFilter === 'all'
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {displayConversations.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('unread')}
          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
            activeFilter === 'unread'
              ? 'border-primary bg-primary text-primary-foreground shadow-2xs'
              : 'border-border bg-card text-foreground hover:bg-accent'
          }`}
        >
          <span>Unread</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
              activeFilter === 'unread'
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {unreadCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('human_needed')}
          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
            activeFilter === 'human_needed'
              ? 'border-orange-600 bg-orange-600 text-white shadow-2xs'
              : 'border-orange-500/35 bg-orange-500/10 text-orange-700 dark:text-orange-300 hover:bg-orange-500/20'
          }`}
        >
          <span
            className={`size-2 rounded-full ${
              activeFilter === 'human_needed' ? 'bg-white' : 'bg-orange-500'
            }`}
          />
          <span>Human Needed</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
              activeFilter === 'human_needed'
                ? 'bg-white/20 text-white'
                : 'bg-orange-500/20 text-orange-800 dark:text-orange-200'
            }`}
          >
            {humanNeededCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('human_handling')}
          className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
            activeFilter === 'human_handling'
              ? 'border-blue-600 bg-blue-600 text-white shadow-2xs'
              : 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20'
          }`}
        >
          <span
            className={`size-2 rounded-full ${
              activeFilter === 'human_handling' ? 'bg-white' : 'bg-blue-500'
            }`}
          />
          <span>Human Handling</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
              activeFilter === 'human_handling'
                ? 'bg-white/20 text-white'
                : 'bg-blue-500/20 text-blue-800 dark:text-blue-200'
            }`}
          >
            {humanHandlingCount}
          </span>
        </button>
      </div>

      {/* Master Detail Split */}
      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        {/* Left Column: Conversations List */}
        <div className="space-y-2.5">
          {filteredConversations.length === 0 ? (
            <div className="surface-card p-6 text-center text-sm text-muted-foreground">
              No conversations matching this filter.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = activeConv?.id === conv.id;
              const isHumanNeeded = conv.status === 'human_needed';

              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                    isHumanNeeded
                      ? isSelected
                        ? 'border-orange-500 bg-orange-500/10 ring-1 ring-orange-500 shadow-xs'
                        : 'border-orange-500/40 bg-orange-500/[0.06] dark:bg-orange-500/10 hover:border-orange-500/60'
                      : isSelected
                      ? 'surface-card border-primary ring-1 ring-primary'
                      : 'surface-card hover:border-border/80'
                  }`}
                >
                  {/* Top Row: Customer Name + Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {conv.unread && (
                        <span
                          className="size-2 rounded-full bg-primary shrink-0"
                          title="Unread conversation"
                        />
                      )}
                      <span className="font-semibold text-sm text-foreground truncate">
                        {conv.customerName}
                      </span>
                    </div>
                    {renderConversationStatusBadge(conv.status)}
                  </div>

                  {/* Second Row: Channel Icon + Handle + Timestamp */}
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ChannelIcon channel={conv.platform as PlatformType} size={14} />
                      <span className="text-xs text-muted-foreground truncate">
                        {conv.customerHandle}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      {new Date(conv.lastMessageTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Message Preview */}
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-1">
                    {conv.lastMessageText || 'No message yet'}
                  </p>

                  {/* Handoff Reason (when Human Needed & reason available) */}
                  {isHumanNeeded && conv.handoffReason && (
                    <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-2.5 py-1.5 text-[11px] text-orange-800 dark:text-orange-200">
                      <AlertTriangle className="size-3.5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-snug">
                        <strong className="font-semibold">Reason:</strong> {conv.handoffReason}
                      </span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Right Column: Active Conversation */}
        {activeConv ? (
          <div className="surface-card flex flex-col h-[640px] overflow-hidden">
            {/* Header */}
            <div className="border-b border-border bg-secondary/20 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <ChannelIcon channel={activeConv.platform as PlatformType} size={20} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-foreground">
                      {activeConv.customerName}
                    </h2>
                    {renderConversationStatusBadge(activeConv.status)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {activeConv.customerHandle} • {activeConv.platform}
                  </div>
                </div>
              </div>

              {/* Conversation Status Actions & Takeover Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {activeConv.platform === 'call' ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold select-none">
                    <PhoneCall className="size-3.5 text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
                    <span>Voice Call • Handled by AI Agent</span>
                  </div>
                ) : (
                  <>
                    {activeConv.status === 'agent_active' && (
                      <button
                        type="button"
                        onClick={() =>
                          handleStatusChange(
                            'human_needed',
                            'Customer inquiry flagged for human assistance.'
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 text-xs font-semibold text-orange-700 dark:text-orange-300 transition-colors cursor-pointer"
                      >
                        <AlertTriangle className="size-3.5" />
                        <span>Flag Human Needed</span>
                      </button>
                    )}

                    {activeConv.status !== 'resolved' ? (
                      <button
                        type="button"
                        onClick={() => handleStatusChange('resolved')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background hover:bg-accent px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="size-3.5" />
                        <span>Mark Resolved</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStatusChange('agent_active')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="size-3.5" />
                        <span>Return to AI Handling</span>
                      </button>
                    )}

                    <TakeoverSlider
                      status={activeConv.status}
                      onChange={handleTakeoverSwitch}
                    />
                  </>
                )}
              </div>
            </div>

            {/* PROMINENT BANNER FOR HUMAN NEEDED CONVERSATIONS */}
            {activeConv.platform !== 'call' && activeConv.status === 'human_needed' && (
              <div className="bg-orange-500/10 border-b border-orange-500/30 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 shrink-0 mt-0.5">
                    <AlertTriangle className="size-4.5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-orange-900 dark:text-orange-200">
                      Human assistance required
                    </div>
                    <p className="text-xs text-orange-800/90 dark:text-orange-300/90">
                      The AI has paused automatic replies in this conversation. Take over to respond to the customer.
                    </p>
                    {activeConv.handoffReason && (
                      <p className="text-[11px] font-medium text-orange-900/80 dark:text-orange-200/80 pt-0.5">
                        Reason: {activeConv.handoffReason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id="take-over-conversation-btn"
                    type="button"
                    onClick={() => handleStatusChange('human_takeover')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <UserCheck className="size-3.5" />
                    <span>Take Over Conversation</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('agent_active')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-orange-500/30 bg-background/80 hover:bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                  >
                    <Bot className="size-3.5 text-emerald-600" />
                    <span>Return to AI Handling</span>
                  </button>
                </div>
              </div>
            )}

            {/* BANNER FOR HUMAN HANDLING CONVERSATIONS */}
            {activeConv.platform !== 'call' && activeConv.status === 'human_takeover' && (
              <div className="bg-blue-500/10 border-b border-blue-500/25 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-200">
                  <ShieldAlert className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <span className="font-bold">Human Handling:</span>{' '}
                    <span>
                      You are handling this conversation. The AI agent will not automatically respond while you are active.
                    </span>
                  </div>
                </div>

                <button
                  id="return-to-ai-handling-btn"
                  type="button"
                  onClick={() => handleStatusChange('agent_active')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
                >
                  <Bot className="size-3.5" />
                  <span>Return to AI Handling</span>
                </button>
              </div>
            )}

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {activeConv.messages.map((m) => {
                const isCustomer = m.sender === 'customer';
                const isAgent = m.sender === 'agent';

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
                        feedbackTags={m.feedbackTags}
                        feedbackCreatedAt={m.feedbackCreatedAt}
                        onUpdateFeedback={handleMessageFeedback}
                        align="right"
                        className="max-w-[78%]"
                      >
                        <div className="rounded-2xl rounded-tr-none px-4 py-2.5 text-sm leading-relaxed bg-primary text-primary-foreground shadow-xs">
                          <div className="flex items-center gap-1.5 mb-1 text-[10px] opacity-75">
                            <span className="font-semibold">
                              {activeConv.agentName || 'AI Agent'}
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
                      </AgentResponseRating>
                    ) : (
                      <div
                        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isCustomer
                            ? 'bg-secondary text-foreground rounded-tl-none'
                            : 'bg-blue-600 text-white rounded-tr-none'
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
                          isAgent
                            ? 'bg-primary/20 text-primary'
                            : 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {isAgent ? (
                          <Bot className="size-3.5" />
                        ) : (
                          <UserIcon className="size-3.5" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {sending && sendAsRole === 'customer' && activeConv.status === 'agent_active' && (
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
                  <span>
                    Live voice call session • The AI Voice Agent handles the call in real time. Human takeover is unavailable during voice calls.
                  </span>
                </div>
                <span className="text-[11px] font-medium text-foreground/80 bg-background px-2 py-0.5 rounded-md border border-border shrink-0">
                  AI Voice Active
                </span>
              </div>
            ) : (
              <form
                onSubmit={handleSendMessage}
                className="border-t border-border p-3 bg-background"
              >
                <div className="flex items-center justify-between gap-2 mb-2 px-1">
                  <span className="text-[11px] text-muted-foreground">Send as:</span>
                  <div className="flex rounded-md border border-border p-0.5 bg-secondary/30">
                    <button
                      type="button"
                      onClick={() => setSendAsRole('customer')}
                      className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
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
                      className={`px-2 py-0.5 text-[11px] rounded transition-colors cursor-pointer ${
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
                        ? activeConv.status === 'agent_active'
                          ? 'Type customer message (agent will reply)...'
                          : 'Type customer message (AI replies paused for this conversation)...'
                        : 'Type human staff reply (agent remains silent)...'
                    }
                    className="flex-1 rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || !messageText.trim()}
                    className="size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-95 transition-opacity disabled:opacity-40 shrink-0 cursor-pointer"
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
