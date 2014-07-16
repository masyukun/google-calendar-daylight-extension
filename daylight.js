(function() {
	var id = 'npmpegpegakgefmfoilnppbcaiejkcmp';
	
    var lat = 37.544459;
    var lon = -122.308042;

	var makeHighlighter = function(fromTime, toTime) {
		var daylightNode = document.createElement('div')

		// Create parent node
		var att1 = document.createAttribute("id");
		att1.value = "daylight";
		var att2 = document.createAttribute("class");
		att2.value = "tg-col-overlaywrapper";
		daylightNode.setAttributeNode(att1);
		daylightNode.setAttributeNode(att2);

		// Create child highlighter node
		var highlighter = document.createElement('div')
		var att3 = document.createAttribute("id");
		att3.value = "tgnowmarker";
		var att4 = document.createAttribute("class");
		att4.value = "tg-hourmarker tg-nowmarker";
		var att5 = document.createAttribute("style");
		att5.value = "top: " + timeToPixels(fromTime) + "px; ";
		att5.value += "height: " + (timeToPixels(toTime) - timeToPixels(fromTime)) + "px; ";
		att5.value += "border-top: 1px solid #DD0; border-bottom: 1px solid #DD0; background-color: #FF0; ";
		highlighter.setAttributeNode(att3);
		highlighter.setAttributeNode(att4);
		highlighter.setAttributeNode(att5);

		daylightNode.appendChild( highlighter );
		return daylightNode;
	};

	// TODO: Use the JavaScript time type
	/** theTime should be in 24 hour format: 0000 to 2399 */
	var timeToPixels = function(theTime) {
		var maxPixels = 1008;
		var maxTime = 2399;

		// Type-checking, reverts to 0 mark
		if (typeof theTime !== "number") {
			theTime = 0;
		}

		return Math.floor(theTime / maxTime * maxPixels);
	};

	console.log('Google Calendar Daylight loaded')
    setInterval(function() { 
    	// Don't execute if jQuery is absent for some weird reason
    	if (typeof jQuery !== 'undefined') {  

			// Get the displayed year
			var year = $('.date-picker-off .date-top').text()
			year = year.substring(year.length-4, year.length)

			// Get the "days" columns
			var days = $('#tgTable tbody').children().last().children();
			
			// Get the date for each day column



			// 
			if ($('#daylight') === null) {
				for (i = 1; i <= days.length - 1; i++) {
					var currDate = new Date( );
					var sunstuff = SunCalc.getTimes(currDate, lat, lon);

					days[i].insertBefore( 
						makeHighlighter(sunstuff.sunrise.getHours() * 100 + sunstuff.sunrise.getMinutes(), 
										sunstuff.sunset.getHours()  * 100 + sunstuff.sunset.getMinutes()),
						days[i].firstChild );
				}
			}

    	} 
    }, 500);

})();


