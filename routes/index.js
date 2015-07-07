var express = require('express');
var passport = require('passport');
var Teacher = require('../models/teacher');
var Course = require('../models/course');
var router = express.Router();

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
    req.assert('name', 'Name is required').isAscii();           //Validate name
    req.assert('username', 'A valid username is required').notEmpty();  //Validate email
    req.assert('useremail', 'A valid email is required').isEmail();           //Validate name
    req.assert('password', 'The password must be between 5-10 characters').isLength(5,10);  //Validate email
    
    var errors = req.validationErrors();  
    if (errors) {   //Display errors to user
        return res.render('user/register', {
            message: '',
            errors: errors
        });
    }
    
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
    res.redirect('userinfo');
});

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

router.get('/userinfo', function(req,res) {
    Teacher.findById(req.user.id, function (err, teacher){
        if (err) {
            console.log('Finding user failed');
        }
        else {
            Course.find({ 
                    _id: { $in: teacher.courses}
                }, function (err, courses) {
                    if (err)
                    {
                        //Flash
                        console.log('Finding courses failed');
                    }
                    else {
                        res.render('user/userinfo', { usercourses: courses });
                    } 
                });
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
                res.redirect('userinfo');
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
    res.render('dashboard/createlp', { message: req.flash('info') });
});

router.get('/newcourse', function(req, res) {
    res.render('dashboard/newcourse', { message: req.flash('info') });
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
                                        req.flash('info', 'Adding this course failed!');
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

module.exports = router;