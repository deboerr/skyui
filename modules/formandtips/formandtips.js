"use strict";
class FormAndTips {
   
    constructor() {
		console.log('starting formandtips module...');

		this.client = null;

        this.viewModel = {  
            race: null,
            runners: null,
            tipList: [],
            formList: [],
            isTipDataAvailable: false,
            isFormDataAvailable: false
        };

		this.viewHelpers = {};

		this.mqtt = utils.mqttWrapper();
		this.registerMqttMessageHandlers();

		utils.loadCssFile("modules/formandtips/formandtips.css");
		utils.fetch_view("modules/formandtips/formandtips.htm").then((html) => {
			this.tpl = _.template(html);				
		});	
        
		_.subscribe('internal/formandtips', (msg) => {
            this.viewModel.race = msg.data.race;
            this.viewModel.runners = msg.data.runners;

			this.loadAndDisplayFormAndTips();            
		});        
    }

	registerMqttMessageHandlers() {
		// tiplist/formlist query response message
		Event.on('coloursformtip/Response', (message) => {
			var resp = JSON.parse(message);
			// console.log(resp);
			if (resp.query == 'tiplist') {
				this.viewModel.tipList = resp.data;
				this.fixTipArray();

				this.viewModel.isTipDataAvailable = true;					
				this.render();
			}
			if (resp.query == 'formlist') {
				this.viewModel.formList = resp.data;
				this.fixFormArray();

				this.viewModel.isFormDataAvailable = true;					
				this.render();
			}							
		});						
	}
	
	loadAndDisplayFormAndTips() {
		try {

			// connect, subscribe to response, publish query request
			this.mqtt.connect(() => {
				this.mqtt.subscribe('coloursformtip/Response');
				var payload = {
					action: "tiplist",
					data: [{ Key: "raceId", Value: this.viewModel.race.TabRaceId }]
				};	
				this.mqtt.publish('coloursformtip/Request', payload);					
				var payload = {
					action: "formlist",
					data: [{ Key: "raceId", Value: this.viewModel.race.TabRaceId }]
				};	
				this.mqtt.publish('coloursformtip/Request', payload);
				this.mqtt.listen();				
			}
		);

		} catch (error) {			
			console.warn(error);			
		};		
	}

    render() {
		var data = this.viewModel;
		_.extend(data, this.viewHelpers);
        utils.SetTags('formandtips', this.tpl(data));    
    }
   
    fixTipArray() {
		var cnt = 0;
		_.each(this.viewModel.tipList, (tip, i) => {
			tip.Runner1Name = this.viewModel.runners.find(x => x.Number == tip.Runner1).Name;
			tip.Runner2Name = this.viewModel.runners.find(x => x.Number == tip.Runner2).Name;
			tip.Runner3Name = this.viewModel.runners.find(x => x.Number == tip.Runner3).Name;
			tip.Runner4Name = this.viewModel.runners.find(x => x.Number == tip.Runner4).Name;
			cnt++;
		});
	}
	   
    fixFormArray() {
		var cnt = 0;
		_.each(this.viewModel.formList, (form, i) => {
			form.Number = parseInt(form.Number);
			cnt++;
		});
		this.viewModel.formList = _.sortBy(this.viewModel.formList, 'Number');		
	}
    
}