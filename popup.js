const COLOR_STORAGE_KEY = 'daylightColorSettings';
const LOCATION_STORAGE_KEY = 'daylightLocationSettings';
const LOCATION_HISTORY_KEY = 'daylightLocationHistory';
const GEOCODE_CACHE = {};
let locationStatusRequestId = 0;
let isLocationStatusEditing = false;

const DEFAULT_COLORS = {
    daylightColor: '#FFFFCC',
    astronomicalTwilightColor: '#8888FF',
    nauticalTwilightColor: '#FF88FF',
    civilTwilightColor: '#88FFFF',
    sunriseSunsetColor: '#FF7777',
    goldenHourColor: '#FFFF00'
};

function normalizeHexColor(value, fallback) {
    if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) {
        return value.toUpperCase();
    }
    return fallback;
}

function setStatus(message) {
    const statusNode = document.getElementById('saveStatus');
    if (statusNode) {
        statusNode.textContent = message;
    }
}

function setLocationStatus(message) {
    const node = document.getElementById('locationStatus');
    if (node && !isLocationStatusEditing) node.textContent = message;
}

function setLocationSaveStatus(message) {
    const node = document.getElementById('locationSaveStatus');
    if (node) node.textContent = message;
}

function setHistoryPanelVisible(visible) {
    const mainPanel = document.getElementById('mainPanel');
    const historyPanel = document.getElementById('historyPanel');
    if (!mainPanel || !historyPanel) return;
    mainPanel.style.display = visible ? 'none' : 'block';
    historyPanel.style.display = visible ? 'block' : 'none';
}

function setRetryButtonVisible(visible) {
    const retryButton = document.getElementById('retryGeolocation');
    if (!retryButton) return;
    retryButton.style.display = visible ? 'inline-block' : 'none';
}

function setResetButtonVisible(visible) {
    const resetButton = document.getElementById('autoLocation');
    if (!resetButton) return;
    resetButton.style.display = visible ? 'inline-block' : 'none';
}

function formatLocation(lat, lon) {
    return parseFloat(lat).toFixed(4) + ', ' + parseFloat(lon).toFixed(4);
}

function cityCacheKey(lat, lon) {
    return parseFloat(lat).toFixed(2) + ',' + parseFloat(lon).toFixed(2);
}

function fetchNearestCityName(lat, lon) {
    const key = cityCacheKey(lat, lon);
    if (GEOCODE_CACHE[key]) {
        return Promise.resolve(GEOCODE_CACHE[key]);
    }

    const url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat='
        + encodeURIComponent(lat)
        + '&lon=' + encodeURIComponent(lon)
        + '&zoom=10&addressdetails=1';

    return fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Accept-Language': navigator.language || 'en'
        }
    })
        .then(function(resp) {
            if (!resp.ok) {
                throw new Error('reverse geocode failed');
            }
            return resp.json();
        })
        .then(function(data) {
            const address = data && data.address ? data.address : {};
            const city = address.city || address.town || address.village || address.municipality || address.hamlet || address.county || null;
            const region = address.state || address.region || address.country || null;

            if (!city && !region) {
                return null;
            }

            const cityLabel = city && region ? city + ', ' + region : (city || region);
            GEOCODE_CACHE[key] = cityLabel;
            return cityLabel;
        })
        .catch(function() {
            return null;
        });
}

function fetchCoordinatesFromQuery(query) {
    const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q='
        + encodeURIComponent(query);

    return fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Accept-Language': navigator.language || 'en'
        }
    })
        .then(function(resp) {
            if (!resp.ok) {
                throw new Error('forward geocode failed');
            }
            return resp.json();
        })
        .then(function(results) {
            if (!results || !results.length) {
                return null;
            }

            const first = results[0];
            const lat = parseFloat(first.lat);
            const lon = parseFloat(first.lon);
            if (!isValidCoordinatePair(lat, lon)) {
                return null;
            }

            return { lat: lat, lon: lon };
        })
        .catch(function() {
            return null;
        });
}

function setLocationStatusFromCoordinates(mode, lat, lon) {
    const requestId = ++locationStatusRequestId;
    setLocationStatus(mode + ': resolving city...');

    fetchNearestCityName(lat, lon).then(function(cityName) {
        if (requestId !== locationStatusRequestId) {
            return;
        }

        if (cityName) {
            setLocationStatus(mode + ': ' + cityName);
        } else {
            setLocationStatus(mode + ': ' + formatLocation(lat, lon));
        }
    });
}

