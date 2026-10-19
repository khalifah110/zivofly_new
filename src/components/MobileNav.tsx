import React from 'react';
import { LayoutGrid, Bot, Inbox, Coins, User as UserIcon } from 'lucide-react';

interface MobileNavProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  conversationsCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentPath,
  onNavigate,
  conversationsCount = 0,
}) => {
  const isChannelsActive =
    currentPath === '/dashboard' ||
    currentPath.startsWith('/channels/') ||
    currentPath.startsWith('/connect/');

  const isAgentsActive = currentPath.startsWith('/agents');
  const isInboxActive = currentPath === '/inbox';
  const isBillingActive = currentPath === '/billing' || currentPath === '/billing-tokens';
  const isProfileActive = currentPath === '/profile';

  const navItems = [
    {
      id: 'channels',
      label: 'Channels',
      path: '/dashboard',
      icon: LayoutGrid,
      isActive: isChannelsActive,
    },
    {
      id: 'agents',
      label: 'Agents',
      path: '/agents',
      icon: Bot,
      isActive: isAgentsActive,
    },
    {
      id: 'inbox',
      label: 'Inbox',
      path: '/inbox',
      icon: Inbox,
      isActive: isInboxActive,
      badge: conversationsCount > 0 ? (conversationsCount > 9 ? '9+' : conversationsCount) : null,
    },
    {
      id: 'billing',
      label: 'Billing',
      path: '/billing',
      icon: Coins,
      isActive: isBillingActive,
    },
    {
      id: 'profile',
      label: 'Profile',
      path: '/profile',
      icon: UserIcon,
      isActive: isProfileActive,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 sm:hidden px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2"
    >
      <div className="mx-auto max-w-md rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl shadow-xl shadow-black/5 dark:shadow-black/40 px-2 py-1.5 transition-colors">
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.path)}
                className={`relative flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all cursor-pointer ${
                  item.isActive
                    ? 'bg-primary/10 text-primary font-semibold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`size-5 transition-transform duration-200 ${
                      item.isActive ? 'scale-110 stroke-[2.25]' : 'stroke-[1.75]'
                    }`}
                  />
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-2.5 flex min-w-4 h-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white shadow-2xs ring-1.5 ring-background">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] tracking-tight leading-none">
                  {item.label}
                </span>

                {item.isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
