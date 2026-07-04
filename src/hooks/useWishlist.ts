import { useState, useCallback, useEffect } from 'react';
import {
  getAllWishlist,
  saveWishlistItem,
  deleteWishlistItem
} from '../utils/storage';
import type { WishlistItem } from '../types';

const generateId = () => Math.random().toString(36).substring(2, 10);

function simulateNewPrice(base: number, current: number): number {
  const drift = (Math.random() - 0.55) * 0.06 * base;
  const next = Math.round(current + drift);
  const floor = Math.round(base * 0.7);
  const ceil = Math.round(base * 1.05);
  return Math.min(ceil, Math.max(floor, next));
}

export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await getAllWishlist();
    setItems(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (
      productName: string,
      targetPrice: number,
      basePrice: number,
      note?: string,
      historyId?: string
    ) => {
      const item: WishlistItem = {
        id: generateId(),
        productName: productName.trim(),
        targetPrice,
        basePrice,
        currentPrice: basePrice,
        addedAt: Date.now(),
        lastChecked: Date.now(),
        reached: basePrice <= targetPrice,
        note: note?.trim() || undefined,
        historyId: historyId || undefined
      };
      await saveWishlistItem(item);
      await refresh();
      return item;
    },
    [refresh]
  );

  const removeItem = useCallback(
    async (id: string) => {
      await deleteWishlistItem(id);
      await refresh();
    },
    [refresh]
  );

  const checkPrices = useCallback(async (): Promise<WishlistItem[]> => {
    const all = await getAllWishlist();
    const newlyReached: WishlistItem[] = [];

    for (const item of all) {
      const newPrice = simulateNewPrice(item.basePrice, item.currentPrice);
      const reached = newPrice <= item.targetPrice;
      const updated: WishlistItem = {
        ...item,
        currentPrice: newPrice,
        lastChecked: Date.now(),
        reached
      };
      if (reached && !item.reached) {
        newlyReached.push(updated);
      }
      await saveWishlistItem(updated);
    }

    await refresh();
    return newlyReached;
  }, [refresh]);

  return {
    items,
    loading,
    addItem,
    removeItem,
    checkPrices,
    refresh
  };
}
