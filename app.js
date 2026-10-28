// === STATE ===
const cityState = {
    budget: 100, happiness: 85, selectedArea: null,
    areas: {
        Velachery:  { flood: 80, traffic: 60, solved: false },
        Vadapalani: { flood: 35, traffic: 75, solved: false },
        Porur:      { flood: 45, traffic: 70, solved: false }
    }
};

// === RULE-BASED ADVISOR ===
const advisorRules = [
    { keywords: ['drain', 'water', 'flood'], cost: 20, impact: 30, text: "Drainage system: reduces flooding significantly. Estimated cost: ₹20 crore. May cause 3 months of local disruption." },
    { keywords: ['metro', 'train', 'transport'], cost: 40, impact: 25, text: "Metro extension: improves connectivity and traffic. Estimated cost: ₹40 crore. High construction impact." },
    { keywords: ['park', 'green', 'tree'], cost: 10, impact: 10, text: "Green spaces: improves citizen happiness. Estimated cost: ₹10 crore. Minor flood benefit." },
    { keywords: ['road', 'pothole'], cost: 15, impact: 15, text: "Road repairs: improves accessibility. Estimated cost: ₹15 crore." }
];

let currentProposal = null;
let map;
let mapMarkers = {}; 

// === GAME ENGINE STATE ===
let gameState = {
    isDriving: false,
    isPaused: false,
    vehicleType: 'car',
    lat: 13.0358, // Start at Porur
    lng: 80.1568,
    speed: 0,
    maxSpeed: 6,
    heading: 0,
    score: 0,
    vehicleMarker: null
};
const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false };

// Hazards placed around the map
const hazards = [
    { lat: 13.0385, lng: 80.1590, radius: 60, type: 'traffic', title: '🚦 Traffic Alert', message: 'Heavy congestion detected on Porur Bridge. Find a faster route.', triggered: false },
    { lat: 12.9800, lng: 80.2150, radius: 80, type: 'flood', title: '🌊 Flood Alert', message: 'Flooding ahead near Velachery. Find an alternative route.', triggered: false },
    { lat: 13.0480, lng: 80.2150, radius: 70, type: 'construction', title: '🚧 Construction Alert', message: 'Road construction ahead in Vadapalani. Take a detour.', triggered: false }
];

// === EXISTING DASHBOARD LOGIC ===
function selectArea(name) {
    cityState.selectedArea = name;
    const area = cityState.areas[name];
    document.getElementById('problem-panel').innerHTML = `<strong>${name}</strong><br>Flood Severity: ${area.flood}/100<br>Traffic: ${area.traffic}/100`;
    document.getElementById('proposal-input').value = '';
    document.getElementById('advisor-container').style.display = 'none';
    document.getElementById('what-if-result').style.display = 'none';
    document.getElementById('approve-btn').disabled = true;
}

function evaluateProposal() {
    const text = document.getElementById('proposal-input').value.toLowerCase();
    if (!cityState.selectedArea) { alert("Please click a location on the map first!"); return; }
    const area = cityState.areas[cityState.selectedArea];
    let matched = null;
    for (const rule of advisorRules) { if (rule.keywords.some(k => text.includes(k))) { matched = rule; break; } }
    
    const box = document.getElementById('advisor-response');
    const container = document.getElementById('advisor-container');
    const avatar = document.getElementById('advisor-avatar');
    container.style.display = 'block'; box.style.display = 'block';

    if (matched && !area.solved) {
        currentProposal = matched;
        box.innerHTML = `<span style="color:#4ade80">✅ Recommended</span><br>${matched.text}<br><em>Reason: recognized keyword matching proposal.</em>`;
        document.getElementById('approve-btn').disabled = false;
        avatar.src = "https://api.dicebear.com/7.x/bottts/svg?seed=Felix&backgroundColor=10b981"; avatar.style.borderColor = "#10b981";
    } else if (area.solved) {
        box.innerHTML = `<span style="color:#ef4444">⚠️ Already solved.</span>`; document.getElementById('approve-btn').disabled = true;
        avatar.src = "https://api.dicebear.com/7.x/bottts/svg?seed=Felix&backgroundColor=ef4444"; avatar.style.borderColor = "#ef4444";
    } else {
        currentProposal = null;
        box.innerHTML = `<span style="color:#facc15">🤔 Unrecognized idea.</span> Try words like "drainage", "metro", "park", or "road".`;
        document.getElementById('approve-btn').disabled = true;
        avatar.src = "https://api.dicebear.com/7.x/bottts/svg?seed=Felix&backgroundColor=facc15"; avatar.style.borderColor = "#facc15";
    }
}

