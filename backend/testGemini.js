
require("dotenv").config({ path: "../.env" });

const { testGemini } = require("./gemini");

async function main() {
    try {
        const answer = await testGemini();
        console.log("Gemini connection successful!");
        console.log(answer);
    } catch (error) {
        console.error("Gemini connection failed:");
        console.error(error.message);
    }
}

main();
