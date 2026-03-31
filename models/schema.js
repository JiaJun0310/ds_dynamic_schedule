import mongoose from 'mongoose';


const ScheduleSchema = new mongoose.Schema({
    title: {type: String, required: true},
    lectureHall: {type: String, required: true},
    daysOfWeek: {type: Array, required: true},
    startTime: {type: Array, required: true},
    endTime: {type: Array, required: true},
    color: {type: String, required: true},
    semester: {type: Number, required: true},
    professor: {type: Array, required: true}
  });
  
const Calendar = mongoose.model('schemas', ScheduleSchema);
export default Calendar;

