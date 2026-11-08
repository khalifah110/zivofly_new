import { Agent, Conversation, KnowledgeDocument, User } from '../types';
import { isSupabaseConfigured, testSupabaseConnection, SUPABASE_URL, supabase } from './supabaseClient';
import {
  signUpWithSupabase,
  signInWithSupabase,
  signOutFromSupabase,
  getSupabaseProfile,
  updateSupabaseProfile,
  deleteSupabaseAccount,
  getSupabaseAgents,
  createSupabaseAgent,
  updateSupabaseAgent,
  deleteSupabaseAgent,
  getSupabaseConnections,
  createSupabaseConnection,
  updateSupabaseConnection,
  deleteSupabaseConnection,
  getSupabaseConversations,
  createSupabaseConversation,
  sendSupabaseMessage,
  saveSupabaseConversationFeedback,
  getSupabaseConversationFeedback,
} from './supabaseService';

export interface ChannelConnection {
  id: string;
  user_id: string;
  agent_id: string | null;
  channel: 'whatsapp' | 'instagram' | 'tiktok' | 'call' | 'messenger';
  display_name: string;
  handle: string;
  status: 'connected' | 'disconnected';
  reply_dms: boolean;
  reply_comments: boolean;
  reply_tags: boolean;
  comment_keywords: string[];
  tag_accounts: string[];
  always_on: boolean;
  active_from: string;
  active_to: string;
  active_days: number[];
  timezone: string;
  created_at: string;
  agents?: { name: string };
}

const STORAGE_KEYS = {
  USER: 'zivofly_user',
  AGENTS: 'zivofly_agents',
  CONNECTIONS: 'zivofly_connections',
  CONVERSATIONS: 'zivofly_conversations',
};

// Initial default user
const DEFAULT_USER: User = {
  id: '',
  name: '',
  email: '',
  businessName: '',
  avatarUrl: '',
};

// Initial default knowledge docs
const DEFAULT_DOCS: KnowledgeDocument[] = [];

// Initial default agent
const DEFAULT_AGENT: Agent = {
  id: '',
  userId: '',
  name: '',
  description: '',
  platforms: [],
  roleAndDuties: '',
  status: 'active',
  availability: {
    is24x7: true,
    timezone: 'UTC',
    startHour: '09:00',
    endHour: '17:00',
    activeDays: [1, 2, 3, 4, 5],
  },
  platformConfig: {},
  knowledgeDocs: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Initial default channel connections
const DEFAULT_CONNECTIONS: ChannelConnection[] = [];

// Initial default conversations
const DEFAULT_CONVERSATIONS: Conversation[] = [];

// In-browser Storage Helpers
function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error('Failed to persist to localStorage', err);
  }
}

async function resolveCurrentUserId(): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id) {
        return sessionData.session.user.id;
      }
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        return authData.user.id;
      }
    } catch {
      // ignore
    }
  }
  const storedUser = getStored<User | null>(STORAGE_KEYS.USER, null);
  return storedUser?.id || '';
}

// Storage initializers
export function initClientBackend() {
  if (typeof window !== 'undefined' && window.localStorage) {
    // Purge browser-stored mock records so that accounts strictly reflect Supabase database data
    localStorage.removeItem(STORAGE_KEYS.AGENTS);
    localStorage.removeItem(STORAGE_KEYS.CONNECTIONS);
    localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
  }
  // Intercept window.fetch for /api/* calls
  installFetchInterceptor();
}

// Client-side AI Reasoning Simulation
function generateAgentResponse(agent: Agent, query: string, customerName = 'there'): string {
  const q = query.toLowerCase();
  const sheet = agent.tools?.googleSheet;
  const rows = sheet?.enabled ? (sheet.sampleRows || sheet.sampleData || []) : [];

  // Check if query matches sheet records
  const matchedRow = rows.find(r =>
    Object.values(r).some(val => typeof val === 'string' && q.includes(val.toLowerCase())) ||
    (q.includes('price') || q.includes('cost') || q.includes('stock') || q.includes('service') || q.includes('item') || q.includes('book') || q.includes('available'))
  );

  if (matchedRow) {
    const details = Object.entries(matchedRow)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ');
    return `Hello ${customerName}! ✨ Based on our live ${sheet?.sheetName || 'Google Sheet'} database:\n• ${details}\n\nWould you like me to book or reserve this for you?`;
  }

  // Check knowledge docs
  const allDocsContent = (agent.knowledgeDocs || []).map(d => d.content).join('\n').toLowerCase();
  if (allDocsContent) {
    const lines = (agent.knowledgeDocs || [])
      .map(d => d.content)
      .join('\n')
      .split('\n')
      .filter(l => l.trim().length > 0);
    const relevantLine = lines.find(l => {
      const words = q.split(' ').filter(w => w.length > 3);
      return words.some(w => l.toLowerCase().includes(w));
    });
    if (relevantLine) {
      return `Hello ${customerName}! ✨ According to our records:\n${relevantLine.trim()}\n\nIs there anything else I can assist you with?`;
    }
  }

  if (agent.openingLine) {
    return `Hello ${customerName}! ${agent.openingLine}`;
  }

  return `Hello ${customerName}! Thank you for reaching out to ${agent.name || 'our team'}. I'm here to assist with any questions, orders, or support you may need. What can I help you with today?`;
}

