/* ============================================================
   TRAVELO — Interactive 3D Globe & Location Discovery Engine
   ============================================================ */

// Global State
const AppState = {
  currentLat: 20,
  currentLon: 78,
  currentLocationData: null,
  isTransitioning: false,
  cache: {},
};

// 1. THREE.JS SCENE SETUP
const container = document.getElementById("webgl-container");
const wrapper = document.getElementById("app-wrapper");

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  wrapper.clientWidth / wrapper.clientHeight,
  0.1,
  1000
);
camera.position.set(0, 0, 5.0);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xe0f2fe, 2.2);
sunLight.position.set(6, 4, 6);
scene.add(sunLight);

const backLight = new THREE.DirectionalLight(0x00e5ff, 0.9);
backLight.position.set(-6, -3, -4);
scene.add(backLight);

// 2. 3D GLOBE, CLOUDS, ATMOSPHERE & STARS
const globeRadius = 1.35;
const textureLoader = new THREE.TextureLoader();

const earthMap = textureLoader.load("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg");
const earthBump = textureLoader.load("https://unpkg.com/three-globe/example/img/earth-topology.png");

const globeMaterial = new THREE.MeshStandardMaterial({
  map: earthMap,
  bumpMap: earthBump,
  bumpScale: 0.04,
  roughness: 0.65,
  metalness: 0.1,
});

const globe = new THREE.Mesh(new THREE.SphereGeometry(globeRadius, 64, 64), globeMaterial);
scene.add(globe);

// Clouds
const cloudTexture = textureLoader.load("https://raw.githubusercontent.com/turban/webgl-earth/master/images/fair_clouds_4k.png");
const clouds = new THREE.Mesh(
  new THREE.SphereGeometry(globeRadius * 1.018, 64, 64),
  new THREE.MeshStandardMaterial({
    map: cloudTexture,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
);
globe.add(clouds);

// Atmosphere Glow
const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(globeRadius * 1.06, 64, 64),
  new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.22,
    side: THREE.BackSide,
  })
);
scene.add(atmosphere);

// Starfield
const starsGeometry = new THREE.BufferGeometry();
const starsCount = 600;
const starPositions = new Float32Array(starsCount * 3);
for (let i = 0; i < starsCount * 3; i++) {
  starPositions[i] = (Math.random() - 0.5) * 16;
}
starsGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
const starsMesh = new THREE.Points(
  starsGeometry,
  new THREE.PointsMaterial({
    size: 0.015,
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
  })
);
scene.add(starsMesh);

// 3. MATHEMATICS & CONVERSIONS
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function vector3ToLatLon(v, radius) {
  const lat = 90 - (Math.acos(v.y / radius) * 180) / Math.PI;
  let lon = (Math.atan2(v.z, -v.x) * 180) / Math.PI - 180;
  while (lon < -180) lon += 360;
  while (lon > 180) lon -= 360;
  return { lat: parseFloat(lat.toFixed(4)), lon: parseFloat(lon.toFixed(4)) };
}

