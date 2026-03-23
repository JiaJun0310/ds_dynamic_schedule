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