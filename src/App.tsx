import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ConnectChannelPage } from './pages/ConnectChannelPage';
import { ChannelSettingsPage } from './pages/ChannelSettingsPage';
import { AgentsPage } from './pages/AgentsPage';
import { AgentDetailPage } from './pages/AgentDetailPage';
import { InboxPage } from './pages/InboxPage';
import { BillingPage } from './pages/BillingPage';
import { ProfilePage } from './pages/ProfilePage';
import { Agent, ChannelConnection, Conversation, User } from './types';
import { apiFetch } from './lib/api';
import { supabase } from './lib/supabaseClient';
import { ThemeProvider, useTheme } from './context/ThemeContext';

function AppContent() {
  const { theme } = useTheme();
  const [currentPath, setCurrentPath] = useState<string>(
    window.location.pathname || '/'
  );
  const [user, setUser] = useState<User | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [connections, setConnections] = useState<ChannelConnection[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync with browser navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Initial data loading
  const loadData = async () => {
    setIsLoading(true);
    try {
      // First verify Supabase session directly
      if (supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.user) {
          setUser(null);
          setAgents([]);
          setConnections([]);
          setConversations([]);
          localStorage.removeItem('zivofly_agents');
          localStorage.removeItem('zivofly_connections');
          localStorage.removeItem('zivofly_conversations');
          setIsLoading(false);
          return;
        }
      }

      const [userRes, agentsRes, connRes, convsRes] = await Promise.all([
        apiFetch('/api/user/profile'),
        apiFetch('/api/agents'),
        apiFetch('/api/connections'),
        apiFetch('/api/conversations'),
      ]);

      if (userRes.ok) {
        const ct = userRes.headers.get('content-type');
        if (ct?.includes('application/json')) {
          const uData = await userRes.json();
          if (uData.user) setUser(uData.user);
          else setUser(null);
        }
      }

      if (agentsRes.ok) {
        const ct = agentsRes.headers.get('content-type');
        if (ct?.includes('application/json')) {
          const aData = await agentsRes.json();
          setAgents(Array.isArray(aData.agents) ? aData.agents : []);
        }
      }

      if (connRes.ok) {
        const ct = connRes.headers.get('content-type');
        if (ct?.includes('application/json')) {
          const cData = await connRes.json();
          const list = Array.isArray(cData.data)
            ? cData.data
            : Array.isArray(cData.connections)
            ? cData.connections
            : [];
          setConnections(list);
        }
      }

      if (convsRes.ok) {
        const ct = convsRes.headers.get('content-type');
        if (ct?.includes('application/json')) {
          const cvData = await convsRes.json();
          setConversations(Array.isArray(cvData.conversations) ? cvData.conversations : []);
        }
      }
    } catch (err) {
      console.error('Failed to load initial data', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          localStorage.removeItem('zivofly_agents');
          localStorage.removeItem('zivofly_connections');
          localStorage.removeItem('zivofly_conversations');
          loadData();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setAgents([]);
          setConnections([]);
          setConversations([]);
          localStorage.removeItem('zivofly_agents');
          localStorage.removeItem('zivofly_connections');
          localStorage.removeItem('zivofly_conversations');
        }
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, []);

  // Handlers for state updates
  const handleSignOut = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    localStorage.removeItem('zivofly_token');
    localStorage.removeItem('zivofly_supabase_auth_token');
    setUser(null);
    toast.success('Signed out');
    navigate('/');
  };

  const handleAccountDeleted = () => {
    localStorage.removeItem('zivofly_token');
    localStorage.removeItem('zivofly_user');
    localStorage.removeItem('zivofly_agents');
    localStorage.removeItem('zivofly_connections');
    localStorage.removeItem('zivofly_conversations');
    setUser(null);
    setAgents([]);
    setConnections([]);
    setConversations([]);
    navigate('/');
  };

  const handleConnectionCreated = (newConn: ChannelConnection) => {
    setConnections((prev) => [newConn, ...prev.filter((c) => c.id !== newConn.id)]);
  };

  const handleConnectionUpdated = (updated: ChannelConnection) => {
    setConnections((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  const handleAgentCreated = (newAgent: Agent) => {
    setAgents((prev) => [newAgent, ...prev.filter((a) => a.id !== newAgent.id)]);
  };

  const handleAgentUpdated = (updated: Agent) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
  };

  const handleAgentDeleted = (deletedId: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== deletedId));
    setConnections((prev) =>
      prev.map((c) =>
        c.agent_id === deletedId
          ? { ...c, agent_id: null, agents: undefined }
          : c
      )
    );
  };

  const handleNewConversation = async () => {
    try {
      const res = await apiFetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: `Customer #${Math.floor(1000 + Math.random() * 9000)}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setConversations((prev) => [data.conversation || data.data, ...prev]);
        toast.success('New test conversation created');
      }
    } catch {
      toast.error('Failed to create test conversation');
    }
  };

  const handleUpdateConversation = (updated: Conversation) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  // Route matching
  const renderCurrentView = () => {
    if (currentPath === '/auth') {
      return (
        <AuthPage
          onSignInSuccess={(u) => {
            setUser(u);
            loadData();
          }}
          onNavigate={navigate}
        />
      );
    }

    if (currentPath === '/' && !user) {
      return <LandingPage onNavigate={navigate} isAuthenticated={false} />;
    }

    if (currentPath === '/' && user) {
      return <LandingPage onNavigate={navigate} isAuthenticated={true} />;
    }

    if (currentPath === '/dashboard') {
      return (
        <DashboardPage
          connections={connections}
          onNavigate={navigate}
        />
      );
    }

    if (currentPath.startsWith('/connect/')) {
      const channelKey = currentPath.split('/')[2] || 'whatsapp';
      return (
        <ConnectChannelPage
          channelKey={channelKey}
          agents={agents}
          onNavigate={navigate}
          onConnectionCreated={handleConnectionCreated}
          onAgentCreated={handleAgentCreated}
        />
      );
    }

    if (currentPath.startsWith('/channels/')) {
      const connectionId = currentPath.split('/')[2] || '';
      return (
        <ChannelSettingsPage
          connectionId={connectionId}
          connections={connections}
          agents={agents}
          onNavigate={navigate}
          onConnectionUpdated={handleConnectionUpdated}
        />
      );
    }

    if (currentPath === '/agents') {
      return (
        <AgentsPage
          agents={agents}
          onNavigate={navigate}
          onAgentCreated={handleAgentCreated}
          onAgentDeleted={handleAgentDeleted}
        />
      );
    }

    if (currentPath.startsWith('/agents/')) {
      const agentId = currentPath.split('/')[2] || '';
      return (
        <AgentDetailPage
          agentId={agentId}
          agents={agents}
          connections={connections}
          onNavigate={navigate}
          onAgentCreated={handleAgentCreated}
          onAgentUpdated={handleAgentUpdated}
          onAgentDeleted={handleAgentDeleted}
        />
      );
    }

    if (currentPath === '/inbox') {
      return (
        <InboxPage
          conversations={conversations}
          onNewConversation={handleNewConversation}
          onUpdateConversation={handleUpdateConversation}
        />
      );
    }

    if (currentPath === '/billing' || currentPath === '/billing-tokens') {
      return <BillingPage />;
    }

    if (currentPath === '/profile') {
      return (
        <ProfilePage
          user={user}
          agents={agents}
          connections={connections}
          onUserUpdated={(updated) => setUser(updated)}
          onAccountDeleted={handleAccountDeleted}
          onNavigate={navigate}
          onSignOut={handleSignOut}
        />
      );
    }

    // Default fallback to dashboard if signed in, or landing if not
    return user ? (
      <DashboardPage
        connections={connections}
        onNavigate={navigate}
      />
    ) : (
      <LandingPage onNavigate={navigate} isAuthenticated={false} />
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased font-sans selection:bg-primary/20 selection:text-primary transition-colors">
      <Toaster position="top-right" richColors theme={theme as 'light' | 'dark'} />

      {/* Header */}
      <Header
        user={user}
        currentPath={currentPath}
        onNavigate={navigate}
        onSignOut={handleSignOut}
      />

      {/* Main View Container */}
      <main
        className={
          currentPath === '/' || currentPath === '/auth'
            ? ''
            : 'mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 pb-24 sm:pb-8'
        }
      >
        {renderCurrentView()}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      {user && currentPath !== '/' && currentPath !== '/auth' && (
        <MobileNav
          currentPath={currentPath}
          onNavigate={navigate}
          conversationsCount={conversations.length}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
