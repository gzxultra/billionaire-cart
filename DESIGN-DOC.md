# Billionaire Cart — Product Design Document

## Product Vision & Core Aesthetic
Billionaire Cart is a viral web application that allows users to adopt the identity of a real-world
billionaire and "purchase" any item from any website using their live net worth. The core appeal
lies in the seamless, AI-driven extraction of product data from user-pasted URLs, paired with a
visually stunning, ultra-premium interface.

- **Visual Vibe:** "Quiet Luxury." Predominantly dark-mode (Vantablack and deep charcoal) accented with brushed copper or titanium highlights. Generous negative space, glassmorphism UI elements, and fluid, high-frame-rate animations.
- **Typography:** Inter or SF Pro for sans-serif utility, mixed with a refined serif for numbers and asset balances to mimic traditional banking statements.

## Core Mechanics & Features

### 2.1 The Identity Selector (Live Wealth Integration)
- Minimalist dropdown or carousel to select a "Sponsor" billionaire
- Dynamic Net Worth via public financial APIs (Bloomberg/Forbes real-time trackers)
- Market Fluctuation: balance constantly updates based on real-time stock movements
- Purchasing power can drop by $500M while browsing if tech stocks take a hit

### 2.2 The "Omni-Box" (AI-Powered Universal Checkout)
- Single glowing input field: "Enter any URL to purchase"
- Smart Parsing: headless browser + LLM to extract product name, price (USD), and main image
- "Black Card" receipt materializes on successful parse
- User clicks "Authorize" → deep satisfying bass sound → cost deducted from balance

### 2.3 The "Hidden Costs" Engine
High-ticket items incur automated recurring virtual fees:

| Asset Class | Example | Monthly Overhead |
|---|---|---|
| Premium RVs/Trailers | 2026 FLW Airstream 28RB Usonian | -$2,500/mo |
| Commercial Tech/Data Centers | 10,000× NVIDIA H100 GPU Cluster | -$4.5M/mo |
| Hypercars | Bugatti Tourbillon | -$25,000/mo |

### 2.4 Gamification & Viral Loops
- **Achievement Badges:**
  - "The Architect": high-end equipment (CNC machines, Angry Miao/Mode Designs keyboard kits)
  - "Compute Oligarch": draining billions on enterprise servers/AI infrastructure
  - "The Barista": La Marzocco machines and commercial grinders
- **Shareable Receipts:** Stylized vertical infographic receipt for Instagram/Twitter

## Technical Architecture (from original doc)
- Frontend: Next.js (React) + Tailwind CSS + Framer Motion
- Backend: FastAPI (Python) for async scraping and API orchestration
- Parsing Engine: Playwright (HTML fetch) → Gemini 1.5 Flash (structured JSON extraction)
- Database: PostgreSQL (caching parsed URLs, generating public "Showrooms")

## Phased Rollout
1. **Phase 1 (MVP):** Core Omni-Box with 5+ billionaires. Focus on parsing smoothness and Black Card aesthetic.
2. **Phase 2 (The Vault):** Public user showrooms. Browse what others are buying.
3. **Phase 3 (Monetization):** Convert parsed retailer links into affiliate links for CPS revenue.
