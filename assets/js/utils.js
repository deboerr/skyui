/**
 * rivets utils
 */

// RV-TIME FORMATTER
rivets.formatters.time = {
	read: function(value) {
		let val = parseFloat(value);				
		return (val == 0 ? "" : val.toFixed(2));
	}
};
// RV-DECIMAL FORMATTER
rivets.formatters.decimal = {
	read: function(value) {
		let val = parseFloat(value);				
		return (val == 0 ? "" : val.toFixed(2));
	}
};
// RV-ADDCLASS BINDER
rivets.binders.addclass = function(el, value) {
	if (el.addedClass) {
		el.classList.remove(el.addedClass);
		delete el.addedClass;
	}
	if (value) {
		el.classList.add(value);
		el.addedClass = value;	
	}
};
// RV-SRC BINDER
rivets.binders.src = function(el, value) {
	el.src = (value.indexOf('/') == -1 ? "assets/images/" : "") + value + (value.indexOf('.') == -1 ? ".png" : "");
};

/**
 * app utils
 */

var utils = {
	GetTag: function(tag) {
		return document.getElementsByTagName(tag)[0];
	},
	GetTags: function(tag) {
		return document.getElementsByTagName(tag);
	},
	SetTag: function(tag, html) {
		var el = document.getElementsByTagName(tag)[0];
		el.innerHTML = html;
		return el;
	},
	SetTags: function(tag, html) {
		var els = document.querySelectorAll(tag);
		[].forEach.call(els, function(el) {
			el.innerHTML = html;
		});
	},
	GetElementByClassName: function(cls) {
		return document.getElementsByClassName(cls)[0];
	},	
	fetch_view : function(url) {
		return fetch(url).then((response) => (response.text()));
	},
	loadCssFile : function(file) {
		var element = document.createElement("link");
		element.setAttribute("rel", "stylesheet");
		element.setAttribute("type", "text/css");
		element.setAttribute("href", file);
		document.getElementsByTagName("head")[0].appendChild(element);		
	},
	showToast : function(msg) {
		var x = document.getElementById("snackbar");
		x.className = "show";
		x.innerHTML = msg;
		setTimeout(() => { 
			x.className = x.className.replace("show", ""); 
		}, 3000);		
	},
	hijackConsole : function() {
		var original = window.console
		window.console = {
			log: function() {
				// do stuff				
				original.log.apply(original, arguments)
			}
			, warn: function() {
				// do stuff
				original.warn.apply(original, arguments)
			}
			, error: function() {
				// do stuff
				original.error.apply(original, arguments)
			}
		}
	},
	mqttWrapper : function() {
		if (app.mqttClient == null) {
			let clientId = 'skyui-client-' + (Math.floor((Math.random() * 1000000) + 1));
			app.mqttClient = new PahoMqttWrapper(clientId);
		}
		return app.mqttClient;
	},
    displayException : function(err) {
        let el = document.getElementsByTagName("body")[0];
        el.style.cssText = "padding:50px;color:yellow;";
        el.innerHTML = "<h2>" + err.message + "</h2>";
        debugger;
    }
};

/**
 * we share a single paho mqtt connection for ALL pub/sub in ALL app components
 */
class PahoMqttWrapper {

	constructor(clientId) {
		this.isConnected = false;
		this.isListening = false;
		this.client = new Paho.MQTT.Client('45.124.53.40', Number(15675), '/ws', clientId);
	}
	connect(callback) {
		if (this.isConnected) {
			callback();
			return;			
		}
		this.client.connect({
			useSSL: false,
			cleanSession: true,
			keepAliveInterval: 15,
			timeout: 15000,
			mqttVersion: 4,
			userName: "skydvs",
			password: "skydvs",
			onSuccess: () => {
				this.isConnected = true;
				this.client.onConnectionLost = (responseObject) => {
					console.log('connection lost: '+responseObject.errorMessage);
				};
				callback();
			}
		});	
	}
	listen() {
		if (this.isListening) {
			return;			
		}		
		this.isListening = true;
		this.client.onMessageArrived = (message) => {
			let data = message.payloadString;
			let topic = message.destinationName;
			Event.fire(topic, data);		
		};		
	}
	subscribe(topic) {
		this.client.subscribe(topic, {qos: 0});
	}
	publish(topic, payload) {
		var message = new Paho.MQTT.Message(JSON.stringify(payload));
		message.destinationName = topic;
		message.qos = 0;		 
		this.client.send(message);
	}

}
/**
 * generic Event object exposing 'on' and 'fire' actions
 */
var Event = function() {
    var self = this;
    self.queue = {};
    self.fired = [];
    return {
        fire: (event, data) => {
            var queue = self.queue[event];
            if (typeof queue === 'undefined') {
                return;
            }
			queue.forEach(function (callback) {
				callback(data);
			});
            self.fired[event] = true;
        },
        on: (event, callback) => {
            if (self.fired[event] === true) {
                return callback();
            }
            if (typeof self.queue[event] === 'undefined') {
                self.queue[event] = [];
            }
            self.queue[event].push(callback);
        }
    };
}();