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
    courses: [{ grade: Number, subject: String }],
    following: [{ type: Schema.Types.ObjectId, ref: 'Teacher' }],
    followers: [{ type: Schema.Types.ObjectId, ref: 'Teacher' }]
});

Teacher.methods.addlessonPlan = function(lessonPlan, cb) {
  this.lessonPlans.push(lessonPlan);
  this.save(cb);
}

Teacher.methods.follow = function(otherTeacher, cb) {
  var index = this.following.indexOf(otherTeacher._id);
  if (index < 0)
  {
    this.following.push(otherTeacher);
    this.save(cb); 
  }
  else
  {
    cb(null);
  }
};

Teacher.methods.addFollower = function(otherTeacher, cb) {
  var index = this.followers.indexOf(otherTeacher._id);
  if (index < 0)
  {
    this.followers.push(otherTeacher);
    this.save(cb); 
  }
  else
  {
    cb(null);
  }
};

Teacher.methods.unfollow = function(otherTeacher, cb) {
  console.log(otherTeacher);
  console.log(this);
  var index = this.following.indexOf(otherTeacher._id);
  var removed = false;
  while (index >= 0)
  {
    this.following.splice(index, 1);
    
    index = this.following.indexOf(otherTeacher._id);
    removed = true;
  }
  
  if (removed)
  {
    this.save(cb);
  }
  else
  {
    cb(null); 
  }
};

Teacher.methods.removeLesson = function(lesson, cb) {
  var index = this.lessonPlans.indexOf(lesson._id);
  if (index >= 0)
  {
    this.lessonPlans.splice(index, 1);
  }
  
  this.save(cb);
}

Teacher.methods.removeFollower = function(otherTeacher, cb) {
  var index = this.followers.indexOf(otherTeacher._id);
  var removed = false;
  while (index >= 0)
  {
    this.followers.splice(index, 1);
    
    index = this.followers.indexOf(otherTeacher._id);
    removed = true;
  }
  
  if (removed)
  {
    this.save(cb);
  }
  else
  {
    cb(null); 
  }
};

// Gets the participants of a follow or unfollow request
Teacher.statics.FollowTeacher = function (sourceUserId, destUserId, cb) {
  console.log(sourceUserId);
  var thisSceme = this;
  thisSceme.findOne({ _id: sourceUserId }, function(err, sourceUser) {
    if (err)
    {
      cb(err);
    }
    else
    {
       thisSceme.findOne({ _id: destUserId }, function(err, destUser) {
         if (err)
         {
           cb(err);
         }
         else
         {
             sourceUser.follow(destUser, function (err) {
                if (err)
                {
                  cb(err);
                }
                else
                {
                    destUser.addFollower(sourceUser, function (err) {
                    cb(err);
                }); 
              }
            }) 
         }
      }); 
    }
  });
}

// Gets the participants of a follow or unfollow request
Teacher.statics.UnfollowTeacher = function (sourceUserId, destUserId, cb) {
  console.log(sourceUserId);
  var thisSceme = this;
  thisSceme.findOne({ _id: sourceUserId }, function(err, sourceUser) {
    if (err)
    {
      console.log('1' + err)
      cb(err);
    }
    else
    {
       thisSceme.findOne({ _id: destUserId }, function(err, destUser) {
         if (err)
         {
           console.log('2' + err)
           cb(err);
         }
         else
         {
             sourceUser.unfollow(destUser, function (err) {
                if (err)
                {
                  console.log('3' + err)
                  cb(err);
                }
                else
                {
                  console.log('4' + err)
                    console.log()
                    destUser.removeFollower(sourceUser, cb);
                }; 
            }) 
         }
      }); 
    }
  });
}

Teacher.statics.getAllLessonPlans = function(teacherID, cb) {
  return this.findById(teacherID, 'name lessonPlans', cb);
}

Teacher.statics.removeLessonFromTeacherID = function(teacherID, lesson, cb) {
  this.findById(teacherID, 'lessonPlans', function(err, teacher) {
    if (err)
    {
      console.log('no such');
      cb(err)
    }
    else
    {
      teacher.removeLesson(lesson, cb);
    }
  })
}

Teacher.plugin(passportLocalMongoose);

module.exports = mongoose.model('Teacher', Teacher);