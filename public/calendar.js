// Global calendar instance
let calendar;

// Save current class titles to local storage
function updateLocalStorage() {
    const allEvents = calendar.getEvents();


    const classEvents = allEvents.filter(
        (event) => event.display !== "background"
    );


    const scheduleData = {};

    classEvents.forEach((event) => {
        scheduleData[event.title] = {
            title: event.title,
            color: event.backgroundColor || event.color
        };
    });


    const finalData = Object.values(scheduleData);


    localStorage.setItem("userSchedule", JSON.stringify(finalData));
}

// Initialize calendar when the page loads
document.addEventListener("DOMContentLoaded", function () {
    var calendarEl = document.getElementById("calendar");

    // FullCalendar configuration
    calendar = new FullCalendar.Calendar(calendarEl, {
        timeZone: "Europe/Athens",
        initialView: "timeGridWeek",
        locale: "el",
        firstDay: 1, // Monday
        slotMinTime: "08:00:00",
        slotMaxTime: "21:00:00",
        allDaySlot: false,
        nowIndicator: true,
        height: "auto",

        buttonText: {
            today: "Σήμερα",
        },

        // Custom toolbar buttons
        customButtons: {
            downloadBtn: {
                text: "Λήψη (ICS)",
                click: function () {
                    downloadCalendar();
                },
            },
            viewBtn: {
                text: "Εξάμηνα",
                click: function () {
                    hideList();
                },
            },
        },

        headerToolbar: {
            left: "",
            center: "title",
            right: "downloadBtn today prev,next viewBtn",
        },

        // Handle clicking on an event
        eventClick: function (info) {
            const popup = document.getElementById("eventPopup");
            const title = document.getElementById("popTitle");
            const prof = document.getElementById("popProfessor");
            const time = document.getElementById("popTime");

            // Format start and end times
            const start = info.event.start.toLocaleTimeString("el-GR", {
                hour: "2-digit",
                minute: "2-digit",
            });
            const end = info.event.end.toLocaleTimeString("el-GR", {
                hour: "2-digit",
                minute: "2-digit",
            });

            // Populate popup data
            title.innerText = info.event.title;
            prof.innerText = info.event.extendedProps.professor || "N/A";
            time.innerText = `${start} - ${end}`;

            // Close popup when clicking outside
            popup.onclick = function (event) {
                if (event.target === popup) {
                    popup.close();
                }
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
      
                const holidayEnd = holiday.end 
                    ? holiday.end.getTime() 
                    : holidayStart + (24 * 60 * 60 * 1000); 

                return occurrenceStart >= holidayStart && occurrenceStart < holidayEnd;
            });

            if (isOnHoliday) {
                info.el.style.display = 'none';
            }
        },
    });

    calendar.render();

    // Fetch and display Greek public holidays
    // fetch("https://date.nager.at/api/v3/PublicHolidays/2026/GR")
    //     .then((response) => response.json())
    //     .then((data) => {
    //         data.forEach((holiday) => {
    //             calendar.addEvent({
    //                 title: holiday.localName,
    //                 start: holiday.date,
    //                 allDay: true,
    //                 display: "background",
    //                 color: "#47538a",
    //             });
    //         });
    //     })
    //     .catch((err) => console.error("Holiday fetch failed:", err));

    fetch("/jsonData/academic_calendar.json")
        .then((response) => {
            if (!response.ok) throw new Error("File not found");
            return response.json();
        })
        .then((data) => {
        
            const formatJSONDate = (dateStr) => {
            const [day, month, year] = dateStr.trim().split('/');
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            };

            data.holidays.forEach((holiday) => {
                let eventConfig = {
                    title: holiday.name,
                    allDay: true,
                    display: "background",
                    color: "#a95b71",
                    groupId: 'holidays'
                };

            
                if (holiday.date.includes(" - ")) {
                    const parts = holiday.date.split(" - ");
                    eventConfig.start = formatJSONDate(parts[0]);
             
                    eventConfig.end = formatJSONDate(parts[1]); 
                } else {
                    eventConfig.start = formatJSONDate(holiday.date);
                }

                calendar.addEvent(eventConfig);
            });
    })
    .catch((err) => console.error("Error loading local JSON:", err));

    // Load saved classes from local storage
    const savedClasses = JSON.parse(localStorage.getItem("userSchedule")) || [];

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
                    data.schedules.forEach((schedule) => {
                        calendar.addEvent({
                            title: schedule.title,
                            daysOfWeek: schedule.daysOfWeek || [schedule.day],
                            startTime: schedule.startTime || schedule.start,
                            endTime: schedule.endTime || schedule.end,

                            color: item.color || schedule.color,
                            extendedProps: {
                                professor: schedule.professor,
                            },
                        });
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

// Sidebar semester buttons and clear functionality
const buttons = document.querySelectorAll(".buttonDiv");
const clearSelection = document.getElementById("clearSelection");

buttons.forEach(async (button) => {
    let pressed = false;
    let cleanText = button.textContent.trim();
    let sem = cleanText[cleanText.length - 1]; // Extract semester number

    let arrow = button.querySelector(".pointer");
    const SemesterDiv = document.getElementById(`Semester${sem}`);

    // Fetch courses for the specific semester
    const response = await fetch("http://localhost:8000/getSemester", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ semester: sem }),
    });

    const data = await response.json();
    const titlesArray = data.titles.map((course) => course.title);

    // Clear all selected courses from calendar
    clearSelection.onclick = function () {
        const currentEvents = calendar.getEvents();

        currentEvents.forEach((event) => {
            if (event.display !== "background") {
                event.remove();
            }
        });

        const allCheckboxes = document.querySelectorAll(".checkbox");
        allCheckboxes.forEach((checkbox) => {
            checkbox.checked = false;
        });

        const allColorPickers = document.querySelectorAll(".colorBtn");
        allColorPickers.forEach((colorPicker) => {
            colorPicker.style.display = "none";
        });

        updateLocalStorage();
    };

    // Toggle semester course list dropdown
    button.onclick = async function () {
        pressed = !pressed;

        // Update arrow icon
        arrow.src = pressed
            ? "../images/down_pointer.svg"
            : "../images/right_pointer.svg";

        if (pressed) {
            // Populate courses for this semester
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

                // Setup color picker button
                const colorBtn = document.createElement("span");
                colorBtn.innerHTML = `<img src="/images/color.svg" style="width: 20px; height: 20px; vertical-align: middle;">`;
                colorBtn.style.cursor = "pointer";
                colorBtn.style.display = "none";
                colorBtn.className = "colorBtn";
                div.appendChild(colorBtn);

                // Setup hidden color input
                const hiddenPicker = document.createElement("input");
                hiddenPicker.type = "color";
                hiddenPicker.value = "#3788d8";
                hiddenPicker.style.display = "none";
                div.appendChild(hiddenPicker);

                // Animate row entry
                setTimeout(() => {
                    div.classList.add("visible");
                }, i * 50);

                // Check if course is already in the calendar
                const allEvents = calendar.getEvents();
                const isAlreadyInCalendar = allEvents.some(
                    (event) => event.title === titlesArray[i],
                );


                if (isAlreadyInCalendar) {
                    checkbox.checked = true;
                    colorBtn.style.display = "flex";

                    const existingEvent = allEvents.find(event => event.title === titlesArray[i]);
                    if (existingEvent) {
                        hiddenPicker.value = existingEvent.backgroundColor || existingEvent.color;
                    }
                }

                // Handle row click to toggle checkbox
                div.onclick = function (event) {
                    if (checkbox.disabled) {
                        return;
                    }

                    // Prevent double firing when clicking elements directly
                    if (
                        event.target === checkbox ||
                        event.target.closest(".colorBtn") ||
                        event.target === hiddenPicker
                    ) {
                        return;
                    }

                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event("change"));
                };

                // Handle checkbox change (add/remove class)
                checkbox.onchange = async function () {
                    this.disabled = true;
                    const isChecked = this.checked;

                    try {
                        if (isChecked) {
                            // Fetch and add class to calendar
                            const response = await fetch("/getClass", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ title: titlesArray[i] }),
                            });

                            const data = await response.json();

                            data.schedules.forEach((item) => {
                                calendar.addEvent({
                                    title: item.title,
                                    daysOfWeek: item.daysOfWeek || [item.day],
                                    startTime: item.startTime || item.start,
                                    endTime: item.endTime || item.end,
                                    color: item.color,
                                    extendedProps: {
                                        professor: item.professor,
                                    },
                                });
                            });

                            colorBtn.style.display = "flex";
                        } else {
                            // Remove class from calendar
                            const targetTitle = titlesArray[i];
                            const allEvents = calendar.getEvents();

                            colorBtn.style.display = "none";
                            allEvents.forEach((event) => {
                                if (event.title === targetTitle) {
                                    event.remove();
                                }
                            });
                        }
                    } catch (error) {
                        console.error("Error updating schedule:", error);
                    } finally {
                        updateLocalStorage();
                        setTimeout(() => {
                            this.disabled = false;
                        }, 1000);
                    }
                };

                // Trigger hidden color picker on click
                colorBtn.onclick = function (event) {
                    event.stopPropagation();
                    hiddenPicker.click();
                };

                // Apply new color to events in real-time
                hiddenPicker.oninput = function () {
                    const allEvents = calendar.getEvents();
                    const newColor = this.value;

                    const matchingEvents = allEvents.filter(
                        (event) => event.title === titlesArray[i],
                    );

                    matchingEvents.forEach((event) => {
                        event.setProp("backgroundColor", newColor);
                        event.setProp("borderColor", newColor);
                    });

                    updateLocalStorage();
                };
            }

        } else {
            // Close dropdown
            SemesterDiv.innerHTML = ``;
        }
    };
});

