import React from 'react';
import { ArrowRight, Settings } from 'lucide-react';
import { ChannelIcon } from '../components/ChannelIcon';
import { CHANNELS } from '../lib/channels';
import { ChannelConnection } from '../types';

interface DashboardPageProps {
  connections: ChannelConnection[];
  onNavigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ connections, onNavigate }) => {
  return (
    <div className="space-y-12">
      {/* Top Header */}
      <div>
        <h1 className="text-4xl font-normal tracking-tight text-foreground">
          What would you like to automate?
        </h1>
        <p className="mt-2 text-muted-foreground">
          Choose a channel. We handle the connection, the training and the replies.
        </p>
      </div>

      {/* 4 Channel Selection Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.values(CHANNELS).map((channel) => (
          <button
            key={channel.key}
            onClick={() => onNavigate(`/connect/${channel.key}`)}
            className="surface-card flex flex-col justify-between p-6 text-left transition-all hover:border-border/80 hover:shadow-md group"
          >
            <div>
              <div className="size-11 rounded-xl bg-accent flex items-center justify-center mb-4">
                <ChannelIcon channel={channel.key} size={22} />
              </div>
              <h3 className="text-xl font-medium text-foreground">{channel.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {channel.tagline}
              </p>
            </div>

            <div className="mt-6 flex items-center gap-1.5 text-xs font-medium text-primary group-hover:translate-x-1 transition-transform">
              <span>Connect</span>
              <ArrowRight className="size-3.5" />
            </div>
          </button>
        ))}
      </div>

      {/* Connected Accounts Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-medium tracking-tight text-foreground">
            Connected accounts
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Accounts your agent is active on.
          </p>
        </div>

        {connections.length === 0 ? (
          <div className="surface-card p-8 text-center text-sm text-muted-foreground">
            Nothing connected yet. Pick a channel above to get started.
          </div>
        ) : (
          <div className="grid gap-3">
            {connections.map((conn) => {
              const channelMeta = CHANNELS[conn.channel];
              return (
                <div
                  key={conn.id}
                  className="surface-card flex flex-wrap items-center justify-between gap-4 p-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                      <ChannelIcon channel={conn.channel} size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {conn.display_name}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          connected
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{conn.handle}</span>
                        <span>•</span>
                        <span>
                          {conn.agents?.name
                            ? `Answering: ${conn.agents.name}`
                            : 'No agent assigned'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigate(`/channels/${conn.id}`)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                    >
                      <Settings className="size-3.5" />
                      <span>Settings</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
