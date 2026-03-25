let calendar;

document.addEventListener("DOMContentLoaded", function () {
    var calendarEl = document.getElementById("calendar");

    calendar = new FullCalendar.Calendar(calendarEl, {
        themeSystem: "bootstrap5",
        timeZone: "UTC",
  
        initialView: "timeGridWeek", 
        locale: "el",
        

        firstDay: 1, 
        
        slotMinTime: "08:00:00",
        slotMaxTime: "21:00:00",
        allDaySlot: false,
        nowIndicator: true,
        height: "auto",

		headerToolbar: {
            left: "", 
            center: "title",
            right: "today prev,next" 
        },
        
        events: "subjects.json",
    });

    calendar.render();
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
    //console.log(data);

    const titlesArray = data.titles.map((course) => course.title);

    console.log(titlesArray);

    //   const subjectsFull = [
    // 	["1", "Ανάλυση", [4, 5], "09:15:00","10:00:00","#3788d8", "1"],
    //     ["2", "Γραμμική", [4, 5], "10:15:00","12:00:00","#1b4d80", "1"],
    //     ["3", "Λογική", [0, 3], "10:15:0d0","12:00:00","#05203a", "1"],
    //     ["4", "Ανάλυση 2", [0, 3], "8:15:00","10:00:00","#37d837", "2"],
    //     ["5", "Java", [1], "13:15:00","15:00:00","#219c21", "2"],
    //     ["6", "Αρχιτεκτονικές Υπολογιστών", [4], "12:15:00", "15:00:00", "#0b560b", "2"]
    //   ]

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
                // subjects[sem-1][i]
                SemesterDiv.appendChild(div);
                div.className = "course";

                p.textContent = titlesArray[i];
                div.appendChild(p);
                checkbox.type = "checkbox";
                div.appendChild(checkbox);
                checkbox.className = "checkbox";

				const allEvents = calendar.getEvents();
				const isAlreadyInCalendar = allEvents.some(event => event.title === titlesArray[i]);

				if (isAlreadyInCalendar) {
					checkbox.checked = true; // This makes the checkbox appear checked
					console.log(`${titlesArray[i]} is already in the calendar.`);
				}

                checkbox.onchange = async function () {
                    if (this.checked) {
                        // console.log(`${p.textContent} tick`);

                        // id = subjectsFull[i][0]
						

                        const response = await fetch("/getClass", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ title: titlesArray[i] }),
                        });

                        const data = await response.json();

                        const classData = data.schedules[0];
                        console.log(classData);

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
                        // Force the ID to be a string
						const targetTitle = titlesArray[i];
						const allEvents = calendar.getEvents(); 

						const eventToRemove = allEvents.find(event => event.title === targetTitle);
						
						if (eventToRemove) {
							eventToRemove.remove();
						}
                    }
                };
            }

            // SemesterDiv.appendChild(div1);
            // div1.className = "course";

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
