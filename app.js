// === STATE ===
const cityState = {
    budget: 100, happiness: 85, selectedArea: null,
    areas: {
        Velachery:  { flood: 80, traffic: 60, solved: false },
        Vadapalani: { flood: 35, traffic: 75, solved: false },
        Porur:      { flood: 45, traffic: 70, solved: false }
    }
};

const locations = [ 
    { name: 'Velachery', coords: [12.9750, 80.2210] }, 
    { name: 'Vadapalani', coords: [13.0503, 80.2121] }, 
    { name: 'Porur', coords: [13.0358, 80.1568] } 
];

const advisorRules = [
    { keywords: ['drain', 'water', 'flood'], cost: 20, impact: 30, text: "Drainage system: reduces flooding significantly. Estimated cost: ₹20 crore. May cause 3 months of local disruption." },
    { keywords: ['metro', 'train', 'transport'], cost: 40, impact: 25, text: "Metro extension: improves connectivity and traffic. Estimated cost: ₹40 crore. High construction impact." },
    { keywords: ['park', 'green', 'tree'], cost: 10, impact: 10, text: "Green spaces: improves citizen happiness. Estimated cost: ₹10 crore. Minor flood benefit." },
    { keywords: ['road', 'pothole'], cost: 15, impact: 15, text: "Road repairs: improves accessibility. Estimated cost: ₹15 crore." }
];

let currentProposal = null;
let map;
let mapMarkers = {}; 
let ambientCars = []; 

// === GAME ENGINE STATE ===
let gameState = {
    isDriving: false, isPaused: false, isWideView: false,
    vehicleType: 'car',
    lat: 13.0358, lng: 80.1568,
    speed: 0,           
    maxSpeed: 0.004,    
    maxReverse: -0.002, 
    acceleration: 0.00008,
    braking: 0.00015,
    friction: 0.00003,
    heading: 0,         
    turnSpeed: 0.05,    
    score: 0,
    vehicleMarker: null
};

const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false };

const hazards = [
    { lat: 13.0380, lng: 80.1590, radius: 80, title: '🚦 Traffic Alert', message: 'Heavy congestion detected on Porur Bridge. Find a faster route.', triggered: false },
    { lat: 13.0200, lng: 80.1800, radius: 100, title: '🚧 Construction Alert', message: 'Road construction ahead on Mount Poonamallee Rd. Take a detour.', triggered: false },
    { lat: 12.9800, lng: 80.2150, radius: 120, title: '🌊 Flood Alert', message: 'Flooding ahead near Velachery. Find an alternative route.', triggered: false }
];

// === DASHBOARD LOGIC ===
function selectArea(name) {
    cityState.selectedArea = name;
    const area = cityState.areas[name];
    document.getElementById('problem-panel').innerHTML = `<strong>${name}</strong><br>Flood Severity: ${area.flood}/100<br>Traffic: ${area.traffic}/100`;
    document.getElementById('proposal-input').value = '';
    document.getElementById('advisor-container').style.display = 'none';
    document.getElementById('what-if-result').style.display = 'none';
    document.getElementById('approve-btn').disabled = true;

    // ENHANCEMENT 2: Trigger Rain for Velachery
    const rainOverlay = document.getElementById('rain-overlay');
    if (name === 'Velachery') {
        rainOverlay.style.display = 'block';
    } else {
        rainOverlay.style.display = 'none';
    }
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
    initMap(); 
    spawnTraffic(); // ENHANCEMENT 3: Spawn ambient traffic
    updateDashboard(); 
    checkWinCondition(); 
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
    
    locations.forEach(loc => {
        const customIcon = L.divIcon({ className: 'custom-div-icon', html: `<div class='map-marker'>📍 ${loc.name}</div>`, iconSize: [100, 30], iconAnchor: [50, 15] });
        const marker = L.marker(loc.coords, { icon: customIcon }).addTo(map);
        mapMarkers[loc.name] = marker;
        marker.on('click', function() { selectArea(loc.name); });
    });
}

// ==========================================
// === ENHANCEMENT 3: AMBIENT TRAFFIC ===
// ==========================================
function spawnTraffic() {
    const emojis = ['🚙', '🚕', '🚌', '🚚', '🛵'];
    
    for(let i=0; i<10; i++) {
        // Randomize positions around the center of Chennai
        const lat = 13.0500 + (Math.random() - 0.5) * 0.08;
        const lng = 80.2100 + (Math.random() - 0.5) * 0.08;
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        
        // Random rotation to make them look parked or driving in different directions
        const rotation = Math.random() * 360;
        
        const carIcon = L.divIcon({ 
            className: 'custom-div-icon', 
            html: `<div style="font-size: 22px; opacity: 0.85; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5)); transform: rotate(${rotation}deg);">${emoji}</div>`, 
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        });
        
        const marker = L.marker([lat, lng], { icon: carIcon, zIndexOffset: 100 }).addTo(map);
        ambientCars.push(marker);
    }
}

