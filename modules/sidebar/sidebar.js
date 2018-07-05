"use strict";
class SideBar {
   
    constructor(data) {
		console.log('starting sidebar module...');
		
        this.viewModel = {
            currentTime: '',
            isDataAvailable: false
        };
        
        this.viewHelpers = {};

        try {
            utils.fetch_view("modules/sidebar/sidebar.htm").then((html) => {              
                this.tpl = _.template(html);
                this.render();                		
            });	
            utils.loadCssFile("modules/sidebar/sidebar.css");
                
            this.viewModel.currentTime = _.strftime(new Date(), '%R');
            setInterval(() => {
                this.viewModel.currentTime = _.strftime(new Date(), '%R');
            }, 60000);
        }
        catch(err) {
            utils.displayException(err);
        }          
    }

    render() {
		let data = this.viewModel;
		_.extend(data, this.viewHelpers);

        let el = utils.SetTag('sidebar', this.tpl(data));

        rivets.bind(el, {vm: this.viewModel});
    }
   
}
