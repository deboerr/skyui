"use strict";
class RaceCard {

    constructor(data) {
		console.log('starting racecard module...');
		
        this.viewModel = {
            state: "AUS",
            meeting: "",
            isDataAvailable: false
		};
		
		this.viewHelpers = {
			getDate(val) { 
				let dt = new Date(Date.parse(val));
				return _.strftime(dt, '%a, %d %b %Y');
			},
			getFlag(val) { 
				return "assets/images/" + val.trim() + ".jpg";
			}
		};

		this.racecard = [];
        
		utils.fetch_view("modules/racecard/racecard.htm").then((html) => {
			
			this.tpl = _.template(html);
			this.render();
			
		}).catch((error) => {		
			console.warn(error);			
		});	
		utils.loadCssFile("modules/racecard/racecard.css");
			
		_.subscribe('internal/racecard', (msg) => {
            this.racecard = msg.data.races;
            this.viewModel.state = msg.data.state;
            this.viewModel.meeting = msg.data.meeting + ' - ' + this.viewHelpers.getDate(this.racecard[0].StartTime);
            this.render();
		});
    }

    render() {
		var data = this.viewModel;
		_.extend(data, this.viewHelpers);

        utils.SetTags('racecard', this.tpl(data));    
    }
    
}
