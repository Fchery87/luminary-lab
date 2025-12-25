import { db, systemStyles } from '@/db';
import { v7 as uuidv7 } from 'uuid';
import { sql, eq } from 'drizzle-orm';

// Run migration to add category column if it doesn't exist
async function ensureCategoryColumn() {
  try {
    // Try to add category column (will fail if already exists)
    await db.execute(sql`
      ALTER TABLE "system_styles" 
      ADD COLUMN IF NOT EXISTS "category" text
    `);
    console.log('✅ Added category column to system_styles table');
  } catch (error) {
    // Column likely already exists, which is fine
    console.log('ℹ️  Category column check complete');
  }
}

export async function seedPresets() {
  console.log('Starting database setup...');

  // Step 1: Ensure category column exists
  await ensureCategoryColumn();

  // Step 2: Check if presets already exist
  console.log('Seeding presets...');
  try {
    const existingPresets = await db.select().from(systemStyles);

    if (existingPresets.length > 0) {
      console.log(
        `Found ${existingPresets.length} existing presets, updating with new image URLs...`
      );

      // Update existing presets with new image URLs
      for (const preset of presets) {
        // Find preset by name (since IDs may differ)
        const existing = existingPresets.find(ep => ep.name === preset.name);
        if (existing && existing.exampleImageUrl !== preset.exampleImageUrl) {
          console.log(`  Updating "${preset.name}" image URL...`);
          await db
            .update(systemStyles)
            .set({ exampleImageUrl: preset.exampleImageUrl })
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
    console.error('❌ Error seeding presets:', error);
    throw error;
  }
}

// Expanded professional presets based on 2024-2025 industry trends
const presets = [
  // === PORTRAIT & BEAUTY STYLES (4 presets) ===
  {
    id: uuidv7(),
    name: 'Clean Commercial Beauty',
    description:
      'Perfect for beauty and fashion photography with natural skin tones',
    aiPrompt:
      'Professional beauty retouching with natural skin texture, subtle color enhancement, and clean contrast. Preserve details in hair, skin, and clothing while reducing minor blemishes.',
    blendingParams: {
      opacity: 0.7,
      skinSmoothing: 0.3,
      contrastBoost: 1.1,
      saturation: 1.05,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1609505848912-b7c3b8b4beda?q=80&w=600',
    sortOrder: 1,
    category: 'portrait',
  },
  {
    id: uuidv7(),
    name: 'Soft Editorial',
    description: 'Gentle color grading for editorial and portrait work',
    aiPrompt:
      'Soft editorial style with warm tones, gentle highlights, and preserved midtones. Maintain natural skin texture while adding warmth.',
    blendingParams: {
      opacity: 0.65,
      warmth: 0.15,
      contrastBoost: 1.05,
      highlightRecovery: 0.2,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600',
    sortOrder: 2,
    category: 'portrait',
  },
  {
    id: uuidv7(),
    name: 'Warm Portrait',
    description: 'Warm tones ideal for family and environmental portraits',
    aiPrompt:
      'Warm portrait style with enhanced skin tones, soft golden highlights, and rich shadows. Maintain natural appearance while adding warmth.',
    blendingParams: {
      opacity: 0.75,
      warmth: 0.25,
      contrastBoost: 1.1,
      midtoneLift: 0.1,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600',
    sortOrder: 3,
    category: 'portrait',
  },
  {
    id: uuidv7(),
    name: 'High Key Bright',
    description:
      'Airy, bright look with minimal shadows for ethereal portraits',
    aiPrompt:
      'High key portrait style with lifted shadows, bright exposure, and clean whites. Create a light-hearted, ethereal mood.',
    blendingParams: {
      opacity: 0.8,
      shadowLift: 0.3,
      exposureBoost: 0.15,
      clarity: 1.1,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=600',
    sortOrder: 4,
    category: 'portrait',
  },

  // === FILM EMULATION STYLES (4 presets) ===
  {
    id: uuidv7(),
    name: 'Kodak Portra 400',
    description:
      'Classic film look with warm, natural skin tones and fine grain',
    aiPrompt:
      'Emulate Kodak Portra 400 film aesthetic with warm natural color palette, fine grain structure, and lifelike skin tones. Preserve dynamic range and subtle contrast.',
    blendingParams: {
      opacity: 0.7,
      filmGrain: 0.25,
      blackLift: 0.08,
      warmth: 0.2,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600',
    sortOrder: 5,
    category: 'film',
  },
  {
    id: uuidv7(),
    name: 'Fuji Pro 400H',
    description: 'Vibrant colors with high contrast and punchy saturation',
    aiPrompt:
      'Emulate Fuji Pro 400H film with vibrant color palette, high contrast, and rich saturation. Add punch and energy to images.',
    blendingParams: {
      opacity: 0.75,
      saturation: 1.25,
      contrastBoost: 1.15,
      colorPop: 0.2,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1581403341630-a6e0b9d2d257?q=80&w=600',
    sortOrder: 6,
    category: 'film',
  },
  {
    id: uuidv7(),
    name: 'Cinematic Teal & Orange',
    description: 'Classic movie look with cool shadows and warm highlights',
    aiPrompt:
      'Cinematic teal and orange color grade. Push cool teal tones into shadows and warm orange hues into highlights. Creates striking visual depth and separates subject from background.',
    blendingParams: {
      opacity: 0.85,
      shadowTeal: 0.3,
      highlightOrange: 0.25,
      contrastBoost: 1.2,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=600',
    sortOrder: 7,
    category: 'cinematic',
  },
  {
    id: uuidv7(),
    name: 'Kodak Gold 200',
    description: 'Warm golden tones with soft contrast for nostalgic look',
    aiPrompt:
      'Emulate Kodak Gold 200 film with warm golden color palette, soft contrast, and nostalgic feel. Perfect for outdoor portraits and lifestyle photography.',
    blendingParams: {
      opacity: 0.7,
      warmth: 0.3,
      saturation: 1.1,
      contrastBoost: 1.05,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=600',
    sortOrder: 8,
    category: 'film',
  },
  {
    id: uuidv7(),
    name: 'Vintage 90s Color',
    description: '1990s color grading with nostalgic muted tones',
    aiPrompt:
      'Apply 1990s-style color grading with muted tones, slight desaturation, and nostalgic color palette. Mimics early digital and film look.',
    blendingParams: {
      opacity: 0.8,
      desaturation: 0.15,
      warmth: 0.1,
      matte: 0.2,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1518676590629-3fbd9d3d093?q=80&w=600',
    sortOrder: 9,
    category: 'vintage',
  },

  // === MOODY & DRAMATIC STYLES (3 presets) ===
  {
    id: uuidv7(),
    name: 'Cinematic Moody',
    description: 'Dramatic tones with deep shadows and rich colors',
    aiPrompt:
      'Cinematic moody style with deep shadows, rich colors, and dramatic contrast. Preserve details while adding film-like quality.',
    blendingParams: {
      opacity: 0.8,
      contrastBoost: 1.2,
      shadowDepth: 0.3,
      colorPop: 0.15,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1557053910-d9eadeed1c58?q=80&w=600',
    sortOrder: 10,
    category: 'cinematic',
  },
  {
    id: uuidv7(),
    name: 'Low Key Moody',
    description: 'Dark shadows, rich colors, mysterious atmosphere',
    aiPrompt:
      'Low key portrait style with deep shadows, rich colors, and mysterious atmosphere. Drop highlights and enhance moodiness.',
    blendingParams: {
      opacity: 0.85,
      shadowDarken: 0.35,
      contrastBoost: 1.25,
      saturation: 0.9,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600',
    sortOrder: 11,
    category: 'moody',
  },
  {
    id: uuidv7(),
    name: 'Dramatic B&W',
    description: 'High-contrast black and white with rich tonal range',
    aiPrompt:
      'High-contrast dramatic black and white with rich tonal range, deep blacks, and bright whites. Preserve texture and detail.',
    blendingParams: {
      opacity: 0.85,
      contrastBoost: 1.3,
      blackPoint: 0.1,
      whitePoint: 0.9,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600',
    sortOrder: 12,
    category: 'b&w',
  },

  // === MODERN & CREATIVE STYLES (5 presets) ===
  {
    id: uuidv7(),
    name: 'Matte Desaturated',
    description: 'Soft, muted look with faded shadows',
    aiPrompt:
      'Matte style with soft, muted, and almost dreamlike appearance. Reduce contrast, desaturate colors, and add subtle haze.',
    blendingParams: {
      opacity: 0.75,
      matte: 0.25,
      desaturation: 0.2,
      haze: 0.15,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=600',
    sortOrder: 13,
    category: 'creative',
  },
  {
    id: uuidv7(),
    name: 'Vibrant Pop',
    description: 'High saturation, punchy colors for social media',
    aiPrompt:
      'Vibrant pop style with high saturation and punchy colors. Enhance vibrance for social media and web display.',
    blendingParams: {
      opacity: 0.8,
      saturation: 1.35,
      vibrance: 1.3,
      colorPop: 0.25,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600',
    sortOrder: 14,
    category: 'creative',
  },
  {
    id: uuidv7(),
    name: 'Split Tone Color',
    description:
      'Different colors in shadows and highlights for creative effect',
    aiPrompt:
      'Split tone color grade with different colors in shadows and highlights. Create creative dual-tone effect.',
    blendingParams: {
      opacity: 0.7,
      shadowColor: 'teal',
      highlightColor: 'gold',
      splitBalance: 0.5,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=600',
    sortOrder: 15,
    category: 'creative',
  },
  {
    id: uuidv7(),
    name: 'Cross Process',
    description: 'Ektachrome style cross-processed color shifts',
    aiPrompt:
      'Ektachrome cross-process style with unusual color shifts and distinctive look. Emulate cross-processed film aesthetic.',
    blendingParams: {
      opacity: 0.8,
      colorShift: 0.3,
      saturation: 1.15,
      contrastBoost: 1.1,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=600',
    sortOrder: 16,
    category: 'vintage',
  },
  {
    id: uuidv7(),
    name: 'HDR Enhanced',
    description: 'Wide dynamic range with vivid details',
    aiPrompt:
      'HDR enhanced style with wide dynamic range and vivid details. Enhance shadow details and highlight recovery.',
    blendingParams: {
      opacity: 0.75,
      shadowRecovery: 0.3,
      highlightRecovery: 0.25,
      clarity: 1.4,
      contrastBoost: 1.15,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600',
    sortOrder: 17,
    category: 'creative',
  },

  // === AI-ENHANCED STYLES (3 presets) ===
  {
    id: uuidv7(),
    name: 'AI Portrait Retouch',
    description: 'Smart skin smoothing and eye enhancement',
    aiPrompt:
      'AI-enhanced portrait retouching with smart skin smoothing, eye brightening, teeth whitening, and natural beauty enhancement.',
    blendingParams: {
      opacity: 0.65,
      skinSmoothing: 0.4,
      eyeEnhance: 0.3,
      teethWhiten: 0.2,
      skinPreserve: 0.7,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600',
    sortOrder: 18,
    category: 'ai',
  },
  {
    id: uuidv7(),
    name: 'AI Color Balance',
    description: 'Automatic white balance and color correction',
    aiPrompt:
      'AI-powered automatic white balance and color correction. Fix color casts, normalize skin tones, and ensure accurate colors.',
    blendingParams: {
      opacity: 0.8,
      autoBalance: true,
      skinToneNormalize: 0.6,
      castRemoval: 0.4,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1609505848912-b7c3b8b4beda?q=80&w=600',
    sortOrder: 19,
    category: 'ai',
  },
  {
    id: uuidv7(),
    name: 'AI Detail Enhance',
    description: 'Clarity boost with enhanced local contrast',
    aiPrompt:
      'AI-enhanced detail improvement with clarity boost, enhanced local contrast, and sharpening. Bring out fine details without halos.',
    blendingParams: {
      opacity: 0.7,
      clarity: 1.5,
      structure: 1.2,
      sharpenAmount: 0.3,
      radius: 1.0,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600',
    sortOrder: 20,
    category: 'ai',
  },

  // === SPECIALIZED STYLES (4 presets) ===
  {
    id: uuidv7(),
    name: 'Food Photography',
    description: 'Enhanced appetizing colors for culinary shots',
    aiPrompt:
      'Food photography enhancement with appetizing colors, warm tones, and enhanced textures. Make food look delicious.',
    blendingParams: {
      opacity: 0.75,
      saturation: 1.2,
      warmth: 0.15,
      clarity: 1.1,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=600',
    sortOrder: 21,
    category: 'specialized',
  },
  {
    id: uuidv7(),
    name: 'Product Photography',
    description: 'Clean, commercial look for e-commerce',
    aiPrompt:
      'Product photography style with clean, commercial look. Neutral colors, high contrast, and professional appearance.',
    blendingParams: {
      opacity: 0.7,
      desaturation: 0.1,
      contrastBoost: 1.15,
      shadowClean: 0.2,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600',
    sortOrder: 22,
    category: 'specialized',
  },
  {
    id: uuidv7(),
    name: 'Landscape Vibrance',
    description: 'Enhanced natural colors for outdoor scenes',
    aiPrompt:
      'Landscape photography enhancement with natural colors, enhanced sky tones, and vibrant vegetation.',
    blendingParams: {
      opacity: 0.8,
      saturation: 1.15,
      skyEnhance: 0.25,
      vegBoost: 0.2,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=600',
    sortOrder: 23,
    category: 'specialized',
  },
  {
    id: uuidv7(),
    name: 'Street Photography',
    description: 'Urban grit with enhanced contrast and texture',
    aiPrompt:
      'Street photography style with urban grit, enhanced contrast, and texture. Emphasize city atmosphere.',
    blendingParams: {
      opacity: 0.85,
      contrastBoost: 1.25,
      texture: 0.3,
      clarity: 1.3,
    },
    exampleImageUrl:
      'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?q=80&w=600',
    sortOrder: 24,
    category: 'specialized',
  },
];

// Run seeding if called directly
if (import.meta.main) {
  seedPresets();
}
