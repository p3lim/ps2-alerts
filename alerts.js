var worlds = {
	1: {name: 'Connery'},
	9: {name: 'Woodman'},
	10: {name: 'Miller'},
	11: {name: 'Ceres'},
	13: {name: 'Cobalt'},
	17: {name: 'Mattherson'},
	18: {name: 'Waterson'},
	25: {name: 'Briggs'}
}

var events = [
	{zone: 2, type: 0},
	{zone: 8, type: 0},
	{zone: 6, type: 0},
	{zone: 0, type: 1},
	{zone: 0, type: 2},
	{zone: 0, type: 3},
	{zone: 6, type: 1},
	{zone: 6, type: 2},
	{zone: 6, type: 3},
	{zone: 2, type: 1},
	{zone: 2, type: 2},
	{zone: 2, type: 3},
	{zone: 8, type: 1},
	{zone: 8, type: 3}
];

var eventNames = [
	'Territory',
	'Bio Labs',
	'Tech Plants',
	'Amp Stations'
];

var zoneNames = {
	0: 'Global',
	2: 'Indar',
	6: 'Amerish',
	8: 'Esamir'
}

var eventIDs = {
	135: true,
	136: true,
	137: false,
	138: false,
	139: true
}

var http = require('http');
var query = function(params, callback){
	http.get('http://census.soe.com/get/ps2:v2/' + params, function(response){
		var result = '';
		response.on('data', function(chunk){
			result += chunk;
		});

		response.on('end', function(){
			callback(JSON.parse(result));
		});
	});
}

module.exports = function(sockets){
	var self = this;
	self.update = function(){
		query('world?c:limit=100', function(result){
			for(var index = 0; index < result.world_list.length; index++){
				var data = result.world_list[index];
				var world = worlds[+data.world_id];
				if(world){
					if(data.state != world.state){
						world.state = data.state;
						sockets.broadcast(world);
					}

					if(data.state == 'online')
						self.updateWorld(world);
				}
			}
		});
	}

	self.updateWorld = function(world){
		query('world_event?world_id=' + world.id + '&type=METAGAME', function(result){
			if(!result.world_event_list)
				return;

			var data = result.world_event_list[0];

			var eventID = +data.metagame_event_state;
			if(eventID != world.eventID){
				if(eventIDs[eventID]){
					var event = events[+data.metagame_event_id - 1];
					world.active = true;
					world.alert = {
						start: +(data.timestamp + '000'),
						type: event.type,
						zone: event.zone,
						eventName: eventNames[event.type],
						zoneName: zoneNames[event.zone],
						duration: (+data.metagame_event_id > 6) ? 1 : 2
					}
				} else {
					world.active = false;
				}

				world.eventID = eventID;
				sockets.broadcast(world);
			}
		});
	}

	self.init = function(){
		return {
			init: true,
			worlds: worlds
		}
	}

	for(var index in worlds){
		var world = worlds[index];
		world.id = index;
		world.state = '';
		world.active = false;
		world.eventID = 0;
		world.alert = {};
	}

	self.update();

	return self;
}
