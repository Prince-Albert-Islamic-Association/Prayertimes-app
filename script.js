// Pre-written cities and countries (Add or edit items freely)
const PRESET_LOCATIONS = [
  { city: "Makkah", country: "Saudi Arabia", method: "4" },
  { city: "Madinah", country: "Saudi Arabia", method: "4" },
  { city: "Istanbul", country: "Turkey", method: "13" },
  { city: "London", country: "United Kingdom", method: "3" },
  { city: "Toronto", country: "Canada", method: "2" },
  { city: "New York", country: "USA", method: "2" },
  { city: "Cairo", country: "Egypt", method: "5" },
  { city: "Kuala Lumpur", country: "Malaysia", method: "3" },
  { city: "Dubai", country: "UAE", method: "4" }
];

const PRAYERS_TO_SHOW = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

const presetContainer = document.getElementById("presetContainer");
const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const countryInput = document.getElementById("countryInput");
const methodSelect = document.getElementById("methodSelect");
const statusMsg = document.getElementById("statusMsg");
const resultsContent = document.getElementById("resultsContent");

// Render preset buttons
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
      fetchPrayerTimes(loc.city, loc.country, loc.method);
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

// Format 24h time string ("18:45 (AST)") to 12h AM/PM ("6:45 PM")
function formatTo12Hour(time24) {
  const cleanTime = time24.split(" ")[0];
  let [hours, minutes] = cleanTime.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

// Determine which prayer is next based on the target city's current timezone
function getNextPrayer(timings, timezone) {
  try {
    const nowStr = new Date().toLocaleTimeString("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit"
    });
    const [nowH, nowM] = nowStr.split(":").map(Number);
    const currentMinutes = nowH * 60 + nowM;

    for (const prayer of PRAYERS_TO_SHOW) {
      if (prayer === "Sunrise") continue;
      const cleanTime = timings[prayer].split(" ")[0];
      const [pH, pM] = cleanTime.split(":").map(Number);
      const prayerMinutes = pH * 60 + pM;
      if (prayerMinutes > currentMinutes) {
        return prayer;
      }
    }
    return "Fajr";
  } catch (e) {
    return null;
  }
}

async function fetchPrayerTimes(city, country, method) {
  statusMsg.style.display = "block";
  statusMsg.className = "status-msg";
  statusMsg.textContent = `Fetching prayer times for ${city}, ${country}...`;
  resultsContent.style.display = "none";

  try {
    const url = `https://aladhan.com{encodeURIComponent(
      city
    )}&country=${encodeURIComponent(country)}&method=${method}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server error (${response.status}). Try again shortly.`);
    }

    const data = await response.json();

    if (data.code !== 200 || !data.data) {
      throw new Error("Location not found. Please check spelling.");
    }

    const { timings, date, meta } = data.data;
    const nextPrayer = getNextPrayer(timings, meta.timezone);

    document.getElementById("displayLocation").textContent = `${city}, ${country}`;
    document.getElementById("displayTimezone").textContent = `Timezone: ${meta.timezone}`;
    document.getElementById("gregorianDate").textContent = date.readable;
    document.getElementById(
      "hijriDate"
    ).textContent = `${date.hijri.day} ${date.hijri.month.en} ${date.hijri.year} AH`;

    const prayerList = document.getElementById("prayerList");
    prayerList.innerHTML = "";

    PRAYERS_TO_SHOW.forEach((prayer) => {
      const isNext = prayer === nextPrayer;
      const row = document.createElement("div");
      row.className = `prayer-item ${isNext ? "next-prayer" : ""}`;
      row.innerHTML = `
        <span class="prayer-name">
          ${prayer}
          ${isNext ? '<span class="badge">Next</span>' : ""}
        </span>
        <span class="prayer-time">${formatTo12Hour(timings[prayer])}</span>
      `;
      prayerList.appendChild(row);
    });

    statusMsg.style.display = "none";
    resultsContent.style.display = "block";
  } catch (err) {
    statusMsg.className = "status-msg error";
    if (window.location.protocol === "file:") {
      statusMsg.textContent =
        "Blocked by browser local file security. Run via a local server (like VS Code Live Server) or upload to GitHub Pages.";
    } else {
      statusMsg.textContent =
        err.message || "Network error: Could not connect to prayer times API.";
    }
  }
}

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  const country = countryInput.value.trim();
  const method = methodSelect.value;
  if (city && country) {
    highlightActivePreset(city);
    fetchPrayerTimes(city, country, method);
  }
});

// Initialize app with the first preset
renderPresets();
const defaultLoc = PRESET_LOCATIONS[0];
cityInput.value = defaultLoc.city;
countryInput.value = defaultLoc.country;
methodSelect.value = defaultLoc.method;
highlightActivePreset(defaultLoc.city);
fetchPrayerTimes(defaultLoc.city, defaultLoc.country, defaultLoc.method);