// Country Meta Database
const COUNTRY_INFO = {
  "INDIA": { currency: "INR (\u20B9)", language: "Hindi, English", bestTime: "Oct - Mar", flag: "\uD83C\uDDEE\uD83C\uDDF3" },
  "FRANCE": { currency: "EUR (\u20AC)", language: "French", bestTime: "Mar - May", flag: "\uD83C\uDDEB\uD83C\uDDF7" },
  "JAPAN": { currency: "JPY (\u00A5)", language: "Japanese", bestTime: "Mar - May", flag: "\uD83C\uDDEF\uD83C\uDDF5" },
  "UNITED STATES": { currency: "USD ($)", language: "English", bestTime: "May - Sep", flag: "\uD83C\uDDFA\uD83C\uDDF8" },
  "USA": { currency: "USD ($)", language: "English", bestTime: "May - Sep", flag: "\uD83C\uDDFA\uD83C\uDDF8" },
  "CHINA": { currency: "CNY (\u00A5)", language: "Mandarin", bestTime: "Sep - Nov", flag: "\uD83C\uDDE8\uD83C\uDDF3" },
  "BRAZIL": { currency: "BRL (R$)", language: "Portuguese", bestTime: "Dec - Mar", flag: "\uD83C\uDDE7\uD83C\uDDF7" },
  "INDONESIA": { currency: "IDR (Rp)", language: "Indonesian", bestTime: "May - Sep", flag: "\uD83C\uDDEE\uD83C\uDDE9" },
  "AUSTRALIA": { currency: "AUD ($)", language: "English", bestTime: "Sep - Nov", flag: "\uD83C\uDDE6\uD83C\uDDFA" },
  "UNITED KINGDOM": { currency: "GBP (\u00A3)", language: "English", bestTime: "May - Sep", flag: "\uD83C\uDDEC\uD83C\uDDE7" },
  "UK": { currency: "GBP (\u00A3)", language: "English", bestTime: "May - Sep", flag: "\uD83C\uDDEC\uD83C\uDDE7" },
  "UNITED ARAB EMIRATES": { currency: "AED (AED)", language: "Arabic, English", bestTime: "Nov - Mar", flag: "\uD83C\uDDE6\uD83C\uDDEA" },
  "UAE": { currency: "AED (AED)", language: "Arabic, English", bestTime: "Nov - Mar", flag: "\uD83C\uDDE6\uD83C\uDDEA" },
  "SWITZERLAND": { currency: "CHF (CHF)", language: "German, French", bestTime: "Jun - Sep", flag: "\uD83C\uDDE8\uD83C\uDDED" },
  "BOTSWANA": { currency: "BWP (P)", language: "English, Setswana", bestTime: "May - Sep", flag: "\uD83C\uDDE7\uD83C\uDDFC" },
  "IRAQ": { currency: "IQD (IQD)", language: "Arabic, Kurdish", bestTime: "Oct - Apr", flag: "\uD83C\uDDEE\uD83C\uDDF6" },
  "NEPAL": { currency: "NPR (NPR)", language: "Nepali", bestTime: "Oct - Dec", flag: "\uD83C\uDDF3\uD83C\uDDF5" },
};

function getCountryDetails(countryName) {
  const c = (countryName || "").toUpperCase().trim();
  for (const key in COUNTRY_INFO) {
    if (c.includes(key)) return COUNTRY_INFO[key];
  }
  return { currency: "Local Currency", language: "Official Language", bestTime: "Year Round", flag: "\uD83C\uDF10" };
}

function getEstimatedWeather(lat) {
  const absLat = Math.abs(lat);
  let temp, desc;
  if (absLat < 15) {
    temp = Math.floor(28 + Math.random() * 4);
    desc = "Sunny & Warm";
  } else if (absLat < 35) {
    temp = Math.floor(22 + Math.random() * 5);
    desc = "Clear & Pleasant";
  } else if (absLat < 55) {
    temp = Math.floor(14 + Math.random() * 6);
    desc = "Partly Cloudy";
  } else {
    temp = Math.floor(2 + Math.random() * 8);
    desc = "Crisp & Cool";
  }
  return `${temp}\u00B0C ${desc}`;
}

// 4. ACCURATE OCEAN & REMOTE DETECTOR
function detectOceanName(lat, lon) {
  if (lat < -60) return "Southern Ocean";
  if (lat > 75) return "Arctic Ocean";

  if (lat >= 12 && lat <= 30 && lon >= 45 && lon <= 78) return "Arabian Sea";
  if (lat >= 8 && lat <= 22 && lon >= 78 && lon <= 95) return "Bay of Bengal";
  if (lat >= 30 && lat <= 46 && lon >= -6 && lon <= 36) return "Mediterranean Sea";
  if (lat >= 10 && lat <= 26 && lon >= -88 && lon <= -60) return "Caribbean Sea";
  if (lat >= 12 && lat <= 30 && lon >= 32 && lon <= 43) return "Red Sea";
  if (lat >= 18 && lat <= 31 && lon >= -98 && lon <= -81) return "Gulf of Mexico";
  if (lat >= -25 && lat <= -10 && lon >= 142 && lon <= 155) return "Coral Sea";

  if (lon >= -100 && lon <= 20 && lat >= 0 && lat <= 75) return "North Atlantic Ocean";
  if (lon >= -70 && lon <= 20 && lat < 0 && lat >= -60) return "South Atlantic Ocean";
  if ((lon <= -100 || lon >= 120) && lat >= 0 && lat <= 75) return "North Pacific Ocean";
  if ((lon <= -70 || lon >= 120) && lat < 0 && lat >= -60) return "South Pacific Ocean";
  if (lon >= 20 && lon <= 120 && lat < 30 && lat >= -60) return "Indian Ocean";

  return "International Waters";
}

