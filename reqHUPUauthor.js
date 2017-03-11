var cheerio = require('cheerio');
var request = require('request');
const async = require('async');
var fs = require('fs');

const UserSaveRoute=require('./route/UserInfo/UserSave');

const url={
    formUrl:'https://bbs.hupu.com/vote'
};
/**
 * 进入帖子列表,获取所有主题帖子
 * @param url
 * @param callback
 */
var topicUrlList = [];
var authorUrlList = [];
function getVote(url, callback) {
    var list = [];
    var pattern = /^\/[A-Za-z]/;
    request(url, function (err, res) {
        console.log(url);
        $ = cheerio.load(res.body.toString());
        $(".p_title a").each(function () {
            var topicLink = this.attribs.href;
            //     console.log(topicLink);
            // console.log(pattern.test(topicLink));
            if (pattern.test(topicLink) == false && topicLink != undefined) {
                var topicUrl = 'https://bbs.hupu.com' + topicLink;
                //     console.log(topicUrl);
                //     getAuthorPage(topicUrl);
                list.push(topicUrl);

            }

        });

        //下一页
        var nextPage = $(".next").attr('href');
        if (nextPage) {
            nextPage = 'https://bbs.hupu.com' + nextPage;
            getVote(nextPage, function (err, data) {
                if (err) {
                    return callback(err);
                } else {
                    callback(null, list.concat(data));
                }
            });
        } else {
            callback(null, list);
        }


    });


}


/**
 * 进入主题帖，获取每个回复作者的url
 * @param url
 * @param callback
 */
function getAuthorPage(url, callback) {

    request(url, function (err, res) {
        if (err) {
            console.log(url);
            console.log("get AUTHOR PAGE err>>" + err);
        }
        var $ = cheerio.load(res.body);
        var authorLink;
        authorLink = $('.author .left a').attr('href');
        var authorLinkPattern = /^h/;
        /*作者页面存在就执行*/
        if (authorLinkPattern.test(authorLink) == true) {
            authorLink = authorLink.replace("/topic", "");
            authorUrlList.push(authorLink);
        }
        callback(err, authorUrlList);
    });
}

/**
 * 获取作者UID  名字
 * @param url
 * @param callback
 */
function getAuthorInfo(url, callback) {
    request(url, function (err, res) {
        if (err) {
            console.log("get AUTHOR INFO >>" + err);
        }
        var $ = cheerio.load(res.body);
        //   console.log(url);
        var authorName = $('.mpersonal div').text();
        var authorID = $('#uid').val();
        console.log("AUTHOR ID>>" + authorID);
        console.log("AUTHOR NAME>>" + authorName);
        var usersave=new UserSaveRoute();
        usersave.saveAuthorInfo(authorID,authorName);
        //var authorSex=$('span [itemprop]');
        // console.log(authorSex);
        callback(err, authorName);
    });
    // callback(err,$);
}


async.series([
    function (callback) {
        console.log("step 1");
        getVote(url.formUrl, function (err, data) {
            if (err) {
                console.log("MAIN PROGRAM ERROR >>" + err);
            } else {

                topicUrlList = data;
                callback(null, topicUrlList);
            }
        });

    },
    function (callback) {
        console.log('step 2');
        async.eachSeries(topicUrlList, function (topicUrl, cb) {
            console.log("step 2:each>>" + topicUrl);
            getAuthorPage(topicUrl, function (err, data) {
                authorUrlList = data;
                console.log(authorUrlList);
                cb(err);
            });
        }, callback);
    },
    function (callback) {
        console.log("step 3");
        async.eachSeries(authorUrlList, function (authorUrl, cb) {
            getAuthorInfo(authorUrl, function (err, data) {
                console.log(data);
                cb(err);
            });

        }, callback);

    }
], function (err, result) {
//console.log(result);
});

