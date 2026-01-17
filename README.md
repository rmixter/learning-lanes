# 🎓 Learning Lanes

A "Walled Garden" media and learning application for families. Parents can curate specific content (YouTube videos, web resources, static images) into horizontal "Lanes" (categories) for their children — providing a focused, distraction-free interface that prevents endless scrolling and algorithm-driven recommendations.

![Learning Lanes](https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&h=400&fit=crop)

## ✨ Features

- **Profile Management**: Multiple family member profiles with admin PIN protection
- **Curated Lanes**: Horizontal Netflix-style lanes organized by category (School, Music, Fun, Creativity)
- **Safe YouTube Player**: Custom player with hidden controls, no related videos, and time-based restrictions
- **Web Content**: Sandboxed iframe viewing for educational websites
- **Dark Theme**: Cinema-style dark mode that's easy on the eyes
- **Touch-Friendly**: Large touch targets (44px+) suitable for tablets

## 🛠 Tech Stack

- **Framework**: [Astro](https://astro.build/) v5+
- **Interactivity**: React (Islands Architecture)
- **Styling**: Tailwind CSS v4
- **Backend**: Firebase (Firestore & Auth)
- **State Management**: Nano Stores
- **Language**: TypeScript

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- A Firebase project (free tier works fine)

### 1. Clone & Install

```bash
cd learning-lanes
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use an existing one)
3. Enable **Firestore Database** (Start in test mode for development)
4. Go to Project Settings > Your Apps > Add Web App
5. Copy the configuration values

### 3. Environment Variables

Create a `.env` file in the project root:

```env
PUBLIC_FIREBASE_API_KEY=your-api-key-here
PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=your-project-id
PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123def456
```

> **Note**: These are prefixed with `PUBLIC_` because they're exposed to the client. This is safe for Firebase Web SDK — your Firestore security rules protect your data, not these keys.

### 4. Seed the Database

Populate Firestore with sample profiles and content:

```bash
npm run seed
```

This creates:
- 3 Profiles: **Fox** (admin, PIN: 1234), **Link** (child), **Hudson** (child)
- Sample lanes with YouTube videos and web links

### 5. Start Development

```bash
npm run dev
```

Visit [http://localhost:4321](http://localhost:4321)

## 📁 Project Structure

```
src/
├── components/          # React components (Islands)
│   ├── ContentModal.tsx # YouTube/Web content viewer
│   ├── Dashboard.tsx    # Main app view
│   ├── Lane.tsx         # Horizontal scrolling lane
│   ├── LaneCard.tsx     # Individual content card
│   └── ProfileSwitcher.tsx # Profile selection screen
├── layouts/
│   └── Layout.astro     # Base HTML layout
├── lib/
│   └── firebase.ts      # Firebase initialization
├── pages/
│   └── index.astro      # Dashboard page
├── stores/
│   ├── contentStore.ts  # Active content state
│   └── profileStore.ts  # Current profile state
├── styles/
│   └── global.css       # Tailwind imports + custom styles
└── types.ts             # TypeScript interfaces
```

## 🔒 Firestore Security Rules

For production, update your Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Profiles: Anyone can read, only authenticated can write
    match /profiles/{profileId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Lanes: Anyone can read, only authenticated can write
    match /lanes/{laneId} {
      allow read: if true;
      allow write: if request.auth != null;
      
      // Items sub-collection
      match /items/{itemId} {
        allow read: if true;
        allow write: if request.auth != null;
      }
    }
  }
}
```

## 🎨 Customization

### Adding New Categories

Edit the `LaneCategory` type in `src/types.ts`:

```typescript
export type LaneCategory = 'School' | 'Music' | 'Fun' | 'Creativity' | 'YourNewCategory';
```

Then add colors/icons in `src/components/Lane.tsx`.

### Theming

The app uses Tailwind CSS with a dark theme. Key colors:
- Background: `bg-gray-900`
- Accent: `amber-500` / `orange-500`
- Text: `text-white` / `text-gray-400`

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run seed` | Seed Firestore with sample data |

## 🔮 Future Ideas

- [ ] Admin dashboard for content management
- [ ] Google Auth integration for parents
- [ ] Content progress tracking
- [ ] Screen time limits per profile
- [ ] Offline mode with service worker
- [ ] Custom profile avatars

## 📄 License

MIT © Your Family Name

---

Built with ❤️ for focused family learning
