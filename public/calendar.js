//GLOBAL VARIABLES
let calendar;
let academicData = null;
let eventTracker = {};
let currentMode = "Μαθήματα"; //hardcode the default radio button

//DOM ELEMENTS
const popup = document.getElementById("eventPopup"); //pop up for when you click on an event
const titleEl = document.getElementById("popTitle");
const profEl = document.getElementById("popProfessor");
const hallEl = document.getElementById("popHall");
const timeEl = document.getElementById("popTime"); //until here it's pop up stuff
const colorBtn = document.getElementById("colorBtn"); //the picker
const hiddenPicker = document.getElementById("hiddenPicker");
const clearSelectionBtn = document.getElementById("clearSelection");
const toggleScreenBtn = document.getElementById("toggleScreen");

//UTILITIES
const getSavedSchedule = () =>
    JSON.parse(localStorage.getItem("userSchedule")) || []; //returns everything saved on local storage or null if it's empty
const saveSchedule = (scheduleArray) =>
    localStorage.setItem("userSchedule", JSON.stringify(scheduleArray));

const getSavedExams = () => JSON.parse(localStorage.getItem("userExams")) || []; //local storage same as above but for exams
const saveExams = (examsArray) =>
    localStorage.setItem("userExams", JSON.stringify(examsArray));

const formatJSONDate = (dateStr) => {
    //this takes a date from 5/9/2023 to 2023-09-05
    const [day, month, year] = dateStr.trim().split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const getSemesterDates = (semesterNum) => {
    //finds start and end of semester based on if semester is odd or even
    if (!academicData || !semesterNum) return null;
    const isOdd = parseInt(semesterNum) % 2 !== 0;
    const semData = academicData.semesters[isOdd ? 0 : 1];
    return {
        start: formatJSONDate(semData.classes_start),
        end: formatJSONDate(semData.classes_end),
    };
};

//API FETCHERS
async function fetchAcademicData() {
    //gets data from academic_calendar.json
    try {
        const response = await fetch("/jsonData/academic_calendar.json");
        if (!response.ok) throw new Error("File not found");
        academicData = await response.json();
    } catch (err) {
        console.error("Error loading local JSON:", err);
    }
}

//get's data of class based on title
async function fetchCourseData(title) {
    const res = await fetch("/getClass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
    });
    return res.ok ? res.json() : { schedules: [] };
}

//get's exam data
async function fetchExamData(title) {
    try {
        const res = await fetch("/getExam", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title }),
        });
        if (res.ok) {
            const data = await res.json();
            return data.exam;
        }
    } catch (e) {
        console.warn(`No exam found for: ${title}`);
    }
    return null;
}

//EVENT HANDLERS
function handleEventClick(info) {
    //handles clicking on an event and dialog appearing
    popup.showModal();
    const event = info.event;
    const props = event.extendedProps;
    const start = event.start.toLocaleTimeString("el-GR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
    });
    const end = event.end.toLocaleTimeString("el-GR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
    });

    titleEl.innerText = event.title;
    profEl.innerText = props.professor || "N/A";
    if (hallEl) hallEl.innerText = props.lectureHall || "N/A";
    timeEl.innerText = `${start} - ${end}`;

    const targetSubject =
        props.subjectTitle || event.title.replace("ΕΞΕΤΑΣΗ: ", "").trim(); //something to do with exams and dialog (I don't think it does anything)

    hiddenPicker.oninput = () =>
        updateCourseColor(targetSubject, hiddenPicker.value);
}

