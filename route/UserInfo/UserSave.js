/**
 * Created by Zillion on 2017/3/11.
 */
var UserSchema=require('./UserSchema');
var mongoose=require('mongoose');

mongoose.connect('mongodb://localhost:27017/HupuCrawler');

function UserSaveRoute() {
    this.sayHello=function () {
        console.log("hello user save route");
    };
    
    this.saveAuthorInfo=function (authorID, authorName) {
        var userSchema=new UserSchema();
        userSchema.authorID=authorID;
        userSchema.authorName=authorName;
        userSchema.save(function (err) {
            if(err)
                return err;
            console.log("SAVE AUTHOR INFO SUCCESS");
        });
    }
}

module.exports=UserSaveRoute;