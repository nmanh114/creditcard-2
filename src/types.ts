/**
 * DATA SCHEMA ĐƯỢC QUY ĐỊNH:
 * {
 *   "card_id": "string (tự generate, VD: timestamp hoặc uuid)",
 *   "name": "string (user nhập)",
 *   "issuer": "string (user nhập)",
 *   "annual_fee": "number (user nhập)",
 *   "is_active": true,
 *   "rates": {
 *     "dining":   { "rate": "number (user nhập)", "cap": "number | null (user nhập, optional)" },
 *     "grocery":  { "rate": "number", "cap": "number | null" },
 *     "travel":   { "rate": "number", "cap": "number | null" },
 *     "gas":      { "rate": "number", "cap": "number | null" },
 *     "shopping": { "rate": "number", "cap": "number | null" },
 *     "other":    { "rate": "number", "cap": "number | null" }
 *   }
 * }
 */

export type CategoryKey = 'dining' | 'grocery' | 'travel' | 'gas' | 'shopping' | 'other';

export interface CategoryRate {
  rate: number;
  cap: number | null;
}

export interface Card {
  card_id: string;
  name: string;
  issuer: string;
  annual_fee: number;
  is_active: boolean;
  rates: {
    dining: CategoryRate;
    grocery: CategoryRate;
    travel: CategoryRate;
    gas: CategoryRate;
    shopping: CategoryRate;
    other: CategoryRate;
  };
}

export interface CalculationResult {
  card: Card;
  category: CategoryKey;
  amount: number;
  nominalRate: number;
  effectiveRate: number;
  totalReward: number;
  cappedPortion: number;
  cappedReward: number;
  excessPortion: number;
  excessReward: number;
  isCapped: boolean;
}

export interface RecommendationResult {
  bestCardResult: CalculationResult;
  tiedCards: CalculationResult[];
  allResults: CalculationResult[];
  isTie: boolean;
  whyExplanation: string;
}

export const CATEGORY_DEFINITIONS: {
  key: CategoryKey;
  label: string;
  icon: string;
  description: string;
}[] = [
  { key: 'dining', label: 'Dining', icon: '🍽', description: 'Nhà hàng, quán ăn, cafe, giao đồ ăn' },
  { key: 'grocery', label: 'Grocery', icon: '🛒', description: 'Siêu thị, chợ thực phẩm' },
  { key: 'travel', label: 'Travel', icon: '✈', description: 'Vé máy bay, khách sạn, du lịch' },
  { key: 'gas', label: 'Gas', icon: '⛽', description: 'Cây xăng, trạm sạc xe điện' },
  { key: 'shopping', label: 'Shopping', icon: '🛍', description: 'Mua sắm thời trang, thiết bị, online' },
  { key: 'other', label: 'Other', icon: '📦', description: 'Các chi tiêu thông thường khác' },
];
