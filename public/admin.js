document.querySelectorAll('.fileBox').forEach(box => {
    const button = box.querySelector('button');
    const input = box.querySelector('input');

    button.onclick = async () => {
        if (input.files.length === 0) {
            alert("Παρακαλώ επιλέξτε ένα αρχείο!");
            return;
        }

        const formData = new FormData();
      
        formData.append("uploadedFile", input.files[0]);

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