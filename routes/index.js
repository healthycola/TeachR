var express = require('express');
var passport = require('passport');
var Teacher = require('../models/teacher');
var LessonPlan = require('../models/lessonplan');
var router = express.Router();

// Global functions
var wait = function(callbacks, done, onError) {
   var counter = callbacks.length;
   var error = null;
   var next = function(err) {
      if (err) {
          // There is an error in the wait functions, abort.
          //This needs to be an abort function. (i.e. no next, and must render/redirect)
          error = err;
          onError(err);
      }
      
      if(--counter == 0 && !error) {
         done();
      }
   };
   
   for(var i = 0; i < callbacks.length; i++) {
      callbacks[i](next);
   }
}

function findCourseIndex(courseArray, grade, subject)
{
    var courseIndex = -1;
    courseArray.map(function(obj, index) {
        if (obj.grade == grade && obj.subject.toLowerCase() == subject.toLowerCase())
        {
            courseIndex = index;
        }
    })
    
    return courseIndex;
}

function findCourseFromString(stringifiedCourse) {
    var tokens = stringifiedCourse.split(' ');
    
    // if the format is "1 Math"
    if (!isNaN(tokens[0]))
    {
        return {
            grade: parseInt(tokens[0], 10),
            subject: tokens[1]
        };
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
        return {
            grade: parseInt(tokens[1], 10),
            subject: subject
        };
    }
    
    else 
    {
        return null;
    }
}

function ErrorFunction(req, res, flashMessage, redirectPath, err)
{
    if (!err)
    {
        console.log(flashMessage);
    }
    else
    {
        console.log(flashMessage)
        console.log(err);
    }
    
    req.flash('info', flashMessage);
    res.redirect(redirectPath);
} 

router.get('/', function(req, res) {
  res.render('index', { title: 'TeachR!', message: req.flash('info')  });
});

router.get('/register', function(req, res) {
    res.render('user/register', { title: 'Add New User', message: req.flash('info')  });
});

router.post('/register', function(req, res) {
    Teacher.register(
        new Teacher(
            { 
                name: req.body.name,
                school: req.body.school,
                email: req.body.email,
                username: req.body.username,
            }
            ),
        req.body.password,
        function(err, teacher) {
            if (err) {
                ErrorFunction(req, res, "Cannot register :(, We're working on it.", '/register', err);
            }
            
            // Log the user in
            passport.authenticate('local')(req, res, function() {
                res.redirect('/');
            });
        });
});

router.get('/login', function(req, res) {
    console.log(req);
    res.render('user/login', { user: req.user, error: req.flash('error')[0] });
});
           
router.post('/login', 
    passport.authenticate('local', 
        { failureRedirect: '/login', failureFlash: true }), function (req, res) {
            res.redirect('userinfo?id=' + req.user._id.toHexString());
            }
);

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

router.get('/myfriends', function(req,res) {
    Teacher.findById(req.user.id, function (err, teacher){
        if (err) {
            console.log('finding user failed');
            req.flash('info', 'Finding user failed');
            res.render('user/myfriends', { message: req.flash('info') });
        }
        else {
            var onErrorfn = function (err) {
                ErrorFunction(req, res, 'Cannot find your friends' + err, '/userinfo?id=' + req.user._id.toHexString(), err);
            }
            
            var _following;
            var _followers;
            var findFollowings = function(next) {
                Teacher.find({ 
                    _id: { $in: teacher.following}
                }, function (err, following) {
                    if (err)
                    {
                        next("Couldn't find any of your following" + err);
                    }
                    else
                    {
                        _following = following;
                        next();
                    }
                });
            }
            
            var findFollowers = function(next) {
                Teacher.find({ 
                    _id: { $in: teacher.followers}
                }, function (err, followers) {
                    if (err)
                    {
                        next("Couldn't find any of your followers" + err)
                    }
                    else
                    {
                        _followers = followers;
                        next();
                    }
                });
            }
            
            var viewPage = function () {
                res.render('user/myfriends', { message: req.flash('info') , myfollowers: _followers, myfollowing: _following });
            }
            
            wait([findFollowers, findFollowings], viewPage, onErrorfn);
        }
    });
});

router.get('/userinfo', function(req,res) {
    if (!req.param('id') || req.param('id') == '')
    {
        req.flash('info', 'No User Specified');
        res.render('/');
    }
    
    Teacher.findById(req.param("id"), function (err, teacher){
        if (err) {
            req.flash('info', 'Finding user failed');
            res.render('/');
        }
        else {
            res.render('user/userinfo', { requestedteacher: teacher });
        }
    });
});

