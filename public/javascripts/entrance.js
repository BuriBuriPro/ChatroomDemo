$(document).ready(function(){
	// var username = sessionStorage.getItem('username');
	var etrBox = $("#etrBox"),
		username = $($("#etrBox input")[0]),
		password = $($("#etrBox input")[1]),
		loginBtn = $("#etrBox button");
	loginBtn.click(function(){
		console.log(username.text());
		if(!username.val() || username.val() == "" || !password.val() || password.val() == ""){
			return false;
		} else{
			$.ajax({
				url: '/userData',
				type: 'post',
				async: false,
				data: {
					username: username.val(),
					password: password.val()}
			})
			.done(function(sign) {
				if(sign === "fail"){
					alert("该用户名此刻已有人使用，或者你输入的密码出错");
				} else if(sign === "success"){
					window.location.href = "/theHall";		
				}
			})
			.fail(function() {
				alert("出现错误，正在刷新页面");
				window.location.reload(true);
			});
		}		
	});
});