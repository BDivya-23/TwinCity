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

// === ANIMATED NUMBERS HELPER ===
function animateValue(id, start, end, duration, prefix = "", suffix = "") {
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        obj.innerHTML = prefix + current + suffix;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// === DASHBOARD LOGIC ===
function selectArea(name) {
    cityState.selectedArea = name;
    const area = cityState.areas[name];
    document.getElementById('problem-panel').innerHTML = `<strong>${name}</strong><br>Flood Severity: ${area.flood}/100<br>Traffic: ${area.traffic}/100`;
    document.getElementById('proposal-input').value = '';
    document.getElementById('advisor-container').style.display = 'none';
    document.getElementById('what-if-result').style.display = 'none';
    document.getElementById('approve-btn').disabled = true;

    // Trigger Rain for Velachery
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
    
    // Store old values for animation
    const oldBudget = cityState.budget;
    const oldHappiness = cityState.happiness;

    cityState.budget -= currentProposal.cost;
    area.flood = Math.max(0, area.flood - currentProposal.impact);
    area.solved = true;
    
    let happinessBonus = 5; if (currentProposal.keywords.includes('park')) happinessBonus = 15; if (currentProposal.keywords.includes('drain')) happinessBonus = 10; if (currentProposal.keywords.includes('metro')) happinessBonus = 5;  
    cityState.happiness = Math.min(100, cityState.happiness + happinessBonus);
    
    // Trigger floating text
    showFloatingText(`-₹${currentProposal.cost} Cr`, '#ef4444'); showFloatingText(`+${happinessBonus}% Happiness`, '#10b981');
    
    // Animate numbers in the dashboard
    animateValue('budget', oldBudget, cityState.budget, 1000, "₹", " Cr");
    animateValue('happiness', oldHappiness, cityState.happiness, 1000, "", "%");

    updateDashboard(); 
    saveGame();
    
    document.getElementById('approve-btn').disabled = true;
    document.getElementById('advisor-response').innerHTML += `<br><br><span style="color:#4ade80">✔ Implemented! Budget: ₹${cityState.budget} Cr</span>`;
    checkWinCondition(); 
}

function updateDashboard() {
    // Progress bars
    document.getElementById('budget-bar').style.width = `${(cityState.budget / 100) * 100}%`;
    if (cityState.budget < 30) document.getElementById('budget-bar').style.background = '#ef4444';
    document.getElementById('happiness-bar').style.width = `${cityState.happiness}%`;
    
    // Star rating
    const stars = Math.round(cityState.happiness / 20); 
    document.getElementById('star-rating').innerHTML = "⭐".repeat(stars) + "☆".repeat(5 - stars);

    // Achievements
    for (let name in cityState.areas) {
        if (cityState.areas[name].solved) {
            const badge = document.getElementById(`badge-${name.toLowerCase()}`);
            if (badge) {
                badge.classList.remove('badge-locked');
                badge.classList.add('badge-unlocked');
            }
        }
    }

    // Map Markers
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
    spawnTraffic(); 
    updateDashboard(); 
    
    // Set initial text without animation
    document.getElementById('budget').innerText = `₹${cityState.budget} Cr`;
    document.getElementById('happiness').innerText = `${cityState.happiness}%`;

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
// === AMBIENT TRAFFIC ===
// ==========================================
function spawnTraffic() {
    const emojis = ['🚙', '🚕', '🚌', '🚚', '🛵'];
    for(let i=0; i<10; i++) {
        const lat = 13.0500 + (Math.random() - 0.5) * 0.08;
        const lng = 80.2100 + (Math.random() - 0.5) * 0.08;
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        const rotation = Math.random() * 360;
        
        const carIcon = L.divIcon({ 
            className: 'custom-div-icon', 
            html: `<div style="font-size: 22px; opacity: 0.85; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.5)); transform: rotate(${rotation}deg);">${emoji}</div>`, 
            iconSize: [22, 22], iconAnchor: [11, 11]
        });
        const marker = L.marker([lat, lng], { icon: carIcon, zIndexOffset: 100 }).addTo(map);
        ambientCars.push(marker);
    }
}
