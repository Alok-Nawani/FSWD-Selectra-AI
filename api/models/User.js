const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  progress: {
    dsa: { type: Number, default: 0 },
    dbms: { type: Number, default: 0 },
    os: { type: Number, default: 0 }
  },
  streak: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  maxStreak: { type: Number, default: 0 },
  lastActivityDate: { type: String, default: null }, // "YYYY-MM-DD"
  dailyActivity: [{ type: String }], // Array of "YYYY-MM-DD" dates
  dailyChallengeCompletions: [{
    date: { type: String, required: true },
    challengeType: { type: String, enum: ['coding', 'interview'], required: true },
    challengeId: { type: Number },
    xpEarned: { type: Number, default: 0 }
  }],
  completedTopics: [{ type: String }],
  xp: { type: Number, default: 0 },
  notes: [{
    id: { type: Number, required: true },
    text: { type: String, required: true },
    date: { type: String, required: true }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
