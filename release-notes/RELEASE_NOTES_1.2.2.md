Release Notes - 1.2.2
======================

Release Date: 2026-05-02

Summary
-------

Version `1.2.2` focuses on geolocation reliability and cleaner popup-content coordination while preserving storage-driven settings sync.

Changed
-------

- Simplified popup and content-script coordination so runtime messaging is only used where required for live geolocation requests.
- Kept color and location updates synchronized through `chrome.storage.sync` for predictable settings behavior.

Fixed
-----

- Restored reliable geolocation retrieval flow from the popup when working against the active Google Calendar tab.
- Resolved regressions introduced during earlier communication-path refactors that could prevent location acquisition.

Technical Notes
---------------

- The popup About panel loads release notes dynamically from `RELEASE_NOTES_<version>.md`, based on `manifest.json` version.
- With manifest set to `1.2.2`, the About panel now resolves to `RELEASE_NOTES_1.2.2.md` automatically.
