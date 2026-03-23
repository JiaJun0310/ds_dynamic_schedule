document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('calendar');
  
    var calendar = new FullCalendar.Calendar(calendarEl, {
      timeZone: 'UTC',
      initialView: 'timeGridFiveDay',
      locale: 'el',
      slotMinTime:'08:00:00',
      slotMaxTime:'21:00:00',
      allDaySlot: false,
      nowIndicator: true,
      height: 'auto',
      headerToolbar: {
        left: '',
        center: 'title',
      },
      views: {
        timeGridFiveDay: {
          type: 'timeGrid',
          duration: { days: 5 },
        }
      },
      events: 'subjects.json'
    });
  
    calendar.render();
  });



const buttons = document.querySelectorAll('.semesterButtons')

buttons.forEach(button => {

  button.onclick = function()
  {
    let sem = button.textContent[button.textContent.length - 1];
    const SemesterDiv = document.getElementById(`Semester${sem}`);
    
    const div1 = document.createElement("div");
    SemesterDiv.appendChild(div1);
    div1.className = "course";
    
    const p1 = document.createElement("p");
    p1.textContent = "Τεχνητή Νοημοσύνη";
    div1.appendChild(p1);

    const checkbox1 = document.createElement("input");
    checkbox1.type = "checkbox";
    div1.appendChild(checkbox1);
    checkbox1.className = "checkbox"

  



    const checkbox2 = document.createElement("checkbox");
    const checkbox3 = document.createElement("checkbox");
    const checkbox4 = document.createElement("checkbox");
    const checkbox5 = document.createElement("checkbox");
  
    SemesterDiv.appendChild(checkbox2);
    SemesterDiv.appendChild(checkbox3);
    SemesterDiv.appendChild(checkbox4);
    SemesterDiv.appendChild(checkbox5);

  }
  
})