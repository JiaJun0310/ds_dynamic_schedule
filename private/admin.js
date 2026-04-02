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


// backBtn.onclick = () => {
//     editPage.style.display = "none";
//     adminPage.style.display = "flex";
// };


//CHEN VALE COMMENTS EDW

const editButton = document.getElementById("editButton");
const adminPage = document.querySelector(".adminWrapper");
const selectWrapper = document.getElementById("selectWrapper")
const editWrapper = document.getElementById("editWrapper")

editButton.onclick = () => {

    adminPage.style.display = "none";
    
    selectWrapper.style.display = "flex";
    editWrapper.style.display = "flex"; 
};


const semesterSelect = document.getElementById("semester");
const courseSelect = document.getElementById("courses");

semesterSelect.addEventListener("change", async () => {
    const semester = semesterSelect.value[semesterSelect.value.length - 1];

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

        courseSelect.innerHTML = "";

        const defaultOption = document.createElement("option");
        defaultOption.textContent = "Επέλεξε Μάθημα:";
        defaultOption.disabled = true;
        defaultOption.selected = true;

        courseSelect.appendChild(defaultOption);

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
        console.log(data)
    
        document.getElementById("titleInput").value = data.schedules[0].title;
        document.getElementById("lectureHallInput").value = data.schedules[0].lectureHall;
        document.getElementById("daysOfWeekInput").value = data.schedules[0].day;
        document.getElementById("startTimeInput").value = data.schedules[0].start ? data.schedules[0].start.slice(0, 5):"";
        document.getElementById("endTimeInput").value = data.schedules[0].end ? data.schedules[0].end.slice(0, 5):"";
        document.getElementById("semestersInput").value = semesterSelect.value[semesterSelect.value.length - 1];
        document.getElementById("professorInput").value = data.schedules[0].professor;

    } catch (error) {
        console.error(error);
        alert("Could not load courses for this semester.");
    }
    

});

