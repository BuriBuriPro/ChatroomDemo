// 服务器文件

// 加载各个模块
var express = require('express'),
	path = require('path'),
	socket = require('socket.io'),
	favicon = require('serve-favicon'),
	bodyParser = require('body-parser'),
	hbs = require('hbs');
	// hbs = require('hbs')
	// routes = require('./routes/index.js');
// 创建服务器
var app = express();
// 设置模板目录以及模板引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.engine('html', hbs.__express);

// 配置解析get/post数据
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));//?
// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));
// 设置路由
app.use(favicon(path.join(__dirname, 'public/images/favicon.ico')));
app.get('/', function(req, res){
	res.sendFile(path.join(__dirname, 'views/entrance.html'));
});
app.post('/theHall', function(req, res){
	console.log(req.body);	
	// res.json();
	res.end();
});
app.get('/test/:num', function(req, res){
	var num = req.params.num;
	res.render('test', {
		num: num,
	});
});
// 设置端口
var port = process.env.port || 3000;
app.listen(port);
console.log('Server is running on ' + port);