router.get('/follow', function(req,res) {
    if (!req.param('id') || req.param('id') == '')
    {
        ErrorFunction(req, res, 'No User Specified', '/', err);
    }
    
    Teacher.FollowTeacher(req.user.id, req.param("id"), function(sourceUser, destUser, err){
        if (err)
        {
            ErrorFunction(req, res, 'Following this teacher failed', 'myfriends', err);
        }
        else
        {
            req.flash('info', 'Success!');
            res.redirect('myfriends');
        }
    });
});

router.get('/unfollow', function(req,res) {
    if (!req.param('id') || req.param('id') == '')
    {
        ErrorFunction(req, res, 'No user specified');
    }
    
    Teacher.UnfollowTeacher(req.user.id, req.param("id"), function(sourceUser, destUser, err){
        if (err)
        {
            ErrorFunction(req, res, 'Unfollowing this teacher failed', 'myfriends', err);
        }
        else
        {
            req.flash('info', 'Success!');
            res.redirect('myfriends');
        }
    });
});

router.get('/updateuserinfo', function(req,res) {
    res.render('user/updateuserinfo');
});


router.post('/updateuserinfo', function(req,res) {
    if (req.user)
    {
        console.log(req);
        var _name = (req.body.name) ? req.body.name : req.user.name;
        var _school = (req.body.school) ? req.body.school : req.user.school;
        var _email = (req.body.email) ? req.body.email : req.user.email;
        
        Teacher.findById(req.user.id, function (err, teacher){
            if (err)
            {
                ErrorFunction(req, res, "Could not update user", '/updateuserinfo', err);
            }
            
            teacher.name = _name;
            teacher.school = _school;
            teacher.email = _email;
            
            teacher.save( function(err){
                res.redirect('userinfo?id=' + req.user._id.toHexString());
            });
        });
    }
    else
    {
        
    }
});

router.get('/dashboard', function(req, res) {
    res.render('dashboard/main', { message: req.flash('info') });
});

router.get('/newentry', function(req, res) {
    Teacher.findById(req.user.id, function (err, teacher){
        if (err) {
            console.log('Finding user failed');
        }
        else {
            var onErrorfn = function (err) {
                ErrorFunction(req, res, 'Creating a new lesson failed!', '/dashboard', err);
            }
            
            var _courseLessonMap;
            
            var findAllLessonsFromTeacher = function (next) {
                LessonPlan.findAllLessonsFromTeacher(teacher, function (err, lessonPlans) {
                    if (err || !lessonPlans)
                    {
                        next('Error looking for lessons by this teacher' + err);
                    }
                    else
                    {
                        var courseLessonMap = {};
                        lessonPlans.forEach(function(element) {
                            if (!(element.course in courseLessonMap))
                            {
                                courseLessonMap['Grade ' + element.course.grade + ' ' + element.course.subject] = [];
                            }
                            courseLessonMap['Grade ' + element.course.grade + ' ' + element.course.subject].push(element.title);
                        }, this);
                        
                        _courseLessonMap = courseLessonMap;
                        next();
                    }
                });
            }
            
            var viewPage = function () {
                res.render('dashboard/createlp', { message: req.flash('info'), 
                    usercourses: teacher.courses, 
                    courseLessonPlan: _courseLessonMap });
            }
            
            wait([findAllLessonsFromTeacher], viewPage, onErrorfn);
        }
    });
});

router.post('/newlessonplan', function(req, res) {
    var lessonPlanLinked;
    var currentTeacher;
    
    var onErrorfn = function (err) {
        ErrorFunction(req, res, 'Creating a new lesson failed!', '/dashboard', err);
    }
    
    var findTeacher = function(next) {
        Teacher.findById(req.user.id, function (err, teacher){
            if (err)
            {
                next('Could not find teacher' + err);
            }
            else
            {
                currentTeacher = teacher;
                next();
            }
        })
    }
    
    var findLessonPlan = function(next) {
        if (req.body.lessonlink != '')
        {
            LessonPlan.findLessonPlanWithName(req.body.lessonLink, function(err, lessonPlan) {
                if (err)
                {
                    next('Could not find linkedLesson' + err);
                }
                else
                {
                    lessonPlanLinked = lessonPlan;
                    next(); 
                }
            })
        }
        else
        {
            lessonPlanLinked = null;
            next();
        }
    }
    
    var saveLessonPlan = function () {  
        var lessonPlanCourse = findCourseFromString(req.body.course);
        if (!lessonPlanCourse)
        {
            onErrorfn("Unable to find course linked to this lesson");
        }
        
        var newLessonPlan = new LessonPlan ({
            title: req.body.title,
            course: lessonPlanCourse,
            parent: lessonPlanLinked,
            original_teacher: currentTeacher.id,
            duration_in_days: req.body.duration,
            lesson_plan_text: req.body.LessonPlanText,
            lesson_plan_expectations: req.body.expectations,
            number_of_votes: 0,
            average_rating: 0
        })
        
        var addLessonPlanAsChild = function (next) {
            if (lessonPlanLinked)
            {
                lessonPlanLinked.addChild(newLessonPlan, function (err) {
                    if (err)
                    {
                        next('Could not find linkedLesson' + err);
                    }
                    else
                    {
                        next(); 
                    }
                })
            }
            else
            {
                next();
            }
        }
        
        var addLessonPlanToTeacher = function() {
            currentTeacher.addlessonPlan(newLessonPlan, function(err) {
                    if (err)
                    {
                        onErrorfn('Could not add lesson to teacher' + err);
                    }
                    else
                    {
                        //ErrorFunction(req, res, 'Success!', '/dashboard');
                        res.redirect('viewLesson?id=' + newLessonPlan._id.toHexString());
                    }
                })
        }
        
        //Save the lesson plan, then save this lessonplan to the course
        //and parent lessonplan
        newLessonPlan.save(function (err) {
            if (err)
            {
                onErrorfn('Could not save lesson' + err);
            }
            else
            {
                wait([addLessonPlanAsChild], addLessonPlanToTeacher, onErrorfn);
            }  
        })
    }
    
    wait([findTeacher, findLessonPlan], saveLessonPlan, onErrorfn);
});

