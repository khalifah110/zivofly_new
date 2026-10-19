import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CHANNELS } from '../lib/channels';
import { Agent, ChannelConnection } from '../types';
import { apiFetch } from '../lib/api';

interface ChannelSettingsPageProps {
  connectionId: string;
  connections: ChannelConnection[];
  agents: Agent[];
  onNavigate: (path: string) => void;
  onConnectionUpdated: (updated: ChannelConnection) => void;
}

export const ChannelSettingsPage: React.FC<ChannelSettingsPageProps> = ({
  connectionId,
  connections,
  agents,
  onNavigate,
  onConnectionUpdated,
}) => {
  const connection = connections.find((c) => c.id === connectionId);

  const [form, setForm] = useState({
    display_name: '',
    agent_id: '',
    reply_dms: true,
    reply_comments: true,
    reply_tags: true,
    comment_keywords: '',
    tag_accounts: '',
    always_on: true,
    active_from: '09:00',
    active_to: '18:00',
    active_days: [0, 1, 2, 3, 4, 5, 6],
    timezone: 'America/New_York',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (connection) {
      setForm({
        display_name: connection.display_name || '',
        agent_id: connection.agent_id || '',
        reply_dms: connection.reply_dms ?? true,
        reply_comments: connection.reply_comments ?? true,
        reply_tags: connection.reply_tags ?? true,
        comment_keywords: (connection.comment_keywords || []).join(', '),
        tag_accounts: (connection.tag_accounts || []).join(', '),
        always_on: connection.always_on ?? true,
        active_from: connection.active_from || '09:00',
        active_to: connection.active_to || '18:00',
        active_days: connection.active_days || [0, 1, 2, 3, 4, 5, 6],
        timezone: connection.timezone || 'America/New_York',
      });
    }
  }, [connection]);

  if (!connection) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <button
          onClick={() => onNavigate('/dashboard')}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All channels
        </button>
        <p className="text-sm text-muted-foreground">Connection not found.</p>
      </div>
    );
  }

  const channelMeta = CHANNELS[connection.channel] || CHANNELS.whatsapp;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        comment_keywords: form.comment_keywords
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        tag_accounts: form.tag_accounts
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const res = await apiFetch(`/api/connections/${connection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        onConnectionUpdated(data.data);
        toast.success('Settings saved');
      } else {
        toast.error('Failed to save settings');
      }
    } catch {
      toast.error('Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayIndex: number) => {
    setForm((prev) => {
      const active = prev.active_days || [];
      const exists = active.includes(dayIndex);
      const nextDays = exists
        ? active.filter((d) => d !== dayIndex)
        : [...active, dayIndex].sort();
      return { ...prev, active_days: nextDays };
    });
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        onClick={() => onNavigate('/dashboard')}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← All channels
      </button>

      {/* Page Title & Save Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-normal tracking-tight text-foreground">
            {channelMeta.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{connection.handle}</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {/* Account Label & Agent Selection */}
      <div className="surface-card space-y-5 p-6">
        <div className="space-y-1.5">
          <label htmlFor="display" className="text-xs font-medium text-foreground">
            Account label
          </label>
          <input
            id="display"
            type="text"
            value={form.display_name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, display_name: e.target.value }))
            }
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="agent" className="text-xs font-medium text-foreground">
            Agent answering here
          </label>
          <select
            id="agent"
            value={form.agent_id}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, agent_id: e.target.value }))
            }
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            <option value="">No agent</option>
            {agents.map((ag) => (
              <option key={ag.id} value={ag.id}>
                {ag.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* What it replies to (only for text/social channels like Instagram, Facebook, WhatsApp; phone calls exclusively receive voice calls) */}
      {connection.channel !== 'call' && (
        <div className="surface-card space-y-5 p-6">
          <h2 className="text-xl font-medium tracking-tight text-foreground">
            What it replies to
          </h2>

          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <div className="text-sm font-medium text-foreground">Direct messages</div>
              <div className="text-xs text-muted-foreground">
                Answer people who message you privately.
              </div>
            </div>
            <input
              type="checkbox"
              checked={form.reply_dms}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, reply_dms: e.target.checked }))
              }
              className="size-4 accent-primary"
            />
          </div>

          {channelMeta.supportsComments && (
            <>
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <div className="text-sm font-medium text-foreground">Comments</div>
                  <div className="text-xs text-muted-foreground">
                    Reply under your posts.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.reply_comments}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, reply_comments: e.target.checked }))
                  }
                  className="size-4 accent-primary"
                />
              </div>

              {form.reply_comments && (
                <div className="space-y-1.5 pt-1">
                  <label
                    htmlFor="keywords"
                    className="text-xs font-medium text-foreground"
                  >
                    Only comments containing (optional)
                  </label>
                  <input
                    id="keywords"
                    type="text"
                    placeholder="price, cost, book, location"
                    value={form.comment_keywords}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, comment_keywords: e.target.value }))
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              )}

              {connection.channel === 'instagram' && (
                <>
                  <div className="flex items-center justify-between border-b border-border pb-4">
                    <div>
                      <div className="text-sm font-medium text-foreground">Tags</div>
                      <div className="text-xs text-muted-foreground">
                        Respond when people tag your account.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.reply_tags}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, reply_tags: e.target.checked }))
                      }
                      className="size-4 accent-primary"
                    />
                  </div>

                  {form.reply_tags && (
                    <div className="space-y-1.5 pt-1">
                      <label
                        htmlFor="tagAccounts"
                        className="text-xs font-medium text-foreground"
                      >
                        Only from these accounts (optional)
                      </label>
                      <input
                        id="tagAccounts"
                        type="text"
                        placeholder="@vip_client, @partner_store"
                        value={form.tag_accounts}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, tag_accounts: e.target.value }))
                        }
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Working Hours */}
      <div className="surface-card space-y-5 p-6">
        <h2 className="text-xl font-medium tracking-tight text-foreground">
          Working hours
        </h2>

        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <div className="text-sm font-medium text-foreground">
              Always available (24/7)
            </div>
            <div className="text-xs text-muted-foreground">
              Agent answers any time of day or night.
            </div>
          </div>
          <input
            type="checkbox"
            checked={form.always_on}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, always_on: e.target.checked }))
            }
            className="size-4 accent-primary"
          />
        </div>

        {!form.always_on && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Active from</label>
                <input
                  type="time"
                  value={form.active_from}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, active_from: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Active to</label>
                <input
                  type="time"
                  value={form.active_to}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, active_to: e.target.value }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Active days</label>
              <div className="flex flex-wrap gap-2">
                {dayNames.map((name, idx) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        (form.active_days || []).includes(idx)
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
