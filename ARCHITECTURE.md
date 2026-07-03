# Architecture Decisions

## Stack (Final)
- **Framework**: Next.js 14+ App Router
- **Styling**: Tailwind CSS v3 + custom Quiet Luxury theme
- **State**: Zustand with persist middleware (localStorage)
- **Animations**: Framer Motion
- **Fonts**: Inter (UI) + Playfair Display (numbers/balances) via next/font
- **Sound**: Web Audio API — procedural bass synthesis
- **URL Parsing**: API route → server-side fetch → OpenAI gpt-4o-mini extraction
- **Database**: Phase 1 = client-side localStorage only. Phase 2 = PostgreSQL via Neon
- **Package Manager**: pnpm
- **Deploy Target**: Vercel (primary), self-hostable

## Theme Tokens
```
vanta: #050507
charcoal-900: #0a0a0c
charcoal-800: #121215  
charcoal-700: #1a1a1f
charcoal-600: #242429
copper: #B87333
copper-light: #D4956B
copper-dark: #8B5A2B
copper-glow: rgba(184,115,51,0.15)
```

## Security (from Expert 5)
- SSRF: validate URLs, block RFC1918/link-local/metadata IPs, re-check after DNS resolution
- XSS: React JSX escaping, validate image URLs (https only), sanitize LLM output
- Prompt injection: strip hidden elements, use structured output, post-validate
- Rate limiting: 10 parses/min/session, 50/hour, daily budget cap
- Cost control: cache by normalized URL, use gpt-4o-mini, pre-extract meta tags before LLM

## Component Architecture (from Expert 1)
- Server Components by default, 'use client' only on interactive leaves
- Zustand store: { selectedBillionaire, purchases[], ui }
- Black Card animation: 5-phase Framer Motion sequence (idle→materialize→number-roll→authorize→complete)
- Sound: OscillatorNode 60Hz + 120Hz harmonics, GainNode envelope, DynamicsCompressor
- Receipt: html2canvas rendering a hidden 1080×1920 DOM node
- Performance: GPU-only animations (transform/opacity), reduce backdrop-blur on low-end, virtualize vault
