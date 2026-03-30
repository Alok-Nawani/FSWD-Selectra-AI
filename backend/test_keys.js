const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const apiKeysStr = process.env.GEMINI_API_KEYS || "";
const apiKeys = apiKeysStr.split(",").map(k => k.trim()).filter(Boolean);

console.log(`Found ${apiKeys.length} API keys in .env`);

async function checkKey(key, index) {
    const maskedKey = key.substring(0, 4) + '...' + key.length;
    try {
        const genAI = new GoogleGenerativeAI(key);
        // Test with the model used in server
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        await model.generateContent("Hello");
        console.log(`[PASS] Key ${index + 1} (${maskedKey}) works with 'gemini-2.0-flash'.`);
        return true;
    } catch (error) {
        console.log(`[FAIL] Key ${index + 1} (${maskedKey}) failed with 'gemini-2.0-flash': ${error.message}`);
        // Try fallback
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
            await model.generateContent("Hello");
            console.log(`[PASS] Key ${index + 1} (${maskedKey}) works with 'gemini-flash-latest'.`);
            return true;
        } catch (e2) {
            console.log(`[FAIL] Key ${index + 1} (${maskedKey}) also failed with 'gemini-flash-latest': ${e2.message}`);
        }
        return false;
    }
}

async function runTests() {
    let workingKeys = 0;
    // Test only the first few since we just added one at the start
    for (let i = 0; i < Math.min(apiKeys.length, 2); i++) {
        const success = await checkKey(apiKeys[i], i);
        if (success) workingKeys++;
    }
    console.log(`\nVerified top keys.`);
}

runTests();
