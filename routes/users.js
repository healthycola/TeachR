var express = require('express');
var Teacher = require('../models/teacher');
var Course = require('../models/course');
var router = express.Router();

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
            Course.find({ 
                    _id: { $in: teacher.courses}
                }, function (err, courses) {
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

router.get('/follow', function(req,res) {
    if (!req.param('id') || req.param('id') == '')
    {
        req.flash('info', 'No User Specified');
        res.render('/');
    }
    
    Teacher.findById(req.param("id"), function (err, destTeacher){
        if (err) {
            req.flash('info', 'Finding user failed');
            res.redirect('/');
        }
        else {
            Teacher.findById(req.user.id, function (err, srcTeacher){
                if (err) {
                    req.flash('info', 'Finding user failed');
                    res.redirect('/');
                } 
                else {
                    if (srcTeacher.following.indexOf(destTeacher._id) >= 0)
                    {
                        req.flash('info', 'You are already following this teacher!');
                        res.redirect('myfriends');
                    }
                    else
                    {
                        srcTeacher.following.push(destTeacher);
                        srcTeacher.save(function(err){
                                        if (err)
                                        {
                                            req.flash('info', 'Following this teacher failed!');
                                            res.redirect('myfriends');
                                        }
                                        else
                                        {
                                            destTeacher.followers.push(srcTeacher);
                                            destTeacher.save(function(err){
                                                            if (err)
                                                            {
                                                                req.flash('info', 'Following this teacher failed!');
                                                                res.redirect('myfriends');
                                                            }
                                                            else
                                                            {
                                                                console.log('Success');
                                                                req.flash('info', 'Success!');
                                                                res.redirect('myfriends');
                                                            }
                                                        });
                                        }
                                    });
                    }
                }
            });
        }
    });
});

router.get('/unfollow', function(req,res) {
    if (!req.param('id') || req.param('id') == '')
    {
        req.flash('info', 'No User Specified');
        res.render('/');
    }
    
    Teacher.findById(req.param("id"), function (err, destTeacher){
        if (err) {
            req.flash('info', 'Finding user failed');
            res.redirect('/');
        }
        else {
            Teacher.findById(req.user.id, function (err, srcTeacher){
                if (err) {
                    req.flash('info', 'Finding user failed');
                    res.redirect('/');
                } 
                else {
                    if (srcTeacher.following.indexOf(destTeacher._id) < 0)
                    {
                        req.flash('info', 'You are not following this teacher!');
                        res.redirect('myfriends');
                    }
                    else
                    {
                        var indexSrcRemoval = srcTeacher.following.indexOf(destTeacher._id);
                        srcTeacher.following.splice(indexSrcRemoval, 1);
                        srcTeacher.save(function(err){
                                        if (err)
                                        {
                                            req.flash('info', 'Removing this teacher failed!');
                                            res.redirect('myfriends');
                                        }
                                        else
                                        {
                                            var indexDestRemoval = destTeacher.following.indexOf(srcTeacher._id);
                                            destTeacher.followers.splice(indexDestRemoval, 1);
                                            destTeacher.save(function(err){
                                                            if (err)
                                                            {
                                                                console.log('Removing this teacher failed!');
                                                                req.flash('info', 'Removing this teacher failed!');
                                                                res.redirect('myfriends');
                                                            }
                                                            else
                                                            {
                                                                console.log('Success');
                                                                req.flash('info', 'Success!');
                                                                res.redirect('myfriends');
                                                            }
                                                        });
                                        }
                                    });
                    }
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
                res.redirect('userinfo?id=' + req.user._id.toHexString());
            });
        });
    }
    else
    {
        
    }
});

module.exports = router;
