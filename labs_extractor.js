import * as XLSX from 'xlsx';
import fs from 'fs';
// import { start } from 'repl';

// =====================================================================
//                        VIRTUAL GRID CREATION
// =====================================================================

function createFullVirtualGrid(excelPath) {
    const fileBuffer = fs.readFileSync(excelPath); // load the file into the buffer
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    // GET THE LAST ROW AND COLUMN USED (MAX COORDINATES)
    // initialize max row and column variables. these are used to set the grid size
    let maxRow = 0;
    let maxCol = 0;

    Object.keys(sheet).forEach(key => { // for each key
        if (key[0] === '!') return; // if the key is meta-data ignore it
        const coords = XLSX.utils.decode_cell(key); // get the coordinates of that key
        const cell = sheet[key]; // get the cell with those coordinates

        // Even if a cell has an empty string but exists, we consider it in bounds
        if (cell && cell.v !== undefined && cell.v !== null) {
            if (coords.r > maxRow) maxRow = coords.r; // check if the row is bigger than the current largest. if(true): substitute it
            if (coords.c > maxCol) maxCol = coords.c; // check if the column is bigger than the current largest. if(true): substitute it
        }
    });

    // CREATE THE GRID
    // This creates a 2D array (array of arrays) that is maxRow X maxCol size
    const grid = [];
    for (let r = 0; r <= maxRow; r++) {
        grid[r] = new Array(maxCol + 1).fill("");
    }

    // fills the grid with the values
    Object.keys(sheet).forEach(key => {
        if (key[0] === '!') return;
        const coords = XLSX.utils.decode_cell(key);
        grid[coords.r][coords.c] = cleanGreekString(sheet[key].v);
    });

    // unmerge the cells
    // This copies the value to all empty cells covered by a merge (THIS NEEDS CHANGE TO 'VALUE'_START AND 'VALUE'_END)
    if (sheet['!merges']) { // if merges exist
        sheet['!merges'].forEach(merge => { // for every merge
            const baseValue = grid[merge.s.r][merge.s.c]; // get the value of the block
            if (baseValue !== undefined && baseValue !== null && String(baseValue).trim() !== "") { // if the cell is not empty

                grid[merge.s.r][merge.s.c] = `${baseValue}_START`; // append the value to the starting cell as {value}_START

                if (merge.e.r <= maxRow && merge.e.c <= maxCol) { // if the end is in range
                    grid[merge.e.r][merge.e.c] = `${baseValue}_END`; // append the value to the ending cell as {value}_END
                }
            }
        });
    }

    return grid; // return the final 2D grid
}

// =====================================================================
//              GETS COURSE TITLES AND SEMESETERS FROM JSON
// =====================================================================

// function for titles
function extractSemestersFromJSON(jsonPath) {
    // reads json
    const rawData = fs.readFileSync(jsonPath, 'utf8');

    // parse json into string
    const schedule = JSON.parse(rawData);

    // maps each course object to its title and semester and returns the new array
    const courses = schedule.map(course => {
        return {
            title: course.title,
            semester: course.semester
        };
    });

    return courses;
}

function cleanGreekString(str) {
    if (!str) return "";
    return str
        .toString()
        .normalize("NFD")                   // separate letters from accents
        .replace(/[\u0300-\u036f]/g, "")    // Remove accents
        .replace(/\\n/g, " ")               // Replace literal "\n"
        .replace(/\s+/g, " ")               // Collapse all whitespaces/real newlines
        .trim()                             // delete whitespace from start and end
        .toUpperCase();
}

// matches subject names from the grid, to subject names from the JSON
function getSubjectMatch(rawGridValue, officialSubjects) {
    const cleanedGridName = cleanGreekString(rawGridValue.replace('_START', '').replace('_END', ''));

    if (cleanedGridName.length < 3) return false; // Safety for very short strings

    const found = officialSubjects.find(subject => {
        const cleanedOfficialName = cleanGreekString(subject.title);

        // Return true if one name is inside the other (bidirectional)
        return cleanedOfficialName.includes(cleanedGridName)
    });

    // If found, return an object with the course title and semester
    if (found) {
        return {
            title: found.title,
            semester: found.semester
        };
    }

    // if not found
    return false;
}

