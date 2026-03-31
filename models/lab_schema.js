import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
    title: { type: String, required: true },
    lectureHall: { type: String, required: true },
    color: { type: String, required: true },
    weekly: { type: String, required: true }, 
    
    
    dayOfWeek: [{ type: Number }],   
    startTime: [{ type: String }],   
    endTime: [{ type: String }],     
    professor: [{ type: String }]    
});

const teamSchema = new mongoose.Schema({
    teamName: { type: String, required: true },
    semester: { type: Number, required: true }, 
    lessons: [lessonSchema] 
});

const Team = mongoose.model('Team', teamSchema);

export default Team;