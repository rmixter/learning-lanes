/**
 * Seed Script - Populate Firestore with dummy data
 * 
 * Run with: npx tsx scripts/seed-data.ts
 * 
 * Before running:
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Enable Firestore Database
 * 3. Create a .env file with your Firebase config (see .env.example)
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, writeBatch } from 'firebase/firestore';

// Load environment variables (for Node.js)
import { config } from 'dotenv';
config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abc123',
};

// Check if we have a real project ID
if (firebaseConfig.projectId === 'demo-project') {
  console.log('⚠️  Warning: Using demo Firebase config. Set up your .env file for a real database.');
  console.log('   See .env.example for required variables.\n');
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Profile data
const profiles = [
  {
    id: 'profile-ryan',
    displayName: 'Ryan',
    avatarUrl: '',
    role: 'admin' as const,
    pin: '1234', // Simple PIN for demo
    ageLevel: 'adult' as const,
  },
  {
    id: 'profile-link',
    displayName: 'Link',
    avatarUrl: '',
    role: 'child' as const,
    pin: null,
    ageLevel: 'elementary' as const, // 6-12 years
  },
  {
    id: 'profile-fox',
    displayName: 'Fox',
    avatarUrl: '',
    role: 'child' as const,
    pin: null,
    ageLevel: 'preschool' as const, // 3-5 years
  },
];

// Lane data for Link
// Using verified working YouTube video IDs
const lanesForLink = [
  {
    id: 'lane-music',
    profileId: 'profile-link',
    title: 'Music Time',
    category: 'Music' as const,
    isActive: true,
    sortOrder: 1,
    items: [
      {
        id: 'item-music-1',
        title: 'Baby Shark Dance',
        thumbnailUrl: 'https://img.youtube.com/vi/XqZsoesa55w/hqdefault.jpg',
        type: 'youtube_video' as const,
        data: {
          videoId: 'XqZsoesa55w', // Baby Shark - Pinkfong
          startTime: 0,
          loop: true,
        },
      },
      {
        id: 'item-music-2',
        title: 'Wheels on the Bus',
        thumbnailUrl: 'https://img.youtube.com/vi/e_04ZrNroTo/hqdefault.jpg',
        type: 'youtube_video' as const,
        data: {
          videoId: 'e_04ZrNroTo', // Wheels on the Bus - Cocomelon
          startTime: 0,
          loop: false,
        },
      },
      {
        id: 'item-music-3',
        title: 'ABC Song',
        thumbnailUrl: 'https://img.youtube.com/vi/hq3yfQnllfQ/hqdefault.jpg',
        type: 'youtube_video' as const,
        data: {
          videoId: 'hq3yfQnllfQ', // ABC Song - Super Simple Songs
          startTime: 0,
          loop: false,
        },
      },
    ],
  },
  {
    id: 'lane-science',
    profileId: 'profile-link',
    title: 'Science Explorers',
    category: 'School' as const,
    isActive: true,
    sortOrder: 2,
    items: [
      {
        id: 'item-science-1',
        title: 'Planets Song for Kids',
        thumbnailUrl: 'https://img.youtube.com/vi/mQrlgH97v94/hqdefault.jpg',
        type: 'youtube_video' as const,
        data: {
          videoId: 'mQrlgH97v94', // Planet Song - Kids Learning Tube
          startTime: 0,
          loop: false,
        },
      },
      {
        id: 'item-science-2',
        title: 'How Do Volcanoes Erupt?',
        thumbnailUrl: 'https://img.youtube.com/vi/lAmqsMQG3RM/hqdefault.jpg',
        type: 'youtube_video' as const,
        data: {
          videoId: 'lAmqsMQG3RM', // National Geographic Kids - Volcanoes
          startTime: 0,
          loop: false,
        },
      },
      {
        id: 'item-science-3',
        title: 'NASA Kids Club',
        thumbnailUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400&h=225&fit=crop',
        type: 'web_link' as const,
        data: {
          url: 'https://www.nasa.gov/learning-resources/for-kids-and-students/',
          allowNavigation: true,
        },
      },
    ],
  },
];

// Additional lane for Fox
const lanesForFox = [
  {
    id: 'lane-art',
    profileId: 'profile-fox',
    title: 'Drawing Fun',
    category: 'Creativity' as const,
    isActive: true,
    sortOrder: 1,
    items: [
      {
        id: 'item-art-1',
        title: 'How to Draw a Cute Dog',
        thumbnailUrl: 'https://img.youtube.com/vi/3lFeROXsFxE/hqdefault.jpg',
        type: 'youtube_video' as const,
        data: {
          videoId: '3lFeROXsFxE', // Art for Kids Hub - How to Draw
          startTime: 0,
          loop: false,
        },
      },
      {
        id: 'item-art-2',
        title: 'How to Draw a Rainbow',
        thumbnailUrl: 'https://img.youtube.com/vi/gH5dlB9M0eo/hqdefault.jpg',
        type: 'youtube_video' as const,
        data: {
          videoId: 'gH5dlB9M0eo', // Art for Kids Hub
          startTime: 0,
          loop: false,
        },
      },
    ],
  },
  {
    id: 'lane-fun',
    profileId: 'profile-fox',
    title: 'Fun Time',
    category: 'Fun' as const,
    isActive: true,
    sortOrder: 2,
    items: [
      {
        id: 'item-fun-1',
        title: 'Numberblocks - Learn to Count',
        thumbnailUrl: 'https://img.youtube.com/vi/Aq4UAss33qA/hqdefault.jpg',
        type: 'youtube_video' as const,
        data: {
          videoId: 'Aq4UAss33qA', // Numberblocks
          startTime: 0,
          loop: false,
        },
      },
      {
        id: 'item-fun-2',
        title: 'PBS Kids Games',
        thumbnailUrl: 'https://images.unsplash.com/photo-1493711662062-fa541f7f70cd?w=400&h=225&fit=crop',
        type: 'web_link' as const,
        data: {
          url: 'https://pbskids.org/games/',
          allowNavigation: true,
          canEmbed: false, // PBS Kids blocks iframe embedding
        },
      },
    ],
  },
];

async function seedDatabase() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Seed profiles
    console.log('👤 Creating profiles...');
    for (const profile of profiles) {
      await setDoc(doc(db, 'profiles', profile.id), profile);
      console.log(`   ✓ Created profile: ${profile.displayName}`);
    }

    // Seed lanes and items for Link
    console.log('\n📚 Creating lanes for Link...');
    for (const lane of lanesForLink) {
      const { items, ...laneData } = lane;
      await setDoc(doc(db, 'lanes', lane.id), laneData);
      console.log(`   ✓ Created lane: ${lane.title}`);

      // Add items to lane
      const batch = writeBatch(db);
      for (const item of items) {
        const itemRef = doc(db, 'lanes', lane.id, 'items', item.id);
        batch.set(itemRef, item);
      }
      await batch.commit();
      console.log(`     └─ Added ${items.length} items`);
    }

    // Seed lanes and items for Fox
    console.log('\n📚 Creating lanes for Fox...');
    for (const lane of lanesForFox) {
      const { items, ...laneData } = lane;
      await setDoc(doc(db, 'lanes', lane.id), laneData);
      console.log(`   ✓ Created lane: ${lane.title}`);

      // Add items to lane
      const batch = writeBatch(db);
      for (const item of items) {
        const itemRef = doc(db, 'lanes', lane.id, 'items', item.id);
        batch.set(itemRef, item);
      }
      await batch.commit();
      console.log(`     └─ Added ${items.length} items`);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📝 Admin PIN for Ryan: 1234');
    console.log('\n🚀 Start the app with: npm run dev');
    
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedDatabase();
