const express = require("express");
const connectDB = require("./db");
const Calendar = require("./models/schema");
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require(`jsonwebtoken`);

const username = "admin"
const hashedPassword = `$2b$10$.KGaGxxvvV1CaEZLrGbxVOeKa7juuHcFMPyPAbdEaOjLCTYeQ6Qpa`


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

//function to see the hash
// async function generateHash() {
//     // const salt = await bcrypt.genSalt(10);
//     // const hash = await bcrypt.hash('password', salt);
//     // await bcrypt.compare(password, valid_user.password)
//     console.log(await bcrypt.compare(`password`, `$2b$10$.KGaGxxvvV1CaEZLrGbxVOeKa7juuHcFMPyPAbdEaOjLCTYeQ6Qpa`));
// }
// generateHash();


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

app.post("/getSemester", async (req, res) => {
    try
    {
        const {semester} = req.body;

        const titles = await Calendar.find({ semester: semester }).select('title');

        res.status(200).json({titles});
    }
    catch(err)
    {
        res.status(400).json({ error: err.message });
    }

})
app.post("/getClass", async (req, res) => {
    try {
        const { title } = req.body;
        const scheduleData = await Calendar.findOne({ title: title });

        const mappedSchedules = scheduleData.daysOfWeek.map((day, index) => {
            return {
                title: scheduleData.title,
                day: day,                        
                start: scheduleData.startTime[index], 
                end: scheduleData.endTime[index],     
                color: scheduleData.color,
                professor: scheduleData.professor,
                lectureHall: scheduleData.lectureHall
            };
        });

        res.status(200).json({ schedules: mappedSchedules });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});


app.post("/login", async (req, res) => {
    try {
        const { username: incomingUsername, password } = req.body;

        if (incomingUsername !== username) {
            return res.status(400).json({ message: "Username not found!" });
        }
        
        const isPasswordCorrect = await bcrypt.compare(password, hashedPassword);

        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Wrong password!" });
        }


        const token = jwt.sign(
            { userId: "static_admin_id", username: username },
            'mfmfx123',
            { expiresIn: '1h' }
        );

        return res.status(200).json({
            token: token,
            username: username
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
