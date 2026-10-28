// === STATE ===
const cityState = {
    budget: 100,
    happiness: 85,
    selectedArea: null,
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

// === SELECT AREA ===
function selectArea(name) {
    cityState.selectedArea = name;
    const area = cityState.areas[name];
    document.getElementById('problem-panel').innerHTML =
        `<strong>${name}</strong><br>
         Flood Severity: ${area.flood}/100<br>
         Traffic: ${area.traffic}/100`;
    document.getElementById('proposal-input').value = '';
    document.getElementById('advisor-response').style.display = 'none';
    document.getElementById('approve-btn').disabled = true;
    document.getElementById('what-if-result').style.display = 'none';
}

// === EVALUATE PROPOSAL ===
function evaluateProposal() {
    const text = document.getElementById('proposal-input').value.toLowerCase();
    
    if (!cityState.selectedArea) {
        alert("Please click a location on the map first!");
        return;
    }

    const area = cityState.areas[cityState.selectedArea];
    let matched = null;

    for (const rule of advisorRules) {
        if (rule.keywords.some(k => text.includes(k))) { matched = rule; break; }
    }

    const box = document.getElementById('advisor-response');
    box.style.display = 'block';

    if (matched && !area.solved) {
        currentProposal = matched;
        box.innerHTML = `<span style="color:#4ade80">✅ Recommended</span><br>${matched.text}<br>
            <em>Reason: recognized keyword matching proposal.</em>`;
        document.getElementById('approve-btn').disabled = false;
    } else if (area.solved) {
        box.innerHTML = `<span style="color:#ef4444">⚠️ Already solved.</span>`;
        document.getElementById('approve-btn').disabled = true;
    } else {
        currentProposal = null;
        box.innerHTML = `<span style="color:#facc15">🤔 Unrecognized idea.</span> Try words like "drainage", "metro", "park", or "road".`;
        document.getElementById('approve-btn').disabled = true;
    }
}

// === APPROVE & SIMULATE ===
function approveProposal() {
    if (!currentProposal) return;
    const area = cityState.areas[cityState.selectedArea];

    if (cityState.budget < currentProposal.cost) {
        const responseBox = document.getElementById('advisor-response');
        responseBox.innerHTML = `<span style="color:#ef4444; font-weight:bold;">❌ INSUFFICIENT FUNDS!</span><br>
        This solution costs ₹${currentProposal.cost} Cr, but you only have ₹${cityState.budget} Cr left.<br>
        <em>The city council has rejected your proposal.</em>`;
        return;
    }

    cityState.budget -= currentProposal.cost;
    area.flood = Math.max(0, area.flood - currentProposal.impact);
    area.solved = true;
    
    let happinessBonus = 5; 
    if (currentProposal.keywords.includes('park')) happinessBonus = 15; 
    if (currentProposal.keywords.includes('drain')) happinessBonus = 10; 
    if (currentProposal.keywords.includes('metro')) happinessBonus = 5;  
    
    cityState.happiness = Math.min(100, cityState.happiness + happinessBonus);

    updateDashboard();
    saveGame();
    
    document.getElementById('approve-btn').disabled = true;
    document.getElementById('advisor-response').innerHTML +=
        `<br><br><span style="color:#4ade80">✔ Implemented! Budget: ₹${cityState.budget} Cr</span>`;
        
    checkWinCondition(); 
}

// === UPDATE UI ===
function updateDashboard() {
    document.getElementById('budget').textContent = `₹${cityState.budget} Cr`;
    document.getElementById('happiness').textContent = `${cityState.happiness}%`;
    
    const budgetPercent = (cityState.budget / 100) * 100;
    document.getElementById('budget-bar').style.width = `${budgetPercent}%`;
    if (budgetPercent < 30) {
        document.getElementById('budget-bar').style.background = '#ef4444'; 
    }

    document.getElementById('happiness-bar').style.width = `${cityState.happiness}%`;

    // Update Leaflet Markers
    for (let name in cityState.areas) {
        if (cityState.areas[name].solved && mapMarkers[name]) {
            mapMarkers[name].setIcon(L.divIcon({
                className: 'custom-div-icon',
                html: `<div class='map-marker solved'>✅ ${name} (Solved)</div>`,
                iconSize: [150, 30],
                iconAnchor: [75, 15]
            }));
        }
    }

    if (cityState.selectedArea) selectArea(cityState.selectedArea);
}

// === INITIALIZE ON LOAD ===
window.onload = function() {
    const savedState = localStorage.getItem('twinCityState');
    if (savedState) {
        Object.assign(cityState, JSON.parse(savedState));
    }
    
    initMap();
    updateDashboard();
    checkWinCondition(); 
    
    // Leaflet needs this to resize properly if the page loads slowly
    setTimeout(() => { map.invalidateSize(); }, 200);
};

function saveGame() {
    localStorage.setItem('twinCityState', JSON.stringify(cityState));
}

function checkWinCondition() {
    const allSolved = Object.values(cityState.areas).every(a => a.solved);
    if (allSolved) {
        setTimeout(() => {
            alert("🏆 MISSION ACCOMPLISHED!\n\nYou have successfully resolved all major crises in Chennai! The citizens thank you, Mayor.");
        }, 500);
    }
}

// === WHAT IF SIMULATOR ===
function simulateWhatIf(type) {
    if (!cityState.selectedArea) {
        alert("Please select an area on the map first!");
        return;
    }
    
    const area = cityState.areas[cityState.selectedArea];
    const resultBox = document.getElementById('what-if-result');
    resultBox.style.display = 'block';

    if (type === 'metro') {
        resultBox.innerHTML = `<strong>🚇 Metro Extension</strong><br>
        Cost: ₹40 Cr<br>
        Traffic Impact: -25 points<br>
        Flood Impact: 0 points<br>
        <em>Budget after: ₹${cityState.budget - 40} Cr</em>`;
        document.getElementById('proposal-input').value = "Build a metro extension";
    } 
    else if (type === 'drainage') {
        const floodReduction = area.flood > 50 ? "High" : "Medium";
        resultBox.innerHTML = `<strong>🌊 Drainage System</strong><br>
        Cost: ₹20 Cr<br>
        Flood Impact: -30 points (${floodReduction})<br>
        Traffic Impact: 0 points<br>
        <em>Budget after: ₹${cityState.budget - 20} Cr</em>`;
        document.getElementById('proposal-input').value = "Build a new drainage system";
    }
    evaluateProposal(); 
}

// === REAL INTERACTIVE MAP SETUP ===
function initMap() {
    map = L.map('map').setView([13.0500, 80.2100], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);

    const locations = [
        { name: 'Velachery', coords: [12.9750, 80.2210] },
        { name: 'Vadapalani', coords: [13.0503, 80.2121] },
        { name: 'Porur', coords: [13.0358, 80.1568] }
    ];

    locations.forEach(loc => {
        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class='map-marker'>📍 ${loc.name}</div>`,
            iconSize: [100, 30],
            iconAnchor: [50, 15]
        });

        const marker = L.marker(loc.coords, { icon: customIcon }).addTo(map);
        mapMarkers[loc.name] = marker;

        marker.on('click', function() {
            selectArea(loc.name); 
        });
    });
}
