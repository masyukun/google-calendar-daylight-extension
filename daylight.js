(function() {
	var id = 'iekoigdlnhmafemfoamlnmhihmcfcklk';
	
	// Used for HTML ID generation. Gotta be unique, right?
	var idcount = 1;

	// Attach these to the window, where I can reach them.
    window.lat = 0.0;
    window.lon = 0.0;

    // Let the user play with this at some point
    var daylightColor = '#FFFFCC';


	var makeHighlighter = function(fromTime, toTime) {
		var daylightNode = document.createElement('div')

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
		att3.value = "tgnowmarker";
		var att4 = document.createAttribute("class");
		att4.value = "tg-hourmarker tg-nowmarker";
		var att5 = document.createAttribute("style");
		att5.value = "top: " + timeToPixels(fromTime) + "px; ";
		att5.value += "height: " + (timeToPixels(toTime) - timeToPixels(fromTime)) + "px; ";
		att5.value += "border-top: 1px solid #DD0; border-bottom: 1px solid #DD0; background-color: "+daylightColor+"; opacity: 0.5 ";
		daylightHighlighter.setAttributeNode(att3);
		daylightHighlighter.setAttributeNode(att4);
		daylightHighlighter.setAttributeNode(att5);

		daylightNode.appendChild( daylightHighlighter );
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



	function showPosition(position)
	{
		window.lat=position.coords.latitude;
		window.lon=position.coords.longitude;
	};

	function errorHandler(error)
	{
		switch(error.code)
		{
			case error.PERMISSION_DENIED:
				console.log("Could not get position as permission was denied.");
				break;

			case error.POSITION_UNAVAILABLE:
				console.log("Could not get position as this information is not available at this time.");
				break;

			case error.TIMEOUT:
				console.log("Attempt to get position timed out.");
				break;

			default:
				console.log("Sorry, an error occurred. Code: "+error.code+" Message: "+error.message);
				break;
		}
	};

	if(navigator.geolocation)
	{
		navigator.geolocation.getCurrentPosition(showPosition,errorHandler);
	}
	else
	{
		console.log("Sorry, your browser does not support geolocation services.");
	}



	console.log('Google Calendar Daylight loaded')
    setInterval(function() { 


    	// Don't execute if jQuery is absent for some weird reason
    	if (window.jQuery) {

			// Get the displayed year
			var year = $('.date-picker-off .date-top').text()
			year = year.substring(year.length-4, year.length)

			// Get the "days" columns
			var days = $('#tgTable tbody').children().last().children();
			
			// Get the date for each day column
			var dates = $('tr.wk-daynames').children();
			
			// Add the daylight highlighters
			var alreadypainted = $('div .daylight');
			if ( alreadypainted.length < 7 && window.lat != 0 && window.lon != 0) {
				for (i = 1; i <= days.length - 1; i++) {
					var date = $(dates[i]).attr("title");
					date = date.substring(4, date.length);
					date = date.split('/');
					var month = date[0];
					var day = date[1];

					var currDate = new Date( year, month, day, 0, 0, 0, 0);
					var sunstuff = SunCalc.getTimes(currDate, window.lat, window.lon);
					var sunrise = sunstuff.sunrise.getHours() * 100 + sunstuff.sunrise.getMinutes();
					var sunset = sunstuff.sunset.getHours()  * 100 + sunstuff.sunset.getMinutes();

					days[i].insertBefore( 
						makeHighlighter(sunrise, sunset),
						days[i].firstChild );
				}
			}
    	}
    }, 500);

})();


