import { db, systemStyles } from '@/db';
import { v7 as uuidv7 } from 'uuid';

const presets = [
  {
    id: uuidv7(),
    name: 'Clean Commercial Beauty',
    description: 'Perfect for beauty and fashion photography with natural skin tones',
    aiPrompt: 'Professional beauty retouching with natural skin texture, subtle color enhancement, and clean contrast. Preserve details in hair, skin, and clothing while reducing minor blemishes.',
    blendingParams: {
      opacity: 0.7,
      skinSmoothing: 0.3,
      contrastBoost: 1.1,
      saturation: 1.05,
    },
    exampleImageUrl: 'https://picsum.photos/seed/cleanbeauty/400/600.jpg',
    sortOrder: 1,
  },
  {
    id: uuidv7(),
    name: 'Soft Editorial',
    description: 'Gentle color grading for editorial and portrait work',
    aiPrompt: 'Soft editorial style with warm tones, gentle highlights, and preserved midtones. Maintain natural skin texture while adding warmth.',
    blendingParams: {
      opacity: 0.65,
      warmth: 0.15,
      contrastBoost: 1.05,
      highlightRecovery: 0.2,
    },
    exampleImageUrl: 'https://picsum.photos/seed/softeditorial/400/600.jpg',
    sortOrder: 2,
  },
  {
    id: uuidv7(),
    name: 'Warm Portrait',
    description: 'Warm tones ideal for family and environmental portraits',
    aiPrompt: 'Warm portrait style with enhanced skin tones, soft golden highlights, and rich shadows. Maintain natural appearance while adding warmth.',
    blendingParams: {
      opacity: 0.75,
      warmth: 0.25,
      contrastBoost: 1.1,
      midtoneLift: 0.1,
    },
    exampleImageUrl: 'https://picsum.photos/seed/warmportrait/400/600.jpg',
    sortOrder: 3,
  },
  {
    id: uuidv7(),
    name: 'Cinematic Moody',
    description: 'Dramatic tones with deep shadows and rich colors',
    aiPrompt: 'Cinematic moody style with deep shadows, rich colors, and dramatic contrast. Preserve details while adding film-like quality.',
    blendingParams: {
      opacity: 0.8,
      contrastBoost: 1.2,
      shadowDepth: 0.3,
      colorPop: 0.15,
    },
    exampleImageUrl: 'https://picsum.photos/seed/cinematicmoody/400/600.jpg',
    sortOrder: 4,
  },
  {
    id: uuidv7(),
    name: 'Dramatic B&W',
    description: 'High-contrast black and white with rich tonal range',
    aiPrompt: 'High-contrast dramatic black and white with rich tonal range, deep blacks, and bright whites. Preserve texture and detail.',
    blendingParams: {
      opacity: 0.85,
      contrastBoost: 1.3,
      blackPoint: 0.1,
      whitePoint: 0.9,
    },
    exampleImageUrl: 'https://picsum.photos/seed/dramaticbw/400/600.jpg',
    sortOrder: 5,
  },
];

export async function seedPresets() {
  console.log('Seeding presets...');
  
  try {
    // Check if presets already exist
    const existingPresets = await db.select().from(systemStyles);
    
    if (existingPresets.length > 0) {
      console.log('Presets already exist, skipping seeding');
      return;
    }
    
    // Insert presets
    await db.insert(systemStyles).values(presets);
    
    console.log(`Seeded ${presets.length} presets successfully`);
  } catch (error) {
    console.error('Error seeding presets:', error);
  }
}

// Run seeding if called directly
if (import.meta.main) {
  seedPresets();
}
