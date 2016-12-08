
var express = require('express');
var async = require('async');
var db = require('./database').db;
var rongcloudSDK = require( 'rongcloud-sdk' );

rongcloudSDK.init( 'pwe86ga5e6bn6', 'w5nTJy7NSO' );
var app = express();

exports.signup = function (req, res,next) {
	var data = req.body;	
	if(!data||!data.
		name||!data.password) return res.json({code:10});

	var Reg = /^[0-9A-Z]+$/i;	
	var code=0;
	async.waterfall([
		function(cb){	//录入数据库
			if(!Reg.test(data.name)){
				cb(2,null);	//用户名不规范
			}else if(data.name.length<3||data.name.length>15){	//3-15
				cb(3,null);	//用户名长度不符
			}else if(!Reg.test(data.password)){
				cb(4,null);	//密码不规范
			}else if(data.password.length<5||data.password.length>20){	//5-20
				cb(5,null);	//密码长度不符
			}else{
				db.query('insert into users values(null,?,?,"http://img2.imgtn.bdimg.com/it/u=256468182,4113543132&fm=21&gp=0.jpg",null)',
	  			  [data.password,data.name], function(err, result) {
	  			  	if (err&&err.code==='ER_DUP_ENTRY') {
					  	//code=1;	//用户名已存在
					  	cb(1,null)
					}else if(err){
					  	cb(err,null);
					}else{
						cb(null,result);	//返回数据项id
					}
				})
			}
		},
		function(insertResult,cb){	//向融云获取TOKEN(用户标志：数据项id&name)
			rongcloudSDK.user.getToken( insertResult.insertId,data.name,"http://img2.imgtn.bdimg.com/it/u=256468182,4113543132&fm=21&gp=0.jpg",
			    function( err, resultText ) {
				  if(err) {
				    cb(err,null)
				  }
				  else {
				    var result = JSON.parse(resultText);
				    if( result.code !== 200 ) {
				      	cb(6,null)
				    }else{
				      	cb(null,result.token,insertResult.insertId);
				    }
				  }
			});
		},
		function(mytoken,userid,cb){	//将获取到的token填入user表
			var str = db.query('update users set ? where ?',[{token:mytoken},{id:userid}],function(err,result){
				if(err){
					cb(err,null)
				}else{
					cb(null,mytoken,userid);
				}
			})
		},
		function(userid,cb){	//构造响应体
			db.query('select * from users where ? ',{id:userid},function(err,rows,field){
				if(err){
					cb(err,null);
				}
				cb(null,{code:0,
						id:rows[0].id,
						name:rows[0].name,
						password:rows[0].password,
						token:rows[0].token});
			})
		}
	],function(err,result){
		if(err){	
			if(isNaN(err)){ //非自定义error
				code=7;
			}else{
				code=err;
			}
			return res.json({code:code});
		}else{
			return res.json(result);
		}
	});
}
exports.login = function (req, res,next) {
	var data = req.body;	
	var code;
	if(!data||!data.name||!data.password) return res.json({code:10});	//用户名和密码不能为空（由前端提醒）
  	db.query('select * from users where name=? limit 1',[data.name], function(err, rows,field) {
	  if (err){
	  	code=3;
	  };
	  if(!rows.length){
	  	code=1;	//用户名不存在
	  }else if(rows[0].password!==data.password){
	  	code=2;	//密码错误
	  }else{
	  	code=0;
	  	req.session.uid=rows[0].id;
	  }
	  if(code){
	  		return res.json({code:code});
	  }else{
		    return res.json({code:code,
							uid:rows[0].id,
							name:rows[0].name,
							password:rows[0].password,
							token:rows[0].token});	//CODE==0则token有值
	  }

	});
}

//首页
//return [{gid,pid,good_name,price,sid,shop_name,hit}]
exports.home = function(req,res){
	var qStr = 'select goods.id as gid,picture_id as pid, goods.name as good_name,price,shops.id as sid,shops.name as shop_name,hit'+
		' from goods,shops where goods.shop_id=shops.id order by hit desc';
	db.query(qStr,function (err,result) {
		if(err) throw err;
		return res.json(result);
	})

}

