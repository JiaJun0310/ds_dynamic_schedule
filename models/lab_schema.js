import mongoose from 'mongoose';

const ScheduleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    lectureHall: { type: Array, required: true },
    semester: { type: Number, required: true },
    color: { type: String, required: true },
    professor: { type: Array, required: true },
    teamName: { type: Array, required: true },
    daysOfWeek: { type: Array, required: true },
    startTime: { type: Array, required: true },
    endTime: { type: Array, required: true },
    weekly: { type: Array, required: true }
});

const Calendar = mongoose.model('schemas', ScheduleSchema);

export default Calendar;