function approveProposal() {
    if (!currentProposal) return;
    const area = cityState.areas[cityState.selectedArea];
    if (cityState.budget < currentProposal.cost) { document.getElementById('advisor-response').innerHTML = `<span style="color:#ef4444; font-weight:bold;">❌ INSUFFICIENT FUNDS!</span>`; return; }
    cityState.budget -= currentProposal.cost;
    area.flood = Math.max(0, area.flood - currentProposal.impact);
    area.solved = true;
    let happinessBonus = 5; if (currentProposal.keywords.includes('park')) happinessBonus = 15; if (currentProposal.keywords.includes('drain')) happinessBonus = 10; if (currentProposal.keywords.includes('metro')) happinessBonus = 5;  
    cityState.happiness = Math.min(100, cityState.happiness + happinessBonus);
    showFloatingText(`-₹${currentProposal.cost} Cr`, '#ef4444'); showFloatingText(`+${happinessBonus}% Happiness`, '#10b981');
    updateDashboard(); saveGame();
    document.getElementById('approve-btn').disabled = true;
    document.getElementById('advisor-response').innerHTML += `<br><br><span style="color:#4ade80">✔ Implemented! Budget: ₹${cityState.budget} Cr</span>`;
    checkWinCondition(); 
}

function updateDashboard() {
    document.getElementById('budget').textContent = `₹${cityState.budget} Cr`;
    document.getElementById('happiness').textContent = `${cityState.happiness}%`;
    document.getElementById('budget-bar').style.width = `${(cityState.budget / 100) * 100}%`;
    if (cityState.budget < 30) document.getElementById('budget-bar').style.background = '#ef4444';
    document.getElementById('happiness-bar').style.width = `${cityState.happiness}%`;
    for (let name in cityState.areas) {
        if (cityState.areas[name].solved && mapMarkers[name]) {
            mapMarkers[name].setIcon(L.divIcon({ className: 'custom-div-icon', html: `<div class='map-marker solved'>✅ ${name} (Solved)</div>`, iconSize: [150, 30], iconAnchor: [75, 15] }));
        }
    }
    if (cityState.selectedArea) selectArea(cityState.selectedArea);
}

window.onload = function() {
    const savedState = localStorage.getItem('twinCityState');
    if (savedState) Object.assign(cityState, JSON.parse(savedState));
    initMap(); updateDashboard(); checkWinCondition(); 
    setTimeout(() => { map.invalidateSize(); }, 200);
};

function saveGame() { localStorage.setItem('twinCityState', JSON.stringify(cityState)); }
function checkWinCondition() { if (Object.values(cityState.areas).every(a => a.solved)) { setTimeout(() => { document.getElementById('victory-screen').style.display = 'flex'; }, 1000); } }
function resetGame() { localStorage.removeItem('twinCityState'); location.reload(); }
function showFloatingText(text, color) { const el = document.createElement('div'); el.className = 'floating-text'; el.textContent = text; el.style.color = color; el.style.left = '60%'; el.style.top = '40%'; document.body.appendChild(el); setTimeout(() => el.remove(), 1500); }

