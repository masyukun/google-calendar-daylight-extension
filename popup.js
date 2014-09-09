var listeningAlready = false;

function sendContentMessage(event) {
    event = event || window.event //cross-browser event
    event.stopPropagation ? event.stopPropagation() : (event.cancelBubble=true)

    var messageObject = {
        opacity: document.getElementById("opacityControl"),
        location: document.getElementById("geoControl")
    };
    var messageText = "hello";
    console.log('Sending message: ['+messageText+']')
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {greeting: messageText}, function(response) {
            console.log("[popup.js] Response from content: " + response.farewell);
        });
    });
};

function showPosition(position) {
    var geoControl = document.getElementById("geoControl");
    geoControl.value = position.coords.latitude + ", " + position.coords.longitude;
};

function errorHandler(error) {
    switch(error.code)
    {
        case error.PERMISSION_DENIED:
            console.log("Could not get position as permission was denied.");
            var geoControl = document.getElementById("geoControl");
            geoControl.value = "PERMISSION DENIED";
            break;

        case error.POSITION_UNAVAILABLE:
            console.log("Could not get position as this information is not available at this time.");
            var geoControl = document.getElementById("geoControl");
            geoControl.value = "POSITION UNAVAILABLE";
            break;

        case error.TIMEOUT:
            console.log("Attempt to get position timed out.");
            var geoControl = document.getElementById("geoControl");
            geoControl.value = "TIMEOUT";
            break;

        default:
            console.log("Sorry, an error occurred. Code: "+error.code+" Message: "+error.message);
            var geoControl = document.getElementById("geoControl");
            geoControl.value = "ERROR: " + error.message;
            break;
    }
};


// On page load
window.addEventListener("load", function load(event){
    window.removeEventListener("load", load, false); //remove listener, no longer needed
    console.log("In page load code.");
    
    var theButton = document.getElementById("clickMe");
    if (theButton) {
        // Add click listener for button
        if (!listeningAlready) {
            listeningAlready = true;
            console.log("Adding button click event listener for the first time.")
            window.debugButton = theButton;
            theButton.addEventListener("click", sendContentMessage, false);
            
            if(navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(showPosition,errorHandler);
            }
            else {
                console.log("Sorry, your browser does not support geolocation services.");
            }

        } else {
            console.log("Already added button click... skipping.")
        }
    } else {
        console.log("Button not ready yet for event adding.")
    }
},false);
