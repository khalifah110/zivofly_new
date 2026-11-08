import React, { useState, useEffect, useRef } from 'react';
import {
  Trash2,
  Upload,
  Send,
  Bot,
  User as UserIcon,
  Table,
  Save,
  Instagram,
  Facebook,
  Phone,
  PhoneCall,
  MoreVertical,
  Plus,
  FileUp,
  FileText,
  File,
  HardDrive,
  CheckCircle2,
  X,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  Sparkles,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  extractTextFromFile,
  ExtractedDocumentResult,
  isCorruptedDocxText,
} from '../lib/fileTextExtractor';
import {
  Agent,
  CustomVoiceConfig,
  GoogleSheetToolConfig,
  GoogleWorkspaceConfig,
  Microsoft365Config,
  SalesforceConfig,
  HubSpotConfig,
  KnowledgeDocument,
  NotificationsConfig,
  PlatformType,
  WhatItRepliesToConfig,
  ChannelConnection,
} from '../types';
import { apiFetch } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import {
  AgentTestConversation,
  AgentTestMessageRecord,
  CONFIG_DOC_TITLE,
  createSupabaseTestConversation,
  extractEdgeFunctionDiagnosticError,
  getSupabaseTestConversationMessages,
  getSupabaseTestConversations,
  getVerifiedSupabaseAccessToken,
  GOOGLE_OAUTH_RETURN_STORAGE_KEY,
  isValidUuid,
  mapSupabaseKnowledgeDocToFrontend,
  processKnowledgeDocument,
  saveSupabaseConversationFeedback,
  saveSupabaseTestMessage,
} from '../lib/supabaseService';
import { GoogleSheetToolSection } from '../components/GoogleSheetToolSection';
import { GoogleWorkspaceSection } from '../components/GoogleWorkspaceSection';
import { Microsoft365Section } from '../components/Microsoft365Section';
import { SalesforceSection } from '../components/SalesforceSection';
import { HubSpotSection } from '../components/HubSpotSection';
import { NotificationChannelsSection } from '../components/NotificationChannelsSection';
import { GOOGLE_SHEET_TEMPLATES } from '../data/sheetTemplates';
import { TIMEZONE_GROUPS, ALL_TIMEZONES } from '../data/timezones';
import { WhatItRepliesToSection } from '../components/WhatItRepliesToSection';
import { DeleteAgentModal } from '../components/DeleteAgentModal';
import { SimulatorMessageBubble, SimulatorMessage } from '../components/SimulatorMessageBubble';
import { CustomAgentVoiceSection } from '../components/CustomAgentVoiceSection';
import { TikTokLogo } from '../components/BrandLogos';

interface AgentDetailPageProps {
  agentId: string;
  agents: Agent[];
  connections?: ChannelConnection[];
  onNavigate: (path: string) => void;
  onAgentCreated?: (created: Agent) => void;
  onAgentUpdated: (updated: Agent) => void;
  onAgentDeleted?: (agentId: string) => void;
}