//this function haddles apearance of the exam page
async function examOptions() {
    //most of the standard html element we need for the function
    const semesters = document.getElementById("semesters");
    const examsBox = document.getElementById("examsBox");
    const normalExam = document.getElementById("normalExam");
    const embolimExam = document.getElementById("embolimExam");

    //This handless the simple options of disapearing and apearing the divs depending on the radio buttons clicked 
    if (currentMode === "Εξεταστική") {
        semesters.style.display = "none";
        examsBox.style.display = "flex";
    }
    if (currentMode === "Μαθήματα") {   //this re apears everything when pressing Μαθήματα
        const semesterWrappers = Array.from(
            document.querySelectorAll(".semesterButtonDivWrapper"),
        );
        semesters.innerHTML = "";
        semesterWrappers.sort((a, b) => a.dataset.index - b.dataset.index); //sorts the divs so they are added in the correct order

        semesterWrappers.forEach((semester) => {
            semesters.append(semester);
        });

        semesters.style.display = "flex";
        examsBox.style.display = "none";
    }
    let isWinter = 0
    try {
        const response = await fetch("/getSemesterOfExams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(),
        });

        if (!response.ok) {
            throw new Error("Failed to fetch semester's exams");
        }

        isWinter = await response.json();
    } catch (error) {
        alert("Something went wrong");
    }

    // const isWinter = true; //TO BE DELETED

    let isNormalClicked = false;
    let isEmbolimClicked = false;   //tracked what tabs are open and which are closed 

    normalExam.onclick = async () => {  //this button apears the div below the normal exams
        isNormalClicked = !isNormalClicked;
        const normalExamDiv = document.getElementById("normalExamDiv");

        if (isNormalClicked) {  //changes the display setting
            normalExamDiv.style.display = "block";

            if (isWinter) {     //this is the adding logic for the semester depending on the API's answer
                const winterSemesters =
                    document.querySelectorAll(".winterSemesters");

                winterSemesters.forEach((semester) => {
                    normalExamDiv.append(semester);
                });
            } else {
                const springSemesters =
                    document.querySelectorAll(".springSemesters");

                springSemesters.forEach((semester) => {
                    normalExamDiv.append(semester);
                });
            }
        } else {    //removes the divs
            normalExamDiv.style.display = "none";
        }
    };

    embolimExam.onclick = async () => { //this button apears the div below the embolim exams
        isEmbolimClicked = !isEmbolimClicked;
        const embolimExamDiv = document.getElementById("embolimExamDiv");

        if (isEmbolimClicked) { //changes the display setting
            embolimExamDiv.style.display = "block";

            if (!isWinter) {    //this is the adding logic for the semester depending on the API's answer
                const winterSemesters =
                    document.querySelectorAll(".winterSemesters");

                winterSemesters.forEach((semester) => {
                    embolimExamDiv.append(semester);
                });
            } else {
                const springSemesters =
                    document.querySelectorAll(".springSemesters");

                springSemesters.forEach((semester) => {
                    embolimExamDiv.append(semester);
                });
            }
        } else {    //removes the divs
            embolimExamDiv.style.display = "none";
        }
    };
}

// Listen for clicks on the radio buttons
document.querySelectorAll('input[name="choice"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
        currentMode = e.target.value;

        // Clean up the UI: Close all open semester tabs when switching modes
        document.querySelectorAll(".buttonDiv").forEach((btn) => {
            let sem = btn.textContent.trim().slice(-1);
            document.getElementById(`Semester${sem}`).innerHTML = ""; // Empty the list
            let arrow = btn.querySelector(".pointer");
            if (arrow) arrow.src = "../images/right_pointer.svg";
            btn.dataset.open = "false"; // Reset our tracking variable
        });

        examOptions(); //this function haddles apearance of the exam page
    });
});

function updateCourseColor(subjectTitle, newColor) {
    //updates courses color after clicking with color picker
    let currentSchedule = getSavedSchedule();
    let courseIndex = currentSchedule.findIndex(
        (c) => c.title === subjectTitle,
    );
    if (courseIndex !== -1) {
        currentSchedule[courseIndex].color = newColor;
        saveSchedule(currentSchedule);
    }

    calendar.getEvents().forEach((e) => {
        const eventSubject =
            e.extendedProps.subjectTitle ||
            e.title.replace("ΕΞΕΤΑΣΗ: ", "").trim(); //I think this is supposed to change the colors of courses as well as the exam course but
        if (eventSubject === subjectTitle) {
            //I don't think it works corectly because it uses forEach .getEvent that only takes events currently on screen
            e.setProp("backgroundColor", newColor);
            e.setProp("borderColor", newColor);
        }
    });
}

async function handleCourseToggle(checkbox, targetTitle, sem) {
    //new function to clear up callback hell, just does the toggling for the checkboxes
    checkbox.disabled = true;
    try {
        if (checkbox.checked) {
            await addCourseToCalendar(targetTitle, sem);
        } else {
            removeCourseFromCalendar(targetTitle);
        }
    } catch (error) {
        console.error("Error updating schedule:", error);
    } finally {
        setTimeout(() => (checkbox.disabled = false), 250);
    }
}

