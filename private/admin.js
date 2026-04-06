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

const editButton = document.getElementById("editButton");
const adminPage = document.querySelector(".adminWrapper");
const selectWrapper = document.getElementById("selectWrapper")
const editWrapper = document.getElementById("editWrapper")
const editBox = document.querySelector(".editBox");
const backButton = document.getElementById("backButton")
const courses = document.getElementById("courses")
const semester = document.getElementById("semester")


//When the edit button is clicked it over writes the admin page and loads the edit page
editButton.onclick = () => {

    adminPage.style.display = "none";
    editBox.style.display = "none";
    
    selectWrapper.style.display = "flex";
    editWrapper.style.display = "flex"; 

};

backButton.onclick = () => {

    editWrapper.innerHTML = "";

    //need to make it so that when the back button is clicked to clear the drop boxes value
    // courses.innerHTML = "";
    // semester.innerHTML = "";


    adminPage.style.display = "flex";
    editBox.style.display = "flex";
    
    selectWrapper.style.display = "none";
    editWrapper.style.display = "none"; 
}


const semesterSelect = document.getElementById("semester");
const courseSelect = document.getElementById("courses");

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

        //clear the previous content 
        editWrapper.innerHTML = "";

        const generalDiv = document.createElement("div");
        generalDiv.classList.add("editCourse");

        //generate the general info dynamically
        generalDiv.innerHTML = `
            <form id="generalForm">
                <h2>Γενικά Στοιχεία</h2>

                <label class="title">Όνομα Μαθήματος:
                    <input type="text" name="title" value="${data.schedules[0].title}" readonly>
                </label><br>

                <label class="Semesters">Εξάμηνο:
                    <input type="text" name="semester" value="${semesterSelect.value[semesterSelect.value.length - 1]}">
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
                        <input type="text" name="day" value="${lecture.day}">
                    </label><br>

                    <label class="startTime">Ώρα Έναρξης:
                        <input type="time" name="start" value="${lecture.start ? lecture.start.slice(0,5) : ""}">
                    </label><br>

                    <label class="endTime">Ώρα Λήξης:
                        <input type="time" name="end" value="${lecture.end ? lecture.end.slice(0,5) : ""}">
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