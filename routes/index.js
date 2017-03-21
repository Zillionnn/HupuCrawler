var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/testApi',function (req, res, callback) {
  console.log('ok');
});

module.exports = router;
