var express = require('express');
var passport = require('passport');
var Teacher = require('../models/teacher');
var LessonPlan = require('../models/lessonplan');
var router = express.Router();

// Global functions
var wait = function (callbacks, done, onError) {
    var counter = callbacks.length;
    var error = null;
    var next = function (err) {
        if (err) {
            // There is an error in the wait functions, abort.
            //This needs to be an abort function. (i.e. no next, and must render/redirect)
            error = err;
            onError(err);
        }

        if (--counter == 0 && !error) {
            done();
        }
    };

    for (var i = 0; i < callbacks.length; i++) {
        callbacks[i](next);
    }
}

function findCourseIndex(courseArray, grade, subject) {
    var courseIndex = -1;
    courseArray.map(function (obj, index) {
        if (obj.grade == grade && obj.subject.toLowerCase() == subject.toLowerCase()) {
            courseIndex = index;
        }
    })

    return courseIndex;
}

function areCoursesSame(course1, course2) {
    return (course1.grade == course2.grade && course1.subject == course2.subject)
}

function findCourseFromString(stringifiedCourse) {
    var tokens = stringifiedCourse.split(' ');
    
    // if the format is "1 Math"
    if (!isNaN(tokens[0])) {
        return {
            grade: parseInt(tokens[0], 10),
            subject: tokens[1]
        };
    }
    
    // if the format is "Grade 1 Math"
    else if (tokens[0].toLowerCase() == 'grade' && !isNaN(tokens[1])) {
        //concatenate all strings after token[2]
        var subject = '';
        for (var i = 2; i < tokens.length - 1; ++i) {
            subject += tokens[i] + ' ';
        }

        subject += tokens[tokens.length - 1];

        console.log(subject);
        return {
            grade: parseInt(tokens[1], 10),
            subject: subject
        };
    }

    else {
        return null;
    }
}

function ErrorFunction(req, res, flashMessage, redirectPath, err) {
    if (!err) {
        console.log(flashMessage);
    }
    else {
        console.log(flashMessage)
        console.log(err);
    }

    req.flash('info', {message: flashMessage});
    res.redirect(redirectPath);
} 

router.get('/', function(req, res) {
  res.render('index', { title: 'TeachR!', message: req.flash('info')  });
});

router.get('/register', function(req, res) {
    res.render('user/register', { title: 'Add New User', message: req.flash('info')  });
});

