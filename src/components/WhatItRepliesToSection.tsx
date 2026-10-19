import React from 'react';
import { PlatformType, WhatItRepliesToConfig } from '../types';
import { Instagram, Facebook } from 'lucide-react';

interface WhatItRepliesToSectionProps {
  value: WhatItRepliesToConfig;
  onChange: (value: WhatItRepliesToConfig) => void;
  platforms?: PlatformType[];
}

export const WhatItRepliesToSection: React.FC<WhatItRepliesToSectionProps> = ({
  value,
  onChange,
  platforms = [],
}) => {
  const safePlatforms = Array.isArray(platforms) ? platforms : [];
  const isInstagramActive = safePlatforms.includes('instagram');
  const isFacebookActive = safePlatforms.includes('messenger');

  // Appears if Instagram or Facebook is selected (even if WhatsApp or Call is also selected).
  // If neither Instagram nor Facebook is selected, this section does not appear.
  // The rules strictly apply to Instagram / Facebook, and WhatsApp / Calls are not shown here.
  const hasMetaChannel = isInstagramActive || isFacebookActive;

  if (!hasMetaChannel) {
    return null;
  }

  const update = (patch: Partial<WhatItRepliesToConfig>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div
      id="what-it-replies-to-section"
      className="surface-card rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-6 transition-all"
    >
      {/* Header and Platform Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h2 className="font-serif text-2xl font-normal text-foreground tracking-tight">
            What it replies to
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define automated response behavior across comments, DMs, and tags.
          </p>
        </div>

        {/* Connected Channel Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium text-muted-foreground mr-1">
            Applies to:
          </span>

          {isInstagramActive && (
            <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border border-[#0f4c3a] bg-[#0f4c3a]/10 text-[#0f4c3a]">
              <Instagram className="size-3" />
              <span>Instagram</span>
            </span>
          )}

          {isFacebookActive && (
            <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border border-[#0f4c3a] bg-[#0f4c3a]/10 text-[#0f4c3a]">
              <Facebook className="size-3" />
              <span>Facebook</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Reply Behavior Controls */}
      <div className="space-y-5">
        {/* 1. Direct messages */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-sm font-medium text-foreground">Direct messages</div>
            <div className="text-xs text-muted-foreground">
              Answer people who message you privately.
            </div>
          </div>
          <button
            id="toggle-reply-dms"
            type="button"
            role="switch"
            aria-checked={value.replyDMs}
            onClick={() => update({ replyDMs: !value.replyDMs })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              value.replyDMs ? 'bg-[#0f4c3a]' : 'bg-neutral-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                value.replyDMs ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 2. Comments */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-foreground">Comments</div>
              <div className="text-xs text-muted-foreground">Reply under your posts.</div>
            </div>
            <button
              id="toggle-reply-comments"
              type="button"
              role="switch"
              aria-checked={value.replyComments}
              onClick={() => update({ replyComments: !value.replyComments })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                value.replyComments ? 'bg-[#0f4c3a]' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  value.replyComments ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Subfield: Only comments containing (optional) */}
          <div className="space-y-1.5 pt-0.5">
            <label
              htmlFor="comment-keywords-input"
              className="text-xs font-medium text-foreground"
            >
              Only comments containing (optional)
            </label>
            <input
              id="comment-keywords-input"
              type="text"
              disabled={!value.replyComments}
              value={value.commentKeywords}
              onChange={(e) => update({ commentKeywords: e.target.value })}
              placeholder="price, delivery, how much"
              className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>
        </div>

        {/* 3. Tags and mentions */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-foreground">Tags and mentions</div>
              <div className="text-xs text-muted-foreground">Respond when someone tags you.</div>
            </div>
            <button
              id="toggle-reply-tags"
              type="button"
              role="switch"
              aria-checked={value.replyTags}
              onClick={() => update({ replyTags: !value.replyTags })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                value.replyTags ? 'bg-[#0f4c3a]' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  value.replyTags ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Subfield: Only these accounts (optional) */}
          <div className="space-y-1.5 pt-0.5">
            <label
              htmlFor="tag-accounts-input"
              className="text-xs font-medium text-foreground"
            >
              Only these accounts (optional)
            </label>
            <input
              id="tag-accounts-input"
              type="text"
              disabled={!value.replyTags}
              value={value.tagAllowedAccounts}
              onChange={(e) => update({ tagAllowedAccounts: e.target.value })}
              placeholder="@partner, @reseller"
              className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
