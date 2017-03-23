/**
 * Created by Zillion on 2017/3/20.
 */
var express = require('express');
var router = express.Router();
var cheerio = require('cheerio');
var request = require('request');
const async = require('async');
var fs = require('fs');
var UserSchema=require('../route/UserInfo/UserSchema');

const UserRoute = require('../route/UserInfo/UserRoute');

const url = {
    formUrl: 'https://bbs.hupu.com/vote'
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
        try {
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

        } catch (e) {
            console.log("ERROR>" + e);
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
        if(res){
            var $ = cheerio.load(res.body);
            var errorInfo = $('#search_main .t_tips h4').text();
            console.log("ERROR INFO>>" + errorInfo);
            if (!errorInfo) {
                var authorLink;
                authorLink = $('.author .left a').attr('href');
                var authorLinkPattern = /^h/;
                /*作者页面存在就执行*/
                if (authorLinkPattern.test(authorLink) == true) {
                    authorLink = authorLink.replace("/topic", "");
                    //    authorUrlList.push(authorLink);
                    //每一条url 执行写入数据库
                    getAuthorInfo(authorLink, function (err, data) {
                        callback(err, data);
                    })
                }
            }else{
                callback(err,1);
            }
        }

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
        if(res){
            var $ = cheerio.load(res.body);
            var userRoute = new UserRoute();

            var authorName = $('.mpersonal div').text();
            var authorID = $('#uid').val();
            console.log("AUTHOR ID>>" + authorID);
            console.log("AUTHOR NAME>>" + authorName);

            var itemprop = $('.personalinfo .f666');
            //性别
            if (itemprop[0] != undefined && itemprop[0].children[0].data == "性        别：") {
                var authorSex = itemprop[0].next.children[0].data;
                console.log("AUTHOR SEX>>" + authorSex);
            } else {
                authorSex = null;
            }
            //所在地
            if (itemprop[1] != undefined && itemprop[1].children[0].data == "所  在  地：") {
                var authorLocal = itemprop[1].next.children[0].data;
                console.log("AUTHOR LOCAL>> " + authorLocal);
            } else {
                authorLocal = null;
            }
            userRoute.saveAuthorInfo(authorID, authorName, authorSex, authorLocal);
            callback(err, authorName);
        }

    });
    // callback(err,$);
}



/**
 * MAIN
 * 输入地址  开始爬取
 */
router.post('/getInfo',function (req, res, callback) {
    console.log('START CRAWLER INFO>>>> ');
    var reqUrl=req.body.url;
    console.log(reqUrl);
    async.series([
        function (callback) {
            console.log("step 1");
            getVote(reqUrl, function (err, data) {
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
        }
        /*function (callback) {
         console.log("step 3");
         async.eachSeries(authorUrlList, function (authorUrl, cb) {
         getAuthorInfo(authorUrl, function (err, data) {
         console.log(data);
         cb(err);
         });

         }, callback);

         }*/
    ], function (err, result) {
        //console.log(result);
    });
});

/**
 * 生成性别比例统计图
 */
router.get('/generatemap',function (req, res, callback) {
    var userRoute=new UserRoute();
    var allUserNum,femaleNum,maleNum;
    UserSchema.find({'authorSex':'女'},function (err,data) {
        if(err)
            console.log("GENERATE MAP ERROR>>"+err);
        console.log(data.length);
        femaleNum=data.length;
    });
    UserSchema.find({"authorSex":'男'},function (err, data) {
        maleNum=data.length;
        console.log(maleNum);
    });
    UserSchema.find({},function (err, data) {
        if(err)
            console.log(err);
        allUserNum=data.length;
        console.log(allUserNum);
        res.json({
            data:
                [{male:maleNum},
                    {female:femaleNum},
                    {nullsex:allUserNum-maleNum-femaleNum}]
        });
    });

});
module.exports = router;