function simulateWhatIf(type) {
    if (!cityState.selectedArea) { alert("Please select an area on the map first!"); return; }
    const area = cityState.areas[cityState.selectedArea]; const resultBox = document.getElementById('what-if-result'); resultBox.style.display = 'block';
    if (type === 'metro') { resultBox.innerHTML = `<strong>🚇 Metro Extension</strong><br>Cost: ₹40 Cr<br>Traffic Impact: -25 points<br>Flood Impact: 0 points<br><em>Budget after: ₹${cityState.budget - 40} Cr</em>`; document.getElementById('proposal-input').value = "Build a metro extension"; } 
    else if (type === 'drainage') { const floodReduction = area.flood > 50 ? "High" : "Medium"; resultBox.innerHTML = `<strong>🌊 Drainage System</strong><br>Cost: ₹20 Cr<br>Flood Impact: -30 points (${floodReduction})<br>Traffic Impact: 0 points<br><em>Budget after: ₹${cityState.budget - 20} Cr</em>`; document.getElementById('proposal-input').value = "Build a new drainage system"; }
    evaluateProposal(); 
}

function initMap() {
    map = L.map('map', { dragging: true, zoomControl: true }).setView([13.0500, 80.2100], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    const locations = [ { name: 'Velachery', coords: [12.9750, 80.2210] }, { name: 'Vadapalani', coords: [13.0503, 80.2121] }, { name: 'Porur', coords: [13.0358, 80.1568] } ];
    locations.forEach(loc => {
        const customIcon = L.divIcon({ className: 'custom-div-icon', html: `<div class='map-marker'>📍 ${loc.name}</div>`, iconSize: [100, 30], iconAnchor: [50, 15] });
        const marker = L.marker(loc.coords, { icon: customIcon }).addTo(map);
        mapMarkers[loc.name] = marker;
        marker.on('click', function() { selectArea(loc.name); });
    });
}

// ==========================================
// === NEW: DRIVING GAME ENGINE ===
// ==========================================

function openVehicleModal() {
    document.getElementById('vehicle-modal').style.display = 'flex';
}
function closeModals() {
    document.getElementById('vehicle-modal').style.display = 'none';
    document.getElementById('hazard-modal').style.display = 'none';
}

function startDriving(type) {
    closeModals();
    gameState.isDriving = true;
    gameState.isPaused = false;
    gameState.vehicleType = type;
    gameState.lat = 13.0358; // Start at Porur
    gameState.lng = 80.1568;
    gameState.speed = 0;
    gameState.heading = 0; // Pointing North
    gameState.score = 0;
    hazards.forEach(h => h.triggered = false); // Reset hazards

    document.getElementById('driving-hud').style.display = 'block';
    document.getElementById('drive-btn').innerText = "🛑 Stop Driving";
    document.getElementById('drive-btn').style.background = "#ef4444";
    document.getElementById('score-display').innerText = gameState.score;

    // Disable map dragging so the car controls the camera
    map.dragging.disable();

    // Create the vehicle marker
    const vehicleEmoji = type === 'bike' ? '🏍️' : '🚗';
    const vehicleIcon = L.divIcon({ className: 'car-icon-container', html: `<div style="font-size: 30px; transform: rotate(${gameState.heading}rad);">${vehicleEmoji}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
    
    if (gameState.vehicleMarker) map.removeLayer(gameState.vehicleMarker);
    gameState.vehicleMarker = L.marker([gameState.lat, gameState.lng], { icon: vehicleIcon }).addTo(map);
    
    map.setView([gameState.lat, gameState.lng], 15);
    
    // Start game loop
    gameState.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function stopDriving() {
    gameState.isDriving = false;
    document.getElementById('driving-hud').style.display = 'none';
    document.getElementById('drive-btn').innerText = "🚦 Start Driving Mode";
    document.getElementById('drive-btn').style.background = "#8b5cf6";
    if (gameState.vehicleMarker) map.removeLayer(gameState.vehicleMarker);
    map.dragging.enable();
    map.setView([13.0500, 80.2100], 12); // Reset camera
}

// Keyboard Listeners
document.addEventListener('keydown', (e) => {
    if (!gameState.isDriving || gameState.isPaused) return;
    if (keys.hasOwnProperty(e.key)) { keys[e.key] = true; e.preventDefault(); }
});
document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) { keys[e.key] = false; e.preventDefault(); }
});

function gameLoop(time) {
    if (!gameState.isDriving || gameState.isPaused) return;

    // 1. Acceleration / Braking
    if (keys.w || keys.ArrowUp) gameState.speed = Math.min(gameState.speed + 0.15, gameState.maxSpeed);
    else if (keys.s || keys.ArrowDown) gameState.speed = Math.max(gameState.speed - 0.2, 0);
    else gameState.speed = Math.max(gameState.speed - 0.05, 0); // Friction

    // 2. Steering (Only if moving)
    if (gameState.speed > 0.1) {
        if (keys.a || keys.ArrowLeft) gameState.heading -= 0.05;
        if (keys.d || keys.ArrowRight) gameState.heading += 0.05;
    }

    // 3. Move Vehicle
    if (gameState.speed > 0) {
        const moveDist = gameState.speed * 0.00015; // Scale speed to lat/lng
        gameState.lat += Math.cos(gameState.heading) * moveDist;
        gameState.lng += Math.sin(gameState.heading) * moveDist;

        // Update Marker & Rotate Emoji
        const vehicleEmoji = gameState.vehicleType === 'bike' ? '🏍️' : '🚗';
        const rotatedHtml = `<div style="font-size: 30px; transform: rotate(${gameState.heading + Math.PI/2}rad);">${vehicleEmoji}</div>`;
        gameState.vehicleMarker.setLatLng([gameState.lat, gameState.lng]);
        gameState.vehicleMarker.setIcon(L.divIcon({ className: 'car-icon-container', html: rotatedHtml, iconSize: [30, 30], iconAnchor: [15, 15] }));

        // Pan Camera to follow vehicle
        map.setView([gameState.lat, gameState.lng], map.getZoom(), { animate: false });

        // Check Hazards
        checkHazards();
    }

    // Update HUD Speed
    document.getElementById('speed-display').innerText = Math.round(gameState.speed * 15) + " km/h";

    requestAnimationFrame(gameLoop);
}

// === HAZARD & CHALLENGE LOGIC ===
function checkHazards() {
    const currentPos = L.latLng(gameState.lat, gameState.lng);
    for (let hazard of hazards) {
        if (hazard.triggered) continue;
        const hazardPos = L.latLng(hazard.lat, hazard.lng);
        const distance = currentPos.distanceTo(hazardPos); // Returns distance in meters

        if (distance < hazard.radius) {
            hazard.triggered = true;
            triggerHazard(hazard);
            break;
        }
    }
}

function triggerHazard(hazard) {
    gameState.isPaused = true;
    gameState.speed = 0; // Stop the vehicle
    
    document.getElementById('hazard-title').innerText = hazard.title;
    document.getElementById('hazard-message').innerText = hazard.message;
    document.getElementById('hazard-modal').style.display = 'flex';
}

function resolveHazard(action) {
    document.getElementById('hazard-modal').style.display = 'none';
    
    if (action === 'detour') {
        gameState.score += 50;
        showFloatingText("+50 PTS", '#10b981');
        // Push player back slightly to simulate turning around
        gameState.lat -= Math.cos(gameState.heading) * 0.001;
        gameState.lng -= Math.sin(gameState.heading) * 0.001;
    } else {
        gameState.score = Math.max(0, gameState.score - 20);
        showFloatingText("-20 PTS", '#ef4444');
    }
    
    document.getElementById('score-display').innerText = gameState.score;
    gameState.isPaused = false;
    gameState.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}
