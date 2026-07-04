import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import './PriceCard.css';
import type { PriceAnalysis } from '../types';

interface PriceCardProps {
  priceAnalysis: PriceAnalysis;
}

export function PriceCard({ priceAnalysis }: PriceCardProps) {
  const barChartRef = useRef<HTMLDivElement>(null);
  const lineChartRef = useRef<HTMLDivElement>(null);
  const barChartInstanceRef = useRef<echarts.ECharts | null>(null);
  const lineChartInstanceRef = useRef<echarts.ECharts | null>(null);

  // 柱状图：各平台价格对比
  useEffect(() => {
    if (!barChartRef.current) return;

    if (barChartInstanceRef.current) {
      barChartInstanceRef.current.dispose();
    }

    const chart = echarts.init(barChartRef.current);
    barChartInstanceRef.current = chart;

    const validPlatforms = priceAnalysis.platforms.filter((p) => p.price !== null);
    const names = validPlatforms.map((p) => p.name);
    const prices = validPlatforms.map((p) => p.price as number);

    const option: echarts.EChartOption = {
      backgroundColor: 'transparent',
      grid: {
        top: 30,
        right: 20,
        bottom: 30,
        left: 60
      },
      xAxis: {
        type: 'category',
        data: names,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: { color: '#e8edf5', fontSize: 12 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: {
          color: 'rgba(255,255,255,0.5)',
          formatter: (value: number) => `¥${value}`
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15,14,23,0.95)',
        borderColor: 'rgba(124,58,237,0.3)',
        textStyle: { color: '#e8edf5' },
        formatter: (params) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `${p.name}<br/>¥${Number(p.value).toLocaleString()}`;
        }
      },
      series: [
        {
          type: 'bar',
          data: prices,
          barWidth: '40%',
          itemStyle: {
            borderRadius: [8, 8, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#4f46e5' },
              { offset: 0.5, color: '#7c3aed' },
              { offset: 1, color: '#a78bfa' }
            ])
          }
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
  }, [priceAnalysis.platforms]);

  // 折线图：近30天价格趋势
  useEffect(() => {
    if (!lineChartRef.current || !priceAnalysis.trend || priceAnalysis.trend.length === 0) {
      return;
    }

    if (lineChartInstanceRef.current) {
      lineChartInstanceRef.current.dispose();
    }

    const chart = echarts.init(lineChartRef.current);
    lineChartInstanceRef.current = chart;

    const dates = priceAnalysis.trend.map((item) => item.date);
    const prices = priceAnalysis.trend.map((item) => item.price);

    const option: echarts.EChartOption = {
      backgroundColor: 'transparent',
      grid: {
        top: 30,
        right: 20,
        bottom: 30,
        left: 60
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11 }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: {
          color: 'rgba(255,255,255,0.5)',
          formatter: (value: number) => `¥${value}`
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15,14,23,0.95)',
        borderColor: 'rgba(124,58,237,0.3)',
        textStyle: { color: '#e8edf5' },
        formatter: (params) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `${p.name}<br/>¥${Number(p.value).toLocaleString()}`;
        }
      },
      series: [
        {
          type: 'line',
          data: prices,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 3,
            color: '#7c3aed'
          },
          itemStyle: {
            color: '#a78bfa',
            borderColor: '#7c3aed',
            borderWidth: 2
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(124,58,237,0.3)' },
              { offset: 1, color: 'rgba(124,58,237,0.02)' }
            ])
          }
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
  }, [priceAnalysis.trend]);

  const suggestionClass = `suggestion-badge ${
    priceAnalysis.suggestion?.includes('立即')
      ? 'buy-now'
      : priceAnalysis.suggestion?.includes('降价')
        ? 'wait-discount'
        : 'wait-see'
  }`;

  return (
    <div className="report-card price-card">
      <div className="card-header">
        <h3 className="card-title">💰 价格分析</h3>
        {priceAnalysis.suggestion && (
          <span className={suggestionClass}>{priceAnalysis.suggestion}</span>
        )}
      </div>

      <div className="chart-wrapper" ref={barChartRef} />

      {priceAnalysis.trend && priceAnalysis.trend.length > 0 && (
        <div className="trend-section">
          <h4 className="trend-title">近30天价格走势</h4>
          <div className="trend-chart-wrapper" ref={lineChartRef} />
        </div>
      )}

      <div className="price-info">
        <div className="price-item">
          <span className="price-label">最低价</span>
          <span className="price-value lowest">
            {priceAnalysis.lowestPrice !== null
              ? `¥${priceAnalysis.lowestPrice.toLocaleString()}`
              : '暂无'}
          </span>
          {priceAnalysis.lowestPlatform && (
            <span className="lowest-platform">{priceAnalysis.lowestPlatform}</span>
          )}
        </div>
      </div>

      {priceAnalysis.reason && <p className="price-reason">{priceAnalysis.reason}</p>}
    </div>
  );
}
