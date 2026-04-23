document.querySelectorAll(".fileBox").forEach((box) => {
    const button = box.querySelector("button");
    const input = box.querySelector("input");
    const id = input.name;
    const overlay = document.getElementById("loadingOverlay");

    button.onclick = async () => {
        //Basic check: is a file selected?
        if (input.files.length === 0) {
            alert("Παρακαλώ επιλέξτε ένα αρχείο!");
            return;
        }

        //CREATE the formData 
        const formData = new FormData();
        const ext = input.files[0].name.split(".").pop();
        const newName = id + "." + ext; //Creates name for file (e.g. acCal.pdf)
        const finalFile = new File([input.files[0]], newName, {
            type: input.files[0].type,
        });

        formData.append("uploadedFile", finalFile); //adds uploaded file into form

        try { //start the uploading and pipeline process
            // Show the loading screen
            overlay.style.display = "flex";

            // Upload the file with API
            const response = await fetch("/upload", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (response.ok) { //if file was uploaded correctly 
                input.value = ""; //reset the value

                // If it's a schedule, trigger the schedule_extractor.js
                if (id === "schedule") {
                    const extractResponse = await fetch( //API to run schedule_extractor.js
                        "/run_schedule_extractor",
                        {
                            method: "POST",
                        },
                    );
                    const extractData = await extractResponse.text(); //the response in text of the API

                    const syncResponse = await fetch("/sendData", { //After creating the .json in jsonData imediatly send it to the database with /sendData
                        method: "POST",
                    });
                    const syncResult = await syncResponse.json();

                    alert( //If everything goes correct (which it will because it's an amazing pipeline) this alert will apear 
                        "Η διαδικασία ολοκληρώθηκε!\n1. Εξαγωγή: " +
                        extractData +
                        "\n2. Database: " +
                        (syncResult.message || "Updated"),
                    );
                } else if (id === "acCal") { //If the document uploaded was in the accademic calendar field 
                    const extractResponse = await fetch(
                        "/run_acCal_extractor",
                        {
                            method: "POST",
                        },
                    );
                    const extractData = await extractResponse.text();
                    alert("Ολοκληρώθηκε: " + extractData); //Extraction complite and file saved as academic_calendar.json
                } 
                else if (id === "labs") {
                    const extractResponse = await fetch(
                        "/run_labs_extractor",
                        {
                            method: "POST",
                        },
                    );
                    const extractData = await extractResponse.text();

                    const syncResponse = await fetch("/sendLabData", { //After creating the .json in jsonData imediatly send it with /sendData
                        method: "POST",
                    });

                    const syncResult = await syncResponse.json();
                    alert( //If everything goes correct (which it will because it's an amazing pipeline) this alert will apear 
                        "Η διαδικασία ολοκληρώθηκε!\n1. Εξαγωγή: " +
                        extractData +
                        "\n2. Files: " +
                        (syncResult.message || "Updated"),
                    );
                } 
                else if (id === "exams") {
                    const extractResponse = await fetch(
                        "/run_exams_extractor",
                        {
                            method: "POST",
                        },
                    );
                    const extractData = await extractResponse.text();

                    const syncResponse = await fetch("/sendExamData", { //After creating the .json in jsonData imediatly send it to the database with /sendData
                        method: "POST",
                    });

                    const syncResult = await syncResponse.json();
                    alert( //If everything goes correct (which it will because it's an amazing pipeline) this alert will apear 
                        "Η διαδικασία ολοκληρώθηκε!\n1. Εξαγωγή: " +
                        extractData +
                        "\n2. Database: " +
                        (syncResult.message || "Updated"),
                    );
                } else {
                    alert("Το αρχείο ανέβηκε!");
                }
            } else {
                alert("Σφάλμα: " + result.message); //Something went wrong when uploading file
            }
        } catch (error) { //exeption error, could be exprided Token TODO: Alert user that token may be expired.
            console.error("Error:", error);
            alert("Παρουσιάστηκε σφάλμα.");
        } finally {
            //After everything executes hide the loading screen
            overlay.style.display = "none";
        }
    };
});

//for admin
const adminPage = document.querySelector(".adminWrapper");
const editButtonWrapper = document.querySelector(".editButtonWrapper");

//for program
const editProgramButton = document.getElementById("editProgramButton");
const programSelectWrapper = document.getElementById("programSelectWrapper")
const editWrapper = document.getElementById("editWrapper")
const backButton = document.getElementById("backButton")
const semesterSelect = document.getElementById("programSemester");
const courseSelect = document.getElementById("courses");

//for exams
const editExamButton = document.getElementById("editExamButton")
const examsSelectWrapper = document.getElementById("examsSelectWrapper")
const examsBackButton = document.getElementById("examsBackButton")
const examsSemesterSelect = document.getElementById("examsSemester");
const examsCourseSelect = document.getElementById("examsCourses");
const examsEditWrapper = document.getElementById("examsEditWrapper")

//for labs
const editLabButton = document.getElementById("editLabButton")
const labsSelectWrapper = document.getElementById("labsSelectWrapper")
const labsBackButton = document.getElementById("labsBackButton")
const labsSemesterSelect = document.getElementById("labsSemester");
const labsCourseSelect = document.getElementById("labsCourses");
const labsEditWrapper = document.getElementById("labsEditWrapper")

//When the edit button is clicked it over writes the admin page and loads the program edit page
editProgramButton.onclick = () => {

    adminPage.style.display = "none";
    editButtonWrapper.style.display = "none";

    programSelectWrapper.style.display = "flex";
    editWrapper.style.display = "flex";

};

//When the edit button is clicked it over writes the admin page and loads the exams edit page
editExamButton.onclick = () => {

    adminPage.style.display = "none";
    editButtonWrapper.style.display = "none";

    examsSelectWrapper.style.display = "flex";
    examsEditWrapper.style.display = "flex";

};

//When the edit button is clicked it over writes the admin page and loads the labs edit page
editLabButton.onclick = () => {

    adminPage.style.display = "none";
    editButtonWrapper.style.display = "none";

    labsSelectWrapper.style.display = "flex";
    labsEditWrapper.style.display = "flex";

};


//When the back button is pressed it clears the content of the program edit page and overwrites it with the admin page
backButton.onclick = () => {

    editWrapper.innerHTML = "";
    semesterSelect.selectedIndex = 0;
    courseSelect.innerHTML = "";


    adminPage.style.display = "flex";
    editButtonWrapper.style.display = "flex";

    programSelectWrapper.style.display = "none";
    editWrapper.style.display = "none";
}

//When the back button is pressed it clears the content of the exam edit page and overwrites it with the admin page
examsBackButton.onclick = () => {

    examsEditWrapper.innerHTML = "";
    examsSemesterSelect.selectedIndex = 0;
    examsCourseSelect.innerHTML = "";


    adminPage.style.display = "flex";
    editButtonWrapper.style.display = "flex";

    examsSelectWrapper.style.display = "none";
    examsEditWrapper.style.display = "none";
}

//When the back button is pressed it clears the content of the lab edit page and overwrites it with the admin page
labsBackButton.onclick = () => {

    labsEditWrapper.innerHTML = "";
    labsSemesterSelect.selectedIndex = 0;
    labsCourseSelect.innerHTML = "";


    adminPage.style.display = "flex";
    editButtonWrapper.style.display = "flex";

    labsSelectWrapper.style.display = "none";
    labsEditWrapper.style.display = "none";
}


//loads the corresponding courses of the semester based on the json for the program
semesterSelect.addEventListener("change", async () => {

    //get the value of the semester
    const semester = semesterSelect.value[semesterSelect.value.length - 1];

    //fetching the courses of the selected semester of the database
    try {
        const response = await fetch("/getSemester", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ semester: semester }),
        });

        if (!response.ok) {
            throw new Error("Failed to fetch courses");
        }

        const data = await response.json();
        const courses = data.titles.map((course) => course.title);

        //clears the previous data in order to load the new ones
        courseSelect.innerHTML = "";

        //set a default option so that it does not show a course at first
        const defaultOption = document.createElement("option");
        defaultOption.textContent = "Επέλεξε Μάθημα:";
        defaultOption.disabled = true;
        defaultOption.selected = true;

        courseSelect.appendChild(defaultOption);

        //append it's course to the choice box
        courses.forEach((course) => {
            const option = document.createElement("option");
            option.value = course;
            option.textContent = course;
            courseSelect.appendChild(option);
        });
    } catch (error) {
        console.error(error);
        alert("Could not load courses for this semester.");
    }
});


