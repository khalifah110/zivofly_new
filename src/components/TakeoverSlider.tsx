import React from 'react';
import { Bot, User as UserIcon } from 'lucide-react';

interface TakeoverSliderProps {
  status: 'agent_active' | 'human_takeover';
  onChange: (target: 'human' | 'agent') => void;
  disabled?: boolean;
}

export const TakeoverSlider: React.FC<TakeoverSliderProps> = ({
  status,
  onChange,
  disabled = false,
}) => {
  const isAgent = status === 'agent_active';
  const isHuman = status === 'human_takeover';

  const handleSelect = (target: 'human' | 'agent') => {
    if (disabled) return;
    if (target === 'agent' && !isAgent) {
      onChange('agent');
    } else if (target === 'human' && !isHuman) {
      onChange('human');
    }
  };

  const handleToggle = () => {
    if (disabled) return;
    onChange(isAgent ? 'human' : 'agent');
  };

  return (
    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mr-1">
        <span>Answering:</span>
      </div>

      {/* The Slide Bar */}
      <div
        role="group"
        aria-label="Conversation Answering Mode"
        className={`relative inline-flex items-center p-1 rounded-xl bg-muted/70 border border-border transition-all select-none shadow-inner ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
        }`}
        onClick={(e) => {
          // If clicked on padding or container, toggle
          if (e.target === e.currentTarget) {
            handleToggle();
          }
        }}
      >
        {/* Animated Sliding Background Indicator */}
        <div
          aria-hidden="true"
          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg transition-all duration-200 ease-out shadow-xs pointer-events-none ${
            isHuman
              ? 'left-1 bg-amber-500 text-white shadow-amber-500/20'
              : 'left-[calc(50%+2px)] bg-emerald-600 dark:bg-emerald-500 text-white shadow-emerald-600/20'
          }`}
        />

        {/* Human Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            handleSelect('human');
          }}
          className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-w-[76px] ${
            isHuman
              ? 'text-white'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Switch to Human Takeover"
        >
          <UserIcon className="size-3.5" />
          <span>Human</span>
        </button>

        {/* Agent Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            handleSelect('agent');
          }}
          className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-w-[76px] ${
            isAgent
              ? 'text-white'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Switch to AI Agent answering"
        >
          <Bot className="size-3.5" />
          <span>Agent</span>
          {isAgent && (
            <span className="size-1.5 rounded-full bg-white animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
};
