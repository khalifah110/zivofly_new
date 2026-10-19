import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Agent, ChannelConnection, Conversation, KnowledgeDocument, User, ChatMessage } from '../types';

/**
 * Helper to map Supabase 'profiles' row to frontend User model
 */
export function mapSupabaseProfileToUser(row: any, fallbackEmail?: string): User {
  return {
    id: row?.id || '',
    name: row?.full_name || row?.name || row?.display_name || fallbackEmail?.split('@')[0] || 'User',
    email: row?.email || fallbackEmail || '',
    businessName: row?.business_name || row?.company_name || 'My Business',
    avatarUrl: row?.avatar_url || row?.avatar || undefined,
  };
}

/**
 * Helper to map Supabase 'agents' row to frontend Agent model
 */
export function mapSupabaseAgentToFrontend(row: any): Agent {
  return {
    id: row.id,
    userId: row.user_id || row.userId || '',
    name: row.name || 'AI Concierge',
    description: row.description || '',
    platforms: row.platforms || (row.channel ? [row.channel] : ['instagram']),
    roleAndDuties: row.role_and_duties || row.roleAndDuties || row.instructions || '',
    openingLine: row.opening_line || row.openingLine,
    tone: row.tone,
    status: row.status || 'active',
    customVoice: row.custom_voice || row.customVoice,
    availability: row.availability || {
      is24x7: true,
      timezone: 'America/New_York',
      startHour: '08:00',
      endHour: '20:00',
      activeDays: [1, 2, 3, 4, 5, 6, 7],
    },
    platformConfig: row.platform_config || row.platformConfig || {},
    whatItRepliesTo: row.what_it_replies_to || row.whatItRepliesTo,
    knowledgeDocs: row.knowledge_docs || row.knowledgeDocs || [],
    tools: row.tools || row.agent_tools,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Helper to map frontend Agent to Supabase 'agents' insert/update payload
 */
export function mapFrontendAgentToSupabase(agent: Partial<Agent>, userId: string) {
  const payload: Record<string, any> = {};

  if (agent.id) payload.id = agent.id;
  payload.user_id = userId;
  if (agent.name !== undefined) payload.name = agent.name;
  if (agent.description !== undefined) payload.description = agent.description;
  if (agent.platforms !== undefined) payload.platforms = agent.platforms;
  if (agent.roleAndDuties !== undefined) payload.role_and_duties = agent.roleAndDuties;
  if (agent.openingLine !== undefined) payload.opening_line = agent.openingLine;
  if (agent.tone !== undefined) payload.tone = agent.tone;
  if (agent.status !== undefined) payload.status = agent.status;
  if (agent.customVoice !== undefined) payload.custom_voice = agent.customVoice;
  if (agent.availability !== undefined) payload.availability = agent.availability;
  if (agent.platformConfig !== undefined) payload.platform_config = agent.platformConfig;
  if (agent.whatItRepliesTo !== undefined) payload.what_it_replies_to = agent.whatItRepliesTo;
  if (agent.knowledgeDocs !== undefined) payload.knowledge_docs = agent.knowledgeDocs;
  if (agent.tools !== undefined) payload.tools = agent.tools;
  payload.updated_at = new Date().toISOString();

  return payload;
}

/**
 * Helper to map Supabase 'channel_connections' row to frontend ChannelConnection model
 */
export function mapSupabaseConnectionToFrontend(row: any): ChannelConnection {
  return {
    id: row.id,
    user_id: row.user_id || '',
    agent_id: row.agent_id || null,
    channel: row.channel,
    display_name: row.display_name || row.displayName || `${row.channel} Connection`,
    handle: row.handle || '',
    status: row.status || 'connected',
    reply_dms: row.reply_dms ?? true,
    reply_comments: row.reply_comments ?? false,
    reply_tags: row.reply_tags ?? false,
    comment_keywords: row.comment_keywords || [],
    tag_accounts: row.tag_accounts || [],
    always_on: row.always_on ?? true,
    active_from: row.active_from || '08:00',
    active_to: row.active_to || '20:00',
    active_days: row.active_days || [1, 2, 3, 4, 5, 6, 7],
    timezone: row.timezone || 'America/New_York',
    created_at: row.created_at || new Date().toISOString(),
    agents: row.agents ? { name: row.agents.name } : undefined,
  };
}

// ==========================================
// AUTHENTICATION & PROFILE METHODS
// ==========================================

export async function signUpWithSupabase(
  email: string,
  password: string,
  metadata?: { name?: string; businessName?: string }
): Promise<{ user: User; session: any } | null> {
  if (!supabase) throw new Error('Supabase client is not configured.');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: metadata?.name || '',
        business_name: metadata?.businessName || '',
      },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error('Sign up did not return a user identity.');

  // Check if profile exists, or create it if not created by database trigger
  let userProfile: User = {
    id: data.user.id,
    email: data.user.email || email,
    name: metadata?.name || email.split('@')[0],
    businessName: metadata?.businessName || 'My Business',
  };

  try {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (existingProfile) {
      userProfile = mapSupabaseProfileToUser(existingProfile, email);
    } else {
      // Create profile row
      const { data: insertedProfile } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email || email,
          full_name: metadata?.name || email.split('@')[0],
          business_name: metadata?.businessName || 'My Business',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .maybeSingle();

      if (insertedProfile) {
        userProfile = mapSupabaseProfileToUser(insertedProfile, email);
      }
    }
  } catch (profErr) {
    console.warn('[Zivofly] Profile query error after signup:', profErr);
  }

  return { user: userProfile, session: data.session };
}

export async function signInWithSupabase(
  email: string,
  password: string
): Promise<{ user: User; session: any } | null> {
  if (!supabase) throw new Error('Supabase client is not configured.');

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error('Sign in failed to retrieve user account.');

  // Retrieve user's profile
  let profile = await getSupabaseProfile(data.user.id);
  if (!profile) {
    profile = {
      id: data.user.id,
      email: data.user.email || email,
      name: data.user.user_metadata?.full_name || email.split('@')[0],
      businessName: data.user.user_metadata?.business_name || 'My Business',
    };
  }

  return { user: profile, session: data.session };
}

export async function signOutFromSupabase(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSupabaseSession(): Promise<{ user: User | null; session: any } | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session?.user) return null;

    const authUser = data.session.user;
    const profile = await getSupabaseProfile(authUser.id);

    return {
      user: profile || {
        id: authUser.id,
        email: authUser.email || '',
        name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
        businessName: authUser.user_metadata?.business_name || 'My Business',
      },
      session: data.session,
    };
  } catch (err) {
    console.warn('[Zivofly] Error checking Supabase session:', err);
    return null;
  }
}

