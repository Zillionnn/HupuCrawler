/**
 * Created by Zillion on 2017/3/11.
 */
const mongoose =require('mongoose');
const Schema=mongoose.Schema;

var UserSchema=new Schema({
    authorID:String,
    authorName:String,
    authorSex:String,
    authorLocal:String
});

module.exports=mongoose.model('UserShema',UserSchema);