let calendar;
let academicData = null;
let eventTracker = {};
let currentMode = "Μαθήματα";
let professorLinks = {}; 
let titleLinks = {};
let normalizedTitleLinks = {};
let isSeptember = false; 

const popup = document.getElementById("eventPopup");
const titleEl = document.getElementById("popTitle");
const profEl = document.getElementById("popProfessor");
const hallEl = document.getElementById("popHall");
const timeEl = document.getElementById("popTime");
const colorBtn = document.getElementById("colorBtn");
const hiddenPicker = document.getElementById("hiddenPicker");
const clearSelectionBtn = document.getElementById("clearSelection");
const toggleScreenBtn = document.getElementById("toggleScreen");

const labSlotPopup = document.getElementById("labSlotPopup");
const labSlotOptions = document.getElementById("labSlotOptions");
const labSlotTitle = document.getElementById("labSlotTitle");
const labSlotConfirm = document.getElementById("labSlotConfirm");
const labSlotCancel = document.getElementById("labSlotCancel");

const getSavedSchedule = () => JSON.parse(localStorage.getItem("userSchedule")) || []; 
const saveSchedule = (scheduleArray) => localStorage.setItem("userSchedule", JSON.stringify(scheduleArray));

const getSavedExams = () => JSON.parse(localStorage.getItem("userExams")) || []; 
const saveExams = (examsArray) => localStorage.setItem("userExams", JSON.stringify(examsArray));

const getSavedLabs = () => JSON.parse(localStorage.getItem("userLabs")) || [];
const saveLabs = (labsArray) => localStorage.setItem("userLabs", JSON.stringify(labsArray));

