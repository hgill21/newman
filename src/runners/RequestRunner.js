var jsface  = require('jsface'),
	unirest = require('unirest'),
	log     = require('../utilities/Logger'),
	Queue   = require('../utilities/Queue'),
	EventEmitter = require('../utilities/EventEmitter'),
	_und    = require('underscore');

/**
 * @class RequestRunner
 * @classdesc RequestRunner is a singleton object which fires the XHR and takes the
 * appropriate action on the response.
 * @mixes EventEmitter , Queue
 */
var RequestRunner = jsface.Class([Queue, EventEmitter], {
	$singleton: true,

	/**
	 * Adds the Request to the RequestRunner's queue.
	 * @memberOf RequestRunner
	 * @param {RequestModel} request Takes a RequestModel Object.
	 */
	addRequest: function(request) {
		this.addToQueue(request);
	},

	/**
	 * Starts the RequestRunner going to each request in the queue.
	 * @memberOf RequestRunner
	 */
	start: function() {
		this._execute();
		this.addEventListener('requestExecuted', this._onRequestExecuted.bind(this));
	},

	_execute: function() {
		var request = this.getFromQueue();
		if (request) {
			var RequestOptions = this._getRequestOptions(request);
			var unireq = unirest.request(RequestOptions, function(error, response, body) {
				this.emit('requestExecuted', error, response, body, request);
			}.bind(this));
			this._setFormDataIfParamsInRequest(unireq, request);
		}
	},

	// Generates and returns the request Options to be used by unirest.
	_getRequestOptions: function(request) {
		var RequestOptions = {};
		RequestOptions.url = request.url;
		RequestOptions.method = request.method;
		RequestOptions.headers = this._generateHeaders(request.headers);
		RequestOptions.followAllRedirects = true;
		this._setBodyData(RequestOptions,request);
		return RequestOptions;
	},

	// Takes request as the input, parses it for different types and
	// sets it as the request body for the unirest request.
	_setBodyData: function(RequestOptions, request) {
		if (request.method === 'POST') {
			if (request.dataMode === "raw") {
				RequestOptions.data = request.data;
			} else if (request.dataMode === "urlencoded") {
				var reqData = request.data;
				RequestOptions.form = _und.object(_und.pluck(reqData, "key"), _und.pluck(reqData, "value"));
			}
		}
	},

	// Request Mumbo jumbo for `multipart/form-data`.
	_setFormDataIfParamsInRequest: function(unireq, request) {
		if (request.method === 'POST' && request.dataMode === "params") {
			var form = unireq.form();
			_und.each(request.data, function(dataObj) {
				// TODO: @viig99 add other types like File Stream, Blob, Buffer.
				if (dataObj.type === 'text') {
					form.append(dataObj.key, dataObj.value);
				}
			});
		}
	},

	_generateHeaders: function(headers) {
		var headerObj = {};
		headers.split('\n').forEach(function(str) {
			if (str) {
				var splitIndex = str.indexOf(':');
				headerObj[str.substr(0,splitIndex)] = str.substr(splitIndex + 1).trim();
			}
		});
		return headerObj;
	},

	_onRequestExecuted: function(error, response, body, request) {
		if (error) {
			log.error(request.id + " terminated with the error " + error.code);
		} else {
			log.success(request.url + " succeded with response.");
		}
		this._execute();
	}
});

module.exports = RequestRunner;