# RaidBook - Kabaddi Match Tracker

The ultimate Kabaddi scoring and tournament management app.

## Features

- **Live Scoring**: Real-time match scoring with touch, tackle, and bonus points
- **Tournament Management**: Create and manage knockout/league tournaments
- **Player Stats**: Track individual player performance across matches
- **Team Management**: Create teams, add players, and manage rosters
- **Social Feed**: Share match highlights and connect with other players

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Mobile**: Capacitor for Android/iOS builds

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Harsha76766/kabaddi-score-buddy.git

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

## Building for Production

```bash
npm run build
```

## Mobile Build (Android)

```bash
npx cap sync android
npx cap open android
```

## License

MIT License - See LICENSE file for details.

## Author

Built by Harsha76766