//creates dynamically the corresponding info of the course based on the json for the program
courseSelect.addEventListener("change", async () => {

    //getting the value of the selected course
    const course = courseSelect.value;

    try {
        const response = await fetch("/getClass", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: course }),
        });

        if (!response.ok) {
            throw new Error("Failed to fetch course information");
        }

        const data = await response.json();

        // 1. Create a safe title by replacing double quotes with HTML entities
        const safeTitle = data.schedules[0].title.replace(/"/g, '&quot;');

        //clear the previous content 
        editWrapper.innerHTML = "";

        const generalDiv = document.createElement("div");
        generalDiv.classList.add("editCourse");

        //generate the general info dynamically
        generalDiv.innerHTML = `
            <form id="generalForm">
                <h2>Γενικά Στοιχεία</h2>

                <label class="title">Όνομα Μαθήματος:
                    <input type="text" name="title" value="${safeTitle}" readonly>
                </label><br>

                <label class="Semesters">Εξάμηνο:
                 
                    <select name="semester">
                        ${[1, 2, 3, 4, 5, 6, 7, 8].map(s => `
                            <option value="${s}" ${s == semesterSelect.value[semesterSelect.value.length - 1] ? "selected" : ""}>
                                ${s}
                            </option>
                        `).join("")}
                    </select>

                </label><br>

                <label class="professor">Καθηγητές:
                    <input type="text" name="professor" value="${data.schedules[0].professor}">
                </label><br>
            </form>
        `;
        
        editWrapper.appendChild(generalDiv);

        //generate the lecture info dynamically
        data.schedules.forEach((lecture, i) => {

            const div = document.createElement("div");
            div.classList.add("editCourse");

            div.innerHTML = `
                <form class="lectureForm">
                    <h3>Διάλεξη ${i + 1}</h3>

                    <label class="lectureHall">Αμφιθέατρο:
                        <input type="text" name="lectureHall" value="${lecture.lectureHall}">
                    </label><br>

                    <label class="daysOfWeek">Ημέρα:

                        <select name="day">
                            ${[1, 2, 3, 4, 5].map(d => `
                                <option value="${d}" ${d == lecture.day ? "selected" : ""}>
                                    ${d}
                                </option>
                            `).join("")}
                        </select>
                       
                    </label><br>

                    <label class="startTime">Ώρα Έναρξης:
                        <input type="time" name="start" value="${lecture.start ? lecture.start.slice(0, 5) : ""}">
                    </label><br>

                    <label class="endTime">Ώρα Λήξης:
                        <input type="time" name="end" value="${lecture.end ? lecture.end.slice(0, 5) : ""}">
                    </label><br>
                </form>
            `;

            editWrapper.appendChild(div);
        });

        //create the save button dynamically
        const button = document.createElement("button");
        button.textContent = "Αποθήκευση";
        button.id = "saveButton";

        editWrapper.appendChild(button);

    } catch (error) {
        console.error(error);
        alert("Could not load course.");
    }
});

