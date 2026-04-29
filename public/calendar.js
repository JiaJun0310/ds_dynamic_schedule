//GLOBAL VARIABLES
let calendar;
let academicData = null;
let eventTracker = {};
let currentMode = "Μαθήματα"; //hardcode the default radio button
let professorLinks = {};
let titleLinks = {};
let normalizedTitleLinks = {};
let isSeptember = false;
let filterOn = false; // Filtering is disabled at the start

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
const searchbar = document.getElementById("searchbar"); // The searchbar where the user will search for specific classes
const filterBtn = document.getElementById("filter"); // The filter button next to the searchbar 
const filterMenu = document.getElementById("filterMenu"); //The menu containing the options for teachers and classrooms when the filter is clicked
const filterSubmit = document.getElementById("filterSubmit"); // The "ok" button in the filter menu
const teacherSelect = document.getElementById("teacherSelect"); // The menu for teachers in the filter menu
const roomSelect = document.getElementById("roomSelect"); // The menu for teachers in the filter menu

// Settings Dropdown Elements
const settingsBtn = document.getElementById("settings");
const settingsMenu = document.getElementById("settings-menu");

// Lab Popup Elements
const labSlotPopup = document.getElementById("labSlotPopup");
const labSlotOptions = document.getElementById("labSlotOptions");
const labSlotTitle = document.getElementById("labSlotTitle");
const labSlotConfirm = document.getElementById("labSlotConfirm");
const labSlotCancel = document.getElementById("labSlotCancel");

//UTILITIES
const getSavedSchedule = () =>
    JSON.parse(localStorage.getItem("userSchedule")) || []; //returns everything saved on local storage or null if it's empty
const saveSchedule = (scheduleArray) =>
    localStorage.setItem("userSchedule", JSON.stringify(scheduleArray));

const getSavedExams = () => JSON.parse(localStorage.getItem("userExams")) || []; //local storage same as above but for exams
const saveExams = (examsArray) =>
    localStorage.setItem("userExams", JSON.stringify(examsArray));

const getSavedLabs = () => JSON.parse(localStorage.getItem("userLabs")) || [];
const saveLabs = (labsArray) => localStorage.setItem("userLabs", JSON.stringify(labsArray));

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

//function to only get the title without the code
function extractTitleName(str) {
    return str
        .replace(/^([^-]+-){2,}/, "")
        .replace(/\([^)]*\)/g, "")
        .replace(/(^|\s)επ\.?(\s|$)/gi, " ")
        .replace(/[^Α-Ωα-ωA-Za-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

//fuction to match the title on the pop up with the title on the json
function normalizeTitleName(str) {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9α-ω\s]/gi, "")   // removes hidden symbols
        .replace(/\s+/g, " ")
        .trim();
}

