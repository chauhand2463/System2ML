# System2ML - Enterprise ML Pipeline Design & Governance Platform

## Project Overview

System2ML is a comprehensive, professional-grade platform for designing, monitoring, and governing ML pipelines. It features intelligent AI-powered design suggestions, real-time monitoring with drift detection, centralized failure management, and complete audit trails for enterprise compliance.

## Core Features Implemented

### 1. **Dashboard** (`/dashboard`)
- KPI cards showing active pipelines, success rates, failures, and alerts
- Real-time activity timeline with severity indicators
- System health monitoring
- Quick access to top issues and actions

### 2. **Pipeline Management** (`/pipelines`)
- Pipeline list with status indicators and version tracking
- Grid view organized by status (active, drafts, archived)
- Detailed pipeline designer with DAG visualization
- Node property inspector for configuration management

### 3. **Pipeline Runs** (`/runs`)
- Comprehensive run history with status tracking
- Performance metrics (throughput, latency, costs)
- Duration and row processing information
- Real-time and historical run monitoring

### 4. **Failure Memory** (`/failures`)
- Centralized knowledge base of pipeline failures
- Suggested fixes backed by AI analysis
- Resolution tracking and history
- Stack trace investigation
- Frequency tracking for recurring issues

### 5. **Monitoring & Drift Detection** (`/monitoring`)
- Real-time data drift detection
- Severity-based alerting (critical, high, medium, low)
- Baseline vs. current value comparison
- Drift percentage visualization
- Acknowledgment workflow for active alerts

### 6. **AI Design Agent** (`/design-agent`)
- Intelligent pipeline optimization proposals
- Explainable recommendations with data support
- Risk assessment (low/medium/high)
- Alternative approaches for each proposal
- Expected benefit forecasting

### 7. **Approvals & Governance** (`/approvals`)
- Multi-stage approval workflow for pipeline changes
- Diff view of proposed changes
- Comment threads for collaborative review
- Approval history and tracking
- Status indicators (pending, approved, rejected)

### 8. **Governance & Audit** (`/governance`)
- Complete audit trail of all operations
- Timeline view of events with severity levels
- Searchable audit logs
- Export functionality for compliance reporting
- Governance policies dashboard

### 9. **Settings** (`/settings`)
- Organization configuration
- Team member management
- Role and permission controls
- Notification preferences
- Security settings (2FA, API keys, SSH keys)
- Integration management (Slack, webhooks)

### 10. **Landing Page** (`/`)
- Hero section with feature overview
- Feature grid highlighting key capabilities
- Call-to-action sections
- Navigation to dashboard

## Technical Architecture

### Directory Structure
```
/app
  /dashboard          # Overview and KPIs
  /pipelines          # Pipeline list and designer
    /[id]            # Individual pipeline detail
  /runs              # Pipeline run history
  /failures          # Failure knowledge base
  /monitoring        # Drift detection and alerts
  /design-agent      # AI optimization proposals
  /approvals         # Change approval workflow
  /governance        # Audit and compliance
  /settings          # Configuration and preferences
  /page.tsx          # Landing page
  /layout.tsx        # Root layout

/components
  /layout
    /sidebar.tsx     # Main navigation
    /header.tsx      # Top header with search
    /dashboard-layout.tsx  # Layout wrapper
  /dashboard
    /kpi-card.tsx    # KPI display component
    /activity-timeline.tsx  # Activity feed
  /pipelines
    /pipeline-card.tsx      # Pipeline list item
    /pipeline-designer.tsx  # DAG editor

/lib
  /types.ts          # TypeScript interfaces
  /api.ts            # Mock data and API functions
  /utils.ts          # Utility functions (cn helper)

/tailwind.config.ts  # Color palette and theme
/globals.css         # Global styles
```

