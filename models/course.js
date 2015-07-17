var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Course = new Schema({
    grade: Number,
	subject: String,
	teachers: [{ type: Schema.Types.ObjectId, ref: 'Teacher' }],
	lessonplans: [{ type: Schema.Types.ObjectId, ref: 'LessonPlan' }]
});

Course.statics.findAllCoursesFromTeacher = function (teacher, cb) {
    return this.find({ 
        _id: { $in: teacher.courses}
    }, cb);
}

module.exports = mongoose.model('Course', Course);