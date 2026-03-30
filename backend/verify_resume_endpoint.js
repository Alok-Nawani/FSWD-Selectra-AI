
// Native fetch is available in Node 18+


async function testResumeEndpoint() {
    const resumeText = "Software Engineer with 5 years of experience in JavaScript, Node.js, and React. Created scalable backend systems.";
    const jdText = "Looking for a Senior Software Engineer with strong generic skills.";

    console.log("Testing /api/analyze-resume endpoint...");

    try {
        const response = await fetch('http://localhost:5001/api/analyze-resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resumeText, jdText })
        });

        const data = await response.json();
        console.log("Response Status:", response.status);
        console.log("Response Data:", JSON.stringify(data, null, 2));

        if (data.analysis && data.analysis.summary) {
            console.log("\n✅ Analysis returned.");
            if (data.analysis.summary.includes("Simulated")) {
                console.log("⚠️  BUT it is a SIMULATED/FALLBACK response.");
            } else {
                console.log("🎉 It is a REAL AI response.");
            }
        } else {
            console.log("❌ Invalid response structure.");
        }
    } catch (error) {
        console.error("❌ Request Failed:", error.message);
    }
}

testResumeEndpoint();
