import React, { useState } from 'react';
import { LayoutGrid, Bot, Inbox, Coins, LogOut, Sun, Moon, Menu, X, User as UserIcon } from 'lucide-react';
import { User } from '../types';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  user: User | null;
  currentPath: string;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  currentPath,
  onNavigate,
  onSignOut,
}) => {
  const isAuthPage = currentPath === '/auth';
  const { theme, isDark, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isAuthPage) return null;

  const handleMobileNavClick = (path: string) => {
    setIsMobileMenuOpen(false);
    onNavigate(path);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6 sm:gap-8">
          <button
            onClick={() => onNavigate(user ? '/dashboard' : '/')}
            className="flex items-center gap-2 text-left focus:outline-none cursor-pointer"
          >
            <span className="font-display text-2xl font-normal tracking-tight text-foreground">
              Zivofly
            </span>
          </button>

          {user && (
            <nav className="hidden items-center gap-1 sm:flex">
              <button
                type="button"
                onClick={() => onNavigate('/dashboard')}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                  currentPath === '/dashboard' ||
                  currentPath.startsWith('/channels/') ||
                  currentPath.startsWith('/connect/')
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="size-4" />
                <span>Channels</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/agents')}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                  currentPath.startsWith('/agents')
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Bot className="size-4" />
                <span>Agents</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/inbox')}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                  currentPath === '/inbox'
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Inbox className="size-4" />
                <span>Inbox</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/billing')}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                  currentPath === '/billing' || currentPath === '/billing-tokens'
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Coins className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>Billing</span>
              </button>

              <button
                type="button"
                id="header-nav-profile-btn"
                onClick={() => onNavigate('/profile')}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                  currentPath === '/profile'
                    ? 'bg-accent text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserIcon className="size-4" />
                <span>Profile</span>
              </button>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle Button */}
          <button
            id="theme-toggle-btn"
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to high-contrast dark theme'}
            title={isDark ? 'Switch to light theme' : 'Switch to high-contrast dark theme'}
            className="relative flex items-center justify-center size-9 rounded-xl border border-border bg-card text-foreground hover:bg-accent hover:border-border/80 transition-all shadow-2xs group focus:outline-hidden focus:ring-2 focus:ring-primary/40 cursor-pointer"
          >
            {isDark ? (
              <Sun className="size-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
            ) : (
              <Moon className="size-4 text-muted-foreground group-hover:text-foreground group-hover:-rotate-12 transition-all duration-300" />
            )}
            <span className="sr-only">Toggle theme</span>
          </button>

          {user ? (
            <>
              {/* Desktop User Profile & Sign Out */}
              <div className="hidden sm:flex items-center gap-2">
                <button
                  type="button"
                  id="header-user-profile-btn"
                  onClick={() => onNavigate('/profile')}
                  className={`flex items-center gap-2 rounded-xl border border-border px-2.5 py-1 text-xs transition-colors shadow-2xs cursor-pointer ${
                    currentPath === '/profile'
                      ? 'bg-accent text-foreground border-border/80 font-semibold'
                      : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                  title="View profile & account settings"
                >
                  <div className="size-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold font-mono">
                    {user.name ? user.name.slice(0, 2).toUpperCase() : 'ME'}
                  </div>
                  <span className="max-w-[120px] truncate font-medium text-xs hidden md:inline">
                    {user.name || user.email}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={onSignOut}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="size-3.5" />
                  <span>Sign out</span>
                </button>
              </div>

              {/* Mobile Menu Toggle Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex sm:hidden items-center justify-center size-9 rounded-xl border border-border bg-card text-foreground hover:bg-accent transition-colors cursor-pointer"
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? (
                  <X className="size-4.5 text-foreground" />
                ) : (
                  <Menu className="size-4.5 text-foreground" />
                )}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => onNavigate('/auth')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 cursor-pointer"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/auth')}
                className="rounded-lg bg-primary px-3 sm:px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-95 transition-opacity cursor-pointer"
              >
                Get started
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Dropdown Menu (Top Drawer) */}
      {user && isMobileMenuOpen && (
        <div className="sm:hidden border-t border-border bg-background/98 backdrop-blur-xl px-4 py-3 space-y-1 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-1">
            Navigation
          </div>

          <button
            type="button"
            onClick={() => handleMobileNavClick('/dashboard')}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
              currentPath === '/dashboard' ||
              currentPath.startsWith('/channels/') ||
              currentPath.startsWith('/connect/')
                ? 'bg-primary/10 text-primary'
                : 'text-foreground hover:bg-accent'
            }`}
          >
            <LayoutGrid className="size-4.5 text-primary" />
            <span>Channels</span>
          </button>

          <button
            type="button"
            onClick={() => handleMobileNavClick('/agents')}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
              currentPath.startsWith('/agents')
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'text-foreground hover:bg-accent'
            }`}
          >
            <Bot className="size-4.5 text-emerald-600 dark:text-emerald-400" />
            <span>Agents</span>
          </button>

          <button
            type="button"
            onClick={() => handleMobileNavClick('/inbox')}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
              currentPath === '/inbox'
                ? 'bg-primary/10 text-primary'
                : 'text-foreground hover:bg-accent'
            }`}
          >
            <Inbox className="size-4.5 text-primary" />
            <span>Inbox</span>
          </button>

          <button
            type="button"
            onClick={() => handleMobileNavClick('/billing')}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
              currentPath === '/billing' || currentPath === '/billing-tokens'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-foreground hover:bg-accent'
            }`}
          >
            <Coins className="size-4.5 text-emerald-600 dark:text-emerald-400" />
            <span>Billing & Tokens</span>
          </button>

          <button
            type="button"
            id="mobile-nav-profile-btn"
            onClick={() => handleMobileNavClick('/profile')}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
              currentPath === '/profile'
                ? 'bg-primary/10 text-primary font-semibold'
                : 'text-foreground hover:bg-accent'
            }`}
          >
            <UserIcon className="size-4.5 text-primary" />
            <span>Profile & Account</span>
          </button>

          <div className="border-t border-border my-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onSignOut();
              }}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <LogOut className="size-4 text-destructive" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
