$(document).ready(function() {
	// 用于房间的加载聊天记录
	var htmlCode =  $("#viewArea").html().replace(/&lt;/g, '<').replace(/&gt;/g, '>');
	$("#viewArea").html(htmlCode);
	// 与服务器建立websocket连接
	var socket = io('/');
	// 发出加入房间事件
	socket.emit("joinRoom_Client");
	// 加载房间成员数据
	socket.on("loadMembers_Server", function (roomMembers){
		for(var i = 0; i < roomMembers.length; i ++ ){
			$("#userList").append("<li id = '" + roomMembers[i] + "'>" + roomMembers[i] + "</li>");
		}
	});
	// 接收到join事件时，提示房间内所有人有用户加入
	socket.on("memberJoining_Server", function (username){
		// 用户进入房间时进行提示
		if(username == $("#self b")[1].innerText){
			return;
		} else{	
			$("#viewArea").append("<p>" + username + "进入了房间</p>");
			// 刷新用户列表，直接添加在后面
			$("#userList").append("<li id = '" + username + "'>" + username + "</li>");
		}
	});
	// 用户列表人数改变
	socket.on("memberNumberChange_Server", function (memberNumber){
		$("#memberNumber").html(memberNumber);
	});
	// 离开房间
	socket.on('memberLeaving_Server', function (username){
		// 用户离开房间时向房间广播
		$("#viewArea").append("<p>" + username + "离开了房间<p>");
		// 移除页面用户列表中的用户
		var item = "#userList #" + username;
		$(item).remove();
	});
	// 退出房间
	$("#leaveBtn").click(function (event) {
		socket.emit("leaveRoom_Client");
	});
	socket.on("leaveRoom_Server", function (){
		window.location.href = "/theHall";
	});
	// 准备变量判断是否私聊模式
	var mode = "public",
		target = "";
	// 发送消息
	$("#sendBtn").click(function (){
		// 不允许输入为空
		if($("#textArea").val().trim() != ""){
			// 判断是否私聊
				// 通过socket把输入框里的内容传递给服务器
				socket.emit('sendMsg_Client', {
					msg: $("#textArea").val(),
					mode: mode,
					target: target
				});	
			$("#textArea").val("");
		}
  	});
  	// 接收到服务器传来的消息
	socket.on("sendMsg_Server", function (msgData){
		$("#viewArea").append("<div class='msg " + msgData.mode + "' >" + 
							 "<div class='sender'>" + 
							 "<img src='" + msgData.avatar + "' alt='' class='avatar'>" +
							 "<b>"+ msgData.username + "</b>" + 
							 "</div>" + 
							 "<p>" + msgData.msg + "</p>" +
							 "</div>");
		 $("body").animate({scrollTop: 10000}, 1000);
	});	
	// 发送图片
	$("#sendImg").change(function (){
		// 检测浏览器是否支持FileReader
		if(!FileReader){
			alert("你的浏览器不支持该功能，请更换浏览器后再使用");
			this.value = "";
			return false;
		} else{
			var reader = new FileReader();
			reader.onload = function (e){
				// 创建一个新的Image对象
				var img = new Image();
				img.src = e.target.result;
				$(img).addClass("msgImg");				
				// 清空选择
				$("#sendImg").value = "";
				// 向服务器发送图片消息
				socket.emit("sendImg_Client", e.target.result);				
			};
			// 判断是否有文件选中
			if(this.value){
				reader.readAsDataURL(this.files[0]);
			}
		}
	});
	// 接收图片消息
	socket.on("sendImg_Server", function (msgData){
		$("#viewArea").append("<div class='msg'>" + 
							 "<div class='sender'>" + 
							 "<img src='" + msgData.avatar + "' alt='' class='avatar'>" +
							 "<b>"+ msgData.username + "</b>" + 
							 "</div>" + 
							 "<img class='msgImg' src='" +
							 msgData.imgBase64 + "' />" +
							 "</div>");
		$("body").animate({scrollTop: 10000}, 1000);
	});	
	// 点击图片打开新的页面
	$("#viewArea").delegate(".msgImg", "click", function (){
		window.open($(this).attr("src"));
	});
	// 检测输入框字数
	$("#textArea").keydown(function (e){
		setTimeout(function (){
			$("#wordCount b").html($("#textArea").val().length);
		}, 100);
	});
	// 邀请功能
	$("#inviteBtn").click(function (e){
		var result = prompt("请输入你想要邀请的用户名字");
		if(result.trim() != ""){
			socket.emit("invite_Client", result);
		}
	});
	// 反馈
	socket.on("invite_Server", function (res){
		if(res.sign === 'fail'){
			if(res.detail === 'full room'){
				alert("房间已满");		
			} else if(res.detail === 'not exist'){
				alert("用户不存在");
			} else if(res.detail === 'user offline'){
				alert("用户已下线");
			} else if(res.detail === 'user busy'){
				alert("用户已经在其他房间");
			}
		} else if(res.sign === "success"){
			alert("用户已收到邀请，请等待回应");
		}
	});
	// 点名功能，弹出用户列表
	$("#textArea").keypress(function (e){
		setTimeout(function (){
			// 检测输入是否含有"@"符号
			var pos = $.inArray("@", $("#textArea").val(), $("#textArea").val().length - 1);
			if(pos != -1){

			}
		}, 100);
	});
	// 私聊功能
	// 为用户列表添加点击后的功能
	$("#userList").delegate("li", "dblclick", function (e){
		// 不可以点击自己
		// console.log($(this).attr("id"));
		if($(this).attr("id") === $("#username").html()){
			alert("不可以与自己私聊");
		}
		else{
			// 把选中对象设置为私聊对象
			var ans = confirm("要私聊该用户吗？");
			if(ans){
				mode = "private";
				target = $(this).attr("id");
				// 输入框添加私聊模式提醒
				$("#privateTarget").html(target);
				$("#mode").fadeIn();
			}			
		}				
	});
	// 面板添加退出
	$("#mode").click(function (e){
		$("#mode").fadeOut(400, function (){
			// 清除标记
			mode = "public";
			target = "";
		});
	});
	// 操作提示
	$("#userList").hover(function (){
		$("#tip").html("双击用户名可以进行私聊").fadeIn();
	});
	$("#userList").mouseleave(function (){
		$("#tip").fadeOut();
	});
	$("#mode").hover(function (){
		$("#tip").html("点击该标记可以退出私聊").fadeIn();
	});
	$("#mode").mouseleave(function (){
		$("#tip").fadeOut();
	});
	$(".msgImg").hover(function (){
		$("#tip").html("点击图片可以查看原图").fadeIn();
	});
	$(".msgImg").mouseleave(function (){
		$("#tip").fadeOut();
	});
});