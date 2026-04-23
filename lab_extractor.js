import ExcelJS from 'exceljs';
import fs from 'fs';

async function parseExcelToJson() {
    const workbook = new ExcelJS.Workbook();
    // Point this to your actual Excel file
    await workbook.xlsx.readFile('./uploads/labs.xlsx'); 
    const worksheet = workbook.worksheets[0];

    // Αφαιρέθηκαν τα fallbacks του "General"
    const colorMap = {};
    
    // AUTO-DETECT COLORS FROM LEGEND
    worksheet.eachRow((row) => {
        row.eachCell((cell) => {
            const text = cell.text || '';
            const match = text.match(/^(\d+)ο εξάμηνο/i);
            
            if (match) {
                const semester = match[1]; // Extracts the number
                let detectedColor = null;

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

            let semester = colorMap[detectedColor];

            // ΑΝ ΤΟ ΕΡΓΑΣΤΗΡΙΟ ΔΕΝ ΕΧΕΙ ΧΡΩΜΑ ΠΟΥ ΑΝΤΙΣΤΟΙΧΕΙ ΣΕ ΕΞΑΜΗΝΟ, ΑΓΝΟΗΣΕ ΤΟ ΕΝΤΕΛΩΣ
            if (!semester) continue;

            // Initialize the course if it doesn't exist
            if (!courses[name]) {
                courses[name] = { name: name, semester: semester, data: [] };
            }

            courses[name].data.push({
                day: (col - 1).toString(),
                time: `${startTime}-${endTime}`,
                labhall: rowTimes[rowNumber].labhall
            });
        }
    });

    let finalJson = Object.values(courses);

    // dictionary mapping semesters to colors (Χωρίς το General)
    const semesterColors = {
        1: "#d90429", 
        2: "#d90429", 
        3: "#0077b6", 
        4: "#0077b6", 
        5: "#38b000", 
        6: "#38b000", 
        7: "#7b2cbf", 
        8: "#7b2cbf"
    };

    // maps each lab to itself with a color attribute
    finalJson = finalJson.map(singleLab => {
        const classColor = semesterColors[singleLab.semester] || "#2bff00";
        return {
            ...singleLab, 
            color: classColor 
        };
    });

    if (finalJson.length > 0) { 
        // Logic to determine if it's spring or winter based on the first course's semester
        const firstSem = finalJson[0].semester;
        const isNumeric = !isNaN(parseInt(firstSem));
        
        let outputPath;
        if (isNumeric && parseInt(firstSem) % 2 === 0) {
            outputPath = "./jsonData/spring_labs.json";
        } else {
            outputPath = "./jsonData/winter_labs.json";
        }

        fs.writeFileSync(outputPath, JSON.stringify(finalJson, null, 4), 'utf-8');
        console.log(`Successfully extracted lab schedule to ${outputPath}`);
        
    } else {
        console.log("No lab data extracted.");
    }
}

console.log("Starting lab schedule extraction...");
parseExcelToJson().catch(err => console.error("Extraction failed:", err));