### Color Palette (Professional & Enterprise-focused)
- **Brand Blue**: `#6b8ef4` - Primary CTA and accents
- **Success Green**: `#22c55e` - Positive states
- **Warning Orange**: `#eab308` - Warnings
- **Danger Red**: `#ef4444` - Errors and critical
- **Info Cyan**: `#0ea5e9` - Information
- **Neutrals**: Complete grayscale for text and backgrounds

### Key Components
- **Sidebar Navigation**: Dark theme with hover states and active indicators
- **Dashboard Layout**: 2-column responsive layout with sidebar
- **KPI Cards**: Stats display with trend indicators
- **Timeline**: Activity feed with severity-based coloring
- **Pipeline Designer**: Canvas with node visualization and properties panel
- **Tables**: Data tables with sorting and filtering capabilities

## Mock Data Structure

### Users
- **Email**: engineer@system2ml.com
- **Name**: Alex Chen
- **Role**: Engineer
- **Organization**: DataCorp ML

### Pipelines
1. **Customer Segmentation** (v3, Active)
   - 4 nodes with KMeans clustering
   - Production pipeline with drift monitoring

2. **Fraud Detection** (v2, Active)
   - Ensemble model based detection
   - Real-time processing

3. **Revenue Forecasting** (v1, Draft)
   - Time series forecasting
   - Under development

### Data Points
- 3 active pipelines
- 3+ recent runs with varying statuses
- 2 unresolved failure cases
- 2 active data drift alerts
- 3+ pending approvals
- 30-day usage history for cost tracking

## Design System

### Typography
- **Heading Font**: Geist (default system-ui)
- **Body Font**: Geist (default system-ui)
- **Mono Font**: Geist Mono (for code)

### Spacing Scale
Uses Tailwind default spacing: 0, 2, 4, 6, 8, 12, 16, 20, 24, 32px

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Sidebar collapses on mobile, main content full-width

### Accessibility
- Semantic HTML (main, header, nav)
- ARIA labels and roles
- High contrast colors
- Keyboard navigation support

## Key User Flows

### 1. Dashboard Overview
User lands on dashboard → Sees KPIs and health status → Reviews recent activity → Quick actions to drill down

### 2. Pipeline Design
View pipelines → Select pipeline → Open designer → View/edit nodes → Submit changes → Approval workflow

### 3. Failure Resolution
See failures on dashboard → Click into failures page → Review error details and suggestions → Apply fix → Mark resolved

### 4. Monitoring Alerts
System detects drift → Alert appears on monitoring page → Review severity → Acknowledge → Investigate root cause

### 5. Change Governance
Engineer proposes change → Design agent suggests improvements → Approval workflow → Audit trail recorded

## Future Enhancement Opportunities

1. **Backend Integration**: Connect to real databases (Supabase, Neon, etc.)
2. **Real-time Updates**: WebSocket for live run monitoring
3. **Advanced Visualizations**: Interactive pipeline DAGs with zoom/pan
4. **Model Versioning**: Detailed model lineage and performance tracking
5. **Cost Optimization**: ML-powered resource allocation suggestions
6. **Custom Alerting**: User-defined alert thresholds and rules
7. **Integration Plugins**: Slack, PagerDuty, custom webhooks
8. **Mobile App**: Native mobile experience
9. **Team Collaboration**: Real-time collaborative editing
10. **Compliance Reports**: Automated compliance document generation

## Development Notes

- All components use Tailwind CSS for styling
- Uses Next.js 16 App Router
- React 19 with server/client components
- TypeScript for type safety
- Mock data in `/lib/api.ts` - easily swappable with real API calls
- No external UI library dependencies (shadcn/ui included)
- Dark theme optimized for data visualization
- Accessible and responsive design

## Quick Start

1. Install dependencies: `pnpm install`
2. Run development server: `pnpm dev`
3. Open http://localhost:3000 in browser
4. Navigate to `/dashboard` to see main app
5. Explore different sections via sidebar navigation

---

**Status**: Complete MVP with all core features implemented and ready for backend integration.
