var express = require('express');
var passport = require('passport');
var Teacher = require('../models/teacher');
var Course = require('../models/course');
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
                email: req.body.useremail,
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
            var onErrorfn = function (err) {
                ErrorFunction(req, res, 'Could not find user. Did you log in?' + err, '/', err);
            }
            
            var _courses;
            var findCoursesFromTeacher = function(next) {
                Course.findAllCoursesFromTeacher(teacher, function (err, courses) {
                    if (err)
                    {
                        next(err);
                    }
                    else {
                        _courses = courses;
                        next();
                    }
                });
            }
            
            var viewPage = function() {
                res.render('user/userinfo', { requestedteacher: teacher, teachercourses: _courses });
            }
            
            wait([findCoursesFromTeacher], viewPage, onErrorfn);
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
        var _email = (req.body.useremail) ? req.body.useremail : req.user.email;
        
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
            
            var _courses;
            var _courseLessonMap;
            var findAllCourses = function (next) {
                Course.findAllCoursesFromTeacher(teacher, function (err, courses) {
                    if (err)
                    {
                        next('Finding courses failed' + err);
                    }
                    else {
                        if (courses.length < 1)
                        {
                            next('No courses enrolled!');
                        }
                        else
                        {
                            _courses = courses;
                            next();
                        }
                    }
                });
            }
            
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
                                courseLessonMap[element.course] = [];
                            }
                            courseLessonMap[element.course].push(element);
                        }, this);
                        
                        _courseLessonMap = courseLessonMap;
                        next();
                    }
                });
            }
            
            var viewPage = function () {
                res.render('dashboard/createlp', { message: req.flash('info'), 
                    usercourses: _courses, 
                    courseLessonPlan: _courseLessonMap });
            }
            
            wait([findAllCourses, findAllLessonsFromTeacher], viewPage, onErrorfn);
        }
    });
});

