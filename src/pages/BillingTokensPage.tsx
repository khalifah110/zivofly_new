import React, { useState, useId, useMemo } from 'react';
import {
  Coins,
  Zap,
  PhoneCall,
  MessageSquare,
  Database,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Clock,
  Sparkles,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ChevronRight,
  ExternalLink,
  Mic,
  Activity,
  Search,
  X,
  Lock,
  Send,
  FileText,
  Sliders,
  DollarSign,
  TrendingDown,
  TrendingUp,
  SlidersHorizontal,
  Calculator,
  ArrowRight,
  Check,
  Layers,
  LayoutGrid,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

// ==========================================
// TYPES & PLATFORM ECONOMICS CONSTANTS
// ==========================================

export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  bonusTokens: number;
  totalTokens: number;
  price: number;
  bonusPercent?: number;
  isPopular?: boolean;
  description: string;
  perTokenRate: string;
  highlights: string[];
  equivalentMetrics: {
    whatsappReplies: number;
    callMinutes: number;
  };
}

export interface ConsumptionRateItem {
  id: string;
  platform: 'Instagram / Messenger' | 'WhatsApp Standard' | 'WhatsApp Premium' | 'Media Turn' | 'Live Voice Call' | 'CRM / Tools' | 'Knowledge Base RAG';
  action: string;
  tokens: number;
  costUsd: string;
  category: 'social' | 'whatsapp' | 'voice' | 'crm' | 'rag';
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  includedFeatures: string;
  tooltipExplanation: string;
}

export interface LedgerTransaction {
  id: string;
  timestamp: string;
  channel: 'whatsapp' | 'voice' | 'instagram' | 'messenger' | 'crm' | 'rag' | 'topup';
  actionDescription: string;
  targetCustomer: string;
  tokens: number; // Negative for deductions, positive for top-up
  costUsd: string;
}

interface DailyBurnData {
  day: string;
  date: string;
  totalTokens: number;
  whatsappTokens: number;
  voiceTokens: number;
  socialTokens: number;
  toolTokens: number;
}

// 7-day visual burn data (initialized empty for new accounts)
const generateEmpty7Days = (): DailyBurnData[] => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const result: DailyBurnData[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push({
      day: days[d.getDay()],
      date: `${months[d.getMonth()]} ${d.getDate()}`,
      totalTokens: 0,
      whatsappTokens: 0,
      voiceTokens: 0,
      socialTokens: 0,
      toolTokens: 0,
    });
  }
  return result;
};

const DAILY_BURN_DATA: DailyBurnData[] = generateEmpty7Days();

// Pre-Packaged Bundles (Exact specs from platform brief)
const PREPACKAGED_BUNDLES: TokenPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    tokens: 20000,
    bonusTokens: 0,
    totalTokens: 20000,
    price: 20,
    description: 'Entry tier for early-stage channels, personal brands, and testing agent flows.',
    perTokenRate: '$1.00 / 1,000 Tokens',
    highlights: [
      '20,000 Zivofly Tokens',
      '~1,330 WhatsApp Standard replies',
      'Or ~100 live voice call minutes',
      'Instant Stripe activation with zero lock-in',
    ],
    equivalentMetrics: {
      whatsappReplies: 1330,
      callMinutes: 100,
    },
  },
  {
    id: 'growth',
    name: 'Growth',
    tokens: 50000,
    bonusTokens: 5000,
    totalTokens: 55000,
    price: 50,
    bonusPercent: 10,
    isPopular: true,
    description: 'Most popular tier. Designed for growing e-commerce stores and active daily customer support.',
    perTokenRate: '$0.91 / 1,000 Tokens',
    highlights: [
      '50,000 + 5,000 Free Bonus Tokens (+10%)',
      '~3,666 WhatsApp Standard replies',
      'Or ~275 live voice call minutes',
      'Cloned ElevenLabs voice note synthesis',
      'Priority routing on real-time webhooks',
    ],
    equivalentMetrics: {
      whatsappReplies: 3666,
      callMinutes: 275,
    },
  },
  {
    id: 'business_pro',
    name: 'Business Pro',
    tokens: 100000,
    bonusTokens: 20000,
    totalTokens: 120000,
    price: 100,
    bonusPercent: 20,
    description: 'Ideal for active inbound telephony lines, multi-agent operations, and automated pipeline sync.',
    perTokenRate: '$0.83 / 1,000 Tokens',
    highlights: [
      '100,000 + 20,000 Free Bonus Tokens (+20%)',
      '~8,000 WhatsApp Standard replies',
      'Or ~600 live voice call minutes',
      'Unlimited HubSpot, Salesforce, & Sheets sync',
      'Multi-agent concurrency lane enabled',
    ],
    equivalentMetrics: {
      whatsappReplies: 8000,
      callMinutes: 600,
    },
  },
  {
    id: 'enterprise_scale',
    name: 'Enterprise Scale',
    tokens: 250000,
    bonusTokens: 100000,
    totalTokens: 350000,
    price: 250,
    bonusPercent: 40,
    description: 'Maximum volume economy for 24/7 call centers, high-frequency RAG, and custom endpoints.',
    perTokenRate: '$0.71 / 1,000 Tokens',
    highlights: [
      '250,000 + 100,000 Free Bonus Tokens (+40%)',
      '~23,333 WhatsApp Standard replies',
      'Or ~1,750 live voice call minutes',
      'Dedicated vectorization throughput',
      'Priority enterprise SLA & tax invoices',
    ],
    equivalentMetrics: {
      whatsappReplies: 23333,
      callMinutes: 1750,
    },
  },
];