// 5. REVERSE GEOCODING ENGINE
async function reverseGeocode(lat, lon) {
  const cacheKey = `geo_${lat.toFixed(2)}_${lon.toFixed(2)}`;
  if (AppState.cache[cacheKey]) return AppState.cache[cacheKey];

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&extratags=1`
    );
    if (!res.ok) throw new Error("Geocoding failed");
    const data = await res.json();

    if (data && data.address) {
      const addr = data.address;
      const extra = data.extratags || {};

      const landmark = data.name || addr.tourism || addr.amenity || addr.historic || addr.leisure || addr.building;
      const locality = addr.suburb || addr.neighbourhood || addr.quarter || addr.locality || addr.hamlet;
      const villageOrTown = addr.village || addr.town;
      const city = addr.city || addr.municipality || addr.county;
      const state = addr.state || addr.province || addr.region || addr.state_district;
      const country = addr.country || "Territory";

      let primaryName = landmark || locality || villageOrTown || city || state || country;
      let category = "LANDMARK";

      if (landmark) category = "LANDMARK";
      else if (locality) category = "LOCALITY";
      else if (villageOrTown) category = "TOWN / VILLAGE";
      else if (city) category = "CITY";
      else if (state) category = "STATE / REGION";
      else category = "COUNTRY";

      if (data.category === "natural" && (data.type === "water" || data.type === "bay" || data.type === "coastline")) {
        primaryName = data.name || detectOceanName(lat, lon);
        category = "OCEAN / SEA";
      }

      const result = {
        name: primaryName,
        rawName: primaryName,
        fullName: data.display_name,
        category: category,
        country: country,
        state: state || "",
        city: city || villageOrTown || "",
        locality: locality || "",
        lat: parseFloat(lat.toFixed(4)),
        lon: parseFloat(lon.toFixed(4)),
        wikidataId: extra.wikidata || null,
        isOcean: category.includes("OCEAN"),
      };

      AppState.cache[cacheKey] = result;
      return result;
    }
  } catch (err) {
    console.warn("Reverse geocode warning:", err);
  }

  // Ocean / Remote Fallback
  const oceanName = detectOceanName(lat, lon);
  const result = {
    name: oceanName,
    rawName: oceanName,
    fullName: `${oceanName} (${lat.toFixed(2)}\u00B0, ${lon.toFixed(2)}\u00B0)`,
    category: "OCEAN / SEA",
    country: "GLOBAL WATERS",
    state: "MARITIME REGION",
    city: "OPEN WATERS",
    locality: "COORDINATE FEATURE",
    lat: parseFloat(lat.toFixed(4)),
    lon: parseFloat(lon.toFixed(4)),
    wikidataId: null,
    isOcean: true,
  };

  AppState.cache[cacheKey] = result;
  return result;
}

// 6. STRICT IMAGE RELEVANCE FILTER (FIXES KAKINADA -> TAJ MAHAL BUG)
const FAMOUS_UNRELATED_LANDMARKS = [
  "taj mahal", "eiffel tower", "colosseum", "statue of liberty", "pyramid", "machu picchu",
  "great wall", "christ the redeemer", "petra", "big ben", "burj khalifa", "mount fuji",
  "golden gate", "stonehenge", "acropolis", "sydney opera", "angkor wat", "sagrada familia"
];

function isImageRelevant(title, description, locData) {
  const text = `${title} ${description}`.toLowerCase();
  const raw = locData.rawName.toLowerCase();
  const city = locData.city.toLowerCase();
  const state = locData.state.toLowerCase();
  const country = locData.country.toLowerCase();

  // Reject SVG icons, flags, coats of arms, disambiguations
  if (title.endsWith(".svg") || text.includes("flag of") || text.includes("coat of arms") || text.includes("disambiguation")) {
    return false;
  }

  // Check if image belongs to a famous unrelated landmark
  for (const landmark of FAMOUS_UNRELATED_LANDMARKS) {
    if (text.includes(landmark) && !raw.includes(landmark)) {
      return false; // Discard! Prevents Taj Mahal from showing for Kakinada
    }
  }

  // Must contain location name, city, state, or country keyword
  const matchesKeyword = (raw && text.includes(raw)) ||
                         (city && city.length > 2 && text.includes(city)) ||
                         (state && state.length > 2 && text.includes(state)) ||
                         (country && country.length > 2 && text.includes(country));

  return matchesKeyword;
}

// 7. WIKIPEDIA & WIKIDATA IMAGE FETCHER
async function fetchLocationMedia(locData) {
  const cacheKey = `media_${locData.rawName}_${locData.lat}_${locData.lon}`;
  if (AppState.cache[cacheKey]) return AppState.cache[cacheKey];

  let description = `Discovered location at ${locData.lat}\u00B0 N, ${locData.lon}\u00B0 E in ${locData.country}.`;
  let images = [];

  try {
    // 1. Wikidata Official Entity Photo Lookup
    if (locData.wikidataId) {
      try {
        const wdRes = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${locData.wikidataId}.json`);
        if (wdRes.ok) {
          const wdData = await wdRes.json();
          const entity = wdData.entities && wdData.entities[locData.wikidataId];
          if (entity && entity.claims && entity.claims.P18 && entity.claims.P18[0]) {
            const fileName = entity.claims.P18[0].mainsnak.datavalue.value;
            if (fileName && !fileName.endsWith(".svg")) {
              const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=1000`;
              images.push({ url, title: locData.rawName, source: "Official Wikidata Photo" });
            }
          }
        }
      } catch (_) {}
    }

    // 2. Wikipedia Search API
    const queries = [
      locData.rawName,
      `${locData.rawName} ${locData.state}`,
      `${locData.rawName} ${locData.country}`
    ].filter(Boolean);

    for (const q of queries) {
      if (images.length >= 4) break;
      try {
        const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=5&prop=pageimages|extracts&piprop=original|thumbnail&pithumbsize=1000&exintro=1&explaintext=1&format=json&origin=*`;
        const wikiRes = await fetch(wikiUrl);
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          if (wikiData.query && wikiData.query.pages) {
            const pages = Object.values(wikiData.query.pages);
            pages.forEach((p) => {
              if (p.extract && description.includes("Discovered location")) {
                description = p.extract;
              }
              const imgObj = p.original || p.thumbnail;
              if (imgObj && imgObj.source) {
                if (isImageRelevant(p.title || "", p.extract || "", locData)) {
                  images.push({ url: imgObj.source, title: p.title, source: "Verified Wikipedia Photo" });
                }
              }
            });
          }
        }
      } catch (_) {}
    }
  } catch (err) {
    console.warn("Media fetch warning:", err);
  }

  // Deduplicate
  const uniqueImages = [];
  const seen = new Set();
  images.forEach((img) => {
    if (!seen.has(img.url)) {
      seen.add(img.url);
      uniqueImages.push(img);
    }
  });

  const result = { description, images: uniqueImages };
  AppState.cache[cacheKey] = result;
  return result;
}

