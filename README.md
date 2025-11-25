# Crowdiant Restaurant OS

> **"Leave when you're ready. No waiting for the check."**

An AI-powered Restaurant Operating System that transforms hospitality through frictionless Express Checkout, intelligent scheduling, and real-time operations management.

## 🎯 Primary Differentiator

**Card-Holding Express Checkout** - Crowdiant's signature innovation reimagines tab management by replacing physical card holding with digital pre-authorization. Customers experience "Just Walk Out" dining while venues eliminate walk-away losses through progressive trust scoring.

### Key Features

- **Express Checkout System** - Pre-authorized tabs with walk-away detection
- **Trust Scoring** - Dynamic risk assessment enabling VIP perks for repeat customers
- **AI Staff Scheduling** - Demand forecasting with constraint-based optimization
- **Smart Inventory** - Waste reduction through predictive par-level management
- **Loyalty & Gamification** - Points, tiers, badges, and challenges
- **Multi-Location Management** - Centralized control for restaurant groups

## 📊 Success Metrics

- 70%+ Express Checkout adoption within 90 days
- $0 walk-away losses for participating venues
- 15-25% reduction in food waste
- 30% increase in customer visit frequency (loyalty members)

## 📁 Project Structure

- `.bmad/` - BMAD method configuration and core files
- `.github/` - GitHub workflows and chat modes
- `docs/` - Comprehensive project documentation
  - `prd.md` - Product Requirements (98 functional requirements)
  - `architecture.md` - Tech stack and system design
  - `technical-specs/` - 9 implementation specifications (~13,000 lines)
  - `features/` - Deep-dive feature documentation
  - `sprint-artifacts/` - 14 epics, 100+ user stories

## 🛠️ Technology Stack

**Core:** Next.js 14, TypeScript, tRPC, Prisma, NextAuth  
**Database:** PostgreSQL, Redis  
**Payments:** Stripe Connect  
**Real-Time:** Socket.io  
**Infrastructure:** Vercel, Railway  

## 🚀 Getting Started

This project uses the BMAD (Build, Measure, Analyze, Deploy) methodology for AI-driven development.

### Installation

```bash
npm install
npx create-t3-app@latest
npx prisma migrate dev
```

### Documentation

- **[Product Requirements](docs/prd.md)** - Complete feature specifications
- **[Technical Specifications](docs/technical-specs/)** - Implementation guides
- **[Sprint Planning](docs/sprint-artifacts/epics-and-stories.md)** - Work breakdown
- **[Express Checkout Deep-Dive](docs/features/card-holding-express-checkout.md)** - Primary differentiator

## 📈 Implementation Roadmap

**MVP (16 weeks):**
- Sprint 0: Foundation setup
- Sprints 1-3: Core features + Express Checkout ⭐
- Sprints 4-7: POS, Menu, Kitchen, Trust, Tables

**Growth (12 weeks):**
- Sprints 10-13: Communications, Analytics, Reservations, Loyalty
- Sprints 14-15: Inventory, Integrations, Admin tools

## 🎓 Project Status

**Current Phase:** Sprint Planning Complete  
**Documentation:** 100% (9 technical specs, 2 feature deep-dives)  
**Next Step:** Database setup (Prisma migrations)

## 📝 License

MIT

---

**Built with:** T3 Stack + BMAD Methodology  
**Target:** All restaurant types (food trucks → fine dining → chains)  
**Positioning:** "Restaurant Operating System" vs single-feature point solutions