// Exact GPT-4o Engine Action Rates from prompt
const CONSUMPTION_RATES_DATA: ConsumptionRateItem[] = [
  {
    id: 'rate-1',
    platform: 'Instagram / Messenger',
    action: 'Instagram / Messenger Text Reply',
    tokens: 5,
    costUsd: '$0.005',
    category: 'social',
    icon: MessageSquare,
    iconBg: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    iconColor: 'text-rose-500',
    includedFeatures: 'Context-aware GPT-4o DM reply, sentiment classification, conversation memory record.',
    tooltipExplanation: 'Billed per outbound message generated by the AI agent in response to incoming Instagram DMs or Facebook Messenger threads.',
  },
  {
    id: 'rate-2',
    platform: 'WhatsApp Standard',
    action: 'WhatsApp Standard Region Reply',
    tokens: 15,
    costUsd: '$0.015',
    category: 'whatsapp',
    icon: Send,
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    iconColor: 'text-emerald-600',
    includedFeatures: 'Covers US, Canada, Latin America, Africa, Asia-Pacific. Meta Cloud API delivery included.',
    tooltipExplanation: 'Meta Cloud API rates for standard geographical regions (US, LATAM, APAC, MEA) including session window management and message encryption.',
  },
  {
    id: 'rate-3',
    platform: 'WhatsApp Premium',
    action: 'WhatsApp Premium Region Reply (EU / UK)',
    tokens: 130,
    costUsd: '$0.130',
    category: 'whatsapp',
    icon: Send,
    iconBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    iconColor: 'text-teal-600',
    includedFeatures: 'GDPR-compliant routing, EU datacenter data residency, UK/EU telco surcharge pass-through.',
    tooltipExplanation: 'Meta imposes higher per-conversation carrier surcharges in European Union nations and the United Kingdom. Token costs reflect direct Meta carrier pass-through.',
  },
  {
    id: 'rate-4',
    platform: 'Media Turn',
    action: 'Media Turn (Image Analysis or Voice Note)',
    tokens: 70,
    costUsd: '$0.070',
    category: 'voice',
    icon: Mic,
    iconBg: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    iconColor: 'text-purple-500',
    includedFeatures: 'GPT-4o Vision OCR photo inspection, or ElevenLabs synthesized cloned voice note audio.',
    tooltipExplanation: 'Applies whenever the agent receives an image for optical recognition or sends a natural audio voice note cloned with your chosen brand vocal profile.',
  },
  {
    id: 'rate-5',
    platform: 'Live Voice Call',
    action: 'Real-Time Telephony Call with Cloned Voice',
    tokens: 200,
    costUsd: '$0.200 / min',
    category: 'voice',
    icon: PhoneCall,
    iconBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    iconColor: 'text-amber-500',
    includedFeatures: 'Barge-in speech detection, 280ms low-latency streaming voice, PSTN telephony carrier link.',
    tooltipExplanation: 'Billed per 60-second connection block on inbound and outbound telephone calls. Includes full-duplex conversational audio with natural interruptions.',
  },
  {
    id: 'rate-6',
    platform: 'CRM / Tools',
    action: 'CRM / Database Tool Call',
    tokens: 5,
    costUsd: '$0.005',
    category: 'crm',
    icon: Database,
    iconBg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    iconColor: 'text-blue-500',
    includedFeatures: 'Real-time HubSpot lead creation, Salesforce deal progression, Google Sheets row append.',
    tooltipExplanation: 'Execution of agent tool parameters to query or mutate external systems of record with validation and schema checking.',
  },
  {
    id: 'rate-7',
    platform: 'Knowledge Base RAG',
    action: 'Document Vectorization & RAG Ingestion',
    tokens: 10,
    costUsd: '$0.010 / doc',
    category: 'rag',
    icon: FileText,
    iconBg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    iconColor: 'text-indigo-500',
    includedFeatures: 'Chunking, text embeddings generation, semantic index storage in Zivofly vector memory.',
    tooltipExplanation: 'One-time cost to parse PDF, Word, or markdown documents, extract semantic knowledge, and store embeddings for instant agent retrieval.',
  },
];

// Initial Granular Ledger Transactions (empty for new accounts)
const INITIAL_LEDGER: LedgerTransaction[] = [];

// ==========================================
// MAIN BILLING & TOKENS PAGE COMPONENT
// ==========================================

