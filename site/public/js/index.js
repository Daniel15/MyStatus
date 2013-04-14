(function($, Handlebars) {
	'use strict';
	window.Pages = {};
	
	var Index = window.Pages.Index = {
		newsCallback: function(data) {
			// Don't do anything if response is invalid
			if (data.responseStatus !== 200 || !data.responseData) {
				return;
			}

			var entries = $.map(data.responseData.feed.entries, function(entry) {
				return {
					title: entry.title,
					contentSnippet: entry.contentSnippet,
					url: entry.link,
					content: entry.content,
					date: new Date(entry.publishedDate).format('fullDate')
				};
			});
			
			var template = Handlebars.compile($('#news-template').html());
			var html = template({
				entries: entries
			});
			
			$('#news').html(html);
		}
	};
}(window.jQuery, window.Handlebars));