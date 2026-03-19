(function () {
	var id = 'iekoigdlnhmafemfoamlnmhihmcfcklk';

	// Used for HTML ID generation. Gotta be unique, right?
	var idcount = 1;

	// Attach these to the window, where I can reach them.
    window.lat = 0.0;
    window.lon = 0.0;

    // Let the user play with this at some point
    var daylightColor = '#FFFFCC';


	var makeHighlighter = function(fromTime, toTime) {
		var daylightNode = document.createElement('div');

		// Create parent node
		var att1 = document.createAttribute("id");
		att1.value = "daylight" + idcount++;
		var att2 = document.createAttribute("class");
		att2.value = "daylight tg-col-overlaywrapper";
		daylightNode.setAttributeNode(att1);
		daylightNode.setAttributeNode(att2);

		// Create child daylightHighlighter node
		var daylightHighlighter = document.createElement('div')
		var att3 = document.createAttribute("id");
		att3.value = "daylightmarker";
		var att4 = document.createAttribute("class");
		att4.value = "tg-daylightmarker";
		var att5 = document.createAttribute("style");
		att5.value = "top: " + timeToPixels(fromTime) + "px; ";
		att5.value += "height: " + (timeToPixels(toTime) - timeToPixels(fromTime)) + "px; ";
		console.log(`daylightmarker => ${att5.value}`);

        daylightHighlighter.setAttributeNode(att3);
		daylightHighlighter.setAttributeNode(att4);
		daylightHighlighter.setAttributeNode(att5);

		daylightNode.appendChild( daylightHighlighter );
		console.log(`Created daylight node with fromTime ${fromTime} and toTime ${toTime}: \n${daylightHighlighter.id}`);

		return daylightNode;
	};

	/** theTime should be in 24 hour format: 0000 to 2399 */
	var timeToPixels = function(theTime) {
		var maxPixels = 1008;
		var maxTime = 2399;

		// Type-checking, reverts to 0 mark
		if (typeof theTime !== "number") {
			theTime = 0;
		}

		// Normalize minutes
		theTime = Math.floor((theTime - Math.floor(theTime/100) * 100) / 60 * 100) + (Math.floor(theTime /100) * 100)

		return Math.floor(theTime / maxTime * maxPixels);
	};

	/** Display message in Calendar popup system */
	var alertMessage = function(messageText) {

		// Create notification node
		var notifier = $('#ntowner')

		var alertDiv = document.createElement('div')
		var attId = document.createAttribute("id");
		attId.value = "nt2";
		var attClass = document.createAttribute("class");
		attClass.value = "mbox-cont";
		var attRole = document.createAttribute("role");
		attRole.value = "alert";
		var attAriaLive = document.createAttribute("aria-live");
		attAriaLive.value = "assertive";
		var attAriaAtomic = document.createAttribute("aria-atomic");
		attAriaAtomic.value = "true";
		var attAriaRelevant = document.createAttribute("aria-relevant");
		attAriaRelevant.value = "all";
		alertDiv.setAttributeNode(attId);
		alertDiv.setAttributeNode(attClass);
		alertDiv.setAttributeNode(attRole);
		alertDiv.setAttributeNode(attAriaLive);
		alertDiv.setAttributeNode(attAriaAtomic);
		alertDiv.setAttributeNode(attAriaRelevant);
		alertDiv.textContent = messageText; // message text content

		// Table node
		var alertTable = document.createElement('table')
		var tableClass = document.createAttribute("class");
		var tableCellpadding = document.createAttribute("cellpadding");
		var tableCellspacing = document.createAttribute("cellspacing");
		var tableRole = document.createAttribute("role");
		tableClass.value = "mbox";
		tableCellpadding.value = "0";
		tableCellspacing.value = "0";
		tableRole.value = "presentation";
		alertTable.setAttributeNode(tableClass);
		alertTable.setAttributeNode(tableCellpadding);
		alertTable.setAttributeNode(tableCellspacing);
		alertTable.setAttributeNode(tableRole);

		var alertHead = document.createElement('div')
		var headId = document.createAttribute("id");
		headId.value = "nt1"
		alertHead.setAttributeNode(headId);

		// Construction
		var alertTbody = document.createElement('tbody')
		var alertRow = document.createElement('tr')
		var alertColumn = document.createElement('td')
		alertColumn.appendChild(alertDiv);
		alertRow.appendChild(alertColumn);
		alertTbody.appendChild(alertRow);
		alertTable.appendChild(alertTbody);
		alertHead.appendChild(alertTable);
		notifier.appendChild(alertHead);

	};



	function sendPopupMessage(messageText) {
		chrome.runtime.sendMessage({greeting: messageText}, function(response) {
	  		console.log("[daylight.js] Response from popup: " + response.farewell);
		});
	};

	window.alreadyListening = false;
	if (!window.alreadyListening) {
		console.log("Adding message listener for the first time.")
		window.alreadyListening = true;

		chrome.runtime.onMessage.addListener(
			function(request, sender, sendResponse) {
				console.log("[daylight.js] Received message"
					+ (sender.tab ? " from a content script: " + sender.tab.url : " from the extension: ")
					+  request.greeting);
				if (request.greeting == "hello") {
					console.log("[daylight.js] Sending response: 'goodbye'");
					sendResponse({farewell: "goodbye"});
				}
			}
		);
	} else {
		console.log("Already listening... skipping.")
	}

	function showPosition(position) {
		window.lat=position.coords.latitude;
		window.lon=position.coords.longitude;
	};

	function errorHandler(error) {
		switch(error.code)
		{
			case error.PERMISSION_DENIED:
				message = "Daylight: Could not get position as permission was denied.";
				console.log(message);
				alertMessage(message);
				break;

			case error.POSITION_UNAVAILABLE:
				message = "Daylight: Could not get position as this information is not available at this time.";
				console.log(message);
				alertMessage(message);
				break;

			case error.TIMEOUT:
				message = "Daylight: Attempt to get position timed out.";
				console.log(message);
				alertMessage(message);
				break;

			default:
				message = "Daylight: Sorry, an error occurred. Code: "+error.code+" Message: "+error.message;
				console.log(message);
				alertMessage(message);
				break;
		}
	};

	if(navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(showPosition,errorHandler);
	}
	else {
		message = "Daylight: Sorry, your browser does not support geolocation services.";
		console.log(message);
		alertMessage(message);
	}



	console.log('Google Calendar Daylight loaded')

	var lastScrapeError = null;

	function requireScrapedValue(name, value) {
		if (value === null || typeof value === 'undefined') {
			throw new Error('Missing scraped value: ' + name);
		}
		return value;
	}
    
    setInterval(function() { 
    	// Don't execute if jQuery is absent for some weird reason
    	if (window.jQuery) {
			try {

			// Get the displayed year from the calendar header near the visible grid table.
			var yearText = '';
			var calendarTable = requireScrapedValue('calendar grid table', document.querySelector('table[role="grid"]'));
			var tableHeader = requireScrapedValue('calendar table header container', calendarTable.previousElementSibling);
			if (tableHeader) {
				var headerSpans = tableHeader.querySelectorAll('span');
				for (var s = 0; s < headerSpans.length; s++) {
					var spanNode = requireScrapedValue('header span at index ' + s, headerSpans[s]);
					var spanText = (spanNode.textContent || '').trim();
					if (/\b\d{4}\b/.test(spanText)) {
						yearText = spanText;
						break;
					}
				}
			}

			// Fallbacks for older/newer Google Calendar markup variants.
			if (!yearText && calendarTable) {
				yearText = calendarTable.getAttribute('aria-label') || '';
			}
			if (!yearText) {
				yearText = $('.date-picker-off .date-top').text() || '';
			}

			var yearMatch = yearText.match(/\b(\d{4})\b/);
			var year = yearMatch ? yearMatch[1] : (new Date()).getFullYear().toString();
			console.log(`Current year: ${year}`);

			// Get the "days" columns
			var days = $('div[role="columnheader"]');
			requireScrapedValue('first day column header', days.get(0));
			console.log(`Number of day columns: ${days.length}`);
			
			// Get the date for each day column
			var dates = days.children('h2');
			requireScrapedValue('first date heading under day column', dates.get(0));
			console.log(`Number of date columns: ${dates.length}`);

			// Target cells where daylight overlays should be inserted.
			var dayGridCells = $('div[role="gridcell"][data-column-index]').filter(function() {
				var columnIndex = $(this).attr('data-column-index');
				return columnIndex !== null && columnIndex !== 'null';
			});
			requireScrapedValue('first target grid cell', dayGridCells.get(0));
			console.log(`Number of target grid cells: ${dayGridCells.length}`);
			
			// Add the daylight highlighters
			var alreadypainted = $('div .daylight');
			console.log(`Number of already painted daylight highlighters: ${alreadypainted.length}`);

			if ( alreadypainted.length < 7 && window.lat != 0 && window.lon != 0) {
				console.group(`Adding daylight highlighters...`);
				for (i = 0; i <= days.length - 1; i++) {
					var dateHeading = requireScrapedValue('date heading for day index ' + i, dates[i]);
					var targetGridCell = requireScrapedValue('target grid cell for day index ' + i, dayGridCells.get(i));
					var rawDateLabel = requireScrapedValue('aria-label for day index ' + i, $(dateHeading).attr("aria-label"));
					var date = rawDateLabel.replace(/,\s*today\s*$/i, '').trim();
					var dateParts = date.split(',');
					var monthDayText = dateParts.length > 1 ? dateParts[1].trim() : '';
					var monthDayMatch = monthDayText.match(/^([A-Za-z]+)\s+(\d{1,2})$/);
					if (!monthDayMatch) {
						console.log(`Could not parse date label for day ${i}: ${date}`);
						continue;
					}

					var month = new Date(monthDayMatch[1] + ' 1, ' + year).getMonth();
					var day = parseInt(monthDayMatch[2], 10);
					console.log(`Day ${i}: month ${month + 1}, day ${day}`);

					var currDate = new Date(parseInt(year, 10), month, day, 0, 0, 0, 0);
					var sunstuff = SunCalc.getTimes(currDate, window.lat, window.lon);
					var sunrise = sunstuff.sunrise.getHours() * 100 + sunstuff.sunrise.getMinutes();
					var sunset = sunstuff.sunset.getHours()  * 100 + sunstuff.sunset.getMinutes();
					console.log(`Sunrise: ${sunrise}, Sunset: ${sunset}`);

					targetGridCell.insertBefore(
						makeHighlighter(sunrise, sunset),
						targetGridCell.firstChild);
					console.log(`Added daylight highlighter for day ${i}`);
				}
				console.groupEnd();
			}

			lastScrapeError = null;
			} catch (error) {
				if (error && error.message !== lastScrapeError) {
					console.error(`[daylight] ${error.message}`);
					lastScrapeError = error.message;
				}
			}
    	} 
    }, 500);

})();


