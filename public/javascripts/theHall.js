$(document).ready(function() {
	// 与服务器建立websocket连接
	var socket = io('/');
	// 用户触发加入大厅事件
	socket.emit("enterHall_Client");
	// 进入大厅
	socket.on("enterHall_Server", function (){
		// 欢迎提示
		$("#tip").fadeIn();
		setTimeout(function(){
			$("#tip").fadeOut();		
		}, 1000);
		// 进入大厅时加载一次房间列表
		socket.emit("showRoomList_Client");		
	});
	// 当有人进入大厅时改变房大厅人数
	socket.on("userNumberChange_Server", function (userCount){
		$("#status a").html(userCount + "位用户在线");
	});
	// 顶栏按钮
	// 登出
	$("#header p b").click(function(event) {
		// 发出登出事件
		socket.emit('logout_Client');
		$("#tip").html("正在登出").fadeIn();
	});
	// 服务器返回登出处理
	socket.on('logout_Server', function (){
		window.location.href = '/';			
	});
	// 加载房间数据	
	socket.on("showRoomList_Server", function (rooms){
		$("#roomList ul").remove();
		for(var i = 0; i < rooms.length; i ++){
			$("#roomList").append(
					"<ul>" + 
					"<li><a roomID='" + rooms[i]._id + "'>" +							
					rooms[i].roomName + "</a></li>" +
					"<li>" + rooms[i].roomHost + "</li>" +
					"<li>" + rooms[i].roomMembers.length + '/' + 
					rooms[i].roomMax + "</li>" +
					"</ul>"
				);
		}
	});
	// 绑定房间点击事件
	$("#roomList").delegate("a", "click", function (){
		var roomID = $(this).attr("roomID");
		socket.emit("enterRoom_Client", roomID);
	});
	// 进入房间前判断是否满人部分
	socket.on("enterRoom_Server", function (sign){
		if(sign === "full"){
			$("#tip").html("房间已经满人").fadeIn(400, function(){
				setTimeout(function(){
					$("#tip").fadeOut();
				}, 1000);
			});
		} else{
			window.location.href = "/chatroom/" + sign;
		}
	});
	// 创建房间部分
	$("#createBtn").click(function (){
		$("#createInfo").fadeIn();
		$("#mask").fadeIn();
	});
	// 取消创建时清空信息
	$("#createInfo #cancel").click(function (){
		$("#createInfo").fadeOut();
		$("#createInfo input").val("");
		$("#mask").fadeOut();
	});
	// 确认创建时向服务器发送创建的信息
	$("#createInfo #confirm").click(function (){
		var inputName = $("#createInfo #inputName").val();
		var inputNumber = $("#createInfo #inputNumber").val();
		if(!inputName || inputName == "" || !inputNumber || inputNumber == ""){	
			return false;
		} else{
			$("#tip").html("请稍等").fadeIn();
			// 通过websocket传送新建房间的数据
			socket.emit("createRoom_Client", {
				roomName: inputName,
				roomMax: inputNumber
			});
		}
	});
	// 向房间发出
	socket.on("createRoom_Server", function (data){
		if(data.sign === "fail"){
			$("#tip").html("创建房间失败").fadeIn(400, function(){
				setTimeout(function(){
					$("#tip").fadeOut();
				}, 3000);
			});
		} else{
			$("#createInfo").fadeOut(400, function (){
				$("#tip").html("已成功创建房间").fadeIn(400, function(){
					$(this).fadeOut();					
					// 创建完成后跳转到新建的房间
					window.location.href = "/chatroom/" + data.roomID;					
				});
			});	
		}
	});
	// 部分操作提示，鼠标移动到时启用提示
	// 移动到设置按钮
	$("#setting").hover(function (){
		$("#tip").html("点击该图标可以进行一些设置").fadeIn();
	});
	$("#setting").mouseleave(function (){
		$("#tip").fadeOut();
	});
	// 移动到创建房间
	$("#createBtn").hover(function (){
		$("#tip").html("点击该按钮可以创建房间").fadeIn();
	});
	$("#createBtn").mouseleave(function (){
		$("#tip").fadeOut();
	});
	// 设置按钮
	$("#setting").click(function (e){
		$("#panel").fadeIn();
		$("#panel label").fadeIn();
	});
	// 设置面板
	// 改变头像
	// 检查是否能够使用FileReader
	$("#changeAvatar").click(function (e){
		if(!FileReader){
			alert("你的浏览器不支持该功能，请更换浏览器");
			e.preventDefault();
		}
	});
	$("#changeAvatar").change(function (e){
		var reader = new FileReader();
		reader.onload = function (e){
			// 过滤编码
			var splits = e.target.result.split(','),
				code = splits[splits.length - 1];
			// 向服务器发送该图片
			socket.emit('changeAvatar_Client', code);
		};
		if(this.files[0]){			
			reader.readAsDataURL(this.files[0]);
			this.value = "";
		}
	});
	// 接收到服务器存放完成后修改页面上的图片
	socket.on("changeAvatar_Server", function (route){
		// 解决因为缓存而无法查看新的头像
		route = route + "?" + Math.random() * 100000;
		if(route){
			$("#avatar").attr("src", route);
		}
	});
	// 收到邀请
	socket.on("getInvited_Server", function (req){
		var username = req.username,
			roomID = req.roomID,
			roomName = req.roomName;
		var answer = confirm("收到" + username + "的邀请。是否前往房间:" + roomName + "？");
		socket.emit("getInvited_Client", {answer: answer, username: username});
		if(answer){
			window.location.href = "/Chatroom/" + roomID;
		}
	});
});
