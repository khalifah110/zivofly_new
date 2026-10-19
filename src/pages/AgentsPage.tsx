import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Bot, ArrowRight, Plus, MoreVertical, Trash2, Sparkles, Search, X, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Agent } from '../types';
import { apiFetch } from '../lib/api';
import { CreateAgentModal } from '../components/CreateAgentModal';
import { DeleteAgentModal } from '../components/DeleteAgentModal';

interface AgentsPageProps {
  agents: Agent[];
  onNavigate: (path: string) => void;
  onAgentCreated: (agent: Agent) => void;
  onAgentDeleted: (agentId: string) => void;
}

export const AgentsPage: React.FC<AgentsPageProps> = ({
  agents,
  onNavigate,
  onAgentCreated,
  onAgentDeleted,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Three-dot popover menu and deletion states
  const [openMenuAgentId, setOpenMenuAgentId] = useState<string | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newlyCreatedAgentId, setNewlyCreatedAgentId] = useState<string | null>(null);

  // Keyboard shortcut for search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.metaKey && e.key === 'k') || (e.ctrlKey && e.key === 'k')) && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close three-dot menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => {
      if (openMenuAgentId) {
        setOpenMenuAgentId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [openMenuAgentId]);

  // Filter agents by search query
  const filteredAgents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return agents;
    return agents.filter((agent) => {
      const matchName = (agent.name || '').toLowerCase().includes(query);
      const matchRole = (agent.roleAndDuties || '').toLowerCase().includes(query);
      const matchDesc = (agent.description || '').toLowerCase().includes(query);
      return matchName || matchRole || matchDesc;
    });
  }, [agents, searchQuery]);

  const handleConfirmDelete = async () => {
    if (!agentToDelete) return;

    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/agents/${agentToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        onAgentDeleted(agentToDelete.id);
        toast.success(`Agent "${agentToDelete.name}" deleted successfully`);
        setAgentToDelete(null);
      } else {
        toast.error('Failed to delete agent');
      }
    } catch {
      toast.error('Could not delete agent');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Your agents
            </h1>
            <span className="text-xs font-medium text-muted-foreground">
              ({agents.length} total)
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and monitor your autonomous AI customer assistance agents.
          </p>
        </div>

        {/* Distinct Green Create Agent Button */}
        <button
          type="button"
          onClick={() => onNavigate('/agents/new')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4.5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 transition-all shadow-sm hover:shadow shrink-0 cursor-pointer"
        >
          <Plus className="size-4.5 stroke-[2.5]" />
          <span>Create agent</span>
        </button>
      </div>

      {/* Search Bar (When agents exist) */}
      {agents.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents by name, role, duty…"
              className="w-full rounded-xl border border-border bg-card/60 pl-10 pr-16 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none shadow-2xs transition-colors"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted/80 rounded border border-border">
                  /
                </kbd>
              )}
            </div>
          </div>

          {searchQuery && (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>Showing</span>
              <span className="font-semibold text-foreground">{filteredAgents.length}</span>
              <span>of {agents.length} agents</span>
            </div>
          )}
        </div>
      )}

      {/* List / Grid of Agents */}
      <div className="space-y-4">
        {agents.length === 0 ? (
          /* Empty State: No agents configured */
          <div className="surface-card rounded-2xl border border-dashed border-border p-12 text-center space-y-4">
            <div className="size-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-1 ring-emerald-500/20">
              <Bot className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">No agents created yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Click the create agent button above to configure your first autonomous AI concierge.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/agents/new')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Create your first agent</span>
            </button>
          </div>
        ) : filteredAgents.length === 0 ? (
          /* Empty State: Search query has no matches */
          <div className="surface-card rounded-2xl border border-dashed border-border p-10 text-center space-y-3">
            <div className="size-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
              <Search className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">No agents found</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                No agents match <span className="font-semibold text-foreground">"{searchQuery}"</span>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors shadow-2xs cursor-pointer"
            >
              Clear search filter
            </button>
          </div>
        ) : (
          /* Grid of Matching Agents */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAgents.map((agent) => {
              const isNewlyCreated = newlyCreatedAgentId === agent.id;
              const isMenuOpen = openMenuAgentId === agent.id;

              return (
                <div
                  key={agent.id}
                  id={`agent-card-${agent.id}`}
                  onClick={() => onNavigate(`/agents/${agent.id}`)}
                  className={`surface-card relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl border border-border bg-card cursor-pointer hover:border-emerald-500/50 hover:shadow-md transition-all group ${
                    isNewlyCreated
                      ? 'ring-2 ring-emerald-500 ring-offset-2 bg-emerald-500/5'
                      : ''
                  }`}
                >
                  <div>
                    {/* Top Row: Icon + Status + Options */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 ring-1 ring-primary/20">
                        <Bot className="size-5.5" />
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status text with subtle pulsing dot */}
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <span
                            className={`size-2 rounded-full ${
                              agent.status === 'active'
                                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse'
                                : 'bg-amber-500'
                            }`}
                          />
                          <span className="text-[11px]">
                            {agent.status === 'active' ? 'Active' : 'Paused'}
                          </span>
                        </div>

                        {/* Three-dot options menu */}
                        <div className="relative">
                          <button
                            id={`agent-menu-btn-${agent.id}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuAgentId(isMenuOpen ? null : agent.id);
                            }}
                            className={`p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer ${
                              isMenuOpen ? 'bg-accent text-foreground' : ''
                            }`}
                            title="Agent options"
                            aria-label={`Options for ${agent.name}`}
                          >
                            <MoreVertical className="size-4" />
                          </button>

                          {/* Pop-up options menu */}
                          {isMenuOpen && (
                            <div
                              id={`agent-popover-menu-${agent.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-border bg-popover shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
                            >
                              <button
                                type="button"
                                id={`agent-delete-btn-${agent.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuAgentId(null);
                                  setAgentToDelete(agent);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
                              >
                                <Trash2 className="size-3.5 text-destructive shrink-0" />
                                <span>Delete agent</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {isNewlyCreated && (
                      <div className="mt-2.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <Sparkles className="size-3" /> Newly created
                        </span>
                      </div>
                    )}

                    <h3 className="mt-4 text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {agent.name}
                    </h3>
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {agent.roleAndDuties || agent.description}
                    </p>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="mt-6 flex items-center justify-between pt-3 border-t border-border/60 text-xs">
                    <span className="text-muted-foreground font-medium text-[11px]">
                      {agent.platforms?.length
                        ? `${agent.platforms.length} connected channel${agent.platforms.length > 1 ? 's' : ''}`
                        : 'Custom Agent'}
                    </span>
                    <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                      <span>Configure</span>
                      <ArrowRight className="size-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Prompt Modal */}
      {agentToDelete && (
        <DeleteAgentModal
          isOpen={Boolean(agentToDelete)}
          agentName={agentToDelete?.name || ''}
          isDeleting={isDeleting}
          onConfirm={handleConfirmDelete}
          onClose={() => {
            if (!isDeleting) setAgentToDelete(null);
          }}
        />
      )}

      {/* Creation Modal */}
      <CreateAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAgentCreated={(created) => {
          onAgentCreated(created);
          setNewlyCreatedAgentId(created.id);
          toast.success(`Agent "${created.name}" created!`);
          setTimeout(() => {
            setNewlyCreatedAgentId((prev) => (prev === created.id ? null : prev));
          }, 4000);
        }}
      />
    </div>
  );
};