async function addCourseToCalendar(targetTitle, sem) {
    //new function, again, does the whole adding stuff to the calendar just made cleaner with a function
    const courseData = await fetchCourseData(targetTitle);

    const dates = getSemesterDates(sem);
    if (!eventTracker[targetTitle]) eventTracker[targetTitle] = [];

    let dbColor =
        courseData.schedules.length > 0
            ? courseData.schedules[0].color
            : "#3788d8"; //color logic if user has picked a color, use that else use db color, if no db color use blue
    let saved = getSavedSchedule();
    const isAlreadySaved = saved.some((c) => c.title === targetTitle);
    const eventColor = isAlreadySaved
        ? saved.find((c) => c.title === targetTitle).color
        : dbColor;

    if (!isAlreadySaved) {
        //if not aleady saved, saves it to local storage with the necessary data
        hiddenPicker.value = eventColor;
        saved.push({ title: targetTitle, color: eventColor, semester: sem });
        saveSchedule(saved);
    }

    courseData.schedules.forEach((item) => {
        //add's all courses (per index) to the calendar
        let addedEvent = calendar.addEvent({
            title: item.title,
            daysOfWeek: item.daysOfWeek || [item.day],
            startTime: item.startTime || item.start,
            endTime: item.endTime || item.end,
            startRecur: dates ? dates.start : null,
            endRecur: dates ? dates.end : null,
            backgroundColor: eventColor,
            borderColor: eventColor,
            extendedProps: {
                //extended props just saves some extra data to be used later, mostly at the download calendar button
                professor: item.professor,
                lectureHall: item.lectureHall,
                subjectTitle: targetTitle,
                semester: sem,
                rawStart: item.startTime || item.start,
                rawEnd: item.endTime || item.end,
            },
        });
        eventTracker[targetTitle].push(addedEvent);
    }); //push event to eventTracker
}

function addExamToCalendar(examData, targetTitle, color) {
    //adds exam to calendar
    const examTitle = "ΕΞΕΤΑΣΗ: " + examData.title;
    let existingExamEvent = calendar
        .getEvents()
        .find((e) => e.title === examTitle);

    if (!existingExamEvent) {
        //if it doesn't already exist in the calendar, push it
        let addedExam = calendar.addEvent({
            title: examTitle,
            start: examData.start,
            end: examData.end,
            color: color,
            extendedProps: {
                subjectTitle: targetTitle,
                lectureHall: examData.location,
                description: examData.description,
                isExam: true,
            },
        });
        eventTracker[targetTitle].push(addedExam); //add it to event tracker
    } else {
        existingExamEvent.setProp("backgroundColor", color);
        existingExamEvent.setProp("borderColor", color);
        if (!eventTracker[targetTitle].includes(existingExamEvent)) {
            eventTracker[targetTitle].push(existingExamEvent);
        }
    }
}

function removeCourseFromCalendar(targetTitle) {
    //removes and event from the calendar
    if (eventTracker[targetTitle]) {
        eventTracker[targetTitle].forEach((eventObj) => eventObj?.remove());
        delete eventTracker[targetTitle];
    }
    let saved = getSavedSchedule();
    saveSchedule(saved.filter((c) => c.title !== targetTitle));
}

