import { db, systemStyles } from "@/db";
import { v7 as uuidv7 } from "uuid";
import { sql, eq } from "drizzle-orm";

// Run migration to add category column if it doesn't exist
async function ensureCategoryColumn() {
  try {
    // Try to add category column (will fail if already exists)
    await db.execute(sql`
      ALTER TABLE "system_styles" 
      ADD COLUMN IF NOT EXISTS "category" text
    `);
    console.log("✅ Added category column to system_styles table");
  } catch (error) {
    // Column likely already exists, which is fine
    console.log("ℹ️  Category column check complete");
  }
}

export async function seedPresets() {
  console.log("Starting database setup...");

  // Step 1: Ensure category column exists
  await ensureCategoryColumn();

  // Step 2: Check if presets already exist
  console.log("Seeding presets...");
  try {
    const existingPresets = await db.select().from(systemStyles);

    if (existingPresets.length > 0) {
      console.log(
        `Found ${existingPresets.length} existing presets, updating with new image URLs...`,
      );

      // Update existing presets with new image URLs and blendingParams
      for (const preset of presets) {
        // Find preset by name (since IDs may differ)
        const existing = existingPresets.find((ep) => ep.name === preset.name);
        if (existing) {
          const needsUpdate =
            existing.exampleImageUrl !== preset.exampleImageUrl ||
            JSON.stringify(existing.blendingParams) !== JSON.stringify(preset.blendingParams);

          if (needsUpdate) {
            console.log(`  Updating "${preset.name}"...`);
            await db
              .update(systemStyles)
              .set({
                exampleImageUrl: preset.exampleImageUrl,
                blendingParams: preset.blendingParams,
                category: preset.category,
                description: preset.description,
                aiPrompt: preset.aiPrompt,
              })
              .where(eq(systemStyles.id, existing.id));
          }
        } else {
          // Insert new preset that doesn't exist
          console.log(`  Adding new preset "${preset.name}"...`);
          await db.insert(systemStyles).values({
            id: preset.id,
            name: preset.name,
            description: preset.description,
            aiPrompt: preset.aiPrompt,
            blendingParams: preset.blendingParams,
            exampleImageUrl: preset.exampleImageUrl,
            category: preset.category,
            sortOrder: preset.sortOrder,
            isActive: true,
          });
        }
      }

      // Deactivate presets that are no longer in the list
      const currentPresetNames = new Set(presets.map((p) => p.name));
      for (const existing of existingPresets) {
        if (!currentPresetNames.has(existing.name)) {
          console.log(`  Deactivating old preset "${existing.name}"...`);
          await db
            .update(systemStyles)
            .set({ isActive: false })
            .where(eq(systemStyles.id, existing.id));
        }
      }

      console.log(`✅ Updated presets with new image URLs`);
      return;
    }

    // Step 3: Insert presets if none exist
    await db.insert(systemStyles).values(presets);

    console.log(`✅ Seeded ${presets.length} presets successfully:`);
    console.log(`   - Portrait & Beauty: 4 styles`);
    console.log(`   - Film Emulation: 4 styles`);
    console.log(`   - Moody & Dramatic: 3 styles`);
    console.log(`   - Modern & Creative: 5 styles`);
    console.log(`   - AI-Enhanced: 3 styles`);
    console.log(`   - Specialized: 4 styles`);
    console.log(`   - Cinematic: 2 styles`);
    console.log(`   - B&W: 1 style`);
    console.log(`   - Vintage: 2 styles`);
  } catch (error) {
    console.error("❌ Error seeding presets:", error);
    throw error;
  }
}

