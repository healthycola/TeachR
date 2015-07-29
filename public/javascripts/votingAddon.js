var myApp =  angular.module('ViewAllLessonPlans', ['ngRoute']); 
        myApp.controller('myAppController',['$scope', '$http', function ($scope, $http, myAppService) {
            $scope.lessons = data;
            $scope.votes = {}
            for (var i = 0; i < data.length; ++i) {
                $scope.votes[data[i]._id] = data[i].number_of_votes; 
            }
            
            $scope.upvote = function(lessonID) {
                $http.get('/upvote?id='+lessonID).then(function(result) { 
                    if (result.data.upvote)
                    {
                        $scope.votes[lessonID]++;
                    } 
                });
            };
            
            $scope.downvote = function(lessonID) {
                $http.get('/downvote?id='+lessonID).then(function(result) { 
                    if (result.data.downvote)
                    {
                        $scope.votes[lessonID]--;
                    } 
                });
            };
        }]);