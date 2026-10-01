# Cardy — Trợ lý tư vấn thẻ tín dụng thông minh

Web app giúp người dùng biết nên dùng thẻ tín dụng nào cho từng loại chi tiêu để tối đa hóa điểm thưởng / hoàn tiền, đồng thời quản lý và so sánh các thẻ đang sở hữu.

**Demo:** https://gitoutofnowhere.github.io/my-frontend-app/

## Problem

Người dùng sở hữu nhiều thẻ tín dụng nhưng khó nhớ tỷ lệ hoàn thưởng của từng thẻ, khó biết thẻ nào tối ưu cho từng danh mục chi tiêu, và khó đánh giá tổng giá trị của cả ví thẻ. Mỗi thẻ có tỷ lệ hoàn thưởng, danh mục ưu đãi, phí thường niên, hệ thống tích điểm và quyền lợi khác nhau — khiến người dùng phải tự tra cứu/nhớ thông tin từ nhiều nguồn trước khi quyết định dùng thẻ nào.

## Solution

Cardy giải quyết vấn đề qua 5 mục chính:

| Mục | Chức năng |
|---|---|
| **Trang chủ** | Tổng quan sản phẩm và lối vào nhanh tới các tính năng |
| **Gợi ý thẻ** | Gợi ý thẻ tối ưu nhất cho một danh mục chi tiêu cụ thể |
| **Khám phá thẻ** | Duyệt toàn bộ danh sách thẻ trong hệ thống, xem chi tiết từng thẻ |
| **Ví thẻ** | Quản lý ví thẻ cá nhân — thêm/gỡ thẻ đang sở hữu |
| **So sánh** | So sánh song song tối đa 3 thẻ trên cùng một bảng |

### Tính năng nổi bật: Gợi ý thẻ tối ưu

Đây là tính năng cốt lõi của Cardy. Cách sử dụng:

1. Vào mục **Gợi ý card**
2. Chọn danh mục chi tiêu (Ăn uống, Mua sắm tạp hóa, Du lịch, Xăng xe, Mua sắm...)
3. Nhập số tiền dự kiến chi tiêu
4. Hệ thống trả về **thẻ phù hợp nhất** trong ví của bạn cho danh mục đó, kèm:
   - Tỷ lệ hoàn thưởng áp dụng
   - Số điểm/tiền hoàn ước tính = `Số tiền × Tỷ lệ hoàn thưởng`
   - Giải thích lý do được chọn
5. Có thể thêm thẻ vào ví hoặc xem chi tiết thẻ ngay từ kết quả gợi ý

**Logic xử lý:**
- Nếu danh mục không có tỷ lệ ưu đãi riêng → áp dụng tỷ lệ mặc định
- Nếu chi tiêu vượt mức giới hạn thưởng (cap) của ưu đãi → phần vượt tính theo tỷ lệ mặc định
- Nếu nhiều thẻ có tỷ lệ hoàn thưởng cao bằng nhau (đồng hạng) → ưu tiên đề xuất thẻ có phí thường niên thấp hơn, đồng thời hiển thị đầy đủ các thẻ đồng hạng còn lại

### Các tính năng khác

- **Tìm card mở mới** — tìm và xem chi tiết thẻ (phí thường niên, tỷ lệ hoàn thưởng từng danh mục, quyền lợi) trước khi quyết định thêm vào ví hoặc đưa vào so sánh
- **Ví thẻ** — thêm hoặc gỡ thẻ khỏi ví cá nhân, ví là nguồn dữ liệu chính cho tính năng Gợi ý thẻ
- **So sánh** — chọn một thẻ bất kỳ để so sánh với những thẻ hiện đang sở hữu trong Ví thẻ, để thấy mức độ tối ưu của ví thẻ hiện tại

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Quản lý trạng thái:** React hooks (useState, useEffect) — không dùng thư viện ngoài
- **Dữ liệu:** Gọi API thật qua các hàm trong `api/cards`, `api/wallet` (không phải dữ liệu giả lập tĩnh)

## Install

Clone repo về máy:

```bash
git clone https://github.com/gitoutofnowhere/my-frontend-app.git
cd my-frontend-app
```

Cài dependencies:

```bash
npm install
```

Chạy ở môi trường dev:

```bash
npm run dev
```

Mặc định app sẽ chạy tại `http://localhost:5173`.

## Project Structure

```
my-frontend-app/
├── .github/workflows/
│    └── deploy-pages.yml       # GitHub Pages deploy workflow
├── public/
│   ├── favicon.svg
│   ├── icons.svg
│   └── logo.svg
├── src/
│   ├── api/                       # Gọi API backend (cards, wallet...)
│   ├── assets/
│   ├── brand/                     # Brand guideline / tokens
│   ├── components/                # Các component dùng chung
│   ├── pages/                     # Các trang: Home, Recommend, Explore, Wallet, Compare
│   ├── types/                     # TypeScript types
│   ├── utils/
│   ├── App.css
│   ├── App.tsx                    # Component gốc, điều hướng giữa các tab
│   ├── index.css
│   └── main.tsx                   # Entry point
├── .gitignore
├── .oxlintrc.json
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
└── README.md
└── package-lock.json
└── tsconfig.app.json
└── tsconfig.node.json
└── vite.config.ts
```