const formatJSONDate = (dateStr) => {
    const [day, month, year] = dateStr.trim().split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const getSemesterDates = (semesterNum) => {
    if (!academicData || !semesterNum) return null;
    
    if (semesterNum === "General") {
        return {
            start: formatJSONDate(academicData.semesters[0].classes_start),
            end: formatJSONDate(academicData.semesters[1].classes_end),
        };
    }

    const isOdd = parseInt(semesterNum) % 2 !== 0;
    const semData = academicData.semesters[isOdd ? 0 : 1];
    return {
        start: formatJSONDate(semData.classes_start),
        end: formatJSONDate(semData.classes_end),
    };
};

function extractTitleName(str) {
    return str
        .replace(/^([^-]+-){2,}/, "")
        .replace(/\([^)]*\)/g, "")
        .replace(/(^|\s)επ\.?(\s|$)/gi, " ")
        .replace(/[^Α-Ωα-ωA-Za-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeTitleName(str) {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9α-ω\s]/gi, "")   
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

async function fetchAcademicData() {
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

async function fetchCourseData(title) {
    const res = await fetch("/getClass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
    });
    return res.ok ? res.json() : { schedules: [] };
}

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

function handleEventClick(info) {
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
        let profArray = Array.isArray(profs) ? profs : profs.split(",");
        
        profEl.innerHTML = profArray.map(prof => {
            let cleanName = prof.trim();
            let link = professorLinks[cleanName]; 
            
            return link 
                ? `<a href="${link}" target="_blank" style="color: #3788d8; text-decoration: underline;">${cleanName}</a>` 
                : cleanName;
        }).join(", ");
    }
    if (hallEl) hallEl.innerText = props.lectureHall || "N/A";
    timeEl.innerText = `${start} - ${end}`;

    const targetSubject = props.subjectTitle || event.title.replace("ΕΞΕΤΑΣΗ: ", "").trim(); 

    hiddenPicker.oninput = () => updateCourseColor(targetSubject, hiddenPicker.value);
}

async function examOptions() {
    const semesters = document.getElementById("semesters");
    const examsBox = document.getElementById("examsBox");
    const normalExam = document.getElementById("normalExam");
    const embolimExam = document.getElementById("embolimExam");
    const generalSem = document.querySelector('.semesterButtonDivWrapper[data-semester="General"]');

    if (currentMode === "Εξεταστική") {
        semesters.style.display = "none";
        examsBox.style.display = "flex";
    }
    
    if (currentMode === "Μαθήματα" || currentMode === "Εργαστήρια") {
        const semesterWrappers = Array.from(
            document.querySelectorAll(".semesterButtonDivWrapper")
        );
        semesters.innerHTML = "";
        semesterWrappers.sort((a, b) => parseInt(a.dataset.index) - parseInt(b.dataset.index));

        semesterWrappers.forEach((semester) => {
            semesters.append(semester);
        });

        semesters.style.display = "flex";
        examsBox.style.display = "none";

        if (generalSem) {
            generalSem.style.display = currentMode === "Εργαστήρια" ? "block" : "none";
        }
    }
    
    let isWinter = 0;

    try {
        const response = await fetch("/getSemesterOfExams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(),
        });

        if (response.ok) {
            isWinter = await response.json();
        }
    } catch (error) {
    }

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

    let isNormalClicked = false;
    let isEmbolimClicked = false; 

    normalExam.onclick = async () => {
        isNormalClicked = !isNormalClicked;
        const normalExamDiv = document.getElementById("normalExamDiv");

        if (isNormalClicked) { 
            normalExamDiv.style.display = "block";
            normalExam.classList.add("active"); 

            const winterSemesters = document.querySelectorAll(".winterSemesters");
            const springSemesters = document.querySelectorAll(".springSemesters");

            if (isSeptember) {
                winterSemesters.forEach((semester) => normalExamDiv.append(semester));
                springSemesters.forEach((semester) => normalExamDiv.append(semester));
            } else if (isWinter) {
                winterSemesters.forEach((semester) => normalExamDiv.append(semester));
            } else {
                springSemesters.forEach((semester) => normalExamDiv.append(semester));
            }

        } else {
            normalExamDiv.style.display = "none";
            normalExam.classList.remove("active");
        }
    };

    embolimExam.onclick = async () => {
        isEmbolimClicked = !isEmbolimClicked;
        const embolimExamDiv = document.getElementById("embolimExamDiv"); 

        if (isEmbolimClicked) {
            embolimExamDiv.style.display = "block";
            embolimExam.classList.add("active"); 

            const winterSemesters = document.querySelectorAll(".winterSemesters");
            const springSemesters = document.querySelectorAll(".springSemesters");

            if (!isSeptember) {
                if (!isWinter) {
                    winterSemesters.forEach((semester) => embolimExamDiv.append(semester));
                } else {
                    springSemesters.forEach((semester) => embolimExamDiv.append(semester));
                }
            }
        } else {
            embolimExamDiv.style.display = "none";
            embolimExam.classList.remove("active"); 
        }
    };
}

document.querySelectorAll('input[name="choice"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
        currentMode = e.target.value;

        document.querySelectorAll(".buttonDiv").forEach((btn) => {
            let sem = btn.parentElement.dataset.semester || btn.textContent.trim().slice(-1);
            let targetDiv = document.getElementById(`Semester${sem}`);
            if (targetDiv) targetDiv.innerHTML = ""; 
            
            let arrow = btn.querySelector(".pointer");
            if (arrow) arrow.src = "../images/right_pointer.svg";
            btn.dataset.open = "false";
        });

        examOptions(); 
    });
});

function updateCourseColor(subjectTitle, newColor) {
    let currentSchedule = getSavedSchedule();
    let courseIndex = currentSchedule.findIndex(
        (c) => c.title === subjectTitle,
    );
    if (courseIndex !== -1) {
        currentSchedule[courseIndex].color = newColor;
        saveSchedule(currentSchedule);
    }

    calendar.getEvents().forEach((e) => {
        const eventSubject = e.extendedProps.subjectTitle || e.title.replace("ΕΞΕΤΑΣΗ: ", "").trim(); 
        if (eventSubject === subjectTitle) {
            e.setProp("backgroundColor", newColor);
            e.setProp("borderColor", newColor);
        }
    });
}

