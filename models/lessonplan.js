var mongoose = require('mongoose');
var Schema = mongoose.Schema;


/*

Current -> Parent -> OriginalParent

*/

var LessonPlan = new Schema({
    title: String,
	course: { type: Schema.Types.ObjectId, ref: 'Course' },
	parent: { type: Schema.Types.ObjectId, ref: 'LessonPlan' },
    original_parent: { type: Schema.Types.ObjectId, ref: 'LessonPlan' },
	children: [{ type: Schema.Types.ObjectId, ref: 'LessonPlan' }],
	original_teacher: { type: Schema.Types.ObjectId, ref: 'Teacher' },
	duration_in_days: Number,
	lesson_plan_text: String,
	lesson_plan_expectations: String,
	number_of_votes: Number,
	average_rating: Number
});

LessonPlan.methods.addChild = function(childReference, cb) {
    this.children.push(childReference);
    this.save(cb);
}

LessonPlan.methods.removeChild = function(child, cb) {
    var index = this.children.indexOf(child._id);
    if (index >= 0)
    {
        this.child.splice(index, 1);
    }
    
    this.save(cb);
}

LessonPlan.statics.findAllLessonsFromTeacher = function(teacher, cb) {
    return this.find({
        _id: { $in: teacher.lessonPlans }
    }, cb);
}

LessonPlan.statics.findLessonPlanWithName = function(lessonPlanName, cb) {
    return this.find({
        title: lessonPlanName
    }, cb);
}

LessonPlan.statics.findAllLessons = function (lessonIDs, cb) {
    return this.find({ 
        _id: { $in: lessonIDs}
    }, cb);
}

LessonPlan.statics.removeChildFromParent = function (parentId, childLesson, cb) {
    this.findById(parentId, 'children', function (err, parent) {
        parent.removeChild(childLesson, cb);
    })
}

module.exports = mongoose.model('LessonPlan', LessonPlan);