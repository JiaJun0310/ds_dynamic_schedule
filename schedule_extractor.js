import fs from 'fs'; // filesystem
import 'dotenv/config'; // load API keys (llama, gemini) and config them
import LlamaCloud from '@llamaindex/llama-cloud'; // vision based markdown conversion (docling of js)
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'; // used for the data extraction from the markdown (langextract of js)
import { ChatPromptTemplate } from '@langchain/core/prompts'; // used for forcing the schema to the llm

// CREATE SCHEMA FOR SUBJECTS IN SCHEDULE

import { number, z } from "zod";
import { error } from 'console';
const SubjectSchema = z.object({
    title: z.string().describe("The name of the course (e.g., 'ΨΣ-002-ΜΑΘΗΜΑΤΙΚΗ ΑΝΑΛΥΣΗ ΙΙ', 'ΨΣ-004-ΔΙΑΚΡΙΤΑ ΜΑΘΗΜΑΤΙΚΑ (Φροντιστήριο)')"),
    lectureHall: z.string().describe("The room number of the class (e.g., 'ΚΕΚΤ-103', 'ΓΛ21-104')"),
    daysOfWeek: z.array(z.number()).describe("A list of days the class takes place (e.g., ['Δευτέρα', 'Τετάρτη'] is [1,3], [ΠΕΜΠΤΗ] is [4])"),
    startTime: z.array(z.string()).describe("A list of starting time(s) corresponding to the day(s) (e.g., ['09:15:00'], ['11:15:00', '12:15:00'])"),
    endTime: z.array(z.string()).describe("A list of ending time(s) corresponding to the day(s) (e.g., ['13:00:00', '14:00:00'], ['14:00:00'])"),
    semester: z.number().describe("The numerical semester this class belongs to (e.g., 1, 2, 5, 8)"),
    professor: z.array(z.string()).describe("A list of the professors teaching this course (e.g., ['ΦΙΛΙΠΠΑΚΗΣ Μ.'], ['ΜΗΛΙΩΝΗΣ Α.', 'ΑΝΑΣΤΑΣΟΠΟΥΛΟΣ Α.'])")
});

const ScheduleSchema = z.object({
    subjects: z.array(SubjectSchema).describe("An array of the subject objects that stores all subjects")
})

// PASS PDF TO LLAMA FUNCTION
// RETURN MARKDOWN

// creates llama agent
const llamaAgent = new LlamaCloud({ apiKey: process.env.LLAMA_CLOUD_API_KEY });
// create function that uses llama agent to convert the pdf into markdown
async function visionPdfToMarkdown(llamaClient, filePath) {
    try {
        console.log("🍞1. markdown function starts")
        const upload = await llamaClient.files.create({ // creates a network connection between the app and the llamaCloud
            file: fs.createReadStream(filePath), // sends the file to the agent
            purpose: 'parse',
        });
        console.log("🍞2. connection with llama established")

        const result = await llamaClient.parsing.parse({
            file_id: upload.id, // tells the LLM which file to parse
            tier: 'agentic',  // sets the LLM to vision based parsing
            version: 'latest',
            expand: ['markdown']  // returns the output as markdown
        });
        console.log("🍞3. markdown returned")
        return result.markdown.pages.map(page => page.markdown).join('\n\n---\n\n'); // returns the markdown as a whole instead of pages
    } catch (error) {
        console.error("Error message: ", error)
        if (error.status) {
            console.error("Status Code:", error.status);
        }
        console.error("\nStack Trace:");
        console.error(error.stack);
    }
}

// PASS MARKDOWN TO GEMINI FUNCTION
// (force gemini to return the schema)

// creates gemini agent
const geminiAgent = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0, // sets creativity level to 0 (we only want facts from the markdown, no halucinations)
    apiKey: process.env.GOOGLE_API_KEY
});
// forces llm to return data to the form of the schema
const structuredLlmResponse = geminiAgent.withStructuredOutput(ScheduleSchema);
const promptTemplate = ChatPromptTemplate.fromMessages([
    [
        "system", 
        `You are a strict data extraction algorithm specializing in university course schedules.
        Your task is to extract every single class/subject and its details from the provided document into a structured array.
        
        CRITICAL PARSING INSTRUCTIONS:
        The input text is formatted as an HTML table. 
        - The <thead> contains the Days of the week.
        - The <tbody> contains the classes. 
        - A row with <td colspan="6"> usually contains the Course Name.
        - The following rows contain the time, room, and professor mapped strictly to the column (Day) they fall under.
        
        STRICT RULES:
        1. Adhere flawlessly to the expected schema layout.
        2. Do NOT invent or hallucinate data. Only extract what is inside the HTML.
        3. EXTRACT ALL CLASSES: You must locate and extract every single course listed.
        4. DAY MAPPING: Convert Greek days to their corresponding string numbers (Δευτέρα="1", Τρίτη="2", Τετάρτη="3", Πέμπτη="4", Παρασκευή="5", Σάββατο="6", Κυριακή="7").
        5. TIME FORMAT: Ensure all times are strictly formatted as "HH:MM:SS" (e.g., "09:15:00").
        6. ALIGNMENT: If a class occurs on multiple days, ensure the daysOfWeek, startTime, and endTime arrays align perfectly by index.
        7. SEMESTER: Every time you see the days of the week that means that the semester changes (it starts from 2 then to 4, from 4 to 6, from 6 to 8 and then it ends)`
    ],
    [
        "human", 
        "DOCUMENT TEXT TO PROCESS:\n{markdownData}"
    ]
]);

const extractionChain = promptTemplate.pipe(structuredLlmResponse);

// creates the function that passes markdown to gemini and returns the schema
async function markdownToDictionary(markdownText) {
    try {
        const extractedDictionary = await extractionChain.invoke({
            markdownData: markdownText // pass markdown into data to be parsed
        });
        return extractedDictionary;
    } catch (error) {
        console.error(error.message);
        console.error(error);
        throw error;
    }
}

async function runExtractionPipeline() {
    // file path of the gods
    const filePath = "./uploads/schedule.pdf";

    // call llama to convert pdf to markdown
    const rawMarkdown = await visionPdfToMarkdown(llamaAgent, filePath);
    console.log(rawMarkdown)

    // // call gemini to convert markdown to schema
    const finalDictionary = await markdownToDictionary(rawMarkdown);

    return finalDictionary
}

var super_json = await runExtractionPipeline()
console.log(super_json)

if (super_json) {
    // write zod object (final dictionary) to a json file with line breaks and 2 tabs
    const finalJsonString = JSON.stringify(super_json, null, 2);

    // path where the json will be saved
    const outputPath = "./jsonData/schedule.json";

    // 3. Write it to the hard drive!
    fs.writeFileSync(outputPath, finalJsonString, 'utf-8');
} else {
    console.log("Pipeline finished, but no output");
}