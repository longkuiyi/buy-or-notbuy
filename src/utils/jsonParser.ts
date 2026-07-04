import type { ShoppingReport, PKReport, PKComparison, PriceTrendPoint, RadarScores, BudgetReport, UserReview } from '../types';

export function parseReportFromText(text: string): { naturalText: string; report: ShoppingReport | null } {
  const trimmed = text.trim();

  const jsonBlockMatch = trimmed.match(/```json\s*([\s\S]*?)```/);
  const jsonString = jsonBlockMatch ? jsonBlockMatch[1].trim() : '';

  let naturalText = jsonBlockMatch
    ? trimmed.replace(jsonBlockMatch[0], '').trim()
    : trimmed;

  if (!jsonString) {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = tryParseJson(jsonMatch[0]);
      if (parsed) {
        naturalText = trimmed.replace(jsonMatch[0], '').trim();
        return { naturalText, report: normalizeReport(parsed) };
      }
    }
    return { naturalText, report: null };
  }

  const parsed = tryParseJson(jsonString);
  return { naturalText, report: parsed ? normalizeReport(parsed) : null };
}

export function parsePKReportFromText(
  text: string,
  productNames: string[]
): { naturalText: string; report: PKReport | null } {
  const trimmed = text.trim();

  const jsonBlockMatch = trimmed.match(/```json\s*([\s\S]*?)```/);
  const jsonString = jsonBlockMatch ? jsonBlockMatch[1].trim() : '';

  let naturalText = jsonBlockMatch
    ? trimmed.replace(jsonBlockMatch[0], '').trim()
    : trimmed;

  if (!jsonString) {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = tryParseJson(jsonMatch[0]);
      if (parsed) {
        naturalText = trimmed.replace(jsonMatch[0], '').trim();
        return { naturalText, report: normalizePKReport(parsed, productNames) };
      }
    }
    return { naturalText, report: null };
  }

  const parsed = tryParseJson(jsonString);
  return { naturalText, report: parsed ? normalizePKReport(parsed, productNames) : null };
}

export function parseBudgetReportFromText(
  text: string,
  budget: number
): { naturalText: string; report: BudgetReport | null } {
  const trimmed = text.trim();

  const jsonBlockMatch = trimmed.match(/```json\s*([\s\S]*?)```/);
  const jsonString = jsonBlockMatch ? jsonBlockMatch[1].trim() : '';

  let naturalText = jsonBlockMatch
    ? trimmed.replace(jsonBlockMatch[0], '').trim()
    : trimmed;

  if (!jsonString) {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = tryParseJson(jsonMatch[0]);
      if (parsed) {
        naturalText = trimmed.replace(jsonMatch[0], '').trim();
        return { naturalText, report: normalizeBudgetReport(parsed, budget) };
      }
    }
    return { naturalText, report: null };
  }

  const parsed = tryParseJson(jsonString);
  return { naturalText, report: parsed ? normalizeBudgetReport(parsed, budget) : null };
}

function normalizePKReport(data: unknown, productNames: string[]): PKReport | null {
  if (typeof data !== 'object' || data === null) return null;

  const raw = data as Record<string, unknown>;

  const rawProducts = Array.isArray(raw.products) ? raw.products : [];
  const products: ShoppingReport[] = [];

  rawProducts.forEach((item: unknown, index: number) => {
    const report = normalizeReport(item);
    if (!report) return;
    const itemRecord = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};
    const productName =
      typeof itemRecord.productName === 'string'
        ? itemRecord.productName
        : productNames[index] || `候选商品 ${index + 1}`;
    products.push({ ...report, productName });
  });

  if (products.length === 0) {
    return null;
  }

  const productNameList = products.map((p) => p.productName || '未知');
  const comparisons = normalizePKComparisons(raw.comparisons, productNameList);

  const winner = typeof raw.winner === 'string' ? raw.winner : null;

  return {
    products,
    comparisons,
    winner,
    finalAdvice: normalizeFinalAdvice(raw.finalAdvice, raw)
  };
}

function normalizePKComparisons(
  comparisons: unknown,
  productNames: string[]
): PKComparison[] {
  if (!Array.isArray(comparisons)) return [];

  return comparisons
    .map((item: unknown) => {
      if (typeof item !== 'object' || item === null) return null;
      const c = item as Record<string, unknown>;
      const dimension = typeof c.dimension === 'string' ? c.dimension : '综合';
      const scores: Record<string, number> = {};

      if (typeof c.scores === 'object' && c.scores !== null) {
        for (const [key, value] of Object.entries(c.scores as Record<string, unknown>)) {
          if (typeof value === 'number') {
            scores[key] = Math.max(1, Math.min(10, value));
          }
        }
      }

      productNames.forEach((name) => {
        if (!(name in scores)) scores[name] = 5;
      });

      const winner = typeof c.winner === 'string' ? c.winner : null;
      return { dimension, scores, winner };
    })
    .filter((item): item is PKComparison => item !== null);
}

