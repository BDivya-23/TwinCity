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
    { keywords: ['drain', 'water', 'flood'], cost: 20, impact: 30, text: "Drainage system" },
    { keywords: ['metro', 'train', 'transport'], cost: 40, impact: 25, text: "Metro extension" },
    { keywords: ['park', 'green', 'tree'], cost: 10, impact: 10, text: "Green spaces" },
    { keywords: ['road', 'pothole'], cost: 15, impact: 15, text: "Road repairs" }
];

let currentProposal = null;
let map;
let mapMarkers = {}; 
let infrastructureLayer; 
let ambientCars = [];

// =============================================================
// UI UPDATERS
// =============================================================
function renderAreaCards() {
    const container = document.getElementById('area-cards-container');
    if (!container) return;

    const names = Object.keys(cityState.areas);

    container.innerHTML = names.map(name => {
        const a = cityState.areas[name];
        const isSelected = cityState.selectedArea === name;
        const displayFlood = a.solved ? 0 : a.flood;
        const displayTraffic = a.solved ? 0 : a.traffic;

        let cls = 'area-card';
        if (isSelected) cls += ' selected';
        if (a.solved)   cls += ' solved';
        if (!a.solved && !isSelected) cls += ' pick-hint';

        let tag = '';
        if (a.solved) tag = `<span class="area-solved-tag">APPROVED</span>`;
        else if (isSelected) tag = `<span class="area-solved-tag" style="color:#3b82f6; border-color:#3b82f6;">Selected</span>`;

        return `
            <div class="${cls}" data-area="${name}" onclick="handleAreaCardClick('${name}')">
                <div class="area-card-header">
                    <span class="area-status-dot"></span>
                    <span class="area-name">${name}</span>
                    ${tag}
                </div>
                <div class="area-stat-row">
                    <span class="stat-emoji">🌊</span>
                    <span class="stat-name">Flood</span>
                    <div class="area-stat-bar flood"><div style="width:${displayFlood}%;"></div></div>
                    <span class="area-stat-val">${displayFlood}</span>
                </div>
                <div class="area-stat-row">
                    <span class="stat-emoji">🚗</span>
                    <span class="stat-name">Traffic</span>
                    <div class="area-stat-bar traffic"><div style="width:${displayTraffic}%;"></div></div>
                    <span class="area-stat-val">${displayTraffic}</span>
                </div>
            </div>
        `;
    }).join('');
}

function handleAreaCardClick(name) {
    if (typeof selectArea === 'function') selectArea(name);
    renderAreaCards();
    const panel = document.getElementById('problem-panel');
    if (panel) {
        const a = cityState.areas[name];
        panel.innerHTML = `<strong>${name}</strong><br>Flood Severity: ${a.flood}/100<br>Traffic: ${a.traffic}/100`;
    }
}

function appendChip(text) {
    const input = document.getElementById('proposal-input');
    if (!input) return;
    const existing = input.value.trim();
    if (!existing) {
        input.value = text;
    } else {
        if (existing.toLowerCase().includes(text.toLowerCase())) return;
        input.value = existing + ', ' + text;
    }
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
}

// =============================================================
// CORE LOGIC
// =============================================================
function selectArea(name) {
    const area = cityState.areas[name];
    if (area.solved) return; 

    cityState.selectedArea = name;
    const rainOverlay = document.getElementById('rain-overlay');
    if (name === 'Velachery') rainOverlay.style.display = 'block';
    else rainOverlay.style.display = 'none';
    
    document.getElementById('proposal-input').value = '';
    document.getElementById('advisor-container').style.display = 'none';
    document.getElementById('what-if-result').style.display = 'none';
    document.getElementById('approve-btn').disabled = true;
}

