import React, { useState, useId } from 'react';
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
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Layers,
  Send,
  FileText,
  Sliders,
  DollarSign,
  TrendingDown,
  Activity,
  Search,
  Filter,
  X,
  Lock,
  ChevronRight,
  ExternalLink,
  Mic,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';

// ==========================================
// TYPES & DATA STRUCTURES
// ==========================================

export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  bonus?: string;
  isPopular?: boolean;
  description: string;
  perTokenRate: string;
  features: string[];
}

export interface ConsumptionRate {
  id: string;
  action: string;
  category: 'social' | 'whatsapp' | 'voice' | 'tools' | 'rag';
  tokens: number;
  unit: string;
  usdEquivalent: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  note: string;
}

export interface TokenTransaction {
  id: string;
  description: string;
  channel: 'whatsapp' | 'voice' | 'instagram' | 'facebook' | 'crm' | 'rag' | 'topup';
  tokens: number; // Negative for deduction, positive for credit
  timestamp: string;
  category: string;
  meta?: string;
}

// 7-day usage chart data
interface DailyUsage {
  day: string;
  date: string;
  totalTokens: number;
  voiceTokens: number;
  chatTokens: number;
  crmTokens: number;
}

// 7-day visual usage data (initialized empty for new accounts)
const generateEmptyDailyUsage = (): DailyUsage[] => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const result: DailyUsage[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push({
      day: days[d.getDay()],
      date: `${months[d.getMonth()]} ${d.getDate()}`,
      totalTokens: 0,
      voiceTokens: 0,
      chatTokens: 0,
      crmTokens: 0,
    });
  }
  return result;
};

const DAILY_USAGE_DATA: DailyUsage[] = generateEmptyDailyUsage();

const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    tokens: 20000,
    price: 20,
    description: 'Perfect for pilot testing, early-stage channels, and low inquiry volumes.',
    perTokenRate: '$1.00 / 1,000 Tokens',
    features: [
      '~117 WhatsApp replies or ~44 Voice minutes',
      'Instant Stripe activation & auto-credit',
      'Full access to all CRM integrations',
      'Never expires as long as account is active',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    tokens: 55000,
    price: 50,
    bonus: '10% Bonus',
    isPopular: true,
    description: 'Our most popular tier. Designed for growing direct-to-consumer & service businesses.',
    perTokenRate: '$0.91 / 1,000 Tokens',
    features: [
      '50,000 + 5,000 Bonus Tokens (+10%)',
      '~323 WhatsApp replies or ~122 Voice minutes',
      'Priority routing on live voice streams',
      'Unlimited RAG knowledge document embeddings',
      'Multi-agent concurrency enabled',
    ],
  },
  {
    id: 'business_pro',
    name: 'Business Pro',
    tokens: 120000,
    price: 100,
    bonus: '20% Bonus',
    description: 'High-volume scale for established teams running omni-channel campaigns.',
    perTokenRate: '$0.83 / 1,000 Tokens',
    features: [
      '100,000 + 20,000 Bonus Tokens (+20%)',
      '~705 WhatsApp replies or ~266 Voice minutes',
      'Low-latency ElevenLabs cloned voice synthesis',
      'HubSpot, Salesforce, & Sheets real-time sync',
      'Priority technical support SLA',
    ],
  },
  {
    id: 'enterprise_scale',
    name: 'Enterprise Scale',
    tokens: 350000,
    price: 250,
    bonus: '40% Bonus',
    description: 'Maximum volume economy for 24/7 call centers and automated lead generation.',
    perTokenRate: '$0.71 / 1,000 Tokens',
    features: [
      '250,000 + 100,000 Bonus Tokens (+40%)',
      '~2,058 WhatsApp replies or ~777 Voice minutes',
      'Dedicated custom webhook endpoints',
      'Volume discounts on cloned voice audio notes',
      'Custom invoice billing & tax exemption',
    ],
  },
];

