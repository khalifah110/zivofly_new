import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, Loader2, ShieldAlert, Check } from 'lucide-react';
import { User } from '../types';

interface DeleteAccountModalProps {
  isOpen: boolean;
  user: User | null;
  isDeleting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  user,
  isDeleting = false,
  onConfirm,
  onClose,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  // Expected confirmation phrase: user email or 'delete my account'
  const expectedEmail = user?.email?.trim().toLowerCase() || 'delete';
  const confirmationPhrase = 'delete my account';

  const isConfirmed =
    (confirmationInput.trim().toLowerCase() === expectedEmail ||
      confirmationInput.trim().toLowerCase() === confirmationPhrase) &&
    hasAcknowledged;

  // Reset states on open/close
  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
      setHasAcknowledged(false);
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="delete-account-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
    >
      <div
        id="delete-account-modal"
        className="w-full max-w-lg rounded-2xl border border-destructive/30 bg-card shadow-2xl overflow-hidden p-6 sm:p-7 space-y-6 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-desc"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0 border border-destructive/20 shadow-2xs">
              <ShieldAlert className="size-6 text-destructive" />
            </div>
            <div>
              <h3 id="delete-account-title" className="text-xl font-bold tracking-tight text-foreground">
                Delete Zivofly Account
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Irreversible account and data termination
              </p>
            </div>
          </div>

          <button
            id="close-delete-account-modal-btn"
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* Warning Details */}
        <div className="space-y-3.5">
          <p id="delete-account-desc" className="text-sm text-foreground leading-relaxed">
            You are about to permanently delete your account for{' '}
            <strong className="font-semibold text-foreground underline decoration-destructive/40 decoration-2">
              {user?.email || 'your profile'}
            </strong>
            . This cannot be undone.
          </p>

          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-destructive">
              <Trash2 className="size-4 shrink-0" />
              <span>What will be immediately destroyed:</span>
            </div>
            <ul className="text-xs text-destructive/95 space-y-1.5 pl-5 list-disc leading-relaxed">
              <li>All configured AI Agents, prompts, and custom voice models</li>
              <li>All connected WhatsApp, Instagram, Messenger, and Telephony channels</li>
              <li>All uploaded Knowledge Base PDFs, document vector RAG embeddings, and sheets</li>
              <li>All customer conversation logs and chat histories</li>
              <li>All remaining prepaid token balances and billing preferences</li>
            </ul>
          </div>
        </div>

        {/* Confirmation Form */}
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label
              htmlFor="delete-confirm-input"
              className="text-xs font-medium text-foreground block"
            >
              To confirm, type <span className="font-mono font-bold text-destructive select-all">{user?.email || 'delete my account'}</span> below:
            </label>
            <input
              id="delete-confirm-input"
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              disabled={isDeleting}
              placeholder={`Type "${user?.email || 'delete my account'}" to confirm`}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-destructive/40 focus:border-destructive shadow-2xs font-mono"
              autoComplete="off"
            />
          </div>

          {/* Explicit acknowledgment checkbox */}
          <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              id="acknowledge-delete-checkbox"
              checked={hasAcknowledged}
              onChange={(e) => setHasAcknowledged(e.target.checked)}
              disabled={isDeleting}
              className="mt-0.5 size-4 rounded border-input text-destructive focus:ring-destructive/30 accent-destructive cursor-pointer"
            />
            <span className="leading-snug">
              I understand that this action is permanent and completely irreversible. All of my data will be permanently wiped.
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            id="cancel-delete-account-btn"
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            Cancel & Keep Account
          </button>

          <button
            id="confirm-delete-account-btn"
            type="button"
            onClick={onConfirm}
            disabled={!isConfirmed || isDeleting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-destructive px-5 py-2.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm shadow-destructive/20"
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Deleting account…</span>
              </>
            ) : (
              <>
                <Trash2 className="size-3.5" />
                <span>Permanently Delete Account</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