const daysMapGreek = {
    "1": "Δευτέρα",
    "2": "Τρίτη",
    "3": "Τετάρτη",
    "4": "Πέμπτη",
    "5": "Παρασκευή",
    "6": "Σάββατο",
    "7": "Κυριακή"
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

async function fetchProfessorLinks() {
    try {
        const response = await fetch("/jsonData/teachers.json");
        if (!response.ok) throw new Error("Links file not found");
        professorLinks = await response.json();
    } catch (err) {
        console.error("Error loading professor links:", err);
    }
}

async function fetchTitleLinks() {
    try {
        const response = await fetch("/jsonData/courses.json");
        if (!response.ok) throw new Error("Links file not found");
        titleLinks = await response.json();

        Object.entries(titleLinks).forEach(([title, url]) => {
            normalizedTitleLinks[normalizeTitleName(title)] = url;
        });

    } catch (err) {
        console.error("Error loading courses:", err);
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

    const originalTitle = event.title;
    const Title = extractTitleName(originalTitle);
    const normalized = normalizeTitleName(Title);
    const link = normalizedTitleLinks[normalized] || titleLinks[originalTitle];

    titleEl.innerHTML = link
        ? `<a href="${link}" target="_blank" style="color: inherit; text-decoration: none;">
         ${originalTitle}
       </a>`
        : originalTitle;

    let profs = props.professor;
    if (!profs || profs.length === 0 || profs[0] === "") {
        profEl.innerHTML = "N/A";
    } else {
        // if teachers are many 
        let profArray = Array.isArray(profs) ? profs : profs.split(",");

        profEl.innerHTML = profArray.map(prof => {
            let cleanName = prof.trim();
            let link = professorLinks[cleanName]; // looks for the name

            // if it finds a link it replaces it with the <a> tag
            return link
                ? `<a href="${link}" target="_blank" style="color: #3788d8; text-decoration: underline;">${cleanName}</a>`
                : cleanName;
        }).join(", ");
    }
    if (hallEl) hallEl.innerText = props.lectureHall || "N/A";
    timeEl.innerText = `${start} - ${end}`;

    const targetSubject =
        props.subjectTitle  //something to do with exams and dialog (I don't think it does anything)

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

        if (!document.getElementById("exam-pdf-wrapper")) {
            const pdfWrapper = document.createElement("div");
            pdfWrapper.id = "exam-pdf-wrapper"; // Give it a unique ID to check later

            const pdfLink = document.createElement("a");
            pdfLink.href = "/download-exams";
            pdfLink.download = "exams.pdf";
            pdfLink.textContent = "Λήψη Εξεταστικής (PDF)";
            pdfLink.id = "pdf-download-link"; // Reuses your existing CSS

            pdfWrapper.appendChild(pdfLink);
            examsBox.appendChild(pdfWrapper);
        }
    }

    if (currentMode === "Μαθήματα" || currentMode === "Εργαστήρια") {   //this re apears everything when pressing Μαθήματα
        const semesterWrappers = Array.from(
            document.querySelectorAll(".semesterButtonDivWrapper"),
        );
        semesters.innerHTML = "";
        semesterWrappers.sort((a, b) => parseInt(a.dataset.index) - parseInt(b.dataset.index)); //sorts the divs so they are added in the correct order

        semesterWrappers.forEach((semester) => {
            semesters.append(semester);
        });
        if (currentMode === "Μαθήματα") {
            const pdfWrapper = document.createElement("div");
            pdfWrapper.id = "pdf-wrapper";

            const pdfLink = document.createElement("a");
            pdfLink.href = "/download-schedule";
            pdfLink.download = "shedule.pdf";
            pdfLink.textContent = "Λήψη Προγράμματος (PDF)";
            pdfLink.id = "pdf-download-link";

            pdfWrapper.appendChild(pdfLink);
            semesters.appendChild(pdfWrapper);
        }





        semesters.style.display = "flex";
        examsBox.style.display = "none";
    }

    let isWinter = 0;

    // Fetch winter semester status
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
        // alert("Something went wrong");
    }

    //Check if september_exams.json exists
    try {
        const septResponse = await fetch("/jsonData/september_exams.json", { method: "HEAD" });
        if (septResponse.ok) {
            isSeptember = true;
        } else {
            isSeptember = false;
        }
    } catch (error) {
        console.warn("September exams file not found or could not be checked.");
        isSeptember = false;
    }

    let isNormalClicked = false;    //by default the normal exams are shown and the embolim are not, so we set the normal to true and the embolim to false
    let isEmbolimClicked = false;   //tracked what tabs are open and which are closed 

    normalExam.onclick = async () => {  //this button apears the div below the normal exams
        isNormalClicked = !isNormalClicked;
        const normalExamDiv = document.getElementById("normalExamDiv");

        if (isNormalClicked) {  //changes the display setting
            normalExamDiv.style.display = "block";
            normalExam.classList.add("active"); // Gives the button its 'checked' appearance

            const winterSemesters = document.querySelectorAll(".winterSemesters");
            const springSemesters = document.querySelectorAll(".springSemesters");

            if (isSeptember) {
                // If september file exists, append ALL semesters to normalExamDiv
                winterSemesters.forEach((semester) => normalExamDiv.append(semester));
                springSemesters.forEach((semester) => normalExamDiv.append(semester));
            } else if (isWinter) {     //this is the adding logic for the semester depending on the API's answer
                winterSemesters.forEach((semester) => normalExamDiv.append(semester));
            } else {
                springSemesters.forEach((semester) => normalExamDiv.append(semester));
            }

        } else {    //removes the divs
            normalExamDiv.style.display = "none";
            normalExam.classList.remove("active"); //returns the button to its default state
        }
    };

    embolimExam.onclick = async () => { //this button apears the div below the embolim exams
        isEmbolimClicked = !isEmbolimClicked;
        const embolimExamDiv = document.getElementById("embolimExamDiv");

        if (isEmbolimClicked) { //changes the display setting
            embolimExamDiv.style.display = "block";
            embolimExam.classList.add("active"); // Gives the button its 'checked' appearance

            const winterSemesters = document.querySelectorAll(".winterSemesters");
            const springSemesters = document.querySelectorAll(".springSemesters");

            if (!isSeptember) {
                // Only append to embolim if it's NOT September (since September puts them all in normal)
                if (!isWinter) {    //this is the adding logic for the semester depending on the API's answer
                    winterSemesters.forEach((semester) => embolimExamDiv.append(semester));
                } else {
                    springSemesters.forEach((semester) => embolimExamDiv.append(semester));
                }
            }
        } else {    //removes the divs
            embolimExamDiv.style.display = "none";
            embolimExam.classList.remove("active"); //returns the button to its default state
        }

    };
    if (currentMode === "Εξεταστική") {
        normalExam.click();
        embolimExam.click();
    }

}