function evaluateProposal() {
    const text = document.getElementById('proposal-input').value.toLowerCase();
    if (!cityState.selectedArea) { 
        const unsolved = Object.keys(cityState.areas).find(k => !cityState.areas[k].solved);
        if(unsolved) handleAreaCardClick(unsolved);
        else { alert("All areas are already solved!"); return; }
    }
    
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
    if (cityState.budget < currentProposal.cost) { 
        document.getElementById('advisor-response').innerHTML = `<span style="color:#ef4444; font-weight:bold;">❌ INSUFFICIENT FUNDS!</span>`; 
        return; 
    }
    
    // Update State
    cityState.budget -= currentProposal.cost;
    area.flood = 0; 
    area.traffic = 0;
    area.solved = true;
    
    let happinessBonus = 5; 
    if (currentProposal.keywords.includes('park')) happinessBonus = 15; 
    if (currentProposal.keywords.includes('drain')) happinessBonus = 10; 
    if (currentProposal.keywords.includes('metro')) happinessBonus = 5;  
    cityState.happiness = Math.min(100, cityState.happiness + happinessBonus);
    
    // Populate Modal
    document.getElementById('draft-subject').innerText = currentProposal.text;
    document.getElementById('draft-cost').innerText = `₹${currentProposal.cost} Crore`;
    document.getElementById('draft-impact').innerText = `Reduce risk by ${currentProposal.impact} points.`;
    document.getElementById('resolution-overlay').style.display = 'flex';

    // UI Updates
    showFloatingText(`-₹${currentProposal.cost} Cr`, '#ef4444'); 
    showFloatingText(`+${happinessBonus}% Happiness`, '#10b981');
    updateDashboard(); 
    renderCityInfrastructure(); 
    saveGame();
    
    document.getElementById('approve-btn').disabled = true;
    document.getElementById('advisor-response').innerHTML += `<br><br><span style="color:#4ade80">✔ Implemented! Budget: ₹${cityState.budget} Cr</span>`;
    document.getElementById('proposal-input').value = '';

    checkWinCondition(); 
}

function closeResolution() {
    document.getElementById('resolution-overlay').style.display = 'none';
}

// =============================================================
// DASHBOARD UPDATERS
// =============================================================
function updateDashboard() {
    renderDonut();
    renderApproval();
    renderAreaCards();

    for (let name in cityState.areas) {
        if (cityState.areas[name].solved) {
            const badge = document.getElementById(`badge-${name.toLowerCase()}`);
            if (badge) {
                badge.classList.remove('badge-locked');
                badge.classList.add('badge-unlocked');
            }
        }
    }

    for (let name in cityState.areas) {
        if (cityState.areas[name].solved && mapMarkers[name]) {
            mapMarkers[name].setIcon(L.divIcon({
                className: 'custom-div-icon',
                html: `<div class='map-marker solved'>📍 ${name}<div class='map-stamp-text'>APPROVED</div></div>`,
                iconSize: [120, 50], iconAnchor: [60, 25]
            }));
        }
    }
}

function renderDonut() {
    const remaining = cityState.budget;
    const total = 100;
    const spent = Math.max(0, total - remaining);
    const circumference = 2 * Math.PI * 50;

    const remainingLen = (remaining / total) * circumference;
    const spentLen = (spent / total) * circumference;

    const remainingCircle = document.getElementById('donut-remaining');
    const spentCircle = document.getElementById('donut-spent');

    if (remainingCircle) {
        remainingCircle.setAttribute('stroke-dasharray', `${remainingLen} ${circumference - remainingLen}`);
        remainingCircle.setAttribute('stroke-dashoffset', `${-spentLen}`);
    }
    if (spentCircle) {
        spentCircle.setAttribute('stroke-dasharray', `${spentLen} ${circumference - spentLen}`);
    }

    const amountEl = document.getElementById('donut-amount');
    if (amountEl) {
        amountEl.textContent = '₹' + remaining;
        amountEl.style.color = remaining < 30 ? '#ef4444' : '#10b981';
    }

    const legendRem = document.getElementById('legend-remaining');
    const legendSpent = document.getElementById('legend-spent');
    if (legendRem) legendRem.textContent = '₹' + remaining + ' Cr';
    if (legendSpent) legendSpent.textContent = '₹' + spent + ' Cr';
}