//when save button is pressed it changes the data on the json for the program
editWrapper.addEventListener("click", async (e) => {

    //Only run if save button was pressed
    if (e.target.id !== "saveButton") return;

    const generalForm = document.getElementById("generalForm");
    const lectureForms = editWrapper.querySelectorAll(".lectureForm");

    const generalData = new FormData(generalForm);

    //final object sent to backend
    const updatedCourse = {
        title: generalData.get("title"),
        semester: parseInt(generalData.get("semester")),
        professor: generalData.get("professor"),
        daysOfWeek: [],
        startTime: [],
        endTime: [],
        lectureHall: []
    };

    //check if time is valid(start time < end time)
    let validTime = true;

    lectureForms.forEach(form => {
        const formData = new FormData(form);

        const start = formData.get("start");
        const end = formData.get("end");

        if (start >= end) {
            alert("Η ώρα έναρξης πρέπει να είναι πριν την ώρα λήξης!");
            validTime = false;
            return;
        }
    });

    //if time not valid stop 
    if (!validTime){
        return;
    } 

    //collect lecture data into arrays
    lectureForms.forEach(form => {
        const formData = new FormData(form);

        updatedCourse.daysOfWeek.push(parseInt(formData.get("day")));
        updatedCourse.startTime.push(formData.get("start"));
        updatedCourse.endTime.push(formData.get("end"));
        updatedCourse.lectureHall.push(formData.get("lectureHall"));
    });

   try {
        const response = await fetch("/updateCourse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedCourse),
        });

        if (!response.ok) throw new Error("Failed");

        const result = await response.json();
        alert(result.message || "Saved!");

    } catch (error) {
        console.error(error);
        alert("Failed to update course.");
    }
});


