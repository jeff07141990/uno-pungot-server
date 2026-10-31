# 🎮 UNO: The Pungot Edition (UNO Friends Online)

> A complete, responsive, real-time online multiplayer card game inspired by classic color-and-number matching card games with custom house rules, intelligent bot AI opponents, zero-dependency Web Audio sound effects, and authoritative server security.

---

## 🌟 Key Highlights

- **Genuine Real-Time Multiplayer**: Multiple players on different devices (phones, tablets, PCs) can join the same room and play in real time.
- **Authoritative Game Engine & Hand Confidentiality**: The game server authoritatively manages the deck, deals cards, validates moves, and **strictly hides opponents' cards** (clients never receive other players' hidden cards).
- **Custom House Rules**:
  - **Stacking**: Stack `+2` on `+2`, or `+4` on `+4` / `+2` to pass cumulative draw penalties to the next player.
  - **Seven-Zero Rule**: Playing a `7` lets you swap your hand with any player; playing a `0` rotates all players' hands in the direction of play.
  - **Wild Draw Four Challenge**: Call out bluffing players with an authoritative challenge.
  - **Turn Timer**: Configurable to Off, 15s, 30s, or 60s with auto-draw timeout protection.
  - **Starting Hand Size**: Customizable from 3 to 10 cards.
- **Intelligent Bot Opponents**: Instant solo play or filling empty lobby seats with server-validated AI players.
- **In-Game Chat & Quick Emoji Reactions**: Floating animated emoji bubbles and live room chat with player muting.
- **Original Branding & Artwork**: High-contrast, colorblind-friendly cards, neon indicators, dynamic fan animations, and felt table aesthetics.
- **Web Audio API Synthesizer**: Custom synthesized sound effects (card deals, flips, plays, UNO trumpets, timer ticks, victory fanfares) with mute and master volume control.
- **PWA Ready**: Installable as a standalone app on iOS Safari, Android Chrome, and Desktop Chrome/Edge.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas-Confetti |
| **Backend** | Node.js, Express, WebSocket (`ws`), TypeScript, `tsx` |
| **Persistence & Auth** | Firebase Authentication (Anonymous Guest sessions & Account upgrade), Cloud Firestore |
| **Audio** | HTML5 Web Audio API (Zero external audio file dependencies) |
| **Testing** | Vitest (18 automated tests covering engine, rules, AI, and multi-client socket communication) |

---

## 📂 Project Structure

```
UNO/
├── public/
│   ├── card-icon.svg          # Original vector logo and app icon
│   └── manifest.json          # PWA Web App Manifest
├── src/
│   ├── audio/
│   │   └── soundManager.ts    # Web Audio API sound synthesizer
│   ├── components/
│   │   ├── Modals/            # ColorPicker, WD4Challenge, SevenSwap, GameOver,
│   │   │                      # HowToPlay, Settings, Profile, History, Create/Join
│   │   ├── CardView.tsx       # Custom SVG/CSS responsive Uno card renderer
│   │   ├── ChatBox.tsx        # In-game chat drawer with spam & mute protection
│   │   ├── EmojiReactions.tsx # Quick reaction bar and floating emoji bubbles
│   │   ├── GameTable.tsx      # Main game table arena, radial opponents & fan HUD
│   │   ├── HomeScreen.tsx     # Landing screen with all 8 main feature buttons
│   │   └── LobbyView.tsx      # Room lobby with invite link, bot slots & controls
│   ├── engine/
│   │   ├── types.ts           # Shared TypeScript types for cards, rules, actions
│   │   ├── deck.ts            # 108-card deck generator, shuffle & reshuffle
│   │   ├── rules.ts           # Authoritative play validation, turn order & scoring
│   │   └── botAi.ts           # Heuristic AI bot decision engine
│   ├── firebase/
│   │   └── config.ts          # Firebase Auth & Firestore client with fallback
│   ├── services/
│   │   ├── networkManager.ts  # Client WebSocket manager with auto-reconnect
│   │   └── historyService.ts  # Persistent match statistics & history
│   ├── App.tsx                # Main view router & state orchestrator
│   ├── index.css              # Tailwind and keyframe animation rules
│   └── main.tsx               # React application entry point
├── server/
│   ├── roomManager.ts         # Authoritative room & match state controller
│   └── server.ts              # Express HTTP & WebSocket server
├── tests/
│   ├── engine.test.ts         # 17 Unit tests for deck, rules, bots & penalties
│   └── multiplayer.test.ts    # Multi-client live WebSocket integration test
├── firestore.rules            # Security rules for production Firestore
├── .env.example               # Environment variables template
├── package.json               # NPM scripts and dependencies
├── tailwind.config.js         # Custom Uno palette and animation tokens
├── tsconfig.json              # TypeScript compilation settings
└── vite.config.ts             # Vite dev server and host exposure
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Both Server and Client Simultaneously
```bash
npm run dev:all
```
- Client runs on `http://localhost:5173`
- Authoritative Server runs on `http://localhost:3001`

