import React from 'react';
import { Bot } from 'lucide-react';
import { AgentResponseRating } from './AgentResponseRating';

export interface SimulatorMessage {
  id: string;
  role: 'customer' | 'agent';
  text: string;
  timestamp?: string;
  rating?: number; // 1 to 5
  feedback?: string;
  feedbackCreatedAt?: string;
}

interface SimulatorMessageBubbleProps {
  message: SimulatorMessage;
  onUpdateFeedback: (messageId: string, rating: number, feedback: string) => void;
}

export const SimulatorMessageBubble: React.FC<SimulatorMessageBubbleProps> = ({
  message,
  onUpdateFeedback,
}) => {
  const isAgent = message.role === 'agent';

  if (!isAgent) {
    return (
      <div className="flex justify-end animate-in fade-in slide-in-from-bottom-1 duration-150">
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs bg-primary text-primary-foreground px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <AgentResponseRating
      messageId={message.id}
      messageText={message.text}
      rating={message.rating}
      feedback={message.feedback}
      feedbackCreatedAt={message.feedbackCreatedAt}
      onUpdateFeedback={onUpdateFeedback}
      align="left"
      className="max-w-[92%] sm:max-w-[85%]"
    >
      <div className="rounded-2xl rounded-tl-xs bg-card border border-border text-card-foreground px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs space-y-1.5 transition-all group-hover:border-border/80">
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/40">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <Bot className="size-3.5" />
            <span>AI Agent</span>
          </div>
        </div>

        <div className="pt-0.5 whitespace-pre-wrap text-foreground font-normal">
          {message.text}
        </div>
      </div>
    </AgentResponseRating>
  );
};
