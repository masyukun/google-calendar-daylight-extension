(function () {
	var id = 'iekoigdlnhmafemfoamlnmhihmcfcklk';

	// Used for HTML ID generation. Gotta be unique, right?
	var idcount = 1;

	// Attach these to the window, where I can reach them.
    window.lat = 0.0;
    window.lon = 0.0;

    // Debug flag: set to false for production to suppress all console output
	let debugOutput = false;

	// Custom logging functions that respect debugOutput flag
	const log = function(message) {
		if (debugOutput) {
			console.log(message);
		}
	};

	const group = function(label) {
		if (debugOutput) {
			console.group(label);
		}
	};

	const groupEnd = function() {
		if (debugOutput) {
			console.groupEnd();
		}
	};

    // Let the user play with this at some point
	let astronomicalTwilightColor = '#FF88FF';
	let nauticalTwilightColor = '#88FFFF';
	let civilTwilightColor = '#8888FF';
	let sunriseSunsetColor = '#FF7777';
	let goldenHourColor = '#FFFF00';
	let daylightColor = '#FFFFCC';
	const colorStorageKey = 'daylightColorSettings';
	const locationStorageKey = 'daylightLocationSettings';
	let geolocationWatchId = null;
	let manualLocationEnabled = false;

	const defaultColors = {
		daylightColor: daylightColor,
		astronomicalTwilightColor: '#8888FF',
		nauticalTwilightColor: '#FF88FF',
		civilTwilightColor: '#88FFFF',
		sunriseSunsetColor: sunriseSunsetColor,
		goldenHourColor: goldenHourColor
	};

	const normalizeHexColor = function(value, fallback) {
		if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) {
			return value.toUpperCase();
		}
		return fallback;
	};

	const isExtensionContextValid = function() {
		try {
			return typeof chrome !== 'undefined' && !!(chrome.runtime && chrome.runtime.id);
		} catch (error) {
			return false;
		}
	};

	const safeStorageGet = function(defaults, callback) {
		if (!isExtensionContextValid()) {
			callback(defaults);
			return;
		}

		try {
			if (!chrome.storage || !chrome.storage.sync) {
				callback(defaults);
				return;
			}

			chrome.storage.sync.get(defaults, function(items) {
				try {
					if (!isExtensionContextValid()) {
						callback(defaults);
						return;
					}

					var runtimeError = null;
					try {
						runtimeError = chrome.runtime && chrome.runtime.lastError;
					} catch (error) {
						runtimeError = true;
					}

					if (runtimeError) {
						callback(defaults);
						return;
					}

					callback(items || defaults);
				} catch (error) {
					callback(defaults);
				}
			});
		} catch (error) {
			callback(defaults);
		}
	};

	const safeStorageSet = function(values) {
		if (!isExtensionContextValid()) {
			return;
		}

		try {
			if (!chrome.storage || !chrome.storage.sync) {
				return;
			}

			chrome.storage.sync.set(values);
		} catch (error) {
			// Ignore invalidated context during extension reloads.
		}
	};

	const applyOverlayColors = function(colors) {
		document.documentElement.style.setProperty('--daylight-color', normalizeHexColor(colors.daylightColor, defaultColors.daylightColor));
		document.documentElement.style.setProperty('--astronomical-twilight-color', normalizeHexColor(colors.astronomicalTwilightColor, defaultColors.astronomicalTwilightColor));
		document.documentElement.style.setProperty('--nautical-twilight-color', normalizeHexColor(colors.nauticalTwilightColor, defaultColors.nauticalTwilightColor));
		document.documentElement.style.setProperty('--civil-twilight-color', normalizeHexColor(colors.civilTwilightColor, defaultColors.civilTwilightColor));
		document.documentElement.style.setProperty('--sunrise-sunset-color', normalizeHexColor(colors.sunriseSunsetColor, defaultColors.sunriseSunsetColor));
		document.documentElement.style.setProperty('--golden-hour-color', normalizeHexColor(colors.goldenHourColor, defaultColors.goldenHourColor));
	};

	const persistAutoLocation = function(lat, lon) {
		if (manualLocationEnabled) {
			return;
		}

		safeStorageGet({ [locationStorageKey]: null }, function(items) {
			var current = items[locationStorageKey];
			if (current && current.manual) {
				return;
			}

			safeStorageSet({
				[locationStorageKey]: {
					manual: false,
					lat: lat,
					lon: lon,
					updatedAt: Date.now()
				}
			});
		});
	};

	const loadOverlayColors = function() {
		safeStorageGet({ [colorStorageKey]: defaultColors }, function(items) {
			var storedColors = items[colorStorageKey] || defaultColors;
			applyOverlayColors(storedColors);
		});
	};

	const clearPaintedOverlays = function() {
		$('div.daylight').each(function() {
			$(this).remove();
		});
	};

	const applyLocation = function(lat, lon) {
		if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
			return;
		}

		window.lat = lat;
		window.lon = lon;
		clearPaintedOverlays();
	};

	const stopGeolocationWatch = function() {
		if (geolocationWatchId !== null && navigator.geolocation) {
			navigator.geolocation.clearWatch(geolocationWatchId);
			geolocationWatchId = null;
		}
	};
    

	const makeHighlighter = function(daylightPeriods) {
		var periodColorMap = {
			'morningAstronomicalTwilight': 'astronomical-twilight',
			'morningNauticalTwilight':     'nautical-twilight',
			'morningCivilTwilight':        'civil-twilight',
			'sunrisePeriod':               'sunrise-sunset',
			'morningGoldenHour':           'golden-hour',
			'daytime':                     'daylight',
			'eveningGoldenHour':           'golden-hour',
			'sunsetPeriod':                'sunrise-sunset',
			'eveningCivilTwilight':        'civil-twilight',
			'eveningNauticalTwilight':     'nautical-twilight',
			'eveningAstronomicalTwilight': 'astronomical-twilight'
		};

		var daylightNode = document.createElement('div');

		// Create parent node
		var att1 = document.createAttribute("id");
		att1.value = "daylight" + idcount++;
		var att2 = document.createAttribute("class");
		att2.value = "daylight tg-col-overlaywrapper";
		daylightNode.setAttributeNode(att1);
		daylightNode.setAttributeNode(att2);

		// Create a child highlighter div for each period
		for (var periodName in daylightPeriods) {
			var period = daylightPeriods[periodName];
			var coloration = periodColorMap[periodName];
			if (!coloration) continue;

			var daylightHighlighter = document.createElement('div');
			var att3 = document.createAttribute("id");
			att3.value = `daylightmarker-${periodName}`;
			var att4 = document.createAttribute("class");
			att4.value = `tg-${coloration}-marker`;
			var att5 = document.createAttribute("style");
			att5.value = "top: " + timeToPixels(period.start) + "px; ";
			att5.value += "height: " + (timeToPixels(period.end) - timeToPixels(period.start)) + "px; ";
				log(`${coloration}-marker => ${att5.value}`);

			daylightHighlighter.setAttributeNode(att3);
			daylightHighlighter.setAttributeNode(att4);
			daylightHighlighter.setAttributeNode(att5);

			daylightNode.appendChild(daylightHighlighter);
		}

		log(`Created daylight node: ${daylightNode.id}`);
		return daylightNode;
	};

	/** theTime should be in 24 hour format: 0000 to 2399 */
	const timeToPixels = function(theTime) {
		var maxPixels = 960; // Changed from original of 1008;
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
	const alertMessage = function(messageText) {

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
		if (notifier && notifier.length) {
			notifier.append(alertHead);
		}

	};

	/** Convert a JavaScript Date object to Google Calendar time format */
	const asGCalTime = function(date) {
		return date.getHours() * 100 + date.getMinutes();
	};

	function sendPopupMessage(messageText) {
		if (!isExtensionContextValid()) {
			return;
		}

		try {
			if (!chrome.runtime || !chrome.runtime.sendMessage) {
				return;
			}

			chrome.runtime.sendMessage({greeting: messageText}, function(response) {
		  		if (!isExtensionContextValid() || !response) {
		  			return;
		  		}
		  		log("[daylight.js] Response from popup: " + response.farewell);
			});
		} catch (error) {
			// Ignore invalidated context during extension reloads.
		}
	};

	loadOverlayColors();

	window.alreadyListening = false;
	if (!window.alreadyListening) {
		log("Adding message listener for the first time.")
		window.alreadyListening = true;

		if (isExtensionContextValid()) {
			try {
				if (chrome.runtime && chrome.runtime.onMessage) {
					chrome.runtime.onMessage.addListener(
						function(request, sender, sendResponse) {
							if (request && request.type === 'daylightRequestCurrentLocation') {
								if (!navigator.geolocation) {
									sendResponse({ status: 'unavailable' });
									return;
								}

								navigator.geolocation.getCurrentPosition(function(position) {
									showPosition(position);
									sendResponse({
										status: 'ok',
										lat: position.coords.latitude,
										lon: position.coords.longitude
									});
								}, function(error) {
									if (error && error.code === 1) {
										sendResponse({ status: 'permission-denied' });
									} else {
										sendResponse({ status: 'error' });
									}
								}, {
									maximumAge: 60000,
									timeout: 10000
								});

								return true;
							}

							if (request && request.type === 'daylightColorsUpdated' && request.colors) {
								applyOverlayColors(request.colors);
								sendResponse({ status: 'ok' });
								return;
							}

							if (request && request.type === 'daylightLocationUpdated') {
								if (request.location && request.location.manual && typeof request.location.lat === 'number' && typeof request.location.lon === 'number') {
									manualLocationEnabled = true;
									stopGeolocationWatch();
									applyLocation(request.location.lat, request.location.lon);
								} else {
									manualLocationEnabled = false;
									if (request.location && typeof request.location.lat === 'number' && typeof request.location.lon === 'number') {
										applyLocation(request.location.lat, request.location.lon);
									}
									startGeolocationWatch();
								}
								sendResponse({ status: 'ok' });
								return;
							}

							log("[daylight.js] Received message"
								+ (sender.tab ? " from a content script: " + sender.tab.url : " from the extension: ")
								+  request.greeting);
							if (request.greeting == "hello") {
								log("[daylight.js] Sending response: 'goodbye'");
								sendResponse({farewell: "goodbye"});
							}
						}
					);
				}
			} catch (error) {
				// Ignore invalidated context during extension reloads.
			}
		}
	} else {
		log("Already listening... skipping.")
	}

	function showPosition(position) {
		manualLocationEnabled = false;
		applyLocation(position.coords.latitude, position.coords.longitude);
		persistAutoLocation(position.coords.latitude, position.coords.longitude);
	};

	function errorHandler(error) {
		switch(error.code)
		{
			case error.PERMISSION_DENIED:
				message = "Daylight: Could not get position as permission was denied.";
				log(message);
				alertMessage(message);
				break;

			case error.POSITION_UNAVAILABLE:
				message = "Daylight: Could not get position as this information is not available at this time.";
				log(message);
				alertMessage(message);
				break;

			case error.TIMEOUT:
				message = "Daylight: Attempt to get position timed out.";
				log(message);
				alertMessage(message);
				break;

			default:
				message = "Daylight: Sorry, an error occurred. Code: "+error.code+" Message: "+error.message;
				log(message);
				alertMessage(message);
				break;
		}
	};

	const startGeolocationWatch = function() {
		if (!navigator.geolocation || manualLocationEnabled) {
			return;
		}

		navigator.geolocation.getCurrentPosition(showPosition, errorHandler, {
			maximumAge: 60000,
			timeout: 10000
		});

		if (geolocationWatchId === null) {
			geolocationWatchId = navigator.geolocation.watchPosition(showPosition, errorHandler, {
				enableHighAccuracy: false,
				maximumAge: 60000,
				timeout: 15000
			});
		}
	};

	if (isExtensionContextValid() && chrome.storage && chrome.storage.sync) {
		safeStorageGet({ [locationStorageKey]: null }, function(items) {
			const loc = items[locationStorageKey];
			if (loc && loc.manual && typeof loc.lat === 'number' && typeof loc.lon === 'number') {
				manualLocationEnabled = true;
				stopGeolocationWatch();
				applyLocation(loc.lat, loc.lon);
			} else {
				manualLocationEnabled = false;
				if (loc && typeof loc.lat === 'number' && typeof loc.lon === 'number') {
					applyLocation(loc.lat, loc.lon);
				}
				startGeolocationWatch();
			}
		});
	} else if (navigator.geolocation) {
		startGeolocationWatch();
	} else {
		message = "Daylight: Sorry, your browser does not support geolocation services.";
		log(message);
		alertMessage(message);
	}



	log('Google Calendar Daylight loaded')

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

			// Skip non-grid routes where daylight overlays are not relevant.
			if (window.location && /\/eventedit|\/settings|\/tasks/.test(window.location.pathname)) {
				lastScrapeError = null;
				return;
			}

			// Get the displayed year from the calendar header near the visible grid table.
			var yearText = '';
			var calendarTable = document.querySelector('table[role="grid"]');
			if (!calendarTable) {
				lastScrapeError = null;
				return;
			}
			var tableHeader = calendarTable.previousElementSibling;
			if (tableHeader) {
				var headerSpans = tableHeader.querySelectorAll('span');
				for (var s = 0; s < headerSpans.length; s++) {
					var spanNode = headerSpans[s];
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
			// console.log(`Current year: ${year}`);

			// Get the "days" columns
			var days = $('div[role="columnheader"]');
			if (!days || days.length === 0) {
				lastScrapeError = null;
				return;
			}
			// console.log(`Number of day columns: ${days.length}`);
			
			// Get the date for each day column
			var dates = days.children('h2');
			if (!dates || dates.length === 0) {
				lastScrapeError = null;
				return;
			}
			// console.log(`Number of date columns: ${dates.length}`);

			// Target cells where daylight overlays should be inserted.
			var dayGridCells = $('div[role="gridcell"][data-column-index]').filter(function() {
				var columnIndex = $(this).attr('data-column-index');
				return columnIndex !== null && columnIndex !== 'null';
			});
			if (!dayGridCells || dayGridCells.length === 0) {
				lastScrapeError = null;
				return;
			}
			// console.log(`Number of target grid cells: ${dayGridCells.length}`);
			
			// Add the daylight highlighters
			var alreadypainted = $('div .daylight');
			var expectedOverlayCount = days.length;
			// console.log(`Number of already painted daylight highlighters: ${alreadypainted.length}`);

			if (alreadypainted.length < expectedOverlayCount && window.lat != 0 && window.lon != 0) {
				group(`Adding daylight highlighters...`);
				for (var i = 0; i <= days.length - 1; i++) {
					// Get oriented on where things are in the Calendar page
					var dateHeading = dates[i];
					var targetGridCell = dayGridCells.get(i);
					if (!dateHeading || !targetGridCell) {
						continue;
					}
					var rawDateLabel = $(dateHeading).attr("aria-label");
					if (!rawDateLabel) {
						continue;
					}
					
					// Format the date found on the page into something that SunCalc can understand.
					var date = rawDateLabel.replace(/,\s*today\s*$/i, '').trim();
					var dateParts = date.split(',');
					var monthDayText = dateParts.length > 1 ? dateParts[1].trim() : '';
					var monthDayMatch = monthDayText.match(/^([A-Za-z]+)\s+(\d{1,2})$/);
					if (!monthDayMatch) {
						// console.log(`Could not parse date label for day ${i}: ${date}`);
						continue;
					}
					var month = new Date(monthDayMatch[1] + ' 1, ' + year).getMonth();
					var day = parseInt(monthDayMatch[2], 10);
					log(`Day ${i}: month ${month + 1}, day ${day}`);

					// Get the SunCalc events for this date and location
					var currDate = new Date(parseInt(year, 10), month, day, 0, 0, 0, 0);
					var sunstuff = SunCalc.getTimes(currDate, window.lat, window.lon);

					var sunrise = asGCalTime(sunstuff.sunrise);
					var sunset = asGCalTime(sunstuff.sunset);
					// console.log(`Sunrise: ${sunrise}, Sunset: ${sunset}`);

					/**
					 * Period			Description
					 * ================	===========================================================
					// nightEnd			night ends (morning astronomical twilight starts)
					// nauticalDawn		nautical dawn (morning nautical twilight starts)
					// dawn				dawn (morning nautical twilight ends, morning civil twilight starts)
					// sunrise			sunrise (top edge of the sun appears on the horizon)
					// sunriseEnd		sunrise ends (bottom edge of the sun touches the horizon)
					// goldenHourEnd	morning golden hour (soft light, best time for photography) ends
					// solarNoon		solar noon (sun is in the highest position)
					// goldenHour		evening golden hour starts
					// sunsetStart		sunset starts (bottom edge of the sun touches the horizon)
					// sunset			sunset (sun disappears below the horizon, evening civil twilight starts)
					// dusk				dusk (evening nautical twilight starts)
					// nauticalDusk		nautical dusk (evening astronomical twilight starts)
					//
					// night			night starts (dark enough for astronomical observations)
					// nadir			nadir (darkest moment of the night, sun is in the lowest position)
					 */

					
					var nightEnd = asGCalTime(sunstuff.nightEnd);
					var nauticalDawn = asGCalTime(sunstuff.nauticalDawn);
					var dawn = asGCalTime(sunstuff.dawn);
					var sunrise = asGCalTime(sunstuff.sunrise);
					var sunriseEnd = asGCalTime(sunstuff.sunriseEnd);
					var goldenHourEnd = asGCalTime(sunstuff.goldenHourEnd);
					var solarNoon = asGCalTime(sunstuff.solarNoon);
					var goldenHour = asGCalTime(sunstuff.goldenHour);
					var sunsetStart = asGCalTime(sunstuff.sunsetStart);
					var sunset = asGCalTime(sunstuff.sunset);
					var dusk = asGCalTime(sunstuff.dusk);
					var nauticalDusk = asGCalTime(sunstuff.nauticalDusk);
					var night = asGCalTime(sunstuff.night);
					var nadir = asGCalTime(sunstuff.nadir);
					log(`\nNight End: ${nightEnd}, \nNautical Dawn: ${nauticalDawn}, \nDawn: ${dawn}, \nSunrise: ${sunrise}, \nSunrise End: ${sunriseEnd}, \nGolden Hour End: ${goldenHourEnd}, \nSolar Noon: ${solarNoon}, \nGolden Hour Start: ${goldenHour}, \nSunset Start: ${sunsetStart}, \nSunset: ${sunset}, \nDusk: ${dusk}, \nNautical Dusk: ${nauticalDusk}, \nNight: ${night}, \nNadir: ${nadir}\n\n\n`);

					// Periods of daylight
					let daylightPeriods = {
					 "morningAstronomicalTwilight": {"start": nightEnd,		"end": nauticalDawn},
					 "morningNauticalTwilight": 	{"start": nauticalDawn,	"end": dawn},
					 "morningCivilTwilight": 		{"start": dawn,			"end": sunrise},
					 "sunrisePeriod": 				{"start": sunrise,		"end": sunriseEnd},
					 "morningGoldenHour": 			{"start": sunriseEnd, 	"end": goldenHourEnd},
					 "daytime":						{"start": goldenHourEnd,"end": goldenHour},
					 "eveningGoldenHour": 			{"start": goldenHour,	"end": sunsetStart},
					 "sunsetPeriod": 				{"start": sunsetStart,	"end": sunset},
					 "eveningCivilTwilight": 		{"start": sunset,		"end": dusk},
					 "eveningNauticalTwilight": 	{"start": dusk,			"end": nauticalDusk},
					 "eveningAstronomicalTwilight": {"start": nauticalDusk,	"end": night}
					}
					targetGridCell.insertBefore(
						makeHighlighter(daylightPeriods),
						targetGridCell.firstChild);
						log(`Added daylight highlighter for day ${i}`);
				}
				groupEnd();
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