// ==========================================
// === IMMERSIVE DRIVING ENGINE ===
// ==========================================

function openVehicleModal() { document.getElementById('vehicle-modal').style.display = 'flex'; }
function closeModals() {
    document.getElementById('vehicle-modal').style.display = 'none';
    document.getElementById('hazard-modal').style.display = 'none';
}

function startDriving(type) {
    closeModals();
    gameState.isDriving = true;
    gameState.isPaused = false;
    gameState.isWideView = false;
    gameState.vehicleType = type;
    gameState.speed = 0;
    gameState.heading = 0;
    gameState.score = 0;
    hazards.forEach(h => h.triggered = false);

    // Spawn exactly where the user selected, or default to Porur
    let spawnLat = 13.0358;
    let spawnLng = 80.1568;
    if (cityState.selectedArea) {
        const loc = locations.find(l => l.name === cityState.selectedArea);
        if (loc) { spawnLat = loc.coords[0]; spawnLng = loc.coords[1]; }
    }
    gameState.lat = spawnLat;
    gameState.lng = spawnLng;

    // Show UI Elements
    document.getElementById('driving-hud').style.display = 'block';
    document.getElementById('nav-banner').style.display = 'flex';
    document.getElementById('driving-vignette').style.display = 'block'; 
    document.getElementById('drive-btn').innerText = "🛑 Stop Driving";
    document.getElementById('drive-btn').style.background = "#ef4444";
    document.getElementById('score-display').innerText = gameState.score;
    document.getElementById('view-toggle-btn').innerText = "🗺️ Switch to Wide Map";

    // Immersive Camera Zoom
    map.dragging.disable();
    map.setView([gameState.lat, gameState.lng], 18); 

    const vehicleEmoji = type === 'bike' ? '🏍️' : '🚗';
    
    // High-visibility marker with blue border and white background
    const vehicleIcon = L.divIcon({ 
        className: 'car-icon-container', 
        html: `<div id="car-emoji" style="font-size: 26px; background: white; border-radius: 50%; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border: 3px solid #3b82f6; box-shadow: 0 4px 15px rgba(0,0,0,0.6); transition: transform 0.1s linear;">${vehicleEmoji}</div>`, 
        iconSize: [45, 45], iconAnchor: [22, 22] 
    });
    
    if (gameState.vehicleMarker) map.removeLayer(gameState.vehicleMarker);
    gameState.vehicleMarker = L.marker([gameState.lat, gameState.lng], { icon: vehicleIcon, zIndexOffset: 10000 }).addTo(map);

    requestAnimationFrame(gameLoop);
}

function stopDriving() {
    gameState.isDriving = false;
    document.getElementById('driving-hud').style.display = 'none';
    document.getElementById('nav-banner').style.display = 'none';
    document.getElementById('driving-vignette').style.display = 'none'; 
    document.getElementById('drive-btn').innerText = "🚦 Start Driving Mode";
    document.getElementById('drive-btn').style.background = "#8b5cf6";
    
    // Also hide rain when stopping
    if(cityState.selectedArea !== 'Velachery') {
        document.getElementById('rain-overlay').style.display = 'none';
    }

    if (gameState.vehicleMarker) map.removeLayer(gameState.vehicleMarker);
    map.dragging.enable();
    map.setView([13.0500, 80.2100], 12); 
}

function toggleView() {
    gameState.isWideView = !gameState.isWideView;
    const btn = document.getElementById('view-toggle-btn');
    
    if (gameState.isWideView) {
        map.dragging.enable();
        map.flyTo([gameState.lat, gameState.lng], 13, { duration: 1.5 });
        document.getElementById('driving-vignette').style.display = 'none';
        btn.innerText = "🚗 Switch to Driving View";
        btn.style.background = "#10b981";
    } else {
        map.dragging.disable();
        map.flyTo([gameState.lat, gameState.lng], 18, { duration: 1.5 });
        document.getElementById('driving-vignette').style.display = 'block';
        btn.innerText = "🗺️ Switch to Wide Map";
        btn.style.background = "#3b82f6";
    }
}

// Keyboard Controls
window.addEventListener('keydown', (e) => {
    if (!gameState.isDriving || gameState.isPaused) return;
    let key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (keys.hasOwnProperty(key)) { 
        keys[key] = true; 
        e.preventDefault(); 
    }
});

