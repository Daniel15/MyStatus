/**
 * Main code for the XMPP bot. Connects to XMPP and handles XMPP events.
 */
'use strict';

var xmpp = require('simple-xmpp'),
	config = require('./../config'),
	db = require('./../db'),
	log = require('./../log');

xmpp.on('online', function() {
	log.info('Connected to XMPP!');
});

xmpp.on('chat', function(from, message) {
	xmpp.send(from, 'Echo: ' + message);
});

xmpp.on('error', function(err) {
	log.error('Error in XMPP: ', err);
});

xmpp.on('buddy', function(jid, state, statusText) {
	// Ignore the bot's own status changes
	if (jid === config.xmpp.username) {
		return;
	}

	// Persist this change to the database
	db.Account.createOrUpdate(['jid'], {
		jid: jid,
		state: state,
		statusText: statusText
	});

	log.info(jid + ' changed state to "' + state + '" (' + statusText + ')');
});

xmpp.on('subscribe', function(from) {
	// Accept all subscriptions
	log.info('Accepting subscribe request from ' + from);
	xmpp.acceptSubscription(from);
	xmpp.subscribe(from);
});

/**
 * Starts the XMPP bot.
 */
exports.start = function() {
	log.info('Connecting using ' + config.xmpp.username);
	xmpp.connect({
		jid: config.xmpp.username,
		password: config.xmpp.password
	});

	// check for incoming subscription requests
	xmpp.getRoster();
};
