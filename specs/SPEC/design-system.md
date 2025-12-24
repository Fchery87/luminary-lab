---
title: 'Design System'
owner: 'architect'
version: '2.0'
date: '2025-12-13'
status: 'active'
---

# Luminary Lab Design System: "Precision & Clarity"

## Philosophy

**"The Tool for the Master."**
Luminary Lab is not a toy. It is a high-precision instrument for professional retouchers. The interface should feel expensive, solid, and incredibly fast. We reject "friendly" rounded corners in favor of "precise" sharp edges. We reject "playful" purples for "electric" teals.

## 1. Color Palette

### Primary: Electric Teal

Used for primary actions, active states, and focus rings.

- **Primary**: `hsl(170, 80%, 55%)` (Bright, almost neon teal)
- **Primary Foreground**: `hsl(220, 20%, 10%)` (Deep Slate)

### Foundation: Deep Slate

Used for backgrounds to reduce eye strain during long editing sessions.

- **Background**: `hsl(220, 20%, 10%)` (Very dark blue-grey)
- **Card**: `hsl(220, 20%, 13%)` (Slightly lighter slate)
- **Border**: `hsl(220, 20%, 20%)` (Subtle separation)

### Functional Colors

- **Destructive**: `hsl(0, 80%, 60%)` (Professional Red)
- **Success**: `hsl(150, 60%, 50%)` (Data Green)
- **Warning**: `hsl(45, 90%, 60%)` (Console Amber)

## 2. Typography

**Font Family**: `Inter` (sans-serif) or `JetBrains Mono` for data.

### Hierarchy

- **Display**: Tracking `-0.02em`. Weight `700` or `800`.
- **Headings**: Tracking `-0.01em`. Weight `600`.
- **Body**: Tracking `0`. Line-height `1.6`.
- **Labels**: Uppercase. Tracking `0.05em`. Weight `500`. Text size `11px` or `12px`.

## 3. Spacing & Shape

### Radius

**Minimal Rounding**. This is a precision tool.

- **Default**: `4px` (`rounded-sm` or custom)
- **Buttons**: `4px`
- **Cards**: `4px` or `6px`

### Layout

- **Bento Molds**: Content is organized in rigid, visible grids.
- **Density**: High density is acceptable in "Edit" mode. Comfortable density in "Dashboard".

## 4. Components

### Buttons

- **Primary**: Solid Electric Teal. Sharp corners.
- **Secondary**: Ghost/Outline with slate borders.
- **Hover**: No motion scaling. Instant color shift.

### Cards

- **Style**: "Hud-like". Thin borders (`1px`). Dark backgrounds.
- **Glass**: Used sparingly for overlays, not main content.

### Inputs

- **Style**: Flat, dark backgrounds (`hsl(220, 20%, 8%)`).
- **Focus**: Hard 2px ring of Electric Teal.
