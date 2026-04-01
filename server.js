import express from "express";
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

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

app.use('/jsonData', express.static(path.join(__dirname, 'jsonData')));


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


app.post("/sendData",  async (req, res) => { //TODO: add verifyToken
    try
    {
        const springPath = path.join(__dirname, 'jsonData', 'spring_schedule.json');
        const winterPath = path.join(__dirname, 'jsonData', 'winter_schedule.json');

        // 2. Read and parse the files
        const springData = JSON.parse(fs.readFileSync(springPath, 'utf8'));
        const winterData = JSON.parse(fs.readFileSync(winterPath, 'utf8'));

        // 3. Combine them into one big array
        const combinedData = [...springData, ...winterData];

        await Calendar.deleteMany({});

        
        const savedSubjects = await Calendar.insertMany(combinedData);

        res.status(201).json({
            message: "Database updated from local JSON files",
            count: savedSubjects.length
        });

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
                lectureHall: scheduleData.lectureHall[index],            
                start: scheduleData.startTime[index], 
                end: scheduleData.endTime[index],     
                color: scheduleData.color,
                professor: scheduleData.professor,
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


app.post(`/run_schedule_extractor`, (req, res) =>{   //TODO: add verifyToken
    exec('node schedule_extractor.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).send('Extraction failed');
        }
        console.log(`Output: ${stdout}`);
        res.send('Extractor executed successfully');
    });
});

app.post(`/run_acCal_extractor`, (req, res) =>{   //TODO: add verifyToken
    exec('node acCal_extractor.js', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).send('Extraction failed');
        }
        console.log(`Output: ${stdout}`);
        res.send('Extractor executed successfully');
    });
});



app.get("/admin", verifyToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'admin.html'));
})


const PORT = 8000;
app.listen(PORT, () => {
    console.log(`Server live at http://localhost:${PORT}`);
});


// app.post("/getCourses", async(req, res) => {
//     const { semester } = req.body;

//     const courseNames = await Calendar.find({ semester: semester }).select('title');

//     res.json(courseNames);
// });