// =====================================================================
//                             MAIN FUNCTION
//                     DATA ECTRACTION FROM XSLX XSL
// =====================================================================

function extractData(virtualGrid, officialSubjects) {
    let startOfSchedule = 0;
    let daysRow = 0;
    const finalResults = [];

    // Find the row that holds the days, and the row that the schedule starts from
    for (let i = 0; i < virtualGrid.length; i++) {
        if (cleanGreekString(virtualGrid[i][0]) === "ΩΡΕΣ") {
            daysRow = i;
            startOfSchedule = i + 1;
            break;
        }
    }

    // hold the first column to cross reference for times
    const timeColumn = virtualGrid.map(row => row[0]);
    const maxCol = virtualGrid[0].length;

    // Loop through Columns (Monday = 1 to Friday = 5)
    for (let col = 1; col <= 5; col++) {
        const currentDay = virtualGrid[daysRow][col];
        let currentRoom = "";
        let pendingStartTime = "";

        for (let row = startOfSchedule; row < virtualGrid.length; row++) {
            const timeCell = timeColumn[row];
            const cellValue = virtualGrid[row][col];

            // Update Room: If column 0 has text but no colon, it's a room name
            if (timeCell && !timeCell.includes(':')) {
                currentRoom = timeCell.trim();
                continue;
            }

            if (!cellValue) continue;   // if cell is empty go to the next one

            // Detect Start of Session
            if (cellValue.endsWith('_START')) pendingStartTime = timeCell.split('-')[0].trim(); // Get "09:00" from "09:00-10:00"

            // Detect End of Session and Save
            if (cellValue.endsWith('_END')) {
                const match = getSubjectMatch(cellValue, officialSubjects);

                if (match !== false && pendingStartTime) {
                    const endTime = timeCell.split('-')[1].trim();

                    // search if the match already exist
                    let existingCourse = finalResults.find(course => course.name === match.title);

                    if (!existingCourse) { // if it has not been found yet
                        finalResults.push({
                            name: match.title,
                            semester: `${match.semester}`,
                            data: [{
                                day: `${col}`,
                                time: `${pendingStartTime}-${endTime}`,
                                labhall: currentRoom
                            }]
                        });
                    } else { // if it has been found before
                        // create newData object
                        const newData = {
                            day: `${col}`,
                            time: `${pendingStartTime}-${endTime}`,
                            labhall: currentRoom
                        };

                        // push newData to data array of object
                        existingCourse.data.push(newData);
                    }
                }
                pendingStartTime = null; // Clear for next session
            }
        }
    }
    return finalResults;
}

// =====================================================================
//                           EXECUTE EXTRACTOR
// =====================================================================

// initialisation of paths
const excelPath = 'uploads/LAB_TIMETABLE_XEIM_2025_06_10_2025.xlsx';
// const excelPath = 'uploads/LAB_TIMETABLE_EARINO_2026.xls';
const jsonPath = 'jsonData/merged_schedule.json';

try {
    const officialSubjects = extractSemestersFromJSON(jsonPath);
    const grid = createFullVirtualGrid(excelPath);

    let finalResult = extractData(grid, officialSubjects);

    let outputPath = ''

    if (finalResult){

        const semesterColors = {
        "1": "#d90429", 
        "2": "#d90429", 
        "3": "#0077b6", 
        "4": "#0077b6", 
        "5": "#38b000", 
        "6": "#38b000", 
        "7": "#7b2cbf", 
        "8": "#7b2cbf"
        };

        // maps each lab to itself with a color attribute
        finalResult = finalResult.map(singleLab => {
            const classColor = semesterColors[singleLab.semester] || "#2bff00";
            return {
                ...singleLab, 
                color: classColor 
            };
        });

        if (Number(finalResult[0].semester) % 2 === 0){
            outputPath = 'jsonData/spring_labs.json';
        } else {
            outputPath = 'jsonData/winter_labs.json';
        }

    } else {
        console.error("Extractor returned empty array")
    }

    fs.writeFileSync(outputPath, JSON.stringify(finalResult, null, 2), 'utf8');
    console.log(`Success! Extracted ${finalResult.length} lab sessions to ${outputPath}`);
    console.log(finalResult)
} catch (error) {
    console.error("Error during extraction:", error.message);
}