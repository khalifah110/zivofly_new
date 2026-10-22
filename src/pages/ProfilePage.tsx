import React, { useState } from 'react';
import {
  User as UserIcon,
  Mail,
  Trash2,
  Shield,
  Save,
  CheckCircle2,
  AlertTriangle,
  Bot,
  LayoutGrid,
  Coins,
  LogOut,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { User, Agent, ChannelConnection } from '../types';
import { apiFetch } from '../lib/api';
import { DeleteAccountModal } from '../components/DeleteAccountModal';

interface ProfilePageProps {
  user: User | null;
  agents: Agent[];
  connections: ChannelConnection[];
  onUserUpdated: (updatedUser: User) => void;
  onAccountDeleted: () => void;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  agents,
  connections,
  onUserUpdated,
  onAccountDeleted,
  onNavigate,
  onSignOut,
}) => {
  // Form edit states
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  // Deletion modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync state if user prop changes
  React.useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Full name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiFetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updated = data.user || { ...user, name: name.trim() };
        onUserUpdated(updated);
        toast.success('Profile details saved successfully', {
          icon: <CheckCircle2 className="size-4 text-emerald-500" />,
        });
      } else {
        toast.error('Failed to update profile');
      }
    } catch {
      toast.error('An error occurred while saving your profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await apiFetch('/api/user/account', {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Your account and all associated data have been permanently deleted.');
        setIsDeleteModalOpen(false);
        onAccountDeleted();
      } else {
        toast.error('Failed to delete account. Please try again.');
      }
    } catch (err) {
      console.error('Delete account error:', err);
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // User initials for avatar
  const getInitials = (userName?: string, userEmail?: string) => {
    if (userName && userName.trim()) {
      const parts = userName.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (userEmail) return userEmail.slice(0, 2).toUpperCase();
    return 'ZI';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-display">
              Account Profile
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-mono">
              <Shield className="size-3 text-emerald-600 dark:text-emerald-400" />
              Active Workspace
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your personal profile, credentials, security, and account preferences.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-2xs cursor-pointer"
          >
            <LogOut className="size-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Profile Info & Workspace Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Profile Card & Edit Form (7 cols) */}
        <div className="lg:col-span-7 surface-card p-6 sm:p-7 space-y-6">
          {/* Avatar and Identity */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-5 border-b border-border">
            <div className="relative">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || 'User avatar'}
                  className="size-16 rounded-2xl object-cover border border-border shadow-md"
                />
              ) : (
                <div className="size-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold font-mono shadow-md">
                  {getInitials(user?.name, user?.email)}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 size-4 rounded-full bg-emerald-500 ring-2 ring-card" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">
                {user?.name || 'Zivofly User'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="size-3.5 text-muted-foreground shrink-0" />
                <span>{user?.email || 'user@example.com'}</span>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="profile-name" className="text-xs font-bold text-foreground">
                Full name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-2xs font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-email" className="text-xs font-bold text-foreground">
                Account Email
              </label>
              <div className="relative">
                <input
                  id="profile-email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-xs text-muted-foreground cursor-not-allowed shadow-2xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Verified
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Your primary login email address.
              </p>
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="size-3.5" />
                <span>{isSaving ? 'Saving changes…' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Workspace Quick Overview & Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Workspace Resources Summary Card */}
          <div className="surface-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground">
              Workspace Overview
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => onNavigate('/agents')}
                className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-1 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium">AI Agents</span>
                  <Bot className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {agents.length}
                </div>
                <span className="text-[10px] text-muted-foreground">Active Assistants</span>
              </div>

              <div
                onClick={() => onNavigate('/dashboard')}
                className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-1 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-medium">Channels</span>
                  <LayoutGrid className="size-4 text-primary" />
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {connections.length}
                </div>
                <span className="text-[10px] text-muted-foreground">Connected Lines</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <Coins className="size-4.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Prepaid Token Economy
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    1,000 Tokens = $1.00 USD
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('/billing')}
                className="rounded-lg bg-card border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors shadow-2xs cursor-pointer shrink-0"
              >
                Billing
              </button>
            </div>
          </div>

          {/* Security & Data Residency Card */}
          <div className="surface-card p-6 space-y-3.5 text-xs">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-muted-foreground">
              Security & Privacy
            </h3>

            <div className="space-y-2 text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Encrypted OAuth 2.0 authentication (Meta, Google, Microsoft)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Zero raw password storage on Zivofly servers</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>GDPR and Meta Platform Data Protection compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* DANGER ZONE: ACCOUNT DELETION                                */}
      {/* ============================================================ */}
      <div className="surface-card rounded-2xl border-2 border-destructive/40 bg-destructive/5 dark:bg-destructive/10 p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-destructive font-bold text-sm">
              <AlertTriangle className="size-4.5 text-destructive shrink-0" />
              <span>Danger Zone</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Permanently Delete Your Account
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Permanently delete your personal profile, all active AI agents, connected WhatsApp and telephony phone lines, customer conversation history, and remaining token balances. This action is irreversible.
            </p>
          </div>

          <button
            id="open-delete-account-modal-btn"
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-destructive hover:bg-destructive/90 active:scale-[0.98] text-destructive-foreground px-5 py-2.5 text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Trash2 className="size-4" />
            <span>Delete Account</span>
          </button>
        </div>

        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive space-y-1">
          <span className="font-bold">Please note before proceeding:</span>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            All trained prompt knowledge, custom cloned voices, document vectors, and external Google Sheets / CRM webhook integrations mapped to this account will be permanently unlinked and erased from Zivofly systems.
          </p>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        user={user}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDeleteAccount}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};
