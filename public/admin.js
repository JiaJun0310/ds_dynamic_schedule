document.querySelectorAll(".fileBox").forEach((box) => {
    const button = box.querySelector("button");
    const input = box.querySelector("input");
    const id = input.name;
    const overlay = document.getElementById("loadingOverlay");

    button.onclick = async () => {
        // 1. Basic check: is a file selected?
        if (input.files.length === 0) {
            alert("Παρακαλώ επιλέξτε ένα αρχείο!");
            return;
        }

        // 2. CREATE the formData (This was the missing part!)
        const formData = new FormData();
        const ext = input.files[0].name.split(".").pop();
        const newName = id + "." + ext;
        const finalFile = new File([input.files[0]], newName, {
            type: input.files[0].type,
        });

        formData.append("uploadedFile", finalFile);

        try {
            // Show the loading screen
            overlay.style.display = "flex";

            // Upload the file
            const response = await fetch("/upload", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                input.value = "";

                // console.log(id);

                // If it's a schedule, trigger the extractor
                if (id === "schedule") {
                    const extractResponse = await fetch(
                        "/run_schedule_extractor",
                        {
                            method: "POST",
                        },
                    );
                    const extractData = await extractResponse.text();

                    const syncResponse = await fetch("/sendData", {
                        method: "POST",
                    });
                    const syncResult = await syncResponse.json();

                    alert(
                        "Η διαδικασία ολοκληρώθηκε!\n1. Εξαγωγή: " +
                            extractData +
                            "\n2. Database: " +
                            (syncResult.message || "Updated"),
                    );
                } else if (id === "acCal") {
                    const extractResponse = await fetch(
                        "/run_acCal_extractor",
                        {
                            method: "POST",
                        },
                    );
                    const extractData = await extractResponse.text();
                    alert("Ολοκληρώθηκε: " + extractData);
                } else {
                    alert("Το αρχείο ανέβηκε!");
                }
            } else {
                alert("Σφάλμα: " + result.message);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Παρουσιάστηκε σφάλμα.");
        } finally {
            // Hide the loading screen
            overlay.style.display = "none";
        }
    };
});

const editButton = document.getElementById("editButton");
const adminPage = document.querySelector(".adminWrapper");
const editSemester = document.getElementById("selectSemester");
const editCourse = document.getElementById("selectCourse");

editButton.onclick = () => {
    adminPage.style.display = "none";
    editSemester.style.display = "block";
    editCourse.style.display = "block";
};

// backBtn.onclick = () => {
//     editPage.style.display = "none";
//     adminPage.style.display = "flex";
// };

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
