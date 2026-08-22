/**
 * GlobeTrotter Frontend Database & Configurations
 */

// ==================== MOCK DATABASE ====================
const CITIES_DB = [
  { id: 'paris', name: 'Paris', country: 'France', region: 'Europe', costIndex: '$$$', popularity: 'Very High', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80', description: 'City of light, fashion, and culinary excellence.' },
  { id: 'london', name: 'London', country: 'United Kingdom', region: 'Europe', costIndex: '$$$', popularity: 'Very High', img: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=400&q=80', description: 'Historic capital with modern culture and deep landmarks.' },
  { id: 'rome', name: 'Rome', country: 'Italy', region: 'Europe', costIndex: '$$', popularity: 'High', img: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=400&q=80', description: 'Cradle of ancient history, art, and incredible food.' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', region: 'Asia', costIndex: '$$$', popularity: 'Very High', img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80', description: 'Ultramodern neon skyscrapers mixed with historic shrines.' },
  { id: 'new-york', name: 'New York', country: 'United States', region: 'North America', costIndex: '$$$', popularity: 'Very High', img: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=400&q=80', description: 'The city that never sleeps, known for theater and landmarks.' },
  { id: 'bali', name: 'Bali', country: 'Indonesia', region: 'Asia', costIndex: '$', popularity: 'High', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=400&q=80', description: 'Tropical paradise featuring beaches, temples, and wellness.' }
];

const PRESETS_COVERS = [
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80'
];

const COMMUNITY_TRIPS = [
  {
    id: 'comm-1',
    name: 'Epic European Getaway',
    creator: 'backpacker_joe',
    stopsCount: 3,
    duration: 12,
    cost: 3200,
    img: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80',
    description: 'A complete trip covering Paris, London, and Rome. Includes museum tours, transport details, and budget meals.',
    stops: [
      { cityId: 'paris', arrival: '2026-08-10', departure: '2026-08-14', activities: [
        { name: 'Louvre Museum Tour', category: 'activities', cost: 45, date: '2026-08-11', time: '10:00' },
        { name: 'Eiffel Tower Dinner', category: 'meals', cost: 120, date: '2026-08-12', time: '19:00' }
      ]},
      { cityId: 'london', arrival: '2026-08-14', departure: '2026-08-18', activities: [
        { name: 'London Eye Ticket', category: 'activities', cost: 35, date: '2026-08-15', time: '14:00' }
      ]},
      { cityId: 'rome', arrival: '2026-08-18', departure: '2026-08-22', activities: [
        { name: 'Colosseum Exploration Tour', category: 'activities', cost: 50, date: '2026-08-19', time: '09:00' }
      ]}
    ]
  },
  {
    id: 'comm-2',
    name: 'Uncovering Wonders of Japan',
    creator: 'tokyo_drift',
    stopsCount: 1,
    duration: 7,
    cost: 1950,
    img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80',
    description: 'Explore the neon lights of Shinjuku and cultural temples in Tokyo.',
    stops: [
      { cityId: 'tokyo', arrival: '2026-09-01', departure: '2026-09-08', activities: [
        { name: 'Shibuya Crossing Photography Tour', category: 'activities', cost: 25, date: '2026-09-02', time: '16:00' },
        { name: 'Sushi Omakase Meal', category: 'meals', cost: 150, date: '2026-09-03', time: '19:00' }
      ]}
    ]
  }
];

const USERS_DB = [
  { id: 'u1', name: 'Jane Doe', email: 'jane.doe@example.com', role: 'User', status: 'Active', tripsCount: 3, joined: '2026-05-15', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' },
  { id: 'u2', name: 'Alex Smith', email: 'alex.smith@example.com', role: 'User', status: 'Active', tripsCount: 1, joined: '2026-06-20', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
  { id: 'u3', name: 'Sarah Connor', email: 'sarah.c@example.com', role: 'Moderator', status: 'Active', tripsCount: 5, joined: '2026-02-10', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' },
  { id: 'u4', name: 'Michael Scott', email: 'worldsbestboss@example.com', role: 'User', status: 'Blocked', tripsCount: 0, joined: '2026-07-01', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80' }
];
