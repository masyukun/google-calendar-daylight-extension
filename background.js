window.didIt = false;
window.injectedAlready = false;

if (!window.didIt) {
    window.didIt = true;
    if (chrome.tabs) {
        chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
            if (changeInfo.status !== 'complete') {
                return;
            }
            if (!window.injectedAlready) {
                window.injectedAlready = true;
                var match = 'https://www.google.com/calendar/render';
                if (tab.url.substring(0, match.length) === match) {
                	chrome.tabs.executeScript(tabId, { file: 'jquery.min.js' });
                    chrome.tabs.executeScript(tabId, { file: 'daylight.js' });
                }
            }
        });
    }
}