router.post('/newlessonplan', function(req, res) {
    var lessonPlanCourse;
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
    
    var findCourse = function(next) {
        Course.findCourseFromString(req.body.course, function(err, course) {
            if (err)
            {
                next('Could not find course' + err);
            }
            else
            {
                if (!course)
                {
                    next('Could not find course' + err);
                }
                else
                {
                   lessonPlanCourse = course;
                    next();
                }
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
        var newLessonPlan = new LessonPlan ({
            title: req.body.title,
            course: lessonPlanCourse.id,
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
        
        var addLessonPlanToCourse = function(next) {
            lessonPlanCourse.addLessonPlan(newLessonPlan, function(err) {
                if (err)
                {
                    next('Could not add lesson to course' + err)
                }
                else
                {
                    next();
                }
            });
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
                wait([addLessonPlanAsChild, addLessonPlanToCourse], addLessonPlanToTeacher, onErrorfn);
            }  
        })
    }
    
    wait([findTeacher, findCourse, findLessonPlan], saveLessonPlan, onErrorfn);
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
            courseID = lessonPlan.course;
            if (lessonPlan.parent != null)
            {
                parentID = lessonPlan.parent;
            }
            else
            {
                parentID = '';
            }
                
            var teacherID;
            var courseID;
            var parentID = null;
            var teacherName;
            var courseGrade;
            var courseSubject; 
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
            
            var findCourse = function(next) {
                Course.findById(courseID, function(err, course) {
                    if (err)
                    {
                        next('Could not find course' + err);
                    }
                    else
                    {
                        if (course)
                        {
                            courseGrade = course.grade.toString();
                            courseSubject = course.subject;
                            next();
                        }
                        else
                        {
                            next('Could not find course' + err);   
                        }
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
                lessonPlanViewObject.grade = courseGrade;
                lessonPlanViewObject.subject = courseSubject;
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
            
            wait([findTeacher, findLessonPlan, findCourse], populateLessonPlanView, onErrorfn);
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
            Course.find({ 
                    _id: { $in: teacher.courses}
                }, function (err, courses) {
                    if (err)
                    {
                        //Flash
                        req.flash('info', 'Unable to find courses for this teacher');
                        res.render('dashboard/newcourse', { message: req.flash('info') });
                    }
                    else {
                        res.render('dashboard/newcourse', { message: req.flash('info'), teachercourses: courses });
                    } 
                });
        }
    });
});

router.post('/createcourse', function(req, res) {
    //Look for courses with this grade
    //iterate through all courses with this grade and find the one with this subject
    //
    Teacher.findById(req.user.id, function (err, teacher){
            if (err)
            {
                req.flash('info', 'Could not find teacher');
                res.redirect('newcourse');
            }
            else
            {
                Course.findOne( { grade: req.body.courseGrade, subject: req.body.courseSubject }, function (err, course) {
                    if (!course)
                    {
                        // if no course is found, we will add the course
                        var newCourse = new Course({ grade: req.body.courseGrade, subject: req.body.courseSubject});
                        newCourse.teachers.push(teacher);
                        
                        newCourse.save(function(err) {
                            if (err)
                            {
                                req.flash('info', 'Saving the new course failed');
                                res.redirect('newcourse');
                            }
                            else
                            {
                                console.log('New Course id: ' + newCourse._id);
                                teacher.courses.push(newCourse);
                                console.log('pushed');
                                teacher.save(
                                    function(err){
                                        if (err)
                                        {
                                            req.flash('info', 'Adding this course failed!');
                                        }
                                        else
                                        {
                                            req.flash('info', 'Success!');
                                        }
                                        res.redirect('newcourse');
                                    }
                                );
                            }
                        });
                    }
                    else
                    {
                        //course exists, 
                        //only add it to the teacher, if the teacher doesnt already have it
                        if (teacher.courses.indexOf(course._id) >= 0)
                        {
                            console.log('Enrolled');
                            req.flash('info', 'You are already enrolled in this course!');
                            res.redirect('newcourse');
                        }
                        else
                        {
                            teacher.courses.push(course);
                            teacher.save(
                                function(err){
                                    if (err)
                                    {
                                        req.flash('info', 'Enrolling in this class failed');
                                        res.redirect('newcourse');
                                    }
                                    else
                                    {
                                        course.teachers.push(teacher);
                                        course.save(function(err){
                                            if (err)
                                            {
                                                req.flash('info', 'Saving the course failed');
                                            }
                                            else
                                            {
                                                req.flash('info', 'Success!');
                                            }
                                            res.redirect('newcourse');
                                        });
                                    }
                                });
                        }
                    }
                } );
            }
    });
});

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
            
            var allCourseIds = [];
            lessonPlans.forEach(function (lesson, index) {
                allCourseIds.push(lesson.course);
            });
            
            Course.find( { _id: { $in: allCourseIds } }, function (err, courses) {
                if (err)
                {
                    ErrorFunction(req, res, 'No lessons found', '/dashboard', err);
                }   
                
                var courseMap = {}
                courses.forEach(function (course, index) {
                    courseMap[course.id] = 'Grade ' + course.grade + ' ' + course.subject;
                })
                
                console.log(courseMap);
                
                lessonPlans.forEach(function (lesson, index) {
                    console.log(courseMap[lesson.course]);
                    lessonPlans[index].courseName = courseMap[lesson.course];
                })
                
                console.log(lessonPlans);
                res.render('dashboard/viewAllLessonPlans', { requestedLessonPlans: lessonPlans, teacherName: teacher.name }); //, course: 'Grade' + course.grade + course.subject }); 
            })
            
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
        
        var findCourse = function(next) {
            Course.removeLessonFromCourse(lesson.course, lesson, function(err) {
                if (err)
                {
                    next('Could not find course' + err);
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
        
        wait([findTeacher, findCourse, findLessonPlan], removeLesson, onErrorfn);
    
    })
});

router.get('/test', function (req, res) {
    res.render('test');
})

module.exports = router;