function parseStatusCityText() {
    const node = document.getElementById('locationStatus');
    if (!node) return '';
    const text = (node.textContent || '').trim();
    const parts = text.split(': ');
    if (parts.length > 1) {
        return parts.slice(1).join(': ').trim();
    }
    return text;
}

function exitLocationStatusEditMode(restoreText) {
    const node = document.getElementById('locationStatus');
    if (!node) return;
    isLocationStatusEditing = false;
    node.textContent = restoreText;
}

function applyTypedLocationQuery(query) {
    const trimmed = (query || '').trim();
    if (!trimmed) {
        setLocationSaveStatus('Enter a location name');
        return;
    }

    setLocationSaveStatus('Resolving location...');
    fetchCoordinatesFromQuery(trimmed).then(function(coords) {
        if (!coords) {
            setLocationSaveStatus('Location not found');
            return;
        }

        document.getElementById('latInput').value = coords.lat;
        document.getElementById('lonInput').value = coords.lon;
        saveLocation();
    });
}

function enterLocationStatusEditMode() {
    if (isLocationStatusEditing) {
        return;
    }

    const node = document.getElementById('locationStatus');
    if (!node) return;

    const current = parseStatusCityText();
    isLocationStatusEditing = true;

    node.textContent = '';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'locationNameInput';
    input.placeholder = 'Type city or place';
    input.value = current;

    const goButton = document.createElement('button');
    goButton.className = 'inlineActionButton';
    goButton.textContent = 'Go';

    const cancelButton = document.createElement('button');
    cancelButton.className = 'inlineActionButton';
    cancelButton.textContent = 'Cancel';

    const closeEditor = function() {
        exitLocationStatusEditMode(current || 'loading...');
    };

    goButton.addEventListener('click', function(event) {
        event.stopPropagation();
        const typedValue = input.value;
        exitLocationStatusEditMode('resolving...');
        applyTypedLocationQuery(typedValue);
    });

    cancelButton.addEventListener('click', function(event) {
        event.stopPropagation();
        closeEditor();
    });

    input.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const typedValue = input.value;
            exitLocationStatusEditMode('resolving...');
            applyTypedLocationQuery(typedValue);
            return;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            closeEditor();
        }
    });

    node.appendChild(input);
    node.appendChild(goButton);
    node.appendChild(cancelButton);
    input.focus();
    input.select();
}

function getLocationHistory(callback) {
    chrome.storage.sync.get({ [LOCATION_HISTORY_KEY]: [] }, function(items) {
        callback(items[LOCATION_HISTORY_KEY] || []);
    });
}

function saveLocationHistory(history) {
    chrome.storage.sync.set({ [LOCATION_HISTORY_KEY]: history });
}

function applyCurrentLocationFromHistory(item) {
    if (!item || !isValidCoordinatePair(item.lat, item.lon)) {
        return;
    }

    const location = {
        lat: item.lat,
        lon: item.lon,
        manual: true,
        updatedAt: Date.now()
    };

    chrome.storage.sync.set({ [LOCATION_STORAGE_KEY]: location }, function() {
        if (chrome.runtime.lastError) {
            setLocationSaveStatus('Could not apply saved location');
            return;
        }

        document.getElementById('latInput').value = item.lat;
        document.getElementById('lonInput').value = item.lon;
        setLocationStatusFromCoordinates('manual', item.lat, item.lon);
        setLocationSaveStatus('Using saved location: ' + item.cityName);
        setResetButtonVisible(true);
        setRetryButtonVisible(false);
        notifyActiveCalendarTabLocation(location);
        setHistoryPanelVisible(false);
    });
}

