

let calendar;

document.addEventListener("DOMContentLoaded", function () {

  var calendarEl = document.getElementById("calendar");



    calendar = new FullCalendar.Calendar(calendarEl, {
	themeSystem: 'bootstrap5',
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


  const subjectsFull = [
	["1", "Ανάλυση", [4, 5], "09:15:00","10:00:00","#3788d8", "1"],
    ["2", "Γραμμική", [4, 5], "10:15:00","12:00:00","#1b4d80", "1"],
    ["3", "Λογική", [0, 3], "10:15:00","12:00:00","#05203a", "1"],
    ["4", "Ανάλυση 2", [0, 3], "8:15:00","10:00:00","#37d837", "2"],
    ["5", "Java", [1], "13:15:00","15:00:00","#219c21", "2"],
    ["6", "Αρχιτεκτονικές Υπολογιστών", [4], "12:15:00", "15:00:00", "#0b560b", "2"]
  ]

  button.onclick = function kati() {
    pressed = !pressed;

	arrow.src = pressed ? "../images/velaki_katw.svg":"../images/velaki_deksia.svg" 

    if (pressed) {
      for (let i = 0; i < subjectsFull.length; i++) {

        if(sem == subjectsFull[i][6]){
    
            const div = document.createElement("div");
            const p = document.createElement("p");
            const checkbox = document.createElement("input");
        // subjects[sem-1][i]
            SemesterDiv.appendChild(div);
            div.className = "course";
            p.id = subjectsFull[i][0]

            p.textContent = subjectsFull[i][1];
            div.appendChild(p);
            checkbox.type = "checkbox";
            div.appendChild(checkbox);
            checkbox.className = "checkbox";

		    checkbox.onchange = function() {
			    if (this.checked) {
				    console.log(`${p.textContent} tick`);

				    id = subjectsFull[i][0]
				
                    console.log("ID =" + id)

				    for (let i = 0; i < subjectsFull.length; i++)
				    {
					
					    if(id == subjectsFull[i][0])
					    {	
						    calendar.addEvent({
							    id: subjectsFull[i][0],
        					    title: subjectsFull[i][1], 
							    daysOfWeek: subjectsFull[i][2],        
        					    startTime: subjectsFull[i][3],      
        					    endTime: subjectsFull[i][4],     
							    color: subjectsFull[i][5],
        					    allDay: false                   
    					    });
                            break
						
					    }
					
				    }

				

			} else {
				id = subjectsFull[i][0]
				console.log(id);
				console.log(`${p.textContent} xetick`);
				let event = calendar.getEventById(id);
				console.log(event)
        		if (event)
				{
					event.remove();
				} 
			}
                                                                                                                      
		};
    }
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