async function handleCourseToggle(checkbox, targetTitle, sem) {
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
    const courseData = await fetchCourseData(targetTitle);
    const dates = getSemesterDates(sem);
    if (!eventTracker[targetTitle]) eventTracker[targetTitle] = [];

    let dbColor = courseData.schedules.length > 0 ? courseData.schedules[0].color : "#3788d8"; 
    let saved = getSavedSchedule();
    const isAlreadySaved = saved.some((c) => c.title === targetTitle);
    const eventColor = isAlreadySaved ? saved.find((c) => c.title === targetTitle).color : dbColor;

    if (!isAlreadySaved) {
        hiddenPicker.value = eventColor;
        saved.push({ title: targetTitle, color: eventColor, semester: sem });
        saveSchedule(saved);
    }

    courseData.schedules.forEach((item) => {
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
                professor: item.professor,
                lectureHall: item.lectureHall,
                subjectTitle: targetTitle,
                semester: sem,
                rawStart: item.startTime || item.start,
                rawEnd: item.endTime || item.end,
            },
        });
        eventTracker[targetTitle].push(addedEvent);
    }); 
}

function removeCourseFromCalendar(targetTitle) {
    if (eventTracker[targetTitle]) {
        eventTracker[targetTitle].forEach((eventObj) => eventObj?.remove());
        delete eventTracker[targetTitle];
    }
    let saved = getSavedSchedule();
    saveSchedule(saved.filter((c) => c.title !== targetTitle));
}

function handleLabToggle(checkbox, labData, sem) {
    if (checkbox.checked) {
        checkbox.checked = false; 
        
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

        labSlotConfirm.onclick = () => {
            const selectedRadio = document.querySelector('input[name="labSlotChoice"]:checked');
            if (selectedRadio) {
                const selectedIndex = parseInt(selectedRadio.value);
                const selectedSlot = labData.data[selectedIndex];
                
                checkbox.checked = true; 
                addSpecificLabToCalendar(labData.name, selectedSlot, sem);
            }
            labSlotPopup.close();
        };

        labSlotCancel.onclick = () => {
            labSlotPopup.close();
        };

        labSlotPopup.showModal();
    } else {
        removeLabFromCalendar(labData.name);
    }
}

