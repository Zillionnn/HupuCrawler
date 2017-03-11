var mongoose=require('mongoose');
function connectDB() {
    this.connect=function () {
      mongoose.connect('mongodb://localhost:/CrawlerZhihu');  
    }    
}


module.exports=connectDB();