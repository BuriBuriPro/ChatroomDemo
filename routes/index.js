// 
var index = function (req, res){
	res.send(200, {name: "Harry", age: 20});
};

exports.index = index;