// Listen for clicks on the radio buttons
document.querySelectorAll('input[name="choice"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
        currentMode = e.target.value;

        if (currentMode === "Εργαστήρια") {
            const hideWarning = localStorage.getItem("hideLabWarning");
            if (!hideWarning) {
                const warningPopup = document.getElementById("labWarningPopup");
                warningPopup.showModal();

                document.getElementById("labWarningGotIt").onclick = () => warningPopup.close();
                document.getElementById("labWarningNeverAgain").onclick = () => {
                    localStorage.setItem("hideLabWarning", "true");
                    warningPopup.close();
                };
            }
        }

        const semesters = document.getElementById("semesters"); // Getting the semesters from the documment so we can show or hide them
        const matchingCourses = document.getElementById("matchingCourses") // Getting the new div we made so we can add the matching classes there
        const searchbar = document.getElementById("searchbar"); // Getting the searchbar 

        // Clean up the UI: Close all open semester tabs when switching modes
        document.querySelectorAll(".buttonDiv").forEach((btn) => {
            let sem = btn.parentElement.dataset.semester || btn.textContent.trim().slice(-1);
            let targetDiv = document.getElementById(`Semester${sem}`);
            if (targetDiv) targetDiv.innerHTML = ""; // Empty the list

            let arrow = btn.querySelector(".pointer");
            if (arrow) arrow.src = "../images/right_pointer.svg";
            btn.dataset.open = "false"; // Reset our tracking variable
        });

        // Resetting the searchbar if another mode is toggled
        semesters.style.display = "block" // Semesters reappear
        matchingCourses.style.display = "none" // Previous results dissapear
        searchbar.value = "" // Bar is cleared
        filterMenu.style.display = "none" // hiding the filtermenu
        filterOn = false;
        teacherSelect.innerHTML = "<option>Διδάσκων</option>" // Returning the selction boxes to their starting state
        roomSelect.innerHTML = "<option>Αίθουσα</option>"

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
            e.extendedProps.subjectTitle;
             //I think this is supposed to change the colors of courses as well as the exam course but
        if (eventSubject === subjectTitle) {
            //I don't think it works corectly because it uses forEach .getEvent that only takes events currently on screen
            e.setProp("backgroundColor", newColor);
            e.setProp("borderColor", newColor);
        }
    });
}

async function handleCourseToggle(checkbox, targetTitle) {
    //new function to clear up callback hell, just does the toggling for the checkboxes
    checkbox.disabled = true;
    try {
        if (checkbox.checked) {
            await addCourseToCalendar(targetTitle);
        } else {
            removeCourseFromCalendar(targetTitle);
        }
    } catch (error) {
        console.error("Error updating schedule:", error);
    } finally {
        setTimeout(() => (checkbox.disabled = false), 250);
    }
}

async function addCourseToCalendar(targetTitle) {
    //new function, again, does the whole adding stuff to the calendar just made cleaner with a function
    const courseData = await fetchCourseData(targetTitle);

    let sem;
    sem = courseData.schedules[0].semester
    console.log(courseData)

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
                semester: item.semester,
                rawStart: item.startTime || item.start,
                rawEnd: item.endTime || item.end,
            },
        });
        eventTracker[targetTitle].push(addedEvent);
    }); //push event to eventTracker
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