router.get('/viewLesson', function (req, res) {
    if (!req.param('id') || req.param('id') == '')
    {
        ErrorFunction(req, res, 'No Lesson Specified', '/dashboard', null);
    }

    var onErrorfn = function (err) {
        ErrorFunction(req, res, 'Viewing this lesson failed!', '/dashboard', err);
    }
    
    LessonPlan.findById(req.param('id'), function(err, lessonPlan) {
        if (err)
        {
            onErrorfn('No Lesson Found' + err);
        }
        else
        {
            requestedLessonPlan = lessonPlan;
            teacherID = lessonPlan.original_teacher;
            if (lessonPlan.parent != null)
            {
                parentID = lessonPlan.parent;
            }
            else
            {
                parentID = '';
            }
                
            var teacherID;
            var parentID = null;
            var teacherName;
            var parentTitle;
            
            var requestedLessonPlan;
            
            // Need to get the lesson, then associated course, then associated linked lesson, then associated author
            var findTeacher = function(next) {
                console.log('Teacher: ' + teacherID);
                Teacher.findById(teacherID, function (err, teacher){
                    if (err || !teacher)
                    {
                        next('Could not find teacher' + err);
                    }
                    else
                    {
                        teacherName = teacher.name;
                        next();
                    }
                })
            }
            
            var findLessonPlan = function(next) {
                if (parentID && parentID != '')
                {
                    LessonPlan.findById(parentID, function(err, lessonPlan) {
                        if (err)
                        {
                            next('Could not find Linked Lesson' + err);
                        }
                        else
                        {
                            parentTitle = lessonPlan.title;
                            next(); 
                        }
                    })
                }
                else
                {
                    parentTitle = '';
                    next();
                }
            }
            
            var populateLessonPlanView = function() {
                var lessonPlanViewObject = {}
                lessonPlanViewObject.title = requestedLessonPlan.title;
                lessonPlanViewObject.grade = requestedLessonPlan.course.grade;
                lessonPlanViewObject.subject = requestedLessonPlan.course.subject;
                lessonPlanViewObject.duration = requestedLessonPlan.duration_in_days;
                if (parentID != '')
                {
                    lessonPlanViewObject.parentTitle = parentTitle;
                }
                lessonPlanViewObject.author = teacherName;
                lessonPlanViewObject.text = requestedLessonPlan.lesson_plan_text;
                lessonPlanViewObject.expectations = requestedLessonPlan.lesson_plan_expectations;
                
                res.render('dashboard/viewLesson', {lessonPlan: lessonPlanViewObject});
            }
            
            wait([findTeacher, findLessonPlan], populateLessonPlanView, onErrorfn);
        }
    })
})

router.get('/newcourse', function(req, res) {
    if (!req.user)
    {
        req.flash('info', 'No User Specified');
        res.render('/');
    }
    
    Teacher.findById(req.user.id, function (err, teacher){
        if (err) {
            req.flash('info', 'Finding user failed');
            res.render('/');
        }
        else {
            res.render('dashboard/newcourse', { message: req.flash('info'), teachercourses: teacher.courses });
        }
    });
});

