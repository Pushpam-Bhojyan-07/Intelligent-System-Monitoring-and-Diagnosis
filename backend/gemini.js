
const { GoogleGenAI } = require("@google/genai");

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from backend/.env");
}

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function testGemini() {
    const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: "Explain the purpose of an operating system in two sentences."
    });

    return response.text;
}

module.exports = {
    ai,
    testGemini
};