*(Alternatively, run `npm run server` in one terminal and `npm run dev` in another).*

---

## 📱 Testing with Multiple Devices (Phone + PC / LAN)

1. Find your computer's local IP address:
   - On Windows: Run `ipconfig` (e.g. `192.168.1.100`).
2. Both your PC and mobile device must be connected to the same Wi-Fi network.
3. Open `http://<YOUR_IP>:5173` on your PC and mobile browser (e.g. `http://192.168.1.100:5173`).
4. On PC: Click **CREATE ROOM** -> set room name -> click **Create & Open Lobby**.
5. Click **Copy Invite Link** or share the 6-character room code.
6. On Mobile: Open the link or click **JOIN ROOM** and enter the code.
7. Both players appear in the lobby instantly. Host clicks **START GAME**!

---

## 🧪 Running the Automated Test Suite

Run the Vitest test suite covering card mechanics, stacking, WD4 challenges, UNO penalties, bot AI, and real multi-client WebSocket communication:

```bash
npm test
```

---

## 🔥 Firebase Setup & Cloud Configuration

The application includes full support for Firebase Authentication and Cloud Firestore.

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Enable **Authentication** -> Turn on **Anonymous** sign-in (and optionally Email/Password).
3. Enable **Cloud Firestore** in production mode.

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-app
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# Server port and public URL
PORT=3001
VITE_SERVER_PORT=3001
VITE_SERVER_URL=
```

### 3. Deploy Security Rules
Deploy `firestore.rules` using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 🌐 Production Deployment

### Option A: Full-Stack on Render / Railway / Fly.io
Deploy the repository as a Node web service:
- Build command: `npm run build`
- Start command: `node dist-server/server.js` or `npm run server`
- Serve the static Vite `dist/` directory from the Express server.

### Option B: Frontend on Vercel / Firebase Hosting + Backend on Render / Fly.io
1. Deploy the backend (`server/`) to a free Web Service (e.g., Render, Railway).
2. Set `VITE_SERVER_URL=https://your-backend.onrender.com` in your Vercel/Firebase environment.
3. Deploy the frontend with `npm run build`.

---

## 📲 PWA Installation Instructions

- **Android Chrome**: Open the site, tap the three dots menu `⋮` -> tap **Install App** or **Add to Home screen**.
- **iOS Safari**: Open the site, tap the Share button `⎋` -> scroll down and tap **Add to Home Screen**.
- **Desktop Chrome / Edge**: Click the Install icon in the browser address bar.

---

## 📋 Multi-Device Testing Checklist

- [x] Host creates room and customizes house rules (Timer, Stacking, 7-0).
- [x] Player 2 joins via 6-character code or direct invite link.
- [x] Host adds AI bots to fill empty seats.
- [x] Cards dealt with card counts matching hand size.
- [x] Opponents' cards remain hidden (only card counts are displayed).
- [x] Player A plays card -> Player B immediately sees discard change, active ring change, and audio snap.
- [x] Draw Two stacking increases penalty (`+2`, `+4`, `+6`).
- [x] Wild card displays 4-color modal and changes active color for next player.
- [x] WD4 challenge allows victim to challenge bluff; dishonest player draws 4, failed challenge draws 6.
- [x] Player with 1 card clicks UNO! button; missed UNO allows opponent to click "CATCH UNO!".
- [x] Victory modal triggers confetti, computes round scores, and offers "Play Again".
- [x] Chat and emoji reactions float over table in real time.