function addSpecificLabToCalendar(labName, slot, sem, isRestoring = false) {
    const eventColor = "#27ae60"; 
    const dates = getSemesterDates(sem); 
    
    if (!eventTracker[labName]) eventTracker[labName] = [];

    const [startTime, endTime] = slot.time.split("-");

    let addedEvent = calendar.addEvent({
        title: `ΕΡΓΑΣΤ.: ${labName}`,
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

    if(!isRestoring) {
        let saved = getSavedLabs();
        if (!saved.some((l) => l.name === labName)) {
            saved.push({ name: labName, slot, sem }); 
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
    const examTitleStr = "ΕΞΕΤΑΣΗ: " + examData.title;
    const formattedDate = formatJSONDate(examData.date);
    const startISO = `${formattedDate}T${examData.startTime}`;
    const endISO = `${formattedDate}T${examData.endTime}`;
    const hallString = Array.isArray(examData.lectureHall)
        ? examData.lectureHall.join(", ")
        : examData.lectureHall || "N/A";

    let existing = calendar.getEvents().find((e) => e.title === examTitleStr);

    if (!existing) {
        let addedExam = calendar.addEvent({
            title: examTitleStr,
            start: startISO, 
            end: endISO,     
            color: "#e74c3c",
            extendedProps: {
                lectureHall: hallString, 
                description: examData.division ? `Κλιμάκιο: ${examData.division}` : "", 
                isExam: true,
            },
        });

        if (!eventTracker[examTitleStr]) eventTracker[examTitleStr] = [];
        eventTracker[examTitleStr].push(addedExam);

        let saved = getSavedExams();
        if (!saved.some((e) => e.title === examData.title)) {
            saved.push(examData);
            saveExams(saved);
        }
    }
}

function removeStandaloneExam(title) {
    const examTitleStr = "ΕΞΕΤΑΣΗ: " + title;
    if (eventTracker[examTitleStr]) {
        eventTracker[examTitleStr].forEach((eventObj) => eventObj?.remove());
        delete eventTracker[examTitleStr];
    }
    let saved = getSavedExams();
    saveExams(saved.filter((e) => e.title !== title));
}

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
            if (info.event.display === "background") return; 
            const occurrenceStart = info.event.start.getTime();
            const isOnHoliday = calendar.getEvents().some((h) => {
                if (h.groupId !== "holidays") return false;
                const hStart = h.start.getTime();
                const hEnd = h.end ? h.end.getTime() : hStart + 86400000;
                return occurrenceStart >= hStart && occurrenceStart < hEnd;
            });
            if (isOnHoliday) info.el.style.display = "none";
        },
    });

    calendar.render(); 
    await fetchAcademicData();
    await fetchProfessorLinks();
    await fetchTitleLinks();

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

    const savedClasses = getSavedSchedule();
    for (const item of savedClasses) {
        await addCourseToCalendar(item.title, item.semester);
        updateCourseColor(item.title, item.color); 
    }

    const savedExams = getSavedExams();
    for (const examData of savedExams) {
        addStandaloneExam(examData);
    }

    const savedLabs = getSavedLabs();
    for (const lab of savedLabs) {
        addSpecificLabToCalendar(lab.name, lab.slot, lab.sem || "General", true);
    }

    appearCalendar(); 
    resize();
    examOptions(); 
});

popup.onclick = (e) => {
    if (e.target === popup) popup.close();
};
colorBtn.onclick = () => hiddenPicker.click();

