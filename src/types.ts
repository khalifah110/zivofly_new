export type PlatformType = 'instagram' | 'whatsapp' | 'messenger' | 'call';

export interface User {
  id: string;
  name: string;
  email: string;
  businessName: string;
  avatarUrl?: string;
}

export interface AvailabilitySchedule {
  is24x7: boolean;
  timezone: string;
  startHour: string; // "09:00"
  endHour: string;   // "18:00"
  activeDays: number[]; // [1,2,3,4,5] (Monday to Friday)
}

export interface PlatformConfig {
  // Instagram specific
  instagram?: {
    connected: boolean;
    igUsername?: string;
    igName?: string;
    profileBio?: string;
    followerCount?: number;
    replyDMs: boolean;
    replyComments: boolean;
    replyTags: boolean;
    commentKeywords: string[]; // e.g. ["price", "cost", "link", "buy", "info"]
    tagAllowedAccounts: string[]; // e.g. ["all", "@vip_partner"]
    trainedOnBioAndPosts: boolean;
  };
  // WhatsApp specific
  whatsapp?: {
    connected: boolean;
    phoneNumber?: string;
    businessName?: string;
    wabaId?: string;
    webhookVerified: boolean;
  };
  // Messenger specific
  messenger?: {
    connected: boolean;
    pageName?: string;
    pageId?: string;
    replyDMs: boolean;
    trainedOnPageData: boolean;
  };
  // Call specific
  call?: {
    connected: boolean;
    phoneNumber?: string;
    voiceName: 'Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir';
    greetingMessage: string;
    speechSpeed: number; // 1.0
    transferNumber?: string;
  };
}

export interface KnowledgeDocument {
  id: string;
  name: string;
  type: 'pdf' | 'text' | 'faq' | 'social_bio';
  content: string;
  chunkCount: number;
  createdAt: string;
  fileSize?: string;
}

export interface GoogleSheetColumn {
  name: string;
  type: 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'email' | 'status';
  description?: string;
  isLookupKey?: boolean;
  required?: boolean;
  primaryKey?: boolean;
}

export type GoogleSheetRow = Record<string, any>;

export interface GoogleSheetToolConfig {
  enabled: boolean;
  spreadsheetId?: string;
  sheetId?: string;
  spreadsheetUrl?: string;
  sheetUrl?: string;
  sheetName: string;
  purpose?: 'lookup' | 'read_write' | 'leads_capture' | 'custom';
  description?: string;
  autoLookupOnUserQuery?: boolean;
  allowAgentToAppendRows?: boolean;
  syncIntervalMinutes?: number;
  columns: GoogleSheetColumn[];
  sampleData?: GoogleSheetRow[];
  sampleRows?: GoogleSheetRow[];
  connectedAt?: string;
  lastSyncedAt?: string;
  status?: 'connected' | 'disconnected' | 'syncing';
}

export interface GoogleWorkspaceAppConfig {
  enabled: boolean;
  status: 'connected' | 'disconnected';
  accountEmail?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
}

export interface GoogleWorkspaceConfig {
  gmail?: GoogleWorkspaceAppConfig;
  drive?: GoogleWorkspaceAppConfig;
  docs?: GoogleWorkspaceAppConfig;
  sheets?: GoogleSheetToolConfig;
  calendar?: GoogleWorkspaceAppConfig;
}

export interface Microsoft365AppConfig {
  enabled: boolean;
  status: 'connected' | 'disconnected';
  accountEmail?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
}

export interface Microsoft365Config {
  excel?: Microsoft365AppConfig;
  outlook?: Microsoft365AppConfig;
  word?: Microsoft365AppConfig;
  sharepoint?: Microsoft365AppConfig;
}

export interface SalesforceAppConfig {
  enabled: boolean;
  status: 'connected' | 'disconnected';
  accountEmail?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
}

export interface SalesforceConfig {
  salesAndServiceCloud?: SalesforceAppConfig;
  marketingCloud?: SalesforceAppConfig;
  salesCloud?: SalesforceAppConfig;
  serviceCloud?: SalesforceAppConfig;
  contacts?: SalesforceAppConfig;
}

