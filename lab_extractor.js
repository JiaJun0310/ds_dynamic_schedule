import ExcelJS from 'exceljs';
import fs from 'fs';

async function parseExcelToJson() {
    const workbook = new ExcelJS.Workbook();
    // Point this to your actual Excel file
    await workbook.xlsx.readFile('./uploads/labs.xlsx'); 
    const worksheet = workbook.worksheets[0];

    // Initialize with fallbacks for plain black text
    const colorMap = {
        'FF000000': "General", 
        'Theme-7':  "General"  
    };

    
    // AUTO-DETECT COLORS FROM LEGEND
    worksheet.eachRow((row) => {
        row.eachCell((cell) => {
            const text = cell.text || '';
            // Look for cells that say "2ο εξάμηνο", "4ο εξάμηνο", etc.
            const match = text.match(/^(\d+)ο εξάμηνο/i);
            
            if (match) {
                const semester = match[1]; // Extracts the number
                let detectedColor = null;

                // Extract the color just like we do for the classes
                if (cell.font && cell.font.color) {
                    if (cell.font.color.argb) detectedColor = cell.font.color.argb;
                    else if (cell.font.color.theme !== undefined) detectedColor = `Theme-${cell.font.color.theme}`;
                } else if (cell.value && cell.value.richText && cell.value.richText[0].font && cell.value.richText[0].font.color) {
                    const rc = cell.value.richText[0].font.color;
                    if (rc.argb) detectedColor = rc.argb;
                    else if (rc.theme !== undefined) detectedColor = `Theme-${rc.theme}`;
                }

                if (detectedColor) {
                    colorMap[detectedColor] = semester;
                }
            }
        });
    });

    console.log("Auto-Detected Color Map:", colorMap);

    const courses = {};
    let currentLabHall = "";
    const rowTimes = {};

    // 2. Map rows to time slots and lab halls
    worksheet.eachRow((row, rowNumber) => {
        const cellA = row.getCell(1).text || '';
        
        if (cellA.includes('ΕΡΓΑΣΤ') || cellA.includes('ΝΕΟΚΛΑΣΙΚΟ')) {
            currentLabHall = cellA.replace(/\n/g, ' ').trim();
        }
        
        if (cellA.includes('-')) {
            rowTimes[rowNumber] = {
                time: cellA.trim(),
                labhall: currentLabHall
            };
        }
    });

    // 3. Extract schedule data 
    worksheet.eachRow((row, rowNumber) => {
        if (!rowTimes[rowNumber]) return;

        for (let col = 2; col <= 6; col++) {
            const cell = row.getCell(col);

            if (!cell.value) continue;
            if (cell.isMerged && cell.address !== cell.master.address) continue; 

            let endRow = rowNumber;
            while (
                worksheet.getCell(endRow + 1, col).isMerged && 
                worksheet.getCell(endRow + 1, col).master.address === cell.address
            ) {
                endRow++;
            }

            const name = cell.text.replace(/\n/g, ' ').trim();
            const startTime = rowTimes[rowNumber].time.split('-')[0];
            const endTime = rowTimes[endRow].time.split('-')[1];
            
            
            let detectedColor = "None";
            
            if (cell.font && cell.font.color) {
                if (cell.font.color.argb) {
                    detectedColor = cell.font.color.argb;
                } else if (cell.font.color.theme !== undefined) {
                    detectedColor = `Theme-${cell.font.color.theme}`; 
                }
            } else if (cell.value && cell.value.richText && cell.value.richText[0].font && cell.value.richText[0].font.color) {
                const rc = cell.value.richText[0].font.color;
                if (rc.argb) detectedColor = rc.argb;
                else if (rc.theme !== undefined) detectedColor = `Theme-${rc.theme}`;
            }

            let semester = colorMap[detectedColor] || `Unknown (${detectedColor})`;

            // Initialize the course if it doesn't exist
            if (!courses[name]) {
                courses[name] = { name: name, semester: semester, data: [] };
            } else {
                // Update semester if we found a colored instance of a class that was previously marked General/Unknown
                if ((courses[name].semester === "General" || courses[name].semester.startsWith('Unknown')) && !semester.startsWith('Unknown') && semester !== "General") {
                    courses[name].semester = semester;
                }
            }

            courses[name].data.push({
                day: (col - 1).toString(),
                time: `${startTime}-${endTime}`,
                labhall: rowTimes[rowNumber].labhall
            });
        }
    });

    // // 4. Save to JSON
    // const finalJson = Object.values(courses);
    // fs.writeFileSync('jsonData/labs.json', JSON.stringify(finalJson, null, 4));
    // console.log("Successfully extracted lab schedule to jsonData/labs.json");


// 4. Prepare the final data
    const finalJson = Object.values(courses);

    if (finalJson.length > 0) { 
        // Logic to determine if it's spring or winter based on the first course's semester
        // We handle "General" or numeric semesters
        const firstSem = finalJson[0].semester;
        const isNumeric = !isNaN(parseInt(firstSem));
        
        let outputPath;
        if (isNumeric && parseInt(firstSem) % 2 === 0) {
            outputPath = "./jsonData/spring_labs.json";
        } else {
            // Defaults to winter for General or odd numbers
            outputPath = "./jsonData/winter_labs.json";
        }

        fs.writeFileSync(outputPath, JSON.stringify(finalJson, null, 4), 'utf-8');
        console.log(`Successfully extracted lab schedule to ${outputPath}`);
        
        // Also save to a generic labs.json if your frontend specifically looks for that
        fs.writeFileSync("./jsonData/labs.json", JSON.stringify(finalJson, null, 4), 'utf-8');
    } else {
        console.log("No lab data extracted.");
    }
}

console.log("Starting lab schedule extraction...");
parseExcelToJson().catch(err => console.error("Extraction failed:", err));