function renderApproval() {
    const h = cityState.happiness;
    let emoji = '😐'; let color = '#facc15';
    if (h < 40)      { emoji = '😡'; color = '#ef4444'; }
    else if (h < 60) { emoji = '😟'; color = '#f97316'; }
    else if (h < 75) { emoji = '😐'; color = '#facc15'; }
    else if (h < 90) { emoji = '🙂'; color = '#3b82f6'; }
    else             { emoji = '😄'; color = '#10b981'; }

    const emojiEl = document.getElementById('approval-emoji');
    const happinessEl = document.getElementById('happiness');
    const fill = document.getElementById('happiness-bar');
    const stars = document.getElementById('star-rating');

    if (emojiEl && emojiEl.textContent !== emoji) {
        emojiEl.textContent = emoji;
        emojiEl.classList.remove('bump');
        void emojiEl.offsetWidth;
        emojiEl.classList.add('bump');
    }
    if (happinessEl) { happinessEl.textContent = h + '%'; happinessEl.style.color = color; }
    if (fill) { fill.style.width = h + '%'; fill.style.background = color; }
    if (stars) {
        const filled = Math.round(h / 20);
        stars.textContent = '★'.repeat(filled) + '☆'.repeat(5 - filled);
    }
}

// =============================================================
// MAP TRANSFORMATIONS
// =============================================================
function initInfrastructureLayer() {
    if (typeof map !== 'undefined' && !infrastructureLayer) {
        infrastructureLayer = L.layerGroup().addTo(map);
    }
}

function renderCityInfrastructure() {
    if (!infrastructureLayer) initInfrastructureLayer();
    if (!infrastructureLayer) return;
    infrastructureLayer.clearLayers();

    if (cityState.areas['Vadapalani'].solved) {
        const metroCoords = [[13.0503, 80.2121], [13.0450, 80.2200], [13.0400, 80.2350], [13.0350, 80.2500]];
        const metroLine = L.polyline(metroCoords, { color: '#3b82f6', weight: 6, opacity: 0.9, dashArray: '10, 10', lineCap: 'round' }).addTo(infrastructureLayer);
        L.circleMarker([13.0503, 80.2121], { radius: 6, color: '#fff', weight: 2, fillColor: '#3b82f6', fillOpacity: 1 }).addTo(infrastructureLayer);
        metroLine.bindTooltip("🚇 New Metro Extension", { permanent: true, direction: "right", className: 'map-tooltip' });
    }

    if (cityState.areas['Velachery'].solved) {
        const parkCoords = [[12.9800, 80.2150], [12.9780, 80.2210], [12.9720, 80.2220], [12.9710, 80.2160], [12.9750, 80.2130]];
        L.polygon(parkCoords, { color: '#10b981', weight: 2, fillColor: '#10b981', fillOpacity: 0.4 }).addTo(infrastructureLayer).bindTooltip("🌳 Flood Absorption Park", { permanent: true, direction: "center", className: 'map-tooltip' });
    }

    if (cityState.areas['Porur'].solved) {
        const ringRoadCoords = [[13.0358, 80.1568], [13.0450, 80.1400], [13.0600, 80.1450], [13.0700, 80.1600], [13.0600, 80.1800], [13.0400, 80.1800], [13.0358, 80.1568]];
        L.polyline(ringRoadCoords, { color: '#f59e0b', weight: 8, opacity: 0.8, lineCap: 'round', lineJoin: 'round' }).addTo(infrastructureLayer).bindTooltip("🛣️ New Porur Bypass", { permanent: true, direction: "center", className: 'map-tooltip' });
    }
}

// =============================================================
// STREET HERO MODE (MINI-GAME)
// =============================================================
let heroPosition = 10; 
const heroSpeed = 2; 
let currentHeroTarget = 'Porur'; 

