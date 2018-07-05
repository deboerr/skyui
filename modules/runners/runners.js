"use strict";
class Runners {
   
	constructor() {
		console.log('starting runners module...');

		this.client = null;
		this.tabRaceId = 0;
		this.viewModel = {  
			race: null,
			runners: [],
			isDataAvailable: false
		};

		this.viewHelpers = {
			getTime(val) { 
				let dt = new Date(Date.parse(val));
				// let tzoff = dt.getTimezoneOffset();
				return _.strftime(new Date(dt.getTime()), '%I:%M %p');
			},
			getFlag(val) {
				if (typeof val != 'undefined') {
					return "assets/images/" + val.trim() + ".jpg";
				}
				return "assets/images/AUS.jpg";
			},
			getFinish(val) {
				if (typeof val == 'undefined' || val == '0') {
					return ' ';
				}
				return val;
			}
		}
        
        try {
            this.mqtt = utils.mqttWrapper();

            this.registerMqttMessageHandlers();

            utils.loadCssFile("modules/runners/runners.css");
            utils.fetch_view("modules/runners/runners.htm").then((html) => {
                this.tpl = _.template(html);                    
            }); 

            _.subscribe('internal/runners', (msg) => {
                this.viewModel.race = msg.data.race;
                this.tabRaceId = this.viewModel.race.TabRaceId;
                
                this.loadAndDisplayRunners();
                
            });
        }
        catch(err) {
            utils.displayException(err);
        }            
	}

	registerMqttMessageHandlers() {
		// runnerlist query response message
		Event.on('meetingracerunner/Response', (message) => {
			let resp = JSON.parse(message);
			if (resp.query == "runnerlist") {
				utils.showToast('runnerlist');  

				this.viewModel.runners = resp.data;           
				this.viewModel.isDataAvailable = true;
				
				this.sendMessageToFormAndTipsComponent();

				this.fixRunnersArray();
				this.render();
				this.bindRunnerList();

				// fetch odds snapshot
				this.mqtt.subscribe('vicparimutuel/Response');
				let payload = {
					action: "oddslist",
					data: [{ Key: "raceId", Value: this.viewModel.race.TabRaceId }]
				};      
				this.mqtt.publish('vicparimutuel/Request', payload);  				

				// subscribe to wift updates
				this.mqtt.subscribe('meetingracerunner/Update');
				this.mqtt.subscribe('vicparimutuel/Update');
			}
		});

		// mrr runner update message
		Event.on('meetingracerunner/Update', (message) => { 
			let resp = JSON.parse(message);         
			if (resp.model == "runner" && resp.data[0].TabRaceId == this.tabRaceId) {
				utils.showToast('runner update');
				this.processWiftMrrUpdate(resp.data[0]);

				// this.render();
			}   
		});    
		             
		// vic parimutuel query response
		Event.on('vicparimutuel/Response', (message) => { 
			let resp = JSON.parse(message);
			if (resp.query == "oddslist" && resp.data[0].TabRaceId == this.tabRaceId) {
				utils.showToast('odds snapshot');
				this.processWiftPariSnapshot("Stab", resp.data);

				// this.render();
			}   
		}); 

		// vic parimutuel prices update message
		Event.on('vicparimutuel/Update', (message) => { 
			let resp = JSON.parse(message);
			if (resp.model == "odds" && resp.data[0].TabRaceId == this.tabRaceId) {
				utils.showToast('odds update');
				this.processWiftPariUpdate("Stab", resp.data[0]);

				// this.render();
			}   
		});                 
	}

	loadAndDisplayRunners() {
		try {

			// fetch mrr data
			this.mqtt.connect(() => {
				this.mqtt.subscribe('meetingracerunner/Response');
				let payload = {
					action: "runnerlist",
					data: [{ Key: "raceId", Value: this.viewModel.race.TabRaceId }]
				};      
				this.mqtt.publish('meetingracerunner/Request', payload);    

				this.mqtt.listen();                                 
			});
			
		} catch (error) {           
			console.warn(error);            
		};      
	}
	
	render() {
		let data = this.viewModel;
		_.extend(data, this.viewHelpers);
		utils.SetTags('runners', this.tpl(data));  
	}
	
	bindRunnerList() {
		rivets.bind(utils.GetElementByClassName('runner-grid'), {
			runners : this.viewModel.runners,
			controller : appModules.runners			
		});
	}
	   
	fixRunnersArray() {        
		for (let runner of this.viewModel.runners) {
			runner.Cnt = runner.Number;
			runner.Nsw = (runner.Nsw == null ? 0 : runner.Nsw.toFixed(2));
			runner.Stab = (runner.Sbet == null ? 0 : runner.Sbet.toFixed(2));
			runner.Ubet = (runner.Ubet == null ? 0 : runner.Ubet.toFixed(2));
			runner.FixedReturnWin = (runner.FixedReturnWin == null ? 0 : runner.FixedReturnWin.toFixed(2));
			runner.Scratched = (runner.RunnerStatus != 'Normal');
			runner.FinishingPosition = (runner.FinishingPosition == '0' ? '' : runner.FinishingPosition);
			runner.FixedUpdate = '';
			runner.StabUpdate = '';
		}
	}
	   
	processWiftPariSnapshot(mode, data) {        
		let cnt = 0;
		for (let odds of data) {
			let i = this.viewModel.runners.findIndex((x) => x.Number == odds.SelectionsString);
			this.viewModel.runners[i].Stab = odds.Amount;
		}
	}

	processWiftMrrUpdate(data) {
		let i = this.viewModel.runners.findIndex((x) => x.Number == data.Number);
		let runner = this.viewModel.runners[i];
		runner.FixedUpdate = (data.FixedReturnWin > runner.FixedReturnWin ? 'price-up' : (data.FixedReturnWin < runner.FixedReturnWin ? 'price-dn' : runner.FixedUpdate));
		runner.FixedReturnWin = data.FixedReturnWin;
		runner.FinishingPosition = (data.FinishingPosition == '0' ? '' : data.FinishingPosition);
		runner.RunnerStatus = data.RunnerStatus;
	}       

	processWiftPariUpdate(mode, data) {
		let i = this.viewModel.runners.findIndex((x) => x.Number == data.SelectionsString);
		let runner = this.viewModel.runners[i];
		if (mode == "Stab") {
			runner.StabUpdate = (data.Amount > runner.Stab ? 'price-up' : (data.Amount < runner.Stab ? 'price-dn' : runner.StabUpdate));
			runner.Stab = data.Amount;
		}
	}       

	sendMessageToFormAndTipsComponent() {
		let payload = { 
			topic: "formandtips", 
			data: {
				race: this.viewModel.race,
				runners: this.viewModel.runners
			}
		};
		_.publish('internal/formandtips', payload);
	}
		
}