function handleLabToggle(checkbox, labData) {
    let sem;
    return new Promise((resolve) => {
        if (checkbox.checked) {
            checkbox.checked = false;

            sem = labData.semester;
            labSlotTitle.textContent = labData.name;
            labSlotOptions.innerHTML = "";

            labData.data.forEach((slot, index) => {
                const label = document.createElement("label");
                label.style.cursor = "pointer";

                const radio = document.createElement("input");
                radio.type = "radio";
                radio.name = "labSlotChoice";
                radio.value = index;
                if (index === 0) radio.checked = true;

                const dayName = daysMapGreek[slot.day] || slot.day;
                const text = document.createTextNode(` ${dayName}, ${slot.time} (${slot.labhall})`);

                label.append(radio, text);
                labSlotOptions.appendChild(label);
            });

            // Event Listener that listens for the popup to close, so we can resolve the promise and allow future interactions
            const onClose = () => {
                labSlotPopup.removeEventListener("close", onClose);
                resolve();
            };
            labSlotPopup.addEventListener("close", onClose);

            labSlotConfirm.onclick = () => {
                const selectedRadio = document.querySelector('input[name="labSlotChoice"]:checked');
                if (selectedRadio) {
                    const selectedIndex = parseInt(selectedRadio.value);
                    const selectedSlot = labData.data[selectedIndex];

                    checkbox.checked = true;
                    addSpecificLabToCalendar(labData.name, selectedSlot, sem);
                }
                labSlotPopup.close(); // This will trigger the onClose event
            };

            labSlotCancel.onclick = () => {
                labSlotPopup.close(); // This will trigger the onClose event
            };

            labSlotPopup.showModal();
        } else {
            removeLabFromCalendar(labData.name);
            resolve(); // If it's just unchecked, proceed immediately
        }
    });
}

function addSpecificLabToCalendar(labName, slot, sem, color, isRestoring = false) {
    const eventColor = color || "#27ae60"; // Διαβάζει το χρώμα κατευθείαν!
    const dates = getSemesterDates(sem);

    if (!eventTracker[labName]) eventTracker[labName] = [];

    const [startTime, endTime] = slot.time.split("-");

    let addedEvent = calendar.addEvent({
        title: labName,
        daysOfWeek: [parseInt(slot.day)],
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        startRecur: dates ? dates.start : null,
        endRecur: dates ? dates.end : null,
        backgroundColor: eventColor,
        borderColor: eventColor,
        extendedProps: {
            lectureHall: slot.labhall,
            subjectTitle: labName,
            semester: sem,
            rawStart: startTime.trim(),
            rawEnd: endTime.trim()
        }
    });

    eventTracker[labName].push(addedEvent);

    if (!isRestoring) {
        let saved = getSavedLabs();
        if (!saved.some((l) => l.name === labName)) {
            saved.push({ name: labName, slot, sem, color });
            saveLabs(saved);
        }
    }
}

function removeLabFromCalendar(labName) {
    if (eventTracker[labName]) {
        eventTracker[labName].forEach(eventObj => eventObj?.remove());
        delete eventTracker[labName];
    }

    let saved = getSavedLabs();
    saveLabs(saved.filter(l => l.name !== labName));
}

function addStandaloneExam(examData) {
    console.log(examData)
    const examTitleStr = examData.title;

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
    const examTitleStr = title;

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
    await fetchProfessorLinks();
    await fetchTitleLinks();

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

    const savedLabs = getSavedLabs();
    for (const lab of savedLabs) {
        addSpecificLabToCalendar(lab.name, lab.slot, lab.sem, lab.color, true);
    }

    appearCalendar(); //refresh calendar to show events
    resize();
    examOptions();
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
    localStorage.removeItem("userLabs");

};

