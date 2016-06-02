module.exports = {
	rooms:{		
		roomName: {type: String, required: true, unique: true},
		roomHost: {type: String, required: true},
		roomMax: {type: Number, required: true},
		roomMembers: {type: [], default: []},
		roomLog: {type: String, default: '#'}
	},
	users:{
		userName: {type: String, required: true, unique: true},
		userPassword: {type: String, required: true},
		userSocket: {type: String, required: false},
		userSession: {type: String, required: false},
		userAvatar: {type: String, default: "../images/Logo.jpg"},
		userStatus: {type: String},
		userRoomID: {type: String},
		userOnline: {type: Boolean}
	}
};