router.post('/createcourse', function(req, res) {
    Teacher.findById(req.user.id, function (err, teacher){
            if (err)
            {
                req.flash('info', 'Could not find teacher');
                res.redirect('newcourse');
            }
            else
            {
                var courseIndex = findCourseIndex(teacher.courses, req.body.courseGrade, req.body.courseSubject);
                if (courseIndex == -1)
                {
                    var course = { grade: req.body.courseGrade, subject: req.body.courseSubject };
                    teacher.courses.push(course);
                    
                    teacher.save(function(err) {
                        if (err)
                        {
                            req.flash('info', 'Adding this course failed!');
                        }
                        else
                        {
                            req.flash('info', 'Success!');
                        }
                    })
                }
                else
                {
                    req.flash('info', 'Thise course already exists in your enrolled courses!');
                }
                
                res.redirect('newcourse');
            }
    });
});

router.post('/removecourse', function(req, res) {
    Teacher.findById(req.user.id, function (err, teacher){
            if (err)
            {
                ErrorFunction(req, res, "No teacher found.", "newcourse", err);
            }
            else
            {
                var courseToRemove = findCourseFromString(req.body.course);
                
                if (!courseToRemove)
                {
                    ErrorFunction(req, res, "No such course. Please contact admin.", "newcourse", "bad string format");
                }
                
                var courseIndex = findCourseIndex(teacher.courses, courseToRemove.grade, courseToRemove.subject);
                if (courseIndex != -1)
                {
                    teacher.courses.splice(courseIndex, 1);
                    
                    teacher.save(function(err) {
                        if (err)
                        {
                            ErrorFunction(req, res, 'Removing this course failed!', 'newcourse', err);
                        }
                        else
                        {
                            req.flash('info', 'Success!');
                            res.redirect('newcourse');
                        }
                    })
                }
                else
                {
                    ErrorFunction(req, res, 'You are not enrolled in this course', 'newcourse');
                }
            }
    });
})

router.get('/viewAllLessons', function (req, res) {
    if (!req.param('id') || req.param('id') == '')
    {
        ErrorFunction(req, res, 'No user Specified', '/dashboard', null);
    }
    
    Teacher.getAllLessonPlans(req.param('id'), function(err, teacher) {
        if (err)
        {
            ErrorFunction(req, res, 'No user found', '/dashboard', err);
        }
        
        LessonPlan.findAllLessons(teacher.lessonPlans, function(err, lessonPlans) {
            if (err)
            {
                ErrorFunction(req, res, 'No lessons found', '/dashboard', err);
            }
            
            res.render('dashboard/viewAllLessonPlans', { requestedLessonPlans: lessonPlans, teacherName: teacher.name });
        })
    })
})

router.post('/removeLesson', function (req, res) {
    if (!req.body.lessonID || req.body.lessonID == '')
    {
        ErrorFunction(req, res, 'No Lesson to remove', '/dashboard', null);
    }
    
    //Get the lesson, then get the associated teacher and course. If the lesson has children, it cannot be deleted 
    LessonPlan.findById(req.body.lessonID, function (err, lesson) {
        if (err)
        {
            ErrorFunction(req, res, 'No lesson found', '/dashboard', err);
        }
        
        if (!lesson) 
        {
            ErrorFunction(req, res, 'No lesson found', '/dashboard', 'ID: ' + req.body.lessonID);
        }
        
        if (lesson.children.length > 0)
        {
            ErrorFunction(req, res, 'This lesson has been forked. As such, it cannot be deleted. You may hide it though (wip).', '/dashboard', null);
        }
        
        var onErrorfn = function (err) {
            ErrorFunction(req, res, 'Removing this lesson failed!', '/dashboard', err);
        }
    
        // Need to get the lesson, then associated course, then associated linked lesson, then associated author
        var findTeacher = function(next) {
            Teacher.removeLessonFromTeacherID(lesson.original_teacher, lesson, function (err){
                if (err)
                {
                    next('Could not find teacher' + err);
                }
                else
                {
                    next();
                }
            })
        }
        
        var findLessonPlan = function(next) {
            if (lesson.parent)
            {
                LessonPlan.removeChildFromParent(lesson.parent, lesson, function(err, lessonPlan) {
                    if (err)
                    {
                        next('Could not find parent' + err);
                    }
                    else
                    {
                        next(); 
                    }
                })
            }
            else
            {
                next();
            }
        }
        
        var removeLesson = function () {
            LessonPlan.remove({ _id: lesson.id }, function(err) {
                if (err) {
                    onErrorfn('Could not remove lesson' + err);
                }
                else {
                    req.flash('info', 'Success!');
                    res.redirect('/viewAllLessons');
                }
            });
        }
        
        wait([findTeacher, findLessonPlan], removeLesson, onErrorfn);
    
    })
});

router.get('/test', function (req, res) {
    res.render('test');
})

module.exports = router;