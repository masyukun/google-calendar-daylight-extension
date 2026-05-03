google-calendar-daylight-extension
==================================

Chrome Extension that overlays daylight hours in Google Calendar based on your current location.

This project targets the current Google Calendar web host at https://calendar.google.com/calendar.

You can install the extension from the Chrome Web Store at:
https://chrome.google.com/webstore/detail/daylight-for-google-calen/iekoigdlnhmafemfoamlnmhihmcfcklk?hl=en

Release Highlights (v1.2.2)
---------------------------

- Improved popup geolocation reliability when requesting location from the active Calendar tab.
- Simplified popup/content-script coordination while keeping settings sync via `chrome.storage.sync`.

Release Highlights (v1.2.1)
---------------------------

- Replaced fixed overlay height scaling with runtime measurement of rendered day-grid height.
- Improved overlay vertical positioning accuracy across Google Calendar appearance modes.

Release Highlights (v1.2.0)
---------------------------

- Added manual location controls in the popup (latitude/longitude entry, reset to auto location, and geolocation retry).
- Added location history in the popup, including quick reuse and delete actions.
- Added geocoding and reverse-geocoding support using OpenStreetMap Nominatim so locations can display as city/region and be searched by place name.
- Added persistent color customization for each daylight phase (saved via Chrome sync storage).
- Expanded overlays from a single daylight block to multiple solar phases (astronomical, nautical, civil twilight, sunrise/sunset, golden hour, daylight).
- Added overlay fade-in transitions and updated sizing behavior for current Google Calendar tray/layout rendering.

Release Notes (v1.2.2)
-----------------------

See [release-notes/RELEASE_NOTES_1.2.2.md](release-notes/RELEASE_NOTES_1.2.2.md) for the full summary.

### Changed

- Simplified popup/content runtime messaging so it is used only where needed for live geolocation requests.
- Kept color and location updates synchronized via `chrome.storage.sync`.

### Fixed

- Restored reliable popup geolocation retrieval flow on active Google Calendar tabs.
- Resolved messaging-refactor regressions that could prevent location acquisition.

Release Notes (v1.2.1)
-----------------------

See [release-notes/RELEASE_NOTES_1.2.1.md](release-notes/RELEASE_NOTES_1.2.1.md) for the full summary.

### Changed

- Replaced fixed `maxPixels = 960` overlay scaling assumption with dynamic calendar grid-height measurement.
- Updated time-to-pixel conversion/render path to use measured height during placement.

### Fixed

- Overlay placement now adapts correctly in both Google Calendar appearance modes:
	- Compact
	- Responsive to your screen

Release Notes (v1.2.0)
-----------------------

See [release-notes/RELEASE_NOTES_1.2.0.md](release-notes/RELEASE_NOTES_1.2.0.md) for the full summary.

### Added

- Manual location mode with validation for latitude (`-90` to `90`) and longitude (`-180` to `180`).
- Location history panel in popup with quick-apply and delete controls.
- Place-name search from the popup (forward geocoding).
- City/region display for active coordinates (reverse geocoding).
- Per-phase overlay color controls for:
	- Daylight
	- Astronomical twilight
	- Nautical twilight
	- Civil twilight
	- Sunrise/Sunset
	- Golden hour

### Changed

- Overlay rendering now paints multiple daylight and twilight periods instead of only a sunrise-to-sunset block.
- Extension now persists user settings (colors and location mode) with Chrome sync storage.
- Popup version and controls updated for the new location and color workflows.

### Fixed

- Better visual behavior with updated Google Calendar column/tray sizing.
- Reduced noisy logging in production paths.

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
	- Computes solar phases for each day using SunCalc (twilight phases, sunrise/sunset, golden hour, and daylight).
	- Inserts stacked overlay blocks into each day column at the correct vertical time ranges.

4. To prevent duplicate overlays, the script checks for existing `.daylight` nodes before adding new ones.

5. User-selected settings are loaded from `chrome.storage.sync` and applied live:
	- Popup color changes are sent to the active Calendar tab.
	- Popup location changes switch between manual and auto geolocation modes.
	- Stored auto location can be refreshed with geolocation retry.

Supported URLs
--------------

- https://calendar.google.com/calendar/*
- https://www.google.com/calendar/*
- https://google.com/calendar/*

Permissions And Data
--------------------

- Uses `activeTab`, `storage`, and host permissions for Google Calendar and OpenStreetMap Nominatim URLs.
- Uses browser geolocation only to calculate sunrise/sunset times.
- Location data and color preferences are stored in Chrome sync storage for extension settings persistence.
- Location lookups for city names and place search use OpenStreetMap Nominatim endpoints:
	- `https://nominatim.openstreetmap.org/reverse`
	- `https://nominatim.openstreetmap.org/search`
	Only query coordinates/place text are sent to Nominatim for these lookups.

Using The Popup (v1.2.0)
------------------------

1. Open the extension popup while on Google Calendar.
2. Configure location:
	- Enter latitude and longitude and click **Save Location** for manual mode.
	- Click the location status text to type a city/place name.
	- Click **Reset to Default** to return to auto geolocation mode.
	- Click **Retry Geolocation Permission** if browser permission was denied earlier.
3. Configure colors for each daylight/twilight phase and click **Save Colors**.
4. Use the **H** button to open location history and quickly re-apply a past location.

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

	Important: include the current `release-notes/RELEASE_NOTES_<version>.md` file so the popup About panel can load notes for the manifest version.

```bash
zip -r -X webstore-upload-clean-stripped.zip \
  manifest.json background.js daylight.css daylight.js geolocation-128.png \
	icon.png icon16.png icon48.png icon128.png jquery.min.js LICENSE \
	popup.css popup.html popup.js popupbg.jpg README.md release-notes/RELEASE_NOTES_1.2.2.md suncalc
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
