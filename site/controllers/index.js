/**
 * Controller for the main index page
 */
'use strict';
module.exports = function(site) {
	site.get('/', function(req, res) {
		res.render('index', { title: 'MyStatus' });
	});
};