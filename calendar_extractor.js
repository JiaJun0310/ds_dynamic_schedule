import fs from 'fs'; // filesystem
import 'dotenv/config'; // load API keys (llama, gemini) and config them
import LlamaCloud from '@llamaindex/llama-cloud'; // vision based markdown conversion (docling of js)
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'; // used for the data extraction from the markdown (langextract of js)
import { ChatPromptTemplate } from '@langchain/core/prompts'; // used for forcing the schema to the llm

// CREATES SCHEMA FOR HOLIDAYS AND SEMSTERS

import {number, z} from "zod";
import { error } from 'console';
// Single holiday schema
const HolidaySchema = z.object({
    date: z.string().describe("The date or date range (e.g., '28/10/2025' or '24/12/2025 - 7/1/2026')"),
    name: z.string().describe("The name of the holiday (e.g., 'Εθνική Επέτειος', 'Διακοπές Χριστουγέννων')")
});

// Single semester schema
const SemesterSchema = z.object({
    name: z.string().describe("The name of the semester (e.g., 'ΧΕΙΜΕΡΙΝΟ ΕΞΑΜΗΝΟ', 'ΕΑΡΙΝΟ ΕΞΑΜΗΝΟ')"),
    classes_start: z.string().describe("The date classes begin"),
    classes_end: z.string().describe("The date classes end"),
});

const ExamsSchema = z.object({
    exams_start: z.string().describe("The date the exam period begins"),
    exams_end: z.string().describe("The date the exam period ends")
})

// Main schema (sub schemas will be inserted in this)(this will be converted to json)
const AcademicCalendarSchema = z.object({
    academic_year: z.string().describe("The academic year being described, e.g., '2025-2026'"),
    semesters: z.array(SemesterSchema).describe("A list of all the semesters detailed in the document"),
    holidays: z.array(HolidaySchema).describe("A list of all the public holidays and vacations (Αργίες - Διακοπές)"),
    exam_periods: z.array(ExamsSchema).describe("A list of the exam periods (ΕΞΕΤΑΣΤΙΚΗ ΠΕΡΙΟΔΟΣ) or (Επαναληπτική Εξεταστική)")
});


// PDF CONVERSION TO MARKDOWN

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
            file_id: upload.id, // tells the LLM which file to parse
            tier: 'agentic',  // sets the LLM to vision based parsing
            version: 'latest',
            expand: ['markdown']  // returns the output as markdown
        });

        return result.markdown.pages.map(page => page.markdown).join('\n\n---\n\n'); // returns the markdown as a whole instead of pages
    } catch (error){
        console.error("Error message: ", error)
        if (error.status) {
            console.error("Status Code:", error.status);
        }
        console.error("\nStack Trace:");
        console.error(error.stack);
    }
}

// creates gemini agent
const geminiAgent = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0, // sets creativity level to 0 (we only want facts from the markdown, no halucinations)
    apiKey: process.env.GOOGLE_API_KEY
});
// forces llm to return data to the form of the schema
const structuredLlmResponse = geminiAgent.withStructuredOutput(AcademicCalendarSchema);
const promptTemplate = ChatPromptTemplate.fromMessages([
    [
        "system", 
        `You are a data extraction expert.
        Your task is to extract the holidays (Αργίες - Διακοπές), the semesters (ΧΕΙΜΕΡΙΝΟ ΕΞΑΜΗΝΟ, ΕΑΡΙΝΟ ΕΞΑΜΗΝΟ) and the exam periods (ΕΞΕΤΑΣΤΙΚΗ ΠΕΡΙΟΔΟΣ, Επαναληπτική Εξεταστική).
        
        STRICT RULES:
        1. Adhere flawlessly to the expected schema layout.
        2. Do NOT invent, guess, or hallucinate dates or events. 
        3. ALL requested fields exist in the document. You must locate and extract every single piece of information required by the schema.`
    ],
    [
        "human", 
        "DOCUMENT TEXT TO PROCESS:\n{markdownData}"
    ]
]);

// Creates the pipe to gemini
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
    const filePath = "../pdfs/AKADHMAIKO.pdf";

    // call llama to convert pdf to markdown
    const rawMarkdown = await visionPdfToMarkdown(llamaAgent, filePath);

    // call gemini to convert markdown to schema
    const finalDictionary = await markdownToDictionary(rawMarkdown);

    return finalDictionary
}

var super_json = await runExtractionPipeline()
console.log(super_json)

if (super_json) { 
            // write zod object (final dictionary) to a json file with line breaks and 2 tabs
            const finalJsonString = JSON.stringify(super_json, null, 2);
            
            // path where the json will be saved
            const outputPath = "./academic_calendar.json";
            
            // 3. Write it to the hard drive!
            fs.writeFileSync(outputPath, finalJsonString, 'utf-8');
        } else {
            console.log("Pipeline finished, but no output");
        }