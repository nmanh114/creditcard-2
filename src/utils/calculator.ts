import { Card, CategoryKey, CalculationResult, RecommendationResult } from '../types';

export const DEFAULT_RATE = 1; // Tỷ lệ mặc định 1x khi không có rate riêng hoặc khi vượt cap

/**
 * 1. TÍNH TOÁN REWARD CHO TỪNG THẺ
 * - Nếu category không có rate riêng (hoặc = 0) -> dùng Default Rate = 1x
 * - Nếu Amount vượt qua "cap" của category đó:
 *   + Phần trong hạn mức tính theo rate ưu đãi của thẻ
 *   + Phần vượt hạn mức tính theo Default Rate (1x)
 */
export function calculateCardReward(
  card: Card,
  category: CategoryKey,
  amount: number
): CalculationResult {
  const categoryConfig = card.rates[category];
  const userRate = categoryConfig?.rate;
  
  // Bước 1: Xác định rate áp dụng (nếu trống hoặc <= 0 thì lấy 1x)
  const nominalRate = (typeof userRate === 'number' && userRate > 0) ? userRate : DEFAULT_RATE;
  const cap = categoryConfig?.cap;

  let totalReward = 0;
  let cappedPortion = amount;
  let cappedReward = 0;
  let excessPortion = 0;
  let excessReward = 0;
  let isCapped = false;

  // Bước 2: Kiểm tra hạn mức chi tiêu (Cap)
  if (cap !== null && cap !== undefined && cap > 0 && amount > cap) {
    isCapped = true;
    cappedPortion = cap;
    excessPortion = amount - cap;

    // Phần trong cap hưởng rate ưu đãi
    cappedReward = cappedPortion * nominalRate;
    // Phần vượt cap chỉ hưởng rate mặc định 1x
    excessReward = excessPortion * DEFAULT_RATE;
    totalReward = cappedReward + excessReward;
  } else {
    // Không có cap hoặc chi tiêu chưa vượt cap: toàn bộ hưởng rate ưu đãi
    cappedReward = amount * nominalRate;
    totalReward = cappedReward;
  }

  // Tỷ lệ thực tế trung bình (effective rate) trên mỗi dollar tiêu
  const effectiveRate = amount > 0 ? Number((totalReward / amount).toFixed(2)) : nominalRate;

  return {
    card,
    category,
    amount,
    nominalRate,
    effectiveRate,
    totalReward: Number(totalReward.toFixed(2)),
    cappedPortion,
    cappedReward: Number(cappedReward.toFixed(2)),
    excessPortion,
    excessReward: Number(excessReward.toFixed(2)),
    isCapped,
  };
}

/**
 * 2. RECOMMENDATION ENGINE (TÌM THẺ TỐT NHẤT & XỬ LÝ TIE-BREAK)
 * - Lọc và tính điểm toàn bộ thẻ trong ví
 * - Sắp xếp giảm dần theo totalReward
 * - Xử lý Tie (đồng hạng): Nếu nhiều thẻ có cùng reward cao nhất:
 *   + Ưu tiên thẻ có phí thường niên (annual_fee) THẤP HƠN làm đề xuất chính
 *   + Vẫn trả về danh sách tất cả các thẻ đồng hạng
 * - Tạo câu giải thích theo đúng template yêu cầu
 */
