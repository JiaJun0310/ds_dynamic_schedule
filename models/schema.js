const mongoose = require('mongoose');


const ScheduleSchema = new mongoose.Schema({
    title: {type: String, required: true, unique: true},
    daysOfWeek: {type: Array, required: true},
    startTime: {type: String, required: true},
    endTime: {type: String, required: true},
    color: {type: String, required: true},
    semester: {type: Number, required: true},
    professor: {type: String, required: true}
  });
  
module.exports = mongoose.model('schema', ScheduleSchema)