// Expanded professional presets with CSS-compatible blendingParams
// All blendingParams map directly to CSS filter values:
// - brightness: 100 = normal, range 0-200
// - contrast: 100 = normal, range 0-200
// - saturate: 100 = normal, range 0-200
// - grayscale: 0 = none, 100 = full B&W
// - sepia: 0 = none, 100 = full sepia
// - hueRotate: 0 = normal, range -180 to 180
// - blur: 0 = none, in pixels
const presets = [
  // === PORTRAIT & BEAUTY STYLES (4 presets) ===
  {
    id: uuidv7(),
    name: "Clean Commercial Beauty",
    description: "Perfect for beauty and fashion photography with natural skin tones",
    aiPrompt: "Professional beauty retouching with natural skin texture, subtle color enhancement, and clean contrast. Preserve details in hair, skin, and clothing while reducing minor blemishes.",
    blendingParams: {
      brightness: 102,
      contrast: 108,
      saturate: 105,
      sepia: 8,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1609505848912-b7c3b8b4beda?q=80&w=600&auto=format&fit=crop",
    sortOrder: 1,
    category: "portrait",
  },
  {
    id: uuidv7(),
    name: "Soft Editorial",
    description: "Gentle color grading for editorial and portrait work",
    aiPrompt: "Soft editorial style with warm tones, gentle highlights, and preserved midtones. Maintain natural skin texture while adding warmth.",
    blendingParams: {
      brightness: 105,
      contrast: 102,
      saturate: 98,
      sepia: 12,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=600&auto=format&fit=crop",
    sortOrder: 2,
    category: "portrait",
  },
  {
    id: uuidv7(),
    name: "Warm Portrait",
    description: "Warm tones ideal for family and environmental portraits",
    aiPrompt: "Warm portrait style with enhanced skin tones, soft golden highlights, and rich shadows. Maintain natural appearance while adding warmth.",
    blendingParams: {
      brightness: 103,
      contrast: 105,
      saturate: 108,
      sepia: 18,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop",
    sortOrder: 3,
    category: "portrait",
  },
  {
    id: uuidv7(),
    name: "High Key Bright",
    description: "Airy, bright look with minimal shadows for ethereal portraits",
    aiPrompt: "High key portrait style with lifted shadows, bright exposure, and clean whites. Create a light-hearted, ethereal mood.",
    blendingParams: {
      brightness: 115,
      contrast: 95,
      saturate: 95,
      blur: 0.3,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop",
    sortOrder: 4,
    category: "portrait",
  },

  // === FILM EMULATION STYLES (4 presets) ===
  {
    id: uuidv7(),
    name: "Kodak Portra 400",
    description: "Classic film look with warm, natural skin tones and fine grain",
    aiPrompt: "Emulate Kodak Portra 400 film aesthetic with warm natural color palette, fine grain structure, and lifelike skin tones. Preserve dynamic range and subtle contrast.",
    blendingParams: {
      brightness: 100,
      contrast: 105,
      saturate: 110,
      sepia: 15,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop",
    sortOrder: 5,
    category: "film",
  },
  {
    id: uuidv7(),
    name: "Fuji Pro 400H",
    description: "Vibrant colors with high contrast and punchy saturation",
    aiPrompt: "Emulate Fuji Pro 400H film with vibrant color palette, high contrast, and rich saturation. Add punch and energy to images.",
    blendingParams: {
      brightness: 102,
      contrast: 115,
      saturate: 125,
      sepia: 5,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1581403341630-a6e0b9d2d257?q=80&w=600&auto=format&fit=crop",
    sortOrder: 6,
    category: "film",
  },
  {
    id: uuidv7(),
    name: "Kodak Gold 200",
    description: "Warm golden tones with soft contrast for nostalgic look",
    aiPrompt: "Emulate Kodak Gold 200 film with warm golden color palette, soft contrast, and nostalgic feel. Perfect for outdoor portraits and lifestyle photography.",
    blendingParams: {
      brightness: 105,
      contrast: 102,
      saturate: 115,
      sepia: 25,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=600&auto=format&fit=crop",
    sortOrder: 7,
    category: "film",
  },
  {
    id: uuidv7(),
    name: "Vintage 90s Color",
    description: "1990s color grading with nostalgic muted tones",
    aiPrompt: "Apply 1990s-style color grading with muted tones, slight desaturation, and nostalgic color palette. Mimics early digital and film look.",
    blendingParams: {
      brightness: 98,
      contrast: 108,
      saturate: 78,
      sepia: 12,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1518676590629-3fbd9d3d093?q=80&w=600&auto=format&fit=crop",
    sortOrder: 8,
    category: "vintage",
  },

  // === CINEMATIC STYLES (3 presets) ===
  {
    id: uuidv7(),
    name: "Cinematic Teal & Orange",
    description: "Classic movie look with cool shadows and warm highlights",
    aiPrompt: "Cinematic teal and orange color grade. Push cool teal tones into shadows and warm orange hues into highlights. Creates striking visual depth and separates subject from background.",
    blendingParams: {
      brightness: 100,
      contrast: 120,
      saturate: 108,
      sepia: 8,
      hueRotate: -10,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=600&auto=format&fit=crop",
    sortOrder: 9,
    category: "cinematic",
  },
  {
    id: uuidv7(),
    name: "Cinematic Moody",
    description: "Dramatic tones with deep shadows and rich colors",
    aiPrompt: "Cinematic moody style with deep shadows, rich colors, and dramatic contrast. Preserve details while adding film-like quality.",
    blendingParams: {
      brightness: 92,
      contrast: 125,
      saturate: 105,
      sepia: 5,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1557053910-d9eadeed1c58?q=80&w=600&auto=format&fit=crop",
    sortOrder: 10,
    category: "cinematic",
  },
  {
    id: uuidv7(),
    name: "Blockbuster Blue",
    description: "Cool, dramatic blue tint for action movie feel",
    aiPrompt: "Blockbuster action movie style with cool blue tint, dramatic contrast, and cinematic depth.",
    blendingParams: {
      brightness: 95,
      contrast: 118,
      saturate: 95,
      hueRotate: -15,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop",
    sortOrder: 11,
    category: "cinematic",
  },

  // === MOODY & DRAMATIC STYLES (3 presets) ===
  {
    id: uuidv7(),
    name: "Low Key Moody",
    description: "Dark shadows, rich colors, mysterious atmosphere",
    aiPrompt: "Low key portrait style with deep shadows, rich colors, and mysterious atmosphere. Drop highlights and enhance moodiness.",
    blendingParams: {
      brightness: 88,
      contrast: 130,
      saturate: 90,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop",
    sortOrder: 12,
    category: "moody",
  },
  {
    id: uuidv7(),
    name: "Dark Film",
    description: "Heavy shadows with film noir inspiration",
    aiPrompt: "Dark film noir inspired style with heavy shadows, dramatic lighting, and cinematic contrast.",
    blendingParams: {
      brightness: 85,
      contrast: 135,
      saturate: 85,
      sepia: 10,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop",
    sortOrder: 13,
    category: "moody",
  },
  {
    id: uuidv7(),
    name: "Dramatic B&W",
    description: "High-contrast black and white with rich tonal range",
    aiPrompt: "High-contrast dramatic black and white with rich tonal range, deep blacks, and bright whites. Preserve texture and detail.",
    blendingParams: {
      brightness: 105,
      contrast: 140,
      saturate: 0,
      grayscale: 100,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=600&auto=format&fit=crop",
    sortOrder: 14,
    category: "b&w",
  },

  // === BLACK & WHITE STYLES (2 presets) ===
  {
    id: uuidv7(),
    name: "Classic B&W",
    description: "Timeless monochrome with balanced grays",
    aiPrompt: "Classic black and white conversion with balanced tonal range and natural grays.",
    blendingParams: {
      brightness: 100,
      contrast: 110,
      grayscale: 100,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop",
    sortOrder: 15,
    category: "b&w",
  },
  {
    id: uuidv7(),
    name: "Sepia Tone",
    description: "Vintage brown tones for nostalgic feel",
    aiPrompt: "Classic sepia tone with warm brown colors and vintage aesthetic.",
    blendingParams: {
      brightness: 102,
      contrast: 105,
      grayscale: 100,
      sepia: 75,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=600&auto=format&fit=crop",
    sortOrder: 16,
    category: "b&w",
  },

  // === MODERN & CREATIVE STYLES (5 presets) ===
  {
    id: uuidv7(),
    name: "Matte Desaturated",
    description: "Soft, muted look with faded shadows",
    aiPrompt: "Matte style with soft, muted, and almost dreamlike appearance. Reduce contrast, desaturate colors, and add subtle haze.",
    blendingParams: {
      brightness: 108,
      contrast: 88,
      saturate: 72,
      sepia: 8,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=600&auto=format&fit=crop",
    sortOrder: 17,
    category: "creative",
  },
  {
    id: uuidv7(),
    name: "Vibrant Pop",
    description: "High saturation, punchy colors for social media",
    aiPrompt: "Vibrant pop style with high saturation and punchy colors. Enhance vibrance for social media and web display.",
    blendingParams: {
      brightness: 105,
      contrast: 115,
      saturate: 145,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=600&auto=format&fit=crop",
    sortOrder: 18,
    category: "creative",
  },
  {
    id: uuidv7(),
    name: "Split Tone Teal",
    description: "Cool teal shadows with warm highlights",
    aiPrompt: "Split tone color grade with cool teal in shadows and warm highlights. Create creative dual-tone effect.",
    blendingParams: {
      brightness: 100,
      contrast: 112,
      saturate: 95,
      hueRotate: -25,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=600&auto=format&fit=crop",
    sortOrder: 19,
    category: "creative",
  },
  {
    id: uuidv7(),
    name: "Cross Process",
    description: "Ektachrome style cross-processed color shifts",
    aiPrompt: "Ektachrome cross-process style with unusual color shifts and distinctive look. Emulate cross-processed film aesthetic.",
    blendingParams: {
      brightness: 102,
      contrast: 110,
      saturate: 118,
      hueRotate: 45,
      sepia: 15,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=600&auto=format&fit=crop",
    sortOrder: 20,
    category: "vintage",
  },
  {
    id: uuidv7(),
    name: "HDR Enhanced",
    description: "Wide dynamic range with vivid details",
    aiPrompt: "HDR enhanced style with wide dynamic range and vivid details. Enhance shadow details and highlight recovery.",
    blendingParams: {
      brightness: 98,
      contrast: 135,
      saturate: 120,
      clarity: 50,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop",
    sortOrder: 21,
    category: "creative",
  },

  // === AI-ENHANCED STYLES (3 presets) ===
  {
    id: uuidv7(),
    name: "AI Portrait Retouch",
    description: "Smart skin smoothing and eye enhancement",
    aiPrompt: "AI-enhanced portrait retouching with smart skin smoothing, eye brightening, teeth whitening, and natural beauty enhancement.",
    blendingParams: {
      brightness: 103,
      contrast: 102,
      saturate: 105,
      blur: 0.5,
      sepia: 5,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop",
    sortOrder: 22,
    category: "ai",
  },
  {
    id: uuidv7(),
    name: "AI Color Balance",
    description: "Automatic white balance and color correction",
    aiPrompt: "AI-powered automatic white balance and color correction. Fix color casts, normalize skin tones, and ensure accurate colors.",
    blendingParams: {
      brightness: 100,
      contrast: 105,
      saturate: 108,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1609505848912-b7c3b8b4beda?q=80&w=600&auto=format&fit=crop",
    sortOrder: 23,
    category: "ai",
  },
  {
    id: uuidv7(),
    name: "AI Detail Enhance",
    description: "Clarity boost with enhanced local contrast",
    aiPrompt: "AI-enhanced detail improvement with clarity boost, enhanced local contrast, and sharpening. Bring out fine details without halos.",
    blendingParams: {
      brightness: 100,
      contrast: 125,
      saturate: 110,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600&auto=format&fit=crop",
    sortOrder: 24,
    category: "ai",
  },

  // === SPECIALIZED STYLES (4 presets) ===
  {
    id: uuidv7(),
    name: "Food Photography",
    description: "Enhanced appetizing colors for culinary shots",
    aiPrompt: "Food photography enhancement with appetizing colors, warm tones, and enhanced textures. Make food look delicious.",
    blendingParams: {
      brightness: 105,
      contrast: 108,
      saturate: 125,
      sepia: 10,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?q=80&w=600&auto=format&fit=crop",
    sortOrder: 25,
    category: "specialized",
  },
  {
    id: uuidv7(),
    name: "Product Photography",
    description: "Clean, commercial look for e-commerce",
    aiPrompt: "Product photography style with clean, commercial look. Neutral colors, high contrast, and professional appearance.",
    blendingParams: {
      brightness: 102,
      contrast: 112,
      saturate: 92,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop",
    sortOrder: 26,
    category: "specialized",
  },
  {
    id: uuidv7(),
    name: "Landscape Vibrance",
    description: "Enhanced natural colors for outdoor scenes",
    aiPrompt: "Landscape photography enhancement with natural colors, enhanced sky tones, and vibrant vegetation.",
    blendingParams: {
      brightness: 100,
      contrast: 115,
      saturate: 135,
      sepia: 3,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop",
    sortOrder: 27,
    category: "specialized",
  },
  {
    id: uuidv7(),
    name: "Street Photography",
    description: "Urban grit with enhanced contrast and texture",
    aiPrompt: "Street photography style with urban grit, enhanced contrast, and texture. Emphasize city atmosphere.",
    blendingParams: {
      brightness: 95,
      contrast: 140,
      saturate: 85,
      sepia: 12,
    },
    exampleImageUrl: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=600&auto=format&fit=crop",
    sortOrder: 28,
    category: "specialized",
  },
];

// Run seeding if called directly
if (import.meta.main) {
  seedPresets();
}
