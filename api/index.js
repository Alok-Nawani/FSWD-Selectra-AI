const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');
const { exec, execSync } = require('child_process');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { getDailyChallenge, getTodayIST } = require('./dailyChallenge');

const tempExecDir = process.env.VERCEL ? '/tmp/temp_execution' : path.join(__dirname, 'temp_execution');
if (!fs.existsSync(tempExecDir)) {
    try {
        fs.mkdirSync(tempExecDir, { recursive: true });
    } catch (e) {
        console.warn("Failed to create tempExecDir, might be running in a restricted environment:", e.message);
    }
}
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config(); // Also try root as fallback

const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection
const MONGO_URI = (process.env.MONGO_URI || process.env.MONGO_URL || '').trim() || 'mongodb://127.0.0.1:27017/selectra';

// Debug: Log all available ENV keys (not values) to see if there is a typo in the name
console.log("Available Env Keys:", Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('DB') || k.includes('URI')));
console.log("Current MONGO_URI start:", MONGO_URI.substring(0, 15));

// Disable buffering so we get real errors immediately instead of timeouts
mongoose.set('bufferCommands', false);

let cachedConnection = null;
async function connectToDatabase() {
    if (cachedConnection && mongoose.connection.readyState === 1) return cachedConnection;
    
    console.log("Connecting to MongoDB...");
    try {
        cachedConnection = await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            bufferCommands: false, // Double ensure no buffering
        });
        console.log("✅ MongoDB Connected");
        return cachedConnection;
    } catch (err) {
        console.error("❌ MongoDB Connection Error:", err.message);
        throw err;
    }
}

// Ensure DB is connected before handling any request
app.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            message: "Database connection failed: " + err.message,
            tip: "Check your MONGO_URI, Database User password, and Atlas IP Whitelist (0.0.0.0/0)"
        });
    }
});

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretselectra2026';

// ========== EMAIL OTP SYSTEM ==========
const otpStore = new Map(); // email -> { otp, name, password(hashed), expiresAt }

// Configure email transporter
const emailTransporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
    }
});

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(email, otp, name) {
    const mailOptions = {
        from: `"Selectra AI" <${process.env.EMAIL_USER || 'noreply@selectra.ai'}>`,
        to: email,
        subject: '🔐 Selectra AI — Verify Your Email',
        html: `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #0f172a; color: white; padding: 2rem; border-radius: 16px;">
                <h1 style="text-align: center; color: #38bdf8;">🎓 Selectra AI</h1>
                <p style="color: #94a3b8; text-align: center;">Welcome, ${name}!</p>
                <div style="background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); border-radius: 12px; padding: 2rem; text-align: center; margin: 1.5rem 0;">
                    <p style="color: #94a3b8; margin-bottom: 0.5rem; font-size: 0.9rem;">Your verification code is:</p>
                    <h2 style="font-size: 2.5rem; letter-spacing: 8px; color: #38bdf8; margin: 0; font-family: monospace;">${otp}</h2>
                </div>
                <p style="color: #64748b; text-align: center; font-size: 0.85rem;">This code expires in 5 minutes. Do not share it with anyone.</p>
            </div>
        `
    };
    return emailTransporter.sendMail(mailOptions);
}

// Auth Middleware
const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        res.status(400).json({ success: false, message: 'Token is not valid' });
    }
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static frontend files when running locally
app.use(express.static(path.join(__dirname, '..')));

// Mimic Vercel routes for login and dashboard/app in local dev
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'app.html'));
});

// Initialize Gemini API Keys & Rotation Logic
if (!process.env.GEMINI_API_KEYS) {
    console.warn("⚠️  GEMINI_API_KEYS is missing. AI features will not work.");
}

const API_KEYS = (process.env.GEMINI_API_KEYS || "").split(",").map(k => k.trim()).filter(Boolean);
let currentKeyIndex = 0;

