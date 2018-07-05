"use strict";
class NextToJump {

    constructor() {
		console.log('starting nexttojump module...');
    
    	// click handler
	    this.raceOnClick = (ev, target) => {
	    	let index = target.index;

			let el = utils.GetElementByClassName('ntjcontainer');
			if (this.selected > -1) {
				el.querySelector('#race-grid td:nth-child('+(this.selected+1)+') div').classList.remove('highlight');
			}
			el.querySelector('#race-grid td:nth-child('+(index+1)+') div').classList.add('highlight');
			this.selected = index;
	        
	        let race = this.viewModel.races[index];
			this.notifyOtherPageComponents(race);
			
		};
		
		// view helpers
		this.viewHelpers = {
			getTime(val) { 
				let dt = new Date(Date.parse(val));
				let tzoff = dt.getTimezoneOffset();
				return _.strftime(new Date(dt.getTime()), '%R');
			},
			getFlag(val) {
				if (typeof val != 'undefined') {
					return "assets/images/" + val.trim() + ".jpg";
				}
				return "assets/images/AUS.jpg";
			}
		};
		
		// view model
        this.viewModel = {  
            races: [],
            isDataAvailable: false
		};
			
        this.racecards = {};
		this.selected = -1;

		this.mqtt = utils.mqttWrapper();
		this.registerMqttMessageHandlers();        

		utils.loadCssFile("modules/nexttojump/nexttojump.css");			
		utils.fetch_view("modules/nexttojump/nexttojump.htm").then((html) => {
			this.tpl = _.template(html);
			this.loadAndDisplayRaceList();		
		});	

		setTimeout(() => {
			this.scrollNextToJump();
		}, 1000);
		setInterval(() => {
			this.scrollNextToJump();
		}, 120000);

    }

    render() {
		let el = utils.GetElementByClassName('ntjcontainer');
				
		let data = this.viewModel;
		_.extend(data, this.viewHelpers);

		utils.SetTags('nexttojump', this.tpl(data));

    }
	
	bindRaceList() {
		rivets.bind(utils.GetElementByClassName('nexttojump'), {
			races : this.viewModel.races,
			ctrl : this
		});
	}

	scrollNextToJump() {
		if (this.viewModel.races.length == 0) {
			return;
		}
		let now = new Date();
		let scrollTo = 18000;
		for (let i=0; i < this.viewModel.races.length; i++) {	
			let d1 = new Date(this.viewModel.races[i].StartTime+'Z');
			d1.setTime(d1.getTime() - (10*60*60*1000)); 	
			if (d1 > now) {
				scrollTo = (i * 150);		
				break;
			}		
		}
		let el = utils.GetElementByClassName('ntjcontainer');
		el.scrollLeft = scrollTo;
	}

	registerMqttMessageHandlers() {
		// nexttojumplist query response message
		Event.on('meetingracerunner/Response', (message) => {
			let resp = JSON.parse(message);
			// console.log(resp);				
			if (resp.query == "nexttojumplist") {
				utils.showToast('nexttojumplist');	
				this.viewModel.races = resp.data;

				this.fixRacesArray();
				this.viewModel.isDataAvailable = true;				
				this.render();
				this.bindRaceList();				
				
				this.mqtt.subscribe('meetingracerunner/Update');
			}
		});
		Event.on('meetingracerunner/Update', (message) => {
			let resp = JSON.parse(message);
			// console.log(resp);				
			if (resp.model == "race") {						
				utils.showToast('race update');
				this.processWiftUpdate(resp.data[0]);
			}	
		});		
	}

	loadAndDisplayRaceList() {
		try {
			// connect, subscribe to response, publish query request
			this.mqtt.connect(() => {
				this.mqtt.subscribe('meetingracerunner/Response');
				let payload = {
					action: "nexttojumplist",
					data: []
				};		
				this.mqtt.publish('meetingracerunner/Request', payload);
				this.mqtt.listen();			
			});
		} catch (error) {			
			console.warn(error);			
		};		
	}
    
    fixRacesArray() {
		let cnt = 0;
		let now = new Date();
		for (let race of this.viewModel.races) {
			race.Cnt = cnt;
			let d1 = new Date(race.StartTime+'Z');
			if (d1 < now) {
				race.RaceStatus = "Finished"
			}
			race.StartTime = d1;
			race.RaceNum = 'R'+race.Number;
			race.Flag = this.viewHelpers.getFlag(race.TabState);					
			race.Time = this.viewHelpers.getTime(race.StartTime);
			race.Finished = (race.RaceStatus != 'NotRun');

			if (typeof this.racecards[race.VenueName] == 'undefined') {
				this.racecards[race.VenueName] = [];
			}
			this.racecards[race.VenueName].push({RaceNum: race.RaceNum, Item: cnt, StartTime: race.StartTime});	
			cnt++;
		}
	}
    
    notifyOtherPageComponents(race) {
        // notify racecard
        let payload = { 
			action: "raceOnClick", 
			data: {meeting: race.VenueName, state: race.TabState, races: this.racecards[race.VenueName]} 
		};
        _.publish('internal/racecard', payload);
        
       // notify runners
        payload = { 
			action: "raceOnClick", 
			data: {race : race} 
		};
        _.publish('internal/runners', payload);
	}

	processWiftUpdate(data) {
		for (let race of this.viewModel.races) {		
			if (data.TabRaceId == race.TabRaceId) {
				race.RaceStatus = data.RaceStatus;
				race.Finished = (race.RaceStatus != 'NotRun');
				break;
			}
		}					
		
		// this.render();
	}
    
}
