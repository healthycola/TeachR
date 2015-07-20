var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Course = new Schema({
    grade: Number,
	subject: String,
	teachers: [{ type: Schema.Types.ObjectId, ref: 'Teacher' }],
	lessonplans: [{ type: Schema.Types.ObjectId, ref: 'LessonPlan' }]
});

Course.methods.removeLesson = function(lesson, cb) {
    var index = this.lessonplans.indexOf(lesson._id);
    if (index >= 0)
    {
        this.lessonplans.splice(index, 1);
    }
    
    this.save(cb);
}
Course.methods.addTeacher = function (teacher, cb) {
    this.teachers.push(teacher);
    this.save(cb);
}

Course.methods.addLessonPlan = function (lessonPlan, cb) {
    this.lessonplans.push(lessonPlan);
    this.save(cb);
}

Course.statics.findAllCoursesFromTeacher = function (teacher, cb) {
    return this.find({ 
        _id: { $in: teacher.courses}
    }, cb);
}

Course.statics.findCourseFromString = function (stringifiedCourse, cb) {
    var tokens = stringifiedCourse.split(' ');
    
    // if the format is "1 Math"
    if (!isNaN(tokens[0]))
    {
        return this.find({
            grade: parseInt(tokens[0], 10),
            subject: tokens[1]
        }, cb);
    }
    
    // if the format is "Grade 1 Math"
    else if (tokens[0].toLowerCase() == 'grade' && !isNaN(tokens[1]))
    {
        //concatenate all strings after token[2]
        var subject = '';
        for (var i = 2; i < tokens.length - 1; ++i)
        {
            subject += tokens[i] + ' ';
        }
        
        subject += tokens[tokens.length - 1];
        
        console.log(subject);
        return this.findOne({
            grade: parseInt(tokens[1], 10),
            subject: subject
        }, cb);
    }
    
    else 
    {
        cb("Unknown");
    }
}

Course.statics.removeLessonFromCourse = function (courseId, lesson, cb) {
    this.findById(courseId, 'lessonplans', function(err, course) {
        if (err)
        {
            cb(err);
        }
        else
        {
            course.removeLesson(lesson, cb);
        }
    })
}

module.exports = mongoose.model('Course', Course);