function addStandaloneExam(examData) {
    const examTitleStr = "ΕΞΕΤΑΣΗ: " + examData.title;

    // 1. Convert the DD/MM/YYYY date to YYYY-MM-DD using your existing helper
    const formattedDate = formatJSONDate(examData.date); 
    
    // 2. Combine date and time into valid ISO8601 strings for FullCalendar
    const startISO = `${formattedDate}T${examData.startTime}`;
    const endISO = `${formattedDate}T${examData.endTime}`;
    
    // 3. Convert the lectureHall array into a single comma-separated string
    const hallString = Array.isArray(examData.lectureHall) 
        ? examData.lectureHall.join(", ") 
        : examData.lectureHall || "N/A";

    // Safety check, don't add if it already exists
    let existing = calendar.getEvents().find((e) => e.title === examTitleStr);

    if (!existing) {
        let addedExam = calendar.addEvent({
            title: examTitleStr,
            start: startISO,  // Now using the formatted string
            end: endISO,      // Now using the formatted string
            color: "#e74c3c",
            extendedProps: {
                lectureHall: hallString, // Now using the joined array
                description: examData.division ? `Κλιμάκιο: ${examData.division}` : "", // Using division for the description
                isExam: true,
            },
        });

        // Save it to the eventTracker
        if (!eventTracker[examTitleStr]) eventTracker[examTitleStr] = [];
        eventTracker[examTitleStr].push(addedExam);

        //Save to Local Storage
        let saved = getSavedExams();
        if (!saved.some((e) => e.title === examData.title)) {
            saved.push(examData); 
            saveExams(saved);
        }
    }
}

function removeStandaloneExam(title) {
    const examTitleStr = "ΕΞΕΤΑΣΗ: " + title;

    // Remove from visual calendar and tracker
    if (eventTracker[examTitleStr]) {
        eventTracker[examTitleStr].forEach((eventObj) => eventObj?.remove());
        delete eventTracker[examTitleStr];
    }

    // --- NEW: Remove from Local Storage ---
    let saved = getSavedExams();
    saveExams(saved.filter((e) => e.title !== title));
}

//INITIALIZATION of calendar
document.addEventListener("DOMContentLoaded", async function () {
    const calendarEl = document.getElementById("calendar");

    calendar = new FullCalendar.Calendar(calendarEl, {
        timeZone: "Europe/Athens",
        initialView: "timeGridWeek",
        locale: "el",
        firstDay: 1,
        slotMinTime: "08:00:00",
        slotMaxTime: "21:00:00",
        allDaySlot: false,
        nowIndicator: true,
        height: "auto",
        buttonText: { today: "Σήμερα" },
        customButtons: {
            downloadBtn: { text: "Λήψη (ICS)", click: downloadCalendar },
            viewBtn: { text: "Εξάμηνα", click: hideList },
        },
        headerToolbar: {
            left: "",
            center: "title",
            right: "downloadBtn today prev,next viewBtn",
        },
        eventClick: handleEventClick,
        eventDidMount: function (info) {
            //this here handles holidays
            if (info.event.display === "background") return; //this draws the holidays in the calendar
            const occurrenceStart = info.event.start.getTime();
            const isOnHoliday = calendar.getEvents().some((h) => {
                //in this function we check if events lands on a holiday if it does we do not make it apear
                if (h.groupId !== "holidays") return false;
                const hStart = h.start.getTime();
                const hEnd = h.end ? h.end.getTime() : hStart + 86400000;
                return occurrenceStart >= hStart && occurrenceStart < hEnd;
            });
            if (isOnHoliday) info.el.style.display = "none";
        },
    });

    calendar.render(); //Makes calendar visible
    await fetchAcademicData();

    // Populate Holidays, this code gives names, dates and data to the holidays
    if (academicData?.holidays) {
        academicData.holidays.forEach((holiday) => {
            let start = holiday.date,
                end = null;
            if (holiday.date.includes(" - ")) {
                [start, end] = holiday.date.split(" - ");
            }
            calendar.addEvent({
                title: holiday.name,
                allDay: true,
                display: "background",
                color: "#a95b71",
                groupId: "holidays",
                start: formatJSONDate(start),
                end: end ? formatJSONDate(end) : undefined,
            });
        });
    }

    // Load saved classes
    const savedClasses = getSavedSchedule();
    for (const item of savedClasses) {
        await addCourseToCalendar(item.title, item.semester);
        updateCourseColor(item.title, item.color); // Ensure custom colors persist
    }

    //Load saved standalone exams
    const savedExams = getSavedExams();
    for (const examData of savedExams) {
        addStandaloneExam(examData);
    }

    appearCalendar(); //refresh calendar to show events
    resize();
});

//UI EVENT LISTENERS
popup.onclick = (e) => {
    if (e.target === popup) popup.close();
};
colorBtn.onclick = () => hiddenPicker.click();

