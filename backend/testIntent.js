
require("dotenv").config({ path: "../.env" });

const { understandQuestion } = require("./nlpAssistant");

async function main() {
    try {
        const result = await understandQuestion(
            "Which process is consuming the most memory?"
        );

        console.log("Intent detection successful!");
        console.log(result);
    } catch (error) {
        console.error("Intent detection failed:", error.message);
    }
}

main();
