/**
 * Main code for the XMPP bot. Connects to XMPP and handles XMPP events.
 */
'use strict';

var junction = require('junction'),
	crypto = require('crypto'),
	config = require('./../config'),
	db = require('./../db'),
	log = require('./../log');

var bot = junction();

// Logging of incoming/outgoing messages
bot.use(function(stanza, next) {
	log.debug('RECV: ' + stanza);
	next();
});
bot.filter(function(stanza, next) {
	log.debug('XMIT: ' + stanza);
	next();
});

bot.use(junction.messageParser());
bot.use(junction.message(function(handler) {
	/**
	 * Fired when a chat message is received
	 */
	handler.on('chat', function(stanza) {
		// Ignore if it's not actually a chat message
		if (!stanza.body) {
			return;
		}

		var jid = new junction.JID(stanza.from).bare().toString();
		log.info('Received from ' + jid + ': ' + stanza.body);

		// Resend the registration message
		db.Account.find({ where: { jid: jid }}).success(function (account) {
			exports.sendRegistrationMessage(jid, account.accountCode);
		}).error(function (error) {
			log.error('Could not send reg message to ' + jid + ': ' + error);
		});
	});
}));

bot.use(junction.presenceParser());
bot.use(junction.presence(function(handler) {
	/**
	 * Persist this status to the database
	 * @param stanza Stanza to persist
	 */
	function persistStatus(stanza) {
		var jid = new junction.JID(stanza.from).bare().toString();

		// Persist this change to the database
		db.Account.createOrUpdate(['jid'], {
			jid: jid,
			state: stanza.show,
			statusText: stanza.status
		}, function (error) {
			log.error('Could not persist changes for ' + jid + ': ' + error);
		});

		log.info(jid + ' changed state to "' + stanza.show + '" (' + stanza.status + ')');
	}

	/**
	 * Fired when a contact changes their status
	 */
	handler.on('available', function(stanza) {
		persistStatus(stanza);

	});
	/**
	 * Fired when a contact goes offline
	 */
	handler.on('unavailable', function(stanza) {
		stanza.show = 'offline';
		stanza.status = null;
		persistStatus(stanza);
	});

	/**
	 * Fired when a user subscribes to the bot
	 */
	handler.on('subscribe', function(stanza) {
		var jid = new junction.JID(stanza.from).bare().toString();
		// Accept the subscription
		log.info('Accepting subscribe request from ' + jid);
		bot.connection.send(new junction.elements.Presence(jid, 'subscribed'));
		bot.connection.send(new junction.elements.Presence(jid, 'subscribe'));
		exports.sendRegistrationMessage(jid);
	});

	/**
	 * Fired when an error is received in a presence stanza
	 */
	handler.on('err', function(stanza) {
		log.error('Error in presence stanza: ' + stanza.toString());	
	});
}));

bot.use(junction.capabilitiesParser());
bot.use(junction.capabilities(function(handler) {
	/**
	 * Called when the user's capabilities have been retrieved.
	 */
	handler.on('capabilities', function(rawJid, caps) {
		var jid = new junction.JID(rawJid).bare().toString(),
			features = caps.features;

		db.Account.find({ where: { jid: jid }}).success(function (account) {
			account.setFeature('video', features.googleVideo || features.rtpvideo);
			account.setFeature('voice', features.googleVoice || features.rtpaudio);
			account.save(['features']);
		}).error(function (error) {
			log.error('Could not persist capabilities for ' + jid + ': ' + error);
		});
	});
}));

bot.use(junction.serviceUnavailable());
bot.use(junction.errorHandler({ dumpExceptions: true }));

/**
 * Starts the XMPP bot.
 */
exports.start = function() {
	log.info('Connecting using ' + config.xmpp.username);
	bot.connect({
		type: 'client',
		jid: config.xmpp.username,
		password: config.xmpp.password,
		reconnect: true
	}).on('online', function() {
		this.send(new junction.elements.Presence());
		log.info('Connected to XMPP!');

		// Check for incoming subscription requests
		var roster = new junction.elements.IQ(null, 'get');
		roster.c('query', { xmlns: 'jabber:iq:roster' });
		bot.connection.send(roster);

		// Send a whitespace keepalive every 30 seconds.
		// TODO: Is there somewhere more appropriate for this?
		setInterval(function() {
			bot.connection.send(' ');
		}, 30 * 1000);
	});
};

/**
 * Send the registration message to the specified contact, so they can finish their registration
 * @param jid Jabber ID of the user
 * @param accountCode Account code for accessing their account
 */
 exports.sendRegistrationMessage = function(jid, accountCode) {
	// Generate an account code for verification
	crypto.randomBytes(28, function(ex, buf) {
		// Only replace the account code if we didn't already have one
		if (!accountCode) {
			accountCode = buf.toString('hex');
			db.Account.createOrUpdate(['jid'], {
				jid: jid,
				accountCode: accountCode
			});
		}

		log.info('Sending registration message to ' + jid);
		var msg = new junction.elements.Message(jid);
		msg.c('body', {}).t('Please go to this URL to complete your MyStatus registration: ' + config.site.baseUrl + 'account/' + accountCode);
		bot.connection.send(msg);
	});
};