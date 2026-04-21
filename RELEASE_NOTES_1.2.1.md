Release Notes - 1.2.1
======================

Release Date: 2026-04-20

Summary
-------

Version `1.2.1` improves overlay placement accuracy across Google Calendar appearance modes by replacing the hardcoded tray height assumption with runtime grid-height measurement.

Changed
-------

- Replaced fixed `maxPixels = 960` overlay scaling assumption with dynamic measurement of the rendered calendar grid cell height.
- Updated time-to-pixel conversion to accept measured grid height at render time.
- Updated highlighter generation path to pass measured height through the overlay placement pipeline.

Fixed
-----

- Daylight/twilight overlay vertical positioning now adapts correctly in both Google Calendar appearance modes:
  - Compact
  - Responsive to your screen

Technical Notes
---------------

- Grid height is measured from the day grid cell container set before each render cycle.
- A safe fallback height is retained if a reliable measurement is temporarily unavailable.
