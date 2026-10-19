import React from 'react';
import { AlertTriangle, PowerOff, X, ShieldAlert } from 'lucide-react';

interface ManualPauseWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  agentName: string;
}

export const ManualPauseWarningModal: React.FC<ManualPauseWarningModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  agentName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-background rounded-2xl max-w-md w-full shadow-2xl border border-border overflow-hidden text-foreground">
        <div className="p-6 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto text-amber-500 border border-amber-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <div className="text-center space-y-1.5">
            <h3 className="text-base font-bold text-foreground">
              Manually Pause {agentName}?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Notice:</strong> If you switch off the agent manually, it will remain paused and{' '}
              <span className="text-amber-500 font-semibold">can only be turned on manually</span>. All current and future customer chats will be held and queued for manual human response.
            </p>
          </div>

          <div className="bg-card p-3.5 rounded-xl border border-border text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Automatic Sync on Resume:</span>
            </div>
            <p className="text-[11px] leading-normal text-muted-foreground">
              When you manually turn the agent back on, Zivofly will automatically review and update its knowledge with all chats and inquiries that took place while the agent was off, catching up seamlessly.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent border border-border rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:text-neutral-950 dark:hover:bg-amber-400 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <PowerOff className="w-3.5 h-3.5" />
              <span>Confirm & Pause Agent</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
