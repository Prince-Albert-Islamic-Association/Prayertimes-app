const PRESET_LOCATIONS = [
  { city: "Makkah", country: "Saudi Arabia", method: "4", lat: 21.4225, lon: 39.8262, tz: "Asia/Riyadh" },
  { city: "Madinah", country: "Saudi Arabia", method: "4", lat: 24.5247, lon: 39.5692, tz: "Asia/Riyadh" },
  { city: "Istanbul", country: "Turkey", method: "13", lat: 41.0082, lon: 28.9784, tz: "Europe/Istanbul" },
  { city: "London", country: "United Kingdom", method: "3", lat: 51.5074, lon: -0.1278, tz: "Europe/London" },
  { city: "Toronto", country: "Canada", method: "2", lat: 43.6532, lon: -79.3832, tz: "America/Toronto" },
  { city: "New York", country: "USA", method: "2", lat: 40.7128, lon: -74.0060, tz: "America/New_York" },
  { city: "Cairo", country: "Egypt", method: "5", lat: 30.0444, lon: 31.2357, tz: "Africa/Cairo" },
  { city: "Kuala Lumpur", country: "Malaysia", method: "3", lat: 3.1390, lon: 101.6869, tz: "Asia/Kuala_Lumpur" },
  { city: "Dubai", country: "UAE", method: "4", lat: 25.2048, lon: 55.2708, tz: "Asia/Dubai" }
];

const PRAYERS_TO_SHOW = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

const presetContainer = document.getElementById("presetContainer");
const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const countryInput = document.getElementById("countryInput");
const methodSelect = document.getElementById("methodSelect");
const statusMsg = document.getElementById("statusMsg");
const resultsContent = document.getElementById("resultsContent");

function renderPresets() {
  presetContainer.innerHTML = "";
  PRESET_LOCATIONS.forEach((loc) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-btn";
    btn.textContent = `${loc.city}, ${loc.country}`;
    btn.onclick = () => {
      cityInput.value = loc.city;
      countryInput.value = loc.country;
      methodSelect.value = loc.method;
      highlightActivePreset(loc.city);
      loadPrayerTimes(loc.city, loc.country, loc.method, loc);
    };
    presetContainer.appendChild(btn);
  });
}

function highlightActivePreset(activeCity) {
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.textContent.toLowerCase().startsWith(activeCity.toLowerCase() + ",")
    );
  });
}

function getAdhanParams(methodId) {
  switch (String(methodId)) {
    case "2": return adhan.CalculationMethod.NorthAmerica();
    case "3": return adhan.CalculationMethod.MuslimWorldLeague();
    case "4": return adhan.CalculationMethod.UmmAlQura();
    case "5": return adhan.CalculationMethod.Egyptian();
    case "1": return adhan.CalculationMethod.Karachi();
    case "13": return adhan.CalculationMethod.Turkey();
    default: return adhan.CalculationMethod.MuslimWorldLeague();
  }
}

function formatDateInTimezone(dateObj, timezone) {
  return dateObj.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

function getHijriDateString(dateObj) {
  try {
    return new Intl.DateTimeFormat("en-TN-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(dateObj);
  } catch (e) {
    return "";
  }
}

async function getCoordinates(city, country) {
  const geoUrl = `https://open-meteo.com{encodeURIComponent(city)}&count=5&language=en&format=json`;
  const res = await fetch(geoUrl);
  if (!res.ok) throw new Error("Could not look up city coordinates.");
  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(`City "${city}" not found. Check spelling.`);
  }

  const match = data.results.find(
    (item) => item.country && item.country.toLowerCase().includes(country.toLowerCase())
  ) || data.results;

  return {
    lat: match.latitude,
    lon: match.longitude,
    tz: match.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    resolvedCity: match.name,
    resolvedCountry: match.country || country
  };
}

async function loadPrayerTimes(city, country, method, presetData = null) {
  statusMsg.style.display = "block";
  statusMsg.className = "status-msg";
  statusMsg.textContent = `Calculating prayer times for ${city}, ${country}...`;
  resultsContent.style.display = "none";

  try {
    if (typeof adhan === "undefined") {
      throw new Error("Adhan library failed to load. Check your internet connection.");
    }

    let locationInfo = presetData;

    if (!locationInfo) {
      locationInfo = await getCoordinates(city, country);
    }

    const now = new Date();
    const coords = new adhan.Coordinates(locationInfo.lat, locationInfo.lon);
    const params = getAdhanParams(method);
    const prayerTimes = new adhan.PrayerTimes(coords, now, params);

    const nextPrayerEnum = prayerTimes.nextPrayer();
    const nextPrayerMap = {
      fajr: "Fajr",
      sunrise: "Sunrise",
      dhuhr: "Dhuhr",
      asr: "Asr",
      maghrib: "Maghrib",
      isha: "Isha",
      none: "Fajr"
    };
    const nextPrayerName = nextPrayerMap[nextPrayerEnum] || "Fajr";

    const timesMap = {
      Fajr: prayerTimes.fajr,
      Sunrise: prayerTimes.sunrise,
      Dhuhr: prayerTimes.dhuhr,
      Asr: prayerTimes.asr,
      Maghrib: prayerTimes.maghrib,
      Isha: prayerTimes.isha
    };

    const displayCity = locationInfo.resolvedCity || city;
    const displayCountry = locationInfo.resolvedCountry || country;

    document.getElementById("displayLocation").textContent = `${displayCity}, ${displayCountry}`;
    document.getElementById("displayTimezone").textContent = `Timezone: ${locationInfo.tz}`;
    document.getElementById("gregorianDate").textContent = now.toLocaleDateString("en-US", {
      timeZone: locationInfo.tz,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    document.getElementById("hijriDate").textContent = getHijriDateString(now);

    const prayerList = document.getElementById("prayerList");
    prayerList.innerHTML = "";

    PRAYERS_TO_SHOW.forEach((prayer) => {
      const isNext = prayer === nextPrayerName;
      const formattedTime = formatDateInTimezone(timesMap[prayer], locationInfo.tz);

      const row = document.createElement("div");
      row.className = `prayer-item ${isNext ? "next-prayer" : ""}`;
      row.innerHTML = `
        <span class="prayer-name">
          ${prayer}
          ${isNext ? '<span class="badge">Next</span>' : ""}
        </span>
        <span class="prayer-time">${formattedTime}</span>
      `;
      prayerList.appendChild(row);
    });

    statusMsg.style.display = "none";
    resultsContent.style.display = "block";
  } catch (err) {
    statusMsg.className = "status-msg error";
    statusMsg.textContent = err.message || "Could not load prayer times.";
  }
}

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  const country = countryInput.value.trim();
  const method = methodSelect.value;

  if (city && country) {
    highlightActivePreset(city);
    const matchingPreset = PRESET_LOCATIONS.find(
      (p) => p.city.toLowerCase() === city.toLowerCase() && p.country.toLowerCase() === country.toLowerCase()
    );
    loadPrayerTimes(city, country, method, matchingPreset || null);
  }
});

// Initialisation avec la première ville (Makkah)
renderPresets();
const defaultLoc = PRESET_LOCATIONS;
cityInput.value = defaultLoc.city;
countryInput.value = defaultLoc.country;
methodSelect.value = defaultLoc.method;
highlightActivePreset(defaultLoc.city);
loadPrayerTimes(defaultLoc.city, defaultLoc.country, defaultLoc.method, defaultLoc);
