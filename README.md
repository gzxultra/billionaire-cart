# 💳 Billionaire Cart

**The Ultimate High-Net-Worth Simulation & Universal Checkout Experience**

Ever wondered how fast you could spend a billionaire's fortune? Select a real-world billionaire, paste any product URL, and watch the AI extract the item while a luxury Black Card checkout drains their staggering net worth.

---

## ✨ Features

- **🏦 Identity Selector** — Choose from 12 real billionaires with live net worth data. Balance simulates market fluctuation in real-time.
- **🔗 Omni-Box** — Paste any URL. AI extracts product name, price, and image from any website — Amazon, Taobao, boutique stores, anything.
- **💳 Black Card Checkout** — Premium matte-black card animation with procedural bass sound. "AUTHORIZED" hits different.
- **📉 Hidden Costs Engine** — Supercars cost $25K/mo in insurance. GPU clusters burn $4.5M/mo. RV trailers need $2.5K/mo storage. Your monthly burn rate is always ticking.
- **🏆 15 Achievements** — "Compute Oligarch" for draining billions on servers. "The Architect" for custom keyboards. "Nomad Edition" for Airstream collectors.
- **📱 Shareable Receipts** — Generate a stylized vertical infographic of your ridiculous cart. Perfect for Twitter/Instagram.
- **🎨 Quiet Luxury UI** — Vantablack + copper. Glassmorphism. Serif numbers. Zero compromise on aesthetics.

## 🛠 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + custom Quiet Luxury theme
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **State**: [Zustand](https://zustand-demo.pmnd.rs/) with localStorage persistence
- **Sound**: Web Audio API (procedural synthesis — no audio files)
- **AI Parsing**: OpenAI gpt-4o-mini (optional — works with meta-tag extraction too)
- **Receipt Export**: html2canvas

## 🚀 Getting Started

```bash
# Clone
git clone https://github.com/gzxultra/billionaire-cart.git
cd billionaire-cart

# Install
pnpm install

# Set up environment (optional — AI parsing)
cp .env.example .env
# Add your OPENAI_API_KEY for enhanced URL parsing

# Run
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | No | Enables AI-powered product extraction from URLs. Without it, the app falls back to meta-tag parsing. |

## 📁 Project Structure

```
src/
├── app/
│   ├── api/parse/route.ts    # URL parsing API endpoint
│   ├── globals.css            # Quiet Luxury base styles
│   ├── layout.tsx             # Root layout with fonts
│   └── page.tsx               # Main page
├── components/
│   ├── identity-selector.tsx  # Billionaire picker
│   ├── balance-display.tsx    # Animated balance counter
│   ├── black-card.tsx         # Premium card visual
│   ├── omni-box.tsx           # URL input + manual entry
│   ├── product-card.tsx       # Parsed product display
│   ├── checkout-animation.tsx # Authorization sequence
│   ├── vault.tsx              # Purchase history
│   ├── achievements.tsx       # Badge grid
│   └── share-receipt.tsx      # Social receipt generator
├── data/
│   ├── billionaires.ts        # 12 billionaire profiles
│   └── achievements.ts        # 15 achievement definitions
└── lib/
    ├── store.ts               # Zustand state management
    ├── types.ts               # TypeScript types
    ├── format.ts              # Currency & time formatting
    ├── sounds.ts              # Web Audio procedural sounds
    ├── url-validator.ts       # SSRF protection
    └── asset-classifier.ts    # Product → asset class mapping
```

## ▲ Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/gzxultra/billionaire-cart)

## 📋 Roadmap

- [x] **Phase 1**: Core Omni-Box + 12 billionaires + Black Card checkout + achievements
- [ ] **Phase 2**: Public showrooms — browse what others are buying
- [ ] **Phase 3**: Affiliate link monetization (Amazon, BestBuy, eBay)

## 📄 License

MIT — see [LICENSE](LICENSE).

---

*Simulation only. No real purchases are made. Net worth figures are approximate.*
