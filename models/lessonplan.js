var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var LessonPlan = new Schema({
    title: String,
	course: { type: Schema.Types.ObjectId, ref: 'Course' },
	parent: { type: Schema.Types.ObjectId, ref: 'LessonPlan' },
	children: [{ type: Schema.Types.ObjectId, ref: 'LessonPlan' }],
	original_teacher: { type: Schema.Types.ObjectId, ref: 'Teacher' },
	duration_in_days: Number,
	lesson_plan_text: String,
	lesson_plan_expectations: String,
	number_of_votes: Number,
	average_rating: Number
});

module.exports = mongoose.model('LessonPlan', LessonPlan);