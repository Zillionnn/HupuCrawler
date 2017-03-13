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
    
    this.saveAuthorInfo=function (authorID, authorName,authorSex,authorLocal) {
        var userSchema=new UserSchema();
        userSchema.authorLocal=authorLocal;
        userSchema.authorSex=authorSex;
        userSchema.authorName=authorName;
        userSchema.authorID=authorID;


        userSchema.save(function (err) {
            if(err)
                return err;
            console.log("SAVE AUTHOR INFO SUCCESS");
        });
    }
}

module.exports=UserSaveRoute;