document.querySelectorAll('.fileBox').forEach(box => {
    const button = box.querySelector('button');
    const input = box.querySelector('input');
    const id = input.name;

    console.log(id)

    button.onclick = async () => {
        if (input.files.length === 0) {
            alert("Παρακαλώ επιλέξτε ένα αρχείο!");
            return;
        }


        const formData = new FormData();

        const ext = input.files[0].name.split('.').pop()

        console.log(ext)

        const newName = id + '.' + ext;

        console.log(newName)

        const finalFile = new File([input.files[0]], newName, {
            type: input.files[0].type
        })
      
        formData.append("uploadedFile", finalFile);


        try {
            const response = await fetch("http://localhost:8000/upload", {
                method: "POST",
                body: formData 
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