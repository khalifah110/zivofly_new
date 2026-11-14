import React from 'react';
import {
  UserCheck,
  Clock,
  MessageSquareText,
  RotateCcw,
  Bot,
} from 'lucide-react';
import { HumanHandoffConfig, HumanHandoffWaitingTime } from '../types';

export const DEFAULT_HOLDING_MESSAGE =
  'Thank you for your patience. Your question has been forwarded to our team, and a member of our team will assist you shortly.';

export const DEFAULT_HUMAN_HANDOFF_CONFIG: HumanHandoffConfig = {
  enabled: true,
  waitingTime: '30m',
  holdingMessage: DEFAULT_HOLDING_MESSAGE,
};

interface WaitingTimeOption {
  value: HumanHandoffWaitingTime;
  label: string;
}

export const WAITING_TIME_OPTIONS: WaitingTimeOption[] = [
  { value: '5m', label: '5 minutes' },
  { value: '10m', label: '10 minutes' },
  { value: '15m', label: '15 minutes' },
  { value: '30m', label: '30 minutes' },
  { value: '1h', label: '1 hour' },
  { value: '2h', label: '2 hours' },
  { value: 'never', label: 'Never' },
];

interface HumanHandoffSectionProps {
  value: HumanHandoffConfig;
  onChange: (value: HumanHandoffConfig) => void;
  agentName?: string;
}

export const HumanHandoffSection: React.FC<HumanHandoffSectionProps> = ({
  value,
  onChange,
  agentName,
}) => {
  const safeValue: HumanHandoffConfig = {
    enabled: value?.enabled ?? DEFAULT_HUMAN_HANDOFF_CONFIG.enabled,
    waitingTime: value?.waitingTime || DEFAULT_HUMAN_HANDOFF_CONFIG.waitingTime,
    holdingMessage:
      value?.holdingMessage !== undefined
        ? value.holdingMessage
        : DEFAULT_HUMAN_HANDOFF_CONFIG.holdingMessage,
  };

  const update = (patch: Partial<HumanHandoffConfig>) => {
    onChange({
      ...safeValue,
      ...patch,
    });
  };

  const selectedWaitingTimeLabel =
    WAITING_TIME_OPTIONS.find((opt) => opt.value === safeValue.waitingTime)?.label ||
    '30 minutes';

  const isNeverSelected = safeValue.waitingTime === 'never';

  return (
    <div
      id="human-handoff-section"
      className="surface-card rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6 transition-all"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
            <UserCheck className="size-4" />
          </div>
          <h2 className="text-base font-bold text-foreground tracking-tight">
            Human Handoff
          </h2>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
              safeValue.enabled
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-muted text-muted-foreground border-border'
            }`}
          >
            {safeValue.enabled ? 'Enabled' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* A. Enable Human Handoff */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/60 p-4">
        <div className="space-y-0.5">
          <div className="text-sm font-semibold text-foreground">
            Enable Human Handoff
          </div>
          <p className="text-xs text-muted-foreground">
            {safeValue.enabled
              ? 'The agent can flag conversations that require human assistance while continuing to handle other conversations normally.'
              : 'The handoff feature is currently inactive.'}
          </p>
        </div>

        <button
          id="toggle-human-handoff"
          type="button"
          role="switch"
          aria-checked={safeValue.enabled}
          onClick={() => update({ enabled: !safeValue.enabled })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            safeValue.enabled ? 'bg-primary' : 'bg-neutral-300 dark:bg-neutral-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              safeValue.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Configuration Controls */}
      <div
        className={`space-y-6 transition-opacity ${
          safeValue.enabled ? 'opacity-100' : 'opacity-60'
        }`}
      >
        {/* B. Customer Waiting Time */}
        <div className="space-y-3">
          <div>
            <label
              htmlFor="handoff-waiting-time"
              className="flex items-center gap-1.5 text-xs font-bold text-foreground"
            >
              <Clock className="size-3.5 text-muted-foreground" />
              <span>Customer Waiting Time</span>
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {WAITING_TIME_OPTIONS.map((option) => {
              const isSelected = safeValue.waitingTime === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={!safeValue.enabled}
                  onClick={() => update({ waitingTime: option.value })}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all cursor-pointer disabled:cursor-not-allowed ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground shadow-2xs'
                      : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-accent/50'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-muted-foreground">
            {isNeverSelected
              ? 'Never is selected: Zivofly will not automatically send a holding message.'
              : `Selected waiting time: ${selectedWaitingTimeLabel}. If a human responds before ${selectedWaitingTimeLabel} expires, no holding message will be sent.`}
          </p>
        </div>

        {/* C. Custom Holding Message & Preview */}
        <div className="space-y-4 pt-2 border-t border-border/60">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="handoff-holding-message"
                className="flex items-center gap-1.5 text-xs font-bold text-foreground"
              >
                <MessageSquareText className="size-3.5 text-muted-foreground" />
                <span>Holding Message</span>
              </label>

              {safeValue.holdingMessage !== DEFAULT_HOLDING_MESSAGE && (
                <button
                  type="button"
                  disabled={!safeValue.enabled}
                  onClick={() => update({ holdingMessage: DEFAULT_HOLDING_MESSAGE })}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <RotateCcw className="size-3" />
                  <span>Reset to default</span>
                </button>
              )}
            </div>

            <textarea
              id="handoff-holding-message"
              rows={3}
              disabled={!safeValue.enabled}
              value={safeValue.holdingMessage}
              onChange={(e) => update({ holdingMessage: e.target.value })}
              placeholder={DEFAULT_HOLDING_MESSAGE}
              className="w-full rounded-xl border border-border bg-background p-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-2xs leading-relaxed disabled:cursor-not-allowed"
            />
          </div>

          {/* Message Preview */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Message Preview
              </span>
              <span className="text-[11px] text-muted-foreground">
                {!safeValue.enabled
                  ? 'Handoff disabled'
                  : isNeverSelected
                  ? 'Automatic holding message disabled (Never)'
                  : `Sent automatically if no team response within ${selectedWaitingTimeLabel}`}
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0 mt-0.5">
                <Bot className="size-3.5" />
              </div>
              <div className="rounded-2xl rounded-tl-xs border border-border bg-card px-3.5 py-2.5 text-xs text-foreground shadow-2xs leading-relaxed max-w-xl">
                <div className="text-[10px] font-semibold text-muted-foreground mb-1">
                  {agentName?.trim() || 'AI Agent'} · Holding Message
                </div>
                <p className="whitespace-pre-wrap">
                  {safeValue.holdingMessage.trim() || DEFAULT_HOLDING_MESSAGE}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
