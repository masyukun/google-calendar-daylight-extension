Release Notes - 1.2.0
======================

Release Date: 2026-04-19

Summary
-------

Version `1.2.0` introduces customizable location and color controls, expands daylight rendering to include additional solar phases, and improves compatibility with current Google Calendar layout behavior.

Added
-----

- Manual location mode in popup with latitude/longitude validation.
- Auto-location reset and geolocation permission retry actions.
- Place-name search from popup location status (forward geocoding).
- Location history panel with quick apply and delete actions.
- City/region resolution from coordinates (reverse geocoding).
- Color pickers for six overlay phases:
  - Daylight
  - Astronomical twilight
  - Nautical twilight
  - Civil twilight
  - Sunrise/Sunset
  - Golden hour

Changed
-------

- Overlay rendering now paints multiple solar periods instead of only a single sunrise/sunset daylight block.
- Color and location settings persist with `chrome.storage.sync`.
- Manifest updated to include `storage` permission and Nominatim host permission.
- Popup UI updated to expose location workflow and per-phase color settings.

Fixed
-----

- Improved rendering behavior for current Google Calendar tray/column sizing.
- Reduced noisy console logging in production paths.

Permissions and Data Notes
--------------------------

- Uses geolocation for sunrise/sunset and phase calculations.
- Stores location and color preferences in Chrome sync storage.
- Uses OpenStreetMap Nominatim endpoints for place lookup and city labeling:
  - `https://nominatim.openstreetmap.org/search`
  - `https://nominatim.openstreetmap.org/reverse`
