# Dukahub

> **AI-powered point-of-sale system for modern small businesses**

Dukahub helps shopkeepers ditch manual data entry and expensive barcode scanners. Use your phone's camera to instantly recognize products, process sales, and manage inventory—all powered by custom AI trained on your products.

## Quick Links

- 🚀 **[Setup & Deployment](./INFRASTRUCTURE.md)** - Get started, deploy anywhere
- 🆕 **[Fresh Setup](./INFRASTRUCTURE.md#fresh-setup)** - First-time installation guide
- 🏗️ **[Architecture](./ARCHITECTURE.md)** - System design and decisions
- 🤖 **[ML Guide](./ML_GUIDE.md)** - AI model training
- 🗺️ **[Roadmap](./ROADMAP.md)** - Planned features

## Current Status

**Version:** 2.0 (Active Development)  
**Stack:** Angular + Vendure + PostgreSQL  
**V1 Archive:** See [V1 Migration](./docs/v1-migration/MIGRATION_SUMMARY.md)

## Core Features

- 🎯 **AI Product Recognition** - Camera-based product identification
- 💰 **Fast Point-of-Sale** - Streamlined checkout workflow
- 📦 **Inventory Management** - Real-time stock tracking
- 🏪 **Multi-location Support** - Manage multiple shops
- 📊 **Sales Analytics** - Business insights
- 📱 **Mobile-first** - Optimized for smartphones

## Tech Stack

| Component      | Technology                           |
| -------------- | ------------------------------------ |
| **Frontend**   | Angular 19 + daisyUI + Tailwind CSS  |
| **Backend**    | Vendure (NestJS) + TypeScript        |
| **Database**   | PostgreSQL 16                        |
| **Cache**      | Redis 7                              |
| **ML**         | TensorFlow.js (client-side)          |
| **Deployment** | Container images (platform-agnostic) |

## Project Structure

```
dukahub/
├── backend/          # Vendure server & worker
├── frontend/         # Angular SPA
├── configs/          # Shared configuration
└── docs/             # Documentation & assets
```

## Getting Started

```bash
# Clone repository
git clone https://github.com/yourusername/dukahub.git
cd dukahub
```

**Next:** See [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) for complete setup instructions.

## Contributing

This is currently a private project. For questions or contributions, contact the maintainers.

## License

Proprietary - All rights reserved

---

**Built with ❤️ for African small businesses**