function tryParseJson(jsonString: string): unknown | null {
  try {
    return JSON.parse(jsonString);
  } catch {
    try {
      const cleaned = jsonString
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/(['"`])\s*:\s*\1/g, '"": null');
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

export function normalizeReport(data: unknown): ShoppingReport | null {
  if (typeof data !== 'object' || data === null) return null;

  const raw = data as Record<string, unknown>;

  return {
    price: normalizePrice(raw.price, raw),
    review: normalizeReview(raw.review, raw),
    alternatives: normalizeAlternatives(raw.alternatives, raw),
    finalAdvice: normalizeFinalAdvice(raw.finalAdvice, raw)
  };
}

function normalizePrice(
  price: unknown,
  fallback: Record<string, unknown>
): ShoppingReport['price'] {
  const source =
    typeof price === 'object' && price !== null
      ? (price as Record<string, unknown>)
      : fallback;

  let platforms = Array.isArray(source.platforms)
    ? source.platforms
        .map((item: unknown) => {
          if (typeof item !== 'object' || item === null) return null;
          const i = item as Record<string, unknown>;
          return {
            name: typeof i.name === 'string' ? i.name : '未知平台',
            price: typeof i.price === 'number' ? i.price : null
          };
        })
        .filter((item): item is { name: string; price: number | null } => item !== null)
    : [];

  if (platforms.length === 0) {
    const singlePrice = findNumberPrice(source) ?? findNumberPrice(fallback);
    if (singlePrice !== null) {
      platforms = [{ name: '参考价', price: singlePrice }];
    }
  }

  const lowestPrice =
    typeof source.lowestPrice === 'number'
      ? source.lowestPrice
      : typeof source.lowest === 'number'
        ? source.lowest
        : platforms.length > 0
          ? Math.min(...platforms.map((p) => p.price ?? Infinity))
          : null;

  const lowestPlatform =
    typeof source.lowestPlatform === 'string'
      ? source.lowestPlatform
      : lowestPrice !== null && platforms.length > 0
        ? platforms.find((p) => p.price === lowestPrice)?.name || null
        : null;

  return {
    platforms,
    lowestPrice,
    lowestPlatform,
    suggestion: typeof source.suggestion === 'string' ? source.suggestion : null,
    reason: typeof source.reason === 'string' ? source.reason : null,
    trend: normalizeTrend(source.trend) ?? normalizeTrend(fallback.trend)
  };
}

function normalizeTrend(trend: unknown): PriceTrendPoint[] | null {
  if (!Array.isArray(trend) || trend.length === 0) return null;

  return trend
    .map((point: unknown) => {
      if (typeof point !== 'object' || point === null) return null;
      const p = point as Record<string, unknown>;
      const date = typeof p.date === 'string' ? p.date : null;
      const price = typeof p.price === 'number' ? p.price : null;
      if (!date || price === null) return null;
      return { date, price };
    })
    .filter((point): point is PriceTrendPoint => point !== null);
}

function normalizeReview(
  review: unknown,
  fallback: Record<string, unknown>
): ShoppingReport['review'] {
  const source =
    typeof review === 'object' && review !== null
      ? (review as Record<string, unknown>)
      : {};

  const pros = Array.isArray(source.pros)
    ? source.pros.map((p) => String(p))
    : Array.isArray(fallback.pros)
      ? fallback.pros.map((p) => String(p))
      : [];

  const cons = Array.isArray(source.cons)
    ? source.cons.map((c) => String(c))
    : Array.isArray(fallback.cons)
      ? fallback.cons.map((c) => String(c))
      : [];

  let score: number | null =
    typeof source.score === 'number' ? source.score : null;
  if (score === null && typeof fallback.score === 'number') {
    score = fallback.score;
  }
  if (score === null && typeof fallback.rating === 'number') {
    score = fallback.rating;
  }

  const summary =
    typeof source.summary === 'string'
      ? source.summary
      : typeof fallback.summary === 'string'
        ? fallback.summary
        : typeof fallback.conclusion === 'string'
          ? fallback.conclusion
          : null;

  return {
    pros,
    cons,
    score: score !== null ? Math.max(1, Math.min(10, score)) : null,
    summary,
    radar: normalizeRadar(source.radar) ?? normalizeRadar(fallback.radar),
    userReviews: normalizeUserReviews(source.userReviews) ?? normalizeUserReviews(fallback.userReviews)
  };
}

function normalizeUserReviews(reviews: unknown): UserReview[] | undefined {
  if (!Array.isArray(reviews)) return undefined;

  const result: UserReview[] = [];

  for (const item of reviews) {
    if (typeof item !== 'object' || item === null) continue;
    const r = item as Record<string, unknown>;
    const sentiment = r.sentiment as 'positive' | 'neutral' | 'negative';
    if (!['positive', 'neutral', 'negative'].includes(sentiment)) continue;
    result.push({
      source: typeof r.source === 'string' ? r.source : '未知来源',
      sentiment,
      summary: typeof r.summary === 'string' ? r.summary : '',
      quote: typeof r.quote === 'string' ? r.quote : undefined
    });
  }

  return result.length > 0 ? result : undefined;
}

function normalizeRadar(radar: unknown): RadarScores | null {
  if (typeof radar !== 'object' || radar === null) return null;

  const result: RadarScores = {};
  const r = radar as Record<string, unknown>;

  for (const [key, value] of Object.entries(r)) {
    if (typeof value === 'number') {
      result[key] = Math.max(1, Math.min(10, value));
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

function normalizeAlternatives(
  alternatives: unknown,
  fallback: Record<string, unknown>
): ShoppingReport['alternatives'] {
  const rawArray = Array.isArray(alternatives)
    ? alternatives
    : Array.isArray(fallback.alternatives)
      ? fallback.alternatives
      : [];

  if (rawArray.length === 0) return [];

  return rawArray
    .map((alt: unknown) => {
      if (typeof alt !== 'object' || alt === null) return null;
      const a = alt as Record<string, unknown>;

      const name =
        typeof a.name === 'string'
          ? a.name
          : typeof a.model === 'string'
            ? a.model
            : typeof a.product === 'string'
              ? a.product
              : '未知竞品';

      const price =
        typeof a.price === 'string' || typeof a.price === 'number'
          ? String(a.price)
          : typeof a.price_range === 'string'
            ? a.price_range
            : typeof a.priceRange === 'string'
              ? a.priceRange
              : findNumberPrice(a) !== null
                ? `¥${findNumberPrice(a)}`
                : null;

      const pros = typeof a.pros === 'string' ? a.pros : null;
      const cons = typeof a.cons === 'string' ? a.cons : null;
      const reason =
        typeof a.reason === 'string'
          ? a.reason
          : typeof a.recommendation === 'string'
            ? a.recommendation
            : null;

      return { name, price, pros, cons, reason };
    })
    .filter((alt): alt is ShoppingReport['alternatives'][number] => alt !== null);
}

function normalizeFinalAdvice(
  advice: unknown,
  fallback: Record<string, unknown>
): ShoppingReport['finalAdvice'] {
  const source =
    typeof advice === 'object' && advice !== null
      ? (advice as Record<string, unknown>)
      : {};

  let decision: string | null =
    typeof source.decision === 'string'
      ? source.decision
      : typeof fallback.decision === 'string'
        ? fallback.decision
        : typeof fallback.recommendation === 'string'
          ? fallback.recommendation
          : null;

  if (!decision) {
    const suggestion =
      typeof fallback.suggestion === 'string'
        ? fallback.suggestion
        : typeof (fallback.price as Record<string, unknown>)?.suggestion === 'string'
          ? (fallback.price as Record<string, unknown>).suggestion
          : null;
    if (typeof suggestion === 'string') {
      decision = suggestion;
    }
  }

  const reason =
    typeof source.reason === 'string'
      ? source.reason
      : typeof fallback.reason === 'string'
        ? fallback.reason
        : typeof fallback.finalThoughts === 'string'
          ? fallback.finalThoughts
          : null;

  return { decision, reason };
}

function findNumberPrice(source: Record<string, unknown>): number | null {
  const candidates = [
    source.price,
    source.currentPrice,
    source.current_price,
    source.estimatedPrice,
    source.estimated_price,
    source.referencePrice,
    source.reference_price
  ];

  for (const value of candidates) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[¥,元]/g, ''));
      if (!isNaN(parsed)) return parsed;
    }
  }

  return null;
}

function normalizeBudgetReport(data: unknown, budget: number): BudgetReport | null {
  if (typeof data !== 'object' || data === null) return null;

  const raw = data as Record<string, unknown>;

  const options = normalizeBudgetOptions(raw.options, raw);
  if (options.length === 0) return null;

  return {
    budget: typeof raw.budget === 'number' ? raw.budget : budget,
    category: typeof raw.category === 'string' ? raw.category : '',
    options,
    finalAdvice: normalizeFinalAdvice(raw.finalAdvice, raw)
  };
}

function normalizeBudgetOptions(
  options: unknown,
  fallback: Record<string, unknown>
): BudgetReport['options'] {
  const rawArray = Array.isArray(options)
    ? options
    : Array.isArray(fallback.options)
      ? fallback.options
      : [];

  return rawArray
    .map((opt: unknown) => {
      if (typeof opt !== 'object' || opt === null) return null;
      const o = opt as Record<string, unknown>;

      const name =
        typeof o.name === 'string'
          ? o.name
          : typeof o.product === 'string'
            ? o.product
            : '未知商品';

      const price =
        typeof o.price === 'string' || typeof o.price === 'number'
          ? String(o.price)
          : findNumberPrice(o) !== null
            ? `¥${findNumberPrice(o)}`
            : null;

      const matchScore =
        typeof o.matchScore === 'number'
          ? Math.max(1, Math.min(10, o.matchScore))
          : typeof o.score === 'number'
            ? Math.max(1, Math.min(10, o.score))
            : 5;

      const pros = typeof o.pros === 'string' ? o.pros : '';
      const cons = typeof o.cons === 'string' ? o.cons : '';
      const reason =
        typeof o.reason === 'string'
          ? o.reason
          : typeof o.recommendation === 'string'
            ? o.recommendation
            : '';

      return { name, price, matchScore, pros, cons, reason };
    })
    .filter((opt): opt is BudgetReport['options'][number] => opt !== null);
}