function renderLocationHistory() {
    getLocationHistory(function(history) {
        const list = document.getElementById('locationHistoryList');
        const emptyState = document.getElementById('historyEmptyState');
        if (!list || !emptyState) return;

        list.innerHTML = '';

        if (!history.length) {
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        history.forEach(function(item, index) {
            const row = document.createElement('li');
            row.className = 'historyItem';

            const textWrap = document.createElement('div');
            const city = document.createElement('div');
            city.className = 'historyCity';
            city.textContent = item.cityName;

            const coords = document.createElement('div');
            coords.className = 'historyCoords';
            coords.textContent = formatLocation(item.lat, item.lon);

            textWrap.appendChild(city);
            textWrap.appendChild(coords);

            textWrap.style.cursor = 'pointer';
            textWrap.title = 'Use this location';
            textWrap.addEventListener('click', function() {
                applyCurrentLocationFromHistory(item);
            });

            const del = document.createElement('button');
            del.className = 'historyDelete';
            del.textContent = 'X';
            del.title = 'Delete location';
            del.addEventListener('click', function(event) {
                event.stopPropagation();
                getLocationHistory(function(current) {
                    current.splice(index, 1);
                    saveLocationHistory(current);
                    renderLocationHistory();
                });
            });

            row.appendChild(textWrap);
            row.appendChild(del);
            list.appendChild(row);
        });
    });
}

function addLocationToHistory(cityName, lat, lon) {
    if (!cityName) return;

    const cityKeyFromName = function(name) {
        return (name || '')
            .split(',')[0]
            .trim()
            .toLowerCase();
    };

    getLocationHistory(function(history) {
        const normalizedCity = cityKeyFromName(cityName);
        const alreadyExists = history.some(function(item) {
            return cityKeyFromName(item.cityName) === normalizedCity;
        });

        if (alreadyExists) {
            return;
        }

        const entry = {
            cityName: cityName,
            lat: lat,
            lon: lon,
            updatedAt: Date.now()
        };

        history.unshift(entry);
        saveLocationHistory(history);
        renderLocationHistory();
    });
}

function storeLocationInHistory(lat, lon) {
    fetchNearestCityName(lat, lon).then(function(cityName) {
        if (!cityName) {
            return;
        }
        addLocationToHistory(cityName, lat, lon);
    });
}

function isValidCoordinatePair(lat, lon) {
    return typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon);
}

function getCurrentFormColors() {
    return {
        daylightColor: normalizeHexColor(document.getElementById('daylightColor').value, DEFAULT_COLORS.daylightColor),
        astronomicalTwilightColor: normalizeHexColor(document.getElementById('astronomicalTwilightColor').value, DEFAULT_COLORS.astronomicalTwilightColor),
        nauticalTwilightColor: normalizeHexColor(document.getElementById('nauticalTwilightColor').value, DEFAULT_COLORS.nauticalTwilightColor),
        civilTwilightColor: normalizeHexColor(document.getElementById('civilTwilightColor').value, DEFAULT_COLORS.civilTwilightColor),
        sunriseSunsetColor: normalizeHexColor(document.getElementById('sunriseSunsetColor').value, DEFAULT_COLORS.sunriseSunsetColor),
        goldenHourColor: normalizeHexColor(document.getElementById('goldenHourColor').value, DEFAULT_COLORS.goldenHourColor)
    };
}

function applyColorsToForm(colors) {
    document.getElementById('daylightColor').value = colors.daylightColor;
    document.getElementById('astronomicalTwilightColor').value = colors.astronomicalTwilightColor;
    document.getElementById('nauticalTwilightColor').value = colors.nauticalTwilightColor;
    document.getElementById('civilTwilightColor').value = colors.civilTwilightColor;
    document.getElementById('sunriseSunsetColor').value = colors.sunriseSunsetColor;
    document.getElementById('goldenHourColor').value = colors.goldenHourColor;
}

function notifyActiveCalendarTab(colors) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs || tabs.length === 0) {
            return;
        }

        chrome.tabs.sendMessage(tabs[0].id, {
            type: 'daylightColorsUpdated',
            colors: colors
        }, function() {
            // Ignore runtime messaging errors when not on a Calendar tab.
            void chrome.runtime.lastError;
        });
    });
}

function notifyActiveCalendarTabLocation(location) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs || tabs.length === 0) return;
        chrome.tabs.sendMessage(tabs[0].id, {
            type: 'daylightLocationUpdated',
            location: location
        }, function() {
            void chrome.runtime.lastError;
        });
    });
}

function sendMessageToActiveTab(payload, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs || tabs.length === 0) {
            callback(null, 'No active tab');
            return;
        }

        chrome.tabs.sendMessage(tabs[0].id, payload, function(response) {
            if (chrome.runtime.lastError) {
                callback(null, chrome.runtime.lastError.message || 'Could not message tab');
                return;
            }

            callback(response, null);
        });
    });
}

