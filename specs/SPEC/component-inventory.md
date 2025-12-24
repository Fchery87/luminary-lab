---
title: "Component Inventory"
owner: "architect"
version: "1"
date: "2025-12-13"
status: "draft"
---

# Component Inventory

## Layout Components
| Component | Base | Variants | Animation |
|-----------|------|----------|-----------|
| AppShell | Custom | With sidebar, Without sidebar (fullscreen) | Sidebar collapse/expand with `motion.div` slide |
| NavigationBar | `<nav>` + shadcn buttons | Logged-in state, Logged-out state | Link hover effects, active state underline fade |
| Sidebar | shadcn `Sheet` on mobile, `motion.aside` on desktop | Collapsed (icons only), Expanded | Smooth width transition, nested list stagger children |
| DashboardGrid | CSS Grid | Project view (cards), Empty state | Container `layoutId` for project card to detail page transitions |
| SectionContainer | `<section>` | Default, Padded, Condensed | `motion.section` with fade-in on scroll |

## Form Components
| Component | Base | Variants | Animation |
|-----------|------|----------|-----------|
| TextInput | shadcn `Input` | Default, Error, Success, Disabled | Error message slide-down, focus ring pulse |
| PasswordInput | shadcn `Input` (type password) | With visibility toggle | Toggle icon rotation |
| Button | shadcn `Button` | Primary, Secondary, Ghost, Destructive, Icon, Loading | Hover scale (subtle), loading spinner rotation |
| FileUploadDropzone | shadcn `Label` + custom | Active, Drag-over, Error (invalid file), Processing | Drag-over glow pulse, file list item enter stagger |
| FormLabel | shadcn `Label` | Required (with asterisk) | - |
| FormError | shadcn `FormMessage` | - | Slide-down on appearance |
| Checkbox | shadcn `Checkbox` | - | Check mark draw animation |
| Select | shadcn `Select` | - | Dropdown slide-up/down |

## Data Display
| Component | Base | Variants | Animation |
|-----------|------|----------|-----------|
| ProjectCard | shadcn `Card` | Default, Selected, Processing, Error | Card hover lift, image load fade-in, status badge pulse |
| ImagePreview | Custom canvas + container | Single view, Before/After split, Grid thumbnail | Before/after slider drag, split line transition |
| StylePresetCard | shadcn `Card` | Default, Active (selected), Hover | Selection border glow, hover scale (subtle) |
| UserAvatar | shadcn `Avatar` | With dropdown menu | - |
| Badge | shadcn `Badge` | Status (processing, complete, error), Type (subscription tier) | - |
| Table (Project List) | shadcn `Table` | Sortable headers | Row hover highlight |
| MetadataPanel | shadcn `Card` (variant ghost) | Expanded, Collapsed | Expand/collapse with `motion.div` height animation |
| EmptyState | Custom | Dashboard (no projects), Gallery (no images), Search (no results) | Icon float (subtle), text fade-in |

## Feedback Components
| Component | Base | Variants | Animation |
|-----------|------|----------|-----------|
| ProcessingOverlay | shadcn `Dialog` (no close) | Indeterminate, Determinate (progress bar) | Backdrop blur in, progress bar fill |
| Toast / Notification | shadcn `Toast` | Success, Error, Info, Warning | Toast enter (slide-right), exit (fade-out) |
| LoadingSpinner | shadcn `Spinner` | Small, Medium, Large, Fullscreen | Continuous rotation, fullscreen backdrop fade-in |
| SkeletonLoader | shadcn `Skeleton` | Card, List item, Text line, Image | Pulse animation |
| Tooltip | shadcn `Tooltip` | Default, Delayed (for complex UI) | Fade-in on hover delay |
| Alert | shadcn `Alert` | Destructive, Informational, Success | Icon subtle shake (for errors) |

## Custom Components (not in shadcn/ui)
| Component | Purpose | Props |
|-----------|---------|-------|
| BeforeAfterSlider | Interactive image comparison | `beforeImage: string`, `afterImage: string`, `initialSplit: number`, `orientation: 'horizontal' | 'vertical'` |
| StylePresetGrid | Displays curated AI style presets | `presets: Array<{id, name, thumbnail, description}>`, `onSelect: (id) => void`, `selectedId: string` |
| ProcessingPipelineStatus | Visualizes RAW processing steps | `steps: Array<{id, label, status: 'pending', 'processing', 'complete', 'error'}>`, `activeStepId: string` |
| ImageCanvas | High-quality image rendering for preview | `imageUrl: string`, `zoom: number`, `pan: {x, y}`, `showGrid: boolean` |
| ExportFormatSelector | Selection of export options (JPG, TIFF) | `value: string`, `onChange: (format) => void`, `disabledFormats: string[]` |
| SubscriptionTierBadge | Displays user's plan visually | `tier: 'free', 'pro', 'enterprise'`, `showLabel: boolean` |
| UploadQueueItem | Shows status of individual file in upload batch | `file: File`, `status: 'queued', 'uploading', 'processing', 'done', 'error'`, `progress: number` |
| ProjectGridFilter | Filter and sort controls for project gallery | `onSortChange: (sortBy) => void`, `onFilterChange: (filter) => void`, `sortOptions: Array`, `filterOptions: Array` |