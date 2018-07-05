import { Component, OnInit } from '@angular/core';
import { IMqttMessage, MqttModule, MqttService } from 'ngx-mqtt';
import { MessageService } from '../message-service.service';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { DatePipe } from '@angular/common'

export class Race {
    public Name: string;
    public VenueName: string;
    public RaceStatus: string;
    public TabState: string;
    public RacingType: string;
    public Number: number;
    public RaceNum: string;
    public StartTime: Date;
    public TabRaceId: number;
    public TabMeetingId: number;
}

export class Runner {
    public TabRunnerId: number;
    public Name: string;
    public Number: number;
    public Fixed: number;
    public Nsw: number;
    public Stab: number;
    public RunnerStatus: boolean;
    public FinishingPosition: string;
	public FixedReturnWin: number;
	public PriceUpdate: string;
}

export class Tip {
    public Tipster: string;
    public Runner1 : number;
    public Runner2 : number;
    public Runner3 : number;
    public Runner4 : number;
    public Runner1Name : string;
    public Runner2Name : string;
    public Runner3Name : string;
    public Runner4Name : string;
}

export class Form {
    public Number : string;
    public Last5Starts : string;
    public Last20Starts : string;
    public Sire : string;
}

@Component({
    selector: 'app-formandtips',
    templateUrl: './formandtips.component.html',
    styleUrls: ['./formandtips.component.css']
})
export class FormandtipsComponent {
	message: any;
    subscription: Subscription;

    isTipDataAvailable: boolean = false;
    isFormDataAvailable: boolean = false;
      
    race: Race = new Race();
	runners: Runner[];    
	tipList: Tip[];  
	formList: Form[];  

    constructor(private _mqttService: MqttService, private messageService: MessageService, public datepipe: DatePipe) { 
        // subscribe to internal app messages
        this.subscription = this.messageService.getMessage().subscribe(
            message => { 				
                var msg = JSON.parse(message.text);
                if (msg.topic == 'formandtips') {
                    this.tipList = this.formList = [];
					this.race = msg.data.race;
                    this.runners = msg.data.runners;                    
                    this.displayFormAndTips();
                }
            }
        );		

    }

	displayFormAndTips() {
        this.isTipDataAvailable = false;
        this.isFormDataAvailable = false;

		// listen for query [Response] message from microservice
		this._mqttService.observe('coloursformtip/Response').subscribe((message: IMqttMessage) => 
		{
			var response = JSON.parse(message.payload.toString());		
			if (response.query == 'tiplist') {
                this.tipList = response.data as Array<Tip>;
                this.updateTipsArray();
                this.isTipDataAvailable = true;
			}
			if (response.query == 'formlist') {
                this.formList = response.data as Array<Form>;
                this.updateFormArray();
                this.isFormDataAvailable = true;
			}
		});
		setTimeout(() => {	
			this.queryForData();
		}, 50);
    }

	public queryForData(): void {
		var payload = {
			action: "tiplist",
			data: [{ Key: "raceId", Value: this.race.TabRaceId }]
		};		
		var message = JSON.stringify(payload);
        this._mqttService.unsafePublish('coloursformtip/Request', message, {qos: 0, retain: false});
        
		var payload = {
			action: "formlist",
			data: [{ Key: "raceId", Value: this.race.TabRaceId }]
		};		
		var message = JSON.stringify(payload);
		this._mqttService.unsafePublish('coloursformtip/Request', message, {qos: 0, retain: false});
	}
	
	updateTipsArray() {
		this.tipList.forEach(tip => {
			tip.Runner1Name = this.runners.find(x => x.Number == tip.Runner1).Name;
			tip.Runner2Name = this.runners.find(x => x.Number == tip.Runner2).Name;
			tip.Runner3Name = this.runners.find(x => x.Number == tip.Runner3).Name;
			tip.Runner4Name = this.runners.find(x => x.Number == tip.Runner4).Name;
		});
    }

	updateFormArray() {
		this.tipList.forEach(form => {

		});
    }
        
}
