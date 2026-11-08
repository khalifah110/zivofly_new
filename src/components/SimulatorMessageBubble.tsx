import React from 'react';
import { Bot, AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { AgentResponseRating } from './AgentResponseRating';

export interface SimulatorMessage {
  id: string;
  dbMessageId?: string | null;
  clientMessageId?: string;
  sequence?: number;
  feedbackId?: string;
  role: 'customer' | 'agent';
  text: string;
  timestamp?: string;
  rating?: number; // 1 to 5
  feedback?: string;
  feedbackTags?: string[];
  feedbackCreatedAt?: string;
  isError?: boolean;
  errorStatus?: number | string;
  saveStatus?: 'saving' | 'saved' | 'failed';
  saveError?: string;
}

interface SimulatorMessageBubbleProps {
  message: SimulatorMessage;
  onUpdateFeedback: (
    messageId: string,
    rating: number,
    feedback: string,
    tags: string[]
  ) => Promise<void> | void;
  onRetrySaveMessage?: (message: SimulatorMessage) => Promise<void> | void;
}

function formatMessageTime(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const SimulatorMessageBubble: React.FC<SimulatorMessageBubbleProps> = ({
  message,
  onUpdateFeedback,
  onRetrySaveMessage,
}) => {
  const isAgent = message.role === 'agent';
  const formattedTime = formatMessageTime(message.timestamp);
  const isPersisted =
    message.saveStatus === 'saved' || Boolean(message.dbMessageId);

  if (!isAgent) {
    return (
      <div className="flex flex-col items-end animate-in fade-in slide-in-from-bottom-1 duration-150 gap-1">
        <div
          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs whitespace-pre-wrap ${
            message.saveStatus === 'failed'
              ? 'bg-destructive/90 text-white border border-destructive'
              : 'bg-primary text-primary-foreground'
          }`}
        >
          {message.text}
        </div>

        <div className="flex items-center gap-2 px-1 text-[10px] text-muted-foreground">
          {formattedTime && <span>{formattedTime}</span>}
          {message.saveStatus === 'saving' && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Loader2 className="size-2.5 animate-spin" />
              <span>Saving…</span>
            </span>
          )}
          {isPersisted && message.saveStatus !== 'saving' && (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="size-2.5" />
              <span>Saved</span>
            </span>
          )}
          {message.saveStatus === 'failed' && (
            <div className="flex items-center gap-1.5 text-destructive font-medium">
              <AlertCircle className="size-3 shrink-0" />
              <span>{message.saveError || 'Failed to save message'}</span>
              {onRetrySaveMessage && (
                <button
                  type="button"
                  onClick={() => onRetrySaveMessage(message)}
                  className="inline-flex items-center gap-1 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer"
                >
                  <RefreshCw className="size-2.5" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (message.isError) {
    return (
      <div className="flex justify-start animate-in fade-in slide-in-from-bottom-1 duration-150">
        <div className="max-w-[92%] sm:max-w-[85%] rounded-2xl rounded-tl-xs bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs space-y-1.5">
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-destructive/20">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-destructive">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>
                Edge Function Error
                {message.errorStatus !== undefined ? ` (Status: ${message.errorStatus})` : ''}
              </span>
            </div>
          </div>
          <div className="pt-0.5 whitespace-pre-wrap font-mono text-xs text-destructive">
            {message.text}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <AgentResponseRating
        messageId={message.id}
        messageText={message.text}
        rating={message.rating}
        feedback={message.feedback}
        feedbackTags={message.feedbackTags}
        feedbackCreatedAt={message.feedbackCreatedAt}
        onUpdateFeedback={onUpdateFeedback}
        align="left"
        className="max-w-[92%] sm:max-w-[85%]"
      >
        <div className="rounded-2xl rounded-tl-xs bg-card border border-border text-card-foreground px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs space-y-1.5 transition-all group-hover:border-border/80">
          <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-border/40">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              <Bot className="size-3.5" />
              <span>AI Agent</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {formattedTime && <span>{formattedTime}</span>}
              {message.saveStatus === 'saving' && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Loader2 className="size-2.5 animate-spin" />
                  <span>Saving…</span>
                </span>
              )}
              {isPersisted && message.saveStatus !== 'saving' && (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="size-2.5" />
                  <span>Saved</span>
                </span>
              )}
            </div>
          </div>

          <div className="pt-0.5 whitespace-pre-wrap text-foreground font-normal">
            {message.text}
          </div>
        </div>
      </AgentResponseRating>

      {message.saveStatus === 'failed' && (
        <div className="flex items-center gap-1.5 px-1 text-[10px] text-destructive font-medium">
          <AlertCircle className="size-3 shrink-0" />
          <span>{message.saveError || 'Failed to save agent response to Supabase'}</span>
          {onRetrySaveMessage && (
            <button
              type="button"
              onClick={() => onRetrySaveMessage(message)}
              className="inline-flex items-center gap-1 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="size-2.5" />
              <span>Retry Save</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
