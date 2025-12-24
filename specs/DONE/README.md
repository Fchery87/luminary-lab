# Luminary Lab

One-Liner

A web app where photographers upload RAW files and get subtle, high-end AI retouching and color grading—using Nano Banana plus a custom RAW + style pipeline—without opening Photoshop.

Problem & Audience

Target Users

Portrait, beauty, fashion photographers

Small studios & freelancers

High-end content creators / influencers

Advanced hobbyists

Core Problem

High-end retouching is slow, skill-heavy, and hard to scale. Most AI/photo apps give cheap “filters,” not serious, texture-preserving beauty/fashion retouch suited for print and campaigns.

Why Now

AI can now do local, face-aware edits and strong color work. Demand for premium imagery is exploding, but the market lacks a calm, pro-grade, browser-based retouch studio.

Vision & Value

Outcome:
Deliver consistent, studio-level retouching and grading from RAW, in minutes, not hours.

Value Promise:

Pros: 80–90% of a high-end retouch in seconds, tweakable.

Semi-pros: Skip deep Photoshop; start from world-class baselines.

Vibe:
Calm, minimal, “retouching studio” rather than flashy filter app.

Core Features (V1)

RAW Upload & Base Processing

Support major RAW formats.

Demosaic, camera profile, WB, exposure normalize.

Convert to 16-bit wide-gamut RGB for AI.

Nano Banana–Powered Retouch Engine

Send processed image + style prompt to Nano Banana (or Gemini image API).

Receive edited image, store, and blend with original.

Style Presets (Inspired, Not Named)

High-end retouch presets like:

Clean Commercial Beauty

Cosmetics/Glossy Beauty

Editorial Fashion

Photographic looks like:

Dramatic Portrait

Minimal B&W Editorial

Cinematic Color Story

Style System & Prompt Engineering

Each preset = structured prompt:

Base task: high-end, subtle retouch, preserve texture.

Look instructions: contrast, color, vibe.

Negative instructions: no reshaping, no plastic skin, no makeup changes.

Intensity slider adjusts AI strength + blending.

Guardrails for Subtlety & Consistency

Always show before/after.

Default to moderate intensity, texture-preserving prompts.

Blend AI result with original to avoid overcooking.

Conservative defaults for documentary-style looks.

Export

High-res JPG (sRGB).

Optional 16-bit TIFF for print/Photoshop.

Legal & Branding Choices

Use big names (Pratik Naik, Julia Kuzmenko, etc.) only as internal references for style design, not in UI.

Public preset names are generic: “Clean Beauty,” “Cinematic Portrait,” etc.

Marketing language: “inspired by high-end beauty and editorial photography,” not “by [Person].”

Training data for any future custom models must be licensed, in-house, or user opt-in; no scraping portfolios.

Add clear terms: styles are not endorsed by any specific artist unless explicitly stated.

RAW + Nano Banana Pipeline (Simple Summary)

User uploads RAW.

RAW Service → demosaic, normalize, convert to 16-bit RGB.

Image + style preset + slider → Nano Banana via AI Service.

Receive AI-retouched image.

Backend blends with original based on intensity.

User previews, tweaks, exports.

## Tech Stack

- **Stack**: nextjs_web_only
- **Generated**: 2025-12-14

## Quick Start

```bash
# Clone or download the project
git clone <repository-url>
cd luminary-lab-8cb2c7e7

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run database migrations (if applicable)
pnpm db:migrate

# Start development server
pnpm dev
```

## Project Structure

```
luminary-lab-8cb2c7e7/
├── HANDOFF.md          # Complete project handoff for LLM code generation
├── README.md           # This file
├── specs/              # All specification documents
│   ├── ANALYSIS/       # Analysis phase outputs (constitution, brief, personas)
│   ├── STACK_SELECTION/# Technology stack decisions
│   ├── SPEC/           # PRD, data models, API specs, design system
│   ├── DEPENDENCIES/   # Dependency definitions with security notes
│   ├── SOLUTIONING/    # Architecture, epics, and task breakdown
│   └── VALIDATE/       # Validation report and coverage matrix
└── (generated code)    # Use HANDOFF.md with an LLM to generate
```

## Documentation

| Document | Description |
|----------|-------------|
| [HANDOFF.md](./HANDOFF.md) | Complete handoff document for LLM code generation |
| [constitution.md](./specs/ANALYSIS/constitution.md) | Project guiding principles |
| [project-brief.md](./specs/ANALYSIS/project-brief.md) | Project overview and requirements |
| [stack-proposal.md](./specs/STACK_SELECTION/stack-proposal.md) | Stack recommendation summary |
| [stack-decision.md](./specs/STACK_SELECTION/stack-decision.md) | Approved technology stack selection |
| [stack.json](./specs/STACK_SELECTION/stack.json) | Machine-readable stack contract |
| [PRD.md](./specs/SPEC/PRD.md) | Product Requirements Document |
| [DEPENDENCIES.md](./specs/DEPENDENCIES/DEPENDENCIES.md) | Dependency rationale and grouping |
| [dependencies.json](./specs/DEPENDENCIES/dependencies.json) | Machine-readable dependencies contract |
| [design-system.md](./specs/SPEC/design-system.md) | Design tokens and UI guidelines |
| [component-inventory.md](./specs/SPEC/component-inventory.md) | UI component specifications |
| [user-flows.md](./specs/SPEC/user-flows.md) | User journey definitions |
| [architecture.md](./specs/SOLUTIONING/architecture.md) | System architecture |
| [tasks.md](./specs/SOLUTIONING/tasks.md) | Implementation tasks (test-first, with [P] parallelism markers) |
| [validation-report.md](./specs/VALIDATE/validation-report.md) | Cross-artifact consistency check results |
| [coverage-matrix.md](./specs/VALIDATE/coverage-matrix.md) | Artifact coverage by phase |

## Code Generation

To generate the implementation code, use the HANDOFF.md with your preferred LLM:

1. Open HANDOFF.md in your editor
2. Copy the entire content
3. Paste into Claude, GPT-4, or Gemini
4. Request code generation following the specifications

## License

This project was generated using the Spec-Driven Platform.

---

*Generated by [Spec-Driven Platform](https://spec-driven.dev)*