const CONSUMPTION_RATES: ConsumptionRate[] = [
  {
    id: 'row-1',
    action: 'Instagram / Facebook Text Reply',
    category: 'social',
    tokens: 60,
    unit: 'per incoming message answered',
    usdEquivalent: '$0.060',
    icon: MessageSquare,
    iconBg: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    iconColor: 'text-rose-500',
    note: 'Includes context retrieval, sentiment detection, and agent memory update.',
  },
  {
    id: 'row-2',
    action: 'WhatsApp Text Reply',
    category: 'whatsapp',
    tokens: 170,
    unit: 'per outbound AI message',
    usdEquivalent: '$0.170',
    icon: Send,
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    iconColor: 'text-emerald-600',
    note: 'Includes official Meta Cloud API delivery, media parsing, and quick-reply action.',
  },
  {
    id: 'row-3',
    action: 'Process Image / Respond with Cloned Voice Note',
    category: 'voice',
    tokens: 280,
    unit: 'per voice note or image processed',
    usdEquivalent: '$0.280',
    icon: Mic,
    iconBg: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    iconColor: 'text-purple-500',
    note: 'High-fidelity audio generation using your agent cloned voice timbre + vision OCR.',
  },
  {
    id: 'row-4',
    action: 'Live Voice Call with Cloned Voice',
    category: 'voice',
    tokens: 450,
    unit: 'per minute connected',
    usdEquivalent: '$0.450 / min',
    icon: PhoneCall,
    iconBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    iconColor: 'text-amber-500',
    note: 'Full duplex real-time speech-to-speech with natural cadence, barge-in, & noise suppression.',
  },
  {
    id: 'row-5',
    action: 'Google Sheets / Salesforce / HubSpot Tool Action',
    category: 'tools',
    tokens: 15,
    unit: 'per tool execution',
    usdEquivalent: '$0.015',
    icon: Database,
    iconBg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    iconColor: 'text-blue-500',
    note: 'Real-time row insert, contact lookup, deal stage update, or ticket creation.',
  },
  {
    id: 'row-6',
    action: 'RAG Knowledge Document Upload',
    category: 'rag',
    tokens: 35,
    unit: 'per document parsed & vectorized',
    usdEquivalent: '$0.035',
    icon: FileText,
    iconBg: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    iconColor: 'text-teal-500',
    note: 'PDF, Word, or text chunking into semantic vector store for instant retrieval.',
  },
];

// Initial transactions (empty for new accounts)
const INITIAL_TRANSACTIONS: TokenTransaction[] = [];

// ==========================================
// MAIN BILLING DASHBOARD COMPONENT
// ==========================================