clearSelectionBtn.onclick = () => {
    //button that clears all selections
    Object.values(eventTracker).forEach((events) =>
        events.forEach((e) => e?.remove()),
    );
    eventTracker = {};
    document
        .querySelectorAll(".checkbox")
        .forEach((cb) => (cb.checked = false));
    document
        .querySelectorAll(".colorBtn")
        .forEach((cp) => (cp.style.display = "none"));

    // Clear both local storages
    localStorage.removeItem("userSchedule");
    localStorage.removeItem("userExams");
};

document.querySelectorAll(".buttonDiv").forEach((button) => {
    //this selects eveything from all the "buttons"
    button.dataset.open = "false"; // We use this instead of 'let pressed = false' so it doesn't break when switching tabs

    //we save the data like semester for every button
    let cleanText = button.textContent.trim();
    let sem = cleanText[cleanText.length - 1];
    let arrow = button.querySelector(".pointer");
    const SemesterDiv = document.getElementById(`Semester${sem}`);

    button.onclick = async function () {
        //this now goes in to spesific button clicked
        // Toggle the open state
        let isOpen = button.dataset.open === "true";
        isOpen = !isOpen;
        button.dataset.open = isOpen.toString();

        arrow.src = isOpen
            ? "../images/down_pointer.svg"
            : "../images/right_pointer.svg";

        if (!isOpen) {
            //if it was already open it just clear it's html
            SemesterDiv.innerHTML = ``;
            return;
        }

        // This gets executed when the button was clicked and the radio button was on "Μαθήματα"
        if (currentMode === "Μαθήματα") {
            //here we get all the data for each Semester
            const res = await fetch("/getSemester", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ semester: sem }),
            });
            const data = await res.json(); //we save the data here
            const titlesArray = data.titles.map((course) => course.title); //and the titles in an array

            const savedClasses = getSavedSchedule();

            //creates for each title in title array a div with a pargaraph and a checkbox in it so it generates everything dinamicly
            titlesArray.forEach((title, i) => {
                const div = document.createElement("div");
                div.className = "course";

                const p = document.createElement("p");
                p.textContent = title;

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.className = "checkbox";
                checkbox.checked = savedClasses.some(
                    (saved) => saved.title === title,
                );

                div.append(p, checkbox);
                SemesterDiv.appendChild(div);

                setTimeout(() => div.classList.add("visible"), i * 50);

                div.onclick = (e) => {
                    //ckeckbox logic on the div
                    if (checkbox.disabled || e.target === checkbox) return;
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event("change"));
                };

                checkbox.onchange = () =>
                    handleCourseToggle(checkbox, title, sem);
            });
        }

        // This gets executed when the button was clicked and the radio button was on "Εξεταστική"
        else if (currentMode === "Εξεταστική") {
            const res = await fetch("/getSemesterExams", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ semester: sem }),
            });
            const examsArray = await res.json(); // This expects an array of your Exam JSON objects

            const currentlySavedExams = getSavedExams();

            examsArray.forEach((examData, i) => {
                const div = document.createElement("div");
                div.className = "course"; // You can keep the same class for styling

                const p = document.createElement("p");
                p.textContent = examData.title; // e.g., "ΨΣ-532-ΠΡΟΗΓΜΕΝΑ..."

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.className = "checkbox";

                checkbox.checked = currentlySavedExams.some(
                    (saved) => saved.title === examData.title,
                );

                // Check if this exact exam is already on the calendar
                const examTitleStr = "ΕΞΕΤΑΣΗ: " + examData.title;
                checkbox.checked = calendar
                    .getEvents()
                    .some((e) => e.title === examTitleStr);

                div.append(p, checkbox);
                SemesterDiv.appendChild(div);

                setTimeout(() => div.classList.add("visible"), i * 50);

                div.onclick = (e) => {
                    if (checkbox.disabled || e.target === checkbox) return;
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event("change"));
                };

                checkbox.onchange = () => {
                    if (checkbox.checked) {
                        addStandaloneExam(examData);
                    } else {
                        removeStandaloneExam(examData.title);
                    }
                };
            });
        }
    };
});

