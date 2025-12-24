---
title: Project Brief
owner: analyst
version: 1.0
date: 2025-12-13
status: draft
---

# Executive Summary
This project is a subscription-based web application that provides portrait, beauty, and fashion photographers with high-end, AI-powered retouching and color grading directly from RAW files. By combining a robust RAW processing pipeline with a carefully engineered AI (Nano Banana/Gemini) style system, it delivers subtle, texture-aware edits in minutes—bypassing hours in Photoshop. Targeting professionals and advanced hobbyists, the app offers a calm, studio-like interface with curated, artist-inspired presets, aiming to capture a segment of the premium photo-editing market underserved by existing filter-heavy AI tools.

# Problem Statement
High-end retouching for beauty, fashion, and portrait photography is a time-intensive, skill-dependent process, often requiring costly software (Photoshop) and years of expertise. Current AI photo apps prioritize speed and dramatic effects over the subtle, local adjustments needed for professional work, resulting in "plastic" skin, lost detail, and an amateur "filter" look. This creates a bottleneck for photographers and small studios looking to scale quality output.

# Solution Overview
A web app where users upload RAW files, select from a library of professionally crafted style presets (e.g., "Clean Commercial Beauty"), adjust intensity via a slider, and receive a high-quality, retouched image. The backend processes the RAW file, sends it to a configured AI service with a structured prompt based on the preset, blends the result with the original for control, and provides export in sRGB JPG and 16-bit TIFF formats.

# Target Market Analysis
*   **TAM (Total Addressable Market):** The global professional photography software & services market. Estimated at $10+ billion, encompassing all software, retouching services, and related tools for professional photographers.
*   **SAM (Serviceable Addressable Market):** The subset of photographers specializing in portraits, beauty, fashion, and weddings who actively edit RAW files. Estimated at 3-5 million globally, including freelancers, small studios, and advanced hobbyists.
*   **SOM (Serviceable Obtainable Market):** The realistic first-year target of early adopters within the SAM: professional photographers in North America and Europe actively seeking efficiency tools. Conservative target: 0.1% of SAM = 3,000-5,000 users.

# Competitive Landscape
1.  **Adobe Photoshop/Lightroom (Dominant Incumbent):** Full-featured, industry standard. **Differentiation:** We offer a radically faster, simpler path for the *specific* task of high-end retouching/grading, with AI-guided consistency.
2.  **Skylum Luminar Neo (AI-Focused Editor):** Strong AI tools for general enhancement and sky replacement. **Differentiation:** We focus narrowly on the nuanced demands of beauty/fashion retouching with texture preservation and RAW-first workflow, avoiding "jack-of-all-trades" complexity.
3.  **PortraitPro (Specialist Retoucher):** Dedicated to portrait retouching, often desktop-based. **Differentiation:** Web-based convenience, a calmer UX, and a stronger emphasis on holistic color grading and style, not just face-specific adjustments.
4.  **VSCO / Preset Marketers (Style Providers):** Offer color presets (LUTs). **Differentiation:** We provide integrated, AI-executed *local retouching* (skin, dodging/burning) combined with color, not just global color filters.
5.  **Pictorial (Emerging AI):** AI photo editor with style transfer. **Differentiation:** Our deep focus on the professional beauty/fashion vertical, RAW pipeline, and guardrails against over-processing.

# Key Features
*   **Must-have (MVP):** RAW upload & processing; Nano Banana/Gemini API integration; 5-8 core style presets; adjustable intensity slider; before/after view; export to JPG & 16-bit TIFF; user accounts/project gallery; secure file handling.
*   **Should-have (Phase 2):** Batch processing (multiple files); custom preset saving/management; basic manual adjustment sliders (exposure, contrast) post-AI; client proofing galleries; more style presets.
*   **Nice-to-have (Future):** Photoshop/Lightroom plugin; AI model fine-tuning with user-uploaded examples (opt-in); print lab integration; watermarking; mobile app.

# MVP Scope
The MVP will be a functional web app enabling a single user to: create an account, upload a RAW file (up to 3 concurrent jobs), select from 5 predefined style presets, adjust an intensity slider, process the image via the AI pipeline, preview the result, and download final JPG/TIFF files. It will **not** include: batch processing, custom presets, manual editing tools, team accounts, or a mobile app.

# Success Metrics (SMART)
1.  **User Activation:** 60% of users who upload a RAW file complete a full edit and export cycle within their first session. (Measured via analytics, target: within 3 months of launch.)
2.  **Quality Validation:** Achieve an average edit quality rating of ≥4.0/5.0 from a panel of 100 beta-testing professional photographers. (Target: at the end of beta phase.)
3.  **Retention:** 40% of users who convert to a paid plan remain active (use the service at least once) after 90 days. (Target: 6 months post-paid launch.)
4.  **Performance:** 90th percentile image processing time (upload to preview) < 120 seconds. (Ongoing, measured weekly.)

# Risks and Mitigations
1.  **Risk:** AI output quality is inconsistent or fails to meet professional subtlety standards.
    *   **Mitigation:** Implement rigorous prompt engineering, A/B testing with pro photographers, and a robust blending system with conservative defaults.
2.  **Risk:** High cost of AI inference and RAW file storage erodes profitability.
    *   **Mitigation:** Start with tiered subscription plans that align processing limits with price; optimize image pipeline for efficiency; monitor unit economics closely.
3.  **Risk:** Key differentiator is copied by larger competitors (e.g., Adobe) quickly.
    *   **Mitigation:** Focus on building a strong community and brand loyalty within the niche pro photographer segment; iterate rapidly on style presets and workflow based on user feedback.
4.  **Risk:** Legal challenges regarding style preset "inspiration" from named artists.
    *   **Mitigation:** Adhere strictly to the branding guidelines: use generic names, market as "inspired by" genres, and maintain clear, protective Terms of Service.

# Technical Preferences
*   **Target Platforms:** Web app (responsive) for desktop browsers (Chrome, Safari, Firefox) as primary MVP. [AI ASSUMED: Mobile browser support is secondary but should be functional.]
*   **Team Expertise:** [AI ASSUMED: Strong full-stack JavaScript/TypeScript (Node.js, React), Python for image processing, and experience with cloud services.]
*   **Infrastructure:** Cloud-native (AWS preferred: S3 for storage, Lambda/ECS for processing, RDS for metadata). [AI ASSUMED: No on-premise requirements.]
*   **Scale Expectations:** Initial architecture to support 10k users, 500k image processed per month. Designed to scale horizontally.
*   **Integration Requirements:** Third-party RAW processing library (e.g., LibRaw, RawPy), Nano Banana or Google Gemini Vision API, payment processor (Stripe/Paddle).
*   **Performance Requirements:** Async job processing. Target: <5 sec for initial upload/parse, <90 sec for full AI pipeline for standard image.
*   **Budget Constraints:** [AI ASSUMED: Initial hosting/AI API budget ceiling of ~$5k/month at anticipated early scale.]