export function getBestCardRecommendation(
  cards: Card[],
  category: CategoryKey,
  amount: number
): RecommendationResult {
  if (!cards || cards.length === 0) {
    throw new Error('Vui lòng thêm thẻ trước khi tra cứu');
  }

  if (amount <= 0 || isNaN(amount)) {
    throw new Error('Số tiền chi tiêu phải lớn hơn 0');
  }

  // Tính điểm thưởng cho tất cả các thẻ đang kích hoạt
  const activeCards = cards.filter((c) => c.is_active !== false);
  const targetCards = activeCards.length > 0 ? activeCards : cards;

  const results: CalculationResult[] = targetCards.map((card) =>
    calculateCardReward(card, category, amount)
  );

  // Sắp xếp: Thưởng cao nhất lên đầu. Nếu bằng thưởng, ưu tiên annual_fee thấp hơn
  results.sort((a, b) => {
    if (b.totalReward !== a.totalReward) {
      return b.totalReward - a.totalReward;
    }
    // Tie-break: Thẻ có annual_fee thấp hơn được xếp trước
    return (a.card.annual_fee || 0) - (b.card.annual_fee || 0);
  });

  const bestResult = results[0];
  const maxReward = bestResult.totalReward;

  // Tìm tất cả các thẻ đồng hạng (cùng đạt mức reward tối đa)
  const tiedCards = results.filter((r) => Math.abs(r.totalReward - maxReward) < 0.001);
  const isTie = tiedCards.length > 1;

  // Bước 3: Tạo câu giải thích (Why Section) theo đúng template yêu cầu
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
  const otherResults = results.filter((r) => r.card.card_id !== bestResult.card.card_id);

  let whyExplanation = '';

  if (isTie) {
    const tiedOtherNames = tiedCards
      .filter((r) => r.card.card_id !== bestResult.card.card_id)
      .map((r) => `${r.card.name} (${r.nominalRate}x, phí $${r.card.annual_fee})`)
      .join(', ');

    whyExplanation = `${bestResult.card.name} được chọn làm đề xuất chính vì có phí thường niên thấp hơn ($${bestResult.card.annual_fee}/năm), dù đạt cùng tỷ lệ ${bestResult.nominalRate}x cho ${categoryLabel} với ${tiedOtherNames}. Tất cả các thẻ có tỷ lệ tích điểm như nhau.`;
  } else if (otherResults.length > 0) {
    // Template: "[Card A] được chọn vì đạt [rate] cho [category], cao hơn [danh sách thẻ khác + rate của chúng]"
    const otherCardsInfo = otherResults
      .map((r) => `${r.card.name} (${r.nominalRate}x)`)
      .join(', ');

    whyExplanation = `${bestResult.card.name} được chọn vì đạt ${bestResult.nominalRate}x cho ${categoryLabel}, cao hơn ${otherCardsInfo}.`;
  } else {
    whyExplanation = `${bestResult.card.name} được chọn vì đạt ${bestResult.nominalRate}x cho danh mục ${categoryLabel}.`;
  }

  // Bổ sung ghi chú nếu chi tiêu vượt cap
  if (bestResult.isCapped) {
    whyExplanation += ` (Lưu ý: Hạn mức cap $${bestResult.card.rates[category].cap} đã được áp dụng, phần vượt $${bestResult.excessPortion} tính theo 1x).`;
  }

  return {
    bestCardResult: bestResult,
    tiedCards,
    allResults: results,
    isTie,
    whyExplanation,
  };
}

/**
 * MẪU THẺ THỬ NGHIỆM TIÊU BIỂU (để người dùng có thể nạp nhanh khi cần test logic)
 */
export const SAMPLE_CARDS: Card[] = [
  {
    card_id: 'card_amex_gold',
    name: 'Amex Gold Card',
    issuer: 'American Express',
    annual_fee: 250,
    is_active: true,
    rates: {
      dining: { rate: 4, cap: null },
      grocery: { rate: 4, cap: 25000 },
      travel: { rate: 3, cap: null },
      gas: { rate: 1, cap: null },
      shopping: { rate: 1, cap: null },
      other: { rate: 1, cap: null },
    },
  },
  {
    card_id: 'card_chase_sapphire',
    name: 'Chase Sapphire Preferred',
    issuer: 'Chase',
    annual_fee: 95,
    is_active: true,
    rates: {
      dining: { rate: 3, cap: null },
      grocery: { rate: 3, cap: null },
      travel: { rate: 5, cap: null },
      gas: { rate: 1, cap: null },
      shopping: { rate: 1, cap: null },
      other: { rate: 1, cap: null },
    },
  },
  {
    card_id: 'card_citi_custom',
    name: 'Citi Custom Cash',
    issuer: 'Citi',
    annual_fee: 0,
    is_active: true,
    rates: {
      dining: { rate: 5, cap: 500 }, // Cap $500 mỗi kỳ thanh toán
      grocery: { rate: 5, cap: 500 },
      travel: { rate: 1, cap: null },
      gas: { rate: 5, cap: 500 },
      shopping: { rate: 1, cap: null },
      other: { rate: 1, cap: null },
    },
  },
  {
    card_id: 'card_capital_one_savor',
    name: 'Capital One SavorOne',
    issuer: 'Capital One',
    annual_fee: 0,
    is_active: true,
    rates: {
      dining: { rate: 3, cap: null },
      grocery: { rate: 3, cap: null },
      travel: { rate: 1, cap: null },
      gas: { rate: 1, cap: null },
      shopping: { rate: 1, cap: null },
      other: { rate: 1, cap: null },
    },
  },
];