// --- SETTINGS MENU LOGIC ADDED HERE ---
if (settingsBtn && settingsMenu) {
    // Toggle the menu when clicking the settings icon
    settingsBtn.addEventListener("click", function (event) {
        settingsMenu.classList.toggle("show");
        event.stopPropagation(); // Stops the click from bubbling up to the window listener
    });

    // Close the dropdown if the user clicks anywhere outside of it
    window.addEventListener("click", function (event) {
        // If the menu is currently showing, close it
        if (settingsMenu.classList.contains('show')) {
            // Only close if the click wasn't inside the menu itself and wasn't the settings button
            if (!settingsMenu.contains(event.target) && event.target !== settingsBtn) {
                settingsMenu.classList.remove('show');
            }
        }
    });
}
// --------------------------------------

document.querySelectorAll(".buttonDiv").forEach((button) => {
    button.dataset.open = "false";

    let cleanText = button.textContent.trim();
    let sem = button.parentElement.dataset.semester || cleanText[cleanText.length - 1];
    let arrow = button.querySelector(".pointer");
    const SemesterDiv = document.getElementById(`Semester${sem}`);

    button.onclick = async function () {
        let isOpen = button.dataset.open === "true";
        isOpen = !isOpen;
        button.dataset.open = isOpen.toString();

        arrow.src = isOpen
            ? "../images/down_pointer.svg"
            : "../images/right_pointer.svg";

        if (!isOpen) {
            SemesterDiv.innerHTML = ``;
            return;
        }

        let dataArray = [];
        let isLabMode = currentMode === "Εργαστήρια";
        let isExamMode = currentMode === "Εξεταστική";

        //FETCH DATA BASED ON MODE
        if (currentMode === "Μαθήματα") {
            const res = await fetch("/getSemester", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ semester: sem }),
            });
            const data = await res.json();
            dataArray = data.titles.map(c => ({ title: c.title, original: c }));
        }
        else if (isLabMode) {
            const res = await fetch("/getLabs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ semester: sem }),
            });
            const labs = await res.json();
            dataArray = labs.map(l => ({ title: l.name, original: l }));
        }
        else if (isExamMode) {
            if (isSeptember) {
                const res = await fetch("/jsonData/september_exams.json");
                const allSeptExams = await res.json();
                dataArray = allSeptExams.filter(exam => String(exam.semester) === String(sem)).map(e => ({ title: e.title, original: e }));
            } else {
                const res = await fetch("/getSemesterExams", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ semester: sem }),
                });
                const exams = await res.json();
                dataArray = exams.map(e => ({ title: e.title, original: e }));
            }
        }

        if (dataArray.length === 0) return;

        // 2. CREATE SELECT ALL BUTTON
        const selectAllDiv = document.createElement("div");
        selectAllDiv.className = "course select-all-wrapper";

        const selectAllText = document.createElement("p");
        selectAllText.textContent = "Επιλογή Όλων";
        selectAllText.style.fontWeight = "bold";

        const selectAllCheckbox = document.createElement("input");
        selectAllCheckbox.type = "checkbox";
        selectAllCheckbox.className = "checkbox master-checkbox";

        selectAllDiv.append(selectAllText, selectAllCheckbox);
        SemesterDiv.appendChild(selectAllDiv);

        setTimeout(() => selectAllDiv.classList.add("visible"), 0);

        const itemCheckboxes = [];
        const savedClasses = getSavedSchedule();
        const currentlySavedExams = getSavedExams();

        //GENERATE COURSES
        dataArray.forEach((item, i) => {
            const div = document.createElement("div");
            div.className = "course";

            const p = document.createElement("p");
            p.textContent = item.title;

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "checkbox";

            // Determine initial checked state
            if (currentMode === "Μαθήματα") {
                checkbox.checked = savedClasses.some(s => s.title === item.title);
            } else if (isLabMode) {
                checkbox.checked = !!eventTracker[item.title];
            } else if (isExamMode) {
                const examTitleStr = item.title;
                checkbox.checked = currentlySavedExams.some(s => s.title === item.title) ||
                    calendar.getEvents().some(e => e.title === examTitleStr);
            }

            itemCheckboxes.push(checkbox);
            div.append(p, checkbox);
            SemesterDiv.appendChild(div);
            setTimeout(() => div.classList.add("visible"), i * 50);

            div.onclick = (e) => {
                if (checkbox.disabled || e.target === checkbox) return;
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event("change"));
            };

            checkbox.onchange = () => {
                if (currentMode === "Μαθήματα") {
                    handleCourseToggle(checkbox, item.title);
                } else if (isLabMode) {
                    handleLabToggle(checkbox, item.original);
                } else if (isExamMode) {
                    // Disable the checkbox to prevent spamming
                    checkbox.disabled = true;

                    if (checkbox.checked) addStandaloneExam(item.original);
                    else removeStandaloneExam(item.title);

                    // Re-enable after 0.25 seconds
                    setTimeout(() => (checkbox.disabled = false), 250);
                }
                selectAllCheckbox.checked = itemCheckboxes.every(cb => cb.checked);
            };
        });

        // Initial Select All sync
        selectAllCheckbox.checked = itemCheckboxes.length > 0 && itemCheckboxes.every(cb => cb.checked);

        // Select All Click Logic
        // Select All Click Logic
        selectAllDiv.onclick = (e) => {
            // Ignore the click if the button is currently on cooldown
            if (selectAllCheckbox.disabled || e.target === selectAllCheckbox) return;
            selectAllCheckbox.checked = !selectAllCheckbox.checked;
            selectAllCheckbox.dispatchEvent(new Event("change"));
        };

        selectAllCheckbox.onchange = async () => {
            // Disable the checkbox and div interactions immediately
            selectAllCheckbox.disabled = true;
            selectAllDiv.style.pointerEvents = "none";

            try {
                const isChecked = selectAllCheckbox.checked;

                for (let index = 0; index < itemCheckboxes.length; index++) {
                    const cb = itemCheckboxes[index];

                    if (cb.checked !== isChecked) {
                        cb.checked = isChecked;

                        if (currentMode === "Μαθήματα") {
                            await handleCourseToggle(cb, dataArray[index].title);
                        } else if (isLabMode) {
                            await handleLabToggle(cb, dataArray[index].original);
                        } else if (isExamMode) {
                            if (cb.checked) addStandaloneExam(dataArray[index].original);
                            else removeStandaloneExam(dataArray[index].title);
                        }
                    }
                }
            } finally {
                // Re-enable everything after 250ms (0.25s)
                setTimeout(() => {
                    selectAllCheckbox.disabled = false;
                    selectAllDiv.style.pointerEvents = "auto";
                }, 250);
            }
        };
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
                const sem = event.extendedProps.semester || "1";
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

                const startT = parseTime(event.extendedProps.rawStart || event.start);
                const endT = parseTime(event.extendedProps.rawEnd || event.end);
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
}

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