export const BillingTokensPage: React.FC = () => {
  // Navigation Tabs state matching Zivofly design
  const [activeTab, setActiveTab] = useState<'packages' | 'usage' | 'rates'>('packages');

  // Balance & Health state (starts at 0 for fresh accounts)
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [isSimulatedLowBalance, setIsSimulatedLowBalance] = useState<boolean>(false);

  // Auto-Recharge State
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState<boolean>(false);
  const [thresholdTokens, setThresholdTokens] = useState<string>('5000');
  const [triggerBundle, setTriggerBundle] = useState<string>('growth');
  const [monthlySpendCap, setMonthlySpendCap] = useState<number>(200);
  const [isSavingAutoRecharge, setIsSavingAutoRecharge] = useState<boolean>(false);

  // Custom Slider Top-Up State
  const [customDollarAmount, setCustomDollarAmount] = useState<number>(75);

  // Interactive ROI & Consumption Estimator State
  const [estimatorMessages, setEstimatorMessages] = useState<number>(4500);
  const [estimatorCallMinutes, setEstimatorCallMinutes] = useState<number>(300);
  const [estimatorDocsAndCrm, setEstimatorDocsAndCrm] = useState<number>(250);

  // Stripe Checkout Dialog State
  const [selectedBundleForCheckout, setSelectedBundleForCheckout] = useState<{
    name: string;
    tokens: number;
    price: number;
    bonusPercent?: number;
    isCustom?: boolean;
  } | null>(null);
  const [isProcessingStripe, setIsProcessingStripe] = useState<boolean>(false);

  // Filterable Audit Ledger State
  const [ledgerTransactions, setLedgerTransactions] = useState<LedgerTransaction[]>(INITIAL_LEDGER);
  const [ledgerFilter, setLedgerFilter] = useState<string>('all');
  const [ledgerSearch, setLedgerSearch] = useState<string>('');
  const [visibleLedgerCount, setVisibleLedgerCount] = useState<number>(6);

  // Search filter for rates card
  const [ratesSearchQuery, setRatesSearchQuery] = useState<string>('');

  // Active chart day tooltip state
  const [activeChartDay, setActiveChartDay] = useState<DailyBurnData | null>(DAILY_BURN_DATA[DAILY_BURN_DATA.length - 1] || null);

  const autoRechargeSwitchId = useId();

  // Low balance threshold check
  const isLowBalance = isSimulatedLowBalance || tokenBalance < 5000;

  // Real-time currency conversions
  const cashValueUsd = (tokenBalance / 1000).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  const estimatedRunwayDays = Math.max(1, Math.round(tokenBalance / 2150));

  // Custom Token calculation with bonus scaling
  const customCalculations = useMemo(() => {
    let bonusRate = 0;
    if (customDollarAmount >= 250) {
      bonusRate = 0.4;
    } else if (customDollarAmount >= 100) {
      bonusRate = 0.2;
    } else if (customDollarAmount >= 50) {
      bonusRate = 0.1;
    }

    const baseTokens = customDollarAmount * 1000;
    const bonusTokens = Math.round(baseTokens * bonusRate);
    const totalTokens = baseTokens + bonusTokens;

    return {
      baseTokens,
      bonusTokens,
      totalTokens,
      bonusRate: bonusRate * 100,
      whatsappDeliverables: Math.round(totalTokens / 15),
      voiceMinutesDeliverables: Math.round(totalTokens / 200),
      crmDeliverables: Math.round(totalTokens / 5),
    };
  }, [customDollarAmount]);

  // ROI Estimator Projected Tokens & Package Recommendation
  const estimatorCalculations = useMemo(() => {
    const rawTokens =
      estimatorMessages * 15 +
      estimatorCallMinutes * 200 +
      estimatorDocsAndCrm * 7;
    const bufferTokens = Math.round(rawTokens * 1.1);
    const totalProjectedTokens = Math.max(5000, bufferTokens);
    const estimatedCostUsd = (totalProjectedTokens / 1000).toFixed(2);

    let recommendedBundle = PREPACKAGED_BUNDLES[1]; // Growth default
    if (totalProjectedTokens <= 20000) {
      recommendedBundle = PREPACKAGED_BUNDLES[0];
    } else if (totalProjectedTokens <= 60000) {
      recommendedBundle = PREPACKAGED_BUNDLES[1];
    } else if (totalProjectedTokens <= 150000) {
      recommendedBundle = PREPACKAGED_BUNDLES[2];
    } else {
      recommendedBundle = PREPACKAGED_BUNDLES[3];
    }

    return {
      totalProjectedTokens,
      estimatedCostUsd,
      recommendedBundle,
    };
  }, [estimatorMessages, estimatorCallMinutes, estimatorDocsAndCrm]);

  // Filtered Ledger
  const filteredLedger = useMemo(() => {
    return ledgerTransactions.filter((tx) => {
      const matchesFilter =
        ledgerFilter === 'all' ||
        (ledgerFilter === 'whatsapp' && tx.channel === 'whatsapp') ||
        (ledgerFilter === 'voice' && tx.channel === 'voice') ||
        (ledgerFilter === 'social' && (tx.channel === 'instagram' || tx.channel === 'messenger')) ||
        (ledgerFilter === 'crm' && (tx.channel === 'crm' || tx.channel === 'rag')) ||
        (ledgerFilter === 'topup' && tx.channel === 'topup');

      const matchesSearch =
        tx.actionDescription.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        tx.targetCustomer.toLowerCase().includes(ledgerSearch.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [ledgerTransactions, ledgerFilter, ledgerSearch]);

  // Filtered Consumption Rates
  const filteredRates = useMemo(() => {
    if (!ratesSearchQuery.trim()) return CONSUMPTION_RATES_DATA;
    const q = ratesSearchQuery.toLowerCase();
    return CONSUMPTION_RATES_DATA.filter(
      (item) =>
        item.platform.toLowerCase().includes(q) ||
        item.action.toLowerCase().includes(q) ||
        item.includedFeatures.toLowerCase().includes(q)
    );
  }, [ratesSearchQuery]);

  // Toggle Auto-Recharge
  const handleToggleAutoRecharge = () => {
    const next = !autoRechargeEnabled;
    setAutoRechargeEnabled(next);
    if (next) {
      toast.success('Autonomous Balance Protection is now ACTIVE');
    } else {
      toast.info('Auto-recharge paused: your agents will stop when balance hits 0.');
    }
  };

  // Save Auto-Recharge Settings
  const handleSaveAutoRecharge = () => {
    setIsSavingAutoRecharge(true);
    setTimeout(() => {
      setIsSavingAutoRecharge(false);
      toast.success(
        `Auto-recharge saved: Trigger at <${Number(thresholdTokens).toLocaleString()} tokens, purchasing ${
          triggerBundle === 'starter'
            ? 'Starter ($20)'
            : triggerBundle === 'growth'
            ? 'Growth ($50)'
            : 'Business Pro ($100)'
        } with a $${monthlySpendCap}/mo limit.`
      );
    }, 400);
  };

  // Trigger Stripe Payment Simulation
  const handleConfirmPayment = () => {
    if (!selectedBundleForCheckout) return;
    toast.info('Stripe payments coming soon!');
    setSelectedBundleForCheckout(null);
  };

  return (
    <div className="space-y-8">
      {/* ============================================================ */}
      {/* TOP HEADER & BREADCRUMB (Matches Zivofly Page Pattern)        */}
      {/* ============================================================ */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Billing & Tokens
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-mono">
              <Zap className="size-3 text-emerald-600 dark:text-emerald-400 fill-emerald-600 dark:fill-emerald-400" />
              1,000 Tokens = $1.00 USD
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage prepaid token balances, autonomous auto-recharge, usage analytics, and channel deduction rates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setIsSimulatedLowBalance(!isSimulatedLowBalance);
              if (!isSimulatedLowBalance) {
                toast.warning('Simulating low balance condition (<5,000 Tokens)');
              } else {
                toast.success('Restored normal healthy balance indicator');
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-2xs cursor-pointer"
            title="Toggle to preview the low-balance emergency banner"
          >
            <AlertTriangle className="size-3.5 text-amber-500" />
            <span>{isLowBalance ? 'Reset Alert' : 'Test Low Balance Alert'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('packages');
              const el = document.getElementById('bundles-grid-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Coins className="size-4" />
            <span>Top Up Tokens</span>
          </button>
        </div>
      </div>

      {/* Low-Balance Warning Alert Banner */}
      {isLowBalance && (
        <div className="surface-card border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="size-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-amber-900 dark:text-amber-300">
                  Low Token Balance Warning ({tokenBalance.toLocaleString()} Tokens Remaining)
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md">
                  Urgent
                </span>
              </div>
              <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
                Your token balance is under 5,000 tokens. Incoming customer voice calls and WhatsApp messages may pause if balance hits zero.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const growthBundle = PREPACKAGED_BUNDLES[1];
              setSelectedBundleForCheckout({
                name: growthBundle.name,
                tokens: growthBundle.totalTokens,
                price: growthBundle.price,
                bonusPercent: growthBundle.bonusPercent,
              });
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
          >
            <Zap className="size-3.5" />
            <span>Instant Top-Up $50 (+10% Bonus)</span>
          </button>
        </div>
      )}

      {/* Navigation Tabs Bar (Matches AgentDetailPage styling) */}
      <div className="flex gap-2 border-b border-border pb-px overflow-x-auto">
        {[
          { key: 'packages', label: 'Token Balance & Packages', icon: Coins, badge: `${(tokenBalance / 1000).toFixed(1)}k tokens` },
          { key: 'usage', label: 'Usage & Real-Time Ledger', icon: Activity, badge: '7-Day Burn' },
          { key: 'rates', label: 'Action Rates & ROI Calculator', icon: Calculator, badge: 'GPT-4o Rates' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeTab === tab.key
                ? 'border-primary text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="size-4" />
            <span>{tab.label}</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                activeTab === tab.key
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {tab.badge}
            </span>
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* TAB 1: TOKEN BALANCE, AUTO-RECHARGE & TOP-UP PACKAGES        */}
      {/* ============================================================ */}
      {activeTab === 'packages' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Balance & Auto-Recharge Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Hero Balance Card (7 cols) */}
            <div
              className={`lg:col-span-7 surface-card p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden transition-all ${
                isLowBalance ? 'border-amber-500/40 ring-2 ring-amber-500/20' : ''
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
                      <Coins className="size-5.5 text-primary" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                        Current Token Balance
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Available across active AI agents & telephony lines
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
                      isLowBalance
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full animate-pulse ${
                        isLowBalance ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                    <span>{isLowBalance ? 'Low Reserve Alert' : 'Healthy Reserve'}</span>
                  </span>
                </div>

                {/* Metric Display */}
                <div className="pt-2">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground font-mono">
                      {tokenBalance.toLocaleString()}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-muted-foreground">
                      Tokens
                    </span>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20 font-mono">
                      ≈ {cashValueUsd} USD
                    </span>
                  </div>
                </div>

                {/* Runway & Burn bar */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Activity className="size-3.5 text-primary" />
                      <span>Projected Runway:</span>
                      <strong className="text-foreground font-semibold">~{estimatedRunwayDays} days</strong>
                      <span className="text-[11px]">(at 7-day velocity)</span>
                    </span>
                    <span>Avg. Burn: ~2,150 tokens/day</span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isLowBalance
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(12, (tokenBalance / 50000) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-5 mt-5 border-t border-border flex items-center justify-between gap-4 flex-wrap text-xs text-muted-foreground">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-600" />
                    <span>Stripe Vault Certified</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5 text-muted-foreground" />
                    <span>Tokens Never Expire</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('rates')}
                  className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>View action cost schedule</span>
                  <ChevronRight className="size-3" />
                </button>
              </div>
            </div>

            {/* Auto-Recharge Control Center (5 cols) */}
            <div className="lg:col-span-5 surface-card p-6 sm:p-7 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
                      <RefreshCw
                        className={`size-5 transition-colors ${
                          autoRechargeEnabled
                            ? 'text-emerald-600 dark:text-emerald-400 animate-spin-slow'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">
                          Autonomous Protection
                        </h3>
                        {autoRechargeEnabled ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
                            <span className="size-1.5 rounded-full bg-muted-foreground/60" />
                            OFF
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Prevent dropped live calls and WhatsApp disconnects
                      </p>
                    </div>
                  </div>

                  {/* Master Switch - Solid Emerald Green when ON */}
                  <button
                    type="button"
                    role="switch"
                    id={autoRechargeSwitchId}
                    aria-checked={autoRechargeEnabled}
                    onClick={handleToggleAutoRecharge}
                    title={autoRechargeEnabled ? 'Auto-recharge is active (Green)' : 'Auto-recharge is inactive'}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                      autoRechargeEnabled
                        ? 'bg-emerald-600 shadow-sm shadow-emerald-600/30'
                        : 'bg-muted border border-input'
                    }`}
                  >
                    <span className="sr-only">Toggle auto-recharge</span>
                    <span
                      className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        autoRechargeEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Configuration Drawer */}
                {autoRechargeEnabled ? (
                  <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3.5 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Auto-recharge rule active</span>
                    </div>

                    <div className="space-y-3 text-xs">
                      {/* Threshold Selector */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                          <span>Recharge automatically when balance drops below:</span>
                          <span className="font-mono text-muted-foreground">Threshold</span>
                        </label>
                        <select
                          value={thresholdTokens}
                          onChange={(e) => setThresholdTokens(e.target.value)}
                          className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-2xs font-medium cursor-pointer"
                        >
                          <option value="2500">2,500 Tokens (~$2.50 safety margin)</option>
                          <option value="5000">5,000 Tokens (Recommended • ~$5.00)</option>
                          <option value="10000">10,000 Tokens (~$10.00 buffer)</option>
                          <option value="20000">20,000 Tokens (High-traffic line • ~$20.00)</option>
                        </select>
                      </div>

                      {/* Package Selector */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                          <span>Auto-purchase bundle:</span>
                          <span className="font-mono text-muted-foreground">Bundle</span>
                        </label>
                        <select
                          value={triggerBundle}
                          onChange={(e) => setTriggerBundle(e.target.value)}
                          className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-2xs font-medium cursor-pointer"
                        >
                          <option value="starter">Starter Package: 20,000 Tokens ($20)</option>
                          <option value="growth">Growth Package: 55,000 Tokens ($50) • +10% Bonus</option>
                          <option value="business_pro">Business Pro: 120,000 Tokens ($100) • +20% Bonus</option>
                        </select>
                      </div>

                      {/* Monthly Budget Cap */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                          <span>Maximum monthly spend limit:</span>
                          <span className="font-mono text-muted-foreground">Safety Cap</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">
                            $
                          </span>
                          <input
                            type="number"
                            min="20"
                            max="2000"
                            step="10"
                            value={monthlySpendCap}
                            onChange={(e) => setMonthlySpendCap(Number(e.target.value))}
                            className="w-full rounded-xl border border-input bg-card pl-7 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-2xs font-mono font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Stored Card + Save Button */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                        <CreditCard className="size-3.5 text-foreground" />
                        <span>Visa •••• 4242</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            toast.info('Opening Stripe Customer Portal to update card details…');
                          }}
                          className="px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg border border-border transition-colors cursor-pointer"
                        >
                          Update Card
                        </button>

                        <button
                          type="button"
                          disabled={isSavingAutoRecharge}
                          onClick={handleSaveAutoRecharge}
                          className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-3.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                        >
                          {isSavingAutoRecharge ? 'Saving…' : 'Save Config'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-2.5">
                    <p className="font-semibold text-foreground">Auto-recharge is currently disabled.</p>
                    <p className="text-[11px] leading-relaxed">
                      If your balance hits zero, live customer calls will immediately disconnect and incoming WhatsApp/Instagram replies will fail to send.
                    </p>
                    <button
                      type="button"
                      onClick={handleToggleAutoRecharge}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-3.5 py-2 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <span>Enable Autonomous Protection</span>
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border">
                <span>Billed via Stripe Billing</span>
                <span className="font-mono text-[10px] text-muted-foreground">ID: cus_89104829</span>
              </div>
            </div>
          </div>

          {/* Bundles Grid (4 Cards) */}
          <div id="bundles-grid-section" className="space-y-4 pt-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Prepaid Token Bundles
              </h2>
              <p className="text-xs text-muted-foreground">
                Choose a pre-packaged tier with graduated volume bonuses. Credits apply instantly.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {PREPACKAGED_BUNDLES.map((pkg) => {
                const isHighlight = pkg.isPopular;

                return (
                  <div key={pkg.id} className="relative flex flex-col group">
                    {/* Luminous Light Green Under-Glow from underneath the box */}
                    {isHighlight && (
                      <div
                        aria-hidden="true"
                        className="absolute -inset-1 rounded-3xl bg-gradient-to-b from-emerald-500/20 via-emerald-500/35 to-teal-400/40 blur-xl opacity-80 group-hover:opacity-100 transition-opacity pointer-events-none -z-10"
                      />
                    )}

                    <div
                      className={`surface-card flex flex-col justify-between relative overflow-hidden transition-all duration-200 h-full rounded-2xl ${
                        isHighlight
                          ? 'border-2 border-emerald-500/60 dark:border-emerald-400/70 bg-card shadow-[0_16px_40px_-8px_rgba(16,185,129,0.35)] dark:shadow-[0_20px_50px_-8px_rgba(16,185,129,0.45)]'
                          : 'hover:border-border/80 shadow-xs'
                      }`}
                    >
                      {/* Bonus Banner */}
                      {pkg.bonusPercent && (
                        <div
                          className={`px-3 py-1.5 text-center text-[10px] font-bold tracking-wider uppercase ${
                            isHighlight
                              ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-b border-emerald-500/30'
                              : 'bg-muted text-foreground border-b border-border'
                          }`}
                        >
                          +{pkg.bonusPercent}% Bonus (+{pkg.bonusTokens.toLocaleString()} Free Tokens)
                        </div>
                      )}

                      <div className="p-5 sm:p-6 space-y-4">
                        <div>
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-foreground">{pkg.name}</h3>
                            {isHighlight && (
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                Most Popular
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {pkg.description}
                          </p>
                        </div>

                        {/* Price and Tokens */}
                        <div className="pt-2 border-t border-border">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-extrabold text-foreground font-mono">
                              ${pkg.price}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">USD one-time</span>
                          </div>

                          <div className="mt-1 flex items-center justify-between flex-wrap gap-1">
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              {pkg.totalTokens.toLocaleString()} Tokens
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {pkg.perTokenRate}
                            </span>
                          </div>
                        </div>

                        {/* Deliverables Metric */}
                        <div className="rounded-xl border border-border bg-muted/40 p-2.5 space-y-1 text-[11px] text-muted-foreground">
                          <div className="flex items-center justify-between">
                            <span>WhatsApp replies:</span>
                            <strong className="text-foreground font-mono">~{pkg.equivalentMetrics.whatsappReplies.toLocaleString()}</strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Voice call minutes:</span>
                            <strong className="text-foreground font-mono">~{pkg.equivalentMetrics.callMinutes} mins</strong>
                          </div>
                        </div>

                        {/* Highlights */}
                        <div className="space-y-1.5 pt-1">
                          {pkg.highlights.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <Check className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="leading-tight">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="p-5 sm:p-6 pt-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBundleForCheckout({
                              name: pkg.name,
                              tokens: pkg.totalTokens,
                              price: pkg.price,
                              bonusPercent: pkg.bonusPercent,
                            });
                          }}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                            isHighlight
                              ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/20'
                              : 'bg-primary text-primary-foreground hover:opacity-95'
                          }`}
                        >
                          <CreditCard className="size-3.5" />
                          <span>Buy with Stripe (${pkg.price})</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Custom Token Slider Card */}
          <div className="surface-card p-6 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="size-4 text-primary" />
                  <h3 className="text-base font-bold text-foreground">
                    Custom Token Slider Top-Up
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                    Flexible Budget
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Drag the slider or specify any custom dollar budget from $10 to $1,000. Volume bonuses scale automatically.
                </p>
              </div>

              {customCalculations.bonusRate > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold font-mono">
                  <Sparkles className="size-3.5" />
                  <span>+{customCalculations.bonusRate}% Volume Bonus Active!</span>
                </div>
              )}
            </div>

            {/* Slider Controls & Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Select Custom Budget:</span>
                  <div className="flex items-center gap-1 font-mono text-xl font-bold text-foreground">
                    <span>$</span>
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      step="5"
                      value={customDollarAmount}
                      onChange={(e) => setCustomDollarAmount(Math.max(10, Math.min(1000, Number(e.target.value))))}
                      className="w-24 text-right rounded-lg border border-input bg-card px-2 py-0.5 text-lg font-bold text-foreground font-mono focus:border-emerald-500 focus:outline-none"
                    />
                    <span className="text-xs text-muted-foreground font-normal">USD</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="5"
                  value={customDollarAmount}
                  onChange={(e) => setCustomDollarAmount(Number(e.target.value))}
                  className="w-full h-2.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />

                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>$10 (Min)</span>
                  <span>$50 (+10% Bonus)</span>
                  <span>$100 (+20% Bonus)</span>
                  <span>$250 (+40% Bonus)</span>
                  <span>$1,000 (Enterprise)</span>
                </div>
              </div>

              {/* Summary */}
              <div className="lg:col-span-4 rounded-xl border border-border bg-muted/40 p-4 space-y-3">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Calculated Allocation
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-extrabold text-foreground font-mono">
                      {customCalculations.totalTokens.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">Tokens</span>
                  </div>
                  {customCalculations.bonusTokens > 0 && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono block">
                      Includes +{customCalculations.bonusTokens.toLocaleString()} bonus tokens
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>WhatsApp messages:</span>
                    <strong className="text-foreground font-mono">~{customCalculations.whatsappDeliverables.toLocaleString()}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Voice call minutes:</span>
                    <strong className="text-foreground font-mono">~{customCalculations.voiceMinutesDeliverables.toLocaleString()} mins</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>CRM tool updates:</span>
                    <strong className="text-foreground font-mono">~{customCalculations.crmDeliverables.toLocaleString()} calls</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedBundleForCheckout({
                      name: `Custom $${customDollarAmount} Package`,
                      tokens: customCalculations.totalTokens,
                      price: customDollarAmount,
                      bonusPercent: customCalculations.bonusRate > 0 ? customCalculations.bonusRate : undefined,
                      isCustom: true,
                    });
                  }}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <CreditCard className="size-3.5" />
                  <span>Buy with Stripe (${customDollarAmount})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: USAGE ANALYTICS & REAL-TIME LEDGER                    */}
      {/* ============================================================ */}
      {activeTab === 'usage' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 7-Day Burn Chart Card */}
          <div className="surface-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Activity className="size-4.5 text-emerald-600" />
                  <span>7-Day Daily Consumption Distribution</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Click or hover over any bar to inspect daily channel breakdown
                </p>
              </div>

              {activeChartDay && (
                <div className="flex items-center gap-3 text-xs font-mono bg-muted/50 px-3 py-1.5 rounded-xl border border-border">
                  <span className="font-semibold text-foreground">{activeChartDay.day} ({activeChartDay.date}):</span>
                  {activeChartDay.totalTokens > 0 ? (
                    <>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        -{activeChartDay.totalTokens.toLocaleString()} Tokens
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        (Calls: {activeChartDay.voiceTokens} | WA: {activeChartDay.whatsappTokens} | Social: {activeChartDay.socialTokens})
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">0 tokens consumed</span>
                  )}
                </div>
              )}
            </div>

            {/* Visual Stacked Bars */}
            <div className="pt-4 pb-2">
              <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 sm:h-48 w-full">
                {DAILY_BURN_DATA.map((d) => {
                  const maxTokens = 7500;
                  const heightPercent = d.totalTokens > 0 ? Math.min(100, Math.max(15, (d.totalTokens / maxTokens) * 100)) : 8;
                  const isSelected = activeChartDay?.day === d.day;

                  return (
                    <div
                      key={d.day}
                      onMouseEnter={() => setActiveChartDay(d)}
                      onClick={() => setActiveChartDay(d)}
                      className="group flex flex-col items-center justify-end h-full gap-2 cursor-pointer"
                    >
                      <span className="text-[10px] font-mono text-muted-foreground group-hover:text-foreground font-semibold group-hover:scale-105 transition-all">
                        {d.totalTokens >= 1000 ? `${(d.totalTokens / 1000).toFixed(1)}k` : d.totalTokens}
                      </span>

                      <div className="w-full max-w-[48px] h-full flex items-end">
                        <div
                          className={`w-full rounded-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-end ${
                            isSelected
                              ? 'ring-2 ring-emerald-500 shadow-md shadow-emerald-500/10'
                              : 'hover:brightness-110'
                          } ${d.totalTokens === 0 ? 'bg-muted/40 border border-dashed border-border' : ''}`}
                          style={{ height: `${heightPercent}%` }}
                        >
                          {d.totalTokens > 0 && (
                            <>
                              <div
                                className="w-full bg-amber-500"
                                style={{ height: `${(d.voiceTokens / d.totalTokens) * 100}%` }}
                                title={`Calls: ${d.voiceTokens} Tokens`}
                              />
                              <div
                                className="w-full bg-emerald-600"
                                style={{ height: `${(d.whatsappTokens / d.totalTokens) * 100}%` }}
                                title={`WhatsApp: ${d.whatsappTokens} Tokens`}
                              />
                              <div
                                className="w-full bg-rose-500"
                                style={{ height: `${(d.socialTokens / d.totalTokens) * 100}%` }}
                                title={`Social: ${d.socialTokens} Tokens`}
                              />
                              <div
                                className="w-full bg-blue-500"
                                style={{ height: `${(d.toolTokens / d.totalTokens) * 100}%` }}
                                title={`Tools: ${d.toolTokens} Tokens`}
                              />
                            </>
                          )}
                        </div>
                      </div>

                      <span
                        className={`text-xs font-semibold transition-colors ${
                          isSelected ? 'text-foreground font-bold' : 'text-muted-foreground'
                        }`}
                      >
                        {d.day}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-5 pt-5 text-xs text-muted-foreground border-t border-border mt-3 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-amber-500" />
                  <span>Phone Calls (200 t/min)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-emerald-600" />
                  <span>WhatsApp (15-130 t)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-rose-500" />
                  <span>Instagram / FB (5 t)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-blue-500" />
                  <span>CRM & Tools (5-10 t)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Granular Audit Ledger Card */}
          <div className="surface-card overflow-hidden">
            {/* Filter & Search Bar */}
            <div className="p-5 border-b border-border space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">Live Transaction Feed</h3>
                  <p className="text-xs text-muted-foreground">
                    Showing latest deductions and top-ups ({filteredLedger.length} events found)
                  </p>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search action or customer..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none shadow-2xs"
                  />
                  {ledgerSearch && (
                    <button
                      type="button"
                      onClick={() => setLedgerSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { key: 'all', label: 'All Operations' },
                  { key: 'whatsapp', label: 'WhatsApp' },
                  { key: 'voice', label: 'Phone Calls' },
                  { key: 'social', label: 'Instagram / FB' },
                  { key: 'crm', label: 'CRM & Tools' },
                  { key: 'topup', label: 'Top-Ups' },
                ].map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => {
                      setLedgerFilter(pill.key);
                      setVisibleLedgerCount(6);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      ledgerFilter === pill.key
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'bg-accent text-accent-foreground hover:opacity-80'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="divide-y divide-border">
              {ledgerTransactions.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="size-10 rounded-xl bg-accent flex items-center justify-center mx-auto text-muted-foreground">
                    <Activity className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">No token activity recorded yet</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Real-time token deductions, live phone minutes, and top-up receipts will appear here as your agents answer messages.
                    </p>
                  </div>
                </div>
              ) : filteredLedger.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No deduction logs matched your filter.
                </div>
              ) : (
                filteredLedger.slice(0, visibleLedgerCount).map((item) => {
                  const isCredit = item.tokens > 0;

                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Channel Icon */}
                        <div
                          className={`size-10 rounded-xl flex items-center justify-center shrink-0 border ${
                            isCredit
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : item.channel === 'voice'
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              : item.channel === 'whatsapp'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : item.channel === 'crm'
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          }`}
                        >
                          {isCredit ? (
                            <CreditCard className="size-4.5" />
                          ) : item.channel === 'voice' ? (
                            <PhoneCall className="size-4.5" />
                          ) : item.channel === 'whatsapp' ? (
                            <Send className="size-4.5" />
                          ) : item.channel === 'crm' ? (
                            <Database className="size-4.5" />
                          ) : (
                            <MessageSquare className="size-4.5" />
                          )}
                        </div>

                        {/* Title & Metadata */}
                        <div className="min-w-0 space-y-0.5">
                          <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
                            {item.actionDescription}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                            <span className="font-medium text-foreground/80">{item.targetCustomer}</span>
                            <span>•</span>
                            <span>{item.timestamp}</span>
                          </div>
                        </div>
                      </div>

                      {/* Token Deduction */}
                      <div className="text-right shrink-0">
                        <span
                          className={`font-mono text-xs sm:text-sm font-bold block ${
                            isCredit
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {isCredit ? `+${item.tokens.toLocaleString()}` : `${item.tokens.toLocaleString()}`} Tokens
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {item.costUsd}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Load More Pagination */}
            {filteredLedger.length > visibleLedgerCount && (
              <div className="p-4 border-t border-border text-center bg-muted/20">
                <button
                  type="button"
                  onClick={() => setVisibleLedgerCount((prev) => prev + 5)}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  Load More Transactions ({filteredLedger.length - visibleLedgerCount} remaining)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: ACTION RATES & ROI CALCULATOR                         */}
      {/* ============================================================ */}
      {activeTab === 'rates' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Rate Card Table */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Consumption Rate Card
                </h2>
                <p className="text-xs text-muted-foreground">
                  Deterministic token burn schedule powered by GPT-4o engine action triggers.
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search rates by action..."
                  value={ratesSearchQuery}
                  onChange={(e) => setRatesSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none shadow-2xs"
                />
              </div>
            </div>

            <div className="surface-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                      <th scope="col" className="py-3.5 px-4 sm:px-6">Platform Channel</th>
                      <th scope="col" className="py-3.5 px-4">Operational Action</th>
                      <th scope="col" className="py-3.5 px-4 text-right">Token Deduction</th>
                      <th scope="col" className="py-3.5 px-4 text-right">Effective Cost (USD)</th>
                      <th scope="col" className="py-3.5 px-6 hidden md:table-cell">Included Features & Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredRates.map((rate) => {
                      const IconComponent = rate.icon;

                      return (
                        <tr key={rate.id} className="hover:bg-muted/20 transition-colors group">
                          {/* Platform */}
                          <td className="py-3.5 px-4 sm:px-6 font-semibold text-foreground">
                            <div className="flex items-center gap-2.5">
                              <div className={`flex size-8 items-center justify-center rounded-lg border shrink-0 ${rate.iconBg}`}>
                                <IconComponent className="size-4" />
                              </div>
                              <span>{rate.platform}</span>
                            </div>
                          </td>

                          {/* Action Name */}
                          <td className="py-3.5 px-4 text-foreground font-medium">
                            <div className="flex items-center gap-1.5">
                              <span>{rate.action}</span>
                              <span
                                title={rate.tooltipExplanation}
                                className="text-muted-foreground hover:text-foreground cursor-help"
                              >
                                <HelpCircle className="size-3 text-muted-foreground" />
                              </span>
                            </div>
                          </td>

                          {/* Token Deduction */}
                          <td className="py-3.5 px-4 text-right">
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border">
                              <Zap className="size-3 text-amber-500 fill-amber-500" />
                              <span>{rate.tokens}</span>
                              <span className="text-[10px] text-muted-foreground font-normal">Tokens</span>
                            </span>
                          </td>

                          {/* Cost USD */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {rate.costUsd}
                          </td>

                          {/* Included Features */}
                          <td className="py-3.5 px-6 text-muted-foreground text-[11px] leading-relaxed hidden md:table-cell max-w-sm">
                            {rate.includedFeatures}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-muted/20 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <HelpCircle className="size-4 text-muted-foreground" />
                  <span>Notice: WhatsApp Premium EU surcharge rates reflect strict Meta regional carrier fees.</span>
                </span>
                <a
                  href="https://developers.facebook.com/docs/whatsapp/pricing"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <span>Read Meta Pricing Specs</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          </div>

          {/* ROI Calculator Card */}
          <div className="surface-card p-6 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Calculator className="size-4 text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Interactive ROI Planner
                  </span>
                </div>
                <h3 className="text-lg font-bold tracking-tight text-foreground mt-0.5">
                  Monthly Token Need Calculator
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Adjust your projected message and call volumes to determine the most cost-effective package.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Sliders */}
              <div className="lg:col-span-7 space-y-5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Send className="size-3.5 text-emerald-600" />
                      <span>Monthly WhatsApp & Social Replies:</span>
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {estimatorMessages.toLocaleString()} msgs
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20000"
                    step="250"
                    value={estimatorMessages}
                    onChange={(e) => setEstimatorMessages(Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <PhoneCall className="size-3.5 text-amber-500" />
                      <span>Monthly Phone Call Minutes:</span>
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {estimatorCallMinutes.toLocaleString()} mins
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="25"
                    value={estimatorCallMinutes}
                    onChange={(e) => setEstimatorCallMinutes(Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Database className="size-3.5 text-blue-500" />
                      <span>CRM Tool Syncs & Knowledge Documents:</span>
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {estimatorDocsAndCrm.toLocaleString()} syncs
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="20"
                    value={estimatorDocsAndCrm}
                    onChange={(e) => setEstimatorDocsAndCrm(Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>

              {/* Recommendation Box */}
              <div className="lg:col-span-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Recommended Strategy
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                    Best Fit
                  </span>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground">Estimated Monthly Burn:</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-extrabold text-foreground font-mono">
                      {estimatorCalculations.totalProjectedTokens.toLocaleString()}
                    </span>
                    <span className="text-sm font-bold text-muted-foreground">Tokens</span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                      (≈ ${estimatorCalculations.estimatedCostUsd}/mo)
                    </span>
                  </div>
                </div>

                <div className="surface-card p-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Optimal Tier:</span>
                    <strong className="text-foreground">{estimatorCalculations.recommendedBundle.name} Package</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Included Allocation:</span>
                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {estimatorCalculations.recommendedBundle.totalTokens.toLocaleString()} Tokens (${estimatorCalculations.recommendedBundle.price})
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const b = estimatorCalculations.recommendedBundle;
                    setSelectedBundleForCheckout({
                      name: b.name,
                      tokens: b.totalTokens,
                      price: b.price,
                      bonusPercent: b.bonusPercent,
                    });
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>Apply This Package (${estimatorCalculations.recommendedBundle.price})</span>
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STRIPE CHECKOUT SIMULATION MODAL (Matches Zivofly Modal UI)  */}
      {/* ============================================================ */}
      {selectedBundleForCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            onClick={(e) => e.stopPropagation()}
            className="surface-card w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                  <CreditCard className="size-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Stripe Secure Checkout</h3>
                  <p className="text-xs text-muted-foreground">
                    Instant token credit to Zivofly account
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBundleForCheckout(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
              >
                <X className="size-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{selectedBundleForCheckout.name}</span>
                  <span className="font-mono font-bold text-foreground">
                    ${selectedBundleForCheckout.price}.00 USD
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Tokens to receive:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +{selectedBundleForCheckout.tokens.toLocaleString()} Tokens
                  </span>
                </div>
                {selectedBundleForCheckout.bonusPercent && (
                  <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1 border-t border-border">
                    <span>Bonus applied:</span>
                    <span>+{selectedBundleForCheckout.bonusPercent}% Bonus</span>
                  </div>
                )}
              </div>

              {/* Saved Card */}
              <div className="space-y-2 text-xs">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Payment Method
                </span>

                <div className="rounded-xl border border-input bg-card p-3 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-md bg-blue-600 text-white font-bold text-[10px]">
                      VISA
                    </div>
                    <div>
                      <span className="font-medium text-foreground block">Visa ending in •••• 4242</span>
                      <span className="text-[10px] text-muted-foreground">Default • Expires 12/28</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border bg-muted/20 flex flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={handleConfirmPayment}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Lock className="size-3.5" />
                <span>Stripe Payments Coming Soon</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                <ShieldCheck className="size-3 text-muted-foreground" />
                <span>256-bit SSL encrypted • Powered by Stripe Payments</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
