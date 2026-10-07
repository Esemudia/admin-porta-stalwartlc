# StalwartLC — Admin & Management Portal

A dedicated management and staff portal application for Stalwart Law Consult.

## Features
- **Unified Internal System (`/internal`)**: Dashboard, Matters, Matter Workspace, Clients, Documents (PDF/Docx viewer), Tasks, Calendar, Communications, Billing, Reports, Verification, Archive, and Administration.
- **Role Portals**:
  - Super Admin Portal (`/portal/super-admin` or `/super-admin`)
  - Admin Portal (`/portal/admin` or `/admin`)
  - Staff Portal (`/portal/staff` or `/staff`)
  - Lawyer Portal (`/portal/lawyer` or `/lawyer`)
  - Client Portal (`/portal/client` or `/client`)
- **Authentication**: Role-based access control with session persistence and demo accounts.
- **Backend API Proxy**: Configured in `vite.config.ts` to proxy `/api` calls to `http://localhost:3000`.

## Quick Start
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The portal runs on [http://localhost:5174](http://localhost:5174).