// Client-Side Fetch Handler
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  // If not an /api/* call, fall back to native window.fetch
  if (!urlString.startsWith('/api/') && !urlString.includes('/api/')) {
    return nativeFetch(input, init);
  }

  const url = new URL(urlString, window.location.origin);
  const pathname = url.pathname;
  const method = (init?.method || 'GET').toUpperCase();
  let body: any = null;

  if (init?.body && typeof init.body === 'string') {
    try {
      body = JSON.parse(init.body);
    } catch {
      body = init.body;
    }
  }

  const jsonResponse = (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  // --- Health Check & Diagnostics ---
  if (pathname === '/api/health') {
    return jsonResponse({
      status: 'ok',
      mode: isSupabaseConfigured ? 'supabase_integrated' : 'client_spa',
      supabaseConfigured: isSupabaseConfigured,
      supabaseUrl: SUPABASE_URL,
    });
  }

  if (pathname === '/api/supabase/status') {
    const status = await testSupabaseConnection();
    return jsonResponse(status);
  }

  // --- Auth & Profile ---
  if (pathname === '/api/auth/login') {
    const email = body?.email || '';
    const password = body?.password || '';

    if (isSupabaseConfigured) {
      try {
        const result = await signInWithSupabase(email, password);
        if (result) {
          setStored(STORAGE_KEYS.USER, result.user);
          return jsonResponse({
            token: result.session?.access_token || 'supabase_token',
            user: result.user,
            provider: 'supabase',
          });
        }
      } catch (err: any) {
        const msg = err?.message || 'Authentication failed';
        return jsonResponse({ error: msg }, 401);
      }
    }

    return jsonResponse({ error: 'Supabase database is not configured. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' }, 400);
  }

  if (pathname === '/api/auth/register') {
    const email = body?.email || '';
    const password = body?.password || '';
    const name = body?.name || email.split('@')[0] || 'User';
    const businessName = body?.businessName || 'My Business';

    if (isSupabaseConfigured) {
      try {
        const result = await signUpWithSupabase(email, password, { name, businessName });
        if (result) {
          if (result.session) {
            setStored(STORAGE_KEYS.USER, result.user);
          }
          return jsonResponse({
            token: result.session?.access_token || null,
            user: result.user,
            needsEmailConfirmation: !result.session,
            provider: 'supabase',
          });
        }
      } catch (err: any) {
        let msg = err?.message || 'Registration failed';
        if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('rate_limit')) {
          msg = 'Supabase email rate limit reached (the default Supabase email service allows ~3-4 emails/hr). To bypass this, turn off "Confirm email" in your Supabase Dashboard under Authentication > Providers > Email, or wait a few minutes.';
        }
        return jsonResponse({ error: msg }, 400);
      }
    }

    return jsonResponse({ error: 'Supabase database is not configured.' }, 400);
  }

  if (pathname === '/api/auth/logout') {
    if (isSupabaseConfigured) {
      try {
        await signOutFromSupabase();
      } catch (e) {
        console.warn('[Zivofly] Supabase signout error:', e);
      }
    }
    return jsonResponse({ success: true });
  }

  if (pathname === '/api/auth/me' || pathname === '/api/user/profile' || pathname === '/api/user/me' || pathname === '/api/user/account') {
    if (method === 'DELETE') {
      if (isSupabaseConfigured) {
        try {
          await deleteSupabaseAccount();
        } catch (e) {
          console.warn('[Zivofly] Supabase account delete error:', e);
        }
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.clear();
      }

      return jsonResponse({
        success: true,
        message: 'User account and all associated data have been permanently deleted.',
      });
    }

    if (method === 'PUT') {
      const currentUser = getStored<User | null>(STORAGE_KEYS.USER, null);
      const userId = await resolveCurrentUserId();
      let updatedUser: User = {
        ...(currentUser || { id: userId, email: '', name: '', businessName: '' }),
        ...(body || {}),
      };

      if (isSupabaseConfigured && userId && !userId.startsWith('user_default')) {
        try {
          const supaUpdated = await updateSupabaseProfile(userId, updatedUser);
          if (supaUpdated) updatedUser = supaUpdated;
        } catch (e) {
          console.warn('[Zivofly] Supabase profile update error:', e);
        }
      }

      setStored(STORAGE_KEYS.USER, updatedUser);
      return jsonResponse({ user: updatedUser });
    }

    // Default: GET
    if (isSupabaseConfigured) {
      try {
        const supaProfile = await getSupabaseProfile();
        if (supaProfile) {
          setStored(STORAGE_KEYS.USER, supaProfile);
          return jsonResponse({ user: supaProfile });
        } else {
          localStorage.removeItem(STORAGE_KEYS.USER);
          return jsonResponse({ user: null });
        }
      } catch (e) {
        console.warn('[Zivofly] Supabase profile get error:', e);
      }
    }

    const user = getStored<User | null>(STORAGE_KEYS.USER, null);
    return jsonResponse({ user });
  }

  // --- Agents Endpoints ---
  if (pathname === '/api/agents' && method === 'GET') {
    const userId = await resolveCurrentUserId();
    if (isSupabaseConfigured && userId && !userId.startsWith('user_default')) {
      try {
        const supaAgents = await getSupabaseAgents(userId);
        const list = supaAgents || [];
        setStored(STORAGE_KEYS.AGENTS, list);
        return jsonResponse({ agents: list });
      } catch (e) {
        console.warn('[Zivofly] Supabase agents query failed:', e);
        return jsonResponse({ agents: getStored<Agent[]>(STORAGE_KEYS.AGENTS, []) });
      }
    }

    if (isSupabaseConfigured) {
      return jsonResponse({ agents: [] });
    }

    const agents = getStored<Agent[]>(STORAGE_KEYS.AGENTS, []);
    return jsonResponse({ agents });
  }

  if (pathname === '/api/agents' && method === 'POST') {
    const userId = await resolveCurrentUserId();

    if (isSupabaseConfigured && userId && !userId.startsWith('user_default')) {
      try {
        const supaAgent = await createSupabaseAgent(body, userId);
        if (supaAgent) {
          const agents = getStored<Agent[]>(STORAGE_KEYS.AGENTS, []);
          agents.unshift(supaAgent);
          setStored(STORAGE_KEYS.AGENTS, agents);
          return jsonResponse({ agent: supaAgent });
        }
      } catch (e) {
        console.warn('[Zivofly] Supabase agent creation error, falling back locally:', e);
      }
    }

    const agents = getStored<Agent[]>(STORAGE_KEYS.AGENTS, []);
    const newAgent: Agent = {
      id: `agent_${Date.now()}`,
      userId: userId || 'user_supabase',
      name: body?.name || 'Customer Concierge',
      description: body?.description || 'Automated customer care assistant',
      platforms: body?.platforms || ['instagram', 'whatsapp'],
      roleAndDuties: body?.roleAndDuties || 'Warmly assist customers with questions, pricing, and bookings.',
      openingLine: body?.openingLine,
      tone: body?.tone,
      customVoice: body?.customVoice,
      status: 'active',
      tools: body?.tools || undefined,
      availability: {
        is24x7: true,
        timezone: 'America/New_York',
        startHour: '08:00',
        endHour: '20:00',
        activeDays: [1, 2, 3, 4, 5, 6, 7],
      },
      platformConfig: body?.platformConfig || {},
      knowledgeDocs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    agents.unshift(newAgent);
    setStored(STORAGE_KEYS.AGENTS, agents);

    return jsonResponse({ agent: newAgent });
  }

  // Agent Tools: Google Sheet Query
  const sheetQueryMatch = pathname.match(/^\/api\/agents\/([^/]+)\/tools\/google-sheet\/query$/);
  if (sheetQueryMatch && method === 'POST') {
    const agentId = sheetQueryMatch[1];
    const agents = getStored<Agent[]>(STORAGE_KEYS.AGENTS, []);
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return jsonResponse({ error: 'Agent not found' }, 404);

    const sheet = agent.tools?.googleSheet;
    const rows = sheet?.sampleRows || sheet?.sampleData || [];
    const q = (body?.query || '').toLowerCase().trim();
    const matches = q
      ? rows.filter(r => Object.values(r).some(v => typeof v === 'string' && v.toLowerCase().includes(q)))
      : rows;

    return jsonResponse({
      sheetName: sheet?.sheetName || 'Sheet',
      totalRecords: rows.length,
      matchesCount: matches.length,
      matches,
      sampleRows: matches.slice(0, 10),
    });
  }

  // Agent Tools: Google Sheet Add Row
  const sheetRowMatch = pathname.match(/^\/api\/agents\/([^/]+)\/tools\/google-sheet\/rows$/);
  if (sheetRowMatch && method === 'POST') {
    const agentId = sheetRowMatch[1];
    const agents = getStored<Agent[]>(STORAGE_KEYS.AGENTS, []);
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.tools?.googleSheet) return jsonResponse({ error: 'Tool not configured' }, 400);

    if (!agent.tools.googleSheet.sampleRows) {
      agent.tools.googleSheet.sampleRows = agent.tools.googleSheet.sampleData || [];
    }
    agent.tools.googleSheet.sampleRows.push(body?.row || {});
    agent.tools.googleSheet.lastSyncedAt = new Date().toISOString();
    agent.updatedAt = new Date().toISOString();
    setStored(STORAGE_KEYS.AGENTS, agents);

    return jsonResponse({ success: true, sheet: agent.tools.googleSheet });
  }

  // Agent Tools: Google Sheet Sync
  const sheetSyncMatch = pathname.match(/^\/api\/agents\/([^/]+)\/tools\/google-sheet\/sync$/);
  if (sheetSyncMatch && method === 'POST') {
    const agentId = sheetSyncMatch[1];
    const agents = getStored<Agent[]>(STORAGE_KEYS.AGENTS, []);
    const agent = agents.find(a => a.id === agentId);
    if (!agent || !agent.tools?.googleSheet) return jsonResponse({ error: 'Tool not configured' }, 400);

    agent.tools.googleSheet.lastSyncedAt = new Date().toISOString();
    agent.updatedAt = new Date().toISOString();
    setStored(STORAGE_KEYS.AGENTS, agents);

    const rows = agent.tools.googleSheet.sampleRows || agent.tools.googleSheet.sampleData || [];
    return jsonResponse({ success: true, lastSyncedAt: agent.tools.googleSheet.lastSyncedAt, recordsCount: rows.length });
  }

  // Agent Test Chat
  const testChatMatch = pathname.match(/^\/api\/agents\/([^/]+)\/test-chat$/);
  if (testChatMatch && method === 'POST') {
    const agentId = testChatMatch[1];
    const agents = getStored<Agent[]>(STORAGE_KEYS.AGENTS, []);
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return jsonResponse({ error: 'Agent not found' }, 404);

    const reply = generateAgentResponse(agent, body?.message || '', 'Valued Guest');
    return jsonResponse({ reply });
  }

  // Single Agent Details
  const agentDetailMatch = pathname.match(/^\/api\/agents\/([^/]+)$/);
  if (agentDetailMatch) {
    const agentId = agentDetailMatch[1];
    const agents = getStored<Agent[]>(STORAGE_KEYS.AGENTS, []);
    const idx = agents.findIndex(a => a.id === agentId);

    if (method === 'GET') {
      if (idx === -1) return jsonResponse({ error: 'Agent not found' }, 404);
      return jsonResponse({ agent: agents[idx] });
    }

    if (method === 'PUT') {
      const userId = await resolveCurrentUserId();
      const baseAgent = idx !== -1 ? agents[idx] : { ...DEFAULT_AGENT, id: agentId };
      let updated = { ...baseAgent, ...body, updatedAt: new Date().toISOString() };
      if (isSupabaseConfigured && userId && !userId.startsWith('user_default')) {
        try {
          const supaAgent = await updateSupabaseAgent(agentId, updated, userId);
          if (supaAgent) updated = supaAgent;
        } catch (e) {
          console.warn('[Zivofly] Supabase agent update error:', e);
        }
      }
      if (idx !== -1) {
        agents[idx] = updated;
      } else {
        agents.unshift(updated);
      }
      setStored(STORAGE_KEYS.AGENTS, agents);
      return jsonResponse({ agent: updated });
    }

    if (method === 'DELETE') {
      if (idx !== -1) {
        agents.splice(idx, 1);
        setStored(STORAGE_KEYS.AGENTS, agents);
      }

      if (isSupabaseConfigured) {
        try {
          await deleteSupabaseAgent(agentId);
        } catch (e) {
          console.warn('[Zivofly] Supabase agent delete error:', e);
        }
      }

      // Unlink any connections mapped to this agent
      try {
        const connections = getStored<ChannelConnection[]>(STORAGE_KEYS.CONNECTIONS, DEFAULT_CONNECTIONS);
        let connsModified = false;
        connections.forEach((conn) => {
          if (conn.agent_id === agentId) {
            conn.agent_id = null;
            if (conn.agents) delete conn.agents;
            connsModified = true;
          }
        });
        if (connsModified) {
          setStored(STORAGE_KEYS.CONNECTIONS, connections);
        }
      } catch (e) {
        console.error('Failed to unlink connections', e);
      }
      return jsonResponse({ success: true, message: 'Agent deleted' });
    }
  }

  // Toggle Agent Status
  const toggleStatusMatch = pathname.match(/^\/api\/agents\/([^/]+)\/toggle-status$/);
  if (toggleStatusMatch && method === 'POST') {
    const agentId = toggleStatusMatch[1];
    const agents = getStored<Agent[]>(STORAGE_KEYS.AGENTS, []);
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return jsonResponse({ error: 'Agent not found' }, 404);

    agent.status = agent.status === 'active' ? 'paused' : 'active';
    agent.updatedAt = new Date().toISOString();
    const userId = await resolveCurrentUserId();
    if (isSupabaseConfigured && userId && !userId.startsWith('user_default')) {
      try {
        await updateSupabaseAgent(agentId, agent, userId);
      } catch (e) {
        console.warn('[Zivofly] Supabase toggle status error:', e);
      }
    }
    setStored(STORAGE_KEYS.AGENTS, agents);
    return jsonResponse({ agent });
  }

  // Knowledge Upload / Delete
  const knowUploadMatch = pathname.match(/^\/api\/agents\/([^/]+)\/knowledge\/upload$/);
  if (knowUploadMatch && method === 'POST') {
    const agentId = knowUploadMatch[1];
    const agents = getStored<Agent[]>(STORAGE_KEYS.AGENTS, []);
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return jsonResponse({ error: 'Agent not found' }, 404);

    const newDoc: KnowledgeDocument = {
      id: `doc_${Date.now()}`,
      name: body?.title || body?.name || 'Document.pdf',
      type: (body?.type as any) || 'pdf',
      content: body?.content || '',
      chunkCount: 2,
      createdAt: new Date().toISOString(),
      fileSize: `${Math.round((body?.content?.length || 100) / 10)} KB`,
    };
    agent.knowledgeDocs = agent.knowledgeDocs || [];
    agent.knowledgeDocs.push(newDoc);
    const userId = await resolveCurrentUserId();
    if (isSupabaseConfigured && userId && !userId.startsWith('user_default')) {
      try {
        const supaAgent = await updateSupabaseAgent(agentId, agent, userId);
        if (supaAgent) {
          agent.knowledgeDocs = supaAgent.knowledgeDocs;
        }
      } catch (e) {
        console.warn('[Zivofly] Supabase knowledge upload sync error:', e);
      }
    }
    setStored(STORAGE_KEYS.AGENTS, agents);
    return jsonResponse({ success: true, doc: newDoc, agent });
  }

  const knowDeleteMatch = pathname.match(/^\/api\/agents\/([^/]+)\/knowledge\/([^/]+)$/);
  if (knowDeleteMatch && method === 'DELETE') {
    const agentId = knowDeleteMatch[1];
    const docId = knowDeleteMatch[2];
    const agents = getStored<Agent[]>(STORAGE_KEYS.AGENTS, []);
    const agent = agents.find(a => a.id === agentId);
    if (agent && agent.knowledgeDocs) {
      agent.knowledgeDocs = agent.knowledgeDocs.filter(d => d.id !== docId);
      const userId = await resolveCurrentUserId();
      if (isSupabaseConfigured && userId && !userId.startsWith('user_default')) {
        try {
          await updateSupabaseAgent(agentId, agent, userId);
        } catch (e) {
          console.warn('[Zivofly] Supabase knowledge delete sync error:', e);
        }
      }
      setStored(STORAGE_KEYS.AGENTS, agents);
    }
    return jsonResponse({ success: true, agent });
  }

  // --- Connections Endpoints ---
  if (pathname === '/api/connections' && method === 'GET') {
    const userId = await resolveCurrentUserId();
    if (isSupabaseConfigured && userId && !userId.startsWith('user_default')) {
      try {
        const supaConns = await getSupabaseConnections(userId);
        const list = supaConns || [];
        setStored(STORAGE_KEYS.CONNECTIONS, list);
        return jsonResponse({ connections: list, data: list });
      } catch (e) {
        console.warn('[Zivofly] Supabase connections query failed:', e);
        const cached = getStored<ChannelConnection[]>(STORAGE_KEYS.CONNECTIONS, []);
        return jsonResponse({ connections: cached, data: cached });
      }
    }

    if (isSupabaseConfigured) {
      return jsonResponse({ connections: [], data: [] });
    }

    const connections = getStored<ChannelConnection[]>(STORAGE_KEYS.CONNECTIONS, []);
    return jsonResponse({ connections, data: connections });
  }

  if (pathname === '/api/connections' && method === 'POST') {
    const userId = await resolveCurrentUserId();
    const connections = getStored<ChannelConnection[]>(STORAGE_KEYS.CONNECTIONS, DEFAULT_CONNECTIONS);
    const agents = getStored<Agent[]>(STORAGE_KEYS.AGENTS, []);
    const matchedAgent = agents.find(a => a.id === body?.agent_id);

    let newConn: ChannelConnection = {
      id: `conn_${Date.now()}`,
      user_id: userId || 'user_default',
      agent_id: body?.agent_id || null,
      channel: body?.channel || 'whatsapp',
      display_name: body?.display_name || `${body?.channel || 'Channel'} Connection`,
      handle: body?.handle || '+1 (555) 000-0000',
      status: 'connected',
      reply_dms: body?.reply_dms ?? true,
      reply_comments: body?.reply_comments ?? false,
      reply_tags: body?.reply_tags ?? false,
      comment_keywords: body?.comment_keywords || [],
      tag_accounts: body?.tag_accounts || [],
      always_on: body?.always_on ?? true,
      active_from: body?.active_from || '08:00',
      active_to: body?.active_to || '20:00',
      active_days: body?.active_days || [1, 2, 3, 4, 5, 6, 7],
      timezone: body?.timezone || 'America/New_York',
      created_at: new Date().toISOString(),
      agents: matchedAgent ? { name: matchedAgent.name } : undefined,
    };

    if (isSupabaseConfigured && userId && !userId.startsWith('user_default')) {
      try {
        const created = await createSupabaseConnection(newConn, userId);
        if (created) newConn = created;
      } catch (e) {
        console.warn('[Zivofly] Supabase connection creation error, saved locally:', e);
      }
    }

    connections.unshift(newConn);
    setStored(STORAGE_KEYS.CONNECTIONS, connections);
    return jsonResponse({ connection: newConn, data: newConn });
  }

  const connDetailMatch = pathname.match(/^\/api\/connections\/([^/]+)$/);
  if (connDetailMatch) {
    const connId = connDetailMatch[1];
    const connections = getStored<ChannelConnection[]>(STORAGE_KEYS.CONNECTIONS, DEFAULT_CONNECTIONS);
    const idx = connections.findIndex(c => c.id === connId);

    if (method === 'GET') {
      if (idx === -1) return jsonResponse({ error: 'Connection not found' }, 404);
      return jsonResponse({ connection: connections[idx], data: connections[idx] });
    }

    if (method === 'PUT') {
      const baseConn = idx !== -1 ? connections[idx] : { id: connId } as ChannelConnection;
      let updated = { ...baseConn, ...body };
      if (isSupabaseConfigured) {
        try {
          const supaUpdated = await updateSupabaseConnection(connId, updated);
          if (supaUpdated) updated = supaUpdated;
        } catch (e) {
          console.warn('[Zivofly] Supabase connection update error:', e);
        }
      }
      if (idx !== -1) {
        connections[idx] = updated;
      } else {
        connections.unshift(updated);
      }
      setStored(STORAGE_KEYS.CONNECTIONS, connections);
      return jsonResponse({ connection: updated, data: updated });
    }

    if (method === 'DELETE') {
      if (idx !== -1) {
        connections.splice(idx, 1);
        setStored(STORAGE_KEYS.CONNECTIONS, connections);
      }
      if (isSupabaseConfigured) {
        try {
          await deleteSupabaseConnection(connId);
        } catch (e) {
          console.warn('[Zivofly] Supabase connection delete error:', e);
        }
      }
      return jsonResponse({ success: true });
    }
  }

  // --- Conversations & Inbox ---
  if (pathname === '/api/conversations' && method === 'GET') {
    const userId = await resolveCurrentUserId();
    if (isSupabaseConfigured && userId && !userId.startsWith('user_default')) {
      try {
        const supaConvs = await getSupabaseConversations(userId);
        const list = supaConvs || [];
        setStored(STORAGE_KEYS.CONVERSATIONS, list);
        return jsonResponse({ conversations: list });
      } catch (e) {
        console.warn('[Zivofly] Supabase conversations query failed:', e);
        return jsonResponse({ conversations: getStored<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, []) });
      }
    }

    if (isSupabaseConfigured) {
      return jsonResponse({ conversations: [] });
    }

    const convs = getStored<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, []);
    return jsonResponse({ conversations: convs });
  }

  if (pathname === '/api/conversations' && method === 'POST') {
    const userId = await resolveCurrentUserId();
    const convs = getStored<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, DEFAULT_CONVERSATIONS);

    if (isSupabaseConfigured && userId && !userId.startsWith('user_default')) {
      try {
        const createdConv = await createSupabaseConversation(userId, {
          agentId: body?.agentId,
          platform: body?.platform || 'whatsapp',
          customerName: body?.customerName || 'New Customer',
          customerHandle: body?.customerHandle || '@customer',
          message: body?.message || 'Hello!',
        });
        convs.unshift(createdConv);
        setStored(STORAGE_KEYS.CONVERSATIONS, convs);
        return jsonResponse({ conversation: createdConv });
      } catch (e) {
        console.warn('[Zivofly] Supabase create conversation error, falling back locally:', e);
      }
    }

    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      agentId: body?.agentId || DEFAULT_AGENT.id,
      userId: userId || 'user_default',
      platform: body?.platform || 'whatsapp',
      customerName: body?.customerName || 'New Customer',
      customerHandle: body?.customerHandle || '@customer',
      customerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80',
      lastMessageText: body?.message || 'Hello!',
      lastMessageTime: new Date().toISOString(),
      unread: false,
      status: 'agent_active',
      messages: [
        {
          id: `msg_${Date.now()}`,
          sender: 'customer',
          text: body?.message || 'Hello!',
          timestamp: new Date().toISOString(),
        },
      ],
    };
    convs.unshift(newConv);
    setStored(STORAGE_KEYS.CONVERSATIONS, convs);
    return jsonResponse({ conversation: newConv });
  }

  // Takeover Conversation
  const takeoverMatch = pathname.match(/^\/api\/conversations\/([^/]+)\/takeover$/);
  if (takeoverMatch && method === 'POST') {
    const convId = takeoverMatch[1];
    const convs = getStored<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, DEFAULT_CONVERSATIONS);
    const conv = convs.find(c => c.id === convId);
    if (!conv) return jsonResponse({ error: 'Conversation not found' }, 404);

    if (body?.status) {
      conv.status = body.status;
    } else if (body?.target) {
      conv.status = body.target === 'human' ? 'human_takeover' : 'agent_active';
    } else {
      conv.status = conv.status === 'human_takeover' ? 'agent_active' : 'human_takeover';
    }
    if (conv.status === 'agent_active') {
      conv.missedMessagesCountWhilePaused = 0;
    }
    setStored(STORAGE_KEYS.CONVERSATIONS, convs);
    return jsonResponse({ conversation: conv, resumed: conv.status === 'agent_active' });
  }

  // Feedback / Rate Conversation or Specific Message
  const feedbackMatch = pathname.match(/^\/api\/conversations\/([^/]+)\/(feedback|rate)$/);
  if (feedbackMatch && method === 'POST') {
    const convId = feedbackMatch[1];
    const convs = getStored<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, DEFAULT_CONVERSATIONS);
    const conv = convs.find(c => c.id === convId);

    const newRating = Number(body?.rating);
    const newComment =
      typeof body?.feedbackComment === 'string'
        ? body.feedbackComment
        : typeof body?.comment === 'string'
        ? body.comment
        : typeof body?.feedback === 'string'
        ? body.feedback
        : '';
    const newTags: string[] = Array.isArray(body?.tags) ? body.tags : [];
    const targetMsgId: string | undefined = body?.messageId;

    if (isSupabaseConfigured) {
      try {
        const targetMsg = conv?.messages.find(m => m.id === targetMsgId);
        const savedFeedback = await saveSupabaseConversationFeedback({
          agentId: conv?.agentId || body?.agentId || null,
          conversationId: convId,
          messageId: targetMsgId || null,
          feedbackId: targetMsg?.feedbackId || body?.feedbackId || null,
          rating: newRating,
          comment: newComment,
          tags: newTags,
        });

        if (conv) {
          if (targetMsgId) {
            const msg = conv.messages.find(m => m.id === targetMsgId);
            if (msg) {
              msg.rating = savedFeedback.rating;
              msg.feedback = savedFeedback.comment ?? '';
              msg.feedbackTags = savedFeedback.tags;
              msg.feedbackId = savedFeedback.id;
              msg.feedbackCreatedAt = savedFeedback.created_at;
            }
          } else {
            const lastAgentMsg = [...conv.messages].reverse().find(m => m.sender === 'agent');
            if (lastAgentMsg) {
              lastAgentMsg.rating = savedFeedback.rating;
              lastAgentMsg.feedback = savedFeedback.comment ?? '';
              lastAgentMsg.feedbackTags = savedFeedback.tags;
              lastAgentMsg.feedbackId = savedFeedback.id;
              lastAgentMsg.feedbackCreatedAt = savedFeedback.created_at;
            }
          }
          conv.rating = savedFeedback.rating;
          conv.feedbackComment = savedFeedback.comment ?? '';
          conv.feedbackTags = savedFeedback.tags;
          conv.feedbackId = savedFeedback.id;
          setStored(STORAGE_KEYS.CONVERSATIONS, convs);
        }

        return jsonResponse({
          conversation: conv || null,
          feedback: savedFeedback,
        });
      } catch (err: any) {
        return jsonResponse(
          {
            error:
              err?.message || 'Failed to save feedback to Supabase.',
          },
          400
        );
      }
    }

    // Explicit demo mode only (when Supabase is not configured)
    if (!conv) return jsonResponse({ error: 'Conversation not found' }, 404);

    if (targetMsgId) {
      const msg = conv.messages.find(m => m.id === targetMsgId);
      if (msg) {
        if (!Number.isNaN(newRating)) msg.rating = newRating;
        msg.feedback = newComment;
        msg.feedbackTags = newTags;
        msg.feedbackCreatedAt = new Date().toISOString();
      }
    } else {
      const lastAgentMsg = [...conv.messages].reverse().find(m => m.sender === 'agent');
      if (lastAgentMsg) {
        if (!Number.isNaN(newRating)) lastAgentMsg.rating = newRating;
        lastAgentMsg.feedback = newComment;
        lastAgentMsg.feedbackTags = newTags;
        lastAgentMsg.feedbackCreatedAt = new Date().toISOString();
      }
    }

    setStored(STORAGE_KEYS.CONVERSATIONS, convs);
    return jsonResponse({ conversation: conv });
  }

  // Send Message / Reply in Conversation
  const msgMatch = pathname.match(/^\/api\/conversations\/([^/]+)\/(messages|reply)$/);
  if (msgMatch && method === 'POST') {
    const convId = msgMatch[1];
    const convs = getStored<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, DEFAULT_CONVERSATIONS);
    const conv = convs.find(c => c.id === convId);
    if (!conv) return jsonResponse({ error: 'Conversation not found' }, 404);

    const sender = body?.sender || 'agent';
    const text = body?.text || body?.message || '';

    const newMsg = {
      id: `msg_${Date.now()}`,
      sender,
      text,
      timestamp: new Date().toISOString(),
    };
    conv.messages.push(newMsg);
    conv.lastMessageText = text;
    conv.lastMessageTime = newMsg.timestamp;

    if (isSupabaseConfigured) {
      try {
        await sendSupabaseMessage(convId, text, sender as any);
      } catch (e) {
        console.warn('[Zivofly] Supabase send message error, stored locally:', e);
      }
    }

    // If customer sent and agent is active, simulate agent reply
    if (sender === 'customer' && conv.status !== 'human_takeover') {
      const agents = getStored<Agent[]>(STORAGE_KEYS.AGENTS, []);
      const agent = agents.find(a => a.id === conv.agentId) || DEFAULT_AGENT;
      const autoReply = generateAgentResponse(agent, text, conv.customerName);
      const replyMsg = {
        id: `msg_${Date.now() + 1}`,
        sender: 'agent' as const,
        text: autoReply,
        timestamp: new Date(Date.now() + 500).toISOString(),
      };
      conv.messages.push(replyMsg);
      conv.lastMessageText = autoReply;
      conv.lastMessageTime = replyMsg.timestamp;

      if (isSupabaseConfigured) {
        try {
          await sendSupabaseMessage(convId, autoReply, 'agent');
        } catch (e) {
          console.warn('[Zivofly] Supabase send autoReply error:', e);
        }
      }
    }

    setStored(STORAGE_KEYS.CONVERSATIONS, convs);
    return jsonResponse({ conversation: conv, message: newMsg });
  }

  // Meta / Channel Setup Modals
  if (pathname === '/api/meta/oauth/connect' || pathname === '/api/meta/whatsapp/setup' || pathname === '/api/meta/call/setup') {
    return jsonResponse({
      success: true,
      connected: true,
      channel: body?.channel || 'meta',
      message: 'Account successfully authenticated and linked.',
    });
  }

  // Chat Simulate endpoint
  if (pathname === '/api/chat/simulate' && method === 'POST') {
    const agents = getStored<Agent[]>(STORAGE_KEYS.AGENTS, []);
    const agent = agents.find(a => a.id === body?.agentId) || DEFAULT_AGENT;
    const text = body?.message || body?.text || '';
    const reply = generateAgentResponse(agent, text, body?.customerName || 'Customer');
    return jsonResponse({ reply });
  }

  // Fallback pass-through for static assets or non-API calls
  return nativeFetch(input, init);
}

// Preserve the real native fetch safely at module evaluation time
const rawNativeFetch =
  typeof window !== 'undefined' && typeof window.fetch === 'function'
    ? window.fetch.bind(window)
    : typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function'
    ? globalThis.fetch.bind(globalThis)
    : null;

const nativeFetch: typeof window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  if (rawNativeFetch) {
    return rawNativeFetch(input, init);
  }
  return Promise.reject(new Error('Fetch not available in this environment'));
};

// Client-Side Fetch Interceptor:
// Do NOT override global window.fetch. Overriding window.fetch intercepts Supabase SDK requests
// and causes "Maximum call stack size exceeded". All internal application components use apiFetch directly.
function installFetchInterceptor() {
  // Global window.fetch remains native and untouched
}
