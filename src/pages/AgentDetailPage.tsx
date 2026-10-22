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
} from 'lucide-react';
import { toast } from 'sonner';
import { extractTextFromFile, ExtractedDocumentResult } from '../lib/fileTextExtractor';
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
  >('instructions');

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

  // What it replies to appears when Instagram or Facebook is connected
  const showWhatItRepliesTo = isInstagramActive || isFacebookActive;

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
  const [knowledgeMode, setKnowledgeMode] = useState<'upload' | 'manual'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedDoc, setExtractedDoc] = useState<ExtractedDocumentResult | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showContentEditor, setShowContentEditor] = useState(false);
  const deviceFileInputRef = useRef<HTMLInputElement | null>(null);

  // Try it simulator state
  const [chatMessages, setChatMessages] = useState<SimulatorMessage[]>([
    {
      id: 'initial-greeting',
      role: 'agent',
      text: openingLine || `Hello! I'm ${name || 'your agent'}. How can I assist you today?`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isWaitingReply, setIsWaitingReply] = useState(false);

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

    try {
      const extracted = await extractTextFromFile(file);
      setExtractedDoc(extracted);
      setDocTitle(extracted.title);
      setDocContent(extracted.content);
      toast.success(`Loaded "${file.name}" from your device`);
    } catch (err) {
      console.error('File parsing error:', err);
      toast.error('Could not extract text from document. You can still paste its text manually.');
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleAddUploadedDoc = () => {
    if (!uploadedFile && !extractedDoc) {
      toast.error('Please choose a file from your device first.');
      return;
    }

    const finalTitle = (docTitle.trim() || extractedDoc?.title || uploadedFile?.name || 'Document').trim();
    const finalContent = (docContent.trim() || extractedDoc?.content || '').trim();

    if (!finalContent) {
      toast.error('The document does not have readable text. Please review or enter content.');
      return;
    }

    const newDoc: KnowledgeDocument = {
      id: `doc_${Date.now()}`,
      name: finalTitle,
      content: finalContent,
      type: extractedDoc?.type || (uploadedFile?.name.endsWith('.pdf') ? 'pdf' : 'text'),
      chunkCount: Math.max(1, Math.ceil(finalContent.length / 400)),
      fileSize: extractedDoc?.fileSize || `${Math.max(1, Math.round(finalContent.length / 1024))} KB`,
      createdAt: new Date().toISOString(),
    };

    setDocs((prev) => [newDoc, ...prev]);
    setUploadedFile(null);
    setExtractedDoc(null);
    setDocTitle('');
    setDocContent('');
    setShowContentEditor(false);
    if (deviceFileInputRef.current) {
      deviceFileInputRef.current.value = '';
    }
    toast.success(`"${finalTitle}" added to knowledge base`);
  };

  const handleResetUploadedFile = () => {
    setUploadedFile(null);
    setExtractedDoc(null);
    setDocTitle('');
    setDocContent('');
    setShowContentEditor(false);
    if (deviceFileInputRef.current) {
      deviceFileInputRef.current.value = '';
    }
  };

  const handleAddDoc = () => {
    if (!docTitle.trim() || !docContent.trim()) {
      toast.error('Please provide a title and content for the knowledge document.');
      return;
    }
    const newDoc: KnowledgeDocument = {
      id: String(Date.now()),
      name: docTitle.trim(),
      content: docContent.trim(),
      type: 'text',
      chunkCount: Math.ceil(docContent.length / 500) || 1,
      createdAt: new Date().toISOString(),
    };
    setDocs([...docs, newDoc]);
    setDocTitle('');
    setDocContent('');
    toast.success('Knowledge document added');
  };

  const handleDeleteDoc = (id: string) => {
    setDocs(docs.filter((d) => d.id !== id));
    toast.info('Knowledge document removed');
  };

  const handleUpdateFeedback = (messageId: string, rating: number, feedback: string) => {
    setChatMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, rating, feedback, feedbackCreatedAt: new Date().toISOString() }
          : msg
      )
    );
  };

  const handleClearChat = () => {
    setChatMessages([
      {
        id: `greeting-${Date.now()}`,
        role: 'agent',
        text: openingLine || `Hello! I'm ${name || 'your agent'}. How can I assist you today?`,
        timestamp: new Date().toISOString(),
      },
    ]);
    toast.info('Simulator reset');
  };

  const handleSimulateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isWaitingReply) return;

    const userText = chatInput.trim();
    const customerMsgId = `cust-${Date.now()}`;
    const agentMsgId = `agent-${Date.now() + 1}`;

    setChatInput('');
    setChatMessages((prev) => [
      ...prev,
      { id: customerMsgId, role: 'customer', text: userText, timestamp: new Date().toISOString() },
    ]);
    setIsWaitingReply(true);

    try {
      const res = await apiFetch('/api/simulator/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent?.id || 'new-preview',
          customerMessage: userText,
          agentOverrides: {
            name,
            roleAndDuties,
            openingLine,
            tone,
            knowledgeDocs: docs,
            tools: {
              googleSheet: sheetToolConfig,
              notifications: notificationsConfig,
            },
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [
          ...prev,
          {
            id: agentMsgId,
            role: 'agent',
            text: data.reply || 'Thank you for reaching out.',
            timestamp: new Date().toISOString(),
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            id: agentMsgId,
            role: 'agent',
            text: 'I am here to help you. (Simulated response)',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: agentMsgId,
          role: 'agent',
          text: 'Thank you for reaching out! How can I assist you further?',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsWaitingReply(false);
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'instagram' as PlatformType, name: 'Instagram', icon: Instagram, color: 'text-[#E1306C]' },
                { id: 'messenger' as PlatformType, name: 'Facebook', icon: Facebook, color: 'text-[#0866FF]' },
                { id: 'whatsapp' as PlatformType, name: 'WhatsApp', icon: Phone, color: 'text-[#25D366]' },
                { id: 'call' as PlatformType, name: 'Phone Calls', icon: PhoneCall, color: 'text-amber-500' },
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
                        className="px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddUploadedDoc}
                        disabled={isReadingFile || (!docContent.trim() && !extractedDoc?.content?.trim())}
                        className="rounded-xl bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                        <span>Add Document to Knowledge Base</span>
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
                    onChange={(e) => setDocTitle(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-2xs"
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
                    onChange={(e) => setDocContent(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background p-3.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-2xs leading-relaxed"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddDoc}
                    disabled={!docTitle.trim() || !docContent.trim()}
                    className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="size-3.5" />
                    <span>Add to Knowledge Base</span>
                  </button>
                </div>
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
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between gap-3 p-4 rounded-2xl border border-border bg-card shadow-xs group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 ring-1 ring-primary/20">
                        <FileText className="size-4" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground truncate block">
                            {doc.name}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border shrink-0">
                            {doc.fileSize || `${Math.max(1, Math.round(doc.content.length / 1024))} KB`}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {doc.content}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 cursor-pointer"
                      title="Delete document"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
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

      {/* Tab: Try it */}
      {activeTab === 'try' && (
        <div className="space-y-4">
          <div className="surface-card rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Agent Simulator</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Test your agent. Hover over any agent reply to rate with stars and submit feedback or improvement suggestions.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClearChat}
                className="text-xs text-muted-foreground hover:text-foreground font-medium rounded-lg px-2.5 py-1.5 border border-border bg-background hover:bg-accent transition-colors cursor-pointer"
              >
                Reset chat
              </button>
            </div>

            {/* Chat Box */}
            <div className="h-96 overflow-y-auto rounded-xl border border-border bg-muted/15 p-4 space-y-4">
              {chatMessages.map((msg) => (
                <SimulatorMessageBubble
                  key={msg.id}
                  message={msg}
                  onUpdateFeedback={handleUpdateFeedback}
                />
              ))}

              {isWaitingReply && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-tl-none bg-card border border-border px-4 py-2.5 text-xs text-muted-foreground animate-pulse shadow-xs flex items-center gap-1.5">
                    <Bot className="size-3.5 text-primary" />
                    <span>Agent is generating response…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSimulateChat} className="flex gap-2">
              <input
                type="text"
                placeholder="Ask a question, request price, or test your agent's knowledge..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-2xs"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isWaitingReply}
                className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Send className="size-3.5" />
                <span>Send</span>
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