export const AgentDetailPage: React.FC<AgentDetailPageProps> = ({
  agentId,
  agents,
  connections = [],
  onNavigate,
  onAgentCreated,
  onAgentUpdated,
  onAgentDeleted,
}) => {
  const isNewAgent = agentId === 'new';
  const agent = agents.find((a) => a.id === agentId);

  const [activeTab, setActiveTab] = useState<
    'instructions' | 'tools' | 'notifications' | 'knowledge' | 'availability' | 'try'
  >(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('google_oauth') || params.get('tab') === 'tools') {
      return 'tools';
    }
    try {
      const saved = sessionStorage.getItem(GOOGLE_OAUTH_RETURN_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed?.tab === 'tools' &&
          Date.now() - Number(parsed?.createdAt || 0) < 15 * 60 * 1000
        ) {
          return 'tools';
        }
      }
    } catch {
      // ignore
    }
    return 'instructions';
  });

  // Form states (completely empty when creating a new agent)
  const [name, setName] = useState(agent?.name || '');
  const [roleAndDuties, setRoleAndDuties] = useState(agent?.roleAndDuties || '');
  const [openingLine, setOpeningLine] = useState(agent?.openingLine || '');
  const [tone, setTone] = useState(agent?.tone || '');
  const [customVoice, setCustomVoice] = useState<CustomVoiceConfig | undefined>(agent?.customVoice);
  const [isActive, setIsActive] = useState(agent?.status ? agent.status === 'active' : true);
  const [saving, setSaving] = useState(false);

  // Three-dot menu and deletion states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Real workspace_id resolved from application state / database for zivofy_ai
  const [verifiedWorkspaceId, setVerifiedWorkspaceId] = useState<string | null>(
    agent?.workspaceId || null
  );
  const [simulatorError, setSimulatorError] = useState<{
    status?: number | string;
    message: string;
    isAuthRequired?: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolveAgentWorkspace = async () => {
      if (!supabase || isNewAgent || !agent?.id) {
        if (!cancelled) {
          setVerifiedWorkspaceId(null);
        }
        return;
      }

      if (agent.workspaceId && !cancelled) {
        setVerifiedWorkspaceId(agent.workspaceId);
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.user?.id) {
          return;
        }

        const { data: agentRow } = await supabase
          .from('agents')
          .select('id, workspace_id')
          .eq('id', agent.id)
          .maybeSingle();

        const resolvedWsId = agentRow?.workspace_id || agent.workspaceId || null;
        if (!cancelled && resolvedWsId) {
          setVerifiedWorkspaceId(resolvedWsId);
        }

        // Load actual knowledge_documents rows for this agent from Supabase
        let docsQuery = supabase
          .from('knowledge_documents')
          .select('*')
          .eq('agent_id', agent.id)
          .order('created_at', { ascending: false });

        if (resolvedWsId) {
          docsQuery = docsQuery.eq('workspace_id', resolvedWsId);
        }

        const { data: docRows, error: docsErr } = await docsQuery;
        if (!cancelled && !docsErr && Array.isArray(docRows)) {
          const mappedDocs = docRows
            .filter(
              (d) =>
                d.title !== CONFIG_DOC_TITLE &&
                d.title !== '__zivofly_agent_ext_config__' &&
                d.status !== 'deleted'
            )
            .map((d) => mapSupabaseKnowledgeDocToFrontend(d));
          docsRef.current = mappedDocs;
          setDocs(mappedDocs);

          // Automatically trigger processing for any readable queued or previously failed documents with 0 chunks
          if (resolvedWsId) {
            const pendingDocs = mappedDocs.filter(
              (d) =>
                (d.status === 'queued' || d.status === 'failed') &&
                (!d.chunkCount || d.chunkCount === 0) &&
                d.content.trim().length > 0 &&
                !isCorruptedDocxText(d.content)
            );
            for (const pDoc of pendingDocs) {
              if (!cancelled) {
                void triggerDocumentProcessing(resolvedWsId, agent.id, pDoc.id, true);
              }
            }
          }
        }
      } catch {
        // Ignore background lookup failure; explicit actions will check and report any error
      }
    };

    resolveAgentWorkspace();

    return () => {
      cancelled = true;
    };
  }, [agent?.id, agent?.workspaceId, isNewAgent]);

  useEffect(() => {
    const handleOutsideClick = () => {
      if (isMenuOpen) setIsMenuOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [isMenuOpen]);

  // Platforms state
  const [platforms, setPlatforms] = useState<PlatformType[]>(() => {
    if (agent?.platforms && agent.platforms.length > 0) {
      return agent.platforms;
    }
    if (isNewAgent) {
      return [];
    }
    const connPlatforms = connections
      .filter((c) => c.agent_id === agent?.id && c.status === 'connected')
      .map((c) => c.channel as PlatformType);
    if (connPlatforms.length > 0) {
      return Array.from(new Set(connPlatforms));
    }
    return [];
  });

  const togglePlatform = (p: PlatformType) => {
    setPlatforms((prev) => {
      const safe = prev || [];
      return safe.includes(p) ? safe.filter((item) => item !== p) : [...safe, p];
    });
  };

  const isInstagramActive = (platforms || []).includes('instagram');
  const isFacebookActive = (platforms || []).includes('messenger');
  const isTikTokActive = (platforms || []).includes('tiktok');

  // What it replies to appears when Instagram, TikTok, or Facebook is connected
  const showWhatItRepliesTo = isInstagramActive || isFacebookActive || isTikTokActive;

  // What it replies to state
  const [whatItRepliesTo, setWhatItRepliesTo] = useState<WhatItRepliesToConfig>(() => {
    if (agent?.whatItRepliesTo) {
      return agent.whatItRepliesTo;
    }
    return {
      replyDMs: agent?.platformConfig?.instagram?.replyDMs ?? true,
      replyComments: agent?.platformConfig?.instagram?.replyComments ?? true,
      commentKeywords: (
        agent?.platformConfig?.instagram?.commentKeywords || ['price', 'delivery', 'how much']
      ).join(', '),
      replyTags: agent?.platformConfig?.instagram?.replyTags ?? true,
      tagAllowedAccounts: (
        agent?.platformConfig?.instagram?.tagAllowedAccounts || ['@partner', '@reseller']
      ).join(', '),
    };
  });

  // Tool state (Google Workspace, Google Sheet Database & Notifications)
  const [sheetToolConfig, setSheetToolConfig] = useState<GoogleSheetToolConfig>(
    agent?.tools?.googleSheet || { enabled: false, columns: [], sheetName: 'Sheet1' }
  );
  const [googleWorkspaceConfig, setGoogleWorkspaceConfig] = useState<GoogleWorkspaceConfig>(
    agent?.tools?.googleWorkspace || {
      gmail: { enabled: false, status: 'disconnected' },
      drive: { enabled: false, status: 'disconnected' },
      docs: { enabled: false, status: 'disconnected' },
      sheets: agent?.tools?.googleSheet || { enabled: false, columns: [], sheetName: 'Sheet1', status: 'disconnected' },
      calendar: { enabled: false, status: 'disconnected' },
    }
  );
  const [microsoft365Config, setMicrosoft365Config] = useState<Microsoft365Config>(
    agent?.tools?.microsoft365 || {
      outlook: { enabled: false, status: 'disconnected' },
      excel: { enabled: false, status: 'disconnected' },
      word: { enabled: false, status: 'disconnected' },
      sharepoint: { enabled: false, status: 'disconnected' },
    }
  );
  const [salesforceConfig, setSalesforceConfig] = useState<SalesforceConfig>(
    agent?.tools?.salesforce || {
      salesCloud: { enabled: false, status: 'disconnected' },
      serviceCloud: { enabled: false, status: 'disconnected' },
      contacts: { enabled: false, status: 'disconnected' },
      marketingCloud: { enabled: false, status: 'disconnected' },
    }
  );
  const [hubspotConfig, setHubspotConfig] = useState<HubSpotConfig>(
    agent?.tools?.hubspot || {
      contacts: { enabled: false, status: 'disconnected' },
      deals: { enabled: false, status: 'disconnected' },
      serviceHub: { enabled: false, status: 'disconnected' },
      marketingForms: { enabled: false, status: 'disconnected' },
    }
  );
  const [notificationsConfig, setNotificationsConfig] = useState<NotificationsConfig>(
    agent?.tools?.notifications || {
      channels: [],
      details: {
        email: { emailAddress: '' },
        whatsapp: { phoneNumber: '' },
        sms: { phoneNumber: '' },
        app_notifications: { target: 'Account Owner' },
      },
    }
  );

  // Availability state
  const [is24x7, setIs24x7] = useState(agent?.availability?.is24x7 ?? true);
  const [startHour, setStartHour] = useState(agent?.availability?.startHour || '08:00');
  const [endHour, setEndHour] = useState(agent?.availability?.endHour || '20:00');
  const [timezone, setTimezone] = useState(agent?.availability?.timezone || 'America/New_York');
  const [timezoneSearch, setTimezoneSearch] = useState('');
  const [activeDays, setActiveDays] = useState(agent?.availability?.activeDays || [0, 1, 2, 3, 4, 5, 6]);

  // Knowledge state
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [docs, setDocs] = useState<KnowledgeDocument[]>(agent?.knowledgeDocs || []);
  const docsRef = useRef<KnowledgeDocument[]>(agent?.knowledgeDocs || []);
  docsRef.current = docs;
  const [knowledgeMode, setKnowledgeMode] = useState<'upload' | 'manual'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedDoc, setExtractedDoc] = useState<ExtractedDocumentResult | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [processingDocIds, setProcessingDocIds] = useState<string[]>([]);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showContentEditor, setShowContentEditor] = useState(false);
  const deviceFileInputRef = useRef<HTMLInputElement | null>(null);

  // Try it simulator (persistent test conversations) state
  const [chatMessages, setChatMessages] = useState<SimulatorMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isWaitingReply, setIsWaitingReply] = useState(false);
  const [simulatorConversationId, setSimulatorConversationId] = useState<string | null>(null);
  const [testConversations, setTestConversations] = useState<AgentTestConversation[]>([]);
  const [isLoadingTestHistory, setIsLoadingTestHistory] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const chatScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const activeAgentIdRef = useRef<string | null>(agent?.id || null);
  activeAgentIdRef.current = agent?.id || null;
  const simulatorConversationIdRef = useRef<string | null>(null);
  simulatorConversationIdRef.current = simulatorConversationId;

  const mapTestRecordToSimulatorMessage = (
    rec: AgentTestMessageRecord
  ): SimulatorMessage => ({
    id: rec.id,
    dbMessageId: rec.id,
    clientMessageId: rec.client_message_id,
    sequence: rec.sequence,
    role: rec.sender_type,
    text: rec.content,
    timestamp: rec.created_at,
    rating: rec.rating,
    feedback: rec.feedback,
    feedbackTags: rec.feedbackTags,
    feedbackId: rec.feedbackId,
    feedbackCreatedAt: rec.feedbackCreatedAt,
    saveStatus: 'saved',
  });

  const scrollTestChatToBottom = () => {
    requestAnimationFrame(() => {
      if (chatScrollContainerRef.current) {
        chatScrollContainerRef.current.scrollTop =
          chatScrollContainerRef.current.scrollHeight;
      }
    });
  };

  // Reset test conversation state when switching agents so messages from different agents/workspaces never mix
  useEffect(() => {
    setTestConversations([]);
    setSimulatorConversationId(null);
    simulatorConversationIdRef.current = null;
    setChatMessages([]);
    setSimulatorError(null);
  }, [agent?.id]);

  // Load saved test conversations from Supabase when agent loads or when opening the Test Agent tab
  useEffect(() => {
    let cancelled = false;

    const loadSavedTestConversations = async () => {
      if (!supabase || isNewAgent || !agent?.id || !isValidUuid(agent.id)) {
        return;
      }

      setIsLoadingTestHistory(true);
      try {
        const savedConvs = await getSupabaseTestConversations({
          workspaceId: verifiedWorkspaceId || agent.workspaceId || null,
          agentId: agent.id,
        });

        if (cancelled || activeAgentIdRef.current !== agent.id) {
          return;
        }

        setTestConversations(savedConvs);

        if (savedConvs.length > 0) {
          const currentConvId = simulatorConversationIdRef.current;
          const matchingConv =
            currentConvId && isValidUuid(currentConvId)
              ? savedConvs.find((c) => c.id === currentConvId)
              : null;
          const targetConv = matchingConv || savedConvs[0];
          setSimulatorConversationId(targetConv.id);
          setChatMessages(
            targetConv.messages.map(mapTestRecordToSimulatorMessage)
          );
          scrollTestChatToBottom();
        } else {
          setSimulatorConversationId(null);
          setChatMessages([]);
        }
      } catch (err: any) {
        if (!cancelled && activeTab === 'try') {
          const msg =
            err?.message || 'Failed to load saved test conversations from Supabase.';
          const isAuth =
            msg.includes('401') ||
            msg.toLowerCase().includes('authentication required') ||
            msg.toLowerCase().includes('login session');
          setSimulatorError({
            status: isAuth ? 401 : 'DB_READ_ERROR',
            message: msg,
            isAuthRequired: isAuth,
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingTestHistory(false);
        }
      }
    };

    void loadSavedTestConversations();

    return () => {
      cancelled = true;
    };
  }, [agent?.id, verifiedWorkspaceId, isNewAgent, activeTab]);

  if (!agent && !isNewAgent) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 text-center py-12">
        <h2 className="text-xl font-medium text-foreground">Agent not found</h2>
        <p className="text-sm text-muted-foreground">This agent may have been deleted.</p>
        <button
          onClick={() => onNavigate('/agents')}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground cursor-pointer"
        >
          Back to all agents
        </button>
      </div>
    );
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter an agent name');
      return;
    }

    setSaving(true);
    try {
      if (isNewAgent) {
        // Create new agent via POST
        const res = await apiFetch('/api/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            roleAndDuties: roleAndDuties.trim(),
            openingLine: openingLine.trim(),
            tone: tone.trim(),
            customVoice,
            description: roleAndDuties.trim() || 'AI Customer Support Agent',
            status: isActive ? 'active' : 'paused',
            platforms,
            whatItRepliesTo,
            platformConfig: {
              instagram: (platforms || []).includes('instagram')
                ? {
                    replyDMs: whatItRepliesTo.replyDMs,
                    replyComments: whatItRepliesTo.replyComments,
                    replyTags: whatItRepliesTo.replyTags,
                    commentKeywords: whatItRepliesTo.commentKeywords
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                    tagAllowedAccounts: whatItRepliesTo.tagAllowedAccounts
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }
                : undefined,
              messenger: (platforms || []).includes('messenger')
                ? {
                    replyDMs: whatItRepliesTo.replyDMs,
                    replyComments: whatItRepliesTo.replyComments,
                    replyTags: whatItRepliesTo.replyTags,
                    commentKeywords: whatItRepliesTo.commentKeywords
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                    tagAllowedAccounts: whatItRepliesTo.tagAllowedAccounts
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }
                : undefined,
            },
            knowledgeDocs: docs,
            tools: {
              googleSheet: googleWorkspaceConfig?.sheets || sheetToolConfig,
              googleWorkspace: googleWorkspaceConfig,
              microsoft365: microsoft365Config,
              salesforce: salesforceConfig,
              hubspot: hubspotConfig,
              notifications: notificationsConfig,
            },
            availability: {
              is24x7,
              startHour,
              endHour,
              timezone,
              activeDays,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (onAgentCreated) {
            onAgentCreated(data.agent);
          }
          toast.success(`Agent "${data.agent.name}" created successfully!`);
          onNavigate(`/agents/${data.agent.id}`);
        } else {
          toast.error('Failed to create agent');
        }
      } else if (agent) {
        // Update existing agent via PUT
        const updatedAgent: Agent = {
          ...agent,
          name: name.trim() || agent.name,
          roleAndDuties: roleAndDuties.trim() || agent.roleAndDuties,
          openingLine: openingLine.trim(),
          tone: tone.trim(),
          customVoice,
          status: isActive ? 'active' : 'paused',
          platforms,
          whatItRepliesTo,
          platformConfig: {
            ...agent.platformConfig,
            instagram: agent.platformConfig?.instagram
              ? {
                  ...agent.platformConfig.instagram,
                  replyDMs: whatItRepliesTo.replyDMs,
                  replyComments: whatItRepliesTo.replyComments,
                  replyTags: whatItRepliesTo.replyTags,
                  commentKeywords: whatItRepliesTo.commentKeywords
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                  tagAllowedAccounts: whatItRepliesTo.tagAllowedAccounts
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                }
              : undefined,
            messenger: agent.platformConfig?.messenger
              ? {
                  ...agent.platformConfig.messenger,
                  replyDMs: whatItRepliesTo.replyDMs,
                  replyComments: whatItRepliesTo.replyComments,
                  replyTags: whatItRepliesTo.replyTags,
                  commentKeywords: whatItRepliesTo.commentKeywords
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                  tagAllowedAccounts: whatItRepliesTo.tagAllowedAccounts
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                }
              : undefined,
          },
          knowledgeDocs: docs,
          tools: {
            googleSheet: googleWorkspaceConfig?.sheets || sheetToolConfig,
            googleWorkspace: googleWorkspaceConfig,
            microsoft365: microsoft365Config,
            salesforce: salesforceConfig,
            hubspot: hubspotConfig,
            notifications: notificationsConfig,
          },
          availability: {
            is24x7,
            startHour,
            endHour,
            timezone,
            activeDays,
          },
        };

        const res = await apiFetch(`/api/agents/${agent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedAgent),
        });

        if (res.ok) {
          const data = await res.json();
          onAgentUpdated(data.agent);
          toast.success('Agent and settings saved successfully');
        } else {
          toast.error('Failed to save agent');
        }
      }
    } catch {
      toast.error('Could not save agent');
    } finally {
      setSaving(false);
    }
  };

  const handleDeviceFileSelect = async (file: File) => {
    if (!file) return;
    setUploadedFile(file);
    setIsReadingFile(true);
    setShowContentEditor(false);
    setKnowledgeError(null);

    try {
      const extracted = await extractTextFromFile(file);
      if (!extracted.content.trim() || isCorruptedDocxText(extracted.content)) {
        throw new Error(
          `Could not extract readable text from "${file.name}". Please ensure it is a valid document.`
        );
      }
      setExtractedDoc(extracted);
      setDocTitle(extracted.title);
      setDocContent(extracted.content);
      toast.success(`Extracted readable text from "${file.name}"`);
    } catch (err: any) {
      console.error('File parsing error:', err);
      const errMsg =
        err?.message ||
        'Could not extract readable text from document. Please verify the file or enter text manually.';
      setUploadedFile(null);
      setExtractedDoc(null);
      setDocTitle('');
      setDocContent('');
      if (deviceFileInputRef.current) {
        deviceFileInputRef.current.value = '';
      }
      setKnowledgeError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsReadingFile(false);
    }
  };

  const resolveKnowledgeWorkspaceAndAgent = async (): Promise<{
    workspaceId: string;
    agentId: string;
  }> => {
    if (!supabase) {
      throw new Error('Supabase client is not configured.');
    }

    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData?.session?.user) {
      throw new Error(
        sessionErr?.message ||
          'Authentication required: Please log in to save documents to the Knowledge Base.'
      );
    }

    const currentAgentId = !isNewAgent && agent?.id ? agent.id : null;
    if (!currentAgentId) {
      throw new Error(
        'Please save and create this agent first before adding documents to its Knowledge Base.'
      );
    }

    let workspaceId = verifiedWorkspaceId || agent?.workspaceId || null;

    if (!workspaceId) {
      const { data: agentRow, error: agentLookupErr } = await supabase
        .from('agents')
        .select('id, workspace_id')
        .eq('id', currentAgentId)
        .maybeSingle();

      if (agentLookupErr) {
        throw new Error(agentLookupErr.message);
      }

      if (agentRow?.workspace_id) {
        workspaceId = agentRow.workspace_id;
        setVerifiedWorkspaceId(workspaceId);
      }
    }

    if (!workspaceId) {
      const userId = sessionData.session.user.id;
      const { data: memberRows, error: memberErr } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', userId)
        .limit(1);

      if (memberErr) {
        throw new Error(memberErr.message);
      }

      if (memberRows && memberRows.length > 0 && memberRows[0].workspace_id) {
        workspaceId = memberRows[0].workspace_id;
        setVerifiedWorkspaceId(workspaceId);
      } else {
        const { data: ownedWs, error: ownedErr } = await supabase
          .from('workspaces')
          .select('id')
          .eq('owner_user_id', userId)
          .limit(1);

        if (ownedErr) {
          throw new Error(ownedErr.message);
        }

        if (ownedWs && ownedWs.length > 0 && ownedWs[0].id) {
          workspaceId = ownedWs[0].id;
          setVerifiedWorkspaceId(workspaceId);
        }
      }
    }

    if (!workspaceId) {
      throw new Error(
        'Could not resolve workspace_id for the authenticated user and selected agent.'
      );
    }

    return { workspaceId, agentId: currentAgentId };
  };

  const updateDocInState = (updatedDoc: KnowledgeDocument, workspaceId?: string) => {
    const prev = docsRef.current;
    const exists = prev.some((d) => d.id === updatedDoc.id);
    const next = exists
      ? prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d))
      : [updatedDoc, ...prev];
    docsRef.current = next;
    setDocs(next);
    if (agent) {
      onAgentUpdated({
        ...agent,
        workspaceId: workspaceId || verifiedWorkspaceId || agent.workspaceId,
        knowledgeDocs: next,
      });
    }
  };

  const triggerDocumentProcessing = async (
    workspaceId: string,
    targetAgentId: string,
    documentId: string,
    silentStart = false
  ): Promise<KnowledgeDocument | null> => {
    setProcessingDocIds((prev) =>
      prev.includes(documentId) ? prev : [...prev, documentId]
    );
    if (!silentStart) {
      setKnowledgeError(null);
    }

    try {
      const processedDoc = await processKnowledgeDocument({
        workspaceId,
        agentId: targetAgentId,
        documentId,
        onStatusChange: (statusDoc) => {
          updateDocInState(statusDoc, workspaceId);
        },
      });

      updateDocInState(processedDoc, workspaceId);
      toast.success(
        `"${processedDoc.name}" processed into ${processedDoc.chunkCount} chunk${
          processedDoc.chunkCount === 1 ? '' : 's'
        } and is now Ready`
      );
      return processedDoc;
    } catch (procErr: any) {
      const procMsg =
        procErr?.message ||
        'Document was saved, but chunking and embedding generation failed.';
      setKnowledgeError(procMsg);
      toast.error(procMsg);
      return null;
    } finally {
      setProcessingDocIds((prev) => prev.filter((id) => id !== documentId));
    }
  };

  const handleRetryProcessDoc = async (docId: string) => {
    if (processingDocIds.includes(docId)) return;
    try {
      const { workspaceId, agentId: targetAgentId } =
        await resolveKnowledgeWorkspaceAndAgent();
      await triggerDocumentProcessing(workspaceId, targetAgentId, docId, false);
    } catch (err: any) {
      const msg = err?.message || 'Unable to process document.';
      setKnowledgeError(msg);
      toast.error(msg);
    }
  };

  const handleAddUploadedDoc = async () => {
    if (isSavingDoc) return;

    if (!uploadedFile && !extractedDoc) {
      toast.error('Please choose a file from your device first.');
      return;
    }

    const finalTitle = (
      docTitle.trim() ||
      extractedDoc?.title ||
      uploadedFile?.name ||
      'Document'
    ).trim();
    const finalContent = (docContent.trim() || extractedDoc?.content || '').trim();

    if (!finalContent) {
      toast.error('The document does not have readable text. Please review or enter content.');
      return;
    }

    if (isCorruptedDocxText(finalContent)) {
      const corruptMsg =
        'The extracted text contains raw DOCX XML/ZIP metadata (Content_Types, document.xml, styles.xml) and cannot be saved. Please re-select a valid .docx file.';
      setKnowledgeError(corruptMsg);
      toast.error(corruptMsg);
      return;
    }

    setIsSavingDoc(true);
    setKnowledgeError(null);

    try {
      const { workspaceId, agentId: targetAgentId } = await resolveKnowledgeWorkspaceAndAgent();
      const fileSizeBytes = new TextEncoder().encode(finalContent).length;
      const mimeType =
        uploadedFile?.type ||
        (uploadedFile?.name.toLowerCase().endsWith('.pdf')
          ? 'application/pdf'
          : uploadedFile?.name.toLowerCase().endsWith('.docx')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'text/plain');
      const formattedSize =
        extractedDoc?.fileSize || `${Math.max(1, Math.round(fileSizeBytes / 1024))} KB`;

      // Check if there is an existing failed/corrupted document with the same title so we can repair it in place
      const existingFailedDoc = docsRef.current.find(
        (d) =>
          d.name.trim().toLowerCase() === finalTitle.toLowerCase() &&
          (d.status === 'failed' || isCorruptedDocxText(d.content))
      );

      let targetDocRow: any = null;
      let saveError: any = null;

      if (existingFailedDoc) {
        const { data: updatedRow, error: updateErr } = await supabase!
          .from('knowledge_documents')
          .update({
            title: finalTitle,
            source_type: 'file',
            content_text: finalContent,
            mime_type: mimeType,
            file_size_bytes: fileSizeBytes,
            chunk_count: 0,
            status: 'queued',
            error_message: null,
            metadata: {
              fileSize: formattedSize,
              type:
                extractedDoc?.type ||
                (uploadedFile?.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'text'),
              originalFileName: uploadedFile?.name || finalTitle,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingFailedDoc.id)
          .eq('workspace_id', workspaceId)
          .select('*')
          .single();

        targetDocRow = updatedRow;
        saveError = updateErr;
      } else {
        const { data: insertedRow, error: insertErr } = await supabase!
          .from('knowledge_documents')
          .insert({
            workspace_id: workspaceId,
            agent_id: targetAgentId,
            title: finalTitle,
            source_type: 'file',
            storage_path: null,
            source_url: null,
            content_text: finalContent,
            mime_type: mimeType,
            file_size_bytes: fileSizeBytes,
            chunk_count: 0,
            status: 'queued',
            error_message: null,
            metadata: {
              fileSize: formattedSize,
              type:
                extractedDoc?.type ||
                (uploadedFile?.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'text'),
              originalFileName: uploadedFile?.name || finalTitle,
            },
          })
          .select('*')
          .single();

        targetDocRow = insertedRow;
        saveError = insertErr;
      }

      if (saveError || !targetDocRow) {
        const errMessage = saveError
          ? `${saveError.message}${saveError.details ? ` (${saveError.details})` : ''}`
          : 'Failed to save document into knowledge_documents.';
        setKnowledgeError(errMessage);
        toast.error(errMessage);
        return;
      }

      const queuedDoc = mapSupabaseKnowledgeDocToFrontend(targetDocRow);
      updateDocInState(queuedDoc, workspaceId);

      setUploadedFile(null);
      setExtractedDoc(null);
      setDocTitle('');
      setDocContent('');
      setShowContentEditor(false);
      if (deviceFileInputRef.current) {
        deviceFileInputRef.current.value = '';
      }

      // Immediately process content_text into knowledge_chunks with text-embedding-3-small
      await triggerDocumentProcessing(workspaceId, targetAgentId, targetDocRow.id, false);
    } catch (err: any) {
      const errMessage =
        err?.message || 'An unexpected error occurred while saving the document.';
      setKnowledgeError(errMessage);
      toast.error(errMessage);
    } finally {
      setIsSavingDoc(false);
    }
  };

  const handleResetUploadedFile = () => {
    setUploadedFile(null);
    setExtractedDoc(null);
    setDocTitle('');
    setDocContent('');
    setKnowledgeError(null);
    setShowContentEditor(false);
    if (deviceFileInputRef.current) {
      deviceFileInputRef.current.value = '';
    }
  };

  const handleAddDoc = async () => {
    if (isSavingDoc) return;

    const trimmedTitle = docTitle.trim();
    const trimmedContent = docContent.trim();

    if (!trimmedTitle || !trimmedContent) {
      toast.error('Please provide a title and content for the knowledge document.');
      return;
    }

    if (isCorruptedDocxText(trimmedContent)) {
      const corruptMsg =
        'The entered content contains raw DOCX XML/ZIP metadata (Content_Types, document.xml, styles.xml). Please enter readable plain text.';
      setKnowledgeError(corruptMsg);
      toast.error(corruptMsg);
      return;
    }

    setIsSavingDoc(true);
    setKnowledgeError(null);

    try {
      const { workspaceId, agentId: targetAgentId } = await resolveKnowledgeWorkspaceAndAgent();
      const fileSizeBytes = new TextEncoder().encode(trimmedContent).length;
      const formattedSize = `${Math.max(1, Math.round(fileSizeBytes / 1024))} KB`;

      // Prevent duplicate documents if a failed/queued document with the same title already exists
      const existingPendingOrFailedDoc = docsRef.current.find(
        (d) =>
          d.name.trim().toLowerCase() === trimmedTitle.toLowerCase() &&
          (d.status === 'failed' || d.status === 'queued')
      );

      let targetDocRow: any = null;
      let saveError: any = null;

      if (existingPendingOrFailedDoc) {
        const { data: updatedRow, error: updateErr } = await supabase!
          .from('knowledge_documents')
          .update({
            title: trimmedTitle,
            source_type: 'text',
            content_text: trimmedContent,
            mime_type: 'text/plain',
            file_size_bytes: fileSizeBytes,
            chunk_count: 0,
            status: 'queued',
            error_message: null,
            metadata: {
              fileSize: formattedSize,
              type: 'text',
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPendingOrFailedDoc.id)
          .eq('workspace_id', workspaceId)
          .select('*')
          .single();

        targetDocRow = updatedRow;
        saveError = updateErr;
      } else {
        const { data: insertedRow, error: insertError } = await supabase!
          .from('knowledge_documents')
          .insert({
            workspace_id: workspaceId,
            agent_id: targetAgentId,
            title: trimmedTitle,
            source_type: 'text',
            storage_path: null,
            source_url: null,
            content_text: trimmedContent,
            mime_type: 'text/plain',
            file_size_bytes: fileSizeBytes,
            chunk_count: 0,
            status: 'queued',
            error_message: null,
            metadata: {
              fileSize: formattedSize,
              type: 'text',
            },
          })
          .select('*')
          .single();

        targetDocRow = insertedRow;
        saveError = insertError;
      }

      if (saveError || !targetDocRow) {
        const errMessage = saveError
          ? `${saveError.message}${saveError.details ? ` (${saveError.details})` : ''}`
          : 'Failed to insert document into knowledge_documents.';
        setKnowledgeError(errMessage);
        toast.error(errMessage);
        return;
      }

      const queuedDoc = mapSupabaseKnowledgeDocToFrontend(targetDocRow);
      updateDocInState(queuedDoc, workspaceId);

      setDocTitle('');
      setDocContent('');

      // Immediately process document via zivofy_ai Edge Function
      await triggerDocumentProcessing(workspaceId, targetAgentId, targetDocRow.id, false);
    } catch (err: any) {
      const errMessage =
        err?.message || 'An unexpected error occurred while saving the document.';
      setKnowledgeError(errMessage);
      toast.error(errMessage);
    } finally {
      setIsSavingDoc(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (deletingDocId === id) return;
    setDeletingDocId(id);
    setKnowledgeError(null);

    try {
      const { workspaceId } = await resolveKnowledgeWorkspaceAndAgent();

      // Remove associated chunks first
      await supabase!
        .from('knowledge_chunks')
        .delete()
        .eq('document_id', id)
        .eq('workspace_id', workspaceId);

      const { error: deleteError } = await supabase!
        .from('knowledge_documents')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspaceId);

      if (deleteError) {
        const errMessage = `${deleteError.message}${
          deleteError.details ? ` (${deleteError.details})` : ''
        }`;
        setKnowledgeError(errMessage);
        toast.error(errMessage);
        return;
      }

      const nextDocs = docs.filter((d) => d.id !== id);
      setDocs(nextDocs);
      if (agent) {
        onAgentUpdated({
          ...agent,
          workspaceId,
          knowledgeDocs: nextDocs,
        });
      }
      toast.info('Knowledge document removed');
    } catch (err: any) {
      const errMessage =
        err?.message || 'Failed to delete document from knowledge_documents.';
      setKnowledgeError(errMessage);
      toast.error(errMessage);
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleUpdateFeedback = async (
    messageId: string,
    rating: number,
    feedback: string,
    tags: string[] = []
  ): Promise<void> => {
    const { workspaceId, agentId: currentAgentId } =
      await resolveKnowledgeWorkspaceAndAgent();

    if (!isValidUuid(currentAgentId)) {
      throw new Error(
        'A valid saved agent is required before submitting feedback.'
      );
    }

    const targetMsg = chatMessages.find((m) => m.id === messageId);
    const realConversationId = isValidUuid(simulatorConversationId)
      ? simulatorConversationId
      : null;
    const candidateMessageId = targetMsg?.dbMessageId || messageId;
    const realMessageId = isValidUuid(candidateMessageId)
      ? candidateMessageId
      : null;

    const savedRecord = await saveSupabaseConversationFeedback({
      workspaceId,
      agentId: currentAgentId,
      conversationId: realConversationId,
      messageId: realMessageId,
      feedbackId: targetMsg?.feedbackId || null,
      rating,
      comment: feedback,
      tags,
    });

    // Update the local chat display and conversation history only after Supabase confirms persistence
    setChatMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              rating: savedRecord.rating,
              feedback: savedRecord.comment || '',
              feedbackTags: savedRecord.tags || [],
              feedbackId: savedRecord.id,
              feedbackCreatedAt: savedRecord.created_at,
            }
          : msg
      )
    );

    if (realConversationId && realMessageId) {
      setTestConversations((prev) =>
        prev.map((conv) =>
          conv.id === realConversationId
            ? {
                ...conv,
                messages: conv.messages.map((m) =>
                  m.id === realMessageId
                    ? {
                        ...m,
                        rating: savedRecord.rating,
                        feedback: savedRecord.comment || '',
                        feedbackTags: savedRecord.tags || [],
                        feedbackId: savedRecord.id,
                        feedbackCreatedAt: savedRecord.created_at,
                      }
                    : m
                ),
              }
            : conv
        )
      );
    }
  };

  /**
   * Starts a completely new persistent test conversation in Supabase (`public.conversations`),
   * generating a new unique conversation ID while keeping all previous test conversations saved.
   * Displays the new conversation as an empty conversation before the agent responds.
   */
  const handleStartNewConversation = async () => {
    if (isCreatingConversation || isWaitingReply) return;

    setSimulatorError(null);
    setIsCreatingConversation(true);

    try {
      const { workspaceId, agentId: currentAgentId } =
        await resolveKnowledgeWorkspaceAndAgent();

      const newConv = await createSupabaseTestConversation({
        workspaceId,
        agentId: currentAgentId,
      });

      setTestConversations((prev) => [
        newConv,
        ...prev.filter((c) => c.id !== newConv.id),
      ]);
      setSimulatorConversationId(newConv.id);
      setChatMessages([]);
      setChatInput('');
      toast.success('Started a new test conversation');
    } catch (err: any) {
      const errMsg =
        err?.message || 'Failed to start a new test conversation in Supabase.';
      const isAuth =
        errMsg.includes('401') ||
        errMsg.toLowerCase().includes('authentication required');
      setSimulatorError({
        status: isAuth ? 401 : 'CREATE_CONVERSATION_ERROR',
        message: errMsg,
        isAuthRequired: isAuth,
      });
      toast.error(errMsg);
    } finally {
      setIsCreatingConversation(false);
    }
  };

  /**
   * Switches to a previously saved test conversation from the conversation history list
   * and restores its ordered messages from Supabase.
   */
  const handleSelectTestConversation = async (targetConvId: string) => {
    if (
      !isValidUuid(targetConvId) ||
      isWaitingReply ||
      isCreatingConversation
    ) {
      return;
    }

    setSimulatorError(null);
    setSimulatorConversationId(targetConvId);

    const existingConv = testConversations.find((c) => c.id === targetConvId);
    if (existingConv) {
      setChatMessages(
        existingConv.messages.map(mapTestRecordToSimulatorMessage)
      );
      scrollTestChatToBottom();
    }

    try {
      const { workspaceId, agentId: currentAgentId } =
        await resolveKnowledgeWorkspaceAndAgent();
      const freshMessages = await getSupabaseTestConversationMessages({
        workspaceId,
        agentId: currentAgentId,
        conversationId: targetConvId,
      });

      if (activeAgentIdRef.current !== currentAgentId) return;

      setChatMessages(freshMessages.map(mapTestRecordToSimulatorMessage));
      setTestConversations((prev) =>
        prev.map((c) =>
          c.id === targetConvId
            ? {
                ...c,
                messages: freshMessages,
                message_count: freshMessages.length,
                last_message_text:
                  freshMessages[freshMessages.length - 1]?.content ||
                  c.last_message_text,
              }
            : c
        )
      );
      scrollTestChatToBottom();
    } catch (err: any) {
      const errMsg =
        err?.message || 'Failed to load messages for the selected conversation.';
      setSimulatorError({
        status: 'LOAD_CONVERSATION_ERROR',
        message: errMsg,
      });
    }
  };

  /**
   * Retries saving a message whose persistence to `public.messages` previously failed,
   * without losing the message or creating duplicates.
   */
  const handleRetrySaveMessage = async (failedMsg: SimulatorMessage) => {
    if (isWaitingReply) return;
    setSimulatorError(null);

    try {
      const { workspaceId, agentId: currentAgentId } =
        await resolveKnowledgeWorkspaceAndAgent();

      let activeConvId =
        simulatorConversationId && isValidUuid(simulatorConversationId)
          ? simulatorConversationId
          : null;

      if (!activeConvId) {
        const createdConv = await createSupabaseTestConversation({
          workspaceId,
          agentId: currentAgentId,
          title: failedMsg.text.slice(0, 60),
        });
        activeConvId = createdConv.id;
        setSimulatorConversationId(createdConv.id);
        setTestConversations((prev) => [
          createdConv,
          ...prev.filter((c) => c.id !== createdConv.id),
        ]);
      }

      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === failedMsg.id
            ? { ...m, saveStatus: 'saving', saveError: undefined }
            : m
        )
      );

      const savedMsg = await saveSupabaseTestMessage({
        workspaceId,
        agentId: currentAgentId,
        conversationId: activeConvId,
        sender: failedMsg.role,
        content: failedMsg.text,
        clientMessageId: failedMsg.clientMessageId || `retry-${failedMsg.id}`,
        sequence: failedMsg.sequence,
        existingDbMessageId: failedMsg.dbMessageId,
      });

      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === failedMsg.id
            ? {
                ...m,
                id: savedMsg.id,
                dbMessageId: savedMsg.id,
                timestamp: savedMsg.created_at,
                saveStatus: 'saved',
                saveError: undefined,
              }
            : m
        )
      );

      setTestConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== activeConvId) return conv;
          const exists = conv.messages.some((m) => m.id === savedMsg.id);
          const nextMsgs = exists
            ? conv.messages
            : [...conv.messages, savedMsg];
          return {
            ...conv,
            title:
              failedMsg.role === 'customer' &&
              (conv.title === 'New Test Conversation' || !conv.title)
                ? failedMsg.text.slice(0, 56)
                : conv.title,
            last_message_at: savedMsg.created_at,
            last_message_text: savedMsg.content,
            message_count: nextMsgs.length,
            messages: nextMsgs,
          };
        })
      );

      toast.success('Message saved to Supabase');
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to save message to Supabase.';
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === failedMsg.id
            ? { ...m, saveStatus: 'failed', saveError: errMsg }
            : m
        )
      );
      setSimulatorError({ status: 'SAVE_ERROR', message: errMsg });
      toast.error(errMsg);
    }
  };

  const handleSimulateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isWaitingReply || isCreatingConversation) return;

    const message = chatInput.trim();
    setSimulatorError(null);

    if (!supabase) {
      const configMsg = 'Supabase client is not configured.';
      console.error('[Test Agent] zivofy_ai error:', {
        status: 'CONFIG_ERROR',
        message: configMsg,
      });
      setSimulatorError({ status: 'CONFIG_ERROR', message: configMsg });
      return;
    }

    // 1. Verify active authenticated session & ensure fresh user JWT using the existing Supabase client
    let accessToken = '';
    try {
      const verified = await getVerifiedSupabaseAccessToken();
      accessToken = verified.accessToken;
    } catch (authErr: any) {
      const loginMsg =
        authErr?.message ||
        'Authentication required: Please log in to your account to test this agent.';
      console.error('[Test Agent] zivofy_ai auth error:', {
        status: 401,
        message: loginMsg,
      });
      setSimulatorError({
        status: 401,
        message: loginMsg,
        isAuthRequired: true,
      });
      return;
    }

    // 2. Resolve verified workspace_id and agent_id
    let workspace_id = '';
    let agent_id = '';
    try {
      const resolved = await resolveKnowledgeWorkspaceAndAgent();
      workspace_id = resolved.workspaceId;
      agent_id = resolved.agentId;
    } catch (resolveErr: any) {
      const errMsg =
        resolveErr?.message ||
        'Please save and create this agent before testing it.';
      setSimulatorError({ status: 400, message: errMsg });
      return;
    }

    setChatInput('');
    setIsWaitingReply(true);

    let activeConvId =
      simulatorConversationId && isValidUuid(simulatorConversationId)
        ? simulatorConversationId
        : null;

    const currentTurnBaseSeq = chatMessages.length + 1;
    const tempCustomerMsgId = `cust-${Date.now()}`;
    const userClientMsgId = `cust-${agent_id}-${Date.now()}`;
    const tempAgentMsgId = `agent-${Date.now() + 1}`;

    // Add optimistic user message with 'saving' status (not marked persisted until Supabase confirms)
    setChatMessages((prev) => [
      ...prev,
      {
        id: tempCustomerMsgId,
        clientMessageId: userClientMsgId,
        sequence: currentTurnBaseSeq,
        role: 'customer',
        text: message,
        timestamp: new Date().toISOString(),
        saveStatus: 'saving',
      },
    ]);
    scrollTestChatToBottom();

    try {
      // 3. Ensure a persistent test conversation exists in `public.conversations`
      if (!activeConvId) {
        const createdConv = await createSupabaseTestConversation({
          workspaceId: workspace_id,
          agentId: agent_id,
          title: message.slice(0, 60),
        });
        activeConvId = createdConv.id;
        setSimulatorConversationId(createdConv.id);
        setTestConversations((prev) => [
          createdConv,
          ...prev.filter((c) => c.id !== createdConv.id),
        ]);
      }

      // 4. Persist the user's message in `public.messages` BEFORE treating it as saved
      let savedUserMsg: AgentTestMessageRecord;
      try {
        savedUserMsg = await saveSupabaseTestMessage({
          workspaceId: workspace_id,
          agentId: agent_id,
          conversationId: activeConvId,
          sender: 'customer',
          content: message,
          clientMessageId: userClientMsgId,
          sequence: currentTurnBaseSeq,
        });
      } catch (userSaveErr: any) {
        const saveErrMsg =
          userSaveErr?.message ||
          'Failed to save user message to Supabase. Click Retry on the message to try again.';
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === tempCustomerMsgId
              ? { ...m, saveStatus: 'failed', saveError: saveErrMsg }
              : m
          )
        );
        setSimulatorError({ status: 'DB_SAVE_ERROR', message: saveErrMsg });
        return;
      }

      // Confirm user message persistence in UI state and conversation history
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === tempCustomerMsgId
            ? {
                ...m,
                id: savedUserMsg.id,
                dbMessageId: savedUserMsg.id,
                timestamp: savedUserMsg.created_at,
                saveStatus: 'saved',
              }
            : m
        )
      );

      setTestConversations((prev) => {
        const updatedList = prev.map((conv) => {
          if (conv.id !== activeConvId) return conv;
          const exists = conv.messages.some((m) => m.id === savedUserMsg.id);
          const nextMsgs = exists
            ? conv.messages
            : [...conv.messages, savedUserMsg];
          const nextTitle =
            conv.title === 'New Test Conversation' || !conv.title
              ? message.length > 56
                ? `${message.slice(0, 56)}…`
                : message
              : conv.title;
          return {
            ...conv,
            title: nextTitle,
            last_message_at: savedUserMsg.created_at,
            last_message_text: savedUserMsg.content,
            message_count: nextMsgs.length,
            messages: nextMsgs,
          };
        });
        return updatedList;
      });

      // 5. Invoke the deployed Edge Function with action: "chat" using the verified authenticated session JWT
      const chatRequestBody: {
        action: 'chat';
        workspace_id: string;
        agent_id: string;
        message: string;
        conversation_id: string;
      } = {
        action: 'chat',
        workspace_id,
        agent_id,
        message,
        conversation_id: activeConvId,
      };

      const { data, error } = await supabase.functions.invoke('zivofy_ai', {
        body: chatRequestBody,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        const diag = await extractEdgeFunctionDiagnosticError(error);
        console.error('[Test Agent] zivofy_ai error:', {
          status: diag.status,
          stage: diag.stage || 'edge_function',
          message: diag.formatted,
        });

        setSimulatorError({ status: diag.status, message: diag.formatted });
        setChatMessages((prev) => [
          ...prev,
          {
            id: tempAgentMsgId,
            role: 'agent',
            text: diag.formatted,
            timestamp: new Date().toISOString(),
            isError: true,
            errorStatus: diag.status,
          },
        ]);
        return;
      }

      if (
        data &&
        typeof data === 'object' &&
        (('error' in data && data.error) || data.ok === false || data.success === false)
      ) {
        const status =
          (data as any).status_code ||
          (data as any).statusCode ||
          (data as any).httpStatus ||
          (typeof (data as any).status === 'number' ? (data as any).status : 400);
        const stage = (data as any).stage ? ` [${(data as any).stage}]` : '';
        const rawErr =
          (data as any).error ||
          (data as any).message ||
          (data as any).details ||
          'Edge Function returned an error.';
        const errDetail =
          typeof rawErr === 'string'
            ? rawErr
            : JSON.stringify(rawErr, null, 2);
        const errMessage = errDetail.startsWith('HTTP ')
          ? errDetail
          : `HTTP ${status}${stage}: ${errDetail}`;

        setSimulatorError({ status, message: errMessage });
        setChatMessages((prev) => [
          ...prev,
          {
            id: tempAgentMsgId,
            role: 'agent',
            text: errMessage,
            timestamp: new Date().toISOString(),
            isError: true,
            errorStatus: status,
          },
        ]);
        return;
      }

      const rawMsgId = data?.message_id || data?.messageId;
      const edgeDbMessageId =
        typeof rawMsgId === 'string' && isValidUuid(rawMsgId)
          ? rawMsgId.trim()
          : null;

      const answer = data?.answer;
      if (typeof answer !== 'string' || !answer.trim()) {
        const missingMsg =
          'HTTP 502 [chat_response]: Edge Function responded without a valid data.answer field.';
        setSimulatorError({ status: 502, message: missingMsg });
        setChatMessages((prev) => [
          ...prev,
          {
            id: tempAgentMsgId,
            role: 'agent',
            text: missingMsg,
            timestamp: new Date().toISOString(),
            isError: true,
            errorStatus: 502,
          },
        ]);
        return;
      }

      const agentClientMsgId = `agent-reply-${savedUserMsg.id}`;
      const agentSeq = currentTurnBaseSeq + 1;

      // Display the AI response with 'saving' status while persisting to Supabase
      setChatMessages((prev) => [
        ...prev,
        {
          id: tempAgentMsgId,
          dbMessageId: edgeDbMessageId,
          clientMessageId: agentClientMsgId,
          sequence: agentSeq,
          role: 'agent',
          text: answer.trim(),
          timestamp: new Date().toISOString(),
          saveStatus: 'saving',
        },
      ]);
      scrollTestChatToBottom();

      // 6. Persist the AI-generated response in `public.messages` under the same conversation_id
      try {
        const savedAgentMsg = await saveSupabaseTestMessage({
          workspaceId: workspace_id,
          agentId: agent_id,
          conversationId: activeConvId,
          sender: 'agent',
          content: answer.trim(),
          clientMessageId: agentClientMsgId,
          sequence: agentSeq,
          existingDbMessageId: edgeDbMessageId,
        });

        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === tempAgentMsgId
              ? {
                  ...m,
                  id: savedAgentMsg.id,
                  dbMessageId: savedAgentMsg.id,
                  timestamp: savedAgentMsg.created_at,
                  saveStatus: 'saved',
                }
              : m
          )
        );

        setTestConversations((prev) => {
          const updated = prev.map((conv) => {
            if (conv.id !== activeConvId) return conv;
            const exists = conv.messages.some(
              (m) => m.id === savedAgentMsg.id
            );
            const nextMsgs = exists
              ? conv.messages
              : [...conv.messages, savedAgentMsg];
            return {
              ...conv,
              last_message_at: savedAgentMsg.created_at,
              last_message_text: savedAgentMsg.content,
              message_count: nextMsgs.length,
              messages: nextMsgs,
            };
          });
          // Keep most recently active conversation at top of history list
          return [...updated].sort(
            (a, b) =>
              new Date(b.last_message_at).getTime() -
              new Date(a.last_message_at).getTime()
          );
        });
      } catch (agentSaveErr: any) {
        const saveErrMsg =
          agentSaveErr?.message ||
          'Agent replied, but saving the response to Supabase failed. Click Retry Save below the response.';
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === tempAgentMsgId
              ? { ...m, saveStatus: 'failed', saveError: saveErrMsg }
              : m
          )
        );
        setSimulatorError({ status: 'DB_SAVE_ERROR', message: saveErrMsg });
      }
    } catch (err: any) {
      const status = err?.status || 'NETWORK_ERROR';
      const errMsg =
        err?.message || 'Unexpected error calling zivofy_ai Edge Function.';
      console.error('[Test Agent] zivofy_ai exception:', {
        status,
        message: errMsg,
      });
      setSimulatorError({ status, message: errMsg });
      setChatMessages((prev) => [
        ...prev,
        {
          id: tempAgentMsgId,
          role: 'agent',
          text: errMsg,
          timestamp: new Date().toISOString(),
          isError: true,
          errorStatus: status,
        },
      ]);
    } finally {
      setIsWaitingReply(false);
      scrollTestChatToBottom();
    }
  };

  const handleConfirmDelete = async () => {
    if (!agent) return;

    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/agents/${agent.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        if (onAgentDeleted) {
          onAgentDeleted(agent.id);
        }
        toast.success(`Agent "${agent.name}" deleted successfully`);
        onNavigate('/agents');
      } else {
        toast.error('Failed to delete agent');
      }
    } catch {
      toast.error('Could not delete agent');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => onNavigate('/agents')}
          className="hover:text-foreground transition-colors cursor-pointer"
        >
          ← All agents
        </button>
        {isNewAgent && (
          <>
            <span>/</span>
            <span className="text-foreground font-medium">New agent</span>
          </>
        )}
      </div>

      {/* Header with Switch, Save & Three-dot Menu */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {isNewAgent ? (name || 'Create New Agent') : (name || agent?.name)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isNewAgent
              ? 'Configure instructions, connected channels, database tools, notifications, and availability.'
              : 'Configure prompt, knowledge, database tools, notifications, and test responses.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs font-semibold text-foreground">Agent Active</span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 accent-emerald-600 rounded cursor-pointer"
            />
          </label>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-5 py-2 text-sm font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer ${
              isNewAgent
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800'
                : 'bg-primary text-primary-foreground hover:opacity-95'
            }`}
          >
            {saving ? (isNewAgent ? 'Creating agent…' : 'Saving…') : isNewAgent ? 'Create agent' : 'Save changes'}
          </button>

          {/* Three-dot menu button (only on existing agents) */}
          {!isNewAgent && agent && (
            <div className="relative">
              <button
                id="agent-detail-menu-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className={`p-2 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer ${
                  isMenuOpen ? 'bg-accent text-foreground' : ''
                }`}
                title="More options"
                aria-label="Agent options"
              >
                <MoreVertical className="size-4" />
              </button>

              {/* Pop-up options menu */}
              {isMenuOpen && (
                <div
                  id="agent-detail-popover-menu"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-border bg-popover shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
                >
                  <button
                    type="button"
                    id="agent-detail-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      setShowDeleteModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
                  >
                    <Trash2 className="size-3.5 text-destructive shrink-0" />
                    <span>Delete agent</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex gap-2 border-b border-border pb-px overflow-x-auto">
        {[
          { key: 'instructions', label: 'Instructions' },
          { key: 'tools', label: 'Agent tools' },
          { key: 'knowledge', label: 'Knowledge' },
          { key: 'availability', label: 'Availability' },
          { key: 'try', label: 'Test Agent' },
          { key: 'notifications', label: 'Notifications' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === tab.key
                ? 'border-primary text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Instructions */}
      {activeTab === 'instructions' && (
        <div className="space-y-6">
          <div className="surface-card rounded-2xl border border-border bg-card space-y-5 p-6 shadow-xs">
            <div className="space-y-1.5">
              <label htmlFor="agentName" className="text-xs font-bold text-foreground">
                Agent name <span className="text-destructive">*</span>
              </label>
              <input
                id="agentName"
                type="text"
                placeholder="e.g. VIP Concierge Desk, After-Hours Support, Booking Bot"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="duties" className="text-xs font-bold text-foreground">
                Role and duties
              </label>
              <textarea
                id="duties"
                rows={5}
                value={roleAndDuties}
                onChange={(e) => setRoleAndDuties(e.target.value)}
                placeholder="Describe what this agent does, what it should never do, and how it should assist customers."
                className="w-full rounded-xl border border-border bg-background p-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-2xs leading-relaxed"
              />
            </div>

            {/* Custom Agent Voice (under Roles and Duties) */}
            <CustomAgentVoiceSection
              value={customVoice}
              onChange={setCustomVoice}
            />

            <div className="space-y-1.5">
              <label htmlFor="opening" className="text-xs font-bold text-foreground">
                Opening line (optional)
              </label>
              <input
                id="opening"
                type="text"
                placeholder="Hello! Welcome to our store. How can I help you today?"
                value={openingLine}
                onChange={(e) => setOpeningLine(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="tone" className="text-xs font-bold text-foreground">
                Tone
              </label>
              <input
                id="tone"
                type="text"
                placeholder="e.g. Friendly, professional, warm, concise…"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-2xs"
              />
            </div>
          </div>

          {/* Connected Channels Selector */}
          <div className="surface-card rounded-2xl border border-border bg-card space-y-4 p-6 shadow-xs">
            <div>
              <div className="text-sm font-bold text-foreground">Connected channels</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select which communication channels this agent is authorized to handle.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { id: 'whatsapp' as PlatformType, name: 'WhatsApp', icon: Phone, color: 'text-[#25D366]' },
                { id: 'instagram' as PlatformType, name: 'Instagram', icon: Instagram, color: 'text-[#E1306C]' },
                { id: 'tiktok' as PlatformType, name: 'TikTok', icon: TikTokLogo, color: 'text-foreground' },
                { id: 'call' as PlatformType, name: 'Phone call', icon: PhoneCall, color: 'text-amber-500' },
                { id: 'messenger' as PlatformType, name: 'Messenger', icon: Facebook, color: 'text-[#0866FF]' },
              ].map((item) => {
                const isSelected = (platforms || []).includes(item.id);
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => togglePlatform(item.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col items-center text-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-foreground font-semibold shadow-2xs'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    <Icon className={`size-5 ${isSelected ? item.color : 'text-muted-foreground'}`} />
                    <span className="text-xs">{item.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isSelected ? 'Enabled' : 'Disabled'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* What it replies to */}
          {showWhatItRepliesTo && (
            <WhatItRepliesToSection
              value={whatItRepliesTo}
              onChange={setWhatItRepliesTo}
              platforms={platforms}
            />
          )}
        </div>
      )}

      {/* Tab: Agent tools */}
      {activeTab === 'tools' && (
        <div className="space-y-6">
          <GoogleWorkspaceSection
            value={googleWorkspaceConfig}
            workspaceId={verifiedWorkspaceId || agent?.workspaceId || null}
            agentId={!isNewAgent ? agent?.id || null : null}
            onChange={(updated) => {
              setGoogleWorkspaceConfig(updated);
              if (updated.sheets) {
                setSheetToolConfig(updated.sheets);
              }
            }}
          />
          <Microsoft365Section
            value={microsoft365Config}
            onChange={setMicrosoft365Config}
          />
          <SalesforceSection
            value={salesforceConfig}
            onChange={setSalesforceConfig}
          />
          <HubSpotSection
            value={hubspotConfig}
            onChange={setHubspotConfig}
          />
        </div>
      )}

      {/* Tab: Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <NotificationChannelsSection
            value={notificationsConfig}
            onChange={setNotificationsConfig}
          />
        </div>
      )}

      {/* Tab: Knowledge */}
      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          <div className="surface-card rounded-2xl border border-border bg-card space-y-5 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  Business Knowledge Base
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload documents from your personal device or type knowledge manually so your agent provides factual, grounded answers.
                </p>
              </div>

              {/* Mode Toggle: Upload from Device vs Manual Input */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border self-start sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => setKnowledgeMode('upload')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    knowledgeMode === 'upload'
                      ? 'bg-card text-foreground shadow-2xs border border-border/80'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <HardDrive className="size-3.5 text-primary" />
                  <span>Upload from Device</span>
                </button>
                <button
                  type="button"
                  onClick={() => setKnowledgeMode('manual')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    knowledgeMode === 'manual'
                      ? 'bg-card text-foreground shadow-2xs border border-border/80'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileText className="size-3.5" />
                  <span>Enter Manually</span>
                </button>
              </div>
            </div>

            {/* Hidden file input targeting personal device files */}
            <input
              ref={deviceFileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.csv,.doc,.docx,.json,.rtf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleDeviceFileSelect(file);
              }}
            />

            {/* MODE 1: Upload from Personal Device */}
            {knowledgeMode === 'upload' && (
              <div className="space-y-4">
                {!uploadedFile ? (
                  /* Drag and Drop / Device Browse Area */
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingOver(true);
                    }}
                    onDragLeave={() => setIsDraggingOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleDeviceFileSelect(file);
                    }}
                    onClick={() => deviceFileInputRef.current?.click()}
                    className={`group relative rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                      isDraggingOver
                        ? 'border-primary bg-primary/5 ring-4 ring-primary/10'
                        : 'border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 group-hover:scale-105 transition-transform shadow-2xs">
                        <FileUp className="size-6.5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">
                          Choose a document from your personal device
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Drag and drop your file here, or click to browse files from your computer or phone
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
                        <span className="px-2 py-0.5 rounded-md bg-muted font-medium border border-border">PDF</span>
                        <span className="px-2 py-0.5 rounded-md bg-muted font-medium border border-border">TXT</span>
                        <span className="px-2 py-0.5 rounded-md bg-muted font-medium border border-border">DOCX</span>
                        <span className="px-2 py-0.5 rounded-md bg-muted font-medium border border-border">CSV</span>
                        <span className="px-2 py-0.5 rounded-md bg-muted font-medium border border-border">Markdown</span>
                        <span className="px-2 py-0.5 rounded-md bg-muted font-medium border border-border">JSON</span>
                        <span className="text-[10px] text-muted-foreground ml-1">Up to 25MB</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deviceFileInputRef.current?.click();
                        }}
                        className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2 text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                      >
                        <HardDrive className="size-3.5" />
                        <span>Browse Files from Device</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Uploaded File Confirmation & Configuration Card */
                  <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-2xs animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 ring-1 ring-primary/20">
                          {isReadingFile ? (
                            <Loader2 className="size-5.5 animate-spin" />
                          ) : (
                            <FileCheck className="size-5.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground truncate block max-w-xs sm:max-w-md">
                              {uploadedFile.name}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border shrink-0">
                              {extractedDoc?.fileSize || `${Math.round(uploadedFile.size / 1024)} KB`}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="size-3 shrink-0" />
                            <span>
                              {isReadingFile ? 'Extracting text content...' : 'Loaded from device & ready to vectorize'}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => deviceFileInputRef.current?.click()}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          Change file
                        </button>
                        <button
                          type="button"
                          onClick={handleResetUploadedFile}
                          className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>

                    {/* Document Title Input */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Document Name in Knowledge Base
                      </label>
                      <input
                        type="text"
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        placeholder="e.g. Return Policy & Pricing Guide"
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-2xs"
                      />
                    </div>

                    {/* Extracted Text Preview / Editor */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          Extracted Text Preview ({extractedDoc?.content?.length || 0} characters)
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowContentEditor(!showContentEditor)}
                          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>{showContentEditor ? 'Collapse editor' : 'Edit extracted text before adding'}</span>
                          {showContentEditor ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                        </button>
                      </div>

                      {showContentEditor ? (
                        <textarea
                          rows={6}
                          value={docContent}
                          onChange={(e) => setDocContent(e.target.value)}
                          placeholder="Edit or refine the document content..."
                          className="w-full rounded-xl border border-border bg-background p-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-2xs leading-relaxed font-sans"
                        />
                      ) : (
                        <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground max-h-36 overflow-y-auto leading-relaxed whitespace-pre-wrap font-sans">
                          {docContent || extractedDoc?.content || 'No text extracted'}
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={handleResetUploadedFile}
                        disabled={isSavingDoc}
                        className="px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddUploadedDoc}
                        disabled={
                          isSavingDoc ||
                          isReadingFile ||
                          (!docContent.trim() && !extractedDoc?.content?.trim())
                        }
                        className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        {isSavingDoc ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            <span>Saving to Database...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="size-3.5" />
                            <span>Add Document to Knowledge Base</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODE 2: Enter Manually */}
            {knowledgeMode === 'manual' && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Document Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Return Policy, Pricing Guide, FAQ"
                    value={docTitle}
                    onChange={(e) => {
                      setDocTitle(e.target.value);
                      if (knowledgeError) setKnowledgeError(null);
                    }}
                    disabled={isSavingDoc}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-2xs disabled:opacity-60"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    Document Content
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Enter detailed instructions, policies, prices, product descriptions, or answers..."
                    value={docContent}
                    onChange={(e) => {
                      setDocContent(e.target.value);
                      if (knowledgeError) setKnowledgeError(null);
                    }}
                    disabled={isSavingDoc}
                    className="w-full rounded-xl border border-border bg-background p-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-2xs leading-relaxed disabled:opacity-60"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddDoc}
                    disabled={isSavingDoc || !docTitle.trim() || !docContent.trim()}
                    className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    {isSavingDoc ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Saving to Database...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="size-3.5" />
                        <span>Add to Knowledge Base</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Database Insertion Error Banner */}
            {knowledgeError && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold">Failed to save knowledge document</p>
                    <p className="text-destructive/90 leading-relaxed break-words">
                      {knowledgeError}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setKnowledgeError(null)}
                  className="p-1 rounded-lg hover:bg-destructive/15 transition-colors shrink-0 cursor-pointer"
                  title="Dismiss error"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* List of Knowledge Docs */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Current Knowledge Base ({docs.length})
            </h3>
            {docs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center text-xs text-muted-foreground">
                No knowledge documents attached yet. Upload a document from your personal device or type knowledge above to ground your agent responses.
              </div>
            ) : (
              <div className="grid gap-3">
                {docs.map((doc) => {
                  const isDocProcessing =
                    doc.status === 'processing' || processingDocIds.includes(doc.id);
                  const isDocReady = doc.status === 'ready' && (doc.chunkCount ?? 0) > 0;
                  const isDocFailed = doc.status === 'failed';
                  const statusLabel = isDocProcessing
                    ? 'Processing'
                    : isDocReady
                    ? 'Ready'
                    : isDocFailed
                    ? 'Failed'
                    : 'Queued';

                  return (
                    <div
                      key={doc.id}
                      className="flex items-start justify-between gap-3 p-4 rounded-2xl border border-border bg-card shadow-xs group"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 ring-1 ring-primary/20">
                          <FileText className="size-4" />
                        </div>
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-foreground truncate block">
                              {doc.name}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border shrink-0">
                              {doc.fileSize ||
                                `${Math.max(1, Math.round(doc.content.length / 1024))} KB`}
                            </span>
                            {doc.sourceType && (
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border shrink-0">
                                {doc.sourceType}
                              </span>
                            )}
                            {isDocReady && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                                {doc.chunkCount} {doc.chunkCount === 1 ? 'chunk' : 'chunks'}
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                                isDocReady
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : isDocFailed
                                  ? 'bg-destructive/10 text-destructive border-destructive/20'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              }`}
                            >
                              {isDocProcessing && (
                                <Loader2 className="size-2.5 animate-spin" />
                              )}
                              <span>{statusLabel}</span>
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {doc.content}
                          </p>
                          {isDocFailed && doc.errorMessage && (
                            <p className="text-[11px] text-destructive font-medium leading-snug pt-0.5">
                              Error: {doc.errorMessage}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(!isDocReady || isDocFailed) && (
                          <button
                            type="button"
                            onClick={() => handleRetryProcessDoc(doc.id)}
                            disabled={isDocProcessing || deletingDocId === doc.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 cursor-pointer"
                            title="Process chunks and generate embeddings"
                          >
                            <RefreshCw
                              className={`size-3.5 ${
                                isDocProcessing ? 'animate-spin' : ''
                              }`}
                            />
                            <span>{isDocFailed ? 'Retry' : 'Process'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteDoc(doc.id)}
                          disabled={deletingDocId === doc.id || isDocProcessing}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                          title="Delete document"
                        >
                          {deletingDocId === doc.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Availability */}
      {activeTab === 'availability' && (
        <div className="space-y-6">
          <div className="surface-card rounded-2xl border border-border bg-card space-y-6 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
              <div>
                <h3 className="text-base font-bold text-foreground">Operating Schedule</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Control when this agent autonomously replies vs when inquiries are held.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-muted p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIs24x7(true)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    is24x7 ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  24/7 Autonomous
                </button>
                <button
                  type="button"
                  onClick={() => setIs24x7(false)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    !is24x7 ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Custom Hours
                </button>
              </div>
            </div>

            {!is24x7 && (
              <div className="space-y-5 animate-in fade-in">
                {/* Active Days */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground">Active Days</label>
                  <div className="flex flex-wrap gap-2">
                    {dayNames.map((day, idx) => {
                      const isSelected = (activeDays || []).includes(idx);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setActiveDays((prev) => {
                              const safe = prev || [];
                              return safe.includes(idx)
                                ? safe.filter((d) => d !== idx)
                                : [...safe, idx];
                            });
                          }}
                          className={`size-10 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'bg-muted text-muted-foreground hover:bg-accent'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={startHour}
                      onChange={(e) => setStartHour(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={endHour}
                      onChange={(e) => setEndHour(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none shadow-2xs"
                    />
                  </div>
                </div>

                {/* Timezone */}
                <div className="space-y-2.5">
                  <label className="text-xs font-semibold text-foreground block">
                    Timezone
                  </label>

                  {/* Search bar at the top of Timezone */}
                  <div className="relative">
                    <Search className="size-3.5 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={timezoneSearch}
                      onChange={(e) => setTimezoneSearch(e.target.value)}
                      placeholder="Search timezone by country, city, or UTC offset (e.g. Nigeria, London, India, UTC+1)..."
                      className="w-full rounded-xl border border-border bg-background pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-2xs"
                    />
                    {timezoneSearch && (
                      <button
                        type="button"
                        onClick={() => setTimezoneSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label="Clear timezone search"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Quick-select matching results when searching */}
                  {timezoneSearch.trim() !== '' && (
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-background divide-y divide-border shadow-sm">
                      {(() => {
                        const q = timezoneSearch.trim().toLowerCase();
                        const matches = ALL_TIMEZONES.filter(
                          (tz) =>
                            tz.label.toLowerCase().includes(q) ||
                            tz.value.toLowerCase().includes(q) ||
                            tz.group.toLowerCase().includes(q) ||
                            tz.keywords.toLowerCase().includes(q)
                        );
                        if (matches.length === 0) {
                          return (
                            <div className="px-3.5 py-3 text-xs text-muted-foreground">
                              No matching timezones found for &ldquo;{timezoneSearch}&rdquo;.
                            </div>
                          );
                        }
                        return matches.map((tz) => {
                          const isCurrent = timezone === tz.value;
                          return (
                            <button
                              key={tz.value}
                              type="button"
                              onClick={() => {
                                setTimezone(tz.value);
                                setTimezoneSearch('');
                              }}
                              className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                isCurrent
                                  ? 'bg-primary/10 text-primary font-semibold'
                                  : 'text-foreground hover:bg-muted/60'
                              }`}
                            >
                              <div>
                                <div>{tz.label}</div>
                                <div className="text-[10px] text-muted-foreground">{tz.group} • {tz.value}</div>
                              </div>
                              {isCurrent && <CheckCircle2 className="size-3.5 text-primary shrink-0" />}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  )}

                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none shadow-2xs"
                  >
                    {TIMEZONE_GROUPS.map((group) => {
                      const q = timezoneSearch.trim().toLowerCase();
                      const filteredOptions = q
                        ? group.options.filter(
                            (opt) =>
                              opt.value === timezone ||
                              opt.label.toLowerCase().includes(q) ||
                              opt.value.toLowerCase().includes(q) ||
                              group.label.toLowerCase().includes(q) ||
                              opt.keywords.toLowerCase().includes(q)
                          )
                        : group.options;

                      if (filteredOptions.length === 0) return null;

                      return (
                        <optgroup key={group.label} label={group.label}>
                          {filteredOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Try it (Test Agent) */}
      {activeTab === 'try' && (
        <div className="space-y-4">
          <div className="surface-card rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            {/* Header & New Conversation Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">
                    Agent Simulator
                  </h3>
                  {simulatorConversationId && (
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border"
                      title={`Active Conversation ID: ${simulatorConversationId}`}
                    >
                      #{simulatorConversationId.slice(0, 8)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Test your agent. All conversations and messages are saved permanently in Supabase. Hover over any agent reply to rate and submit feedback.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="test-agent-new-conversation-btn"
                  disabled={isCreatingConversation || isWaitingReply || isNewAgent}
                  onClick={handleStartNewConversation}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-xl px-3.5 py-2 bg-primary text-primary-foreground hover:opacity-95 disabled:opacity-50 transition-opacity shadow-xs cursor-pointer"
                >
                  {isCreatingConversation ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Starting…</span>
                    </>
                  ) : (
                    <>
                      <Plus className="size-3.5" />
                      <span>New Conversation</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Saved Test Conversations History Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <History className="size-3.5 text-primary" />
                  <span>
                    Saved Test Conversations ({testConversations.length})
                  </span>
                </div>
                {isLoadingTestHistory && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" />
                    <span>Syncing history…</span>
                  </span>
                )}
              </div>

              {testConversations.length > 0 ? (
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
                  {testConversations.map((conv, idx) => {
                    const isSelected = conv.id === simulatorConversationId;
                    const formattedDate = new Date(
                      conv.last_message_at || conv.created_at
                    ).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <button
                        key={conv.id}
                        type="button"
                        onClick={() => handleSelectTestConversation(conv.id)}
                        disabled={isWaitingReply || isCreatingConversation}
                        className={`group flex flex-col items-start gap-1 rounded-xl border px-3 py-2 text-left transition-all shrink-0 max-w-[230px] cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-foreground shadow-2xs'
                            : 'border-border bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className="text-xs font-semibold truncate max-w-[145px]">
                            {conv.title || `Conversation #${testConversations.length - idx}`}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-md font-medium shrink-0 ${
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {conv.message_count}{' '}
                            {conv.message_count === 1 ? 'msg' : 'msgs'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 w-full text-[10px] text-muted-foreground">
                          <span className="font-mono">
                            #{conv.id.slice(0, 6)}
                          </span>
                          <span>{formattedDate}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                !isLoadingTestHistory && (
                  <div className="rounded-xl border border-dashed border-border bg-muted/15 px-3.5 py-2 text-[11px] text-muted-foreground">
                    No saved test conversations for this agent yet. Send a message below or click <span className="font-semibold text-foreground">New Conversation</span> to begin.
                  </div>
                )
              )}
            </div>

            {simulatorError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive space-y-1.5">
                <div className="font-semibold flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="size-3.5 shrink-0" />
                    <span>
                      {simulatorError.isAuthRequired
                        ? 'Login Required'
                        : `Test Agent Error${
                            simulatorError.status !== undefined
                              ? ` (Status: ${simulatorError.status})`
                              : ''
                          }`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {simulatorError.isAuthRequired && (
                      <button
                        type="button"
                        onClick={() => onNavigate('/auth')}
                        className="rounded-lg bg-destructive text-white px-2.5 py-1 text-[11px] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        Log in
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSimulatorError(null)}
                      className="p-1 rounded-lg hover:bg-destructive/15 transition-colors cursor-pointer"
                      title="Dismiss error"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
                  {simulatorError.message}
                </pre>
              </div>
            )}

            {/* Chat Box */}
            <div
              ref={chatScrollContainerRef}
              className="h-96 overflow-y-auto rounded-xl border border-border bg-muted/15 p-4 space-y-4"
            >
              {isLoadingTestHistory && chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-5 text-primary animate-spin" />
                  <span>Loading saved test conversation from Supabase…</span>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-2">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <MessageSquare className="size-5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    {simulatorConversationId
                      ? 'New test conversation started'
                      : 'Start testing your AI agent'}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                    Send a message below to test {name || 'your agent'}. Every user message and AI response in this conversation will be saved permanently in Supabase.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <SimulatorMessageBubble
                    key={msg.id}
                    message={msg}
                    onUpdateFeedback={handleUpdateFeedback}
                    onRetrySaveMessage={handleRetrySaveMessage}
                  />
                ))
              )}

              {isWaitingReply && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-none bg-card border border-border px-4 py-2.5 text-xs text-muted-foreground shadow-xs flex items-center gap-2">
                    <Loader2 className="size-3.5 text-primary animate-spin shrink-0" />
                    <span>Agent is generating response…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSimulateChat} className="flex gap-2">
              <input
                type="text"
                disabled={isWaitingReply || isCreatingConversation}
                placeholder="Ask a question, request price, or test your agent's knowledge..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-2xs disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={
                  !chatInput.trim() || isWaitingReply || isCreatingConversation
                }
                className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isWaitingReply ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Sending…</span>
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Prompt Modal */}
      {showDeleteModal && (
        <DeleteAgentModal
          isOpen={showDeleteModal}
          agentName={agent?.name || ''}
          isDeleting={isDeleting}
          onConfirm={handleConfirmDelete}
          onClose={() => {
            if (!isDeleting) setShowDeleteModal(false);
          }}
        />
      )}
    </div>
  );
};
