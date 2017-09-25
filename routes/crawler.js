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
    console.log("GET VOTE>>");
    var list = [];
    var pattern = /^\/[A-Za-z]/;
    request(url, function (err, res) {
        console.log(url);
        try {
            $ = cheerio.load(res.body.toString());
            $(".titlelink  a").each(function () {
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
            var nextPage = $(".nextPage").attr('href');
            if (nextPage) {
                nextPage = 'https://bbs.hupu.com' + nextPage;
                console.info("NEXT PAGE>>"+nextPage);
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
            if(errorInfo){
                console.log("ERROR INFO>>" + errorInfo);    
            }
            
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
            console.log("get AUTHOR ERRRRRRRRRRRRROR >>" + err);
        }
        if(res){
            var $ = cheerio.load(res.body);
            var userRoute = new UserRoute();

            var authorName = $('.mpersonal div').text();
          var authorID = url.replace("https://my.hupu.com/","");
        //    console.log("AUTHOR ID>>" + authorID);
          //  console.log("AUTHOR NAME>>" + authorName);

            var itemprop = $('.personalinfo .f666');
            //性别
            if (itemprop[0] != undefined && itemprop[0].children[0].data == "性        别：") {
                var authorSex = itemprop[0].next.children[0].data;
            //    console.log("AUTHOR SEX>>" + authorSex);
            } else {
                authorSex = null;
            }
            //所在地
            if (itemprop[1] != undefined && itemprop[1].children[0].data == "所  在  地：") {
                var authorLocal = itemprop[1].next.children[0].data;
        //        console.log("AUTHOR LOCAL>> " + authorLocal);
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
                 //   console.log(authorUrlList);
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

/**
 * 生成区域统计图
 */
var Jiangsu,Beijing,Tianjin,Shanghai,Chongqing,Hebei,Shanxi,Liaoning,Heilongjiang,Zhejiang,Anhui,Fujian,Jiangxi,Shandong,Henan,Hubei,Hunan,Guangdong,Hainan,Sichuan,Guizhou,Yunnan,Shanxi3,Gansu,Qinghai,Taiwan,Neimenggu,Guangxi,Xizang,Ningxia,Xinjiang,Hongkong,Aomen,Jiling;
router.get('/generateLocationMap',function (req, res, callback) {

    UserSchema.find({'authorLocal':/^江苏/},function (err,callback) {
        if(err)
            console.log(err);
        Jiangsu=callback.length;
    });

    UserSchema.find({'authorLocal':/^北京/},function (err,callback) {
        if(err)
            console.log(err);
        Beijing=callback.length;
    });

    UserSchema.find({'authorLocal':/^河北/},function (err,callback) {
        if(err)
            console.log(err);
        Hebei=callback.length;
    });

    UserSchema.find({'authorLocal':/^河南/},function (err,callback) {
        if(err)
            console.log(err);
        Henan=callback.length;
    });

    UserSchema.find({'authorLocal':/^黑龙江/},function (err,callback) {
        if(err)
            console.log(err);
        Heilongjiang=callback.length;
    });

    UserSchema.find({'authorLocal':/^天津/},function (err,callback) {
        if(err)
            console.log(err);
Tianjin=callback.length;

    });

    UserSchema.find({'authorLocal':/^上海/},function (err,callback) {
        if(err)
            console.log(err);
        Shanghai=callback.length;
    });

    UserSchema.find({'authorLocal':/^重庆/},function (err,callback) {
        if(err)
            console.log(err);
        Chongqing=callback.length;
    });

    UserSchema.find({'authorLocal':/^山西/},function (err,callback) {
        if(err)
            console.log(err);
        Shanxi=callback.length;
    });

    UserSchema.find({'authorLocal':/^辽宁/},function (err,callback) {
        if(err)
            console.log(err);
        Liaoning=callback.length;
    });

    UserSchema.find({'authorLocal':/^吉林/},function (err,callback) {
        if(err)
            console.log(err);
        Jiling=callback.length;
    });

    UserSchema.find({'authorLocal':/^浙江/},function (err,callback) {
        if(err)
            console.log(err);
        Zhejiang=callback.length;
    });

    UserSchema.find({'authorLocal':/^安徽/},function (err,callback) {
        if(err)
            console.log(err);
        Anhui=callback.length;
    });

    UserSchema.find({'authorLocal':/^福建/},function (err,callback) {
        if(err)
            console.log(err);
        Fujian=callback.length;
    });

    UserSchema.find({'authorLocal':/^江西/},function (err,callback) {
        if(err)
            console.log(err);
        Jiangxi=callback.length;
    });

    UserSchema.find({'authorLocal':/^山东/},function (err,callback) {
        if(err)
            console.log(err);
        Shandong=callback.length;
    });
    
    UserSchema.find({'authorLocal':/^湖北/},function (err,callback) {
        if(err)
            console.log(err);
        Hebei=callback.length;
    });

    UserSchema.find({'authorLocal':/^湖南/},function (err,callback) {
        if(err)
            console.log(err);
        Hunan=callback.length;
    });

    UserSchema.find({'authorLocal':/^广东/},function (err,callback) {
        if(err)
            console.log(err);
        Guangdong=callback.length;
    });

    UserSchema.find({'authorLocal':/^海南/},function (err,callback) {
        if(err)
            console.log(err);
        Hainan=callback.length;
    });

    UserSchema.find({'authorLocal':/^四川/},function (err,callback) {
        if(err)
            console.log(err);
        Sichuan=callback.length;
    });

    UserSchema.find({'authorLocal':/^贵州/},function (err,callback) {
        if(err)
            console.log(err);
        Guizhou=callback.length;
    });

    UserSchema.find({'authorLocal':/^云南/},function (err,callback) {
        if(err)
            console.log(err);
        Yunnan=callback.length;
    });

    UserSchema.find({'authorLocal':/^陕西/},function (err,callback) {
        if(err)
            console.log(err);
        Shanxi3=callback.length;
    });

    UserSchema.find({'authorLocal':/^甘肃/},function (err,callback) {
        if(err)
            console.log(err);
        Gansu=callback.length;
    });
    UserSchema.find({'authorLocal':/^青海/},function (err,callback) {
        if(err)
            console.log(err);
        Qinghai=callback.length;
    });
    UserSchema.find({'authorLocal':/^台湾/},function (err,callback) {
        if(err)
            console.log(err);
        Taiwan=callback.length;
    });
    UserSchema.find({'authorLocal':/^内蒙古/},function (err,callback) {
        if(err)
            console.log(err);
        Neimenggu=callback.length;
    });
    UserSchema.find({'authorLocal':/^广西/},function (err,callback) {
        if(err)
            console.log(err);
        Guangxi=callback.length;
    });
    UserSchema.find({'authorLocal':/^西藏/},function (err,callback) {
        if(err)
            console.log(err);
        Xizang=callback.length;
    });

    UserSchema.find({'authorLocal':/^宁夏/},function (err,callback) {
        if(err)
            console.log(err);
        Ningxia=callback.length;
    });
    UserSchema.find({'authorLocal':/^新疆/},function (err,callback) {
        if(err)
            console.log(err);
        Xinjiang=callback.length;
    });
    UserSchema.find({'authorLocal':/^香港/},function (err,callback) {
        if(err)
            console.log(err);
        Hongkong=callback.length;
    });
    UserSchema.find({'authorLocal':/^澳门/},function (err,callback) {
        if(err)
            console.log(err);
        Aomen=callback.length;

    });

    res.json({
        data:[{Jiangsu:Jiangsu},{Beijing:Beijing},{Tianjin:Tianjin},
            {Shanghai:Shanghai},
            {Chongqing:Chongqing},{Hebei:Hebei},{Shanxi:Shanxi},{Liaoning:Liaoning},
            {Heilongjiang:Heilongjiang},{Zhejiang:Zhejiang},{Anhui:Anhui},
            {Fujian:Fujian},{Jiangxi:Jiangxi},{Shandong:Shandong},{Henan:Henan},
            {Hubei:Hubei},{Hunan:Hunan},{Guangdong:Guangdong},{Hainan:Hainan},
            {Sichuan:Sichuan},{Guizhou:Guizhou},{Yunnan:Yunnan},{Shanxi3:Shanxi3},
            {Gansu:Gansu},{Qinghai:Qinghai},{Taiwan:Taiwan},{Neimenggu:Neimenggu},
            {Guangxi:Guangxi},{Xizang:Xizang},{Ningxia:Ningxia},{Xinjiang:Xinjiang},
            {Hongkong:Hongkong},{Aomen:Aomen},{Jiling:Jiling}
        ]
    });
    });

module.exports = router;
