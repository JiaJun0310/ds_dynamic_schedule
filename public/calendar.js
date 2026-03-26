let calendar;

document.addEventListener("DOMContentLoaded", function () {
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

        buttonText: {
            today: "Σήμερα",
        },

        customButtons: {
            downloadBtn: {
                text: "Λήψη (ICS)",
                click: function () {
                    downloadCalendar();
                },
            },
            viewBtn:{
                text: "Change Display",
                click: function(){
                    hideList();
                }
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
            const time = document.getElementById("popTime");

            const start = info.event.start.toLocaleTimeString("el-GR", {
                hour: "2-digit",
                minute: "2-digit",
            });
            const end = info.event.end.toLocaleTimeString("el-GR", {
                hour: "2-digit",
                minute: "2-digit",
            });

            title.innerText = info.event.title;
            prof.innerText = info.event.extendedProps.professor || "N/A";
            time.innerText = `${start} - ${end}`;

            popup.onclick = function (event) {
                if (event.target === popup) {
                    popup.close();
                }
            };

            popup.showModal();
        },
        // events: "subjects.json"
    });

    calendar.render();
    fetch("https://date.nager.at/api/v3/PublicHolidays/2026/GR")
        .then((response) => response.json())
        .then((data) => {
            data.forEach((holiday) => {
                calendar.addEvent({
                    title: holiday.localName,
                    start: holiday.date,
                    allDay: true,
                    display: "background",
                    color: "#a244b5",
                });
            });
        })
        .catch((err) => console.error("Holiday fetch failed:", err));
});

const buttons = document.querySelectorAll(".buttonDiv");

buttons.forEach(async (button) => {
    let pressed = false;

    let cleanText = button.textContent.trim();
    let sem = cleanText[cleanText.length - 1];

    let arrow = button.querySelector(".velaki");
    const SemesterDiv = document.getElementById(`Semester${sem}`);

    console.log(sem);
    const response = await fetch("http://localhost:8000/getSemester", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ semester: sem }),
    });

    const data = await response.json();

    const titlesArray = data.titles.map((course) => course.title);

    button.onclick = async function kati() {
        pressed = !pressed;
        arrow.src = pressed
            ? "../images/velaki_katw.svg"
            : "../images/velaki_deksia.svg";

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

                setTimeout(() => {
                    div.classList.add("visible");
                }, i * 50);

                const allEvents = calendar.getEvents();
                const isAlreadyInCalendar = allEvents.some(
                    (event) => event.title === titlesArray[i],
                );

                if (isAlreadyInCalendar) {
                    checkbox.checked = true;
                    console.log(
                        `${titlesArray[i]} is already in the calendar.`,
                    );
                }

                div.onclick = function () {
                    if(event.target === checkbox)
                    {
                        return;
                    }
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event("change"));
                };

                

                checkbox.onchange = async function () {
                    if (this.checked) {
                        const response = await fetch("/getClass", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ title: titlesArray[i] }),
                        });

                        const data = await response.json();

                        const classData = data.schedules[0];

                        calendar.addEvent({
                            title: classData.title,
                            daysOfWeek: classData.daysOfWeek,
                            startTime: classData.startTime,
                            endTime: classData.endTime,
                            color: classData.color,
                            extendedProps: {
                                professor: classData.professor,
                            },
                        });
                    } else {
                        const targetTitle = titlesArray[i];
                        const allEvents = calendar.getEvents();

                        const eventToRemove = allEvents.find(
                            (event) => event.title === targetTitle,
                        );

                        if (eventToRemove) {
                            eventToRemove.remove();
                        }
                    }
                };
            }

            const checkbox2 = document.createElement("checkbox");
            const checkbox3 = document.createElement("checkbox");
            const checkbox4 = document.createElement("checkbox");
            const checkbox5 = document.createElement("checkbox");

            SemesterDiv.appendChild(checkbox2);
            SemesterDiv.appendChild(checkbox3);
            SemesterDiv.appendChild(checkbox4);
            SemesterDiv.appendChild(checkbox5);
        } else {
            SemesterDiv.innerHTML = ``;
        }
    };
});

function downloadCalendar() {
    const cal = ics();
    const events = calendar.getEvents();
    if (events.length === 0) return;

    const daysMap = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    const timezoneOffset = "+02:00";
    const semesterStart = "2026-02-15"; // imerominia arxis examinou
    const semesterEnd = "2026-06-15"; // imerominia telos examinou

    events.forEach((event) => {
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

function hideList(){
    const list = document.getElementById("semesters");
    if (list.style.display === "none")
    {
        list.style.display = ""
        calendar.updateSize();
    }
    else
    {
        list.style.display = "none";
        calendar.updateSize();
    }
    

}
