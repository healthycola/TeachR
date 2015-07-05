var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Course = new Schema({
    grade: Number,
	subject: String,
	teachers: [{ type: Schema.Types.ObjectId, ref: 'Teacher' }],
	lessonplans: [{ type: Schema.Types.ObjectId, ref: 'LessonPlan' }]
});

module.exports = mongoose.model('Course', Course);