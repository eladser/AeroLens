# Changelog

## [Unreleased]

### Performance
- Throttled React state updates from 60fps to 15fps in aircraft interpolation hook
- Added position change threshold (0.0001°, ~11m) to skip sub-pixel marker updates
- Added heading change threshold (5°) to avoid unnecessary icon rebuilds
- Implemented tooltip content caching with key-based invalidation
- Debounced delay prediction API calls (500ms) to prevent request flooding

### UI/UX
- Added "can take up to 30 seconds" hint to loading screen
- Added description text to Disruption Assistant section
- Made weather forecast section collapsible (collapsed by default) to reduce scrolling
- Added hover tooltips to header action buttons
- Fixed recent search click not working (onMouseDown preventDefault pattern)
- Fixed selection ring not following moving aircraft (synced interpolated position)
- Added weather stats grid to Disruption Assistant when conditions are favorable

### Reliability
- Added rate limit error handling with user-friendly messages
- Weather API 429 errors now show "temporarily unavailable" instead of failing silently
- Delay predictions show rate limit state instead of infinite loading

### Code Quality
- Reduced tooltip delay from 300ms to 150ms for snappier feel
- Consolidated rate limit error checking into shared `isRateLimitError` helper
