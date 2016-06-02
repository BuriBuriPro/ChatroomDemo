// 数据库操作文件
// 引入mongoose模块
var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	models = require('./models.js');

for(var m in models){
	mongoose.model(m, new Schema(models[m]));
}

function getModel(model){
	return mongoose.model(model);
}

function findData(model, data, callback){

}



module.exports = {
	getModel: function(model){
		return getModel(model);
	}
};