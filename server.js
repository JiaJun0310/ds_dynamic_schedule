const express = require("express");
const connectDB = require("./db");
const Calendar = require("./models/schema");
const cors = require('cors');
const path = require('path');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
});



const PORT = 8000;
app.listen(PORT, () => {
    console.log(`Server live at http://localhost:${PORT}`);
});


app.post("/sendData", async (req, res) => {
    try
    {
        const data = req.body; 

        
        if (!Array.isArray(data)) {
            return res.status(400).json({ message: "Data must be in an array" });
        }

        await Calendar.deleteMany({});

        
        const savedSubjects = await Calendar.insertMany(data);

        res.status(201).json({data: savedSubjects});

    }
    catch(err)
    {
        res.status(400).json({ error: err.message });
    }
});

app.post("/getSubject", async (req, res) => {
    const semester = req.body;
    

})

