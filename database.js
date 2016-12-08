var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'deswan',
  database : 'dongpin'
});

exports.db = connection;


