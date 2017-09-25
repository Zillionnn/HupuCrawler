/**
 * Created by Zillion on 2017/3/11.
 */
var UserSchema = require('./UserSchema');
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/HupuCrawler');

function UserRoute() {
    this.sayHello = function () {
        console.log("hello user save route");
    };

    /**
     * 写入数据库操作
     * @param authorID
     * @param authorName
     * @param authorSex
     * @param authorLocal
     */
    this.saveAuthorInfo = function (authorID, authorName, authorSex, authorLocal) {
        var userSchema = new UserSchema();
        userSchema.authorLocal = authorLocal;
        userSchema.authorSex = authorSex;
        userSchema.authorName = authorName;
        userSchema.authorID = authorID;
        UserSchema.find({"authorID": authorID}, function (err, data) {
            if (err)
                console.log("CHECK SAME AUTHOR>>" + err);
            if (data.length <= 0) {
                userSchema.save(function (err) {
                    if (err)
                        return err;
                    console.log("SAVE AUTHOR INFO SUCCESS");
                });
            } else {
            //    console.log("AUTHOR EXIST");
            }
        });
    }

    this.getAllFemaleNum=function () {
      var  femaleNum=1;
 /*       UserSchema.find({"authorSex": "女"}, function (err, data) {
            femaleNum=data.length;

        });
     */

        return 33;
    }
}

module.exports = UserRoute;