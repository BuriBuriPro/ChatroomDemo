// 服务器文件
// 加载各个模块
var http = require('http'),
	path = require('path'),
	fs = require('fs'),
	favicon = require('serve-favicon'),
	session = require('express-session'),
	bodyParser = require('body-parser'),
	cookieParser = require('cookie-parser'),
	express = require('express'),
	hbs = require('hbs'),
	socketio = require('socket.io'),
	mongoose = require('mongoose'); 

// 数据库模块
global.dbHandler = require('./database/dbHandler.js');
global.db = mongoose.connect('mongodb://127.0.0.1/chatroom');
var Rooms = global.dbHandler.getModel('rooms'),
	Users = global.dbHandler.getModel('users');
// 创建服务器
var app = express(),
	// 建立Http实例
	server = http.Server(app),
	// socketio监听http实例
	io = socketio(server);
// 设置模板目录以及模板引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', hbs.__express);
// 配置解析get/post数据
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// 配置解析cookie
app.use(cookieParser());
// 创建session memorystore的实例，并设置为session的数据存储库	
var storeMemory = new session.MemoryStore();
app.use(session({
	secret: 'secret',
	name: 'sid',
	secure: true,
	resave: false,
	saveUninitialized: false,
	store: storeMemory
}));
// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));
// 设置路由
app.use(favicon(path.join(__dirname, 'public/images/favicon.ico')));
// 首页入口处理
app.get('/', function(req, res, next){
	// 判断是否已经登陆过，否则渲染页面
	if(!req.session.username){
		res.render('entrance');
	} else{
		// 判断是否已经进入房间，是则跳转至房间，否则跳转至大厅
		if(req.session.roomID){
			res.redirect('/chatroom/' + req.session.roomID);
		} else{
			res.redirect('/theHall');
		}
	}
});
// 创建变量存储用户数量
var userCount = 0;
// post请求处理登录用户数据存储
app.post('/userData', function(req, res){
	// 先在session中存储用户名，sessionID
	req.session.username = req.body.username;
	req.session.sessionID = req.sessionID;
	// 先判断当前用户是否已存在于库中
	Users.find({userName: req.body.username}, function (err, users){
		if(err) console.log(err);
		var user = users[0];
		if(!user){
			// 数据库存储包含当前用户名用户名，sessionID和status的文档
			var data = {
				userName: req.body.username,
				userPassword: req.body.password,
				userSession: req.session.sessionID,
				userStatus: 'logged',
				userOnline: true},
				user = new Users(data);
			user.save(function(err){
				if(err){
					// 存储失败 判断为有重复用户名或者密码错误
					res.json('fail');
				} else{
					// 存储成功
					res.json('success');
				}
				res.end();
			});
		} else{
			// 判断用户是否已经在线
			if(user.userOnline){
				res.json('fail');
				res.end();
			} else{
				if(req.body.password != user.userPassword){
					res.json('fail');
					res.end();
				} else{
					// 重新进入，更新sessionID
					Users.update({userName: req.body.username}, {
						userSession: req.session.sessionID,
						userOnline: true
					}, function (err){
						res.json('success');
						res.end();
					});
				}	
			}			
		}
	});
});
// 大厅页面处理
// get请求处理大厅页面渲染
app.get('/theHall', function(req, res){
	Users.find({userName: req.session.username}, function (err, users){
		if(err){
			console.log("登录时，查找用户出错");	
			res.redirect('/');
		} else{
			if(!users){
				res.redirect('/');
			} else{
				var user = users[0];
				// 首次登陆和在大厅状态时，允许渲染大厅页面
				// 判断用户是否已经进入房间，是的话跳转到那个房间
				if(user.userStatus != 'inRoom'){
					if(user.userStatus === 'logged'){
						// 更新用户数据库中的status					
						Users.update({userName: req.session.username}, {
							userStatus: 'inHall'
						}, function (err){
							if(err) console.log(err);
						});
					}	
						res.render('theHall', {
							username: user.userName,
							avatar : user.userAvatar
						});
				} else if(user.userStatus === 'inRoom'){
					req.session.roomID = user.userRoomID;
					res.redirect('/chatroom/' + req.session.roomID);
				}
			}
		}
	});
});
// // 聊天室
// // 进入房间的路由处理
app.get('/chatroom/:roomID', function (req, res){
	// 判断是否已登录状态和是否已经进入房间未退出
	if(req.session.username){		
		// var username = req.session.username;
		var	roomID = req.params.roomID;
		// 先判断房间是否满人
		/*Rooms.findById(roomID, function (err, room){
			if(err) console.log(err);
			else{
				if(room.roomMax === room.roomMembers.length){
					res.redirect('/theHall');
				} else{*/
					// 用数据库中的用户状态来判断
					Users.find({userName: req.session.username}, function (err, users){
						var user = users[0];
						if(user.userStatus === 'inHall'){
							// 把房间id存入session
							req.session.roomID = roomID;
							// 在数据库中查找到该房间并插入新成员userName
							Rooms.findByIdAndUpdate(roomID, {
								$push:{roomMembers: req.session.username}
							}, function(err, room){		
								fs.readFile(room.roomLog, 'utf8', 'r', function(err, roomLogData){
									res.render('chatroom', {
										username: req.session.username,
										roomName: room.roomName,
										roomLogData: roomLogData,
										avatar : user.userAvatar,
										max: room.roomMax
									});						
								});	
							});	
							Users.update({userName: req.session.username}, {userOnline: true}, function (err){
								if(err) console.log(err);
							});
						} else if(user.userStatus === 'inRoom'){
							if(req.session.roomID === roomID){
								// 如果已经进入过当前房间，则认为是刷新页面
								Rooms.findById(roomID, function(err, room){
									fs.readFile(room.roomLog, 'utf8', 'r', function(err, roomLogData){
										res.render('chatroom', {
											username: req.session.username,
											roomName: room.roomName,
											roomLogData: roomLogData,
											avatar : user.userAvatar,
											max: room.roomMax	
										});						
									});					
								});
								Users.update({userName: req.session.username}, {userOnline: true}, function (err){
									if(err) console.log(err);
								});
							} else if(req.session.roomID != roomID){
								// 如果已经进入过其它房间
								res.redirect('/chatroom/' + req.session.roomID);
							}	
						}
					});
				/*}
			}
		});*/
	} else {
		res.redirect('/');
	}
});
io.use(function (socket, next){
	// parseCookie解析socket.request.headers.cookie并赋值给执行socket.request.cookies
	cookieParser('secret')(socket.request, {}, function(err){
		if(err){
			console.log("error of parsing cookie and geting session");
		}
		var sid = socket.request.signedCookies['sid'];
		if(sid){
			storeMemory.get(sid, function(err, session){
				socket.handshake.session = session;				
				next();
			});
		}		
	});
});
io.on('connection', function (socket){
	// 增加用户数量
	userCount ++;
	io.emit('userNumberChange_Server', userCount);
	// 先获取当前连接socket的session
	var session = socket.handshake.session,
		username = session.username,
		sessionID = session.sessionID;
	// 更新用户的socketID信息
	Users.update({userName: username}, {userSocket: socket.id, userOnline: true}, function (err){
		if(err) console.log('更新用户的socketID信息出错');
	});
	// 接收到进入大厅的事件
	socket.on('enterHall_Client', function (){
		// 使该socket加入大厅的namespace
		socket.join('Hall');		
		// 欢迎用户进入
		io.to(socket.id).emit('enterHall_Server');
	});	
	// 登出处理
	socket.on('logout_Client', function (){
		// 在数据库中根据socketid查找到该用户并删除信息
		Users.findOne({userSocket: socket.id}, function (err, user){
			if(err){
				console.log('error of loggingout');
			} else{
				// 删除用户的session数据
				storeMemory.destroy(user.userSession, function (err){
					// 不删除用户，而是修改用户为下线
					Users.update({userSocket: socket.id}, {userOnline: false}, function (err){						
						// 告知删除互动完成
						io.to(socket.id).emit('logout_Server');
					});
				});
			}
		});
	});
	// 加载房间列表数据
	socket.on('showRoomList_Client', function (){
		Rooms.find(function (err, rooms){
			io.to(socket.id).emit('showRoomList_Server', rooms);
		});
	});
	// 创建房间
	socket.on('createRoom_Client', function (roomData){
		// 增添服务器中存储的房间数据数组
		var roomName = roomData.roomName,
			roomHost = socket.handshake.session.username,
			roomMax = roomData.roomMax,
			newRoom = new Rooms({
				roomName: roomName,
				roomHost: roomHost,
				roomMax: roomMax,
				roomMembers: []
		});	
		newRoom.save(function(err){
			if(err){
				console.log("err of saving new room");
				io.to(socket.id).emit('createRoom_Server', {sign: 'fail'});				
			} else{
				roomID = newRoom._id;
				// 创建房间的聊天记录文档
				var roomLogsUrl = './public/roomLogs/' + roomID + '.txt';
				fs.appendFile(roomLogsUrl, '', function(err){
					if(err){
						console.log("error of creating log");
						io.to(socket.id).emit('createRoom_Server', {sign: 'fail'});
					}
				});
				// 把文档路径添加到数据库中
				newRoom.update({roomLog: roomLogsUrl}, function(err){					
					// 通知创建房间的人跳转
					io.to(socket.id).emit('createRoom_Server', {roomID: roomID});
					Rooms.find(function (err, rooms){
						// 向大厅内所有用户更新列表数据
						io.in('Hall').emit('showRoomList_Server', rooms);						
					});					
				});
			}
		});	
	});
	// 改变头像
	socket.on('changeAvatar_Client', function (avatar){
		// 解析接收到的base64图片编码
		var bitmap = new Buffer(avatar, 'base64');
		// 获取session来获取用户名作为用户的头像文件名字
		var session = socket.handshake.session,
			username = session.username,
			// 文件路径
			file = './public/avatars/' + username + '.jpg';
		fs.writeFile(file, bitmap, function (err){
			if(err) console.log(err);
			else{
				var route = '../avatars/' + username + '.jpg';
				// 修改数据库中头像存储
				Users.update({userName: username}, {userAvatar: route}, function(err){
					if(err) console.log(err);
					else{
						io.to(socket.id).emit('changeAvatar_Server', route);
					}
				});
			}
		});
	});
	// 从大厅进入房间
	socket.on('enterRoom_Client', function (roomID){
		Rooms.findById(roomID, function (err, room){
			if(err){
				console.log('error of finding room');
			} else{
				if(room.roomMax === room.roomMembers.length){
					// 房间人已满
					io.to(socket.id).emit('enterRoom_Server', 'full');
				} else{
					// 房间允许进入
					io.to(socket.id).emit('enterRoom_Server', roomID);
				}
			}
		});
	});	
	// 房间部分
	// 进入房间后
	socket.on('joinRoom_Client', function (){
		var session = socket.handshake.session;
		// 加入房间的Namespace
		socket.join(session.roomID);
		// 有必要在这重新判断是否进入了相同的房间 其实只要判断userStatus就可以了
		Rooms.findById(session.roomID, function (err, room){
			// 进入房间的用户加载房间成员列表，读取房间聊天记录
			io.to(socket.id).emit('loadMembers_Server', room.roomMembers);
			// 添加聊天记录
			// 注意要用_id
			Users.find({userName: session.username}, function (err, users){
				var user = users[0];
				if(user.userStatus != 'inRoom'){
					// 连接后才更新用户的状态
					Users.update({userName: session.username}, {
						userStatus: 'inRoom',
						userRoomID: session.roomID,
						userOnline: true
					}, function (err){
						if(err){
							console.log(err);
						}
					});
					var msg = '<p>' + session.username + '进入了房间</p>'; 
					// 更新用户的状态
			  		fs.appendFile(room.roomLog, msg, function(){
						// 通知房间中的所有用户有新成员加入
						io.in(session.roomID).emit('memberJoining_Server', session.username);
						io.in(session.roomID).emit('memberNumberChange_Server', room.roomMembers.length);
		  			});	
				}
			});
		});
		// 通知大厅的用户更新房间列表，主要是人数
		Rooms.find(function (err, rooms){
			io.in('Hall').emit('showRoomList_Server', rooms);
		});
	});
	// 用户离开房间
	socket.on('leaveRoom_Client', function (){
		var session = socket.handshake.session;
		// 移除房间中的成员
		Rooms.findByIdAndUpdate(session.roomID, {
			$pull: {roomMembers: session.username}
		}, function(err, room){
			if(err){
				console.log('移除房间成员时出错');
			} else{
				// 更新用户自身的数据
				Users.update({userName: username}, {
					userStatus: 'inHall',
					userRoomID: ''
				}, function (err){			
					io.to(socket.id).emit('leaveRoom_Server');
					io.in(session.roomID).emit('memberNumberChange_Server', room.roomMembers.length);		
				});
			}
		});	
		// 判断房间是否还有人
		Rooms.findById(session.roomID, function(err, room){
			if(room.roomMembers.length === 0){
				// 删除房间聊天记录文件
				fs.unlink(room.roomLog, function(errr){
					if(err){
						console.log('删除聊天记录时出错');
					}
				});
				// 删除房间数据库记录
				Rooms.remove({_id: session.roomID}, function(err){
					if(err){
						console.log('删除数据库中房间的数据出错');
					}
				});								
				// 告知大厅用户刷新房间列表
				Rooms.find(function (err, rooms){
					io.in('Hall').emit('showRoomList_Server', rooms);
				});
			} else{
				Rooms.findById(session.roomID, function(err, room){
			  		if(err){
			  			console.log('error of sending join msg');
			  		} else{			  			
				  		var msg = '<p>' + session.username + '离开了房间</p>'; 
				  		fs.appendFile(room.roomLog, msg, function(){
				  			io.in(session.roomID).emit('memberLeaving_Server', session.username);
		  				});
		  				// 如果是房主离开，更换房主
		  				if(room.roomHost === session.username){
		  					Rooms.update({_id: session.roomID}, {
		  						roomHost: room.roomMembers[0]
		  					}, function (err){
		  						if(err){
		  							console.log('更换房主出错');
		  						} else{
		  							// 告知房间用户更换房主
		  							io.in(session.roomID).emit('changeHost_Server');
		  						}
		  					});
		  				}
						Rooms.find(function (err, rooms){
							io.in('Hall').emit('showRoomList_Server', rooms);
						});
				  	}				  	
	  			});	
			}
		});
	});
	// 发送消息部分
	socket.on('sendMsg_Client', function (msgData){	
		var session = this.handshake.session;
		// 判断消息模式是私聊还是公聊
		if(msgData.mode === "public"){
			Rooms.findById(session.roomID, function (err, room){
				Users.findOne({userName: session.username}, function (err, user){				
					fs.appendFile(room.roomLog, 
						"<div class='msg public'>" + 
						 "<div class='sender'>" + 
						 "<img src='" + user.userAvatar + "' alt='' class='avatar'>" +
						 "<b>"+ user.userName + "</b>" + 
						 "</div>" + 
						 "<p>" + msgData.msg + "</p>" +
						 "</div>");
					io.to(session.roomID).emit('sendMsg_Server', {
						username: user.userName,
						avatar: user.userAvatar,
						msg: msgData.msg,
						mode: 'public'
					});
				});
			});	
		} else if(msgData.mode === "private"){
			Users.find({userName: session.username}, function (err, users){
				var user = users[0];
				// 找出私聊对象
				Users.find({userName: msgData.target}, function (err, recievers){
					var reciever = recievers[0];
					// 向接受者发送
					io.to(reciever.userSocket).emit('sendMsg_Server', {
						username: user.userName,
						avatar: user.userAvatar,
						msg: msgData.msg,
						mode: 'private'
					});
					// 向自己发送
					io.to(user.userSocket).emit('sendMsg_Server', {
						username: user.userName,
						avatar: user.userAvatar,
						msg: msgData.msg,
						mode: 'private'
					});
				});
			});
		}	
	});
	// 发送图片
	socket.on('sendImg_Client', function (imgBase64){
		var session = this.handshake.session;
		Rooms.findById(session.roomID, function (err, room){
			Users.find({userName: session.username}, function (err, users){
				if(err) console.log(err);
				else{
					var user = users[0];
					fs.appendFile(room.roomLog, 
						"<div class='msg'>" + 
						 "<div class='sender'>" + 
						 "<img src='" + user.userAvatar + "' alt='' class='avatar'>" +
						 "<b>"+ user.userName + "</b>" + 
						 "</div>" + 
						 "<img class='msgImg' src='" +
						 imgBase64 + "' />" + 
						 "</div>");
					io.to(session.roomID).emit('sendImg_Server', {
						username: user.userName,
						avatar: user.userAvatar,
						imgBase64: imgBase64
					});
				}
			});
		});
	});
	// 邀请用户
	socket.on('invite_Client', function (username){
		var session = socket.handshake.session;
		// 先判断房间是否满人
		Rooms.findById(session.roomID, function (err, room){
			if(room.roomMembers.length === room.roomMax){
				io.to(socket.id).emit('invite_Server', {sign: 'fail', detail: 'full room'});
			} else{
				Users.find({userName: username}, function (err, users){
					// 判断是否存在用户
					if(!users[0]){
						io.to(socket.id).emit('invite_Server', {sign: 'fail', detail: 'not exist'});
					} else{
						var user = users[0];
						// 判断用户是否在线
						if(!user.userOnline){
							io.to(socket.id).emit('invite_Server', {sign: 'fail', detail: 'user offline'});
						} else{
							// 判断用户是否在大厅
							if(user.userStatus != 'inHall'){
								io.to(socket.id).emit('invite_Server', {sign: 'fail', detail: 'user busy'});
							} else{
								// 符合条件，让发起邀请的用户等待
								io.to(socket.id).emit('invite_Server', {sign: 'success', detail: 'wait'});
								// 询问受邀用户是否接收请求
								io.to(user.userSocket).emit('getInvited_Server', {
									username: session.username, 
									roomID: session.roomID,
									roomName: room.roomName});
							}
						}
					}
				});
			}
		});
	});
	socket.on('getInvited_Client', function (res){
		// 
	});
	// 断线状态
	socket.on('disconnect', function (){
		// 要根据socket.id来从数据库找到用户，修改在线状态
		Users.update({userSocket: socket.id}, {userOnline: false}, function(err, users){
			if(err) console.log(err);
		});
		// 改变用户数量并告知大厅用户
		userCount --;
		io.in('Hall').emit('userNumberChange_Server', userCount);
	});
});
// 设置端口
var port = process.env.port || 3000;
server.listen(port);
console.log('Server is running on ' + port);