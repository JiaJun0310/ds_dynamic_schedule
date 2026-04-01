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
    lectureHall: z.array(z.string()).describe("The room number of the class corresponding to the day(s) (e.g., 'ΚΕΚΤ-103', 'ΓΛ21-104')"),
    daysOfWeek: z.array(z.number()).describe("A list of days the class takes place (e.g., ['Δευτέρα', 'Τετάρτη'] is [1,3], [ΠΕΜΠΤΗ] is [4])"),
    startTime: z.array(z.string()).describe("A list of starting time(s) corresponding to the day(s) (e.g., ['09:15:00'], ['11:15:00', '12:15:00'])"),
    endTime: z.array(z.string()).describe("A list of ending time(s) corresponding to the day(s) (e.g., ['13:00:00', '14:00:00'], ['14:00:00'])"),
    semester: z.number().describe("The numerical semester this class belongs to (e.g., 1, 2, 5, 8)"),
    professor: z.array(z.string()).describe("A list of the professors teaching this course not corresponding to the days (e.g., ['ΦΙΛΙΠΠΑΚΗΣ Μ.'], ['ΜΗΛΙΩΝΗΣ Α.', 'ΑΝΑΣΤΑΣΟΠΟΥΛΟΣ Α.'])")
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
                custom_prompt: `You are extracting data from a university schedule. It is ABSOLUTELY CRITICAL that semester information is never lost.
                
                STRICT RULES FOR EVERY PAGE:
                1. Look for the exact text "ΠΡΟΓΡΑΜΜΑ ΔΙΔΑΣΚΑΛΙΑΣ (ΕΞΑΜΗΝΟ: [NUMBER])" at the top of the pages.
                2. When you see it, you MUST output it as a Markdown header: "### ΕΞΑΜΗΝΟ: [NUMBER]" before you draw the HTML table.
                3. DO NOT hallucinate, guess, or invent semester numbers. NEVER output a semester number that is not explicitly written on that specific page.
                4. If a table spills over onto a new page and there is no "ΕΞΑΜΗΝΟ" text on that new page, just continue the HTML table normally without adding a new header.`            }
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
        7. SEMESTER: The semester number of each subject inside a table should be picked according to the header above the table stating ΠΡΟΓΡΑΜΜΑ ΔΙΔΑΣΚΑΛΙΑΣ (ΕΞΑΜΗΝΟ: X).`
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
    const filePath = "./uploads/schedule1.pdf";

    // call llama to convert pdf to markdown
    const rawMarkdown = await visionPdfToMarkdown(llamaAgent, filePath);
    console.log(rawMarkdown)

    // call gemini to convert markdown to schema
    const finalDictionary = await markdownToDictionary(rawMarkdown);

    return finalDictionary
}

var super_json = await runExtractionPipeline()

if (super_json) {
    // open the wrapper langchain returns
    let subjectsArray = super_json.subjects || super_json; // || super_json is a saftey net in case super_json is already an array

    // dictionary mapping semesters to colors
    const semesterColors = {
        1: "#a22323", // semester 1 = dark red
        2: "#a22323", // semester 2 = dark red
        3: "#10436e", // semester 3 = dark blue
        4: "#10436e", // semester 4 = dark blue
        5: "#4e4e4d", // semester 5 = gray
        6: "#4e4e4d", // semester 6 = gray
        7: "#5e226e",  // semester 7 = nice purple
        8: "#5e226e"  // semester 8 = nice purple
    };

    // maps each subject to itself with a color attribute
    subjectsArray = subjectsArray.map(singleClass => {
         
        // for each subject, classColor gets a value depending on the semester of the class
        // if the semester number is not in the dictionary above it gets neon green
        // neon green means gemini hallucinated a value. neon green is bad. we don't want neon green in any case!!!
        const classColor = semesterColors[singleClass.semester] || "#2bff00";

        return {
            ...singleClass, // ... unpacks the objects inside singleClass and passes them as attributes to the new class instead of passing single class as a whole
            color: classColor // adds the color
        };
    });

    // write zod object (final dictionary) to a json file with line breaks and 2 tabs
    const finalJsonString = JSON.stringify(subjectsArray, null, 2);

    if (subjectsArray.length > 0) { // if there was an output
        if (subjectsArray[0].semester % 2 === 0) {
            // path where the json will be saved
            const outputPath = "./jsonData/spring_schedule.json";

            // save the file to jsonData
            fs.writeFileSync(outputPath, finalJsonString, 'utf-8');
        } else {
            // path where the json will be saved
            const outputPath = "./jsonData/winter_schedule.json";

            // save the file to jsonData
            fs.writeFileSync(outputPath, finalJsonString, 'utf-8');
        }
    } else { // if list was empty
        console.log("Pipeline finished, but list is empty")
    }

} else {
    console.log("Pipeline finished, but no output");
} 