//loads the corresponding exams of the semester based on the json for the exams
examsSemesterSelect.addEventListener("change", async () => {

    //get the value of the semester
    const semester = examsSemesterSelect.value[examsSemesterSelect.value.length - 1];

    //fetching the exams of the selected semester of the database
    try {
        const response = await fetch("/getSemesterExams", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ semester: semester }),
        });

        if (!response.ok) {
            throw new Error("Failed to fetch exam");
        }

        const data = await response.json();
        const exams = data.map((exam) => exam.title);

        //clears the previous data in order to load the new ones
        examsCourseSelect.innerHTML = "";

        //set a default option so that it does not show a exams at first
        const defaultOption = document.createElement("option");
        defaultOption.textContent = "Επέλεξε Μάθημα:";
        defaultOption.disabled = true;
        defaultOption.selected = true;

        examsCourseSelect.appendChild(defaultOption);

        //append it's exams to the choice box
        exams.forEach((exam) => {
            const option = document.createElement("option");
            option.value = exam;
            option.textContent = exam;
            examsCourseSelect.appendChild(option);
        });
    } catch (error) {
        console.error(error);
        alert("Could not load exam for this semester.");
    }
});


//creates dynamically the corresponding info of the exams based on the json for the exams
examsCourseSelect.addEventListener("change", async () => {

    //getting the value of the selected course
    const course = examsCourseSelect.value;

    try {
        const response = await fetch("/getExam", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: course }),
        });

        if (!response.ok) {
            throw new Error("Failed to fetch exam information");
        }

        const data = await response.json();
        
        // 1. Create a safe exam title by replacing double quotes with HTML entities
        const safeExamTitle = data.exam.title.replace(/"/g, '&quot;');

        const formatDate = (dateStr) => {
            if (!dateStr) return "";
            const [day, month, year] = dateStr.split("/");
            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        };

        //clear the previous content 
        examsEditWrapper.innerHTML = "";

        const examsDiv = document.createElement("div");
        examsDiv.classList.add("editCourse");

        //generate the general info dynamically
        examsDiv.innerHTML = `
            <form id="examsForm">
                <h2>Πληροφορίες Εξεταστικής</h2>

                <label class="examsTitle">Όνομα Μαθήματος:
                    <input type="text" name="title" value="${safeExamTitle}" readonly>
                </label><br>

                <label class="examsLectureHall">Αμφιθέατρο:
                    <input type="text" name="lectureHall" value="${data.exam.lectureHall}">
                </label><br>

                <label class="examsSemesters">Εξάμηνο:
                 
                    <select name="semester">
                        ${[1, 2, 3, 4, 5, 6, 7, 8].map(s => `
                            <option value="${s}" ${s == examsSemesterSelect.value[examsSemesterSelect.value.length - 1] ? "selected" : ""}>
                                ${s}
                            </option>
                        `).join("")}
                    </select>
                
                </label><br>

                <label class="examsDate">Ημερομηνία:
                    <input type="date" name="date" value="${formatDate(data.exam.date)}">
                </label><br>

                <label class="examsStartTime">Ώρα Έναρξης:
                    <input type="time" name="start" value="${data.exam.startTime ? data.exam.startTime.slice(0, 5) : ""}">
                </label><br>

                <label class="examsEndTime">Ώρα Λήξης:
                    <input type="time" name="end" value="${data.exam.endTime ? data.exam.endTime.slice(0, 5) : ""}">
                </label><br>

                <label class="examsDivision">Ομάδες:
                    <input type="text" name="division" value="${data.exam.division}">
                </label><br>

            </form>
        `;
        
        examsEditWrapper.appendChild(examsDiv);

        //create the save button dynamically
        const button = document.createElement("button");
        button.textContent = "Αποθήκευση";
        button.id = "examSaveButton";

        examsEditWrapper.appendChild(button);

    } catch (error) {
        console.error(error);
        alert("Could not load exam.");
    }
});