export async function getSupabaseProfile(userId?: string): Promise<User | null> {
  if (!supabase) return null;

  try {
    let targetId = userId;
    let authEmail: string | undefined;

    if (!targetId) {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return null;
      targetId = authData.user.id;
      authEmail = authData.user.email;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetId)
      .maybeSingle();

    if (error) {
      console.warn('[Zivofly] Profile query returned error:', error.message);
      return null;
    }

    if (!data) return null;
    return mapSupabaseProfileToUser(data, authEmail);
  } catch (err) {
    console.warn('[Zivofly] Failed to fetch profile from Supabase:', err);
    return null;
  }
}

export async function updateSupabaseProfile(userId: string, updates: Partial<User>): Promise<User | null> {
  if (!supabase) return null;

  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) payload.full_name = updates.name;
  if (updates.businessName !== undefined) payload.business_name = updates.businessName;
  if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data ? mapSupabaseProfileToUser(data) : null;
}

export async function deleteSupabaseAccount(): Promise<void> {
  if (!supabase) return;

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) return;

  try {
    // Delete user data across tables adhering to RLS
    await supabase.from('conversations').delete().eq('user_id', userId);
    await supabase.from('channel_connections').delete().eq('user_id', userId);
    await supabase.from('agents').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);
  } catch (err) {
    console.warn('[Zivofly] Error deleting user related records:', err);
  }

  // Sign out
  await supabase.auth.signOut();
}

// ==========================================
// AGENTS METHODS
// ==========================================

export async function getSupabaseAgents(userId: string): Promise<Agent[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[Zivofly] Error fetching agents from Supabase:', error.message);
    throw error;
  }

  return (data || []).map(mapSupabaseAgentToFrontend);
}

export async function createSupabaseAgent(agentData: Partial<Agent>, userId: string): Promise<Agent> {
  if (!supabase) throw new Error('Supabase client not configured');

  const payload = mapFrontendAgentToSupabase(agentData, userId);
  if (!payload.created_at) payload.created_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('agents')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return mapSupabaseAgentToFrontend(data);
}

export async function updateSupabaseAgent(agentId: string, updates: Partial<Agent>, userId: string): Promise<Agent> {
  if (!supabase) throw new Error('Supabase client not configured');

  const payload = mapFrontendAgentToSupabase(updates, userId);

  const { data, error } = await supabase
    .from('agents')
    .update(payload)
    .eq('id', agentId)
    .select('*')
    .single();

  if (error) throw error;
  return mapSupabaseAgentToFrontend(data);
}