//ICS EXPORT
//this is the dark side of our code, we dont know exacty how it works but it uses the library https://github.com/nwcell/ics.js/ to make a ics file
//for the rest of this function gemini added the comments because I dont understand it
function downloadCalendar() {
    // 1. Initialize the ICS generator and get all current calendar events
    const cal = ics();
    const events = calendar.getEvents();
    if (events.length === 0) return; // Stop if the calendar is empty

    // 2. Find all holidays and list every single day they cover so we can skip classes on those dates
    const excludedDates = [];
    events
        .filter((e) => e.groupId === "holidays")
        .forEach((h) => {
            let current = new Date(h.start);
            let end = h.end ? new Date(h.end) : new Date(h.start);
            if (!h.end) end.setDate(end.getDate() + 1); // If holiday is 1 day, make sure the loop runs once

            while (current < end) {
                const pad = (n) => (n < 10 ? "0" + n : n); // Adds a leading zero (e.g., 9 becomes "09")
                const dateStr = `${current.getFullYear()}${pad(current.getMonth() + 1)}${pad(current.getDate())}`;

                if (!excludedDates.includes(dateStr))
                    excludedDates.push(dateStr); // Save the formatted date
                current.setDate(current.getDate() + 1); // Move to the next day
            }
        });

    // 3. Loop through saved classes and add them as repeating weekly events
    const daysMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    Object.values(eventTracker).forEach((subjectEvents) => {
        subjectEvents.forEach((event) => {
            if (event._def.recurringDef) {
                // Check if it's a repeating class
                const days = event._def.recurringDef.typeData.daysOfWeek;
                const sem = event.extendedProps.semester;
                const dates = getSemesterDates(sem);
                if (!dates) return;

                // Setup the weekly repeat rule until the end of the semester
                const rrule = {
                    freq: "WEEKLY",
                    until: dates.end,
                    byday: days.map((d) => daysMap[d]),
                };

                // Helper to clean up database times into pure HH:MM formats
                const parseTime = (t) => {
                    if (Array.isArray(t)) t = t[0];
                    if (!t) return { h: "00", m: "00" };
                    const p = String(t).split(":");
                    return {
                        h: p[0].padStart(2, "0"),
                        m: (p[1] || "00").padStart(2, "0"),
                    };
                };

                const startT = parseTime(event.extendedProps.rawStart);
                const endT = parseTime(event.extendedProps.rawEnd);
                const [year, month, day] = dates.start.split("-");

                // Add the class to the ICS file
                cal.addEvent(
                    event.title,
                    event.extendedProps.professor || "N/A",
                    event.extendedProps.lectureHall || "",
                    `${month}/${day}/${year} ${startT.h}:${startT.m}:00`,
                    `${month}/${day}/${year} ${endT.h}:${endT.m}:00`,
                    rrule,
                );
            }
        });
    });

    // 4. Add exams to the calendar (using a Set to prevent drawing the same exam twice)
    const uniqueExams = new Set();
    events.forEach((event) => {
        if (
            event.title.startsWith("ΕΞΕΤΑΣΗ:") &&
            !uniqueExams.has(event.title)
        ) {
            cal.addEvent(
                event.title,
                event.extendedProps.description || "Exam",
                event.extendedProps.lectureHall || "",
                event.start.toISOString(),
                (
                    event.end || new Date(event.start.getTime() + 7200000)
                ).toISOString(), // Default to 2 hours if no end time
            );
            uniqueExams.add(event.title); // Mark this exam as processed
        }
    });

    // 5. Generate the raw text for the .ics file
    let icsString = cal.build();

    // Google requires DTSTAMP to end in 'Z' (UTC format)
    icsString = icsString.replace(
        /DTSTAMP;VALUE=DATE-TIME:(\d{8}T\d{6})/g,
        "DTSTAMP:$1Z",
    );

    // Google prefers clean DTSTART/DTEND tags without the VALUE parameter
    icsString = icsString.replace(/DTSTART;VALUE=DATE-TIME:/g, "DTSTART:");
    icsString = icsString.replace(/DTEND;VALUE=DATE-TIME:/g, "DTEND:");
    // Force unique IDs so Google Calendar doesn't silently ignore deleted test events
    icsString = icsString.replace(
        /UID:\d+@default/g,
        () =>
            `UID:${Math.random().toString(36).substring(2)}${Date.now()}@schedule.ics`,
    );
    // --------------------------------------------

    // 6. Inject the holiday exclusion dates into the raw ICS text using Regex
    if (excludedDates.length > 0) {
        icsString = icsString.replace(
            /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g,
            (match) => {
                // Only apply exclusions to repeating events (classes), not one-off events (exams)
                if (match.includes("RRULE") || match.includes("rrule")) {
                    const startMatch = match.match(
                        /DTSTART(.*?):(\d{8})T(\d{6})(Z?)/,
                    ); // Find the exact start time of the class
                    if (startMatch) {
                        // Attach the class's start time to every holiday date, so the calendar knows exactly what time slot to cancel
                        const exDatesFormatted = excludedDates
                            .map((d) => `${d}T${startMatch[3]}${startMatch[4]}`)
                            .join(",");
                        return match.replace(
                            "END:VEVENT",
                            `EXDATE${startMatch[1]}:${exDatesFormatted}\r\nEND:VEVENT`,
                        );
                    }
                }
                return match;
            },
        );
    }

    // 7. Create a virtual file (Blob) in the browser and force a download
    const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = "university_schedule.ics"; // Name of the downloaded file

    document.body.appendChild(link); // Temporarily attach the link to the screen
    link.click(); // Automatically click it
    document.body.removeChild(link); // Clean up the link afterward
}