//when save button is pressed it changes the data on the json for the exams
examsEditWrapper.addEventListener("click", async (e) => {

    //Only run if save button was pressed
    if (e.target.id !== "examSaveButton") return;

    const examsForm = document.getElementById("examsForm");

    const examsData = new FormData(examsForm);

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const [year, month, day] = dateStr.split("-");
        return `${day}/${month}/${year}`;
    };

    //final object sent to backend
    const updatedCourse = {
        title: examsData.get("title"),
        semester: parseInt(examsData.get("semester")),
        date: formatDate(examsData.get("date")),
        division: examsData.get("division"),
        startTime: examsData.get("start"),
        endTime: examsData.get("end"),
        lectureHall: examsData.get("lectureHall")
    };

    //check if time is valid(start time < end time)
    let validTime = true;

    if (examsData.get("start") >= examsData.get("end")) {
        alert("Η ώρα έναρξης πρέπει να είναι πριν την ώρα λήξης!");
        validTime = false;
    }

    //if time not valid stop 
    if (!validTime){
        return;
    } 

    try {
        const response = await fetch("/updateExamCourse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedCourse),
        });

        if (!response.ok) throw new Error("Failed");

        const result = await response.json();
        alert(result.message || "Saved!");

    } catch (error) {
        console.error(error);
        alert("Failed to update exam.");
    }
});


//loads the corresponding labs of the semester based on the json for the labs
labsSemesterSelect.addEventListener("change", async () => {

    //get the value of the semester
    const semester = labsSemesterSelect.value[labsSemesterSelect.value.length - 1];

    //fetching the labs of the selected semester of the database
    try {
        const response = await fetch("/getLabs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ semester: semester }),
        });

        if (!response.ok) {
            throw new Error("Failed to fetch labs");
        }

        const data = await response.json();
        const labs = data.map(lab => lab.name);

        //clears the previous data in order to load the new ones
        labsCourseSelect.innerHTML = "";

        //set a default option so that it does not show a lab at first
        const defaultOption = document.createElement("option");
        defaultOption.textContent = "Επέλεξε Μάθημα:";
        defaultOption.disabled = true;
        defaultOption.selected = true;

        labsCourseSelect.appendChild(defaultOption);

        //append it's lab to the choice box
        labs.forEach((lab) => {
            const option = document.createElement("option");
            option.value = lab;
            option.textContent = lab;
            labsCourseSelect.appendChild(option);
        });
    } catch (error) {
        console.error(error);
        alert("Could not load courses for this semester.");
    }
});


