# Luminary Lab - Remaining Implementation Tasks

## Overview
The project has a solid foundation with Phase 0-4 completed (project setup, database, auth, file upload, AI pipeline, and Stripe integration). However, several critical features still need implementation to be production-ready.

## High Priority Remaining Tasks

### 1. **Core UI Implementation** (P0)
- **Preset Selection UI**: Build the gallery component to display presets with thumbnails (TASK-008)
- **Intensity Slider**: Create real-time preview adjustment component (TASK-009)
- **Before/After Comparison View**: Implement draggable split view for comparing original vs processed images (TASK-011)
- **Project Gallery Dashboard**: Build the main user dashboard with project grid (TASK-013)

### 2. **Missing API Endpoints** (P0)
- **Image Export API**: Implement /api/projects/{id}/export for JPG/TIFF download (TASK-012)
- **Project CRUD API**: Complete POST/GET/DELETE operations for projects (TASK-014)
- **Usage Limits Middleware**: Enforce subscription tier limits (TASK-018)

### 3. **Enhanced Features** (P1)
- **Real-time Notifications**: WebSocket integration for job completion alerts (TASK-016)
- **Search/Filter**: Client-side project search functionality (TASK-015)
- **Admin Preset Management**: CRUD interface for preset administration (TASK-019)

### 4. **Performance & Quality** (P1)
- **RAW Metadata Extraction**: Extract and store EXIF data from uploaded files (TASK-020)
- **High-Quality Thumbnails**: Multi-size thumbnail generation with caching (TASK-021)
- **Audit Logging**: Security logging for authentication and admin actions (TASK-004)

## Recommended Implementation Order

1. **First Sprint** - Core User Experience
   - Preset Selection UI
   - Intensity Slider
   - Before/After Comparison View
   - Project Gallery Dashboard
   - Export API

2. **Second Sprint** - Business Logic & Polish
   - Project CRUD API
   - Usage Limits Enforcement
   - Real-time Notifications
   - Search/Filter

3. **Third Sprint** - Admin & Performance
   - Admin Preset Management
   - RAW Metadata Extraction
   - High-Quality Thumbnails
   - Audit Logging

## Testing Requirements
- Each task includes Gherkin-style test specifications
- Focus on integration tests with real database
- E2E tests for critical user journeys
- API contract tests for all endpoints

## Technical Notes
- All UI components should follow the design system in SPEC/design-system.md
- Use shadcn/ui components as specified in SPEC/component-inventory.md
- Maintain the existing architecture patterns (Next.js 16, Drizzle ORM, Better Auth)
- Ensure all features work with the existing Stripe integration and subscription system