// 8. 3D GLOBE LOCATION MARKERS (MATCHING REFERENCE IMAGE)
const GLOBE_MARKERS_DATA = [
  { id: 'ny', title: 'New York', country: 'USA', lat: 40.7128, lon: -74.0060, thumb: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&auto=format&fit=crop' },
  { id: 'paris', title: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, thumb: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&auto=format&fit=crop' },
  { id: 'tokyo', title: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503, thumb: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=400&auto=format&fit=crop' },
  { id: 'taj', title: 'Taj Mahal', country: 'India', lat: 27.1751, lon: 78.0421, thumb: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400&auto=format&fit=crop' },
  { id: 'rio', title: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lon: -43.1729, thumb: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&auto=format&fit=crop' },
  { id: 'bali', title: 'Bali', country: 'Indonesia', lat: -8.3405, lon: 115.0920, thumb: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&auto=format&fit=crop' },
  { id: 'sydney', title: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093, thumb: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400&auto=format&fit=crop' }
];

const markersContainer = document.getElementById("globe-markers-container");
const markerElements = [];

function initGlobeMarkers() {
  markersContainer.innerHTML = "";
  GLOBE_MARKERS_DATA.forEach((m) => {
    const el = document.createElement("div");
    el.className = "globe-marker";
    el.innerHTML = `
      <img src="${m.thumb}" alt="${m.title}" referrerpolicy="no-referrer" />
      <div class="globe-marker-info">
        <span class="globe-marker-title">${m.title}</span>
        <span class="globe-marker-sub">${m.country}</span>
      </div>
      <div class="globe-marker-dot"></div>
    `;

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      selectLocation(m.lat, m.lon);
    });

    markersContainer.appendChild(el);
    markerElements.push({ el, data: m, vec: latLonToVector3(m.lat, m.lon, globeRadius) });
  });
}
initGlobeMarkers();

function updateGlobeMarkers() {
  markerElements.forEach((m) => {
    const worldPos = m.vec.clone().applyMatrix4(globe.matrixWorld);
    const screenPos = worldPos.clone().project(camera);

    const cameraDir = worldPos.clone().sub(camera.position).normalize();
    const normal = worldPos.clone().normalize();

    if (cameraDir.dot(normal) < 0) {
      const x = (screenPos.x * 0.5 + 0.5) * wrapper.clientWidth;
      const y = (-(screenPos.y * 0.5) + 0.5) * wrapper.clientHeight;
      m.el.style.left = `${x}px`;
      m.el.style.top = `${y}px`;
      m.el.style.display = "flex";
    } else {
      m.el.style.display = "none";
    }
  });
}

// 9. GLOBE INTERACTION & RAYCASTING
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let isDragging = false;
let previousPointerPos = { x: 0, y: 0 };

container.addEventListener("pointerdown", (e) => {
  if (AppState.isTransitioning) return;
  isDragging = true;
  previousPointerPos = { x: e.clientX, y: e.clientY };
});

window.addEventListener("pointermove", (e) => {
  const rect = wrapper.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  if (isDragging && !AppState.isTransitioning) {
    const deltaX = e.clientX - previousPointerPos.x;
    const deltaY = e.clientY - previousPointerPos.y;

    globe.rotation.y += deltaX * 0.005;
    globe.rotation.x += deltaY * 0.005;

    previousPointerPos = { x: e.clientX, y: e.clientY };
    return;
  }

  // Hover Tooltip
  const tooltipEl = document.getElementById("globe-tooltip");
  const tooltipText = document.getElementById("tooltip-text");
  
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(globe, false);

  if (intersects.length > 0) {
    const localPoint = globe.worldToLocal(intersects[0].point.clone());
    const { lat, lon } = vector3ToLatLon(localPoint, globeRadius);
    tooltipText.textContent = `Explore ${lat > 0 ? lat.toFixed(1) + '\u00B0N' : Math.abs(lat).toFixed(1) + '\u00B0S'}, ${lon > 0 ? lon.toFixed(1) + '\u00B0E' : Math.abs(lon).toFixed(1) + '\u00B0W'}`;
    tooltipEl.style.left = `${e.clientX - rect.left}px`;
    tooltipEl.style.top = `${e.clientY - rect.top}px`;
    tooltipEl.classList.add("visible");
  } else {
    tooltipEl.classList.remove("visible");
  }
});

window.addEventListener("pointerup", () => { isDragging = false; });

container.addEventListener("click", (e) => {
  if (AppState.isTransitioning) return;
  const rect = wrapper.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(globe, false);

  if (intersects.length > 0) {
    const localPoint = globe.worldToLocal(intersects[0].point.clone());
    const { lat, lon } = vector3ToLatLon(localPoint, globeRadius);
    selectLocation(lat, lon);
  }
});

// 10. SMOOTH CAMERA & SPHERICAL ROTATION TWEEN
function rotateGlobeToLatLon(lat, lon) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const targetNormal = new THREE.Vector3(
    -(Math.sin(phi) * Math.cos(theta)),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta)
  ).normalize();

  const forward = new THREE.Vector3(0, 0, 1);
  const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(targetNormal, forward);
  const startQuaternion = globe.quaternion.clone();

  const tweenObj = { progress: 0 };
  gsap.to(tweenObj, {
    progress: 1,
    duration: 1.6,
    ease: "power2.inOut",
    onUpdate: () => {
      globe.quaternion.slerpQuaternions(startQuaternion, targetQuaternion, tweenObj.progress);
    },
    onComplete: () => {
      AppState.isTransitioning = false;
    }
  });
}

async function selectLocation(lat, lon) {
  if (AppState.isTransitioning) return;
  AppState.isTransitioning = true;

  AppState.currentLat = lat;
  AppState.currentLon = lon;

  rotateGlobeToLatLon(lat, lon);

  gsap.to(camera.position, {
    z: window.innerWidth < 768 ? 4.4 : 4.0,
    duration: 1.5,
    ease: "power2.inOut",
  });

  const locData = await reverseGeocode(lat, lon);
  AppState.currentLocationData = locData;
  populateLocationCard(locData);
}

// 11. POPULATE GLASSMORPHISM LOCATION CARD
async function populateLocationCard(locData) {
  const panel = document.getElementById("location-panel");
  const imgLoader = document.getElementById("img-loader");
  imgLoader.classList.add("active");

  document.getElementById("panel-title").textContent = locData.name;
  document.getElementById("panel-region").textContent = `${locData.state ? locData.state + ', ' : ''}${locData.country}`;
  document.getElementById("panel-latlon").textContent = `${locData.lat > 0 ? locData.lat + '\u00B0 N' : Math.abs(locData.lat) + '\u00B0 S'}, ${locData.lon > 0 ? locData.lon + '\u00B0 E' : Math.abs(locData.lon) + '\u00B0 W'}`;

  const cMeta = getCountryDetails(locData.country);
  document.getElementById("panel-flag").textContent = cMeta.flag;
  document.getElementById("stat-besttime").textContent = cMeta.bestTime;
  document.getElementById("stat-currency").textContent = cMeta.currency;
  document.getElementById("stat-language").textContent = cMeta.language;

  document.getElementById("weather-text").textContent = getEstimatedWeather(locData.lat);

  // Fetch Verified Media & Information
  const media = await fetchLocationMedia(locData);
  document.getElementById("panel-description").textContent = media.description;

  const imgContainer = document.querySelector(".featured-image-container");
  const thumbsContainer = document.getElementById("panel-gallery-thumbs");
  thumbsContainer.innerHTML = "";

  if (media.images.length > 0) {
    imgContainer.innerHTML = `
      <img id="panel-main-img" src="${media.images[0].url}" alt="${locData.name}" referrerpolicy="no-referrer" />
      <div class="img-badge" id="img-source-badge">${media.images[0].source}</div>
      <div class="img-loader" id="img-loader"><div class="spinner"></div></div>
    `;

    media.images.forEach((imgObj, idx) => {
      const thumb = document.createElement("img");
      thumb.className = `thumb-img${idx === 0 ? ' active' : ''}`;
      thumb.src = imgObj.url;
      thumb.alt = imgObj.title;
      thumb.referrerPolicy = "no-referrer";

      thumb.addEventListener("click", () => {
        document.querySelectorAll(".thumb-img").forEach((el) => el.classList.remove("active"));
        thumb.classList.add("active");
        const mImg = document.getElementById("panel-main-img");
        if (mImg) mImg.src = imgObj.url;
      });

      thumbsContainer.appendChild(thumb);
    });
  } else {
    // STRICT FALLBACK DISPLAY WHEN NO VERIFIED IMAGE IS FOUND
    imgContainer.innerHTML = `
      <div class="no-verified-image-box">
        <svg width="28" height="28" fill="none" stroke="#00e5ff" stroke-width="1.8" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span>No verified image available for this exact location.</span>
      </div>
      <div class="img-loader" id="img-loader"><div class="spinner"></div></div>
    `;
  }

  imgLoader.classList.remove("active");
  panel.classList.add("visible");
}

document.getElementById("panel-close-btn").addEventListener("click", () => {
  document.getElementById("location-panel").classList.remove("visible");
  gsap.to(camera.position, { z: 5.0, duration: 1.2, ease: "power2.out" });
});

// 12. EXPLORE LOCATION DYNAMIC REDIRECT
document.getElementById("btn-explore-location").addEventListener("click", () => {
  if (!AppState.currentLocationData) return;
  const loc = AppState.currentLocationData;
  window.location.href = `destination.html?name=${encodeURIComponent(loc.name)}&lat=${loc.lat}&lon=${loc.lon}&country=${encodeURIComponent(loc.country)}&state=${encodeURIComponent(loc.state)}`;
});

// 13. GLOBAL SEARCH & AUTOCOMPLETE
const searchInput = document.getElementById("global-search-input");
const searchDropdown = document.getElementById("search-results-dropdown");
const clearBtn = document.getElementById("search-clear-btn");
const submitBtn = document.getElementById("search-submit-btn");

let searchDebounce;

searchInput.addEventListener("input", (e) => {
  const query = e.target.value.trim();
  clearBtn.style.display = query ? "block" : "none";

  clearTimeout(searchDebounce);
  if (query.length < 2) {
    searchDropdown.classList.remove("active");
    return;
  }

  searchDebounce = setTimeout(() => {
    executeSearchAutocomplete(query);
  }, 300);
});

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  clearBtn.style.display = "none";
  searchDropdown.classList.remove("active");
});

async function executeSearchAutocomplete(query) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
    if (!res.ok) return;
    const items = await res.json();

    searchDropdown.innerHTML = "";
    if (items.length === 0) {
      searchDropdown.classList.remove("active");
      return;
    }

    items.forEach((item) => {
      const el = document.createElement("div");
      el.className = "search-result-item";
      el.innerHTML = `
        <div class="search-result-icon">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"></path>
          </svg>
        </div>
        <div class="search-result-info">
          <span class="search-result-title">${item.display_name.split(',')[0]}</span>
          <span class="search-result-sub">${item.display_name}</span>
        </div>
      `;

      el.addEventListener("click", () => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        searchInput.value = item.display_name.split(',')[0];
        searchDropdown.classList.remove("active");
        selectLocation(lat, lon);
      });

      searchDropdown.appendChild(el);
    });

    searchDropdown.classList.add("active");
  } catch (err) {
    console.warn("Autocomplete error:", err);
  }
}

