import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import './ReviewCard.css';
import type { ReviewSummary } from '../types';

interface ReviewCardProps {
  reviewSummary: ReviewSummary;
}

export function ReviewCard({ reviewSummary }: ReviewCardProps) {
  const score = reviewSummary.score ?? 0;
  const scorePercent = Math.min(100, Math.max(0, score * 10));
  const radarRef = useRef<HTMLDivElement>(null);
  const radarChartInstanceRef = useRef<echarts.ECharts | null>(null);

  const radarData = reviewSummary.radar;
  const hasRadar = radarData && Object.keys(radarData).length > 0;

  useEffect(() => {
    if (!radarRef.current || !hasRadar) return;

    if (radarChartInstanceRef.current) {
      radarChartInstanceRef.current.dispose();
    }

    const chart = echarts.init(radarRef.current);
    radarChartInstanceRef.current = chart;

    const dimensions = Object.keys(radarData);
    const values = dimensions.map((key) => radarData[key]);
    const maxValue = Math.max(...values, 10);

    const option: echarts.EChartOption = {
      backgroundColor: 'transparent',
      radar: {
        indicator: dimensions.map((name) => ({ name, max: maxValue })),
        shape: 'polygon',
        splitNumber: 4,
        axisName: {
          color: 'rgba(255,255,255,0.65)',
          fontSize: 11
        },
        splitLine: {
          lineStyle: { color: 'rgba(255,255,255,0.08)' }
        },
        splitArea: {
          areaStyle: {
            color: [
              'rgba(79,70,229,0.05)',
              'rgba(79,70,229,0.02)',
              'rgba(79,70,229,0.05)',
              'rgba(79,70,229,0.02)'
            ]
          }
        },
        axisLine: {
          lineStyle: { color: 'rgba(255,255,255,0.08)' }
        }
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: values,
              name: '综合表现',
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(79,70,229,0.4)' },
                  { offset: 1, color: 'rgba(124,58,237,0.2)' }
                ])
              },
              lineStyle: {
                color: '#7c3aed',
                width: 2
              },
              itemStyle: {
                color: '#a78bfa',
                borderColor: '#7c3aed',
                borderWidth: 2
              }
            } as any
          ]
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
  }, [radarData, hasRadar]);

  return (
    <div className="report-card review-card">
      <div className="card-header">
        <h3 className="card-title">📊 评测摘要</h3>
        <div className="score-box">
          <span className="score-value">{score.toFixed(1)}</span>
          <span className="score-total">/10</span>
        </div>
      </div>

      <div className="score-bar">
        <div className="score-progress" style={{ width: `${scorePercent}%` }} />
      </div>

      {hasRadar && <div className="radar-chart-wrapper" ref={radarRef} />}

      {reviewSummary.summary && <p className="review-summary">{reviewSummary.summary}</p>}

      <div className="review-section">
        <h4 className="review-section-title pros-title">优点</h4>
        <ul className="review-list">
          {reviewSummary.pros.map((pro, index) => (
            <li key={index} className="review-tag pro-tag">
              {pro}
            </li>
          ))}
        </ul>
      </div>

      <div className="review-section">
        <h4 className="review-section-title cons-title">缺点</h4>
        <ul className="review-list">
          {reviewSummary.cons.map((con, index) => (
            <li key={index} className="review-tag con-tag">
              {con}
            </li>
          ))}
        </ul>
      </div>

      {reviewSummary.userReviews && reviewSummary.userReviews.length > 0 && (
        <div className="review-section">
          <h4 className="review-section-title users-title">用户评价</h4>
          <div className="user-reviews">
            {reviewSummary.userReviews.map((review, index) => (
              <div key={index} className={`user-review user-review-${review.sentiment}`}>
                <div className="user-review-header">
                  <span className="user-review-source">{review.source}</span>
                  <span className={`user-review-badge user-review-badge-${review.sentiment}`}>
                    {review.sentiment === 'positive' ? '好评' : review.sentiment === 'negative' ? '差评' : '中评'}
                  </span>
                </div>
                <p className="user-review-summary">{review.summary}</p>
                {review.quote && <q className="user-review-quote">{review.quote}</q>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