// --- Legal Disclaimer Logic με Session Cookie ---
// make cookie for legal things maybe 
function getCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function checkDisclaimer() {
    if (!getCookie("legalAcceptedSession")) {
        const banner = document.getElementById("legal-disclaimer");
        if (banner) banner.style.display = "block";
    }
}

function acceptDisclaimer() {
    document.cookie = "legalAcceptedSession=true; path=/; SameSite=Lax";

    const banner = document.getElementById("legal-disclaimer");
    if (banner) banner.style.display = "none";
}

window.addEventListener("load", checkDisclaimer);

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
    if (window.innerWidth > 767) {
        appearCalendar();
        resize();
        resizeWrapper();
    }
    
});

// Event listener for the searchbar
searchbar.addEventListener("keyup", async function (e) {
    search = e.target.value; // Stores whatever the use wrote

    const semesters = document.getElementById("semesters"); // Getting the semesters from the documment so we can show or hide them
    const matchingCourses = document.getElementById("matchingCourses") // Getting the new div we made so we can add the matching classes there
    const examsBox = document.getElementById("examsBox"); // Also getting the examsbox so we can show or hide it
    var titlesArray = {} // Creating this here so it can be used in all modes
    const savedClasses = getSavedSchedule(); // Same for this

    // If it is not null we move on to show the user the matched courses
    if (search) {
        // If the filter menu is visible we hide it
        if (filterOn) {
            filterOn = !filterOn;
            filterMenu.style.display = "none"
        }
        matchingCourses.innerHTML = ''; // Clearing the previous searches 
        matchingCourses.style.display = "block" // Making sure its visible
        console.log(search)
        semesters.style.display = "none" // We remove the semesters so the sidebar does not get cluttered and ugly
        examsBox.style.display = "none" // Hiding the examsbox

        // Fetching matching classes
        const res = await fetch("/getSearch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ search: search, mode: currentMode }), // Two arguments, both the search and the current mode
        });
        const data = await res.json(); //we save the data here
        titlesArray = data.titles.map((course) => course.title); //and the titles in an array

        // In case the search mathes no title we inform the user by creating a div containing a message
        if (titlesArray.length === 0) {
            const div = document.createElement("div");

            div.style.textAlign = "center"

            const p = document.createElement("p");
            p.textContent = "Δεν βρέθηκε μάθημα που να αντιστοιχεί σε '" + String(search) + "' :(";
            p.style.color = "white"
            p.style.fontFamily = "sans-serif"

            div.append(p);
            matchingCourses.appendChild(div);

            return // We stop the function from doing anything else
        }

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
            matchingCourses.appendChild(div);

            setTimeout(() => div.classList.add("visible"), i * 50);

            div.onclick = (e) => {
                //ckeckbox logic on the div
                if (checkbox.disabled || e.target === checkbox) return;
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event("change"));
            };

            checkbox.onchange = async () => {
                if (currentMode === "Μαθήματα") {
                    handleCourseToggle(checkbox, title);
                } else if (currentMode === "Εργαστήρια") {

                    const res = await fetch("/getLab", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title: title })
                    })
                    const lab = await res.json();

                    if (checkbox.checked) handleLabToggle(checkbox, lab);
                    else removeLabFromCalendar(title)
                } else if (currentMode === "Εξεταστική") {
                   
                    const res = await fetch("/getExam", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title: title })
                    })

                    const examData = await res.json();
               

                    if (checkbox.checked) addStandaloneExam(examData.exam);
                    else removeStandaloneExam(examData.exam.title);

                }

            }

        });
    }
    else {

        matchingCourses.innerHTML = ''; // Clearing the previous search results
        if (currentMode === "Εξεταστική") {
            examsBox.style.display = "flex" // if we're in exam mode we also show the examsbox
        }
        // Only bringing these back if we are not in exam mode since the user needs to choose make up exams or normal exams for the semesters to show up
        else {
            semesters.style.display = "block" // If the searchbar is null then the semesters reappear

        }
    }

})

