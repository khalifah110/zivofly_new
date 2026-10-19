import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleSheetToolConfig } from '../types';

interface GoogleSheetToolSectionProps {
  value?: GoogleSheetToolConfig;
  onChange?: (config: GoogleSheetToolConfig) => void;
  compact?: boolean;
}

export const GoogleSheetToolSection: React.FC<GoogleSheetToolSectionProps> = ({
  value,
  onChange,
}) => {
  const handleConnect = () => {
    if (onChange) {
      onChange({
        ...(value || { columns: [], sheetName: 'Sheet1' }),
        enabled: true,
        status: 'connected',
        lastSyncedAt: new Date().toISOString(),
      });
    }
    toast.info('Google OAuth connect will be added soon.');
  };

  return (
    <div className="space-y-6">
      {/* Connect to Google sheets section */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
            <FileSpreadsheet className="size-6" />
          </div>
          <div>
            <span className="text-sm font-bold text-foreground">
              Connect to Google Sheets
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sync live product catalogues, pricing lists, or capture leads directly into your Google spreadsheets.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleConnect}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs shrink-0 cursor-pointer"
        >
          <FileSpreadsheet className="size-4" />
          <span>Connect to Google sheet</span>
        </button>
      </div>
    </div>
  );
};