export interface HubSpotAppConfig {
  enabled: boolean;
  status: 'connected' | 'disconnected';
  accountEmail?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
  portalId?: string;
}

export interface HubSpotConfig {
  enabled?: boolean;
  status?: 'connected' | 'disconnected';
  accountEmail?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
  portalId?: string;
  contacts?: HubSpotAppConfig;
  deals?: HubSpotAppConfig;
  serviceHub?: HubSpotAppConfig;
  marketingForms?: HubSpotAppConfig;
}

export interface AgentToolsConfig {
  googleSheet?: GoogleSheetToolConfig;
  googleWorkspace?: GoogleWorkspaceConfig;
  microsoft365?: Microsoft365Config;
  salesforce?: SalesforceConfig;
  hubspot?: HubSpotConfig;
  notifications?: NotificationsConfig;
}

export type NotificationChannelType = 'whatsapp' | 'sms' | 'email' | 'app_notifications';

export interface WhatsAppNotificationDetails {
  phoneNumber: string;
  countryCode?: string;
  recipientName?: string;
}

export interface SmsNotificationDetails {
  phoneNumber: string;
}

export interface EmailNotificationDetails {
  emailAddress: string;
}

export interface AppNotificationDetails {
  target?: string;
  soundAlerts?: boolean;
}

export interface NotificationsConfig {
  channels: NotificationChannelType[];
  details: {
    whatsapp?: WhatsAppNotificationDetails;
    sms?: SmsNotificationDetails;
    email?: EmailNotificationDetails;
    app_notifications?: AppNotificationDetails;
  };
}

export interface WhatItRepliesToConfig {
  replyDMs: boolean;
  replyComments: boolean;
  commentKeywords: string;
  replyTags: boolean;
  tagAllowedAccounts: string;
}

export interface CustomVoiceConfig {
  enabled: boolean;
  authorized: boolean;
  voiceName?: string;
  audioUrl?: string; // base64 data URL or audio link
  fileName?: string;
  fileSize?: string;
  duration?: number;
  sourceType?: 'recorded' | 'uploaded';
  updatedAt?: string;
}

export interface Agent {
  id: string;
  userId: string;
  name: string;
  description: string;
  platforms: PlatformType[];
  roleAndDuties: string;
  openingLine?: string;
  tone?: string;
  customVoice?: CustomVoiceConfig;
  status: 'active' | 'paused' | 'draft';
  manualPauseWarningShown?: boolean;
  platformConfig: PlatformConfig;
  whatItRepliesTo?: WhatItRepliesToConfig;
  availability: AvailabilitySchedule;
  knowledgeDocs: KnowledgeDocument[];
  tools?: AgentToolsConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'agent' | 'human';
  text: string;
  timestamp: string;
  mediaType?: 'text' | 'image' | 'audio';
  mediaUrl?: string;
  mediaDescription?: string; // transcription for audio or image summary
  referencedMessageIds?: string[]; // IDs of messages referenced (for consecutive queries)
  rating?: number; // 1 to 5
  feedback?: string;
  feedbackCreatedAt?: string;
}

export interface Conversation {
  id: string;
  agentId: string;
  userId: string;
  platform: PlatformType;
  customerName: string;
  customerHandle: string;
  customerAvatar?: string;
  lastMessageText: string;
  lastMessageTime: string;
  unread: boolean;
  status: 'agent_active' | 'human_takeover';
  rating?: number; // 1 to 5 stars
  feedbackComment?: string;
  messages: ChatMessage[];
  missedMessagesCountWhilePaused?: number;
}

export interface ChannelConnection {
  id: string;
  user_id: string;
  agent_id: string | null;
  channel: PlatformType;
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

export interface WebhookEventPayload {
  id: string;
  platform: PlatformType;
  eventType: 'messages' | 'comments' | 'tags' | 'incoming_call';
  senderId: string;
  senderName: string;
  messages: Array<{
    text: string;
    mediaType?: 'text' | 'image' | 'audio';
    mediaBase64?: string;
  }>;
  keywordMatched?: string;
}
