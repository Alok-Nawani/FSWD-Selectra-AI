# Team Member 3 - Voice-Enabled Interview System

## 📋 Assigned Modules

### 1. **Voice Interview** 🎙️
- Real-time speech recognition
- AI-powered interview simulation
- Voice response processing
- Interview feedback generation
- Recording and playback

### 2. **Interview Questions** ❓
- Company-specific questions
- Interview history tracking
- Question categories
- Difficulty levels
- Performance analytics

### 3. **Home Page** 🏠
- Landing page showcasing interview features
- Feature highlights
- Call-to-action buttons
- Navigation to app

---

## 📁 Project Structure

```
Team_Member_3/
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
│       └── interview.js       # Interview module (YOUR FOCUS)
└── data/
    └── interviews/
        ├── amazon/           # Interview questions by company
        ├── google/
        ├── microsoft/
        ├── infosys/
        └── tcs/
```

---

## 🔧 Key Files to Work On

### Interview Module (`js/modules/interview.js`)
- Speech recognition integration (Deepgram)
- Text-to-speech for questions
- Interview flow control
- Answer validation
- Feedback generation
- Performance tracking

---

## 🎯 Interview Flow

1. **Start Interview**: Select company, choose interview type
2. **Voice Interaction**: AI asks question, user speaks answer
3. **Processing**: Deepgram converts speech to text
4. **Feedback**: AI evaluates and provides feedback
5. **Results**: Overall score and detailed feedback

---

## 🚀 Getting Started

1. **Setup Voice APIs**: Configure Deepgram API key in backend
2. **Load Interview Questions**: Parse from data/interviews/
3. **Voice Implementation**: WebSocket with Deepgram
4. **Testing**: Open index.html → Click "Start Interview"

---

## ✅ Deliverables (40% of Project)

- [ ] Voice recognition integration
- [ ] Interview question loading
- [ ] Real-time speech processing
- [ ] AI-powered feedback generation
- [ ] Interview scoring system
- [ ] Interview history tracking
- [ ] Performance analytics
- [ ] Home page with interview highlights

---

## 📞 Team Coordination

- **Member 1**: Login Authentication & Resume Analysis
- **Member 2**: Learning Hub, Videos & Quizzes

## Project Structure
```
Team_Member_3/
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
│       │   ├── ml.json
│       │   ├── aptitude.json
│       │   ├── grammar.json
│       │   └── webdev.json
│       └── quizzes/
│           ├── dsa.json
│           ├── dbms.json
│           ├── os.json
│           ├── cn.json
│           ├── oop.json
│           ├── ml.json
│           ├── aptitude.json
│           ├── grammar.json
│           ├── webdev.json
│           └── ai.json
└── README.md                 # This file

## Getting Started
1. Copy this folder to your workspace
2. Open `index.html` in browser for home page
3. Open `app.html` after login for the application
4. Configure API keys in `js/config.js`

## Key Files
- **app.html** - Main app interface with sidebar navigation
- **login.html** - Simple login form
- **js/modules/learning.js** - Learning hub implementation
- **data/learning/** - Complete learning content (notes & quizzes)

## Sharing with Backend
- Share the `backend/` folder from main project for API endpoints
- Ensure `.env` file has required API keys (GEMINI_API_KEYS, etc.)

## Next Steps
- Coordinate with Team Member 1 & 2 for shared components
- Keep module interfaces clean for future integration
- Test all auth and learning flows before deployment

---
**Assigned to:** Team Member 3  
**Last Updated:** March 2026
