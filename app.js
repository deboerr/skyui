let app = {
	mqttClient: null,
};
let appModules = {
	nexttojump: null,
	sidebar: null,
	racecard: null,
	runners: null,
	formandtips: null
};

document.addEventListener("DOMContentLoaded", function() {
    utils.hijackConsole();
    console.log('starting app...');
    
    appModules.nexttojump = new NextToJump();	
    appModules.racecard = new RaceCard();
    appModules.sidebar = new SideBar();
    appModules.runners = new Runners();
    appModules.formandtips = new FormAndTips();
});