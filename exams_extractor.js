import fs from 'fs'; // filesystem
import 'dotenv/config'; // load API keys (llama, gemini) and config them
import LlamaCloud from '@llamaindex/llama-cloud'; // vision based markdown conversion (docling of js)
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'; // used for the data extraction from the markdown (langextract of js)
import { ChatPromptTemplate } from '@langchain/core/prompts'; // used for forcing the schema to the llm

// CREATE SCHEMA FOR SUBJECTS IN EXAM PERIOD

import { number, z } from "zod";
import { error } from 'console';
const subjectSchema = z.object({
    title: z.string().describe("The name of the course (e.g., 'ΨΣ-002-ΜΑΘΗΜΑΤΙΚΗ ΑΝΑΛΥΣΗ ΙΙ', 'ΨΣ-004-ΔΙΑΚΡΙΤΑ ΜΑΘΗΜΑΤΙΚΑ (Φροντιστήριο)')"),
    lectureHall: z.array(z.string()).describe("The room number of the class corresponding to the day(s) (e.g., 'ΚΕΚΤ-103', 'ΓΛ21-104')"),
    semester: z.number().describe("The semester the subject is taught. (e.g., '1, 2, 3, 5, 8')"),
    date: z.string().describe("The date the exam will take place (e.g., '14/5/2025', '7/9/2026', '27/6/2031')"),
    startTime: z.string().describe("The time the exam starts (e.g., '13:00:00', '09:15:00', '18:45:00', '15:30:00')"),
    endTime: z.string().describe("The time the exam ends (e.g., '11:00:00', '12:15:00', '16:45:00', '20:30:00')"),
    division: z.string().describe("The division of students according to the first letter of their name (e.g., 'Α-Ω', 'Α-Λ', 'Μ-Ω')")
});

const examSchema = z.object({
    isEmvolimi: z.boolean().describe("True if the document title mentions 'ΕΠΙ ΠΤΥΧΙΩ' or 'ΕΜΒΟΛΙΜΗ' (make-up exams). False if it is a regular exam period."),
    exams: z.array(subjectSchema)
});

// PASS PDF TO LLAMA FUNCTION
// RETURN MARKDOWN

// creates llama agent
const llamaAgent = new LlamaCloud({ apiKey: process.env.LLAMA_CLOUD_API_KEY });
// create function that uses llama agent to convert the pdf into markdown
async function visionPdfToMarkdown(llamaClient, filePath) {
    try {
        const upload = await llamaClient.files.create({ // creates a network connection between the app and the llamaCloud
            file: fs.createReadStream(filePath), // sends the file to the agent
            purpose: 'parse',
        });
        const result = await llamaClient.parsing.parse({
            file_id: upload.id,
            tier: 'agentic',
            version: 'latest',
            expand: ['markdown'],
            agentic_options: {
                custom_prompt: `You are extracting data from a university exam schedule. 
                
                STRICT INSTRUCTIONS:
                1. The document contains dates dividing the exam days (e.g., "Δευτέρα, 24/11/2025"). 
                2. Whenever you encounter a date, you MUST explicitly extract the date and place it as a clear Markdown header (e.g., "### DATE: 24/11/2025") immediately above the exams for that day.
                3. Do not let the complex tables distract you from capturing these dates. 
                4. Maintain the alignment of Times, Rooms, Semesters, Courses, and Divisions.`
            }
        });
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
const structuredLlmResponse = geminiAgent.withStructuredOutput(examSchema);
const promptTemplate = ChatPromptTemplate.fromMessages([
    [
        "system",
        `You are a strict data extraction algorithm specializing in university exam schedules.
        Your task is to extract every single exam session from the provided document into the expected JSON structure.
        
        CRITICAL PARSING INSTRUCTIONS:
        - The input text contains exam sessions. 
        - The dates are provided as text headers (e.g., "### DATE: 24/11/2025") or standalone table rows (e.g., "| Δευτέρα, 24/11/2025").
        
        STRICT RULES:
        1. DATE TRACKING: When you see a date, hold onto that date and apply it to ALL subsequent exams until you see a new date. Do not include the day of the week, just the date (e.g., "24/11/2025").
        2. TIME FORMATTING: The document shows times as ranges (e.g., "08:00-10:00"). You must split this into startTime and endTime, and append ":00" to strictly match the "HH:MM:SS" format (e.g., "08:00:00", "10:00:00").
        3. ROOM ARRAYS: Exams are often held in multiple rooms separated by commas (e.g., "ΓΛ21-305, ΓΑ21-405"). You must separate these into the lectureHall string array.
        4. EXTRACT ALL EXAMS: You must locate and extract every single exam listed in the document. Do not summarize or skip rows.
        5. NO HALLUCINATIONS: Only extract what is present. If a semester is "Επι.", leave it blank or extract the numerical semester if provided.`
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
    const filePath = "./uploads/exams1.pdf";

    // call llama to convert pdf to markdown
    const rawMarkdown = await visionPdfToMarkdown(llamaAgent, filePath);
    console.log(rawMarkdown)

    // call gemini to convert markdown to schema
    const finalDictionary = await markdownToDictionary(rawMarkdown);

    return finalDictionary
}

var super_json = await runExtractionPipeline()

if (super_json) {
    let examArray = super_json.exams || super_json

    // write zod object (final dictionary) to a json file with line breaks and 2 tabs
    const finalJsonString = JSON.stringify(examArray, null, 2);

    if (examArray.length > 0) { // if there was an output
        if (super_json.isEmvolimi) {
            // path where the json will be saved
            const outputPath = "./jsonData/make_up_exams.json";

            // save the file to jsonData
            fs.writeFileSync(outputPath, finalJsonString, 'utf-8');
        } else {
            // path where the json will be saved
            const outputPath = "./jsonData/semester_exams.json";

            // save the file to jsonData
            fs.writeFileSync(outputPath, finalJsonString, 'utf-8');
        }
    } else { // if list was empty
        console.log("Pipeline finished, but list is empty")
    }
}