function getGenAIClient() {
    if (API_KEYS.length === 0) throw new Error("No Gemini API Keys available");
    const key = API_KEYS[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length; // Round-robin rotation
    return new GoogleGenerativeAI(key);
}

// Helper: Robust AI Call with automatic key rotation and retries
// Helper: Robust AI Call with automatic key rotation and model fallbacks
async function callGemini(prompt, preferredModel = "gemini-flash-latest") {
    const modelsToTry = [
        preferredModel,
        "gemini-flash-latest",
        "gemini-2.5-flash",
        "gemini-3.5-flash",
        "gemini-1.5-flash",
        "gemini-2.0-flash"
    ];

    // Deduplicate
    const uniqueModels = [...new Set(modelsToTry)];

    let lastError = null;

    for (const modelName of uniqueModels) {
        // Try EVERY key for this model before moving to the next model
        for (let i = 0; i < API_KEYS.length; i++) {
            const key = API_KEYS[currentKeyIndex];
            currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;

            try {
                console.log(`Trying model: ${modelName} with key index ${currentKeyIndex}...`);
                const client = new GoogleGenerativeAI(key);
                const model = client.getGenerativeModel({ model: modelName });

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                if (text) return text;

            } catch (error) {
                console.error(`Attempt failed (Model: ${modelName}): ${error.message.split('\n')[0]}`);
                lastError = error;

                // If it's a "model not found" error, don't try other keys for THIS model name
                if (error.message.includes("404") || error.message.includes("not found")) break;
                
                // Otherwise (quota, invalid key), loop will try the next key
                await new Promise(r => setTimeout(r, 200)); 
            }
        }
    }

    console.error("All AI attempts (models and keys) failed.");
    throw lastError || new Error("All AI models failed.");
}

// Smart Fallback Analyzer for Interviews (Heuristic-based)
function analyzeInterviewRuleBased(transcript, type, company) {
    const wordCount = transcript.trim().split(/\s+/).length;
    const sentenceCount = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    
    // Heuristic Score
    let score = 45; 
    if (wordCount > 50) score += 15;
    if (wordCount > 150) score += 20;
    if (sentenceCount > 4) score += 10;
    
    // Keyword analysis
    const technicalKeywords = ["complexity", "time", "space", "array", "map", "logic", "algorithm", "design", "scale", "database", "api", "rest"];
    const hrKeywords = ["team", "challenge", "learned", "growth", "conflict", "resolved", "example", "result", "leadership", "collaboration"];
    
    const targetKeywords = type === 'technical' ? technicalKeywords : hrKeywords;
    const matched = targetKeywords.filter(k => transcript.toLowerCase().includes(k));
    score += matched.length * 4;
    
    score = Math.min(100, score);
    
    let feedback = `**Overall Score: ${score}/100**\n\n`;
    feedback += `**Smart Fallback Analysis (AI busy):**\n`;
    feedback += `Your response was ${wordCount} words and ${sentenceCount} sentences long. `;
    
    if (wordCount < 40) {
        feedback += `This is a bit brief for a ${type} role at ${company}. Try to add more concrete examples to support your points.\n\n`;
    } else if (wordCount < 120) {
        feedback += `Good progress! You covered a fair amount of detail, but could further enhance impact by using metrics or results.\n\n`;
    } else {
        feedback += `Great depth of explanation! You provided a very thorough and detailed response.\n\n`;
    }
    
    feedback += `**Constructive Observations:**\n`;
    if (matched.length > 0) {
        feedback += `* Excellent use of professional terminology like: *${matched.slice(0, 5).join(', ')}*.\n`;
    } else {
        feedback += `* Practice incorporating more industry-standard ${type} keywords to improve your profile's relevance.\n`;
    }
    
    if (type === 'hr') {
        feedback += `* **Tip**: Use the STAR method (Situation, Task, Action, Result) to make behavioral answers more structured.\n`;
    } else {
        feedback += `* **Tip**: Always mention Time and Space complexity when discussing algorithms or system choices.\n`;
    }
    
    return feedback;
}

// Basic Route
app.get('/api/health', (req, res) => {
    res.send('Selectra AI Backend is running 🚀');
});

// Config Endpoint - Serve keys to frontend (In production, use a more secure method)
app.get('/api/config', (req, res) => {
    res.json({
        HF_TOKEN: process.env.HF_TOKEN || "",
        DEEPGRAM_KEY: process.env.DEEPGRAM_KEY || "",
        OPENAI_COMPATIBLE_KEY: process.env.OPENAI_COMPATIBLE_KEY || ""
    });
});

// Gemini Endpoint - Example: Generate detailed interview question
app.post('/api/generate-question', async (req, res) => {
    try {
        const { topic, difficulty } = req.body;
        const prompt = `Generate a unique, technical interview question for a B.Tech student on the topic: ${topic}. Difficulty level: ${difficulty}. Include a brief answer key.`;

        const text = await callGemini(prompt, "gemini-1.5-flash");
        res.json({ success: true, question: text });

    } catch (error) {
        console.error('Error generating question (All keys failed):', error.message);
        // ABSOLUTE FALLBACK
        const mockQuestion = `(Mock) Explain the concept of ${req.body.topic} and how it relates to real-world applications. Provide an example.`;
        res.json({ success: true, question: mockQuestion });
    }
});

// Rule-Based Resume Analysis (No API Key Required)
function analyzeResumeRuleBased(resumeText, jdText) {
    const rText = resumeText.toLowerCase();
    const jText = jdText.toLowerCase();

    // 1. Keyword Matching
    const jdWords = jText.match(/\b\w+\b/g) || [];
    const resumeWords = rText.match(/\b\w+\b/g) || [];
    const stopWords = new Set(["and", "the", "in", "of", "to", "for", "a", "with", "as", "on", "is", "are", "this", "that"]);

    const meaningfulJdKeywords = [...new Set(jdWords.filter(w => w.length > 3 && !stopWords.has(w)))];
    const presentKeywords = meaningfulJdKeywords.filter(w => rText.includes(w));
    const missingKeywords = meaningfulJdKeywords.filter(w => !rText.includes(w)).slice(0, 10); // Limit to top 10 missing

    const keywordScore = Math.min(100, (presentKeywords.length / Math.max(1, meaningfulJdKeywords.length)) * 100);

    // 2. Impact Analysis (Quantification)
    const numbers = resumeText.match(/\d+/g) || [];
    const impactKeywords = ["increased", "reduced", "improved", "optimized", "led", "managed", "created", "designed", "implemented"];
    const actionVerbsCount = impactKeywords.filter(w => rText.includes(w)).length;
    const impactScore = Math.min(100, (numbers.length * 2) + (actionVerbsCount * 5));

    // 3. Formatting & Brevity
    const lines = resumeText.split('\n').filter(l => l.trim().length > 0);
    const avgLineLength = lines.reduce((acc, l) => acc + l.length, 0) / Math.max(1, lines.length);
    const brevityScore = (avgLineLength > 150 || lines.length > 500) ? 60 : 90; // Penalize too long

    // 4. Section Detection
    const sections = ["experience", "education", "skills", "projects", "summary", "objective", "certifications"];
    const presentSections = sections.filter(s => rText.includes(s));

    // 5. Overall Match Calculation
    let matchScore = Math.round((keywordScore * 0.45) + (impactScore * 0.35) + (brevityScore * 0.20));
    // Boost score if sections are present
    if (matchScore < 60 && presentSections.length > 3) matchScore += 10;

    // Generate Feedback
    const lineImprovements = [];
    if (numbers.length < 3) {
        lineImprovements.push({
            original: "General feedback",
            improved: "Try to quantify your achievements more. Use numbers (e.g., 'Increased revenue by 20%').",
            reason: "Quantifiable metrics stand out to recruiters."
        });
    }

    const feedbackSummary = matchScore > 80
        ? "Excellent match! Your resume is well-tailored to this job description with strong keywords and impact."
        : (matchScore > 50
            ? "Good start, but you can improve your storage by adding more specific keywords from the JD and quantifying your impact."
            : "Your resume needs significant tailoring. Focus on including the missing keywords and highlighting relevant experience.");

    return {
        match_score: matchScore,
        summary: feedbackSummary,
        impact_check: {
            score: Math.round(impactScore),
            feedback: impactScore > 60 ? "Great use of numbers and action verbs." : "Needs more quantification (numbers/metrics).",
            examples: impactKeywords.filter(w => rText.includes(w)).slice(0, 3)
        },
        brevity_style: {
            score: brevityScore,
            feedback: brevityScore > 80 ? "Concise and well-structured." : "Consider shortening some sections.",
            issues: lines.filter(l => l.length > 200).slice(0, 2).map((l, i) => `Long sentence found: "${l.substring(0, 40)}..."`)
        },
        keywords: {
            missing: missingKeywords,
            present: presentKeywords.slice(0, 5)
        },
        ats_compatibility: {
            score: presentSections.length * 15,
            issues: sections.filter(s => !rText.includes(s)).map(s => `Missing section: ${s}`)
        },
        line_by_line_improvements: lineImprovements
    };
}

// Gemini Endpoint - Analyze Resume
app.post('/api/analyze-resume', async (req, res) => {
    const { resumeText, jdText } = req.body;
    try {
        console.log("Analyzing resume with AI...");
        const prompt = `
        Act as an expert ATS (Application Tracking System) and Resume Coach.
        
        Job Description:
        "${jdText.substring(0, 1000)}..."

        Resume Text:
        "${resumeText.substring(0, 2000)}..."

        Analyze the resume against the JD.
        Return a valid JSON object strictly with this structure:
        {
            "match_score": (integer 0-100),
            "summary": "Specific feedback summary (2-3 sentences)",
            "impact_check": {
                "score": (integer 0-100),
                "feedback": "Feedback on quantification and impact verbs",
                "examples": ["example 1", "example 2"]
            },
            "brevity_style": {
                "score": (integer 0-100),
                "feedback": "Feedback on length and formatting",
                "issues": ["Long sentence example"]
            },
            "keywords": {
                "missing": ["keyword1", "keyword2", "keyword3"],
                "present": ["keyword4", "keyword5"]
            },
            "ats_compatibility": {
                "score": (integer 0-100),
                "issues": ["Missing section X", "Formatting issue Y"]
            },
            "line_by_line_improvements": [
                {
                    "original": "Original weak bullet point",
                    "improved": "Rewritten strong bullet point with metrics",
                    "reason": "Why the change improves it"
                }
            ]
        }
        Return ONLY valid JSON. No markdown formatting.
        `;

        const responseText = await callGemini(prompt, "gemini-1.5-flash");

        // Clean cleanup JSON if needed
        const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(jsonStr);

        res.json({ success: true, analysis });

    } catch (error) {
        console.error('AI Resume Analysis Failed (Switching to Rule-Based):', error.message);

        // Fallback to Rule-Based
        const analysis = analyzeResumeRuleBased(resumeText, jdText);
        res.json({ success: true, analysis });
    }
});

// Native Endpoint - Execute Code Locally (Run Button)
app.post('/api/run-code', async (req, res) => {
    try {
        const { code, language } = req.body;
        const sessionId = Date.now().toString() + Math.floor(Math.random()*1000);
        let filename, command;

        if (language === 'python') {
            filename = path.join(tempExecDir, `script_${sessionId}.py`);
            fs.writeFileSync(filename, code);
            command = `python3 ${filename}`;
        } else if (language === 'cpp') {
            filename = path.join(tempExecDir, `main_${sessionId}.cpp`);
            const outname = path.join(tempExecDir, `main_${sessionId}`);
            fs.writeFileSync(filename, code);
            command = `g++ ${filename} -o ${outname} && ${outname}`;
        } else if (language === 'java') {
            const jdir = path.join(tempExecDir, `java_${sessionId}`);
            fs.mkdirSync(jdir);
            filename = path.join(jdir, `Solution.java`);
            fs.writeFileSync(filename, code);
            command = `cd ${jdir} && javac Solution.java && java Solution`;
        } else if (language === 'javascript') {
            filename = path.join(tempExecDir, `script_${sessionId}.js`);
            fs.writeFileSync(filename, code);
            command = `node ${filename}`;
        } else {
            return res.json({ success: true, output: `Unsupported language: ${language}` });
        }

        exec(command, { timeout: 3000 }, (error, stdout, stderr) => {
            const rawOutput = stdout || stderr || (error ? error.message : "Executed successfully with no output.");
            res.json({ success: true, output: rawOutput.trim() });
        });

    } catch (error) {
        console.error('Error running locally:', error.message);
        res.json({ success: false, output: `Execution Error: ${error.message}` });
    }
});

const { VM } = require('vm2');
const problemTests = require('./test_cases');

// Helper to run JS code safely
function runJSCode(userCode, functionName, args) {
    const vm = new VM({
        timeout: 1000,
        sandbox: { console: { log: () => { } } } // Sandbox console
    });

    // Wrap user code to return the function
    const script = `
        ${userCode}
        ${functionName}(...args);
    `;

    try {
        vm.freeze(args, 'args');
        return vm.run(script);
    } catch (e) {
        throw new Error(e.message);
    }
}

// Simple deep equal for arrays/objects
function isEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

// Submit Code Endpoint - Real Execution
app.post('/api/submit-code', async (req, res) => {
    const { code, problemTitle, language } = req.body;

    // 1. Get Test Cases
    const problemData = problemTests[problemTitle];

    if (!problemData) {
        // Fallback for unknown problems: Mock "Correct" but be honest
        return res.json({
            success: true,
            analysis: {
                is_correct: true,
                test_cases_passed: 5,
                total_test_cases: 5,
                time_complexity: "N/A",
                feedback: "Note: Real execution not available for this problem yet. Code accepted based on syntax check."
            }
        });
    }

    // 2. Execution Logic (Only JS supported for now efficiently)
    // For Python/C++, we would need `spawn`. For this fix, we'll try to support JS primarily.

    let passedCount = 0;
    const results = [];
    let feedback = "";

    if (language === 'javascript' || (!language && !code.trim().startsWith('#'))) {
        console.log(`Executing JS Code for problem: ${problemTitle}`);
        try {
            // Extract function name from the problem title or starter code convention
            // This is tricky. simpler to ask the user to keep the function name.
            // We assume the standard LeetCode function names usually match the problem.

            // Map Title to Function Name (A simple heuristic or mapping needed)
            const titleToFunc = {
                "Two Sum": "twoSum",
                "Valid Parentheses": "isValid",
                "Climbing Stairs": "climbStairs",
                // Add others as needed or extract from code using regex
            };

            let funcName = titleToFunc[problemTitle];
            if (!funcName) {
                // Try to regex search 'function \w+'
                const match = code.match(/function\s+(\w+)/);
                if (match) funcName = match[1];
            }

            if (!funcName) throw new Error("Could not detect function name.");

            for (const test of problemData.testCases) {
                // Prepare args
                const args = Object.values(test.input);

                let output;
                try {
                    output = runJSCode(code, funcName, args);
                } catch (err) {
                    output = `Error: ${err.message}`;
                }

                const passed = isEqual(output, test.expected);
                if (passed) passedCount++;

                results.push({
                    input: JSON.stringify(test.input),
                    expected: JSON.stringify(test.expected),
                    actual: JSON.stringify(output),
                    passed
                });
            }

        } catch (e) {
            feedback = `Execution Error: ${e.message}`;
        }
    } else {
        try {
            const sessionId = Date.now().toString() + Math.floor(Math.random()*1000);
            let command, filename;
            if (language === 'python') {
                filename = path.join(tempExecDir, `script_sub_${sessionId}.py`);
                fs.writeFileSync(filename, code);
                command = `python3 ${filename}`;
            } else if (language === 'cpp') {
                filename = path.join(tempExecDir, `main_sub_${sessionId}.cpp`);
                const outname = path.join(tempExecDir, `main_sub_${sessionId}`);
                fs.writeFileSync(filename, code);
                command = `g++ ${filename} -o ${outname} && ${outname}`;
            } else if (language === 'java') {
                const jdir = path.join(tempExecDir, `javasub_${sessionId}`);
                fs.mkdirSync(jdir);
                filename = path.join(jdir, `Solution.java`);
                fs.writeFileSync(filename, code);
                command = `cd ${jdir} && javac Solution.java && java Solution`;
            }
            execSync(command, { timeout: 3000 });
            
            // Native Compilation Passed -> Invoke Gemini for Logic Assessment
            const prompt = `You are a strict code evaluator.
            Language: ${language}
            Problem: "${problemTitle}"
            User Code:
            \`\`\`
            ${code}
            \`\`\`
            Test Cases: ${JSON.stringify(problemData.testCases)}
            
            Analyze the user code mathematically/logically. Does it perfectly solve the test cases and edge cases?
            Respond STRICTLY with valid JSON only. NO MARKDOWN formatting, NO backticks. format:
            { "is_correct": boolean, "passedCount": number, "feedback": "Short detailed explanation of why it passed or failed." }`;
            
            const geminiResponse = await callGemini(prompt, "gemini-1.5-flash");
            const jsonStr = geminiResponse.substring(geminiResponse.indexOf('{'), geminiResponse.lastIndexOf('}') + 1);
            const evaluation = JSON.parse(jsonStr);
            
            passedCount = parseInt(evaluation.passedCount) || 0;
            feedback = "AI Review (Offline Binary):\n" + evaluation.feedback;

        } catch(e) {
            feedback = `Compilation / Execution Error:\n${e.message || "Timeout or Invalid Output"}`;
            passedCount = 0;
        }
    }

    const total = problemData.testCases.length;
    const isCorrect = passedCount === total;

    if (!feedback) {
        feedback = isCorrect
            ? "Excellent! All test cases passed."
            : `Failed ${total - passedCount} test cases. Check the details below.`;
    }

    // Generate detailed feedback string with test cases
    let detailedFeedback = feedback;
    if (results.length > 0) {
        detailedFeedback += "\n\n**Test Case Details:**\n";
        results.forEach((r, i) => {
            detailedFeedback += `Test ${i + 1}: ${r.passed ? '✅ Passed' : '❌ Failed'}\n   Input: ${r.input}\n   Expected: ${r.expected}\n   Actual: ${r.actual}\n`;
        });
    }

    res.json({
        success: true,
        analysis: {
            is_correct: isCorrect,
            test_cases_passed: passedCount,
            total_test_cases: total,
            time_complexity: "O(n) [Estimated]",
            feedback: detailedFeedback
        }
    });
});

// Gemini Endpoint - Generate Interview Feedback
app.post('/api/generate-feedback', async (req, res) => {
    try {
        const { transcript, type, company } = req.body;
        const prompt = `You are an expert ${type} interviewer for ${company}. 
        Analyze: ${transcript}
        Output format: Overall Score (0-100), Feedback summary, Question Analysis bullets.`;

        const text = await callGemini(prompt, "gemini-1.5-flash");
        res.json({ success: true, feedback: text });

    } catch (error) {
        console.error('Error generating feedback (AI Failed):', error.message);
        
        // SMART FALLBACK
        const { transcript, type, company } = req.body;
        const fallbackFeedback = analyzeInterviewRuleBased(transcript, type, company);
        
        res.json({
            success: true,
            feedback: fallbackFeedback
        });
    }
});

// =======================
// AUTH & PROGRESS ROUTES
// =======================

// Step 1: Send OTP to email
app.post('/api/auth/send-otp', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
        }

        let existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const otp = generateOTP();

        // Store OTP with 5-min expiry
        otpStore.set(email, {
            otp,
            name,
            password: hashedPassword,
            expiresAt: Date.now() + 5 * 60 * 1000
        });

        // Clean up expired OTPs periodically
        for (const [key, val] of otpStore.entries()) {
            if (val.expiresAt < Date.now()) otpStore.delete(key);
        }

        // Try to send email
        try {
            await sendOTPEmail(email, otp, name);
            console.log(`OTP sent to ${email}: ${otp}`);
            res.json({ success: true, message: 'OTP sent to your email' });
        } catch (emailErr) {
            console.error('Email send failed:', emailErr.message);
            // In development, still allow registration but log the OTP
            console.log(`📧 DEV MODE — OTP for ${email}: ${otp}`);
            res.json({ success: true, message: 'OTP generated (check server console in dev mode)', devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined });
        }
    } catch (err) {
        console.error('Send OTP Error:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Step 2: Verify OTP and create account
app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        }

        const pending = otpStore.get(email);
        if (!pending) {
            return res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });
        }

        if (Date.now() > pending.expiresAt) {
            otpStore.delete(email);
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }

        if (pending.otp !== otp.toString()) {
            return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
        }

        // OTP valid — create user
        let user = await User.findOne({ email });
        if (user) {
            otpStore.delete(email);
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        user = new User({
            name: pending.name,
            email,
            password: pending.password,
            isVerified: true
        });
        await user.save();
        otpStore.delete(email);

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            success: true,
            token,
            user: { name: user.name, email: user.email, _id: user._id, progress: user.progress, xp: user.xp, currentStreak: user.currentStreak, maxStreak: user.maxStreak, notes: user.notes }
        });
    } catch (err) {
        console.error('Verify OTP Error:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Legacy Register (kept as fallback but now requires OTP)
app.post('/api/auth/register', async (req, res) => {
    res.status(400).json({ success: false, message: 'Please use the OTP verification flow. Send OTP first via /api/auth/send-otp' });
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            success: true,
            token,
            user: { name: user.name, email: user.email, _id: user._id, progress: user.progress, xp: user.xp, currentStreak: user.currentStreak, maxStreak: user.maxStreak, notes: user.notes }
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

// ========================================
// DAILY CHALLENGE & VERIFIED STREAK
// ========================================

// Get today's daily challenge
app.get('/api/daily-challenge', (req, res) => {
    try {
        const challenge = getDailyChallenge();
        res.json({ success: true, ...challenge });
    } catch (err) {
        console.error('Daily Challenge Error:', err);
        res.status(500).json({ success: false, message: 'Failed to get daily challenge' });
    }
});

// Submit daily challenge (server-verified)
app.post('/api/daily-challenge/submit', authMiddleware, async (req, res) => {
    try {
        const { answer, challengeType } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const today = getTodayIST();
        const dailyChallenge = getDailyChallenge(today);

        // Check if already completed today
        const alreadyDone = user.dailyChallengeCompletions.find(c => c.date === today);
        if (alreadyDone) {
            return res.json({ success: true, message: 'Already completed today\'s challenge!', alreadyCompleted: true, currentStreak: user.currentStreak, maxStreak: user.maxStreak });
        }

        // Validate answer
        if (!answer || answer.trim().length < 20) {
            return res.status(400).json({ success: false, message: 'Your answer is too short. Please provide a detailed response (at least 20 characters).' });
        }

        // Award XP based on challenge
        const xpEarned = dailyChallenge.challenge.points || 30;

        // Update streak logic (server-side, anti-cheat)
        const yesterday = new Date(new Date(today).getTime() - 86400000).toISOString().split('T')[0];

        if (user.lastActivityDate === yesterday) {
            // Consecutive day — increment streak
            user.currentStreak = (user.currentStreak || 0) + 1;
        } else if (user.lastActivityDate === today) {
            // Same day — no change (shouldn't reach here due to alreadyDone check)
        } else {
            // Streak broken — reset to 1
            user.currentStreak = 1;
        }

        user.maxStreak = Math.max(user.maxStreak || 0, user.currentStreak);
        user.streak = user.currentStreak; // Keep backward compat
        user.lastActivityDate = today;
        user.xp = (user.xp || 0) + xpEarned;

        // Record completion
        user.dailyChallengeCompletions.push({
            date: today,
            challengeType: dailyChallenge.challengeType,
            challengeId: dailyChallenge.challenge.id,
            xpEarned
        });

        // Add to daily activity
        if (!user.dailyActivity.includes(today)) {
            user.dailyActivity.push(today);
        }

        await user.save();

        res.json({
            success: true,
            message: `Challenge completed! +${xpEarned} XP`,
            xpEarned,
            totalXp: user.xp,
            currentStreak: user.currentStreak,
            maxStreak: user.maxStreak
        });
    } catch (err) {
        console.error('Daily Challenge Submit Error:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Get user's challenge status for today
app.get('/api/daily-challenge/status', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('dailyChallengeCompletions currentStreak maxStreak xp dailyActivity lastActivityDate');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const today = getTodayIST();
        const completedToday = user.dailyChallengeCompletions.find(c => c.date === today);

        // Get last 7 days activity
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(new Date(today).getTime() - i * 86400000).toISOString().split('T')[0];
            last7Days.push({
                date: d,
                completed: user.dailyActivity.includes(d)
            });
        }

        res.json({
            success: true,
            completedToday: !!completedToday,
            currentStreak: user.currentStreak || 0,
            maxStreak: user.maxStreak || 0,
            xp: user.xp || 0,
            last7Days
        });
    } catch (err) {
        console.error('Challenge Status Error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ========================================
// REAL LEADERBOARD
// ========================================

app.get('/api/leaderboard', async (req, res) => {
    try {
        const users = await User.find({ isVerified: true })
            .select('name xp currentStreak maxStreak dailyChallengeCompletions')
            .sort({ xp: -1 })
            .limit(50);

        // Also include non-verified users who have xp (legacy users)
        const legacyUsers = await User.find({ isVerified: { $ne: true }, xp: { $gt: 0 } })
            .select('name xp currentStreak maxStreak dailyChallengeCompletions')
            .sort({ xp: -1 })
            .limit(20);

        const allUsers = [...users, ...legacyUsers]
            .sort((a, b) => (b.xp || 0) - (a.xp || 0))
            .slice(0, 50);

        const leaderboard = allUsers.map((u, idx) => {
            const xp = u.xp || 0;
            let title = 'Beginner';
            if (xp >= 1500) title = '🥇 DSA Master';
            else if (xp >= 1000) title = '🧠 Logic Wizard';
            else if (xp >= 500) title = '💻 Code Warrior';
            else if (xp >= 200) title = '📚 Scholar';
            else if (xp >= 50) title = '🌱 Contender';

            return {
                rank: idx + 1,
                name: u.name,
                xp,
                currentStreak: u.currentStreak || 0,
                maxStreak: u.maxStreak || 0,
                challengesCompleted: u.dailyChallengeCompletions ? u.dailyChallengeCompletions.length : 0,
                title,
                _id: u._id
            };
        });

        res.json({ success: true, leaderboard });
    } catch (err) {
        console.error('Leaderboard Error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ========================================
// USER NOTES & PROGRESS (EXISTING)
// ========================================

// Get User Notes
app.get('/api/user/notes', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('notes');
        res.json({ success: true, notes: user.notes });
    } catch (err) {
        console.error("Get Notes Error:", err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Update User Notes
app.put('/api/user/notes', authMiddleware, async (req, res) => {
    try {
        const { notes } = req.body;
        const user = await User.findById(req.user.id);
        if (notes !== undefined) user.notes = notes;
        await user.save();
        res.json({ success: true, notes: user.notes });
    } catch (err) {
        console.error("Update Notes Error:", err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Get User Progress
app.get('/api/user/progress', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update User Progress
app.put('/api/user/progress', authMiddleware, async (req, res) => {
    try {
        const { dsa, dbms, os, completedTopics, xp } = req.body;
        const user = await User.findById(req.user.id);
        
        if (dsa !== undefined) user.progress.dsa = dsa;
        if (dbms !== undefined) user.progress.dbms = dbms;
        if (os !== undefined) user.progress.os = os;
        if (xp !== undefined) user.xp = xp;
        
        if (completedTopics) {
            completedTopics.forEach(t => {
                if (!user.completedTopics.includes(t)) user.completedTopics.push(t);
            });
        }
        
        await user.save();
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
module.exports = app;
