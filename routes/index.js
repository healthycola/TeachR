var express = require('express');
var passport = require('passport');
var Account = require('../models/account');
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
    console.log(req);
    
    req.assert('name', 'Name is required').isAscii();           //Validate name
    req.assert('username', 'A valid username is required').notEmpty();  //Validate email
    req.assert('useremail', 'A valid email is required').isEmail();           //Validate name
    req.assert('password', 'The password must be between 5-10 characters').isLength(5,10);  //Validate email
    
    var errors = req.validationErrors();  
    console.log(errors);
    if (errors) {   //Display errors to user
        console.log(errors);
        return res.render('user/register', {
            message: '',
            errors: errors
        });
    }
    
    Account.register(
        new Account(
            { 
                name: req.body.name,
                school: req.body.school,
                email: req.body.useremail,
                username: req.body.username,
            }
            ),
        req.body.password,
        function(err, account) {
            if (err) {
                console.log(err);
                return res.render('user/register', 
                                  { account: account,
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
    res.render('user/login', { user: req.user });
});
           
router.post('/login', passport.authenticate('local'), function (req, res) {
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
        
        Account.findById(req.user.id, function (err, account){
            if (err)
            {
                res.render('updateuserinfo', {
                    message: '',
                    errors: err
                });
            }
            
            account.name = _name;
            account.school = _school;
            account.email = _email;
            
            account.save( function(err){
                
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

module.exports = router;