export const BillingDashboard: React.FC = () => {
  // Primary Token Balance state (starts at 0 for fresh accounts)
  const [tokenBalance, setTokenBalance] = useState<number>(0);

  // Auto-recharge state
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState<boolean>(false);
  const [thresholdTokens, setThresholdTokens] = useState<string>('10000');
  const [purchaseBundle, setPurchaseBundle] = useState<string>('growth');
  const [isSavingAutoRecharge, setIsSavingAutoRecharge] = useState<boolean>(false);

  // Transaction list state
  const [transactions, setTransactions] = useState<TokenTransaction[]>(INITIAL_TRANSACTIONS);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected package for Stripe checkout modal
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

  // Active chart day hover
  const [activeChartDay, setActiveChartDay] = useState<DailyUsage | null>(DAILY_USAGE_DATA[DAILY_USAGE_DATA.length - 1] || null);

  // Unique IDs for accessibility
  const autoRechargeId = useId();

  // Helper conversions
  const usdValue = (tokenBalance / 1000).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  const estimatedDaysRemaining = Math.max(1, Math.round(tokenBalance / 5800));

  // Handle Auto-Recharge toggle change
  const handleToggleAutoRecharge = () => {
    const nextVal = !autoRechargeEnabled;
    setAutoRechargeEnabled(nextVal);
    if (nextVal) {
      toast.success('Auto-recharge enabled: your agents will never run out of tokens.');
    } else {
      toast.info('Auto-recharge disabled: agents will pause if balance reaches 0.');
    }
  };

  // Handle saving auto-recharge settings
  const handleSaveAutoRechargeSettings = () => {
    setIsSavingAutoRecharge(true);
    setTimeout(() => {
      setIsSavingAutoRecharge(false);
      toast.success(
        `Auto-recharge configured: auto-purchasing ${
          purchaseBundle === 'growth' ? 'Growth Bundle (55,000 Tokens)' : 'Business Pro (120,000 Tokens)'
        } when balance drops below ${Number(thresholdTokens).toLocaleString()} tokens.`
      );
    }, 450);
  };

  // Initiate Stripe purchase
  const handleStartStripeCheckout = (pkg: TokenPackage) => {
    setSelectedPackage(pkg);
  };

  // Execute Stripe purchase simulation
  const handleConfirmStripePayment = () => {
    if (!selectedPackage) return;
    toast.info('Stripe payments coming soon!');
    setSelectedPackage(null);
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesCategory =
      filterCategory === 'all' ||
      (filterCategory === 'voice' && tx.channel === 'voice') ||
      (filterCategory === 'whatsapp' && tx.channel === 'whatsapp') ||
      (filterCategory === 'social' && (tx.channel === 'instagram' || tx.channel === 'facebook')) ||
      (filterCategory === 'tools' && (tx.channel === 'crm' || tx.channel === 'rag')) ||
      (filterCategory === 'topup' && tx.channel === 'topup');

    const matchesSearch =
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.meta && tx.meta.toLowerCase().includes(searchQuery.toLowerCase())) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors selection:bg-primary/20">
      {/* Executive Ambient Glow Background */}
      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
        {/* Top Breadcrumb & Executive Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Zivofly Platform</span>
              <span>•</span>
              <span className="text-primary font-bold">Billing & Token Economy</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-display">
              Billing & Token Management
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Tokens power your autonomous AI agents across WhatsApp, Voice Calls, Instagram, and connected CRM tools.
              <span className="ml-1.5 inline-flex items-center gap-1 font-medium text-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/60 text-[11px]">
                <Zap className="size-3 text-amber-500 fill-amber-500" />
                1,000 Tokens = $1.00 USD
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => {
                const pricingEl = document.getElementById('pricing-cards-section');
                pricingEl?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-all cursor-pointer hover:shadow-emerald-600/20"
            >
              <Coins className="size-4" />
              <span>Top Up Tokens</span>
            </button>
            <button
              type="button"
              onClick={() => {
                toast.info('Downloading monthly transaction statement PDF…');
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors shadow-2xs cursor-pointer"
            >
              <CreditCard className="size-3.5 text-muted-foreground" />
              <span>Invoices</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 1: TOKEN BALANCE & AUTO-RECHARGE HEADER              */}
        {/* ============================================================ */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Card A: Large Visual Balance Indicator (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-xs relative overflow-hidden flex flex-col justify-between">
            {/* Ambient Background Accent */}
            <div className="absolute -right-16 -top-16 size-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div className="absolute right-0 bottom-0 size-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs">
                    <Coins className="size-5.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Current Token Balance
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Prepaid balance available across all active agents
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Healthy Reserve</span>
                </span>
              </div>

              {/* Huge Visual Token Count */}
              <div className="pt-2">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground font-mono">
                    {tokenBalance.toLocaleString()}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-muted-foreground">
                    Tokens
                  </span>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                    ≈ {usdValue}
                  </span>
                </div>
              </div>

              {/* Progress and Runway Bar */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Activity className="size-3 text-muted-foreground" />
                    <span>Estimated Runway:</span>
                    <strong className="text-foreground font-semibold">~{estimatedDaysRemaining} days</strong>
                  </span>
                  <span>Avg. Burn: ~5,800 tokens / day</span>
                </div>

                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(15, (tokenBalance / 60000) * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Quick Chips */}
            <div className="pt-5 mt-4 border-t border-border/70 flex items-center justify-between gap-4 flex-wrap text-xs text-muted-foreground relative z-10">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-emerald-600" />
                  <span>Encrypted Stripe Ledger</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span>Tokens Never Expire</span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('consumption-rates-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>View action costs</span>
                <ChevronRight className="size-3" />
              </button>
            </div>
          </div>

          {/* Card B: Auto-Recharge Switch & Configuration (5 cols) */}
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
                      Prevent voice dropouts and paused WhatsApp agents
                    </p>
                  </div>
                </div>

                {/* Switch Toggle Button - Solid Emerald Green when ON */}
                <button
                  type="button"
                  role="switch"
                  id={autoRechargeId}
                  aria-checked={autoRechargeEnabled}
                  onClick={handleToggleAutoRecharge}
                  title={autoRechargeEnabled ? 'Auto-Renewal is switched on' : 'Auto-Renewal is switched off'}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    autoRechargeEnabled
                      ? 'bg-emerald-600 shadow-sm shadow-emerald-600/30'
                      : 'bg-muted border border-input'
                  }`}
                >
                  <span className="sr-only">Toggle auto-renewal</span>
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      autoRechargeEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Smooth Reveal Configuration Container */}
              {autoRechargeEnabled ? (
                <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Auto-recharge rule active</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* Threshold Dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                        <span>When balance falls below:</span>
                        <span className="font-mono text-muted-foreground">Threshold</span>
                      </label>
                      <select
                        value={thresholdTokens}
                        onChange={(e) => setThresholdTokens(e.target.value)}
                        className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-2xs font-medium cursor-pointer"
                      >
                        <option value="5000">5,000 Tokens (~$5.00 safety buffer)</option>
                        <option value="10000">10,000 Tokens (Recommended • ~$10.00)</option>
                        <option value="20000">20,000 Tokens (High-traffic • ~$20.00)</option>
                      </select>
                    </div>

                    {/* Auto-Purchase Package Dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                        <span>Auto-purchase package:</span>
                        <span className="font-mono text-muted-foreground">Top-Up Bundle</span>
                      </label>
                      <select
                        value={purchaseBundle}
                        onChange={(e) => setPurchaseBundle(e.target.value)}
                        className="w-full rounded-xl border border-input bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-2xs font-medium cursor-pointer"
                      >
                        <option value="growth">Growth Bundle: 55,000 Tokens ($50) • +10% Bonus</option>
                        <option value="pro">Business Pro: 120,000 Tokens ($100) • +20% Bonus</option>
                      </select>
                    </div>
                  </div>

                  {/* Payment Method Badge & Save Button */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                      <CreditCard className="size-3.5 text-foreground" />
                      <span>Visa •••• 4242</span>
                    </div>

                    <button
                      type="button"
                      disabled={isSavingAutoRecharge}
                      onClick={handleSaveAutoRechargeSettings}
                      className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-3.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                    >
                      {isSavingAutoRecharge ? 'Saving…' : 'Save Config'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-2.5">
                  <p className="font-semibold text-foreground">Auto-renewal is currently turned off.</p>
                  <p className="text-[11px] leading-relaxed">
                    If your balance hits zero, live voice conversations will disconnect and incoming WhatsApp/Instagram replies will be paused until manually topped up.
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
              <span>Billed via Stripe billing portal</span>
              <a
                href="#billing-portal"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info('Opening Stripe Customer Portal for card management…');
                }}
                className="text-muted-foreground hover:text-foreground underline inline-flex items-center gap-1"
              >
                <span>Manage payment methods</span>
                <ExternalLink className="size-2.5" />
              </a>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 2: TOKEN TOP-UP PRICING CARDS (GRID OF 4)           */}
        {/* ============================================================ */}
        <section id="pricing-cards-section" className="space-y-5 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Instant Top-Up
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Prepaid Bundles
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display mt-0.5">
                Token Top-Up Pricing
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                One-time prepaid token packs credited to your account instantly with zero recurring commitment.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span>Direct Stripe Checkout • All major cards accepted</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {TOKEN_PACKAGES.map((pkg) => {
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
                    className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between relative overflow-hidden h-full ${
                      isHighlight
                        ? 'border-2 border-emerald-500/60 dark:border-emerald-400/70 bg-card shadow-[0_16px_40px_-8px_rgba(16,185,129,0.35)] dark:shadow-[0_20px_50px_-8px_rgba(16,185,129,0.45)]'
                        : 'border-border bg-card hover:border-border/80 shadow-xs hover:shadow-sm'
                    }`}
                  >
                    {/* Popular Banner */}
                    {pkg.bonus && (
                      <div
                        className={`px-3 py-1.5 text-center text-[10px] font-bold tracking-wider uppercase ${
                          isHighlight
                            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-b border-emerald-500/30'
                            : 'bg-muted text-muted-foreground border-b border-border'
                        }`}
                      >
                        {pkg.bonus} included
                      </div>
                    )}

                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-bold text-foreground">{pkg.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {pkg.description}
                          </p>
                        </div>
                        {isHighlight && (
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                            Most Popular
                          </span>
                        )}
                      </div>

                      {/* Price and Tokens */}
                      <div className="pt-2 border-t border-border/60">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-extrabold text-foreground font-mono">
                            ${pkg.price}
                          </span>
                          <span className="text-xs text-muted-foreground">USD one-time</span>
                        </div>

                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-sm font-bold text-primary font-mono">
                            {pkg.tokens.toLocaleString()} Tokens
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            ({pkg.perTokenRate})
                          </span>
                        </div>
                      </div>

                      {/* Features Bullet List */}
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <span className="text-[11px] font-semibold text-foreground block">
                          Included Economy:
                        </span>
                        <ul className="space-y-2 text-xs text-muted-foreground">
                          {pkg.features.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2
                                className={`size-3.5 shrink-0 mt-0.5 ${
                                  isHighlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary'
                                }`}
                              />
                              <span className="leading-tight">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Buy with Stripe CTA Button */}
                    <div className="p-6 pt-0">
                      <button
                        type="button"
                        onClick={() => handleStartStripeCheckout(pkg)}
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
        </section>

        {/* ============================================================ */}
        {/* SECTION 3: CONSUMPTION RATES TABLE (TRANSPARENCY SECTION)   */}
        {/* ============================================================ */}
        <section id="consumption-rates-section" className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Cost Breakdown
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  Deterministic Rates
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display mt-0.5">
                Consumption Rates Table
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Transparent token burn schedules across all supported channel actions and integration tools.
              </p>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-xl border border-border/60">
              Formula: <code className="font-mono text-foreground">1 Token = $0.001 USD</code>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                    <th scope="col" className="py-3.5 px-4 sm:px-6">Channel / Action</th>
                    <th scope="col" className="py-3.5 px-4">Billing Unit</th>
                    <th scope="col" className="py-3.5 px-4 text-right">Token Cost</th>
                    <th scope="col" className="py-3.5 px-4 text-right">USD Equivalent</th>
                    <th scope="col" className="py-3.5 px-4 hidden md:table-cell">Technical Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {CONSUMPTION_RATES.map((rate) => {
                    const IconComponent = rate.icon;

                    return (
                      <tr
                        key={rate.id}
                        className="hover:bg-muted/20 transition-colors group"
                      >
                        {/* Action + Icon */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex size-9 items-center justify-center rounded-xl border shrink-0 ${rate.iconBg}`}
                            >
                              <IconComponent className="size-4.5" />
                            </div>
                            <div>
                              <span className="font-bold text-foreground block group-hover:text-primary transition-colors">
                                {rate.action}
                              </span>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                {rate.category}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Unit */}
                        <td className="py-3.5 px-4 text-muted-foreground font-medium">
                          {rate.unit}
                        </td>

                        {/* Token Cost */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-foreground text-sm bg-muted/50 px-2.5 py-1 rounded-lg border border-border/60">
                            <Zap className="size-3 text-amber-500 fill-amber-500" />
                            <span>{rate.tokens.toLocaleString()}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">Tokens</span>
                          </span>
                        </td>

                        {/* USD Equivalent */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {rate.usdEquivalent}
                        </td>

                        {/* Note */}
                        <td className="py-3.5 px-4 text-muted-foreground text-[11px] leading-relaxed hidden md:table-cell max-w-xs">
                          {rate.note}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer Banner */}
            <div className="p-4 bg-muted/20 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <HelpCircle className="size-4 text-muted-foreground" />
                <span>Need custom high-volume pricing for 500,000+ monthly tokens?</span>
              </span>
              <a
                href="#enterprise-inquiry"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info('Connecting to enterprise account manager for volume discount contract.');
                }}
                className="text-primary font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Contact Enterprise Sales</span>
                <ArrowUpRight className="size-3.5" />
              </a>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 4: RECENT TOKEN USAGE GRAPH & TRANSACTION LIST      */}
        {/* ============================================================ */}
        <section className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Activity Audit
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  Real-Time Ledger
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display mt-0.5">
                Recent Token Usage & Deduction History
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Live ledger of token debits and credits across WhatsApp, Voice, Social, and CRM webhooks.
              </p>
            </div>

            {/* Quick Stats Pill */}
            <div className="flex items-center gap-3 text-xs bg-card p-2 rounded-xl border border-border shadow-2xs">
              <div className="px-2">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">7-Day Burn</span>
                <span className="font-mono font-bold text-foreground">42,500 Tokens</span>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="px-2">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Peak Channel</span>
                <span className="font-semibold text-emerald-600">Inbound Voice (58%)</span>
              </div>
            </div>
          </div>

          {/* 7-Day Usage Visual Bar Chart */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Activity className="size-4 text-primary" />
                  <span>7-Day Token Consumption Breakdown</span>
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Hover over bars to inspect daily channel splits
                </p>
              </div>

              {/* Active Day Detail Capsule */}
              {activeChartDay && (
                <div className="flex items-center gap-3 text-xs font-mono bg-muted/50 px-3 py-1.5 rounded-xl border border-border/80">
                  <span className="font-semibold text-foreground">{activeChartDay.day} ({activeChartDay.date}):</span>
                  {activeChartDay.totalTokens > 0 ? (
                    <>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        -{activeChartDay.totalTokens.toLocaleString()} Tokens
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        (Voice: {activeChartDay.voiceTokens.toLocaleString()} | Chat: {activeChartDay.chatTokens.toLocaleString()})
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">0 tokens consumed</span>
                  )}
                </div>
              )}
            </div>

            {/* Bar Chart Visualization (Pure Tailwind) */}
            <div className="pt-4 pb-2">
              <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-48 sm:h-52 w-full">
                {DAILY_USAGE_DATA.map((d) => {
                  const maxDay = 9000;
                  const totalHeightPct = d.totalTokens > 0 ? Math.min(100, Math.max(15, (d.totalTokens / maxDay) * 100)) : 8;
                  const isSelected = activeChartDay?.day === d.day;

                  return (
                    <div
                      key={d.day}
                      onMouseEnter={() => setActiveChartDay(d)}
                      onClick={() => setActiveChartDay(d)}
                      className="group flex flex-col items-center justify-end h-full gap-2 cursor-pointer"
                    >
                      {/* Token Value Tag on top */}
                      <span className="text-[10px] font-mono text-muted-foreground group-hover:text-foreground font-semibold group-hover:scale-105 transition-all">
                        {d.totalTokens >= 1000 ? `${(d.totalTokens / 1000).toFixed(1)}k` : d.totalTokens}
                      </span>

                      {/* Stacked Vertical Bar */}
                      <div className="w-full max-w-[48px] h-full flex items-end">
                        <div
                          className={`w-full rounded-xl transition-all duration-300 relative overflow-hidden flex flex-col justify-end ${
                            isSelected
                              ? 'ring-2 ring-emerald-500 shadow-md shadow-emerald-500/10'
                              : 'hover:brightness-110'
                          } ${d.totalTokens === 0 ? 'bg-muted/40 border border-dashed border-border' : ''}`}
                          style={{ height: `${totalHeightPct}%` }}
                        >
                          {d.totalTokens > 0 && (
                            <>
                              {/* Segment 1: Voice (amber) */}
                              <div
                                className="w-full bg-amber-500"
                                style={{ height: `${(d.voiceTokens / d.totalTokens) * 100}%` }}
                                title={`Voice: ${d.voiceTokens} Tokens`}
                              />
                              {/* Segment 2: WhatsApp/Chat (emerald) */}
                              <div
                                className="w-full bg-emerald-600"
                                style={{ height: `${(d.chatTokens / d.totalTokens) * 100}%` }}
                                title={`Chat: ${d.chatTokens} Tokens`}
                              />
                              {/* Segment 3: CRM/Tools (blue) */}
                              <div
                                className="w-full bg-blue-500"
                                style={{ height: `${(d.crmTokens / d.totalTokens) * 100}%` }}
                                title={`CRM/Tools: ${d.crmTokens} Tokens`}
                              />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Day Label */}
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

              {/* Chart Legend */}
              <div className="flex items-center justify-center gap-5 pt-5 text-xs text-muted-foreground border-t border-border/60 mt-3 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-amber-500" />
                  <span>Voice Calls (450 t/min)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-emerald-600" />
                  <span>WhatsApp & Social (60-170 t)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm bg-blue-500" />
                  <span>CRM Webhooks (15-35 t)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Filterable Transaction History List */}
          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            {/* Header + Search & Filter Tabs */}
            <div className="p-5 border-b border-border space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Transaction Ledger</h3>
                  <p className="text-xs text-muted-foreground">
                    Showing latest deductions and top-ups ({filteredTransactions.length} records)
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-64">
                  <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search logs (e.g. WhatsApp, Voice)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { key: 'all', label: 'All Transactions' },
                  { key: 'voice', label: 'Voice Calls' },
                  { key: 'whatsapp', label: 'WhatsApp' },
                  { key: 'social', label: 'Instagram / FB' },
                  { key: 'tools', label: 'CRM & Tools' },
                  { key: 'topup', label: 'Top-Ups' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilterCategory(tab.key)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      filterCategory === tab.key
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction List Items */}
            <div className="divide-y divide-border/60">
              {transactions.length === 0 ? (
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
              ) : filteredTransactions.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No token transactions found matching your filter criteria.
                </div>
              ) : (
                filteredTransactions.map((tx) => {
                  const isCredit = tx.tokens > 0;

                  return (
                    <div
                      key={tx.id}
                      className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Channel Icon Badge */}
                        <div
                          className={`flex size-9 items-center justify-center rounded-xl border shrink-0 ${
                            isCredit
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : tx.channel === 'voice'
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              : tx.channel === 'whatsapp'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                              : tx.channel === 'crm'
                              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              : 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                          }`}
                        >
                          {isCredit ? (
                            <CreditCard className="size-4" />
                          ) : tx.channel === 'voice' ? (
                            <PhoneCall className="size-4" />
                          ) : tx.channel === 'whatsapp' ? (
                            <Send className="size-4" />
                          ) : tx.channel === 'crm' ? (
                            <Database className="size-4" />
                          ) : (
                            <MessageSquare className="size-4" />
                          )}
                        </div>

                        {/* Title and Metadata */}
                        <div className="min-w-0 space-y-0.5">
                          <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
                            {tx.description}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                            <span>{tx.timestamp}</span>
                            {tx.meta && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-xs sm:max-w-md">{tx.meta}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Token Value Deduction / Credit Pill */}
                      <div className="text-right shrink-0">
                        <span
                          className={`font-mono text-xs sm:text-sm font-bold block ${
                            isCredit
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-foreground'
                          }`}
                        >
                          {isCredit ? `+${tx.tokens.toLocaleString()}` : `${tx.tokens.toLocaleString()}`} Tokens
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {isCredit
                            ? `+$${(tx.tokens / 1000).toFixed(2)} USD`
                            : `-$${(Math.abs(tx.tokens) / 1000).toFixed(3)} USD`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ============================================================ */}
      {/* STRIPE CHECKOUT MODAL (ONE-TIME TOP-UP SIMULATOR)            */}
      {/* ============================================================ */}
      {selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <CreditCard className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Stripe Secure Checkout</h3>
                  <p className="text-xs text-muted-foreground">
                    Instant credit to Zivofly Token Balance
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPackage(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <X className="size-4.5" />
              </button>
            </div>

            {/* Order Summary */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{selectedPackage.name} Token Bundle</span>
                <span className="font-mono font-bold text-foreground">${selectedPackage.price}.00</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Tokens to receive</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  +{selectedPackage.tokens.toLocaleString()} Tokens
                </span>
              </div>
              {selectedPackage.bonus && (
                <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1 border-t border-border/60">
                  <span>Bonus value included:</span>
                  <span>{selectedPackage.bonus}</span>
                </div>
              )}
            </div>

            {/* Mock Card Form */}
            <div className="space-y-3 text-xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Saved Payment Method
              </span>

              <div className="rounded-xl border border-border bg-background p-3 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-md bg-blue-600 text-white font-bold text-[10px]">
                    VISA
                  </div>
                  <div>
                    <span className="font-medium text-foreground block">Visa ending in •••• 4242</span>
                    <span className="text-[10px] text-muted-foreground">Expires 12/28 • Default card</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Verified
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmStripePayment}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Lock className="size-3.5" />
                <span>Stripe Payments Coming Soon</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground pt-1">
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
