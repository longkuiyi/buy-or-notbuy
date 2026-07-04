import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { Trophy, TrendingDown, Star, Check, X as XIcon } from 'lucide-react';
import './PKReportView.css';
import type { PKReport, ShoppingReport } from '../types';

interface PKReportViewProps {
  report: PKReport;
}

const PK_COLORS = ['#6366f1', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b'];

export function PKReportView({ report }: PKReportViewProps) {
  const radarRef = useRef<HTMLDivElement>(null);
  const radarInstanceRef = useRef<echarts.ECharts | null>(null);

  const { products, comparisons, winner, finalAdvice } = report;
  const productNames = products.map((p) => p.productName || '未知');

  useEffect(() => {
    if (!radarRef.current || comparisons.length === 0) return;

    if (radarInstanceRef.current) {
      radarInstanceRef.current.dispose();
    }

    const chart = echarts.init(radarRef.current);
    radarInstanceRef.current = chart;

    const indicators = comparisons.map((c) => ({ name: c.dimension, max: 10 }));

    const seriesData = productNames.map((name, index) => ({
      value: comparisons.map((c) => c.scores[name] ?? 5),
      name,
      symbol: 'circle',
      symbolSize: 5,
      lineStyle: { color: PK_COLORS[index % PK_COLORS.length], width: 2 },
      itemStyle: { color: PK_COLORS[index % PK_COLORS.length] },
      areaStyle: { color: PK_COLORS[index % PK_COLORS.length], opacity: 0.12 }
    }));

    const option: echarts.EChartOption = {
      backgroundColor: 'transparent',
      legend: {
        data: productNames,
        textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
        bottom: 0,
        itemWidth: 12,
        itemHeight: 12
      },
      tooltip: {
        backgroundColor: 'rgba(15,14,23,0.95)',
        borderColor: 'rgba(124,58,237,0.3)',
        textStyle: { color: '#e8edf5' }
      },
      radar: {
        indicator: indicators,
        shape: 'polygon',
        splitNumber: 4,
        center: ['50%', '46%'],
        radius: '62%',
        axisName: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
        splitArea: {
          areaStyle: {
            color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)']
          }
        },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } }
      },
      series: [
        {
          type: 'radar',
          data: seriesData as any
        }
      ]
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [comparisons, productNames]);

  const winnerIndex = productNames.findIndex((n) => n === winner);

  return (
    <div className="pk-report">
      {/* 结论前置：胜出横幅 */}
      <div className="pk-verdict">
        <div className="pk-verdict-badge">
          <Trophy size={18} />
          <span>PK 结论</span>
        </div>
        <div className="pk-verdict-body">
          <div className="pk-verdict-winner">
            {winner ? (
              <>
                <span className="pk-verdict-label">最值得买</span>
                <span
                  className="pk-verdict-name"
                  style={{ color: winnerIndex >= 0 ? PK_COLORS[winnerIndex % PK_COLORS.length] : '#e8edf5' }}
                >
                  {winner}
                </span>
              </>
            ) : (
              <span className="pk-verdict-name">{finalAdvice.decision || '综合对比如下'}</span>
            )}
          </div>
          {finalAdvice.reason && <p className="pk-verdict-reason">{finalAdvice.reason}</p>}
        </div>
      </div>

      {/* 并排对比栏 */}
      <div className="pk-columns-scroll">
        <div className="pk-columns" style={{ gridTemplateColumns: `repeat(${products.length}, minmax(220px, 1fr))` }}>
          {products.map((product, index) => (
            <PKColumn
              key={index}
              product={product}
              color={PK_COLORS[index % PK_COLORS.length]}
              isWinner={product.productName === winner}
            />
          ))}
        </div>
      </div>

      {/* 叠加雷达图 */}
      {comparisons.length > 0 && (
        <div className="report-card pk-radar-card">
          <div className="card-header">
            <h3 className="card-title">🎯 维度对比雷达</h3>
          </div>
          <div className="pk-radar-chart" ref={radarRef} />
          <div className="pk-dimension-winners">
            {comparisons.map((c, i) => (
              <div key={i} className="pk-dim-winner-pill">
                <span className="pk-dim-name">{c.dimension}</span>
                {c.winner && <span className="pk-dim-best">{c.winner} 领先</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface PKColumnProps {
  product: ShoppingReport;
  color: string;
  isWinner?: boolean;
}

function PKColumn({ product, color, isWinner }: PKColumnProps) {
  const { price, review } = product;
  const score = review.score ?? 0;

  return (
    <div className={`pk-column ${isWinner ? 'winner' : ''}`} style={isWinner ? { borderColor: color } : undefined}>
      {isWinner && (
        <div className="pk-column-crown" style={{ background: color }}>
          <Trophy size={12} />
          推荐
        </div>
      )}

      <div className="pk-column-header" style={{ borderColor: color }}>
        <span className="pk-column-dot" style={{ background: color }} />
        <h4 className="pk-column-name">{product.productName || '未知商品'}</h4>
      </div>

      <div className="pk-metric">
        <span className="pk-metric-label">
          <Star size={13} /> 综合评分
        </span>
        <span className="pk-metric-value" style={{ color }}>
          {score.toFixed(1)}
          <span className="pk-metric-unit">/10</span>
        </span>
      </div>

      <div className="pk-metric">
        <span className="pk-metric-label">
          <TrendingDown size={13} /> 最低价
        </span>
        <span className="pk-metric-value">
          {price.lowestPrice !== null ? `¥${price.lowestPrice.toLocaleString()}` : '暂无'}
        </span>
      </div>

      {price.lowestPlatform && (
        <div className="pk-metric-sub">{price.lowestPlatform}最低</div>
      )}

      {price.suggestion && (
        <div className="pk-column-suggestion">{price.suggestion}</div>
      )}

      <div className="pk-column-divider" />

      <div className="pk-proscons">
        <span className="pk-proscons-title pros">优点</span>
        <ul>
          {review.pros.slice(0, 3).map((pro, i) => (
            <li key={i}>
              <Check size={12} className="pk-icon-pro" />
              {pro}
            </li>
          ))}
        </ul>
      </div>

      <div className="pk-proscons">
        <span className="pk-proscons-title cons">缺点</span>
        <ul>
          {review.cons.slice(0, 3).map((con, i) => (
            <li key={i}>
              <XIcon size={12} className="pk-icon-con" />
              {con}
            </li>
          ))}
        </ul>
      </div>

      {product.finalAdvice.decision && (
        <div className="pk-column-decision" style={{ background: `${color}1a`, color }}>
          {product.finalAdvice.decision}
        </div>
      )}
    </div>
  );
}
