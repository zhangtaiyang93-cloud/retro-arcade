export interface PrizeItem {
  id: string;
  name: string;
  cost: number;
  icon: string;
  category: string;
  description: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Legendary';
  rarityColor: string;
}

export const PRIZES: PrizeItem[] = [
  {
    id: 'prize-sticker',
    name: 'Retro Pixel Sticker Pack',
    cost: 10,
    icon: '👾',
    category: 'Swag',
    description: 'Holographic pixel stickers to decorate your laptop and cabinet.',
    rarity: 'Common',
    rarityColor: '#00f0ff'
  },
  {
    id: 'prize-keychain',
    name: 'Neon Glowstick Keychain',
    cost: 25,
    icon: '🔑',
    category: 'Accessories',
    description: 'A glowing acrylic keychain shaped like an 8-bit arcade joystick.',
    rarity: 'Common',
    rarityColor: '#39ff14'
  },
  {
    id: 'prize-plush',
    name: 'Plush Space Alien Mascot',
    cost: 50,
    icon: '🛸',
    category: 'Plushies',
    description: 'Ultra-soft alien plushie with squishy tentacles and stitched eyes.',
    rarity: 'Uncommon',
    rarityColor: '#bc13fe'
  },
  {
    id: 'prize-shades',
    name: '80s Synthwave Neon Shades',
    cost: 100,
    icon: '🕶️',
    category: 'Wearables',
    description: 'Fluorescent shutter shades that glow brilliantly under blacklight.',
    rarity: 'Rare',
    rarityColor: '#ff007f'
  },
  {
    id: 'prize-handheld',
    name: 'Mini Retro Handheld Console',
    cost: 250,
    icon: '🕹️',
    category: 'Tech',
    description: 'Pocket-sized emulator console packed with 100+ 8-bit nostalgia games.',
    rarity: 'Rare',
    rarityColor: '#ffe600'
  },
  {
    id: 'prize-trophy',
    name: 'Golden Arcade Master Trophy',
    cost: 500,
    icon: '🏆',
    category: 'Grand Prize',
    description: 'The crowning glory! Engraved 24K gold-plated arcade championship trophy.',
    rarity: 'Legendary',
    rarityColor: '#ffd700'
  }
];

export const SHELF_STORAGE_KEY = 'retro_arcade_won_prizes';
