
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
app.get('/good_information', routes.good_information);
app.post('/join_cart',routes.join_cart);
app.get('/show_cart',routes.show_cart);
app.post('/buy',routes.buy);
app.post('/create_order',routes.create_order);
app.post('/add_address',routes.add_address);
app.get('/show_shop',routes.show_shop);
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