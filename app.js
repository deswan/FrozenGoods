
/**
 * Module dependencies.
 */

var express = require('express');
var app = express();
var db = require('./database').db;
var routes = require('./routes');


db.connect();
app.set('error_path','/error');
app.set('port', process.env.PORT || 3000);
var credentials = {
	cookieSecret:"1239"
}

app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('body-parser')());


app.use(express.static('public'));


app.get('/', routes.home);
app.post('/login',routes.login);
app.post('/signup', routes.signup);	//post:{name,password}

app.use('/',function (req,res) {
	return res.send("1111");
})

app.get('/good_information', routes.good_information);
app.post('/join_cart',routes.join_cart);	//加入商品到购物车行为
app.get('/show_cart',routes.show_cart);	//显示购物车页面
app.get('/buy',routes.buy);	//显示购买页面
app.post('/buy',routes.create_order);	//购买行为
app.post('/add_address',routes.add_address);	//添加地址行为
app.get('/show_shop',routes.show_shop);		//显示商店页面
app.get('/show_order',routes.show_orders);		//显示订单页面
app.get('/error',function(req,res){
	res.sendStatus(404);
})
app.use('/', function (req, res) {
  	res.sendStatus(404);
});

//app.get('/', function (req, res) {
//   	rongcloudSDK.user.getToken( '0001', 'Lance', 'http://img2.imgtn.bdimg.com/it/u=256468182,4113543132&fm=21&gp=0.jpg', function( err, resultText ) {
// 	  if( err ) {
// 	    // Handle the error
// 	  }
// 	  else {
// 	    var result = JSON.parse( resultText );
// 	    if( result.code === 200 ) {
// 	      //Handle the result.token
// 	    }
// 	  }
// 	} );
// });


app.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});