filterBtn.addEventListener("click", async function () {
    filterOn = !filterOn; // Enabling/Disabling

    search = searchbar.value;

    const semesters = document.getElementById("semesters"); // Getting the semesters from the documment so we can show or hide them
    const matchingCourses = document.getElementById("matchingCourses") // Getting the new div we made so we can add the matching classes there
    const examsBox = document.getElementById("examsBox"); // Also getting the examsbox so we can show or hide it

    // Only showing the menu if the searchbar is empty to avoid conflicts and making a mess in the sidebar
    if (filterOn && !search) {
        filterMenu.style.display = "flex" // Making the menu visible

        // Fetching teachers and rooms
        const res = await fetch("/getTeachersAndRooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: currentMode }), // One argument, the mode
        });

        const data = await res.json(); //we save the data here
        teachersArray = data.teachers//and the teachers in an array
        roomsArray = data.rooms //and the rooms in an array

        teachersArray.sort() // Sorting the arrays
        roomsArray.sort()

        //append each teacher to the box
        teachersArray.forEach((teacher) => {
            const option = document.createElement("option");
            option.value = teacher;
            option.textContent = teacher;
            teacherSelect.appendChild(option);
        });

        //append each room to the box
        roomsArray.forEach((room) => {
            const option = document.createElement("option");
            option.value = room;
            option.textContent = room;
            roomSelect.appendChild(option);
        });
    } else {
        if (!search) {
            filterMenu.style.display = "none" // Making the menu invisible
            teacherSelect.innerHTML = "<option>Διδάσκων</option>" // Returning the selction boxes to their starting state
            roomSelect.innerHTML = "<option>Αίθουσα</option>"

            matchingCourses.innerHTML = ''; // Clearing the previous search results
            if (currentMode === "Εξεταστική") {
                examsBox.style.display = "flex" // if we're in exam mode we also show the examsbox
            }
            // Only bringing these back if we are not in exam mode since the user needs to choose make up exams or normal exams for the semesters to show up
            else {
                semesters.style.display = "block" // bring back the semesters

            }
        }
    }


})

