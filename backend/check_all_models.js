
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: './backend/.env' });

// Use the key from env directly
const fullKeys = process.env.GEMINI_API_KEYS || "";
console.log("Raw Keys:", fullKeys);
const apiKeys = fullKeys.split(",").map(k => k.trim()).filter(Boolean);
const TEST_KEY = apiKeys[0];

async function testAllModels() {
    console.log(`Checking key: ${TEST_KEY.substring(0, 5)}...`);

    // Explicit list of all known likely candidates
    const candidates = [
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite-preview-02-05",
        "gemini-2.5-flash",
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash-001",
        "gemini-1.5-pro",
        "gemini-1.5-pro-latest",
        "gemini-1.0-pro",
        "gemini-pro"
    ];

    console.log("Testing specific candidates...");
    const genAI = new GoogleGenerativeAI(TEST_KEY);

    for (const modelName of candidates) {
        try {
            process.stdout.write(`Testing ${modelName.padEnd(35)}: `);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hi");
            console.log(`✅ WORKED`);
        } catch (e) {
            let reason = "Unknown";
            if (e.message.includes("404")) reason = "Not Found/Supported";
            else if (e.message.includes("429")) reason = "Rate Limited / Quota Exceeded";
            else reason = e.message.split('\n')[0];

            console.log(`❌ FAILED (${reason})`);
        }
        // Brief pause to avoid causing rate limits myself
        await new Promise(r => setTimeout(r, 500));
    }
}

testAllModels();