async function executeSearchDirect(query) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
    if (res.ok) {
      const items = await res.json();
      if (items.length > 0) {
        selectLocation(parseFloat(items[0].lat), parseFloat(items[0].lon));
        return;
      }
    }
  } catch (_) {}
  alert(`Location "${query}" could not be geocoded. Click anywhere directly on the 3D globe!`);
}

submitBtn.addEventListener("click", () => {
  const query = searchInput.value.trim();
  if (query) {
    searchDropdown.classList.remove("active");
    executeSearchDirect(query);
  }
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const query = searchInput.value.trim();
    if (query) {
      searchDropdown.classList.remove("active");
      executeSearchDirect(query);
    }
  }
});

// Chips & Bottom Cards Click Handlers
document.querySelectorAll(".chip-btn, .dest-card:not(.view-all-card)").forEach((btn) => {
  btn.addEventListener("click", () => {
    const q = btn.getAttribute("data-query");
    if (q) {
      searchInput.value = btn.querySelector("span, h3")?.textContent || q;
      executeSearchDirect(q);
    }
  });
});

// View All Destinations Card Handler
const viewAllDestBtn = document.getElementById("btn-view-all-dest");
if (viewAllDestBtn) {
  viewAllDestBtn.addEventListener("click", () => {
    window.location.href = "destination.html?name=Popular%20Global%20Destinations";
  });
}