filterSubmit.addEventListener("click", async function () {

    teacher = teacherSelect.value;
    room = roomSelect.value;

    if (teacher != "Διδάσκων" || room != "Αίθουσα") {

        const semesters = document.getElementById("semesters"); // Getting the semesters from the documment so we can show or hide them
        const matchingCourses = document.getElementById("matchingCourses") // Getting the new div we made so we can add the matching classes there
        const examsBox = document.getElementById("examsBox"); // Also getting the examsbox so we can show or hide it
        var titlesArray = {} // Creating this here so it can be used in all modes
        const savedClasses = getSavedSchedule(); // Same for this

        matchingCourses.innerHTML = ''; // Clearing the previous searches 
        matchingCourses.style.display = "block" // Making sure its visible
        semesters.style.display = "none" // We remove the semesters so the sidebar does not get cluttered and ugly
        examsBox.style.display = "none" // Hiding the examsbox

        // Fetching matching classes
        const res = await fetch("/getFiltered", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teacher: teacher, room: room, mode: currentMode }), // Three arguments, the teacher, the room and the current mode
        });
        const data = await res.json(); //we save the data here
        titlesArray = data.titles //and the titles in an array


        // In case the search mathes no title we inform the user by creating a div containing a message
        if (titlesArray.length === 0) {
            const div = document.createElement("div");

            div.style.textAlign = "center"

            const p = document.createElement("p");
            p.textContent = "Δεν βρέθηκε μάθημα που να αντιστοιχεί σε '" + String(teacher) + " και " + String(room) + " :(";
            p.style.color = "white"
            p.style.fontFamily = "sans-serif"

            div.append(p);
            matchingCourses.appendChild(div);

            return // We stop the function from doing anything else
        }

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
            matchingCourses.appendChild(div);

            setTimeout(() => div.classList.add("visible"), i * 50);

            div.onclick = (e) => {
                //ckeckbox logic on the div
                if (checkbox.disabled || e.target === checkbox) return;
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event("change"));
            };

            checkbox.onchange = async () => {
                if (currentMode === "Μαθήματα") {
                    handleCourseToggle(checkbox, title);
                } else if (currentMode === "Εργαστήρια") {

                    const res = await fetch("/getLab", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title: title })
                    })
                    const lab = await res.json();

                    if (checkbox.checked) handleLabToggle(checkbox, lab);
                    else removeLabFromCalendar(title)
                } else if (currentMode === "Εξεταστική") {
                   
                    const res = await fetch("/getExam", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title: title })
                    })

                    const examData = await res.json();
               

                    if (checkbox.checked) addStandaloneExam(examData.exam);
                    else removeStandaloneExam(examData.exam.title);

                }

            }

        });

    }
    else if (teacher === "Διδάσκων" || room === "Αίθουσα") {
        filterMenu.style.display = "none" // Making the menu invisible
        teacherSelect.innerHTML = "<option >Καθηγητής</option>" // Returning the selction boxes to their starting state
        roomSelect.innerHTML = "<option >Αίθουσα</option>"

        matchingCourses.innerHTML = ''; // Clearing the previous search results
        if (currentMode === "Εξεταστική") {
            examsBox.style.display = "flex" // if we're in exam mode we also show the examsbox
        }
        // Only bringing these back if we are not in exam mode since the user needs to choose make up exams or normal exams for the semesters to show up
        else {
            semesters.style.display = "block" // bring back the semesters

        }
    }

})


const darkModeToggle = document.getElementById("dark-mode-toggle");

if (darkModeToggle) {
    // Check what the user saved last time they visited
    const savedTheme = localStorage.getItem("userTheme");

    // If they saved "dark", apply the theme AND check the box
    if (savedTheme === "dark") {
        document.body.classList.add("dark-theme");
        darkModeToggle.checked = true;
    }

    // Listen for clicks and save the new choice
    darkModeToggle.addEventListener("change", function (event) {
        if (event.target.checked) {
            document.body.classList.add("dark-theme");
            localStorage.setItem("userTheme", "dark");
        } else {
            document.body.classList.remove("dark-theme");
            localStorage.setItem("userTheme", "light");
        }
    });
}