function requestGeolocation(onSuccess, onError) {
    sendMessageToActiveTab({ type: 'daylightRequestCurrentLocation' }, function(response, err) {
        if (response && response.status === 'ok' && isValidCoordinatePair(response.lat, response.lon)) {
            onSuccess(response.lat, response.lon);
            return;
        }

        if (response && response.status === 'permission-denied') {
            onError({ code: 1, message: 'Permission denied' });
            return;
        }

        if (response && response.status === 'unavailable') {
            onError({ code: 2, message: 'Position unavailable' });
            return;
        }

        // Fallback for cases where popup is opened away from Calendar tab.
        if (!navigator.geolocation) {
            onError({ code: -1, message: err || 'Geolocation unavailable' });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            function(position) {
                onSuccess(position.coords.latitude, position.coords.longitude);
            },
            function(error) {
                onError(error);
            },
            { maximumAge: 60000, timeout: 10000 }
        );
    });
}

function saveAutoLocationAndNotify(lat, lon, statusMessage) {
    const autoLocation = { manual: false, lat: lat, lon: lon, updatedAt: Date.now() };
    chrome.storage.sync.set({ [LOCATION_STORAGE_KEY]: autoLocation }, function() {
        if (chrome.runtime.lastError) {
            setLocationSaveStatus('Save failed');
            return;
        }

        document.getElementById('latInput').value = lat;
        document.getElementById('lonInput').value = lon;
        setLocationStatusFromCoordinates('auto', lat, lon);
        setResetButtonVisible(false);
        setRetryButtonVisible(false);
        if (statusMessage) {
            setLocationSaveStatus(statusMessage);
        }
        storeLocationInHistory(lat, lon);
        notifyActiveCalendarTabLocation(autoLocation);
    });
}

function saveColors() {
    const colors = getCurrentFormColors();
    chrome.storage.sync.set({ [COLOR_STORAGE_KEY]: colors }, function() {
        if (chrome.runtime.lastError) {
            setStatus('Save failed');
            return;
        }

        setStatus('Saved');
        notifyActiveCalendarTab(colors);
    });
}

function resetColors() {
    applyColorsToForm(DEFAULT_COLORS);
    chrome.storage.sync.set({ [COLOR_STORAGE_KEY]: DEFAULT_COLORS }, function() {
        if (chrome.runtime.lastError) {
            setStatus('Reset failed');
            return;
        }

        setStatus('Reset to defaults');
        notifyActiveCalendarTab(DEFAULT_COLORS);
    });
}

function loadColors() {
    chrome.storage.sync.get({ [COLOR_STORAGE_KEY]: DEFAULT_COLORS }, function(items) {
        const storedColors = items[COLOR_STORAGE_KEY] || DEFAULT_COLORS;
        const normalizedColors = {
            daylightColor: normalizeHexColor(storedColors.daylightColor, DEFAULT_COLORS.daylightColor),
            astronomicalTwilightColor: normalizeHexColor(storedColors.astronomicalTwilightColor, DEFAULT_COLORS.astronomicalTwilightColor),
            nauticalTwilightColor: normalizeHexColor(storedColors.nauticalTwilightColor, DEFAULT_COLORS.nauticalTwilightColor),
            civilTwilightColor: normalizeHexColor(storedColors.civilTwilightColor, DEFAULT_COLORS.civilTwilightColor),
            sunriseSunsetColor: normalizeHexColor(storedColors.sunriseSunsetColor, DEFAULT_COLORS.sunriseSunsetColor),
            goldenHourColor: normalizeHexColor(storedColors.goldenHourColor, DEFAULT_COLORS.goldenHourColor)
        };

        applyColorsToForm(normalizedColors);
        setStatus('');
    });
}

function saveLocation() {
    const latVal = parseFloat(document.getElementById('latInput').value);
    const lonVal = parseFloat(document.getElementById('lonInput').value);

    if (isNaN(latVal) || latVal < -90 || latVal > 90) {
        setLocationSaveStatus('Latitude must be -90 to 90');
        return;
    }
    if (isNaN(lonVal) || lonVal < -180 || lonVal > 180) {
        setLocationSaveStatus('Longitude must be -180 to 180');
        return;
    }

    const location = { lat: latVal, lon: lonVal, manual: true, updatedAt: Date.now() };
    chrome.storage.sync.set({ [LOCATION_STORAGE_KEY]: location }, function() {
        if (chrome.runtime.lastError) {
            setLocationSaveStatus('Save failed');
            return;
        }
        setLocationSaveStatus('Saved');
        setLocationStatusFromCoordinates('manual', latVal, lonVal);
        setResetButtonVisible(true);
        setRetryButtonVisible(false);
        storeLocationInHistory(latVal, lonVal);
        notifyActiveCalendarTabLocation(location);
    });
}

