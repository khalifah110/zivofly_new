import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { ChannelIcon } from '../components/ChannelIcon';

interface LandingPageProps {
  onNavigate: (path: string) => void;
  isAuthenticated: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, isAuthenticated }) => {
  const ctaPath = isAuthenticated ? '/dashboard' : '/auth';

  return (
    <div className="hero-glow min-h-[calc(100vh-4rem)]">
      <main className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        {/* Hero Section */}
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            AI agents for every conversation
          </p>

          <h1 className="mt-4 font-display text-5xl sm:text-6xl md:text-7xl font-normal leading-[1.08] tracking-tight text-foreground">
            Your customers write everywhere.
            <br />
            <em className="italic">One agent answers them all.</em>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            Connect WhatsApp, Instagram, Messenger or your phone line in a few clicks.
            Zivofly handles the technical side — you just describe what your agent should do.
          </p>

          <div className="mt-8 flex flex-col items-center">
            <button
              onClick={() => onNavigate(ctaPath)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-medium text-primary-foreground shadow-sm hover:opacity-95 transition-all active:scale-[0.98]"
            >
              <span>Connect your account</span>
              <ArrowRight className="size-4" />
            </button>
            <p className="mt-3 text-xs text-muted-foreground">
              No developer needed. No app settings to configure.
            </p>
          </div>
        </div>

        {/* 4 Channels Preview Grid */}
        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            onClick={() => onNavigate(isAuthenticated ? '/connect/whatsapp' : '/auth')}
            className="surface-card p-6 cursor-pointer hover:border-border/80 hover:shadow-md transition-all group"
          >
            <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
              <ChannelIcon channel="whatsapp" size={22} />
            </div>
            <h3 className="text-lg font-medium text-foreground">WhatsApp</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Answer chats on your business number.
            </p>
          </div>

          <div
            onClick={() => onNavigate(isAuthenticated ? '/connect/instagram' : '/auth')}
            className="surface-card p-6 cursor-pointer hover:border-border/80 hover:shadow-md transition-all group"
          >
            <div className="size-10 rounded-xl bg-rose-500/10 flex items-center justify-center mb-4">
              <ChannelIcon channel="instagram" size={22} />
            </div>
            <h3 className="text-lg font-medium text-foreground">Instagram</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Reply to DMs, comments and tags.
            </p>
          </div>

          <div
            onClick={() => onNavigate(isAuthenticated ? '/connect/messenger' : '/auth')}
            className="surface-card p-6 cursor-pointer hover:border-border/80 hover:shadow-md transition-all group"
          >
            <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
              <ChannelIcon channel="messenger" size={22} />
            </div>
            <h3 className="text-lg font-medium text-foreground">Messenger</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Handle Page messages automatically.
            </p>
          </div>

          <div
            onClick={() => onNavigate(isAuthenticated ? '/connect/call' : '/auth')}
            className="surface-card p-6 cursor-pointer hover:border-border/80 hover:shadow-md transition-all group"
          >
            <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
              <ChannelIcon channel="call" size={22} />
            </div>
            <h3 className="text-lg font-medium text-foreground">Calls</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              A voice agent that picks up the line.
            </p>
          </div>
        </div>

        {/* Set up in four steps Section */}
        <div className="surface-card mt-16 p-5 sm:p-8 md:p-12">
          <h2 className="font-display text-3xl sm:text-4xl font-normal text-foreground">
            Set up in four steps
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground text-sm sm:text-base leading-relaxed">
            Sign in with the account you already use, allow the agent to learn from your profile and documents, and go live. Everything else is handled for you.
          </p>

          <ul className="mt-8 space-y-3.5 sm:space-y-4 overflow-x-auto">
            <li className="flex items-center gap-2.5 sm:gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                <Check className="size-3.5" />
              </span>
              <span className="text-[11px] min-[390px]:text-xs sm:text-sm md:text-base text-foreground whitespace-nowrap">
                Connect your account securely — no passwords shared with us
              </span>
            </li>
            <li className="flex items-center gap-2.5 sm:gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                <Check className="size-3.5" />
              </span>
              <span className="text-[11px] min-[390px]:text-xs sm:text-sm md:text-base text-foreground whitespace-nowrap">
                Train the agent on your bio, past chats, posts and documents
              </span>
            </li>
            <li className="flex items-center gap-2.5 sm:gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                <Check className="size-3.5" />
              </span>
              <span className="text-[11px] min-[390px]:text-xs sm:text-sm md:text-base text-foreground whitespace-nowrap">
                Choose what it replies to: messages, comments, tags
              </span>
            </li>
            <li className="flex items-center gap-2.5 sm:gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                <Check className="size-3.5" />
              </span>
              <span className="text-[11px] min-[390px]:text-xs sm:text-sm md:text-base text-foreground whitespace-nowrap">
                Set the hours it works, and take over any chat yourself
              </span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
};
