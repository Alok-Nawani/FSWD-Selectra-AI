# Team Member 2 - Learning Hub, Videos & Quizzes

## 📋 Assigned Modules

### 1. **Learning Hub** 📚
- Structured learning paths
- Subject categorization (DSA, DBMS, OS, etc.)
- Notes and resources
- Progress tracking
- Topic organization

### 2. **Video Tutorials** 🎥
- Video player integration
- Playlist functionality
- Video progress tracking
- Resource links
- Quality selection

### 3. **Quizzes** 📝
- Interactive quiz system
- Question bank management
- Score tracking
- Answer explanations
- Adaptive difficulty levels

### 4. **Home Page** 🏠
- Landing page showcasing learning features
- Feature highlights
- Call-to-action buttons
- Navigation to app

---

## 📁 Project Structure

```
Team_Member_2/
├── index.html                 # Home/Landing page
├── login.html                 # Login page (shared)
├── app.html                   # Main application dashboard
├── css/
│   ├── style.css             # Main styling
│   ├── landing.css           # Home page styling
│   └── ai_avatar.css         # Avatar component styling
├── js/
│   ├── config.js             # Configuration & API endpoints
│   ├── main.js               # Main app logic
│   └── modules/
│       └── learning.js        # Learning hub module (YOUR FOCUS)
└── data/
    └── learning/
        ├── notes/            # Learning notes (JSON)
        ├── quizzes/          # Quiz questions (JSON)
```

---

## 🔧 Key Files to Work On

### Learning Hub (`js/modules/learning.js`)
- Load and display learning modules
- Category filtering
- Note rendering
- Quiz integration point
- Progress tracking
- Bookmark/favorites system

### Data Files (JSON Format)
- **Notes**: Topic structure, learning content, key concepts
- **Quizzes**: Questions, answers, explanations, difficulty levels

---

## 🚀 Getting Started

1. **Load Learning Hub**: Fetch topics from data/learning/notes/
2. **Quiz System**: Load questions and display one at a time
3. **Video Integration**: Create video player component
4. **Testing**: Open index.html → Click "Start Learning" → Navigate to Learning Hub

---

## ✅ Deliverables (40% of Project)

- [ ] Learning Hub UI with category filtering
- [ ] Notes display with proper formatting
- [ ] Interactive quiz system with scoring
- [ ] Video player integration
- [ ] Progress tracking system
- [ ] Quiz result analytics
- [ ] Responsive design across devices
- [ ] Home page with learning highlights

---

## 📞 Team Coordination

- **Member 1**: Login Authentication & Resume Analysis
- **Member 3**: Voice-enabled Interviews

## Project Structure
```
Team_Member_2/
├── index.html                 # Home/Landing page
├── app.html                   # Main application interface
├── login.html                 # Authentication page
├── css/
│   ├── style.css             # Main application styles
│   └── landing.css           # Home page styles
├── js/
│   ├── config.js             # Configuration & API endpoints
│   ├── utils.js              # Utility functions
│   ├── main.js               # Application bootstrap
│   └── modules/
│       ├── auth.js           # Authentication module
│       ├── resume.js         # Resume analyzer logic
│       ├── learning.js       # Learning hub logic
│       ├── navigation.js      # Navigation handler
│       └── dashboard.js       # Analytics dashboard (shared)
├── data/
│   └── learning/
│       ├── notes/
│       │   ├── dsa.json
│       │   ├── dbms.json
│       │   ├── os.json
│       │   ├── cn.json
│       │   ├── oop.json
│       │   ├── ai.json
│       │   ├── aptitude.json
│       │   └── grammar.json
│       └── quizzes/
│           ├── dsa.json
│           ├── dbms.json
│           ├── os.json
│           ├── cn.json
│           ├── oop.json
│           ├── ml.json
│           ├── aptitude.json
│           └── grammar.json
└── README.md                 # This file

## Getting Started
1. Copy this folder to your workspace
2. Open `index.html` in browser for home page
3. Open `app.html` after login for the application
4. Configure API keys in `js/config.js`

## Key Files
- **app.html** - Main app interface with sidebar navigation
- **login.html** - Simple login form
- **js/modules/resume.js** - Resume analyzer implementation
- **js/modules/learning.js** - Learning hub implementation
- **data/learning/** - Learning content (notes & quizzes)

## Sharing with Backend
- Share the `backend/` folder from main project for API endpoints
- Ensure `.env` file has required API keys (GEMINI_API_KEYS, HF_TOKEN, etc.)

## Next Steps
- Coordinate with Team Member 1 & 3 for shared components
- Keep module interfaces clean for future integration
- Test all auth and learning flows before deployment

---
**Assigned to:** Team Member 2  
**Last Updated:** March 2026
