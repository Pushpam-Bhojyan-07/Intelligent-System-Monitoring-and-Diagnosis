
const Groq = require("groq-sdk");
const { ai } = require("./gemini");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const ALLOWED_INTENTS = [
    "current_metrics",
    "top_process",
    "historical_analysis",
    "diagnosis",
    "dbms_performance",
    "general"
];

const intentSchema = {
    type: "object",
    properties: {
        intent: {
            type: "string",
            enum: ALLOWED_INTENTS
        },
        description: {
            type: "string"
        }
    },
    required: ["intent", "description"],
    additionalProperties: false
};

// Primary provider: Groq
async function detectWithGroq(message) {
    console.log("Trying Groq...");

    const response = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
            {
                role: "system",
                content: `
You are the intent detection component of SysGuard,
an operating system and database monitoring application.

Identify the user's intent. Do not answer the question.

Available intents:
- current_metrics: Current CPU, memory, disk or network usage.
- top_process: Processes consuming CPU or memory.
- historical_analysis: Historical system performance.
- diagnosis: Detected system or database performance issues.
- dbms_performance: Database query performance and OS-DBMS correlation.
- general: Greetings or unrelated questions.
`
            },
            {
                role: "user",
                content: message
            }
        ],
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "sysguard_intent",
                strict: true,
                schema: intentSchema
            }
        }
    });

    const result = JSON.parse(
        response.choices[0].message.content
    );

    if (!ALLOWED_INTENTS.includes(result.intent)) {
        throw new Error("Groq returned an unsupported intent.");
    }

    return result;
}

// Secondary provider: Gemini
async function detectWithGemini(message) {
    console.log("Trying Gemini fallback...");

    const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `
You are the intent detection component of SysGuard.

Identify the user's intent. Do not answer the question.

Available intents:
- current_metrics: Current CPU, memory, disk or network usage.
- top_process: Processes consuming CPU or memory.
- historical_analysis: Historical system performance.
- diagnosis: Detected system or database performance issues.
- dbms_performance: Database query performance and OS-DBMS correlation.
- general: Greetings or unrelated questions.

User question: ${JSON.stringify(message)}
`,
        config: {
            responseMimeType: "application/json",
            responseJsonSchema: {
                type: "OBJECT",
                properties: {
                    intent: {
                        type: "STRING",
                        enum: ALLOWED_INTENTS
                    },
                    description: {
                        type: "STRING"
                    }
                },
                required: ["intent", "description"]
            }
        }
    });

    const result = JSON.parse(response.text);

    if (!ALLOWED_INTENTS.includes(result.intent)) {
        throw new Error("Gemini returned an unsupported intent.");
    }

    return result;
}

// Main intent detection function
async function understandQuestion(message) {
    if (!process.env.GROQ_API_KEY) {
        console.log("Groq API key missing. Using Gemini.");
        return await detectWithGemini(message);
    }

    try {
        const result = await detectWithGroq(message);

        console.log("Intent detected using Groq.");

        return {
            ...result,
            provider: "Groq"
        };

    } catch (groqError) {
        console.error("Groq failed:", groqError.message);
        console.log("Switching to Gemini...");
    }

    try {
        const result = await detectWithGemini(message);

        console.log("Intent detected using Gemini.");

        return {
            ...result,
            provider: "Gemini"
        };

    } catch (geminiError) {
        console.error("Gemini failed:", geminiError.message);

        throw new Error(
            "Both Groq and Gemini are currently unavailable."
        );
    }
}


async function generateAnswer(message, intent, data) {
    const prompt = `
You are SysGuard, an intelligent OS and DBMS monitoring assistant.

Answer the user's question using the supplied data.

Rules:
1. Use only the supplied data for system measurements.
2. Never invent CPU, memory, disk, network or database values.
3. If data is null or unavailable, clearly say so.
4. Explain technical information in simple language.
5. Keep the answer concise and useful.
6. Do not claim that correlation proves causation.

User question:
${JSON.stringify(message)}

Detected intent:
${intent}

Retrieved system data:
${JSON.stringify(data)}

Generate a natural-language answer.
`;

    // Primary provider: Groq
    if (groq) {
        try {
            console.log("Generating answer using Groq...");

            const response = await groq.chat.completions.create({
                model: "openai/gpt-oss-20b",
                messages: [
                    {
                        role: "system",
                        content: "You are the SysGuard monitoring assistant."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            });

            const answer = response.choices[0].message.content;

            if (answer && answer.trim()) {
                return {
                    answer: answer.trim(),
                    provider: "Groq"
                };
            }

            throw new Error("Groq returned an empty answer.");

        } catch (error) {
            console.error("Groq response generation failed:", error.message);
        }
    }

    // Secondary provider: Gemini
    try {
        console.log("Generating answer using Gemini fallback...");

        const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: prompt
        });

        const answer = response.text;

        if (answer && answer.trim()) {
            return {
                answer: answer.trim(),
                provider: "Gemini"
            };
        }

        throw new Error("Gemini returned an empty answer.");

    } catch (error) {
        console.error("Gemini response generation failed:", error.message);
    }

    // Final fallback: deterministic response
    if (intent === "current_metrics" && data) {
        return {
            answer: `Current system metrics: CPU usage is ${data.cpu}%, memory usage is ${data.memory}%, and disk usage is ${data.disk}%.`,
            provider: "Rule-based fallback"
        };
    }

    return {
        answer: "I retrieved your question, but the AI response services are currently unavailable. Please try again later.",
        provider: "Rule-based fallback"
    };
}


module.exports = {
    understandQuestion,
    generateAnswer
};
