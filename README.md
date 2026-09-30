# 💳 Credit Card Optimization & Recommendation Platform

Web app giúp người dùng biết nên dùng thẻ tín dụng nào cho từng loại chi tiêu để tối đa hóa điểm thưởng / cashback. ✨

## 🧩 Problem

Người dùng sở hữu nhiều credit card nhưng khó nhớ reward rate của từng thẻ, khó biết thẻ nào tối ưu cho từng category chi tiêu, và khó đánh giá tổng giá trị của cả ví thẻ. Mỗi thẻ có reward rate, bonus category, annual fee, point system và benefits khác nhau — khiến người dùng phải tự tra cứu/nhớ thông tin từ nhiều nguồn trước khi quyết định dùng thẻ nào. 😵‍💫

## 💡 Solution

Platform cho phép người dùng:

- 🔍 **Discover** — Xác định ngay thẻ phù hợp nhất cho từng category chi tiêu (🍽 Dining, 🛒 Grocery, ✈️ Travel, ⛽ Gas, 🛍 Shopping)
- ⚖️ **Compare** — So sánh trực quan reward rate và phí giữa các thẻ trong ví
- 🧮 **Simulate** — Ước tính phần thưởng quy đổi dựa trên mức chi tiêu thực tế
- 📈 **Optimize** *(mở rộng)* — Gợi ý chiến lược phân bổ thẻ để tối đa hóa tổng giá trị ví

### 🚀 Core flow (MVP)

`Add Cards` → `My Wallet` → `Chọn Category & nhập số tiền` → `Recommendation Result` (kèm giải thích) → `Compare thẻ`

### 🧠 Recommendation logic

- `Reward = Amount × Rate` theo category được chọn
- Category không có rate riêng → áp dụng Default Rate (1x)
- Vượt cap → phần vượt tính theo Default Rate
- Nhiều thẻ đồng rate cao nhất (tie) → 🏆 ưu tiên thẻ có annual fee thấp hơn, đồng thời hiển thị đầy đủ các thẻ đồng hạng

## 🛠 Tech Stack

- 🎨 **Frontend:** HTML / CSS / JavaScript
- 🗂 **Data:** Mock data — người dùng tự nhập thông tin thẻ qua form (chưa có card database/API thật)
- ⚙️ **Backend:** _(cập nhật nếu có)_

## ⚡ Setup

### Cách 1: Chạy trực tiếp
Clone repo và mở file `index.html` bằng trình duyệt:

\`\`\`bash
git clone https://github.com/nmanh114/credit_card.git
cd credit_card
\`\`\`

Sau đó double-click vào `index.html`, hoặc kéo file vào trình duyệt.

### Cách 2: Chạy qua local server (khuyến nghị nếu có lỗi CORS)
\`\`\`bash
python -m http.server 8000
\`\`\`
Rồi mở `http://localhost:8000` trên trình duyệt.

## 🔗 Demo

> 📝 _TODO: bổ sung link demo sau khi deploy_

---
