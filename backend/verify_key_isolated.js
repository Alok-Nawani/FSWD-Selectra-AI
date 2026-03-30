const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Use the first key from GEMINI_API_KEYS or a single GEMINI_API_KEY
const fullKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
const apiKeys = fullKeys.split(",").map(k => k.trim()).filter(Boolean);
const TEST_KEY = apiKeys[0];

if (!TEST_KEY) {
    console.error("❌ No API key found in .env (GEMINI_API_KEYS or GEMINI_API_KEY)");
    process.exit(1);
}

async function listAndTest() {
    console.log("--- Listing Available Models for Key ---");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${TEST_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.log("❌ Error listing models:", JSON.stringify(data, null, 2));
            return;
        }

        if (!data.models || data.models.length === 0) {
            console.log("❌ No models found for this key.");
            return;
        }

        console.log(`Found ${data.models.length} models.`);

        // Filter for generateContent supported models
        const generateModels = data.models.filter(m =>
            m.supportedGenerationMethods &&
            m.supportedGenerationMethods.includes("generateContent")
        );

        console.log(`Found ${generateModels.length} generation-capable models.`);

        for (const model of generateModels) {
            const modelName = model.name.replace("models/", "");
            console.log(`\nTesting: ${modelName}`);

            try {
                const genAI = new GoogleGenerativeAI(TEST_KEY);
                const genModel = genAI.getGenerativeModel({ model: modelName });
                const result = await genModel.generateContent("Hi");
                const response = await result.response;
                console.log(`   ✅ SUCCESS! Response: ${response.text().trim()}`);
                return; // Stop after first success
            } catch (error) {
                console.log(`   ❌ FAILED: ${error.message.split('\n')[0]}`);
            }
            // Small delay
            await new Promise(r => setTimeout(r, 1000));
        }

    } catch (error) {
        console.log("❌ Network error:", error.message);
    }
}

listAndTest();