export async function deleteSupabaseAgent(agentId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase client not configured');

  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', agentId);

  if (error) throw error;
}

// ==========================================
// CHANNEL CONNECTIONS METHODS
// ==========================================

export async function getSupabaseConnections(userId: string): Promise<ChannelConnection[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('channel_connections')
    .select('*, agents(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[Zivofly] Error fetching connections:', error.message);
    throw error;
  }

  return (data || []).map(mapSupabaseConnectionToFrontend);
}

export async function createSupabaseConnection(conn: Partial<ChannelConnection>, userId: string): Promise<ChannelConnection> {
  if (!supabase) throw new Error('Supabase client not configured');

  const payload = {
    user_id: userId,
    agent_id: conn.agent_id || null,
    channel: conn.channel,
    display_name: conn.display_name,
    handle: conn.handle,
    status: conn.status || 'connected',
    reply_dms: conn.reply_dms ?? true,
    reply_comments: conn.reply_comments ?? false,
    reply_tags: conn.reply_tags ?? false,
    comment_keywords: conn.comment_keywords || [],
    tag_accounts: conn.tag_accounts || [],
    always_on: conn.always_on ?? true,
    active_from: conn.active_from || '08:00',
    active_to: conn.active_to || '20:00',
    active_days: conn.active_days || [1, 2, 3, 4, 5, 6, 7],
    timezone: conn.timezone || 'America/New_York',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('channel_connections')
    .insert(payload)
    .select('*, agents(name)')
    .single();

  if (error) throw error;
  return mapSupabaseConnectionToFrontend(data);
}

export async function updateSupabaseConnection(connId: string, updates: Partial<ChannelConnection>): Promise<ChannelConnection> {
  if (!supabase) throw new Error('Supabase client not configured');

  const payload: Record<string, any> = { ...updates };
  delete payload.agents;
  delete payload.id;

  const { data, error } = await supabase
    .from('channel_connections')
    .update(payload)
    .eq('id', connId)
    .select('*, agents(name)')
    .single();

  if (error) throw error;
  return mapSupabaseConnectionToFrontend(data);
}

export async function deleteSupabaseConnection(connId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase client not configured');

  const { error } = await supabase
    .from('channel_connections')
    .delete()
    .eq('id', connId);

  if (error) throw error;
}

// ==========================================
// CONVERSATIONS & INBOX METHODS
// ==========================================

export async function getSupabaseConversations(userId: string): Promise<Conversation[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('conversations')
    .select('*, messages(*)')
    .eq('user_id', userId)
    .order('last_message_time', { ascending: false });

  if (error) {
    console.warn('[Zivofly] Error querying conversations:', error.message);
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    agentId: row.agent_id,
    userId: row.user_id,
    platform: row.platform,
    customerName: row.customer_name || 'Customer',
    customerHandle: row.customer_handle || '',
    customerAvatar: row.customer_avatar,
    lastMessageText: row.last_message_text || '',
    lastMessageTime: row.last_message_time || row.created_at || new Date().toISOString(),
    unread: row.unread ?? false,
    status: row.status || 'agent_active',
    rating: row.rating,
    feedbackComment: row.feedback_comment,
    messages: (row.messages || [])
      .sort((a: any, b: any) => new Date(a.timestamp || a.created_at).getTime() - new Date(b.timestamp || b.created_at).getTime())
      .map((m: any) => ({
        id: m.id,
        sender: m.sender,
        text: m.text,
        timestamp: m.timestamp || m.created_at,
        mediaType: m.media_type,
        mediaUrl: m.media_url,
        mediaDescription: m.media_description,
        rating: m.rating,
        feedback: m.feedback,
        feedbackCreatedAt: m.feedback_created_at,
      })),
  }));
}

export async function sendSupabaseMessage(
  conversationId: string,
  text: string,
  sender: 'customer' | 'agent' | 'human' = 'agent'
): Promise<ChatMessage> {
  if (!supabase) throw new Error('Supabase client not configured');

  const msgPayload = {
    conversation_id: conversationId,
    sender,
    text,
    timestamp: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('messages')
    .insert(msgPayload)
    .select('*')
    .single();

  if (error) throw error;

  // Update conversation last_message
  await supabase
    .from('conversations')
    .update({
      last_message_text: text,
      last_message_time: msgPayload.timestamp,
    })
    .eq('id', conversationId);

  return {
    id: data.id,
    sender: data.sender,
    text: data.text,
    timestamp: data.timestamp,
  };
}
