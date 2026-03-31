import express from "express";
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import { fileURLToPath } from 'url';

import connectDB from "./db.js"; 
import Calendar from "./models/schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const username = "admin"
const hashedPassword = `$2b$10$.KGaGxxvvV1CaEZLrGbxVOeKa7juuHcFMPyPAbdEaOjLCTYeQ6Qpa`


const app = express();



if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
        
        const uniqueName = file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });

connectDB();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'index.html'));
});

app.get("/loginForAdmin", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'login.html'));
});




//function to see the hash
// async function generateHash() {
//     // const salt = await bcrypt.genSalt(10);
//     // const hash = await bcrypt.hash('password', salt);
//     // await bcrypt.compare(password, valid_user.password)
//     console.log(await bcrypt.compare(`password`, `$2b$10$.KGaGxxvvV1CaEZLrGbxVOeKa7juuHcFMPyPAbdEaOjLCTYeQ6Qpa`));
// }
// generateHash();

const verifyToken = (req, res, next) => {
    const token = req.cookies.token; 

    if (!token) {
        return res.redirect('/loginForAdmin'); 
    }

    try {
        jwt.verify(token, 'mfmfx123');
        next(); 
    } catch (err) {
        res.clearCookie('token'); 
        res.redirect('/loginForAdmin');
    }
};


app.post("/sendData", verifyToken, async (req, res) => {
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

        res.cookie('token', token, {
            httpOnly: true,     
            secure: false,      
            maxAge: 3600000     
        });

        return res.status(200).json({ message: "Login successful", username: username });
        

    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/upload', verifyToken, upload.single('uploadedFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    // let ext = req.file.split('.').pop()

    // req.file.filename = req.file.id + '.' + ext;
    
    console.log("Αρχείο αποθηκεύτηκε στο: " + req.file.path);
    res.json({ 
        message: "Επιτυχία!", 
        fileName: req.file.filename 
    });
});





app.get("/admin", verifyToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'admin.html'));
})


const PORT = 8000;
app.listen(PORT, () => {
    console.log(`Server live at http://localhost:${PORT}`);
});
