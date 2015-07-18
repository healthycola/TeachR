var express = require('express');
var passport = require('passport');
var Teacher = require('../models/teacher');
var Course = require('../models/course');
var LessonPlan = require('../models/lessonplan');
var router = express.Router();

var wait = function(callbacks, done) {
   var counter = callbacks.length;
   var next = function() {
      if(--counter == 0) {
         done();
      }
   };
   
   for(var i = 0; i < callbacks.length; i++) {
      callbacks[i](next);
   }
   
}

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'TeachR!', message: req.flash('info')  });
});


router.get('/helloworld', function(req, res) {
  res.render('helloworld', { title: 'Hello World!', message: req.flash('info')  });
});

/* GET Userlist page. */
router.get('/userlist', function(req, res) {
    
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
                console.log(err);
                return res.render('user/register', 
                                  { teacher: teacher,
                                    registerFail: err }
                                  );
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
});

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
            Teacher.find({ 
                    _id: { $in: teacher.following}
                }, function (err, following) {
                    if (err)
                    {
                        //Flash
                        console.log('Unable to find followed teachers');
                        req.flash('info', 'Unable to find followed teachers');
                        res.render('user/myfriends', { message: req.flash('info') } );
                    }
                    else {
                        Teacher.find({ 
                            _id: { $in: teacher.followers}
                        }, function (err, followers) {
                            if (err)
                            {
                                //Flash
                                console.log('Unable to find following teachers')
                                req.flash('info', 'Unable to find following teachers');
                                res.render('user/myfriends', { message: req.flash('info') });
                            }
                            else {
                                res.render('user/myfriends', { message: req.flash('info') , myfollowers: followers, myfollowing: following });
                            } 
                        });
                    } 
                });
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
            Course.findAllCoursesFromTeacher(teacher, function (err, courses) {
                    if (err)
                    {
                        //Flash
                        req.flash('info', 'Unable to find courses for this teacher');
                        res.render('user/userinfo', {requestedteacher: teacher});
                    }
                    else {
                        res.render('user/userinfo', { requestedteacher: teacher, teachercourses: courses });
                    } 
                });
        }
    });
});

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
            console.log('Success');
            req.flash('info', 'Success!');
            res.redirect('myfriends');
        }
    });
});

router.get('/unfollow', function(req,res) {
    if (!req.param('id') || req.param('id') == '')
    {
        req.flash('info', 'No User Specified');
        res.render('/');
    }
    
    Teacher.UnfollowTeacher(req.user.id, req.param("id"), function(sourceUser, destUser, err){
        if (err)
        {
            ErrorFunction(req, res, 'Unfollowing this teacher failed', 'myfriends');
        }
        else
        {
            console.log('Success');
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
                res.render('updateuserinfo', {
                    message: '',
                    errors: err
                });
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
            Course.findAllCoursesFromTeacher(teacher, function (err, courses) {
                    if (err)
                    {
                        //Flash
                        console.log('Finding courses failed');
                    }
                    else {
                        if (courses.length < 1)
                        {
                            req.flash('info', 'Please enrol in a class before trying to create a lesson plan.');
                            res.redirect('dashboard');
                        }
                        else
                        {
                            //res.render('dashboard/createlp', { message: req.flash('info'), usercourses: courses });
                            
                            LessonPlan.findAllLessonsFromTeacher(teacher, function (err, lessonPlans) {
                                if (err)
                                {
                                    req.flash('info', 'Error looking for lessons');
                                    res.redirect('dashboard');
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
                                    
                                    console.log(courseLessonMap);
                                    
                                    res.render('dashboard/createlp', { message: req.flash('info'), 
                                        usercourses: courses, 
                                        courseLessonPlan: courseLessonMap });
                                }
                            });
                        }
                    } 
                });
        }
    });
});

router.post('/newlessonplan', function(req, res) {
    var lessonPlanCourse;
    var lessonPlanLinked;
    var currentTeacher;
    
    var findTeacher = function(next) {
        Teacher.findById(req.user.id, function (err, teacher){
            if (err)
            {
                ErrorFunction(req, res, 'Could not find teacher', 'dashboard');
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
                ErrorFunction(req, res, 'Could not find course', 'dashboard');
            }
            else
            {
                if (course)
                {
                    lessonPlanCourse = course;
                    next();
                }
                else
                {
                    ErrorFunction(req, res, 'Could not find course', 'dashboard');   
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
                    ErrorFunction(req, res, 'Could not find linkedLesson', 'dashboard');
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
                        ErrorFunction(req, res, 'Could not find linkedLesson', '/dashboard');
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
                    ErrorFunction(req, res, 'Could not add lesson to course', '/dashboard');
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
                        console.log(err);
                        ErrorFunction(req, res, 'Could not add lesson to teacher' + err, '/dashboard');
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
                ErrorFunction(req, res, 'Could not save lesson' + err, '/dashboard');
            }
            else
            {
                wait([addLessonPlanAsChild, addLessonPlanToCourse], addLessonPlanToTeacher);
            }  
        })
    }
    
    wait([findTeacher, findCourse, findLessonPlan], saveLessonPlan);
});

router.get('/viewLesson', function (req, res) {
    if (!req.param('id') || req.param('id') == '')
    {
        ErrorFunction(req, res, 'No Lesson Specified', '/dashboard', null);
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
                ErrorFunction(req, res, 'Could not find teacher', 'dashboard', err);
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
                ErrorFunction(req, res, 'Could not find course', 'dashboard', err);
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
                    ErrorFunction(req, res, 'Could not find course', 'dashboard', err);   
                }
            }
        })
    }
    
    var findLessonPlan = function(next) {
        if (parentID != '')
        {
            LessonPlan.findById(parentID, function(err, lessonPlan) {
                if (err)
                {
                    ErrorFunction(req, res, 'Could not find linkedLesson', 'dashboard', err);
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
        if (parentID != '')
        {
            lessonPlanViewObject.parentTitle = parentTitle;
        }
        lessonPlanViewObject.author = teacherName;
        lessonPlanViewObject.text = requestedLessonPlan.lesson_plan_text;
        lessonPlanViewObject.expectations = requestedLessonPlan.lesson_plan_expectations;
        
        res.render('dashboard/viewLesson', {lessonPlan: lessonPlanViewObject});
    }
    
        

    LessonPlan.findById(req.param('id'), function(err, lessonPlan) {
        if (err)
        {
            ErrorFunction(req, res, 'No Lesson Found', '/dashboard', err);
        }
        else
        {
            console.log('LP' + lessonPlan);
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
            
            wait([findTeacher, findLessonPlan, findCourse], populateLessonPlanView);
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
    Teacher.getAllLessonPlans(req.user.id, function(err, teacher) {
        if (err)
        {
            ErrorFunction(req, res, 'No user found', '/dashboard', err);
        }
        
        LessonPlan.findAllLessons(teacher.lessonPlans, function(err, lessonPlans) {
            if (err)
            {
                ErrorFunction(req, res, 'No lessons found', '/dashboard', err);
            }
            
            console.log(lessonPlans);
            res.render('dashboard/viewAllLessonPlans', { requestedLessonPlans: lessonPlans });
        })
    })
})

module.exports = router;