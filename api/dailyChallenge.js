/**
 * Daily Challenge System
 * Deterministically picks a challenge for each day based on the date.
 * Alternates between coding problems and interview questions.
 */

const fs = require('fs');
const path = require('path');

// Load coding problems from JSON
let codingProblems = [];
try {
    const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'cp_questions.json'), 'utf-8');
    codingProblems = JSON.parse(raw);
} catch (e) {
    console.warn("Could not load cp_questions.json for daily challenges:", e.message);
}

// Curated interview questions pool (behavioral + technical)
const interviewQuestions = [
    {
        id: 1,
        type: "technical",
        question: "Explain the difference between a stack and a queue. Give a real-world example of each.",
        topic: "Data Structures",
        difficulty: "Easy",
        points: 30
    },
    {
        id: 2,
        type: "behavioral",
        question: "Describe a challenging project you worked on. What was your role and how did you overcome obstacles?",
        topic: "Behavioral",
        difficulty: "Medium",
        points: 40
    },
    {
        id: 3,
        type: "technical",
        question: "What is the time complexity of searching in a Binary Search Tree? What happens in the worst case?",
        topic: "Trees & BST",
        difficulty: "Medium",
        points: 35
    },
    {
        id: 4,
        type: "behavioral",
        question: "Tell me about a time you had a conflict with a teammate. How did you resolve it?",
        topic: "Behavioral",
        difficulty: "Medium",
        points: 40
    },
    {
        id: 5,
        type: "technical",
        question: "Explain how a hash map works internally. What are collisions and how are they handled?",
        topic: "Hashing",
        difficulty: "Medium",
        points: 35
    },
    {
        id: 6,
        type: "technical",
        question: "What is the difference between process and thread? When would you use multithreading?",
        topic: "Operating Systems",
        difficulty: "Medium",
        points: 40
    },
    {
        id: 7,
        type: "behavioral",
        question: "Give an example of a time you had to learn something new quickly. How did you approach it?",
        topic: "Behavioral",
        difficulty: "Easy",
        points: 30
    },
    {
        id: 8,
        type: "technical",
        question: "Explain the concept of normalization in databases. What are 1NF, 2NF, and 3NF?",
        topic: "DBMS",
        difficulty: "Medium",
        points: 40
    },
    {
        id: 9,
        type: "technical",
        question: "What is dynamic programming? Explain with the Fibonacci example, including memoization vs tabulation.",
        topic: "Dynamic Programming",
        difficulty: "Medium",
        points: 45
    },
    {
        id: 10,
        type: "behavioral",
        question: "Where do you see yourself in 5 years? How does this role align with your career goals?",
        topic: "Behavioral",
        difficulty: "Easy",
        points: 25
    },
    {
        id: 11,
        type: "technical",
        question: "Explain REST APIs. What are the main HTTP methods and when should each be used?",
        topic: "System Design",
        difficulty: "Easy",
        points: 30
    },
    {
        id: 12,
        type: "technical",
        question: "What is deadlock in operating systems? What are the four necessary conditions for it to occur?",
        topic: "Operating Systems",
        difficulty: "Hard",
        points: 50
    },
    {
        id: 13,
        type: "behavioral",
        question: "Tell me about a time you failed. What did you learn from the experience?",
        topic: "Behavioral",
        difficulty: "Medium",
        points: 35
    },
    {
        id: 14,
        type: "technical",
        question: "What are ACID properties in database transactions? Explain each with an example.",
        topic: "DBMS",
        difficulty: "Medium",
        points: 40
    },
    {
        id: 15,
        type: "technical",
        question: "Explain the difference between BFS and DFS. When would you prefer one over the other?",
        topic: "Graphs",
        difficulty: "Medium",
        points: 35
    }
];

/**
 * Get a deterministic daily seed based on date.
 * Uses IST (UTC+5:30) as the reference timezone.
 */
function getDaySeed(dateStr) {
    // Simple hash from date string
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
        const char = dateStr.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Get today's date in IST as "YYYY-MM-DD"
 */
function getTodayIST() {
    const now = new Date();
    // IST is UTC + 5:30
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);
    return istDate.toISOString().split('T')[0];
}

/**
 * Get the daily challenge for a given date.
 * Alternates between coding (odd day-of-year) and interview (even day-of-year).
 */
function getDailyChallenge(dateStr = null) {
    const today = dateStr || getTodayIST();
    const seed = getDaySeed(today);
    
    // Determine type based on day of year
    const dayOfYear = Math.floor((new Date(today) - new Date(today.substring(0, 4) + '-01-01')) / (86400000)) + 1;
    const isCodeDay = dayOfYear % 2 === 1; // Odd days = coding, even = interview

    if (isCodeDay && codingProblems.length > 0) {
        const idx = seed % codingProblems.length;
        const problem = codingProblems[idx];
        return {
            date: today,
            challengeType: 'coding',
            challenge: {
                id: problem.id,
                title: problem.title,
                difficulty: problem.difficulty,
                topic: problem.topic,
                description: problem.description,
                examples: problem.examples,
                starter_code: problem.starter_code,
                points: problem.points,
                time_limit: problem.time_limit
            }
        };
    } else {
        const idx = seed % interviewQuestions.length;
        const question = interviewQuestions[idx];
        return {
            date: today,
            challengeType: 'interview',
            challenge: {
                id: question.id,
                type: question.type,
                question: question.question,
                topic: question.topic,
                difficulty: question.difficulty,
                points: question.points
            }
        };
    }
}

module.exports = { getDailyChallenge, getTodayIST };