// Export schedule as an ICS file
function downloadCalendar() {
    const cal = ics();
    const events = calendar.getEvents();
    if (events.length === 0) return;

    const daysMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    const timezoneOffset = "+02:00";
    const semesterStart = "2026-02-15"; // imerominia arxis examinou
    const semesterEnd = "2026-06-15"; // imerominia telos examinou

    events.forEach((event) => {
        if (event.display === "background") return;

        const days = event._def.recurringDef.typeData.daysOfWeek;

        const rrule = {
            freq: "WEEKLY",
            until: semesterEnd,
            byday: days.map((d) => daysMap[d]),
        };

        cal.addEvent(
            event.title,
            event.extendedProps.professor,
            "",
            `${semesterStart}T${event.startStr.split("T")[1]}`,
            `${semesterStart}T${event.endStr.split("T")[1]}`,
            rrule,
        );
    });

    cal.download("university_schedule");
}

// Toggle between calendar view and list view
function hideList() {
    if (window.innerWidth <= 767) {
        const mobileBtn = document.getElementById("toggleScreen");
        if (mobileBtn) {
            mobileBtn.click();
        }
        return;
    }

    const list = document.getElementById("calendarWrapper");

    if (list.style.display === "none") {
        list.style.display = "";
        calendar.updateSize();
    } else {
        list.style.display = "none";
        calendar.updateSize();
    }
}

// Mobile toggle button functionality
const toggleScreen = document.getElementById("toggleScreen");

toggleScreen.onclick = function () {
    const list = document.getElementById("calendarWrapper");
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

// resize sidebar based on the calendar
function resize() {
    const calendar = document.getElementById("calendar");
    const sidebar = document.getElementById("calendarWrapper");
    sidebar.style.height = "unset";
    console.log(getComputedStyle(calendar).height);
    sidebar.style.height = getComputedStyle(calendar).height;
}

function appearCalendar()
{
    const calEl = document.getElementById("calendar");
    if(window.innerWidth > 767)
    {  
        calEl.style.setProperty("display", "flex", "important");
        calendar.updateSize();
    }
    else
    {
        calEl.style.setProperty("display", "none", "important");
        list.style.display = "flex";
    }
    
}

addEventListener("resize", (_e) => {
    appearCalendar();
    resize();
})