//creates dynamically the corresponding info of the labs based on the json for the labs
labsCourseSelect.addEventListener("change", async () => {

    //getting the value of the selected lab
    const labs = labsCourseSelect.value;

    try {
        const response = await fetch("/getLabs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: labs }),
        });

        if (!response.ok) {
            throw new Error("Failed to fetch labs information");
        }

        const data = await response.json();

        // 1. Create a safe title by replacing double quotes with HTML entities
        const safeTitle = data.schedules[0].name.replace(/"/g, '&quot;');

        //clear the previous content 
        labsEditWrapper.innerHTML = "";

        const generalDiv = document.createElement("div");
        generalDiv.classList.add("editCourse");

        //generate the general info dynamically
        generalDiv.innerHTML = `
            <form id="generalForm">
                <h2>Γενικά Στοιχεία</h2>

                <label class="title">Όνομα Μαθήματος:
                    <input type="text" name="title" value="${safeTitle}" readonly>
                </label><br>

                <label class="Semesters">Εξάμηνο:
                 
                    <select name="semester">
                        ${[1, 2, 3, 4, 5, 6, 7, 8].map(s => `
                            <option value="${s}" ${s == labsSemesterSelect.value[labsSemesterSelect.value.length - 1] ? "selected" : ""}>
                                ${s}
                            </option>
                        `).join("")}
                    </select>

                </label><br>

            </form>
        `;
        
        labsEditWrapper.appendChild(generalDiv);

        //generate the lab info dynamically
        data.schedules.forEach((lab, i) => {

            const div = document.createElement("div");
            div.classList.add("editCourse");

            // MAYBE I WILL PLACE IT
            // <h3>Διάλεξη ${i + 1}</h3>

            div.innerHTML = `
                <form class="lectureForm">

                    <label class="labhall">Αμφιθέατρο:
                        <input type="text" name="labhall" value="${lab.labhall}">
                    </label><br>

                    <label class="daysOfWeek">Ημέρα:

                        <select name="day">
                            ${[1, 2, 3, 4, 5].map(d => `
                                <option value="${d}" ${d == lab.day ? "selected" : ""}>
                                    ${d}
                                </option>
                            `).join("")}
                        </select>
                       
                    </label><br>

                    <label class="startTime">Ώρα Έναρξης:
                        <input type="time" name="start" value="${lab.start ? lab.start.slice(0, 5) : ""}">
                    </label><br>

                    <label class="endTime">Ώρα Λήξης:
                        <input type="time" name="end" value="${lab.end ? lab.end.slice(0, 5) : ""}">
                    </label><br>
                </form>
            `;

            labsEditWrapper.appendChild(div);
        });

        //create the save button dynamically
        const button = document.createElement("button");
        button.textContent = "Αποθήκευση";
        button.id = "labSaveButton";

        labsEditWrapper.appendChild(button);

    } catch (error) {
        console.error(error);
        alert("Could not load course.");
    }
});

//when save button is pressed it changes the data on the json for the labs
labsEditWrapper.addEventListener("click", async (e) => {

    //Only run if save button was pressed
    if (e.target.id !== "labSaveButton") return;

    const generalForm = document.getElementById("generalForm");
    const lectureForms = editWrapper.querySelectorAll(".lectureForm");

    const generalData = new FormData(generalForm);

    //final object sent to backend
    const updatedCourse = {
        title: generalData.get("title"),
        semester: parseInt(generalData.get("semester")),
        daysOfWeek: [],
        startTime: [],
        endTime: [],
        lectureHall: []
    };

    //check if time is valid(start time < end time)
    let validTime = true;

    lectureForms.forEach(form => {
        const formData = new FormData(form);

        const start = formData.get("start");
        const end = formData.get("end");

        if (start >= end) {
            alert("Η ώρα έναρξης πρέπει να είναι πριν την ώρα λήξης!");
            validTime = false;
            return;
        }
    });

    //if time not valid stop 
    if (!validTime){
        return;
    } 

    //collect lecture data into arrays
    lectureForms.forEach(form => {
        const formData = new FormData(form);

        updatedCourse.daysOfWeek.push(parseInt(formData.get("day")));
        updatedCourse.startTime.push(formData.get("start"));
        updatedCourse.endTime.push(formData.get("end"));
        updatedCourse.lectureHall.push(formData.get("lectureHall"));
    });

   try {
        const response = await fetch("/updateCourse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedCourse),
        });

        if (!response.ok) throw new Error("Failed");

        const result = await response.json();
        alert(result.message || "Saved!");

    } catch (error) {
        console.error(error);
        alert("Failed to update course.");
    }
});

