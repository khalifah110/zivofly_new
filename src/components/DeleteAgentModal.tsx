import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface DeleteAgentModalProps {
  isOpen: boolean;
  agentName: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const DeleteAgentModal: React.FC<DeleteAgentModalProps> = ({
  isOpen,
  agentName,
  isDeleting = false,
  onConfirm,
  onClose,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');

  // Reset input when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
    }
  }, [isOpen]);

  // Close on Escape key
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

  const isMatch =
    confirmationInput.trim().toLowerCase() === agentName.trim().toLowerCase();

  return (
    <div
      id="delete-agent-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
    >
      <div
        id="delete-agent-modal"
        className="w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-agent-title"
        aria-describedby="delete-agent-desc"
      >
        {/* Header with Close */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <AlertTriangle className="size-6 text-destructive" />
            </div>
            <div>
              <h3 id="delete-agent-title" className="text-lg font-semibold text-foreground">
                Delete agent
              </h3>
              <p className="text-xs text-muted-foreground">
                Permanent deletion confirmation
              </p>
            </div>
          </div>
          <button
            id="close-delete-agent-modal-btn"
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-colors disabled:opacity-40"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content & Warning */}
        <div className="space-y-3">
          <p id="delete-agent-desc" className="text-sm text-foreground leading-relaxed">
            Are you sure you want to delete <span className="font-semibold text-foreground underline decoration-destructive/30 decoration-2 underline-offset-2">"{agentName}"</span>?
          </p>

          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
              <Trash2 className="size-3.5 shrink-0" />
              <span>This action is irreversible</span>
            </div>
            <p className="text-xs text-destructive/90 leading-relaxed pl-5.5">
              Once deleted, this agent, its custom instructions, knowledge documents, and connected Google Sheet tool will be permanently removed and cannot be recovered.
            </p>
          </div>

          {/* User Confirmation Input */}
          <div className="space-y-2 pt-2">
            <label
              htmlFor="confirm-agent-name-input"
              className="text-xs font-medium text-foreground block"
            >
              Please type <span className="font-semibold text-foreground select-all bg-muted px-1.5 py-0.5 rounded border border-border">"{agentName}"</span> to confirm:
            </label>
            <input
              id="confirm-agent-name-input"
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isMatch && !isDeleting) {
                  e.preventDefault();
                  onConfirm();
                }
              }}
              placeholder={`Type "${agentName}" to confirm`}
              autoFocus
              disabled={isDeleting}
              className="w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:border-destructive focus:ring-1 focus:ring-destructive/30 focus:outline-none placeholder:text-muted-foreground/50 transition-colors"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
          <button
            id="cancel-delete-agent-btn"
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-accent/70 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            id="confirm-delete-agent-btn"
            type="button"
            onClick={onConfirm}
            disabled={!isMatch || isDeleting}
            className="rounded-lg bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Deleting agent…</span>
              </>
            ) : (
              <>
                <Trash2 className="size-3.5" />
                <span>Delete agent</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