window.addEventListener('keyup', (e) => {
    let key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (keys.hasOwnProperty(key)) { 
        keys[key] = false; 
        e.preventDefault(); 
    }
});

// Mobile Touch Controls
function handleTouch(key, isPressed) {
    if (keys.hasOwnProperty(key)) { keys[key] = isPressed; }
}

function gameLoop() {
    if (!gameState.isDriving || gameState.isPaused) return;

    // 1. Acceleration / Braking
    if (keys.w || keys.ArrowUp) {
        gameState.speed += gameState.acceleration;
        if (gameState.speed > gameState.maxSpeed) gameState.speed = gameState.maxSpeed;
    } else if (keys.s || keys.ArrowDown) {
        if (gameState.speed > 0) {
            gameState.speed -= gameState.braking; 
            if (gameState.speed < 0) gameState.speed = 0;
        } else {
            gameState.speed -= gameState.acceleration; 
            if (gameState.speed < gameState.maxReverse) gameState.speed = gameState.maxReverse;
        }
    } else {
        if (gameState.speed > 0) gameState.speed = Math.max(0, gameState.speed - gameState.friction);
        if (gameState.speed < 0) gameState.speed = Math.min(0, gameState.speed + gameState.friction);
    }

    // 2. Steering Physics
    const speedFactor = Math.abs(gameState.speed) / gameState.maxSpeed; 
    if (speedFactor > 0.05) {
        if (keys.a || keys.ArrowLeft) gameState.heading -= gameState.turnSpeed * speedFactor;
        if (keys.d || keys.ArrowRight) gameState.heading += gameState.turnSpeed * speedFactor;
    }

    // 3. Move Vehicle
    if (gameState.speed !== 0) {
        const moveDist = gameState.speed * 50; 
        gameState.lat += Math.cos(gameState.heading) * moveDist;
        gameState.lng += Math.sin(gameState.heading) * moveDist;

        gameState.vehicleMarker.setLatLng([gameState.lat, gameState.lng]);
        
        // Rotate Emoji and add Lean
        const emojiDiv = document.getElementById('car-emoji');
        if(emojiDiv) {
            let lean = 0;
            if (keys.a || keys.ArrowLeft) lean = -15;
            if (keys.d || keys.ArrowRight) lean = 15;
            emojiDiv.style.transform = `rotate(${gameState.heading + Math.PI/2}rad) rotate(${lean}deg)`;
        }

        // Camera follows vehicle (if not in Wide View)
        if (!gameState.isWideView) {
            map.setView([gameState.lat, gameState.lng], map.getZoom(), { animate: false });
        }
        
        checkHazards(gameState.lat, gameState.lng);
    }

    document.getElementById('speed-display').innerText = Math.abs(Math.round(gameState.speed * 5000)) + " km/h";
    requestAnimationFrame(gameLoop);
}

// === HAZARD LOGIC ===
function checkHazards(lat, lng) {
    const currentPos = L.latLng(lat, lng);
    for (let hazard of hazards) {
        if (hazard.triggered) continue;
        if (currentPos.distanceTo(L.latLng(hazard.lat, hazard.lng)) < hazard.radius) {
            hazard.triggered = true;
            triggerHazard(hazard);
            break;
        }
    }
}

function triggerHazard(hazard) {
    gameState.isPaused = true;
    gameState.speed = 0; 
    
    document.getElementById('nav-icon').innerText = "⚠️";
    document.getElementById('nav-banner').style.background = "#ef4444";
    document.getElementById('nav-instruction').innerText = hazard.title;
    document.getElementById('nav-subtext').innerText = "Click 'Detour' in the popup.";

    document.getElementById('hazard-title').innerText = hazard.title;
    document.getElementById('hazard-message').innerText = hazard.message;
    document.getElementById('hazard-modal').style.display = 'flex';
}

function resolveHazard(action) {
    document.getElementById('hazard-modal').style.display = 'none';
    
    if (action === 'detour') {
        gameState.score += 50;
        showFloatingText("+50 PTS", '#10b981');
        gameState.lat -= (Math.cos(gameState.heading) * 0.002);
        gameState.lng -= (Math.sin(gameState.heading) * 0.002);
    } else {
        gameState.score = Math.max(0, gameState.score - 20);
        showFloatingText("-20 PTS", '#ef4444');
    }
    
    document.getElementById('nav-icon').innerText = "⬆️";
    document.getElementById('nav-banner').style.background = "#006b52";
    document.getElementById('nav-instruction').innerText = "Free Roam Mode";
    document.getElementById('nav-subtext').innerText = "Drive safely to your destination";

    document.getElementById('score-display').innerText = gameState.score;
    gameState.isPaused = false;
    requestAnimationFrame(gameLoop);
}
