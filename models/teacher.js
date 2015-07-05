var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var passportLocalMongoose = require('passport-local-mongoose');

var Teacher = new Schema({
    name: String,
    school: String,
    email: String,
    username: String,
    password: String,
    lessonPlans: [{ type: Schema.Types.ObjectId, ref: 'LessonPlan' }],
    courses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'Teacher' }],
    followers: [{ type: Schema.Types.ObjectId, ref: 'Teacher' }]
});

Teacher.plugin(passportLocalMongoose);

module.exports = mongoose.model('Teacher', Teacher);