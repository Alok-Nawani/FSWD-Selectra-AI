import CONFIG from './config.js';

export async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Fetch Error:', error);
        return null;
    }
}

// Hugging Face Integration for Text Generation
export async function generateText(prompt) {
    if (!CONFIG.HF_TOKEN) {
        console.warn("No Hugging Face token found.");
        return "Simulated AI feedback (configure API key for real generation).";
    }

    const payload = {
        inputs: `[INST] ${prompt} [/INST]`,
        parameters: { max_new_tokens: 300, temperature: 0.7 }
    };

    try {
        const response = await fetch(`https://api-inference.huggingface.co/models/${CONFIG.HF_MODEL}`, {
            headers: {
                Authorization: `Bearer ${CONFIG.HF_TOKEN}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        // Handle error responses
        if (result.error) return `Error: ${result.error}`;

        return result[0]?.generated_text?.split("[/INST]")[1]?.trim() || result[0]?.generated_text || "No response generated.";
    } catch (error) {
        console.error("HF API Error:", error);
        // Fallback Mock Response for demo purposes if API fails/is rate limited
        return "Simulated AI Analysis:\n\noverall, you demonstrated good core knowledge. Your communication was clear, and you structure your answers well. To improve, try to include more specific real-world examples in your technical explanations. \n\nStrengths: Clear articulation, good grasp of basics.\nAreas for Growth: Depth in advanced topics, practical application scenarios.";
    }
}
