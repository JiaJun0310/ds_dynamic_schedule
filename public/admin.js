document.querySelectorAll(".fileBox").forEach((box) => {
    const button = box.querySelector("button");
    const input = box.querySelector("input");
    const id = input.name;


    button.onclick = async () => {
        if (input.files.length === 0) {
            alert("Παρακαλώ επιλέξτε ένα αρχείο!");
            return;
        }

        const formData = new FormData();

        const ext = input.files[0].name.split(".").pop();


        const newName = id + "." + ext;


        const finalFile = new File([input.files[0]], newName, {
            type: input.files[0].type,
        });

        formData.append("uploadedFile", finalFile);

        try {
            const response = await fetch("http://localhost:8000/upload", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                alert("Το αρχείο ανέβηκε επιτυχώς!");
                input.value = "";
            } else {
                alert("Σφάλμα: " + result.message);
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("Αποτυχία σύνδεσης με τον διακομιστή.");
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

        courses.forEach(course => {
      
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