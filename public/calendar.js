document.addEventListener("DOMContentLoaded", function () {
  var calendarEl = document.getElementById("calendar");

  var calendar = new FullCalendar.Calendar(calendarEl, {
    timeZone: "UTC",
    initialView: "timeGridFiveDay",
    locale: "el",
    slotMinTime: "08:00:00",
    slotMaxTime: "21:00:00",
    allDaySlot: false,
    nowIndicator: true,
    height: "auto",
    headerToolbar: {
      left: "",
      center: "title",
    },
    views: {
      timeGridFiveDay: {
        type: "timeGrid",
        duration: { days: 5 },
      },
    },
    events: "subjects.json",
  });

  calendar.render();
});

const buttons = document.querySelectorAll(".buttonDiv");

buttons.forEach((button) => {
  let pressed = false;

  let cleanText = button.textContent.trim(); 
  let sem = cleanText[cleanText.length - 1];

  let arrow = button.querySelector(".velaki")
  const SemesterDiv = document.getElementById(`Semester${sem}`);

  const subjects = [
    ["Ανάλυση", "Γραμμική", "Λογικη"],
    ["Ανάλυση 2", "Java", "Αρχιτεκτονικές Υπολογιστών"],
  ];



  button.onclick = function kati() {
    pressed = !pressed;

	arrow.src = pressed ? "/images/velaki_katw.svg":"/images/velaki_deksia.svg" 

    if (pressed) {
      for (let i = 0; i < subjects[sem - 1].length; i++) {

        const div = document.createElement("div");
        const p = document.createElement("p");
        const checkbox = document.createElement("input");
        // subjects[sem-1][i]
        SemesterDiv.appendChild(div);
        div.className = "course";
        p.textContent = subjects[sem - 1][i];
        div.appendChild(p);
        checkbox.type = "checkbox";
        div.appendChild(checkbox);
        checkbox.className = "checkbox";

		checkbox.onchange = function() {
			if (this.checked) {
				console.log(`${p.textContent} tick`);
			} else {
				console.log(`${p.textContent} xetick`);
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


