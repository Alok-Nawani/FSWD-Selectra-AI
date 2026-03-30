const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function list() {
    try {
        // There is no listModels method directly on genAI instance in some versions, 
        // but usually there is a way or I can try a known model.
        // Actually, the error message suggests calling ListModels.
        // In the Node SDK, it might be different.
        // Let's try to find if there is a way.
        // Actually I will just try a few standard ones. 
        // But let's try to see if I can use the model 'gemini-1.0-pro'.

        // Instead of listing which might be hard without valid method knowledge,
        // I will try to generate content with 'gemini-1.0-pro' and 'gemini-1.5-flash' again.

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log("Trying gemini-1.5-flash...");
        try {
            await model.generateContent("Test");
            console.log("Success with gemini-1.5-flash");
        } catch (e) { console.log("Failed gemini-1.5-flash", e.message.split('\n')[0]); }

        const model2 = genAI.getGenerativeModel({ model: "gemini-pro" });
        console.log("Trying gemini-pro...");
        try {
            await model2.generateContent("Test");
            console.log("Success with gemini-pro");
        } catch (e) { console.log("Failed gemini-pro", e.message.split('\n')[0]); }

    } catch (e) {
        console.error(e);
    }
}
list();
