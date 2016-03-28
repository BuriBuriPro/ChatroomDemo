// 获取页面中的对应元素
var userList = document.querySelector("#userList"),
	viewArea = document.querySelector("#viewArea"),
	inputArea = document.querySelector("#inputArea"),
	textArea = inputArea.querySelector('#textArea'),
	sendBtn = inputArea.querySelector('#sendBtn');
// 与服务器进行连接
var socketOnPage = io.connect();
// 制作富文本输入框
textArea.setAttribute('contentEditable', 'true');
sendBtn.addEventListener('click', function(e){
	socketOnPage.emit('foo', textArea.innerText);
});
socketOnPage.on('returnMessage', function(data){
	viewArea.innerText += data;
	textArea.innerText = '';
});