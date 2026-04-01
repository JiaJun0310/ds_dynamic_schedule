// Global variables
let calendar;
let academicData = null;
let eventTracker = {}; // This will store exact references to your events

// Utility to get current schedule from local storage
function getSavedSchedule() {
    return JSON.parse(localStorage.getItem("userSchedule")) || [];
}

// Utility to save to local storage
function saveSchedule(scheduleArray) {
    localStorage.setItem("userSchedule", JSON.stringify(scheduleArray));
}

// Helper to get dates based on semester
function getSemesterDates(semesterNum) {
    if (!academicData || !semesterNum) return null;
    
    const formatJSONDate = (dateStr) => {
        const [day, month, year] = dateStr.trim().split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    };
    
    const isOdd = parseInt(semesterNum) % 2 !== 0;
    const semData = isOdd ? academicData.semesters[0] : academicData.semesters[1];
    
    return {
        start: formatJSONDate(semData.classes_start),
        end: formatJSONDate(semData.classes_end)
    };
}

// Initialize calendar when the page loads
document.addEventListener("DOMContentLoaded", async function () {
    var calendarEl = document.getElementById("calendar");

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
            downloadBtn: {
                text: "Λήψη (ICS)",
                click: function () { downloadCalendar(); },
            },
            viewBtn: {
                text: "Εξάμηνα",
                click: function () { hideList(); },
            },
        },
        headerToolbar: {
            left: "",
            center: "title",
            right: "downloadBtn today prev,next viewBtn",
        },
        eventClick: function (info) {
            const popup = document.getElementById("eventPopup");
            const title = document.getElementById("popTitle");
            const prof = document.getElementById("popProfessor");
            const hall = document.getElementById("popHall");
            const time = document.getElementById("popTime");

            const start = info.event.start.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
            const end = info.event.end.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

            title.innerText = info.event.title;
            prof.innerText = info.event.extendedProps.professor || "N/A";
            
            if(hall) {
                hall.innerText = info.event.extendedProps.lectureHall || "N/A";
            }
            
            time.innerText = `${start} - ${end}`;

            popup.onclick = function (event) {
                if (event.target === popup) popup.close();
            };
            popup.showModal();
        },
        eventDidMount: function(info) {
            if (info.event.display === 'background') return;
            const allEvents = calendar.getEvents();
            const occurrenceStart = info.event.start.getTime();

            const isOnHoliday = allEvents.some(holiday => {
                if (holiday.groupId !== 'holidays') return false;
                const holidayStart = holiday.start.getTime();
                const holidayEnd = holiday.end ? holiday.end.getTime() : holidayStart + (24 * 60 * 60 * 1000); 
                return occurrenceStart >= holidayStart && occurrenceStart < holidayEnd;
            });

            if (isOnHoliday) info.el.style.display = 'none';
        },
    });

    calendar.render();

    // Fetch and save JSON globally
    try {
        const response = await fetch("/jsonData/academic_calendar.json");
        if (!response.ok) throw new Error("File not found");
        
        academicData = await response.json();
        
        const formatJSONDate = (dateStr) => {
            const [day, month, year] = dateStr.trim().split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        };

        academicData.holidays.forEach((holiday) => {
            let eventConfig = { title: holiday.name, allDay: true, display: "background", color: "#a95b71", groupId: 'holidays' };
            if (holiday.date.includes(" - ")) {
                const parts = holiday.date.split(" - ");
                eventConfig.start = formatJSONDate(parts[0]);
                eventConfig.end = formatJSONDate(parts[1]); 
            } else {
                eventConfig.start = formatJSONDate(holiday.date);
            }
            calendar.addEvent(eventConfig);
        });
    } catch (err) {
        console.error("Error loading local JSON:", err);
    }

    // Load saved classes from local storage
    const savedClasses = getSavedSchedule();

    if (savedClasses.length > 0) {
        savedClasses.forEach(async (item) => {
            try {
                const response = await fetch("/getClass", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: item.title }),
                });

                if (!response.ok) throw new Error("Server error");
                const data = await response.json();

                if (data.schedules) {
                    const currentSem = item.semester;
                    const dates = getSemesterDates(currentSem);
                    eventTracker[item.title] = []; // Initialize array for this subject

                    data.schedules.forEach((schedule) => {
                        let addedEvent = calendar.addEvent({
                            title: schedule.title,
                            daysOfWeek: schedule.daysOfWeek || [schedule.day],
                            startTime: schedule.startTime || schedule.start,
                            endTime: schedule.endTime || schedule.end,
                            startRecur: dates ? dates.start : null, 
                            endRecur: dates ? dates.end : null,     
                            backgroundColor: item.color || schedule.color || "#3788d8",
                            borderColor: item.color || schedule.color || "#3788d8",
                            extendedProps: {
                                professor: schedule.professor,
                                lectureHall: schedule.lectureHall,
                                subjectTitle: item.title,
                                semester: currentSem
                            }
                        });
                        eventTracker[item.title].push(addedEvent); // Save exact reference
                    });
                }
            } catch (error) {
                console.error("Error loading saved class:", error);
            }
        });
    }
    appearCalendar();
    resize();
});

