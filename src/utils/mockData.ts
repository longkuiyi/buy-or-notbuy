import type { ShoppingReport, BudgetReport } from '../types';

export function getMockReport(productName: string = '该商品'): ShoppingReport {
  return {
    price: {
      platforms: [
        { name: '京东', price: 8999 },
        { name: '淘宝', price: 8799 },
        { name: '拼多多', price: 8499 }
      ],
      lowestPrice: 8499,
      lowestPlatform: '拼多多',
      suggestion: '等降价',
      reason: `目前${productName}价格处于相对高位，距离电商大促（618/双11）通常会有500-800元降幅，不急用可以等等。`,
      trend: generateMockTrend(8999, 30)
    },
    review: {
      pros: [
        '旗舰级性能，日常使用和大型应用都很流畅',
        '做工质感和系统生态体验出色',
        '品牌售后和保值率相对较好'
      ],
      cons: [
        '首发价格偏高，性价比一般',
        '部分高端功能对普通用户实用性不强',
        '配件和维修成本较高'
      ],
      score: 8.2,
      summary: `${productName}整体产品力不错，但当前价格偏贵，适合预算充足且明确需求的用户。`,
      radar: {
        性价比: 6.5,
        性能: 9,
        续航: 8,
        拍照: 8.5,
        售后: 9,
        做工: 9
      }
    },
    alternatives: [
      {
        name: '上一代旗舰',
        price: '6500-7500元',
        pros: '性能依然够用，价格更友好',
        cons: '缺少最新功能和设计语言',
        reason: '适合追求实用、不追新的用户'
      },
      {
        name: '同价位国产旗舰',
        price: '7000-9000元',
        pros: '配置堆料更激进，快充和屏幕素质优秀',
        cons: '品牌溢价和二手保值率偏弱',
        reason: '适合看重参数和性价比的用户'
      },
      {
        name: '中端性价比机型',
        price: '3000-4500元',
        pros: '核心体验差距不大，价格优势明显',
        cons: '影像、质感和细节体验有差距',
        reason: '适合预算有限、主要满足日常使用的用户'
      }
    ],
    finalAdvice: {
      decision: '再等等',
      reason: `如果你对${productName}不是刚需，建议等到下一个电商大促节点入手，预计能省下一笔。如果急用，优先选择拼多多百亿补贴或京东自营，注意比价和售后政策。`
    }
  };
}

export function getMockFollowUpResponse(productName: string = '该商品'): { naturalText: string; report: ShoppingReport } {
  const report = getMockReport(productName);
  return {
    naturalText: `根据你的追问，${productName}的价格走势一般会在发布后3个月左右出现第一次明显降价，6个月左右达到一个比较稳的价格区间。如果当前距离新品发布已经超过3个月，可以再等等大促。`,
    report
  };
}

export function getMockPKReport(productNames: string[]): import('../types').PKReport {
  const [a, b, c, d, e] = productNames;
  const validNames = [a, b, c, d, e].filter(Boolean) as string[];
  const products = validNames.map((name, index) => ({
    ...getMockReport(name),
    productName: name,
    price: {
      ...getMockReport(name).price,
      lowestPrice: 7999 - index * 400,
      trend: generateMockTrend(7999 - index * 400, 30)
    }
  }));

  const productNameList = products.map((p) => p.productName);

  return {
    products,
    comparisons: [
      {
        dimension: '性价比',
        scores: Object.fromEntries(productNameList.map((name, i) => [name, 8 - i * 0.8])),
        winner: productNameList[productNameList.length - 1]
      },
      {
        dimension: '性能',
        scores: Object.fromEntries(productNameList.map((name, i) => [name, 7.5 + i * 0.5])),
        winner: productNameList[0]
      },
      {
        dimension: '拍照',
        scores: Object.fromEntries(productNameList.map((name, i) => [name, 8 - i * 0.3])),
        winner: productNameList[0]
      },
      {
        dimension: '续航',
        scores: Object.fromEntries(productNameList.map((name, i) => [name, 7 + i * 0.4])),
        winner: productNameList[productNameList.length - 1]
      }
    ],
    winner: productNameList[0] || '未知',
    finalAdvice: {
      decision: `买 ${productNameList[0] || '第一款'}`,
      reason: `综合价格、性能和用户评价，${productNameList[0] || '第一款'} 在 PK 中表现更均衡，适合大多数用户入手。`
    }
  };
}

export function getMockBudgetReport(budget: number, category: string = '手机'): BudgetReport {
  return {
    budget,
    category,
    options: [
      {
        name: `${category}推荐 A`,
        price: `约 ${Math.round(budget * 0.85)} 元`,
        matchScore: 9,
        pros: '性价比突出，核心配置均衡',
        cons: '品牌知名度一般，售后网点较少',
        reason: '预算内综合最优选择'
      },
      {
        name: `${category}推荐 B`,
        price: `约 ${Math.round(budget * 0.95)} 元`,
        matchScore: 8,
        pros: '大牌品质，售后完善',
        cons: '配置相对保守',
        reason: '看重品牌和售后时优先'
      },
      {
        name: `${category}推荐 C`,
        price: `约 ${Math.round(budget * 1.05)} 元`,
        matchScore: 7,
        pros: '性能更强，功能更全面',
        cons: '略超预算，需要蹲优惠',
        reason: '预算稍微松动时值得考虑'
      }
    ],
    finalAdvice: {
      decision: `优先买 ${category}推荐 A`,
      reason: `在 ${budget} 元预算内，推荐 A 性价比最高，能满足大多数使用场景。`
    }
  };
}

function generateMockTrend(currentPrice: number, days: number) {
  const trend = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const fluctuation = (Math.random() - 0.5) * 200;
    trend.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      price: Math.round(currentPrice + fluctuation + i * 15)
    });
  }
  return trend;
}