document.addEventListener("click", (e) => {
  const sc = document.getElementById("search-container");
  if (sc && !sc.contains(e.target)) {
    searchDropdown.classList.remove("active");
  }
});

// 14. HEADER ACTIONS: SEARCH TOGGLE, THEME TOGGLE & MODALS
const headerSearchToggle = document.getElementById("header-search-toggle");
if (headerSearchToggle) {
  headerSearchToggle.addEventListener("click", () => {
    searchInput.focus();
    const searchBox = document.querySelector(".search-box");
    if (searchBox) {
      searchBox.classList.add("search-pulse");
      setTimeout(() => searchBox.classList.remove("search-pulse"), 2400);
    }
  });
}

const themeToggle = document.getElementById("theme-toggle");
if (themeToggle) {
  // Restore saved theme
  const savedTheme = localStorage.getItem("travelo_theme");
  if (savedTheme === "light") {
    document.body.classList.add("light-theme");
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-theme");
    const isLight = document.body.classList.contains("light-theme");
    localStorage.setItem("travelo_theme", isLight ? "light" : "dark");
    themeToggle.innerHTML = isLight
      ? `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
      : `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
  });
}

// Interactive Modal Helper
function showTraveloModal(title, bodyHtml, btnText = "Close") {
  let modalBackdrop = document.querySelector(".travelo-modal-backdrop");
  if (!modalBackdrop) {
    modalBackdrop = document.createElement("div");
    modalBackdrop.className = "travelo-modal-backdrop";
    modalBackdrop.innerHTML = `
      <div class="travelo-modal-card">
        <button class="travelo-modal-close">&times;</button>
        <div class="travelo-modal-title"></div>
        <div class="travelo-modal-body"></div>
        <button class="travelo-modal-btn"></button>
      </div>
    `;
    document.body.appendChild(modalBackdrop);

    const closeBtn = modalBackdrop.querySelector(".travelo-modal-close");
    const actionBtn = modalBackdrop.querySelector(".travelo-modal-btn");
    const hide = () => modalBackdrop.classList.remove("active");
    closeBtn.addEventListener("click", hide);
    actionBtn.addEventListener("click", hide);
    modalBackdrop.addEventListener("click", (e) => {
      if (e.target === modalBackdrop) hide();
    });
  }

  modalBackdrop.querySelector(".travelo-modal-title").textContent = title;
  modalBackdrop.querySelector(".travelo-modal-body").innerHTML = bodyHtml;
  modalBackdrop.querySelector(".travelo-modal-btn").textContent = btnText;
  modalBackdrop.classList.add("active");
}