function startStreetHero() {
    const unsolved = Object.keys(cityState.areas).find(k => !cityState.areas[k].solved);
    if (!unsolved) { alert("All zones are already solved! You are a true hero."); return; }

    currentHeroTarget = unsolved;
    const icon = document.getElementById('hero-problem-icon');
    const newsText = document.getElementById('breaking-news-text');
    
    if (currentHeroTarget === 'Velachery') {
        newsText.innerText = "🌊 Flooding reported in Velachery! Citizens are stranded.";
        icon.innerText = "🌊";
    } else if (currentHeroTarget === 'Vadapalani') {
        newsText.innerText = "🚦 Massive traffic jam in Vadapalani! Broken signals detected.";
        icon.innerText = "🚦";
    } else {
        newsText.innerText = "🚧 Large pothole reported in Porur! Vehicles are getting damaged.";
        icon.innerText = "🚧";
    }

    heroPosition = 10;
    updateHeroPosition();
    
    document.getElementById('street-hero-overlay').style.display = 'block';
    document.getElementById('breaking-news').style.animation = 'newsSlide 0.5s ease-out';
}

function stopStreetHero() {
    document.getElementById('street-hero-overlay').style.display = 'none';
}

function moveHero(direction) {
    const character = document.getElementById('hero-character');
    character.classList.add('walking');

    if (direction === 'right' && heroPosition < 80) heroPosition += heroSpeed;
    else if (direction === 'left' && heroPosition > 10) heroPosition -= heroSpeed;

    updateHeroPosition();
    
    clearTimeout(window.walkTimeout);
    window.walkTimeout = setTimeout(() => { character.classList.remove('walking'); }, 200);
}

function updateHeroPosition() {
    const character = document.getElementById('hero-character');
    const bg = document.getElementById('hero-street-bg');
    const problem = document.getElementById('hero-problem');

    character.style.left = `${heroPosition}%`;
    bg.style.transform = `translateX(-${heroPosition * 0.5}%)`;

    if (heroPosition > 45 && heroPosition < 55) {
        problem.style.display = 'flex';
        problem.style.left = `${heroPosition}%`;
    } else {
        problem.style.display = 'none';
    }
}

document.addEventListener('keydown', (e) => {
    if (document.getElementById('street-hero-overlay').style.display === 'block') {
        if (e.key === 'ArrowRight' || e.key === 'd') moveHero('right');
        if (e.key === 'ArrowLeft' || e.key === 'a') moveHero('left');
    }
});

function openMissionModal() {
    const title = document.getElementById('mission-title');
    const desc = document.getElementById('mission-desc');
    
    if (currentHeroTarget === 'Velachery') {
        title.innerText = "🔍 BLOCKED DRAINAGE SYSTEM";
        desc.innerText = "Water is overflowing because the storm drains are completely blocked with debris. How would you like to proceed?";
    } else if (currentHeroTarget === 'Vadapalani') {
        title.innerText = "🔍 BROKEN TRAFFIC SIGNAL";
        desc.innerText = "The main junction signal is down, causing a massive gridlock. How would you like to proceed?";
    } else {
        title.innerText = "🔍 SEVERE ROAD DAMAGE";
        desc.innerText = "A massive pothole has formed, risking accidents for commuters. How would you like to proceed?";
    }

    document.getElementById('mission-modal').style.display = 'flex';
}

function closeMissionModal() {
    document.getElementById('mission-modal').style.display = 'none';
}

