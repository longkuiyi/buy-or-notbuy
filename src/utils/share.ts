import type { ChatMessage, ReportResult } from '../types';

interface SharedMessage {
  role: 'user' | 'assistant';
  content: string | { type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }[];
  imageUrl?: string;
  report?: ReportResult | null;
  timestamp: string;
}

export function encodeShareMessages(messages: ChatMessage[]): string {
  const data = messages.map((m) => ({
    role: m.role,
    content: m.content,
    imageUrl: m.imageUrl,
    report: m.report,
    timestamp: m.timestamp.toISOString()
  }));
  const json = JSON.stringify(data);
  return btoa(encodeURIComponent(json));
}

export function decodeShareMessages(encoded: string): ChatMessage[] | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    const data = JSON.parse(json) as SharedMessage[];
    return data.map((m) => ({
      id: Math.random().toString(36).substring(2, 10),
      role: m.role,
      content: m.content,
      imageUrl: m.imageUrl,
      report: m.report,
      timestamp: new Date(m.timestamp)
    }));
  } catch {
    return null;
  }
}

export function buildShareUrl(encoded: string): string {
  const url = new URL(window.location.href);
  url.hash = `share=${encoded}`;
  return url.toString();
}