//now back to human comments :)

//this is the visual (the gay part) of our js code
//this function hides the list of semesters on the right hand side
function hideList() {
    if (window.innerWidth <= 767) return toggleScreenBtn?.click();
    const list = document.getElementById("semesterWrapper");
    list.style.display = list.style.display === "none" ? "" : "none";
    calendar.updateSize();
}

//this function get's called when we click the button on the calendar has 2 diffrent functions depending on your screen
toggleScreenBtn.onclick = function () {
    const list = document.getElementById("semesterWrapper");
    const calEl = document.getElementById("calendar");
    if (calEl.style.display === "flex") {
        calEl.style.setProperty("display", "none", "important");
        list.style.display = "flex";
    } else {
        list.style.display = "none";
        calEl.style.setProperty("display", "flex", "important");
        calendar.updateSize();
    }
};

//this just resizes the calendar (refresh's it)
function resize() {
    const sidebar = document.getElementById("semesterWrapper");
    sidebar.style.height = "unset";
    sidebar.style.height = getComputedStyle(
        document.getElementById("calendar"),
    ).height;
}

//this makes the calendar apear if we click it from mobile
function appearCalendar() {
    const list = document.getElementById("semesterWrapper");
    const calEl = document.getElementById("calendar");
    if (window.innerWidth > 767) {
        calEl.style.setProperty("display", "flex", "important");
        calendar.updateSize();
    } else {
        calEl.style.setProperty("display", "none", "important");
        list.style.display = "flex";
    }
}

//resize wrapper/sidebar on window change
function resizeWrapper() {
    const sidebar = document.getElementById("semesterWrapper");
    if (sidebar) {
        sidebar.style.width = "280px";
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.getElementById("semesterWrapper");
    const resizer = document.getElementById("dragHandle");

    if (!sidebar || !resizer) return; // Safety check

    let isResizing = false;

    // Start dragging
    resizer.addEventListener("mousedown", (e) => {
        isResizing = true;
        resizer.classList.add("dragging");
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none"; // Stops text highlighting
    });

    // Doing the drag
    document.addEventListener("mousemove", (e) => {
        if (!isResizing) return;

        // Calculate width: Window width minus mouse position (because sidebar is on the right)
        let newWidth = window.innerWidth - e.clientX;

        //Min 272px, Max 30% of screen
        if (newWidth > 272 && newWidth < window.innerWidth * 0.3) {
            sidebar.style.width = `${newWidth}px`;
            sidebar.style.flex = "none"; // Stop flexbox from ignoring our width

            if (typeof calendar !== "undefined" && calendar) {
                calendar.updateSize(); // Fixes the calendar grid instantly
            }
        }
    });

    // Stop dragging
    document.addEventListener("mouseup", () => {
        if (isResizing) {
            isResizing = false;
            resizer.classList.remove("dragging");
            document.body.style.cursor = "default";
            document.body.style.userSelect = "auto";
        }
    });
});

addEventListener("resize", () => {
    appearCalendar();
    resize();
    resizeWrapper();
});