// Header Navigation Links Click Handlers
const navHome = document.getElementById("nav-home");
if (navHome) {
  navHome.addEventListener("click", (e) => {
    e.preventDefault();
    document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
    navHome.classList.add("active");
    document.getElementById("location-panel").classList.remove("visible");
    selectLocation(20, 78);
  });
}

const navDestinations = document.getElementById("nav-destinations");
if (navDestinations) {
  navDestinations.addEventListener("click", (e) => {
    e.preventDefault();
    document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
    navDestinations.classList.add("active");
    const destBar = id("destinations");
    if (destBar) {
      destBar.scrollIntoView({ behavior: "smooth" });
    }
  });
}

function id(name) { return document.getElementById(name); }

document.querySelectorAll(".center-nav a").forEach((link) => {
  const text = link.textContent.trim().toLowerCase();
  if (text === "experiences") {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showTraveloModal(
        "✨ TRAVELO Experiences",
        "<p>Immerse yourself in interactive 3D Earth discovery! Rotate the globe, search any coordinate, or click popular landmarks to fetch real-time weather, verified photography, and regional information.</p><br><p><strong>Features available:</strong> Real-time Geocoding, Verified Wikimedia/Unsplash photos, Live ocean detection, and full-screen landmark exploration.</p>",
        "Explore Now"
      );
    });
  } else if (text === "about") {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showTraveloModal(
        "🌍 About TRAVELO",
        "<p>TRAVELO is a next-generation 3D spatial location discovery platform. Built with Three.js WebGL rendering, GSAP cinematic animations, and OpenStreetMap nominatim geocoding.</p><br><p>Created for curious travelers and global explorers.</p>",
        "Got It"
      );
    });
  } else if (text === "blog") {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showTraveloModal(
        "📰 Travel Insights & Articles",
        "<p><strong>1. Top 10 Hidden Gems in 2026</strong><br>Discover untouched paradises around the globe.</p><br><p><strong>2. The Future of 3D Virtual Travel</strong><br>How WebGL and spatial computing are transforming trip planning.</p>",
        "Read Articles"
      );
    });
  } else if (text === "contact") {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showTraveloModal(
        "✉️ Contact & Feedback",
        "<p>We'd love to hear from you! Have feedback or location recommendations?</p><br><p>Email us at: <strong>support@travelo.app</strong><br>Follow us on Twitter/X: <strong>@TraveloGlobe</strong></p>",
        "Send Message"
      );
    });
  }
});

// 15. MAIN ANIMATION LOOP
function animate() {
  requestAnimationFrame(animate);

  if (!isDragging && !AppState.isTransitioning) {
    globe.rotation.y += 0.0005;
  }
  clouds.rotation.y += 0.0007;
  atmosphere.rotation.y = globe.rotation.y;
  starsMesh.rotation.y += 0.0001;

  updateGlobeMarkers();
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = wrapper.clientWidth / wrapper.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
});