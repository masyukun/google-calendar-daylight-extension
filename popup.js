const COLOR_STORAGE_KEY = 'daylightColorSettings';

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

window.addEventListener('load', function() {
    loadColors();

    document.getElementById('saveColors').addEventListener('click', saveColors);
    document.getElementById('resetColors').addEventListener('click', resetColors);
});