function useAutoLocation() {
    setLocationStatus('auto: requesting geolocation...');
    setResetButtonVisible(false);

    requestGeolocation(function(lat, lon) {
        saveAutoLocationAndNotify(lat, lon, 'Using auto location');
    }, function(error) {
        const autoLocation = { manual: false, updatedAt: Date.now() };
        chrome.storage.sync.set({ [LOCATION_STORAGE_KEY]: autoLocation }, function() {
            if (chrome.runtime.lastError) {
                setLocationSaveStatus('Reset failed');
                return;
            }

            if (error && error.code === 1) {
                setLocationSaveStatus('Permission denied; using manual if set');
                setLocationStatus('auto: permission denied');
                setResetButtonVisible(false);
                setRetryButtonVisible(true);
            } else {
                setLocationSaveStatus('Auto mode enabled');
                setLocationStatus('auto');
                setResetButtonVisible(false);
                setRetryButtonVisible(true);
            }
            notifyActiveCalendarTabLocation(autoLocation);
        });
    });
}

function retryGeolocationPermission() {
    requestGeolocation(function(lat, lon) {
        saveAutoLocationAndNotify(lat, lon, 'Geolocation updated');
    }, function(error) {
        if (error && error.code === 1) {
            setLocationSaveStatus('Permission still denied');
            setLocationStatus('auto: permission denied');
            setResetButtonVisible(false);
            setRetryButtonVisible(true);
        } else {
            setLocationSaveStatus('Could not get location');
            setResetButtonVisible(false);
            setRetryButtonVisible(true);
        }
    });
}

function loadLocation() {
    chrome.storage.sync.get({ [LOCATION_STORAGE_KEY]: null }, function(items) {
        const loc = items[LOCATION_STORAGE_KEY];
        if (loc && loc.manual && isValidCoordinatePair(loc.lat, loc.lon)) {
            document.getElementById('latInput').value = loc.lat;
            document.getElementById('lonInput').value = loc.lon;
            setLocationStatusFromCoordinates('manual', loc.lat, loc.lon);
            setResetButtonVisible(true);
            setRetryButtonVisible(false);
        } else {
            if (loc && isValidCoordinatePair(loc.lat, loc.lon)) {
                document.getElementById('latInput').value = loc.lat;
                document.getElementById('lonInput').value = loc.lon;
                setLocationStatusFromCoordinates('auto', loc.lat, loc.lon);
                setResetButtonVisible(false);
                setRetryButtonVisible(false);
                return;
            }

            setLocationStatus('auto: requesting geolocation...');
            requestGeolocation(function(lat, lon) {
                saveAutoLocationAndNotify(lat, lon, 'Auto location set');
            }, function(error) {
                if (error && error.code === 1) {
                    setLocationStatus('auto: permission denied');
                    setLocationSaveStatus('Grant permission or set manual location');
                    setResetButtonVisible(false);
                    setRetryButtonVisible(true);
                } else {
                    setLocationStatus('auto');
                    setResetButtonVisible(false);
                    setRetryButtonVisible(true);
                }
            });
        }
    });
}

window.addEventListener('load', function() {
    setResetButtonVisible(false);
    setRetryButtonVisible(false);
    setHistoryPanelVisible(false);
    loadColors();

    document.getElementById('saveColors').addEventListener('click', saveColors);
    document.getElementById('resetColors').addEventListener('click', resetColors);

    loadLocation();
    renderLocationHistory();
    document.getElementById('saveLocation').addEventListener('click', saveLocation);
    document.getElementById('autoLocation').addEventListener('click', useAutoLocation);
    document.getElementById('retryGeolocation').addEventListener('click', retryGeolocationPermission);

    document.getElementById('locationStatus').addEventListener('click', function() {
        enterLocationStatusEditMode();
    });

    document.getElementById('toggleHistory').addEventListener('click', function() {
        setHistoryPanelVisible(true);
        renderLocationHistory();
    });

    document.getElementById('closeHistory').addEventListener('click', function() {
        setHistoryPanelVisible(false);
    });
});