clearSelectionBtn.onclick = () => {
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

    localStorage.removeItem("userSchedule");
    localStorage.removeItem("userExams");
    localStorage.removeItem("userLabs");

};

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

        if (currentMode === "Μαθήματα") {
            const res = await fetch("/getSemester", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ semester: sem }),
            });
            const data = await res.json(); 
            const titlesArray = data.titles.map((course) => course.title); 

            const savedClasses = getSavedSchedule();

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
                    if (checkbox.disabled || e.target === checkbox) return;
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event("change"));
                };

                checkbox.onchange = () =>
                    handleCourseToggle(checkbox, title, sem);
            });
        } 
        
        else if (currentMode === "Εργαστήρια") {
            const res = await fetch("/getLabs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ semester: sem }),
            });
            const labsArray = await res.json();

            labsArray.forEach((lab, i) => {
                const div = document.createElement("div");
                div.className = "course";

                const p = document.createElement("p");
                p.textContent = lab.name;

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.className = "checkbox";
                
                checkbox.checked = !!eventTracker[lab.name];

                div.append(p, checkbox);
                SemesterDiv.appendChild(div);

                div.onclick = (e) => {
                    if (e.target === checkbox) return;
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event("change"));
                };

                checkbox.onchange = () => handleLabToggle(checkbox, lab, sem);
                
                setTimeout(() => div.classList.add("visible"), i * 50);
            });
        }

        else if (currentMode === "Εξεταστική") {
            let examsArray = [];

            if (isSeptember) {
                const res = await fetch("/jsonData/september_exams.json");
                const allSeptExams = await res.json();
                examsArray = allSeptExams.filter(exam => String(exam.semester) === String(sem));
            } else {
                const res = await fetch("/getSemesterExams", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ semester: sem }),
                });
                examsArray = await res.json(); 
            }

            const currentlySavedExams = getSavedExams();

            examsArray.forEach((examData, i) => {
                const div = document.createElement("div");
                div.className = "course"; 

                const p = document.createElement("p");
                p.textContent = examData.title; 

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.className = "checkbox";

                checkbox.checked = currentlySavedExams.some(
                    (saved) => saved.title === examData.title,
                );

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

function downloadCalendar() {
    const cal = ics();
    const events = calendar.getEvents();
    if (events.length === 0) return; 

    const excludedDates = [];
    events
        .filter((e) => e.groupId === "holidays")
        .forEach((h) => {
            let current = new Date(h.start);
            let end = h.end ? new Date(h.end) : new Date(h.start);
            if (!h.end) end.setDate(end.getDate() + 1); 

            while (current < end) {
                const pad = (n) => (n < 10 ? "0" + n : n); 
                const dateStr = `${current.getFullYear()}${pad(current.getMonth() + 1)}${pad(current.getDate())}`;

                if (!excludedDates.includes(dateStr))
                    excludedDates.push(dateStr); 
                current.setDate(current.getDate() + 1); 
            }
        });

    const daysMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    Object.values(eventTracker).forEach((subjectEvents) => {
        subjectEvents.forEach((event) => {
            if (event._def.recurringDef) {
                const days = event._def.recurringDef.typeData.daysOfWeek;
                const sem = event.extendedProps.semester || "1"; 
                const dates = getSemesterDates(sem);
                if (!dates) return;

                const rrule = {
                    freq: "WEEKLY",
                    until: dates.end,
                    byday: days.map((d) => daysMap[d]),
                };

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
                ).toISOString(), 
            );
            uniqueExams.add(event.title); 
        }
    });

    let icsString = cal.build();

    icsString = icsString.replace(
        /DTSTAMP;VALUE=DATE-TIME:(\d{8}T\d{6})/g,
        "DTSTAMP:$1Z",
    );

    icsString = icsString.replace(/DTSTART;VALUE=DATE-TIME:/g, "DTSTART:");
    icsString = icsString.replace(/DTEND;VALUE=DATE-TIME:/g, "DTEND:");
    icsString = icsString.replace(
        /UID:\d+@default/g,
        () =>
            `UID:${Math.random().toString(36).substring(2)}${Date.now()}@schedule.ics`,
    );

    if (excludedDates.length > 0) {
        icsString = icsString.replace(
            /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g,
            (match) => {
                if (match.includes("RRULE") || match.includes("rrule")) {
                    const startMatch = match.match(
                        /DTSTART(.*?):(\d{8})T(\d{6})(Z?)/,
                    ); 
                    if (startMatch) {
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

    const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = "university_schedule.ics"; 

    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link); 
}

function hideList() {
    if (window.innerWidth <= 767) return toggleScreenBtn?.click();
    const list = document.getElementById("semesterWrapper");
    list.style.display = list.style.display === "none" ? "" : "none";
    calendar.updateSize();
}

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

function resize() {
    const sidebar = document.getElementById("semesterWrapper");
    sidebar.style.height = "unset";
    sidebar.style.height = getComputedStyle(
        document.getElementById("calendar"),
    ).height;
}

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

function resizeWrapper() {
    const sidebar = document.getElementById("semesterWrapper");
    if (sidebar) {
        sidebar.style.width = "280px";
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.getElementById("semesterWrapper");
    const resizer = document.getElementById("dragHandle");

    if (!sidebar || !resizer) return; 

    let isResizing = false;

    resizer.addEventListener("mousedown", (e) => {
        isResizing = true;
        resizer.classList.add("dragging");
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none"; 
    });

    document.addEventListener("mousemove", (e) => {
        if (!isResizing) return;

        let newWidth = window.innerWidth - e.clientX;

        if (newWidth > 272 && newWidth < window.innerWidth * 0.3) {
            sidebar.style.width = `${newWidth}px`;
            sidebar.style.flex = "none"; 

            if (typeof calendar !== "undefined" && calendar) {
                calendar.updateSize(); 
            }
        }
    });

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