# Dynamic Scheduler

This project allows students to create their personal academic schedule based on the courses and labs they are going to attend. In addition, students can also generate their exam schedule in the same way.

The system works by allowing the administrator to upload the academic calendar, the course and lab schedules, and the exam timetable. Once the data is uploaded and processed, students can select their corresponding courses and labs, and the system automatically creates their personalized schedules.

## Features

- Upload academic calendar
- Upload course and lab schedules
- Upload exam schedules
The only files required are three pdf files (courses, academic calendar and exam schedules) and an excel file (the lab schedule). The data is extracted and stored automaticaly through AI powered pipelines. The files are uploaded in a secured admin page in which only the admin has access.

- Generate personal student timetable
- Generate personal exam schedule
- Easy course/lab selection
The previously extracted data populate the calendar's main page, under their respective semesters. From there the user can choose their courses/labs/exams with full customization possibilities.

- Easy .ics Download
With the click of a button the user can export the schedule they created and add it to their calendar through a .ics file. Holiday dates are left blank with no reoccuring classes.

- Easy Data Manipulation from Admin
Through the admin page, any schedule changes in hours, days, proffessors etc. are easily performed by a single admin and the whole page is instantly updated. 

## Installation

To install all dependencies, open the terminal and run the command "npm i"

## Configuration

Used in pipelines to extract data. API keys are required for use.
- LlamaCloud 
- ChatGoogleGenerativeAI

Used to force Gemini to follow a schema
- ChatPromptTemplate 

## Tech Stack

Languages
- HTML
- JavaScript
- CSS
- Node.js

Frameworks
- Express

Libraries
- Bcrypt
- jsonwebtoken
- cookie-parser
- multer
- child_process
- https://github.com/nwcell/ics.js/ for the calendar ics download

Open Source Calendar
- FullCalendar from fullcalendar.io

## Future Improvements

- Add authentication
- Add export to PDF

## Author

Ioannis Vettas - johnvettas7@gmail.com
Vasiliki Menagia - vasilikimenagia@gmail.com
Chen Jia Jun - chenjiajun0310@gmail.com
Argyris Theofilopoulos - Aris.theofil@gmail.com
Dimitrios Triantafyllidis-Maragkos - dimitristrianta07@gmail.com

To report any bugs or other issues, contact any of us via email.