google-calendar-daylight-extension
==================================

Chrome Extension that overlays daylight hours in Google Calendar based on your current location.

This project targets the current Google Calendar web host at https://calendar.google.com/calendar.

You can install the extension from the Chrome Web Store at:
https://chrome.google.com/webstore/detail/daylight-for-google-calen/iekoigdlnhmafemfoamlnmhihmcfcklk?hl=en

How It Works
------------

1. Manifest V3 content scripts are injected on supported Google Calendar URLs:
	- `jquery.min.js`
	- `suncalc/suncalc.js`
	- `daylight.js`
	- `daylight.css`

2. `daylight.js` requests browser geolocation (`navigator.geolocation`) and keeps latitude/longitude in memory.

3. On a polling loop (every 500ms), the script:
	- Scrapes the visible calendar year from the current Calendar grid/header.
	- Finds visible day headers and corresponding grid cells.
	- Parses each visible day label (for example, `Monday, March 16`).
	- Computes sunrise and sunset times for each day using SunCalc.
	- Inserts a daylight overlay block into each day column at the correct vertical time range.

4. To prevent duplicate overlays, the script checks for existing `.daylight` nodes before adding new ones.

Supported URLs
--------------

- https://calendar.google.com/calendar/*
- https://www.google.com/calendar/*
- https://google.com/calendar/*

Permissions And Data
--------------------

- Uses `activeTab` and host permissions for Google Calendar URLs.
- Uses browser geolocation only to calculate sunrise/sunset times.
- Location data is used locally in the page context and is not sent by this extension to external services.

Development (Load Unpacked)
----------------------------

1. Open Chrome and go to `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select this repository folder.
5. Open Google Calendar and verify daylight overlays appear.

Deployment (Chrome Web Store)
------------------------------

1. Update extension version.
	- Bump `version` in `manifest.json`.
	- Update the popup version text in `popup.html` (if you keep it synced with manifest).

2. Create a clean upload zip from the repository root.

```bash
zip -r -X webstore-upload-clean-stripped.zip \
  manifest.json background.js daylight.css daylight.js geolocation-128.png \
  icon.png icon16.png icon48.png icon128.png jquery.min.js LICENSE \
  popup.css popup.html popup.js popupbg.jpg README.md suncalc
```

3. Validate the archive before upload.

```bash
# integrity check
unzip -t webstore-upload-clean-stripped.zip

# verify manifest.json is at the zip root
unzip -l webstore-upload-clean-stripped.zip | awk '{print $4}' | grep -x "manifest.json"
```

4. Submit in the Chrome Web Store Developer Dashboard.
	- Upload `webstore-upload-clean-stripped.zip`.
	- Complete listing/release notes as needed.
	- Submit for review.

5. Publish after approval.
	- Roll out immediately or staged, depending on your release preference.