function solveHeroMission(cost, impact) {
    if (cityState.budget < cost) { alert("❌ INSUFFICIENT FUNDS! You don't have enough money in the treasury."); return; }

    cityState.budget -= cost;
    const area = cityState.areas[currentHeroTarget];
    area.flood = 0;
    area.traffic = 0;
    area.solved = true;
    cityState.happiness = Math.min(100, cityState.happiness + 15);

    const icon = document.getElementById('hero-problem-icon');
    icon.innerText = "✅"; icon.style.borderColor = "#10b981";
    closeMissionModal();
    
    // Populate and show resolution modal
    document.getElementById('draft-subject').innerText = `Emergency Repair: ${currentHeroTarget}`;
    document.getElementById('draft-cost').innerText = `₹${cost} Crore`;
    document.getElementById('draft-impact').innerText = `Restored city infrastructure.`;
    document.getElementById('resolution-overlay').style.display = 'flex';

    setTimeout(() => {
        stopStreetHero();
        updateDashboard(); renderCityInfrastructure(); saveGame(); checkWinCondition(); handleAreaCardClick(currentHeroTarget);
    }, 1000);
}

// =============================================================
// INITIALIZATION
// =============================================================
window.onload = function() {
    const savedState = localStorage.getItem('twinCityState');
    if (savedState) Object.assign(cityState, JSON.parse(savedState));
    
    initMap(); 
    initInfrastructureLayer();
    renderCityInfrastructure(); 
    updateDashboard(); 
    
    const budgetSpan = document.getElementById('budget');
    if(budgetSpan) budgetSpan.innerText = `₹${cityState.budget} Cr`;
    const happSpan = document.getElementById('happiness');
    if(happSpan) happSpan.innerText = `${cityState.happiness}%`;

    const unsolved = Object.keys(cityState.areas).find(k => !cityState.areas[k].solved);
    if(unsolved) handleAreaCardClick(unsolved);

    checkWinCondition(); 
    setTimeout(() => { map.invalidateSize(); renderAreaCards(); }, 250);
};

function saveGame() { localStorage.setItem('twinCityState', JSON.stringify(cityState)); }
function checkWinCondition() { if (Object.values(cityState.areas).every(a => a.solved)) { setTimeout(() => { document.getElementById('victory-screen').style.display = 'flex'; }, 1000); } }
function resetGame() { localStorage.removeItem('twinCityState'); location.reload(); }
function showFloatingText(text, color) { const el = document.createElement('div'); el.className = 'floating-text'; el.textContent = text; el.style.color = color; el.style.left = '60%'; el.style.top = '40%'; document.body.appendChild(el); setTimeout(() => el.remove(), 1500); }

function simulateWhatIf(type) {
    if (!cityState.selectedArea) { alert("Please select an area on the map first!"); return; }
    const area = cityState.areas[cityState.selectedArea]; const resultBox = document.getElementById('what-if-result'); resultBox.style.display = 'block';
    if (type === 'metro') { resultBox.innerHTML = `<strong>🚇 Metro Extension</strong><br>Cost: ₹40 Cr<br>Traffic Impact: -25 points<br>Flood Impact: 0 points<br><em>Budget after: ₹${cityState.budget - 40} Cr</em>`; document.getElementById('proposal-input').value = "metro extension"; } 
    else if (type === 'drainage') { const floodReduction = area.flood > 50 ? "High" : "Medium"; resultBox.innerHTML = `<strong>🌊 Drainage System</strong><br>Cost: ₹20 Cr<br>Flood Impact: -30 points (${floodReduction})<br>Traffic Impact: 0 points<br><em>Budget after: ₹${cityState.budget - 20} Cr</em>`; document.getElementById('proposal-input').value = "drainage system"; }
    evaluateProposal(); 
}

function initMap() {
    map = L.map('map', { dragging: true, zoomControl: true }).setView([13.0500, 80.2100], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    
    locations.forEach(loc => {
        const customIcon = L.divIcon({ className: 'custom-div-icon', html: `<div class='map-marker'>📍 ${loc.name}</div>`, iconSize: [100, 30], iconAnchor: [50, 15] });
        const marker = L.marker(loc.coords, { icon: customIcon }).addTo(map);
        mapMarkers[loc.name] = marker;
        marker.on('click', function() { handleAreaCardClick(loc.name); });
    });
}
