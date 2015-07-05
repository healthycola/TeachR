var express = require('express');
var passport = require('passport');
var Teacher = require('../models/teacher');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'TeachR!' });
});


router.get('/helloworld', function(req, res) {
  res.render('helloworld', { title: 'Hello World!' });
});

/* GET Userlist page. */
router.get('/userlist', function(req, res) {
    
});

router.get('/register', function(req, res) {
    res.render('user/register', { title: 'Add New User' });
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
    res.render('user/userinfo');
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
    res.render('dashboard/main');
});

router.get('/newentry', function(req, res) {
    res.render('dashboard/createlp');
});

router.get('/newcourse', function(req, res) {
    res.render('dashboard/newcourse');
});

module.exports = router;