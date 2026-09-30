import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Wallet,
  Award,
  TrendingUp,
  AlertCircle,
  Trash2,
  Plus,
  ArrowRight,
  Scale,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  ChevronRight,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  FileCode,
  X
} from 'lucide-react';
import {
  Card,
  CategoryKey,
  CATEGORY_DEFINITIONS
} from './types';
import {
  calculateCardReward,
  getBestCardRecommendation,
  SAMPLE_CARDS,
  DEFAULT_RATE
} from './utils/calculator';

type Screen = 'landing' | 'auth' | 'add-card' | 'wallet' | 'find-best' | 'recommendation' | 'compare';

const STORAGE_KEY = 'credit_card_wallet_v1';

export default function App() {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [wallet, setWallet] = useState<Card[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Auth mock state (UI only)
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  // Form Add Card state
  const [formName, setFormName] = useState('');
  const [formIssuer, setFormIssuer] = useState('');
  const [formAnnualFee, setFormAnnualFee] = useState<number>(0);
  const [formRates, setFormRates] = useState<Record<CategoryKey, { rate: string; cap: string }>>({
    dining: { rate: '', cap: '' },
    grocery: { rate: '', cap: '' },
    travel: { rate: '', cap: '' },
    gas: { rate: '', cap: '' },
    shopping: { rate: '', cap: '' },
    other: { rate: '', cap: '' },
  });
  const [formError, setFormError] = useState('');

  // Find Best Card & Recommendation state
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('dining');
  const [spendingAmount, setSpendingAmount] = useState<number>(100);
  const [amountInputError, setAmountInputError] = useState('');

  // Compare state (tối đa 3 thẻ)
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);

  // Modal code viewer
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ==========================================
  // LOCAL STORAGE PERSISTENCE
  // ==========================================
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWallet(parsed);
        }
      }
    } catch {
      // Default to empty array if parse fails
      setWallet([]);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
    }
  }, [wallet, isLoaded]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Nạp nhanh bộ thẻ mẫu
  const handleLoadSampleCards = () => {
    setWallet(SAMPLE_CARDS);
    showToast('Đã nạp 4 thẻ mẫu tiêu chuẩn vào ví của bạn!');
    if (currentScreen === 'landing') {
      setCurrentScreen('wallet');
    }
  };

  // ==========================================
  // VALIDATION & ADD CARD LOGIC
  // ==========================================
  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Rule: Tên thẻ không được để trống khi thêm thẻ mới
    if (!formName.trim()) {
      setFormError('Tên thẻ không được để trống!');
      return;
    }

    // Build data đúng schema yêu cầu
    const parsedRates: Card['rates'] = {
      dining: { rate: 0, cap: null },
      grocery: { rate: 0, cap: null },
      travel: { rate: 0, cap: null },
      gas: { rate: 0, cap: null },
      shopping: { rate: 0, cap: null },
      other: { rate: 0, cap: null },
    };

    CATEGORY_DEFINITIONS.forEach(({ key }) => {
      const rawRate = parseFloat(formRates[key].rate);
      const rawCap = parseFloat(formRates[key].cap);

      parsedRates[key] = {
        rate: isNaN(rawRate) || rawRate < 0 ? 0 : rawRate,
        cap: isNaN(rawCap) || rawCap <= 0 ? null : rawCap,
      };
    });

    const newCard: Card = {
      card_id: `card_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: formName.trim(),
      issuer: formIssuer.trim() || 'Ngân hàng phát hành',
      annual_fee: isNaN(formAnnualFee) || formAnnualFee < 0 ? 0 : formAnnualFee,
      is_active: true,
      rates: parsedRates,
    };

    setWallet((prev) => [...prev, newCard]);
    showToast(`Đã thêm thẻ "${newCard.name}" vào ví!`);

    // Reset form
    setFormName('');
    setFormIssuer('');
    setFormAnnualFee(0);
    setFormRates({
      dining: { rate: '', cap: '' },
      grocery: { rate: '', cap: '' },
      travel: { rate: '', cap: '' },
      gas: { rate: '', cap: '' },
      shopping: { rate: '', cap: '' },
      other: { rate: '', cap: '' },
    });

    // Chuyển tới My Wallet
    setCurrentScreen('wallet');
  };

  const handleDeleteCard = (cardId: string, cardName: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa thẻ "${cardName}" khỏi ví?`)) {
      setWallet((prev) => prev.filter((c) => c.card_id !== cardId));
      setSelectedCompareIds((prev) => prev.filter((id) => id !== cardId));
      showToast(`Đã xóa thẻ "${cardName}" khỏi ví`);
    }
  };

  // ==========================================
  // NAVIGATION & FLOW GUARDS
  // ==========================================
  const handleGoToFindBest = () => {
    // Rule: Nếu ví trống -> báo lỗi "Vui lòng thêm thẻ trước khi tra cứu"
    if (wallet.length === 0) {
      alert('Vui lòng thêm thẻ trước khi tra cứu!');
      setCurrentScreen('add-card');
      return;
    }
    setCurrentScreen('find-best');
  };

  const handleExecuteFindBest = () => {
    if (spendingAmount <= 0 || isNaN(spendingAmount)) {
      setAmountInputError('Amount phải > 0, vui lòng nhập số dương!');
      return;
    }
    setAmountInputError('');
    setCurrentScreen('recommendation');
  };

  // ==========================================
  // REAL-TIME RECOMMENDATION COMPUTATION
  // ==========================================
  const recommendation = useMemo(() => {
    if (wallet.length === 0 || spendingAmount <= 0 || isNaN(spendingAmount)) {
      return null;
    }
    try {
      return getBestCardRecommendation(wallet, selectedCategory, spendingAmount);
    } catch {
      return null;
    }
  }, [wallet, selectedCategory, spendingAmount]);

  // Xử lý chuyển từ màn Login/Register sang Add Card (UI giả lập, không validate)
  const handleAuthSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCurrentScreen('add-card');
  };

  // Chuẩn bị danh sách so sánh và chuyển THẲNG sang màn Compare ngay lập tức
  const handleOpenCompareWithBest = () => {
    if (wallet.length === 0) {
      alert('Vui lòng thêm thẻ trước khi so sánh!');
      setCurrentScreen('add-card');
      return;
    }
    let initialSelected: string[] = [];
    if (recommendation) {
      const bestId = recommendation.bestCardResult.card.card_id;
      const otherIds = wallet.filter((c) => c.card_id !== bestId).map((c) => c.card_id);
      initialSelected = [bestId, ...otherIds].slice(0, 3);
    } else {
      initialSelected = wallet.slice(0, 3).map((c) => c.card_id);
    }
    setSelectedCompareIds(initialSelected);
    // Dẫn THẲNG sang màn Compare ngay lập tức, không qua bước trung gian
    setCurrentScreen('compare');
  };

  const handleToggleCompareCard = (cardId: string) => {
    if (selectedCompareIds.includes(cardId)) {
      setSelectedCompareIds((prev) => prev.filter((id) => id !== cardId));
    } else {
      // Rule: Không cho chọn quá 3 thẻ khi so sánh
      if (selectedCompareIds.length < 3) {
        setSelectedCompareIds((prev) => [...prev, cardId]);
      }
    }
  };

  // Code HTML/JS thuần để người dùng copy
  const standaloneHtmlSnippet = `<!-- File HTML thuần hoàn chỉnh, lưu thành file .html và mở bằng bất kỳ trình duyệt nào -->
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Credit Card Optimization</title>
  <!-- Toàn bộ CSS & JS thuần được nhúng đầy đủ trong file /standalone_single_file.html -->
</head>
<body>
  <h1>Đã chuẩn bị sẵn file standalone_single_file.html trong thư mục gốc của project!</h1>
</body>
</html>`;

  const copyStandaloneFileContent = () => {
    fetch('/standalone_single_file.html')
      .then((res) => res.text())
      .then((txt) => {
        navigator.clipboard.writeText(txt);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 3000);
      })
      .catch(() => {
        navigator.clipboard.writeText(standaloneHtmlSnippet);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 3000);
      });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER & NAVIGATION */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div
            onClick={() => setCurrentScreen('landing')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight block leading-tight">
                CardOptimizer
              </span>
              <span className="text-[11px] text-blue-600 font-medium">Which Card Should I Use?</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setCurrentScreen('wallet')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                currentScreen === 'wallet'
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Ví của tôi</span>
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-slate-200 text-slate-700 font-bold">
                {wallet.length}
              </span>
            </button>

            <button
              onClick={handleGoToFindBest}
              className="px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/30 transition flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Tìm thẻ tối ưu</span>
            </button>

            <button
              onClick={() => setShowCodeModal(true)}
              title="Xem & Tải mã nguồn HTML/JS thuần độc lập"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
              <span>HTML/JS thuần</span>
            </button>
          </div>
        </div>

        {/* FLOW STEPPER PROGRESS */}
        <div className="bg-slate-100/80 border-t border-slate-200/80 py-1.5 px-4 overflow-x-auto text-xs text-slate-500">
          <div className="max-w-5xl mx-auto flex items-center justify-between sm:justify-start gap-1 sm:gap-4 font-medium min-w-[500px]">
            <span
              onClick={() => setCurrentScreen('landing')}
              className={`cursor-pointer transition flex items-center gap-1 ${
                currentScreen === 'landing' ? 'text-blue-600 font-bold' : 'hover:text-slate-700'
              }`}
            >
              1. Landing
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span
              onClick={() => setCurrentScreen('auth')}
              className={`cursor-pointer transition flex items-center gap-1 ${
                currentScreen === 'auth' ? 'text-blue-600 font-bold' : 'hover:text-slate-700'
              }`}
            >
              2. Sign Up / Login
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span
              onClick={() => setCurrentScreen('add-card')}
              className={`cursor-pointer transition flex items-center gap-1 ${
                currentScreen === 'add-card' ? 'text-blue-600 font-bold' : 'hover:text-slate-700'
              }`}
            >
              3. Add Card
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span
              onClick={() => setCurrentScreen('wallet')}
              className={`cursor-pointer transition flex items-center gap-1 ${
                currentScreen === 'wallet' ? 'text-blue-600 font-bold' : 'hover:text-slate-700'
              }`}
            >
              4. My Wallet
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span
              onClick={handleGoToFindBest}
              className={`cursor-pointer transition flex items-center gap-1 ${
                currentScreen === 'find-best' ? 'text-blue-600 font-bold' : 'hover:text-slate-700'
              }`}
            >
              5. Find Best Card
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span
              onClick={() => {
                if (wallet.length > 0) setCurrentScreen('recommendation');
              }}
              className={`cursor-pointer transition flex items-center gap-1 ${
                currentScreen === 'recommendation' ? 'text-blue-600 font-bold' : 'hover:text-slate-700'
              }`}
            >
              6. Recommendation
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span
              onClick={() => {
                if (wallet.length > 0) handleOpenCompareWithBest();
              }}
              className={`cursor-pointer transition flex items-center gap-1 ${
                currentScreen === 'compare' ? 'text-blue-600 font-bold' : 'hover:text-slate-700'
              }`}
            >
              7. Compare (Max 3)
            </span>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full">

        {/* ========================================================
            01 - LANDING PAGE
        ======================================================== */}
        {currentScreen === 'landing' && (
          <div className="space-y-12">
            <div className="text-center pt-8 pb-4 max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 mb-4">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Which Card Should I Use?
              </span>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Which card should you use?
              </h1>
              <p className="mt-4 text-lg text-slate-600 leading-relaxed">
                Optimize your credit card rewards with your personal wallet. Giúp bạn luôn nhận số điểm thưởng và tiền hoàn (cashback) cao nhất cho từng hóa đơn.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setCurrentScreen('auth')}
                  className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 group"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </button>

                <button
                  onClick={handleLoadSampleCards}
                  className="w-full sm:w-auto px-6 py-3.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4 text-slate-500" />
                  <span>Nạp thẻ mẫu thử nghiệm</span>
                </button>
              </div>

              {wallet.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setCurrentScreen('wallet')}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 underline"
                  >
                    Ví của bạn đang có {wallet.length} thẻ &rarr; Vào xem ví
                  </button>
                </div>
              )}
            </div>

            {/* 3 BƯỚC MINH HỌA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-4">
                  1
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">Add Cards</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Nhập tay thông tin các loại thẻ bạn đang sở hữu (tên thẻ, ngân hàng, phí thường niên và tỷ lệ điểm thưởng theo danh mục).
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-4">
                  2
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">Set Spending</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Chọn loại chi tiêu sắp thanh toán (Ăn uống, Đi chợ siêu thị, Du lịch, Xăng dầu, Mua sắm) và nhập số tiền dự kiến.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg mb-4">
                  3
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">Get Recommendation</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Thuật toán tính toán ngay lập tức thẻ tối ưu nhất, xử lý vượt hạn mức (cap), giải thích lý do và so sánh ma trận tối đa 3 thẻ.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            01.5 - SIGN UP / LOGIN (UI ONLY)
        ======================================================== */}
        {currentScreen === 'auth' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-md mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mx-auto mb-3 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Sign Up / Login</h2>
              <p className="text-slate-500 text-sm">
                Đăng nhập hoặc đăng ký tài khoản để quản lý ví thẻ của bạn (UI giả lập, không cần xác thực thật)
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-semibold text-slate-700">
                    Password
                  </label>
                  <span className="text-xs text-slate-400">Tùy ý nhập</span>
                </div>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 text-sm"
                />
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-600/25 transition text-sm flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentScreen('add-card')}
                  className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Bỏ qua &amp; Tiếp tục vào Add Card &rarr;
                </button>
              </div>
            </form>

            <div className="pt-4 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => setCurrentScreen('landing')}
                className="text-xs text-slate-500 hover:text-slate-800 transition"
              >
                &larr; Quay lại Landing Page
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            02 - ADD CARD (FORM NHẬP TAY)
        ======================================================== */}
        {currentScreen === 'add-card' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-2xl mx-auto">
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Add Card (Form nhập tay)</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Nhập thông tin thẻ tín dụng của bạn để đưa vào ví tính toán
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadSampleCards}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Nạp thẻ mẫu test</span>
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddCard} className="mt-6 space-y-6">
              {/* Tên thẻ, Ngân hàng, Phí */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Tên thẻ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="VD: Amex Gold, Chase Sapphire, Vietcombank Visa Signature..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Ngân hàng phát hành (Optional)
                    </label>
                    <input
                      type="text"
                      value={formIssuer}
                      onChange={(e) => setFormIssuer(e.target.value)}
                      placeholder="VD: American Express, Chase, TPBank..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Phí thường niên ($ hoặc đ/năm)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={formAnnualFee}
                        onChange={(e) => setFormAnnualFee(parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Input Rate & Cap cho từng Category */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-bold text-slate-900">
                    Tỷ lệ tích điểm theo danh mục chi tiêu:
                  </label>
                  <span className="text-xs text-slate-500">
                    Trống hoặc = 0 sẽ tính tỷ lệ mặc định 1x
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {CATEGORY_DEFINITIONS.map((cat) => (
                    <div
                      key={cat.key}
                      className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2 hover:border-slate-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-slate-500 block mb-1">Hệ số Rate (x):</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0 (mặc định 1x)"
                            value={formRates[cat.key].rate}
                            onChange={(e) =>
                              setFormRates((prev) => ({
                                ...prev,
                                [cat.key]: { ...prev[cat.key], rate: e.target.value },
                              }))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-blue-600 text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-slate-500 block mb-1">Hạn mức Cap ($):</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Không giới hạn"
                            value={formRates[cat.key].cap}
                            onChange={(e) =>
                              setFormRates((prev) => ({
                                ...prev,
                                [cat.key]: { ...prev[cat.key], cap: e.target.value },
                              }))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-blue-600 text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentScreen('wallet')}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition text-sm"
                >
                  Hủy / Về Ví
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/25 transition text-sm flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Wallet</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================
            03 - MY WALLET
        ======================================================== */}
        {currentScreen === 'wallet' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  My Wallet (Số lượng thẻ: {wallet.length})
                </h2>
                <p className="text-slate-500 text-sm mt-0.5">
                  Quản lý danh sách thẻ tín dụng đã lưu trong trình duyệt của bạn
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleLoadSampleCards}
                  className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
                >
                  Nạp thẻ mẫu
                </button>
                <button
                  onClick={() => setCurrentScreen('add-card')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Card</span>
                </button>
              </div>
            </div>

            {wallet.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-md mx-auto">
                <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">Ví của bạn đang trống!</h3>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                  Vui lòng nhập tay thông tin thẻ hoặc nạp các thẻ mẫu để thử nghiệm tính toán đề xuất thẻ.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => setCurrentScreen('add-card')}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition"
                  >
                    Thêm thẻ ngay
                  </button>
                  <button
                    onClick={handleLoadSampleCards}
                    className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition"
                  >
                    Nạp thẻ mẫu test
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {wallet.map((card) => {
                    // Lấy top 2 category có rate cao nhất
                    const sortedRates = Object.entries(card.rates)
                      .map(([key, config]) => ({
                        key: key as CategoryKey,
                        rate: config.rate || DEFAULT_RATE,
                        cap: config.cap,
                      }))
                      .sort((a, b) => b.rate - a.rate)
                      .slice(0, 2);

                    return (
                      <div
                        key={card.card_id}
                        className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <h3 className="font-bold text-slate-900 text-base leading-snug">
                                {card.name}
                              </h3>
                              <p className="text-xs text-slate-500 font-medium">
                                {card.issuer || 'Ngân hàng phát hành'}
                              </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 shrink-0">
                              Phí: ${card.annual_fee}/năm
                            </span>
                          </div>

                          {/* Top 2 category rates */}
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 my-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                              Top 2 tỷ lệ ưu đãi cao nhất:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {sortedRates.map((item) => {
                                const catDef = CATEGORY_DEFINITIONS.find((c) => c.key === item.key);
                                return (
                                  <span
                                    key={item.key}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800"
                                  >
                                    <span>{catDef?.icon}</span>
                                    <span>{catDef?.label}:</span>
                                    <strong className="text-blue-600 font-bold">
                                      {item.rate}x
                                    </strong>
                                    {item.cap && (
                                      <span className="text-[10px] text-slate-500">
                                        (cap ${item.cap})
                                      </span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100">
                          <button
                            onClick={() => {
                              setSelectedCompareIds([card.card_id]);
                              setCurrentScreen('compare');
                            }}
                            className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition flex items-center gap-1"
                          >
                            <Scale className="w-3.5 h-3.5" />
                            <span>So sánh</span>
                          </button>

                          <button
                            onClick={() => handleDeleteCard(card.card_id, card.name)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa thẻ</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Main Action to Find Best Card */}
                <div className="text-center pt-6">
                  <button
                    onClick={handleGoToFindBest}
                    className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition text-base inline-flex items-center gap-2 group"
                  >
                    <span>Find Best Card</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================
            05 - FIND BEST CARD
        ======================================================== */}
        {currentScreen === 'find-best' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Find Best Card</h2>
              <p className="text-slate-500 text-sm mt-1">
                Chọn loại chi tiêu và nhập số tiền để tìm thẻ mang lại nhiều điểm / tiền thưởng nhất.
              </p>
            </div>

            {/* Category Pills */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800">
                1. Chọn danh mục chi tiêu:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {CATEGORY_DEFINITIONS.map((cat) => {
                  const isSelected = selectedCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 text-blue-900 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span className="text-xl shrink-0">{cat.icon}</span>
                      <div className="min-w-0">
                        <span className="block font-bold text-sm truncate">{cat.label}</span>
                        <span className="block text-[11px] text-slate-500 truncate">
                          {cat.key}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Amount */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-800">
                2. Nhập số tiền chi tiêu ($):
              </label>
              <div className="relative max-w-sm">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                  $
                </span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={spendingAmount}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setSpendingAmount(val);
                    if (val > 0) setAmountInputError('');
                  }}
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              {amountInputError && (
                <p className="text-rose-600 text-xs font-semibold flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{amountInputError}</span>
                </p>
              )}
            </div>

            {/* Submit & Back buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentScreen('wallet')}
                className="px-4 py-2.5 text-slate-600 hover:text-slate-900 font-semibold text-sm transition"
              >
                &larr; Về Ví thẻ
              </button>

              <button
                type="button"
                onClick={handleExecuteFindBest}
                className="px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 transition text-sm flex items-center gap-2"
              >
                <span>Find Best Card</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            06 - RECOMMENDATION RESULT
        ======================================================== */}
        {currentScreen === 'recommendation' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            {recommendation ? (
              <>
                {/* HERO BANNER - BEST CARD */}
                <div className="rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 text-white p-7 sm:p-9 shadow-xl relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10 pointer-events-none">
                    <Award className="w-72 h-72" />
                  </div>

                  <div className="relative z-10">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-400 text-amber-950 shadow-sm mb-4">
                      <Award className="w-4 h-4 text-amber-800" />
                      <span>BEST CARD: {recommendation.bestCardResult.card.name}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                      <div>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                          {recommendation.bestCardResult.card.name}
                        </h2>
                        <p className="text-blue-100 text-sm font-medium mt-1">
                          Phát hành bởi: {recommendation.bestCardResult.card.issuer || 'Ngân hàng'} • Phí thường niên: ${recommendation.bestCardResult.card.annual_fee}/năm
                        </p>

                        <div className="mt-4 inline-block bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 text-sm font-semibold">
                          ⭐ {recommendation.bestCardResult.nominalRate}x {selectedCategory.toUpperCase()} Points
                        </div>
                      </div>

                      <div className="text-left sm:text-right bg-white/10 sm:bg-transparent p-4 sm:p-0 rounded-2xl border border-white/10 sm:border-0">
                        <div className="text-xs uppercase tracking-wider text-blue-200 font-semibold">
                          Ước tính tích lũy:
                        </div>
                        <div className="text-4xl sm:text-5xl font-black text-amber-300 drop-shadow-sm mt-0.5">
                          {recommendation.bestCardResult.totalReward}{' '}
                          <span className="text-lg font-bold text-white">Points</span>
                        </div>
                        <div className="text-xs text-blue-200 mt-1">
                          (cho số tiền chi tiêu ${spendingAmount})
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* REAL-TIME AMOUNT TWEAKER */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 shrink-0">
                      Đổi số tiền thử nghiệm:
                    </span>
                    <div className="relative w-36">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={spendingAmount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            setSpendingAmount(val);
                          }
                        }}
                        className="w-full pl-7 pr-2.5 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span>
                      Danh mục hiện tại: <strong className="text-blue-600">{selectedCategory.toUpperCase()}</strong>
                    </span>
                    <button
                      onClick={() => setCurrentScreen('find-best')}
                      className="text-blue-600 hover:underline font-semibold ml-1"
                    >
                      (Đổi danh mục)
                    </button>
                  </div>
                </div>

                {/* TIE ALERT (Nếu có nhiều thẻ đồng rate cao nhất) */}
                {recommendation.isTie && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <strong className="block font-bold mb-0.5">
                        Tất cả các thẻ có tỷ lệ tích điểm như nhau ({recommendation.bestCardResult.nominalRate}x)
                      </strong>
                      <span>
                        Thẻ <strong>{recommendation.bestCardResult.card.name}</strong> được chọn làm đề xuất chính vì có mức phí thường niên thấp hơn (${recommendation.bestCardResult.card.annual_fee}/năm). Bạn có thể dùng bất kỳ thẻ nào trong nhóm đồng hạng dưới đây!
                      </span>
                    </div>
                  </div>
                )}

                {/* WHY SECTION */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                    <Info className="w-5 h-5 text-blue-600" />
                    <span>Why this card? (Lý do chọn)</span>
                  </div>

                  <ul className="space-y-2 text-sm text-slate-700 pl-4 list-disc marker:text-blue-600 leading-relaxed">
                    <li>
                      <span className="font-semibold">{recommendation.whyExplanation}</span>
                    </li>
                    <li>
                      Số điểm tích lũy được tính theo công thức:{' '}
                      <code className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono text-slate-800">
                        {recommendation.bestCardResult.isCapped
                          ? `($${recommendation.bestCardResult.cappedPortion} × ${recommendation.bestCardResult.nominalRate}x) + ($${recommendation.bestCardResult.excessPortion} × 1x) = ${recommendation.bestCardResult.totalReward} Points`
                          : `$${spendingAmount} × ${recommendation.bestCardResult.nominalRate}x = ${recommendation.bestCardResult.totalReward} Points`}
                      </code>
                    </li>
                    {recommendation.bestCardResult.isCapped && (
                      <li className="text-amber-800">
                        Hạn mức (cap) của thẻ này cho nhóm {selectedCategory} là ${recommendation.bestCardResult.cappedPortion}. Phần vượt ${recommendation.bestCardResult.excessPortion} được tính theo tỷ lệ mặc định 1x.
                      </li>
                    )}
                  </ul>
                </div>

                {/* BẢNG XẾP HẠNG TẤT CẢ CÁC THẺ TRONG VÍ CHO KHOẢN CHI TIÊU NÀY */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 text-base">
                      Bảng xếp hạng hiệu quả tất cả thẻ trong ví:
                    </h3>
                    <span className="text-xs text-slate-500">
                      Cho khoản chi ${spendingAmount} • {selectedCategory.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {recommendation.allResults.map((item, idx) => {
                      const isTop = idx === 0;
                      return (
                        <div
                          key={item.card.card_id}
                          className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition ${
                            isTop
                              ? 'bg-blue-50/70 border-blue-200 font-semibold'
                              : 'bg-slate-50/60 border-slate-200/80 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                isTop
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900">
                                  {item.card.name}
                                </span>
                                {isTop && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-300 text-amber-950">
                                    Best
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500">
                                Phí: ${item.card.annual_fee}/năm • Rate: {item.nominalRate}x
                                {item.isCapped && ` (Cap $${item.card.rates[selectedCategory]?.cap})`}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-bold text-blue-700">
                              {item.totalReward} Points
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => setCurrentScreen('find-best')}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition text-sm"
                  >
                    &larr; Đổi mức chi tiêu
                  </button>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setCurrentScreen('wallet')}
                      className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition text-sm"
                    >
                      Về Ví của tôi
                    </button>
                    <button
                      onClick={handleOpenCompareWithBest}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/25 transition text-sm flex items-center gap-1.5"
                    >
                      <Scale className="w-4 h-4" />
                      <span>Compare Cards</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-600 mb-4">Chưa có đủ dữ liệu để tính toán đề xuất.</p>
                <button
                  onClick={() => setCurrentScreen('find-best')}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold"
                >
                  Nhập thông tin chi tiêu
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            07 - COMPARE (MA TRẬN SO SÁNH TỐI ĐA 3 THẺ)
        ======================================================== */}
        {currentScreen === 'compare' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Compare Cards (So sánh tối đa 3 thẻ)
                </h2>
                <p className="text-slate-500 text-sm mt-0.5">
                  Đánh dấu chọn tối đa 3 thẻ để so sánh chi tiết ma trận điểm thưởng
                </p>
              </div>

              <button
                onClick={() => setCurrentScreen('recommendation')}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition self-start sm:self-auto"
              >
                &larr; Quay lại kết quả
              </button>
            </div>

            {/* Checkbox selector */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Chọn tối đa 3 thẻ để so sánh (Đang chọn: {selectedCompareIds.length}/3):
              </div>
              <div className="flex flex-wrap gap-3">
                {wallet.map((card) => {
                  const isChecked = selectedCompareIds.includes(card.card_id);
                  const isMax = selectedCompareIds.length >= 3;
                  const isDisabled = !isChecked && isMax;

                  return (
                    <label
                      key={card.card_id}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                        isChecked
                          ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
                          : isDisabled
                          ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isDisabled}
                        onChange={() => handleToggleCompareCard(card.card_id)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>{card.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Comparison Table */}
            {selectedCompareIds.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-slate-500 border border-slate-200">
                Vui lòng tích chọn ít nhất 1 thẻ ở trên để xem bảng so sánh.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200">
                        <th className="p-4 font-bold text-slate-900 w-1/4">Tiêu chí so sánh</th>
                        {wallet
                          .filter((c) => selectedCompareIds.includes(c.card_id))
                          .map((card) => (
                            <th key={card.card_id} className="p-4 font-bold text-slate-900">
                              <div>{card.name}</div>
                              <div className="text-xs font-normal text-slate-500">
                                {card.issuer || 'Ngân hàng'}
                              </div>
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Annual Fee Row */}
                      {(() => {
                        const compareCards = wallet.filter((c) => selectedCompareIds.includes(c.card_id));
                        const minFee = Math.min(...compareCards.map((c) => c.annual_fee || 0));

                        return (
                          <tr>
                            <td className="p-4 font-semibold text-slate-700 bg-slate-50/50">
                              Phí thường niên (Annual Fee)
                            </td>
                            {compareCards.map((card) => {
                              const isLowestFee = (card.annual_fee || 0) === minFee;
                              return (
                                <td
                                  key={card.card_id}
                                  className={`p-4 font-semibold ${
                                    isLowestFee ? 'bg-emerald-50 text-emerald-800' : 'text-slate-800'
                                  }`}
                                >
                                  ${card.annual_fee}/năm
                                  {isLowestFee && (
                                    <span className="ml-2 text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold uppercase">
                                      Thấp nhất
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })()}

                      {/* Estimated Rewards Row */}
                      {(() => {
                        const compareCards = wallet.filter((c) => selectedCompareIds.includes(c.card_id));
                        const rewards = compareCards.map((card) =>
                          calculateCardReward(card, selectedCategory, spendingAmount)
                        );
                        const maxReward = Math.max(...rewards.map((r) => r.totalReward));

                        return (
                          <tr className="bg-blue-50/30">
                            <td className="p-4 font-bold text-blue-900">
                              Ước tính điểm ({selectedCategory.toUpperCase()} ${spendingAmount})
                            </td>
                            {rewards.map((res) => {
                              const isBest = Math.abs(res.totalReward - maxReward) < 0.001;
                              return (
                                <td
                                  key={res.card.card_id}
                                  className={`p-4 font-extrabold ${
                                    isBest ? 'bg-emerald-50 text-emerald-800 text-base' : 'text-slate-800'
                                  }`}
                                >
                                  {res.totalReward} Points
                                  {isBest && (
                                    <span className="ml-2 text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold uppercase">
                                      Cao nhất
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })()}

                      {/* Category Rows with HIGHLIGHT BEST RATE */}
                      {CATEGORY_DEFINITIONS.map((cat) => {
                        const compareCards = wallet.filter((c) => selectedCompareIds.includes(c.card_id));
                        const rates = compareCards.map((card) => {
                          const r = card.rates[cat.key]?.rate;
                          return typeof r === 'number' && r > 0 ? r : DEFAULT_RATE;
                        });
                        const maxRate = Math.max(...rates);

                        return (
                          <tr key={cat.key} className="hover:bg-slate-50/60 transition">
                            <td className="p-4 font-medium text-slate-800 flex items-center gap-2">
                              <span>{cat.icon}</span>
                              <span>{cat.label}</span>
                            </td>
                            {compareCards.map((card) => {
                              const catConfig = card.rates[cat.key];
                              const r = catConfig?.rate && catConfig.rate > 0 ? catConfig.rate : DEFAULT_RATE;
                              const isHighest = r === maxRate;

                              return (
                                <td
                                  key={card.card_id}
                                  className={`p-4 ${
                                    isHighest
                                      ? 'bg-emerald-50/80 text-emerald-900 font-bold'
                                      : 'text-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span>{r}x Points</span>
                                    {isHighest && (
                                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-extrabold uppercase">
                                        Best
                                      </span>
                                    )}
                                  </div>
                                  {catConfig?.cap && (
                                    <span className="text-xs text-slate-500 block mt-0.5">
                                      (Hạn mức cap: ${catConfig.cap})
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-slate-500 space-y-2">
          <p>
            Credit Card Optimization & Recommendation Platform • Which Card Should I Use?
          </p>
          <div className="flex items-center justify-center gap-4 text-blue-600 font-medium">
            <button onClick={() => setShowCodeModal(true)} className="hover:underline">
              📄 Xem & Copy mã nguồn HTML/JS thuần (Single-File)
            </button>
            <span>•</span>
            <button onClick={handleLoadSampleCards} className="hover:underline">
              Nạp dữ liệu thẻ mẫu
            </button>
          </div>
        </div>
      </footer>

      {/* MODAL VIEW / EXPORT STANDALONE HTML */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-lg">
                  Mã nguồn HTML/CSS/JavaScript thuần độc lập
                </h3>
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600 text-sm">
              Theo đúng yêu cầu không dùng framework: Chúng tôi đã tạo sẵn file{' '}
              <code className="bg-slate-100 text-blue-700 px-2 py-0.5 rounded font-mono font-bold">
                standalone_single_file.html
              </code>{' '}
              chứa 100% mã nguồn HTML/CSS/JS thuần (zero dependency, chạy offline độc lập trong bất kỳ trình duyệt nào).
            </p>

            <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-xs font-mono overflow-y-auto flex-1 space-y-2">
              <p className="text-slate-400">// File: standalone_single_file.html</p>
              <p className="text-emerald-400">// Đầy đủ: 01 Landing → 02 Add Card → 03 Wallet → 05 Find Best → 06 Recommendation → 07 Compare</p>
              <p className="text-amber-400">// Đầy đủ logic: Calculate Reward, Cap overflow handling, Tie-breaking by annual fee, Real-time update</p>
              <p className="text-blue-300">&lt;!DOCTYPE html&gt;</p>
              <p className="text-blue-300">&lt;html lang="vi"&gt; ... &lt;/html&gt;</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <a
                href="/standalone_single_file.html"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
              >
                Mở file HTML thuần
              </a>

              <button
                onClick={copyStandaloneFileContent}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-sm transition flex items-center gap-1.5"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Đã sao chép mã!' : 'Sao chép mã nguồn thuần'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
