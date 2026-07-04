import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import './SearchDebugPanel.css';

interface SearchDebugPanelProps {
  searchContext: string;
  searchCount: number;
}

export function SearchDebugPanel({ searchContext, searchCount }: SearchDebugPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!searchContext) return null;

  const sources = searchContext
    .split(/\n\n---\n\n/)
    .map((block) => {
      const lines = block.trim().split('\n').filter(Boolean);
      const titleLine = lines[0] || '';
      const urlLine = lines.find((l) => l.startsWith('URL:')) || '';
      const summaryLines = lines.slice(1).filter((l) => !l.startsWith('URL:'));
      return {
        title: titleLine.replace(/^\[来源\d+\]\s*/, ''),
        url: urlLine.replace('URL: ', ''),
        summary: summaryLines.join('\n')
      };
    })
    .filter((s) => s.title || s.url);

  return (
    <div className="search-debug-panel">
      <button
        type="button"
        className="search-debug-toggle"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <Search size={14} />
        <span>
          本次分析基于 <strong>{searchCount}</strong> 条 Bocha 搜索结果
          {expanded ? '（已展开）' : '（可展开查看）'}
        </span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="search-debug-content">
          <p className="search-debug-hint">
            以下内容已作为上下文传给 qwen3.7-plus，用于生成决策报告。
          </p>
          {sources.length === 0 ? (
            <pre className="search-debug-raw">{searchContext}</pre>
          ) : (
            <ul className="search-debug-list">
              {sources.map((source, index) => (
                <li key={index} className="search-debug-item">
                  <div className="search-debug-header">
                    <span className="search-debug-index">来源 {index + 1}</span>
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="search-debug-link"
                      >
                        <ExternalLink size={12} />
                        打开原网页
                      </a>
                    )}
                  </div>
                  <h4 className="search-debug-title">{source.title}</h4>
                  {source.summary && (
                    <p className="search-debug-summary">{source.summary}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
