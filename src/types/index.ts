export interface PlatformPrice {
  name: string;
  price: number | null;
}

export interface PriceTrendPoint {
  date: string;
  price: number;
}

export interface PriceAnalysis {
  platforms: PlatformPrice[];
  lowestPrice: number | null;
  lowestPlatform: string | null;
  suggestion: string | null;
  reason: string | null;
  trend?: PriceTrendPoint[] | null;
}

export interface RadarScores {
  [dimension: string]: number;
}

export interface UserReview {
  source: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  summary: string;
  quote?: string;
}

export interface ReviewSummary {
  pros: string[];
  cons: string[];
  score: number | null;
  summary: string | null;
  radar?: RadarScores | null;
  userReviews?: UserReview[];
}

export interface AlternativeProduct {
  name: string;
  price: string | null;
  pros: string | null;
  cons: string | null;
  reason: string | null;
}

export interface FinalAdvice {
  decision: string | null;
  reason: string | null;
}

export interface ShoppingReport {
  price: PriceAnalysis;
  review: ReviewSummary;
  alternatives: AlternativeProduct[];
  finalAdvice: FinalAdvice;
  productName?: string;
}

export interface PKComparison {
  dimension: string;
  scores: Record<string, number>;
  winner: string | null;
}

export interface PKReport {
  products: ShoppingReport[];
  comparisons: PKComparison[];
  winner: string | null;
  finalAdvice: FinalAdvice;
}

export interface BudgetOption {
  name: string;
  price: string | null;
  matchScore: number;
  pros: string;
  cons: string;
  reason: string;
}

export interface BudgetReport {
  budget: number;
  category: string;
  options: BudgetOption[];
  finalAdvice: FinalAdvice;
}

export type ReportResult = ShoppingReport | PKReport | BudgetReport;

export function isPKReport(report: ReportResult): report is PKReport {
  return 'products' in report && Array.isArray(report.products);
}

export function isBudgetReport(report: ReportResult): report is BudgetReport {
  return 'options' in report && Array.isArray(report.options) && 'budget' in report;
}

export type AnalysisMode = 'single' | 'pk' | 'budget';

export type MessageRole = 'user' | 'assistant';

export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string | MessageContent[];
  timestamp: Date;
  report?: ReportResult | null;
  imageUrl?: string;
}

export interface HistoryRecord {
  id: string;
  productName: string;
  isPK: boolean;
  isBudget?: boolean;
  mode?: AnalysisMode;
  naturalText: string;
  report: ReportResult;
  createdAt: number;
}

export interface WishlistItem {
  id: string;
  productName: string;
  targetPrice: number;
  basePrice: number;
  currentPrice: number;
  addedAt: number;
  lastChecked: number;
  reached: boolean;
  note?: string;
  historyId?: string;
}

export interface TrendingItem {
  productName: string;
  count: number;
  lastDecision: string | null;
  lastSearchedAt: number;
}

export type AnalysisStatus = 'idle' | 'searching' | 'analyzing' | 'generating' | 'done' | 'error';

export interface ToastState {
  show: boolean;
  message: string;
  type: 'error' | 'info' | 'success';
}