//get{gid:}
//return {information:{gid,good_name,pid,hit,detail,price,sid,shop_name},comments:{uid,user_name,text,time【格式化？】}}
exports.good_information = function(req,res){
	var gid = req.query.gid;
	if(!isFinite(gid)) res.redirect('/error');

	async.parallel({
		information:function (cb) {
			var queryStr = 'select goods.id as gid,goods.name as good_name,price,goods.picture_id as pid,hit,detail,shops.id as sid,shops.name as shop_name'+
				' from goods,shops where ? and goods.shop_id=shops.id limit 1';
			db.query(queryStr,{"goods.id":gid}, function(err, rows) {
				if (err) throw err;
				if(!rows.length) return res.redirect('/error');
				cb(null,{gid:rows[0].gid,
					good_name:rows[0].good_name,
					pid:rows[0].pid,
					hit:rows[0].hit,
					detail:rows[0].detail,
					price:rows[0].price,
					sid:rows[0].sid,
					shop_name:rows[0].shop_name});
			});
		},
		comments:function (cb) {
			db.query('select users.id as uid,users.name as user_name,text,time from comments,users where ? AND comments.user_id=users.id',
				{"comments.good_id":gid},function (err,rows) {
					if(err) throw err;
					cb(null,rows);
				});
		}
	},function (err,result) {
		if(err) throw err;
		return res.json(result);
	})

};

//添加评论
//post:{uid,gid,text}
exports.add_comments = function (req,res) {
	var uid = req.query.uid;
	if(!isFinite(uid)) res.redirect('/error');

}

//商品加入购物车
//post{gid:,uid:,amount:}
//查看是否已有该user_id-good_id组值，有则update添加amount，没有则insert
//记得加外键约束！
//return {code:0}即成功
exports.join_cart = function (req,res) {
	var q = {gid:req.body.gid,uid:req.body.uid,amount:req.body.amount};
	for(var key in q){
		if(!isFinite(q[key])) return res.redirect('/error');
	}

	var code=-1;
	db.query('select user_id from trolley where user_id=? AND good_id=?',[q.uid,q.gid],function (err,result) {
		if(err){
			throw err;
		}
		if(result.length){
			db.query('update trolley set amount=amount+ ? where user_id=? and good_id=?',[q.amount,q.uid,q.gid],function (err,result) {
				if(err) {
					throw err;
				};
				if(result.affectedRows){
					return res.json({code:0});
				}
				return res.redirect('/error');
			})
		}else{
			db.query('insert into trolley set ?',{good_id:q.gid,user_id:q.uid,amount:q.amount},function (err,result) {
				if(err) {
					throw err;
				};
				if(result.affectedRows){
					return res.json({code:0});
				}
				return res.redirect('/error');
			})
		}
	})
}
//显示购物车
//get:{uid:}
//return {price,list:[{gid,good_name,pid,mono_price,shop_name,amount,sum_price}]}
exports.show_cart = function (req,res) {
	var uid = req.query.uid;
	if (!isFinite(uid)) res.redirect('/error');
	var queryStr = 'select goods.id as gid,goods.name as good_name,goods.picture_id as pid,goods.price as mono_price,shops.name as shop_name,amount,amount*goods.price as sum_price ' +
		'from trolley,goods,shops where trolley.user_id= ? AND trolley.good_id=goods.id AND goods.shop_id=shops.id';
	db.query(queryStr, [uid], function (err, result) {
		if (err) throw err;
		var total_price = 0;
		for (var i = 0; i < result.length; i++) {
			total_price += result[i].sum_price;
		}
		return res.json({price: total_price, list: result});
	})
}

//购买页面

//在商品页面点击购买则{cart:0,uid:,gid,amount}
//在购物车点击购买则{cart:1,uid:}
//cart参数应该由安卓传
//post
//此页面中可以编辑地址
//return {address:{aid,name,phone,addr_inform},good:{price,list:{gid,good_name,pid,mono_price,shop_name,amount,sum_price}}}
exports.buy= function (req,res) {
	var ifCart=req.body.cart;
	if(ifCart==null) {return res.redirect('/error')}
	else if(ifCart==0){	//非购物车
		var q={gid: req.body.gid, uid: req.body.uid, amount: req.body.amount};
	}else {
		var q = {uid:req.body.uid};
	}
	for(var key in q){
		if(!isFinite(q[key])) return res.redirect('/error');
	}

	async.parallel({
		address:function (cb) {	//获取第一个地址
			var queryStr = 'select address.id as aid,address.name as name,phone,address.address as addr_inform from users,address '+
				'where users.id=? AND users.id=address.user_id limit 1';
			db.query(queryStr,[q.uid],function (err,result) {
				if(err) cb(err,null);
				if(!result) return res.redirect('/error');

				cb(null,{aid:result[0].aid,name:result[0].name,phone:result[0].phone,address:result[0].addr_inform})
			})
		},
		good:function (cb) {
			if(ifCart==0){
				//查询商品详情:处理商品数量以及计算价格
				var queryStr = 'select goods.id as gid,goods.name as good_name,goods.picture_id as pid,goods.price as mono_price,shops.name as shop_name ' +
					'from goods,shops where goods.id= ? AND goods.shop_id=shops.id';
				db.query(queryStr, [q.gid], function (err, result) {
					if (err) cb(err,null);
					if(!result) return res.redirect('/error');
					var total_price;
					result[0].amount=q.amount;
					result[0].sum_price = q.amount*result[0].mono_price;
					total_price = result[0].sum_price;
					cb(null,{price: total_price, list: result});
				})
			}else{
				//与show_cart内容一致
				var queryStr = 'select goods.id as gid,goods.name as good_name,goods.picture_id as pid,goods.price as mono_price,shops.name as shop_name,amount,amount*goods.price as sum_price ' +
					'from trolley,goods,shops where trolley.user_id= ? AND trolley.good_id=goods.id AND goods.shop_id=shops.id';
				db.query(queryStr, [q.uid], function (err, result) {
					if (err) cb(err,null)
					var total_price = 0;
					for (var i = 0; i < result.length; i++) {
						total_price += result[i].sum_price;
					}
					cb(null,{price: total_price, list: result});
				})
			}

		}
	},function (err,result) {
		if(err) throw err;
		return res.json(result);
	})
};