// Sidebar buttons and clear functionality
const buttons = document.querySelectorAll(".buttonDiv");
const clearSelection = document.getElementById("clearSelection");

buttons.forEach(async (button) => {
    let pressed = false;
    let cleanText = button.textContent.trim();
    let sem = cleanText[cleanText.length - 1]; 

    let arrow = button.querySelector(".pointer");
    const SemesterDiv = document.getElementById(`Semester${sem}`);

    const response = await fetch("http://localhost:8000/getSemester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semester: sem }),
    });

    const data = await response.json();
    const titlesArray = data.titles.map((course) => course.title);

    // Clear all selected courses
    clearSelection.onclick = function () {
        // Use tracker to definitively delete all subjects
        Object.keys(eventTracker).forEach(subject => {
            eventTracker[subject].forEach(eventObj => eventObj.remove());
        });
        eventTracker = {}; // Reset tracking

        document.querySelectorAll(".checkbox").forEach(cb => cb.checked = false);
        document.querySelectorAll(".colorBtn").forEach(cp => cp.style.display = "none");
        localStorage.removeItem("userSchedule");
    };

    button.onclick = async function () {
        pressed = !pressed;
        arrow.src = pressed ? "../images/down_pointer.svg" : "../images/right_pointer.svg";

        if (pressed) {
            for (let i = 0; i < titlesArray.length; i++) {
                const div = document.createElement("div");
                const p = document.createElement("p");
                const checkbox = document.createElement("input");

                SemesterDiv.appendChild(div);
                div.className = "course";

                p.textContent = titlesArray[i];
                div.appendChild(p);

                checkbox.type = "checkbox";
                div.appendChild(checkbox);
                checkbox.className = "checkbox";

                const colorBtn = document.createElement("span");
                colorBtn.innerHTML = `<img src="/images/color.svg" style="width: 20px; height: 20px; vertical-align: middle;">`;
                colorBtn.style.cursor = "pointer";
                colorBtn.style.display = "none";
                colorBtn.className = "colorBtn";
                div.appendChild(colorBtn);

                const hiddenPicker = document.createElement("input");
                hiddenPicker.type = "color";
                hiddenPicker.value = "#3788d8";
                hiddenPicker.style.display = "none";
                div.appendChild(hiddenPicker);

                setTimeout(() => div.classList.add("visible"), i * 50);

                const savedClasses = getSavedSchedule();
                const isAlreadyInCalendar = savedClasses.some(saved => saved.title === titlesArray[i]);

                if (isAlreadyInCalendar) {
                    checkbox.checked = true;
                    colorBtn.style.display = "flex";
                    const existingCourse = savedClasses.find(c => c.title === titlesArray[i]);
                    if (existingCourse && existingCourse.color) hiddenPicker.value = existingCourse.color;
                }

                div.onclick = function (event) {
                    if (checkbox.disabled || event.target === checkbox || event.target.closest(".colorBtn") || event.target === hiddenPicker) return;
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event("change"));
                };

                checkbox.onchange = async function () {
                    this.disabled = true;
                    const targetTitle = titlesArray[i];

                    try {
                        if (this.checked) {
                            const response = await fetch("/getClass", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ title: targetTitle }),
                            });

                            const data = await response.json();
                            const dates = getSemesterDates(sem);
                            eventTracker[targetTitle] = []; // Initialize tracking

                            // Check the Database for the color
                            let dbColor = data.schedules.length > 0 ? data.schedules[0].color : null;
                            let saved = getSavedSchedule();
                            
                            // If this is a new class AND your database has a color, update the picker
                            if (!saved.some(c => c.title === targetTitle) && dbColor) {
                                hiddenPicker.value = dbColor; 
                            }

                            data.schedules.forEach((item) => {
                                let addedEvent = calendar.addEvent({
                                    title: item.title,
                                    daysOfWeek: item.daysOfWeek || [item.day],
                                    startTime: item.startTime || item.start,
                                    endTime: item.endTime || item.end,
                                    startRecur: dates ? dates.start : null,
                                    endRecur: dates ? dates.end : null,
                                    backgroundColor: hiddenPicker.value,
                                    borderColor: hiddenPicker.value,
                                    extendedProps: {
                                        professor: item.professor,
                                        lectureHall: item.lectureHall,
                                        subjectTitle: targetTitle,
                                        semester: sem 
                                    },
                                });
                                eventTracker[targetTitle].push(addedEvent); // Save reference
                            });

                            colorBtn.style.display = "flex";

                            if (!saved.some(c => c.title === targetTitle)) {
                                saved.push({ title: targetTitle, color: hiddenPicker.value, semester: sem });
                                saveSchedule(saved);
                            }

                        } else {
                            // Definitively delete events via tracker
                            if (eventTracker[targetTitle]) {
                                eventTracker[targetTitle].forEach(eventObj => eventObj.remove());
                                delete eventTracker[targetTitle];
                            }
                            
                            colorBtn.style.display = "none";

                            let saved = getSavedSchedule();
                            saved = saved.filter(c => c.title !== targetTitle);
                            saveSchedule(saved);
                        }
                    } catch (error) {
                        console.error("Error updating schedule:", error);
                    } finally {
                        setTimeout(() => this.disabled = false, 1000);
                    }
                };

                colorBtn.onclick = function (event) {
                    event.stopPropagation();
                    hiddenPicker.click();
                };

                // Updates the screen instantly while dragging
                hiddenPicker.addEventListener('input', function() {
                    const newColor = this.value;
                    const targetTitle = titlesArray[i];

                    // 1. Force update the LIVE calendar screen so you see it instantly
                    calendar.getEvents().forEach(liveEvent => {
                        if (liveEvent.extendedProps.subjectTitle === targetTitle) {
                            liveEvent.setProp("backgroundColor", newColor);
                            liveEvent.setProp("borderColor", newColor);
                        }
                    });

                    // 2. Update the background memory tracker for off-screen events
                    if (eventTracker[targetTitle]) {
                        eventTracker[targetTitle].forEach(eventObj => {
                            try {
                                eventObj.setProp("backgroundColor", newColor);
                                eventObj.setProp("borderColor", newColor);
                            } catch(e) {} // Ignore if the reference temporarily detached
                        });
                    }
                });

                // Saves to database ONLY when you let go of the mouse
                hiddenPicker.addEventListener('change', function() {
                    const newColor = this.value;
                    const targetTitle = titlesArray[i];

                    let saved = getSavedSchedule();
                    let course = saved.find(c => c.title === targetTitle);
                    if (course) {
                        course.color = newColor;
                        saveSchedule(saved);
                    }
                });
            }
        } else {
            SemesterDiv.innerHTML = ``;
        }
    };
});