router.post('/register', function (req, res) {
    Teacher.register(
        new Teacher(
            {
                name: req.body.name,
                school: req.body.school,
                email: req.body.email,
                username: req.body.username,
                joiningDate: new Date()
            }
            ),
        req.body.password,
        function (err, teacher) {
            if (err) {
                ErrorFunction(req, res, "Cannot register :(, We're working on it.", '/register', err);
            }
            
            // Log the user in
            passport.authenticate('local')(req, res, function () {
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

router.get('/myfriends', function (req, res) {
    Teacher.findById(req.user.id, function (err, teacher) {
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
            var findFollowings = function (next) {
                Teacher.find({
                    _id: { $in: teacher.following }
                }, function (err, following) {
                    if (err) {
                        next("Couldn't find any of your following" + err);
                    }
                    else {
                        _following = following;
                        next();
                    }
                });
            }

            var findFollowers = function (next) {
                Teacher.find({
                    _id: { $in: teacher.followers }
                }, function (err, followers) {
                    if (err) {
                        next("Couldn't find any of your followers" + err)
                    }
                    else {
                        _followers = followers;
                        next();
                    }
                });
            }

            var viewPage = function () {
                res.render('user/myfriends', { message: req.flash('info'), myfollowers: _followers, myfollowing: _following });
            }

            wait([findFollowers, findFollowings], viewPage, onErrorfn);
        }
    });
});

router.get('/userinfo', function (req, res) {
    if (!req.param('id') || req.param('id') == '') {
        req.flash('info', 'No User Specified');
        res.render('/');
    }

    Teacher.findById(req.param("id"), function (err, teacher) {
        if (err) {
            req.flash('info', 'Finding user failed');
            res.render('/');
        }
        else {
            res.render('user/userinfo', { requestedteacher: teacher });
        }
    });
});

router.get('/follow', function (req, res) {
    if (!req.param('id') || req.param('id') == '') {
        ErrorFunction(req, res, 'No User Specified', '/');
    }

    Teacher.FollowTeacher(req.user.id, req.param("id"), function (sourceUser, destUser, err) {
        if (err) {
            ErrorFunction(req, res, 'Following this teacher failed', 'myfriends', err);
        }
        else {
            req.flash('info', 'Success!');
            res.redirect('myfriends');
        }
    });
});

router.get('/unfollow', function (req, res) {
    if (!req.param('id') || req.param('id') == '') {
        ErrorFunction(req, res, 'No user specified', 'myfriends');
    }

    Teacher.UnfollowTeacher(req.user.id, req.param("id"), function (sourceUser, destUser, err) {
        if (err) {
            ErrorFunction(req, res, 'Unfollowing this teacher failed', 'myfriends', err);
        }
        else {
            req.flash('info', 'Success!');
            res.redirect('myfriends');
        }
    });
});

router.get('/updateuserinfo', function(req,res) {
    res.render('user/updateuserinfo');
});


router.post('/updateuserinfo', function (req, res) {
    if (!req.user) {        ErrorFunction(req, res, "You are not logged in.", '/');
    }

    if (req.user) {
        console.log(req);
        var _name = (req.body.name) ? req.body.name : req.user.name;
        var _school = (req.body.school) ? req.body.school : req.user.school;
        var _email = (req.body.email) ? req.body.email : req.user.email;

        Teacher.findById(req.user.id, function (err, teacher) {
            if (err) {
                ErrorFunction(req, res, "Could not update user", '/updateuserinfo', err);
            }

            teacher.name = _name;
            teacher.school = _school;
            teacher.email = _email;

            teacher.save(function (err) {
                res.redirect('userinfo?id=' + req.user._id.toHexString());
            });
        });
    }
    else {

    }
});

router.get('/dashboard', function (req, res) {
    if (!req.user) {
        ErrorFunction(req, res, 'You are not logged in.', '/', null);
    }

    Teacher.findById(req.user.id, function (err, teacher) {
        if (err) {
            ErrorFunction(req, res, 'Unable to find teacher. Admin is looking into it!', '/', null);
        }
        else {
            LessonPlan.find(function (err, lessonPlans) {
                    if (err) {
                        ErrorFunction(req, res, 'Unable to find lesson plans', '/', err);
                    }
                    else {
                        res.render('dashboard/main', { message: req.flash('info'), followingLessonPlans: lessonPlans });
                    }
                })
        }
    });
});

router.get('/newentry', function(req, res) {
    if (!req.user)
    {
        ErrorFunction(req, res, 'You are not logged in.', '/', null);
    }
    
    Teacher.findById(req.user.id, function (err, teacher){
        if (err) {
            ErrorFunction(req, res, 'Unable to find teacher. Admin is looking into it!', '/', null);
        }
        else {
            if (teacher.courses.length == 0)
            {
                ErrorFunction(req, res, 'Please enroll in a course first!', 'newcourse', null);
            }
            else
            {
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
                                var key = 'Grade ' + element.course.grade + ' ' + element.course.subject;
                                if (!(key in courseLessonMap))
                                {
                                    courseLessonMap[key] = [];
                                }
                                courseLessonMap[key].push(element.title);
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
        }
    });
});

var editingModes = [
    {
        mode: "edit",
        modeURL: "editLessonPlan",
        modeText: "Edit"
    },
    {
        mode: "fork",
        modeURL: "forkLessonPlan",
        modeText: "Fork"
    }
]

router.get('/editEntry', function (req, res) {
    if (!req.param('id') || req.param('id') == '') {
        ErrorFunction(req, res, 'No lesson specified', 'dashboard');
    }

    LessonPlan.findById(req.param('id'), function (err, lesson) {
        console.log(parseInt(lesson.author.id));
        console.log(parseInt(req.user._id));
        if (lesson.author != req.user.id) {
            ErrorFunction(req, res, 'You are not allowed to edit this post.', 'dashboard');
        }
        else {
            res.render('dashboard/editLP', { message: req.flash('info'), originalLessonPlan: lesson, mode: editingModes[0] });
        }
    })
});

router.get('/forkEntry', function (req, res) {
    if (!req.param('id') || req.param('id') == '') {
        ErrorFunction(req, res, 'No lesson specified', 'dashboard');
    }

    LessonPlan.findById(req.param('id'), function (err, lesson) {
        if (lesson.author == req.user.id) {
            ErrorFunction(req, res, 'You cannot fork your own post!', 'dashboard');
        }
        else {
            Teacher.findById(req.user.id, function (err, teacher) {
                if (err) {
                    ErrorFunction(req, res, 'No user found!', 'dashboard');
                }
                else {
                    var isTeacherEnrolledInCourse = false;

                    for (var i = 0; i < teacher.courses.length; ++i) {
                        if (areCoursesSame(teacher.courses[i], lesson.course)) {
                            isTeacherEnrolledInCourse = true;
                            break;
                        }
                    }

                    if (isTeacherEnrolledInCourse) {
                        res.render('dashboard/editLP', { message: req.flash('info'), originalLessonPlan: lesson, mode: editingModes[1] });
                    }
                    else {
                        ErrorFunction(req, res, 'You are not enrolled in the course for this fork to happen. Enroll in Grade ' + lesson.course.grade + ' ' + lesson.course.subject, 'newcourse', null);
                    }
                }
            })
        }
    })
});

router.post('/editLessonPlan/:id', function(req, res) {
    if (!req.params.id)
    {
        ErrorFunction(req, res, 'No lesson specified', '/dashboard');
    }
    
    LessonPlan.update({ _id: req.params.id }, { $set: 
        {
            title: req.body.title,
            duration_in_days: req.body.duration,
            lesson_plan_text: req.body.LessonPlanText,
            lesson_plan_expectations: req.body.expectations
        }
        }, function(err) {
            if (err)
            {
                ErrorFunction(req, res, "Error while updating document.", '/viewLesson?id=' + req.param.id, err);
            }
            else
            {
                req.flash('info', 'Success!');
                res.redirect('/viewLesson?id=' + req.params.id);
            }
        })
});

var createNewLessonPlan = function (req, res, parentLessonPlan) {
    var lessonPlanLinked;
    var currentTeacher;
    var lessonPlanCourse = {};
    var lessonParents;

    if (parentLessonPlan) {
        lessonPlanLinked = parentLessonPlan.linkedLesson;
        lessonParents = parentLessonPlan.parents;
        lessonParents.push(parentLessonPlan);
        lessonPlanCourse.grade = parentLessonPlan.course.grade;
        lessonPlanCourse.subject = parentLessonPlan.course.subject;
    }
    else {
        lessonPlanCourse = findCourseFromString(req.body.course);
        lessonParents = [];
    }

    var onErrorfn = function (err) {
        ErrorFunction(req, res, 'Creating a new lesson failed!', '/dashboard', err);
    }

    var findTeacher = function (next) {
        Teacher.findById(req.user.id, function (err, teacher) {
            if (err) {
                next('Could not find teacher' + err);
            }
            else {
                currentTeacher = teacher;
                next();
            }
        })
    }

    var findLinkedLessonPlan = function (next) {
        if (req.body.lessonlink != '') {
            LessonPlan.findLessonPlanWithNameAndCourse(req.body.lessonlink, lessonPlanCourse, function (err, lessonPlan) {
                if (err) {
                    next('Could not find linkedLesson' + err);
                }
                else {
                    lessonPlanLinked = lessonPlan[0];
                    next();
                }
            })
        }
        else {
            lessonPlanLinked = null;
            next();
        }
    }

    var saveLessonPlan = function () {
        if (!lessonPlanCourse) {
            onErrorfn("Unable to find course linked to this lesson");
        }

        var newLessonPlan = new LessonPlan({
            title: req.body.title,
            course: lessonPlanCourse,
            parents: lessonParents,
            linkedLesson: lessonPlanLinked,
            author: currentTeacher,
            duration_in_days: req.body.duration,
            lesson_plan_text: req.body.LessonPlanText,
            lesson_plan_expectations: req.body.expectations,
            number_of_votes: 0,
            average_rating: 0,
            date: new Date()
        })

        var addLessonPlanToTeacher = function () {
            currentTeacher.addlessonPlan(newLessonPlan, function (err) {
                if (err) {
                    onErrorfn('Could not add lesson to teacher' + err);
                }
                else {
                    //ErrorFunction(req, res, 'Success!', '/dashboard');
                    res.redirect('/viewLesson?id=' + newLessonPlan._id.toHexString());
                }
            })
        }

        newLessonPlan.save(function (err) {
            if (err) {
                onErrorfn('Could not save lesson' + err);
            }
            else {
                console.log('here');
                addLessonPlanToTeacher();
            }
        })
    }

    if (parentLessonPlan) {
        wait([findTeacher], saveLessonPlan, onErrorfn);
    }
    else {
        wait([findTeacher, findLinkedLessonPlan], saveLessonPlan, onErrorfn);
    }
}

router.post('/forkLessonPlan/:id', function (req, res) {
    if (!req.params.id) {
        ErrorFunction(req, res, 'No lesson specified', '/dashboard');
    }

    LessonPlan.findById({ _id: req.params.id }, function (err, lessonPlan) {
        if (err) {
            ErrorFunction(req, res, 'No lesson found to fork.', '/dashboard', err)
        }
        else {
            createNewLessonPlan(req, res, lessonPlan);
        }
    })
});

router.post('/newlessonplan', function (req, res) {
    if (!req.user) {
        ErrorFunction(req, res, "You are not logged in.", '/');
    }
    else {
        createNewLessonPlan(req, res);
    }
});

router.get('/viewLesson', function (req, res) {
    if (!req.param('id') || req.param('id') == '') {
        ErrorFunction(req, res, 'No Lesson Specified', '/dashboard', null);
    }

    var onErrorfn = function (err) {
        ErrorFunction(req, res, 'Viewing this lesson failed!', '/dashboard', err);
    }

    LessonPlan.findById(req.param('id'), function (err, lessonPlan) {
        if (err) {
            onErrorfn('No Lesson Found' + err);
        }
        else {
            requestedLessonPlan = lessonPlan;
            teacherID = lessonPlan.author;
            var linkedlessonID = null;
            if (lessonPlan.linkedLesson != null) {
                linkedlessonID = lessonPlan.linkedLesson;
            }
            else {
                linkedlessonID = '';
            }

            var teacherID;
            var teacherName;
            var linkedLessonTitle;

            var requestedLessonPlan;
            
            // Need to get the lesson, then associated course, then associated linked lesson, then associated author
            var findTeacher = function (next) {
                console.log('Teacher: ' + teacherID);
                Teacher.findById(teacherID, function (err, teacher) {
                    if (err || !teacher) {
                        next('Could not find teacher' + err);
                    }
                    else {
                        teacherName = teacher.name;
                        next();
                    }
                })
            }

            var findLinkedLessonPlan = function (next) {
                if (linkedlessonID && linkedlessonID != '') {
                    LessonPlan.findById(linkedlessonID, function (err, linkedLessonPlan) {
                        if (err) {
                            next('Could not find Linked Lesson' + err);
                        }
                        else {
                            linkedLessonTitle = linkedLessonPlan.title;
                            next();
                        }
                    })
                }
                else {
                    linkedLessonTitle = '';
                    next();
                }
            }

            var populateLessonPlanView = function () {
                var lessonPlanViewObject = {}
                lessonPlanViewObject.title = requestedLessonPlan.title;
                lessonPlanViewObject.grade = requestedLessonPlan.course.grade;
                lessonPlanViewObject.subject = requestedLessonPlan.course.subject;
                lessonPlanViewObject.duration = requestedLessonPlan.duration_in_days;
                if (linkedlessonID != '') {
                    lessonPlanViewObject.linkedLessonTitle = linkedLessonTitle;
                }
                lessonPlanViewObject.teacherID = requestedLessonPlan.author;
                lessonPlanViewObject.lessonID = requestedLessonPlan._id;
                lessonPlanViewObject.author = teacherName;
                lessonPlanViewObject.text = requestedLessonPlan.lesson_plan_text;
                lessonPlanViewObject.expectations = requestedLessonPlan.lesson_plan_expectations;
                lessonPlanViewObject.votes = requestedLessonPlan.number_of_votes;
                lessonPlanViewObject.parents = requestedLessonPlan.parents;
                lessonPlanViewObject.history = requestedLessonPlan.history_lp;
                res.render('dashboard/viewLesson', { lessonPlan: lessonPlanViewObject });
            }

            wait([findTeacher, findLinkedLessonPlan], populateLessonPlanView, onErrorfn);
        }
    })
})

router.get('/newcourse', function (req, res) {
    if (!req.user) {
        ErrorFunction(req, res, 'You are not logged in!', '/', null);
    }

    Teacher.findById(req.user.id, function (err, teacher) {
        if (err) {
            req.flash('info', 'Finding user failed');
            res.render('/');
        }
        else {
            res.render('dashboard/newcourse', { message: req.flash('info'), teachercourses: teacher.courses });
        }
    });
});

router.post('/createcourse', function (req, res) {
    if (!req.user) {
        ErrorFunction(req, res, "You are not logged in.", '/');
    }

    Teacher.findById(req.user.id, function (err, teacher) {
        if (err) {
            req.flash('info', 'Could not find teacher');
            res.redirect('newcourse');
        }
        else {
            var courseIndex = findCourseIndex(teacher.courses, req.body.courseGrade, req.body.courseSubject);
            if (courseIndex == -1) {
                var course = { grade: req.body.courseGrade, subject: req.body.courseSubject };
                teacher.courses.push(course);

                teacher.save(function (err) {
                    if (err) {
                        req.flash('info', 'Adding this course failed!');
                    }
                    else {
                        req.flash('info', 'Success!');
                    }
                })
            }
            else {
                req.flash('info', 'Thise course already exists in your enrolled courses!');
            }

            res.redirect('newcourse');
        }
    });
});

router.post('/removecourse', function (req, res) {
    if (!req.user) {
        ErrorFunction(req, res, "You are not logged in.", '/');
    }

    Teacher.findById(req.user.id, function (err, teacher) {
        if (err) {
            ErrorFunction(req, res, "No teacher found.", "newcourse", err);
        }
        else {
            var courseToRemove = findCourseFromString(req.body.course);

            if (!courseToRemove) {
                ErrorFunction(req, res, "No such course. Please contact admin.", "newcourse", "bad string format");
            }

            var courseIndex = findCourseIndex(teacher.courses, courseToRemove.grade, courseToRemove.subject);
            if (courseIndex != -1) {
                teacher.courses.splice(courseIndex, 1);

                teacher.save(function (err) {
                    if (err) {
                        ErrorFunction(req, res, 'Removing this course failed!', 'newcourse', err);
                    }
                    else {
                        req.flash('info', 'Success!');
                        res.redirect('newcourse');
                    }
                })
            }
            else {
                ErrorFunction(req, res, 'You are not enrolled in this course', 'newcourse');
            }
        }
    });
})

router.get('/viewAllLessons', function (req, res) {
    if (!req.param('id') || req.param('id') == '') {
        ErrorFunction(req, res, 'No user Specified', '/dashboard', null);
    }

    Teacher.getAllLessonPlans(req.param('id'), function (err, teacher) {
        if (err || !teacher) {
            ErrorFunction(req, res, 'No user found', '/dashboard', err);
        }

        LessonPlan.findAllLessons(teacher.lessonPlans, function (err, lessonPlans) {
            if (err) {
                ErrorFunction(req, res, 'No lessons found', '/dashboard', err);
            }

            res.render('dashboard/viewAllLessonPlans', { requestedLessonPlans: lessonPlans, teacherName: teacher.name });
        })
    })
})

router.post('/removeLesson', function (req, res) {
    if (!req.user) {
        ErrorFunction(req, res, "You are not logged in.", '/');
    }

    if (!req.body.lessonID || req.body.lessonID == '') {
        ErrorFunction(req, res, 'No Lesson to remove', '/dashboard', null);
    }
    
    //Get the lesson, then get the associated teacher and course. If the lesson has children, it cannot be deleted 
    LessonPlan.findById(req.body.lessonID, function (err, lesson) {
        if (err) {
            ErrorFunction(req, res, 'No lesson found', '/dashboard', err);
        }

        if (!lesson) {
            ErrorFunction(req, res, 'No lesson found', '/dashboard', 'ID: ' + req.body.lessonID);
        }

        var onErrorfn = function (err) {
            ErrorFunction(req, res, 'Removing this lesson failed!', '/dashboard', err);
        }

        LessonPlan.find({
            parents: lesson._id
        }, function (err, children) {
            if (err) {
                onErrorfn('Couldn not find parents', err);
            }
            else {
                if (children.length > 0) {
                    onErrorfn('Cannot remove this lesson since this is a parent of other lessons. Sorry!');
                }
                else {
                    // Need to get the lesson, then associated course, then associated linked lesson, then associated author
                    var removeLessonFromTeacher = function (next) {
                        Teacher.removeLessonFromTeacherID(lesson.author, lesson, function (err) {
                            if (err) {
                                next('Could not find teacher' + err);
                            }
                            else {
                                next();
                            }
                        })
                    }

                    var removeLesson = function () {
                        LessonPlan.remove({ _id: lesson.id }, function (err) {
                            if (err) {
                                onErrorfn('Could not remove lesson' + err);
                            }
                            else {
                                req.flash('info', 'Success!');
                                res.redirect('/viewAllLessons?id=' + req.user.id);
                            }
                        });
                    }

                    wait([removeLessonFromTeacher], removeLesson, onErrorfn);
                }
            }
        })

    })
});

router.get('/test', function (req, res) {
    res.render('test');
})

router.get('/upvote', function (req, res) {
    if (!req.user) {
        ErrorFunction(req, res, "You are not logged in.", '/');
        return;
    }
    
    if (!req.param('id') || req.param('id') == '') {
        ErrorFunction(req, res, 'No lesson Specified', '/dashboard', null);
        return;
    }
    
    var currentTeacher;
    var upvoteLesson;
    
    var onErrorfn = function (error) {
        res.send({err: 'Removing this lesson failed' + error });
    }
    
    var findTeacher = function (next) {
        Teacher.findById(req.user.id, function (err, teacher) {
            if (err) {
                next('Could not find teacher' + err);
            }
            else {
                currentTeacher = teacher;
                next();
            }
        })
    }
    
    var findLessonPlan = function (next) {
        LessonPlan.findById(req.param('id'), function (err, lesson) {
            if (err) {
                next('Could not find Linked Lesson' + err);
            }
            else {
                upvoteLesson = lesson;
                next();
            }
        })
    }
    
    var upvote = function () {
        var updateTeacherList = function(next) {
            currentTeacher.upvote(upvoteLesson);
            currentTeacher.save(function(err) {
                if (err) {
                    next('Could not save the lesson voted on' + err);
                }
                else {
                    next();
                }
            })
        }
        
        var updateLessonVote = function (next) {
            upvoteLesson.number_of_votes++;
            upvoteLesson.save(function(err) {
                if (err) {
                    next('Could not update vote' + err);
                }
                else {
                    next();
                }
            })
        }
        
        var sendResponse = function () {
            res.send({err: null, upvote: true});
        }
        
        if (upvoteLesson.author == currentTeacher.id)
        {
            res.send({err: "You can't upvote your own lesson!", downvote: false});
            return;
        }
        
        for (var i = 0; i < currentTeacher.votedPosts.length; ++i) {
            if (currentTeacher.votedPosts[i] == upvoteLesson.id) {
                res.send({err: null, upvote: false});
                return;
            }
        }
        
        wait([updateTeacherList, updateLessonVote], sendResponse, onErrorfn);
    }
    
    wait([findTeacher, findLessonPlan], upvote, onErrorfn);
})

router.get('/downvote', function (req, res) {
    if (!req.user) {
        ErrorFunction(req, res, "You are not logged in.", '/');
        return;
    }

    if (!req.param('id') || req.param('id') == '') {
        ErrorFunction(req, res, 'No lesson Specified', '/dashboard', null);
        return;
    }

    var currentTeacher;
    var downvotelesson;

    var onErrorfn = function (error) {
        res.send({ err: 'Removing this lesson failed' + error });
    }

    var findTeacher = function (next) {
        Teacher.findById(req.user.id, function (err, teacher) {
            if (err) {
                next('Could not find teacher' + err);
            }
            else {
                currentTeacher = teacher;
                next();
            }
        })
    }

    var findLessonPlan = function (next) {
        LessonPlan.findById(req.param('id'), function (err, lesson) {
            if (err) {
                next('Could not find Linked Lesson' + err);
            }
            else {
                downvotelesson = lesson;
                next();
            }
        })
    }

    var downvote = function () {
        var updateTeacherList = function (next) {
            currentTeacher.downvote(downvotelesson);
            currentTeacher.save(function (err) {
                if (err) {
                    next('Could not save the lesson voted on' + err);
                }
                else {
                    next();
                }
            })
        }

        var updateLessonVote = function (next) {
            downvotelesson.number_of_votes--;
            downvotelesson.save(function (err) {
                if (err) {
                    next('Could not update vote' + err);
                }
                else {
                    next();
                }
            })
        }

        var sendResponse = function () {
            res.send({ err: null, downvote: true });
        }

        if (downvotelesson.author == currentTeacher.id) {
            res.send({ err: "You can't downvote your own lesson!", downvote: false });
            return;
        }

        var hasTeacherVoted = false;
        for (var i = 0; i < currentTeacher.votedPosts.length; ++i) {
            if (currentTeacher.votedPosts[i] == downvotelesson.id) {
                //res.send({err: null, upvote: false});
                hasTeacherVoted = true;
                break;
            }
        }

        if (!hasTeacherVoted) {
            res.send({ err: null, downvote: false });
        }
        else {
            wait([updateTeacherList, updateLessonVote], sendResponse, onErrorfn);
        }
    }

    wait([findTeacher, findLessonPlan], downvote, onErrorfn);
})

router.get('/requestMerge', function (req, res) {
    if (!req.user) {
        ErrorFunction(req, res, "You are not logged in.", '/');
        return;
    }

    if (!req.param('id') || req.param('id') == '') {
        ErrorFunction(req, res, 'No lesson Specified', '/dashboard', null);
        return;
    }

    var requestForMergeObject = {};
    LessonPlan.findById(req.param('id'), function (err, lesson) {
        if (err) {
            ErrorFunction(req, res, 'Could not find lesson', '/dashboard', null);
            return;
        }
        var lastParent = lesson.parents[lesson.parents.length - 1];

        LessonPlan.findById(lastParent, function (err, parentLesson) {
            if (err) {
                ErrorFunction(req, res, 'Could not find lesson', '/dashboard', null);
                return;
            }

            Teacher.findById(parentLesson.author, function (err, parentTeacher) {
                if (err) {
                    ErrorFunction(req, res, 'Could not find parent teacher', '/dashboard', null);
                    return;
                }

                requestForMergeObject.myLesson = parentLesson;
                requestForMergeObject.otherLesson = lesson;

                res.render('dashboard/requestMerge', { requestForMerge: requestForMergeObject, teacher: parentTeacher });
            })
        })
    })
})

router.get('/sendMergeRequest', function (req, res) {
    // TODO: don't send duplicate requests
    if (!req.user) {
        ErrorFunction(req, res, "You are not logged in.", '/');
        return;
    }

    if (!req.param('id') || req.param('id') == '') {
        ErrorFunction(req, res, 'No lesson Specified', '/dashboard', null);
        return;
    }
    
    var requestForMergeObject = {};
    LessonPlan.findById(req.param('id'), function(err, lesson) {
        if (err) {
            ErrorFunction(req, res, 'Could not find lesson', '/dashboard', null);
            return;
        }
        var lastParent = lesson.parents[lesson.parents.length - 1];
        
        LessonPlan.findById(lastParent, function(err, parentLesson) {
              if (err) {
                  ErrorFunction(req, res, 'Could not find lesson', '/dashboard', null);
                  return;
              }
              
              requestForMergeObject.myLesson = parentLesson;
              requestForMergeObject.otherLesson = lesson;
              
              Teacher.findById(parentLesson.author, function(err, teacher) {
                  if (err) {
                      ErrorFunction(req, res, 'Could not send notification', '/dashboard', null);
                      return;
                  }
                  
                  teacher.requestForMerge.push(requestForMergeObject);
                  
                  teacher.save(function(err) {
                      if (err) {
                          ErrorFunction(req, res, 'Could not send notification', '/dashboard', null);
                          return;
                      }
                      
                      req.flash('info', 'Merge Request Sent!');
                      res.redirect('/requestMerge?id=' + lesson.id);
                  })
              })
        })
    })
})

router.get('/viewMergeRequests', function (req, res) {
    if (!req.user) {
        ErrorFunction(req, res, "You are not logged in.", '/');
        return;
    }
    
    var onErrorfn = function (error) {
        res.send({ err: 'Removing this lesson failed' + error });
    }
    
    var mergeRequests = [];
    var waitFor = function (callback, parameters, done, onError) {
        var counter = parameters.length;
        var error = null;
        var next = function (err) {
            if (err) {
                // There is an error in the wait functions, abort.
                //This needs to be an abort function. (i.e. no next, and must render/redirect)
                error = err;
                onError(err);
            }

            if (--counter == 0 && !error) {
                done();
            }
        };

        for (var i = 0; i < parameters.length; i++) {
            callback(parameters[i], next);
        }
    }
    
    var findRequests = function(request, next) {
        LessonPlan.findById(request.myLesson, function(err, originalLesson) {
            if (err || !originalLesson) {
                next('Cannot find original lesson' + err);
                return;
            }
            
            LessonPlan.findById(request.otherLesson, function(err, mergeRequestLesson) {
                if (err || !mergeRequestLesson) {
                    next('Cannot find other lesson' + err);
                    return;
                }
                
                Teacher.findById(mergeRequestLesson.author, function(err, otherTeacher) {
                    if (err || !otherTeacher) {
                        next('Cannot find other teacher' + err);
                        return;
                    }
                    
                    var mergeRequestObject = { myLesson: originalLesson, otherLesson: mergeRequestLesson, mergeTeacher: otherTeacher};
                    mergeRequests.push(mergeRequestObject);
                    next();
                })
            })
        })
    }
    
    var renderPage = function () {
        res.render('user/viewMergeRequests', { mergeRequestsObjects: mergeRequests });
    }
    
    waitFor(findRequests, req.user.requestForMerge, renderPage, onErrorfn);
})

router.get('/viewMerge', function (req, res) {
    if (!req.user) {
        ErrorFunction(req, res, "You are not logged in.", '/');
        return;
    }

    if (!req.param('id') || req.param('id') == '') {
        ErrorFunction(req, res, 'No lesson Specified', '/dashboard', null);
        return;
    }

    var requestForMergeObject = {};
    LessonPlan.findById(req.param('id'), function (err, lesson) {
        if (err) {
            ErrorFunction(req, res, 'Could not find lesson', '/dashboard', null);
            return;
        }
        var lastParent = lesson.parents[lesson.parents.length - 1];

        LessonPlan.findById(lastParent, function (err, parentLesson) {
            if (err) {
                ErrorFunction(req, res, 'Could not find lesson', '/dashboard', null);
                return;
            }

            Teacher.findById(lesson.author, function (err, parentTeacher) {
                if (err) {
                    ErrorFunction(req, res, 'Could not find parent teacher', '/dashboard', null);
                    return;
                }

                requestForMergeObject.myLesson = parentLesson;
                requestForMergeObject.otherLesson = lesson;

                res.render('dashboard/requestMerge', { requestForMerge: requestForMergeObject, teacher: parentTeacher, view: true });
            })
        })
    })
})

router.get('/acceptMerge', function (req, res) {
    if (!req.user) {
        ErrorFunction(req, res, "You are not logged in.", '/');
        return;
    }

    if (!req.param('id') || req.param('id') == '') {
        ErrorFunction(req, res, 'No lesson Specified', '/dashboard', null);
        return;
    }

    LessonPlan.findById(req.param('id'), function (err, lesson) {
        if (err) {
            ErrorFunction(req, res, 'Could not find lesson', '/dashboard', null);
            return;
        }
        var lastParent = lesson.parents[lesson.parents.length - 1];

        LessonPlan.findById(lastParent, function (err, parentLesson) {
            if (err) {
                ErrorFunction(req, res, 'Could not find lesson', '/dashboard', null);
                return;
            }
            
            var historyEntry = {}
            historyEntry.text = parentLesson.lesson_plan_text;
            historyEntry.expectations = parentLesson.lesson_plan_expectations;
            historyEntry.date = parentLesson.date;
            historyEntry.mergeInititator = lesson;
            
            parentLesson.history_lp.push(historyEntry);
            
            parentLesson.title = lesson.title;
            parentLesson.duration_in_days = lesson.duration_in_days;
            parentLesson.lesson_plan_text = lesson.lesson_plan_text;
            parentLesson.lesson_plan_expectations = lesson.lesson_plan_expectations;
            parentLesson.date = new Date();
            
            //TODO: Inform initiator that they have been accepted;
            
            var indexToRemove = -1;
            for (var i = 0; i < req.user.requestForMerge.length; ++i) {
                if (req.user.requestForMerge[i].myLesson == parentLesson.id)
                {
                    indexToRemove = i;
                    break;
                }
            }
            
            if (indexToRemove == -1) {
                ErrorFunction(req, res, 'Could not find request', '/dashboard', null);
                return;
            }
            else
            {
                req.user.requestForMerge.splice(indexToRemove, 1);
                
                req.user.save(function(err) {
                    if (err) {
                        ErrorFunction(req, res, 'Cannot save user', '/dashboard', null);
                        return;
                    }
                    
                    parentLesson.save(function(err) {
                        if (err) {
                            ErrorFunction(req, res, 'Cannot save lesson', '/dashboard', null);
                            return;
                        }
                        
                        req.flash('info', 'Success!');
                        res.redirect('/viewLesson?id=' + parentLesson.id);
                    })
                })   
            }
        })
    })
})

router.get('/rejectMerge', function (req, res) {
    if (!req.user) {
        ErrorFunction(req, res, "You are not logged in.", '/');
        return;
    }

    if (!req.param('id') || req.param('id') == '') {
        ErrorFunction(req, res, 'No lesson Specified', '/dashboard', null);
        return;
    }

    var indexToRemove = -1;
    for (var i = 0; i < req.user.requestForMerge.length; ++i) {
        if (req.user.requestForMerge[i].otherLesson == req.param('id'))
        {
            indexToRemove = i;
            break;
        }
    }
    
    if (indexToRemove == -1) {
        ErrorFunction(req, res, 'Could not find request', '/dashboard', null);
        return;
    }
    else
    {
        req.user.requestForMerge.splice(indexToRemove, 1);
        
        req.user.save(function(err) {
            if (err) {
                ErrorFunction(req, res, 'Cannot save user', '/dashboard', null);
                return;
            }
            
            req.flash('info', 'Rejected!');
            res.redirect('userinfo?id=' + req.user._id.toHexString());
        })   
    }
})

module.exports = router;