//post确认订单，响应支付页面
//{cart:0,uid,gid,amount,aid,note}
//{cart:1,uid,aid,note}
//return {oid:}
exports.create_order = function (req,res) {
	var ifCart=req.body.cart;
	if(ifCart==null) {return res.redirect('/error')}
	else if(ifCart==0){	//请求体传来的是string类型而不是int，因此不能用===来判断
		var q={gid: req.body.gid, uid: req.body.uid, amount: req.body.amount,aid:req.body.aid,note:req.body.note};
	}else {
		var q = {uid: req.body.uid,aid:req.body.aid,note:req.body.note};
	}
	for(var key in q){
		if(!isFinite(q[key])){
			if(!key=='note') return res.redirect('/error');
		}
	}

	//插入新order
	db.query('insert into orders set ?',{user_id:q.uid,time:new Date(),note:q.note,address_id:q.aid,type:0},function (err,result) {
		if(err) throw err;
		var oid = result.insertId;
		//更新连接表
		if(ifCart==0){
			db.query('insert into orders_goods set ?',{order_id:result.insertId,good_id:q.gid,amount:q.amount},function (err,result) {
				if(err) throw err;
				return res.json({oid:oid});
			})
		}else{
			db.query('select good_id as gid,amount from trolley where user_id=?',[q.uid],function (err,result) {
				if(err) throw err;
				var qStr = 'insert into orders_goods values ';
				for(var i=0;i<result.length;i++){
					if(i===result.length-1){
						qStr+='('+oid+','+result[i].gid+','+result[i].amount+')';
					}else {
						qStr += '(' + oid + ',' + result[i].gid + ',' + result[i].amount + ')' + ',';
					}
				}

				db.query(qStr,[q.uid],function (err,r) {
					if(err) throw err;
					return res.json({oid:oid});
				})
			})
		}
	})
};

//添加地址
//post:{uid,name,phone,address}（三项来自用户输入）
//return {aid:}
exports.add_address = function (req,res) {
	var q={uid: req.body.uid, name: req.body.name, phone: req.body.phone,address:req.body.address};
	if(!isFinite(q.uid)) return res.redirect('/error');
	for(var key in q){
		if(!q[key]) return res.json({code:1});
	}
	db.query('insert into address set ?',{user_id:q.uid,name:q.name,phone:q.phone,address:q.address},function (err,result) {
		if(err) throw err;
		return res.json({aid:result.insertId});
	})
}

//显示商店详情
// get {sid}
//return [{gid,pid,good_name,price,sid,shop_name,hit}]
exports.show_shop = function (req,res) {
	var sid = req.query.sid;
	if(!isFinite(sid)) return res.redirect('/error');

	var qStr = 'select goods.id as gid,picture_id as pid, goods.name as good_name,price,shops.id as sid,shops.name as shop_name,hit '+
		' from goods,shops where ? AND goods.shop_id=shops.id order by hit desc';
	db.query(qStr,{"shops.id":sid},function (err,result) {
		if(err) throw err;
		return res.json(result);
	})
}

//显示订单页面
//get {uid,type}
//return
exports.show_orders = function (req,res) {
	var q ={uid:req.query.uid,type:req.query.type};
	for(var key in q){
		if(!q[key]) return res.redirect('/error');
	}

}