// ICS Download
function downloadCalendar() {
    const cal = ics();
    const daysMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

    // Use tracker for ICS download so off-screen events are included
    Object.values(eventTracker).forEach(subjectEvents => {
        subjectEvents.forEach(event => {
            const days = event._def.recurringDef.typeData.daysOfWeek;
            const sem = event.extendedProps.semester;
            const dates = getSemesterDates(sem);

            if (!dates) return;

            const rrule = { freq: "WEEKLY", until: dates.end, byday: days.map(d => daysMap[d]) };

            cal.addEvent(
                event.title,
                event.extendedProps.professor || "N/A",
                event.extendedProps.lectureHall || "", // Export lecture hall as well
                `${dates.start}T${event.startStr.split("T")[1]}`,
                `${dates.start}T${event.endStr.split("T")[1]}`,
                rrule,
            );
        });
    });

    cal.download("university_schedule");
}

function hideList() {
    if (window.innerWidth <= 767) {
        const mobileBtn = document.getElementById("toggleScreen");
        if (mobileBtn) mobileBtn.click();
        return;
    }
    const list = document.getElementById("semesterWrapper");
    list.style.display = list.style.display === "none" ? "" : "none";
    calendar.updateSize();
}

const toggleScreen = document.getElementById("toggleScreen");
toggleScreen.onclick = function () {
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
    const calendar = document.getElementById("calendar");
    const sidebar = document.getElementById("semesterWrapper");
    sidebar.style.height = "unset";
    sidebar.style.height = getComputedStyle(calendar).height;
}

function appearCalendar() {
    const list = document.getElementById("semesterWrapper");
    const calEl = document.getElementById("calendar");
    if(window.innerWidth > 767) {  
        calEl.style.setProperty("display", "flex", "important");
        calendar.updateSize();
    } else {
        calEl.style.setProperty("display", "none", "important");
        list.style.display = "flex";
    }
}

addEventListener("resize", () => {
    appearCalendar();
    resize();
});