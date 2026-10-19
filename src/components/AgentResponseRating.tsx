import React, { useState } from 'react';
import { Star, MessageSquare, Check, Pencil, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export interface RatingOption {
  stars: number;
  label: string;
  emoji: string;
  color: string;
}

export const RATING_TIERS: RatingOption[] = [
  { stars: 1, label: 'Needs Improvement', emoji: '😞', color: 'text-rose-600 dark:text-rose-400' },
  { stars: 2, label: 'Fair Response', emoji: '😐', color: 'text-amber-600 dark:text-amber-400' },
  { stars: 3, label: 'Good Response', emoji: '🙂', color: 'text-yellow-600 dark:text-yellow-400' },
  { stars: 4, label: 'Great Answer', emoji: '😊', color: 'text-emerald-600 dark:text-emerald-400' },
  { stars: 5, label: 'Job well done, keep it up!', emoji: '🌟', color: 'text-amber-600 dark:text-amber-400' },
];

export const SUGGESTED_FEEDBACK = [
  '🌟 Job well done, keep it up!',
  '🎯 Accurate & helpful',
  '⚡ Fast and concise',
  '💬 Friendly, natural tone',
  '⚠️ Missing key details',
  '🔧 Misunderstood question',
  '🤖 Sounds too robotic',
];

export interface AgentResponseRatingProps {
  messageId: string;
  messageText: string;
  rating?: number;
  feedback?: string;
  feedbackCreatedAt?: string;
  onUpdateFeedback: (messageId: string, rating: number, feedback: string) => void;
  align?: 'left' | 'right';
  className?: string;
  children: React.ReactNode;
}

export const AgentResponseRating: React.FC<AgentResponseRatingProps> = ({
  messageId,
  messageText,
  rating,
  feedback,
  onUpdateFeedback,
  align = 'left',
  className = '',
  children,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Form states inside modal
  const [selectedRating, setSelectedRating] = useState<number>(rating || 5);
  const [hoveredModalStar, setHoveredModalStar] = useState<number | null>(null);
  const [commentText, setCommentText] = useState<string>(feedback || '');

  const activeRatingTier =
    RATING_TIERS.find(
      (r) => r.stars === (hoveredModalStar !== null ? hoveredModalStar : selectedRating)
    ) || RATING_TIERS[4];

  const handleQuickStarRate = (star: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const defaultPraise = star === 5 ? 'Job well done, keep it up!' : '';
    const updatedFeedback = feedback || defaultPraise;
    onUpdateFeedback(messageId, star, updatedFeedback);
    const tier = RATING_TIERS.find((t) => t.stars === star);
    toast.success(`${tier?.emoji || '⭐'} Rated message ${star}/5 stars: ${tier?.label || ''}`);
  };

  const handleOpenFeedback = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedRating(rating || 5);
    setCommentText(feedback || '');
    setHoveredModalStar(null);
    setIsFeedbackOpen(true);
  };

  const handleSaveModalFeedback = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedRating < 1) {
      toast.error('Please select at least 1 star');
      return;
    }

    const trimmedComment = commentText.trim();
    onUpdateFeedback(messageId, selectedRating, trimmedComment);
    setIsFeedbackOpen(false);

    if (selectedRating === 5) {
      toast.success('Message rating saved: Job well done, keep it up!');
    } else {
      toast.success(`Message feedback saved (${selectedRating}/5 stars)`);
    }
  };

  const handleToggleTag = (tag: string) => {
    if (commentText.includes(tag)) {
      const updated = commentText
        .replace(tag, '')
        .replace(/\n\s*\n/g, '\n')
        .trim();
      setCommentText(updated);
    } else {
      if (!commentText.trim()) {
        setCommentText(tag);
      } else {
        setCommentText(`${commentText.trim()} • ${tag}`);
      }
    }
  };

  return (
    <div
      className={`relative group flex flex-col ${align === 'right' ? 'items-end' : 'items-start'} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setHoveredStar(null);
      }}
    >
      {/* Agent message content with hover floating bar */}
      <div className="relative w-full">
        {children}

        {/* Hover Floating Action Bar (Desktop) - IDENTICAL TO TRY IT */}
        <div
          className={`absolute -top-3.5 right-2 hidden sm:flex items-center gap-1.5 bg-card text-card-foreground border border-border shadow-lg rounded-full px-2.5 py-1 z-20 transition-all duration-150 ${
            isHovered || isFeedbackOpen
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 translate-y-1 pointer-events-none'
          }`}
        >
          <span className="text-[10px] font-semibold text-muted-foreground mr-0.5">
            Rate:
          </span>

          {/* 5 Stars Bar */}
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => {
              const active =
                hoveredStar !== null
                  ? star <= hoveredStar
                  : star <= (rating || 0);
              return (
                <button
                  key={star}
                  type="button"
                  onClick={(e) => handleQuickStarRate(star, e)}
                  onMouseEnter={() => setHoveredStar(star)}
                  className="p-0.5 transition-transform hover:scale-125 cursor-pointer text-muted-foreground hover:text-amber-500"
                  title={`${star} Star${star > 1 ? 's' : ''}`}
                  aria-label={`Rate ${star} star`}
                >
                  <Star
                    className={`size-3.5 ${
                      active
                        ? 'fill-amber-400 text-amber-400 drop-shadow-2xs'
                        : 'text-muted-foreground/30 hover:text-amber-400'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          <div className="h-3 w-px bg-border mx-0.5" />

          {/* Open Feedback Modal */}
          <button
            type="button"
            onClick={handleOpenFeedback}
            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 rounded cursor-pointer"
            title="Rate & Leave instructions"
          >
            <MessageSquare className="size-3" />
            <span>Comments</span>
          </button>
        </div>
      </div>

      {/* Saved Rating & Comments Badges under the message - IDENTICAL TO TRY IT */}
      {(rating || feedback) ? (
        <div
          className={`flex flex-wrap items-center gap-1.5 mt-1 text-xs ${
            align === 'right' ? 'justify-end pr-1' : 'justify-start pl-1'
          }`}
        >
          {rating && (
            <button
              type="button"
              onClick={handleOpenFeedback}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
              title="Click to change rating"
            >
              <div className="flex items-center gap-0.5">
                {Array.from({ length: rating }).map((_, i) => (
                  <Star key={i} className="size-2.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span>{rating}/5</span>
            </button>
          )}

          {feedback && (
            <button
              type="button"
              onClick={handleOpenFeedback}
              className="inline-flex items-center gap-1.5 rounded-lg bg-muted border border-border px-2.5 py-0.5 text-[11px] text-foreground hover:bg-accent/80 transition-colors cursor-pointer text-left max-w-sm"
              title="Click to edit instructions"
            >
              <span className="font-medium truncate">{feedback}</span>
              <Pencil className="size-2.5 text-muted-foreground shrink-0" />
            </button>
          )}
        </div>
      ) : (
        /* Mobile or Touch trigger when unrated */
        <div
          className={`flex sm:hidden items-center gap-1.5 mt-1 ${
            align === 'right' ? 'justify-end pr-1' : 'justify-start pl-1'
          }`}
        >
          <button
            type="button"
            onClick={handleOpenFeedback}
            className="text-[11px] font-medium text-foreground hover:text-foreground flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted hover:bg-accent border border-border/80 cursor-pointer active:scale-95 transition-all"
          >
            <Star className="size-3 text-amber-500 fill-amber-500" />
            <span>Rate response</span>
          </button>
        </div>
      )}

      {/* RATING & FEEDBACK POPUP MODAL - IDENTICAL TO TRY IT */}
      {isFeedbackOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsFeedbackOpen(false)}
        >
          <div
            className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border bg-card text-card-foreground p-5 sm:p-6 shadow-2xl space-y-4 animate-in slide-in-from-bottom-3 sm:zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Rate Message Response
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Rate this specific agent reply and leave instructions or corrections.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsFeedbackOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Snippet of Agent Reply */}
            <div className="rounded-xl border border-border bg-muted/60 p-2.5 text-xs leading-relaxed">
              <span className="text-[11px] font-semibold text-foreground block mb-0.5">
                Agent's message:
              </span>
              <p className="line-clamp-3 text-foreground/80 italic text-[11px]">
                "{messageText}"
              </p>
            </div>

            {/* RESIZED COMPACT SCORE SECTION */}
            <div className="rounded-xl border border-border/80 bg-muted/30 px-3 py-2 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wide">
                    Score
                  </span>
                  <span className="rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-bold leading-none">
                    {selectedRating} / 5
                  </span>
                </div>
                <div className={`text-[11px] font-semibold flex items-center gap-1 ${activeRatingTier.color}`}>
                  <span>{activeRatingTier.emoji}</span>
                  <span>{activeRatingTier.label}</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 py-0.5">
                {RATING_TIERS.map((tier) => {
                  const isFilled =
                    (hoveredModalStar !== null ? hoveredModalStar : selectedRating) >=
                    tier.stars;
                  return (
                    <button
                      key={tier.stars}
                      type="button"
                      onClick={() => setSelectedRating(tier.stars)}
                      onMouseEnter={() => setHoveredModalStar(tier.stars)}
                      onMouseLeave={() => setHoveredModalStar(null)}
                      className="p-1 transition-transform hover:scale-115 active:scale-95 cursor-pointer focus:outline-hidden"
                      title={`${tier.stars} - ${tier.label}`}
                    >
                      <Star
                        className={`size-5 sm:size-5.5 transition-colors ${
                          isFilled
                            ? 'fill-amber-400 text-amber-400 drop-shadow-2xs'
                            : 'text-muted-foreground/30 hover:text-amber-400'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Feedback Tags */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Quick feedback tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_FEEDBACK.map((tag) => {
                  const isSelected = commentText.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                          : 'bg-muted/70 text-foreground/80 hover:text-foreground hover:bg-muted border border-border'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Instructions Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Instructions for this message
                </label>
                {commentText && (
                  <button
                    type="button"
                    onClick={() => setCommentText('')}
                    className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5 cursor-pointer"
                  >
                    <RotateCcw className="size-2.5" /> Clear
                  </button>
                )}
              </div>
              <textarea
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add instructions on how the agent should have answered this specific message..."
                className="w-full rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-2xs leading-relaxed p-2.5 text-xs"
              />
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setIsFeedbackOpen(false)}
                className="rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors px-3.5 py-2 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveModalFeedback()}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-opacity shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="size-3.5" />
                <span>Save Feedback</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
