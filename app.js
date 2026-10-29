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
let infrastructureLayer; // Layer group for Map Transformations

// =============================================================
// PER-AREA MINI-CARDS & MAP ZOOM
// =============================================================
function handleAreaCardClick(name) {
    // 1. Cinematic Map Fly-To
    if (map) {
        const loc = locations.find(l => l.name === name);
        if (loc) map.flyTo(loc.coords, 15, { duration: 1.5 });
    }

    // 2. Update State & UI
    if (typeof selectArea === 'function') {
        selectArea(name, true); 
    }
    renderAreaCards();
    
    const panel = document.getElementById('problem-panel');
    if (panel) {
        const a = cityState.areas[name];
        panel.innerHTML = `<strong>${name}</strong><br>Flood Severity: ${a.flood}/100<br>Traffic: ${a.traffic}/100`;
    }
}

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
        if (a.solved) {
            tag = `<span class="area-solved-tag">APPROVED</span>`;
        } else if (isSelected) {
            tag = `<span class="area-solved-tag" style="color:#3b82f6; border-color:#3b82f6;">Selected</span>`;
        }

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
                    <div class="area-stat-bar flood">
                        <div style="width:${displayFlood}%;"></div>
                    </div>
                    <span class="area-stat-val">${displayFlood}</span>
                </div>
                <div class="area-stat-row">
                    <span class="stat-emoji">🚗</span>
                    <span class="stat-name">Traffic</span>
                    <div class="area-stat-bar traffic">
                        <div style="width:${displayTraffic}%;"></div>
                    </div>
                    <span class="area-stat-val">${displayTraffic}</span>
                </div>
            </div>
        `;
    }).join('');
}

// =============================================================
// QUICK-ACTION CHIPS
// =============================================================
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
function selectArea(name, fromUI = false) {
    const area = cityState.areas[name];
    if (area.solved) return; 

    cityState.selectedArea = name;
    
    const rainOverlay = document.getElementById('rain-overlay');
    if (name === 'Velachery') {
        rainOverlay.style.display = 'block';
    } else {
        rainOverlay.style.display = 'none';
    }
    
    document.getElementById('proposal-input').value = '';
    document.getElementById('advisor-container').style.display = 'none';
    document.getElementById('draft-document').style.display = 'none';
    document.getElementById('what-if-result').style.display = 'none';
    document.getElementById('approve-btn').disabled = true;

    if (!fromUI) {
        renderAreaCards(); // Update cards if clicked via map pin
    }
}

function evaluateProposal() {
    const text = document.getElementById('proposal-input').value.toLowerCase();
    if (!cityState.selectedArea) { 
        const unsolved = Object.keys(cityState.areas).find(k => !cityState.areas[k].solved);
        if(unsolved) {
            handleAreaCardClick(unsolved);
        } else {
            alert("All areas are already solved!"); 
            return;
        }
    }
    
    const area = cityState.areas[cityState.selectedArea];
    let matched = null;
    for (const rule of advisorRules) { if (rule.keywords.some(k => text.includes(k))) { matched = rule; break; } }
    
    const box = document.getElementById('advisor-response');
    const container = document.getElementById('advisor-container');
    const draftBox = document.getElementById('draft-document');
    const avatar = document.getElementById('advisor-avatar');
    const approveBtn = document.getElementById('approve-btn');
    const stamp = document.getElementById('draft-stamp');

    container.style.display = 'block'; 
    box.style.display = 'block';
    draftBox.style.display = 'none'; 
    stamp.classList.remove('slam');

    if (matched && !area.solved) {
        currentProposal = matched;
        box.innerHTML = `<span style="color:#4ade80">✅ Draft prepared.</span> I have drafted a formal resolution for the ${cityState.selectedArea} area. Please review and sign below.`;
        avatar.src = "https://api.dicebear.com/7.x/bottts/svg?seed=Felix&backgroundColor=10b981"; 
        avatar.style.borderColor = "#10b981";

        // Populate Draft Document
        document.getElementById('draft-subject').innerText = matched.text.split(':')[0];
        document.getElementById('draft-cost').innerText = `₹${matched.cost} Crore`;
        document.getElementById('draft-impact').innerText = `Reduce Flood Risk by ${matched.impact} points.`;
        
        draftBox.style.display = 'block';
        approveBtn.disabled = false;

    } else if (area.solved) {
        box.innerHTML = `<span style="color:#ef4444">⚠️ Already solved.</span>`; 
        approveBtn.disabled = true;
        avatar.src = "https://api.dicebear.com/7.x/bottts/svg?seed=Felix&backgroundColor=ef4444"; 
        avatar.style.borderColor = "#ef4444";
    } else {
        currentProposal = null;
        box.innerHTML = `<span style="color:#facc15">🤔 Unrecognized idea.</span> Try words like "drainage", "metro", "park", or "road".`;
        approveBtn.disabled = true;
        avatar.src = "https://api.dicebear.com/7.x/bottts/svg?seed=Felix&backgroundColor=facc15"; 
        avatar.style.borderColor = "#facc15";
    }
}

function approveProposal() {
    if (!currentProposal) return;
    const area = cityState.areas[cityState.selectedArea];
    if (cityState.budget < currentProposal.cost) { 
        document.getElementById('advisor-response').innerHTML = `<span style="color:#ef4444; font-weight:bold;">❌ INSUFFICIENT FUNDS!</span>`; 
        return; 
    }
    
    // 1. Play Stamp Animation
    const stamp = document.getElementById('draft-stamp');
    stamp.classList.add('slam');
    
    const approveBtn = document.getElementById('approve-btn');
    approveBtn.disabled = true;
    approveBtn.innerText = "Processing...";

    // 2. Apply Logic after stamp lands
    setTimeout(() => {
        cityState.budget -= currentProposal.cost;
        area.flood = 0; 
        area.traffic = 0;
        area.solved = true;
        
        let happinessBonus = 5; 
        if (currentProposal.keywords.includes('park')) happinessBonus = 15; 
        if (currentProposal.keywords.includes('drain')) happinessBonus = 10; 
        if (currentProposal.keywords.includes('metro')) happinessBonus = 5;  
        cityState.happiness = Math.min(100, cityState.happiness + happinessBonus);
        
        showFloatingText(`-₹${currentProposal.cost} Cr`, '#ef4444'); 
        showFloatingText(`+${happinessBonus}% Happiness`, '#10b981');
        
        updateDashboard(); 
        renderCityInfrastructure();
        saveGame();
        
        document.getElementById('advisor-response').innerHTML += `<br><br><span style="color:#4ade80">✔ Resolution signed! Budget: ₹${cityState.budget} Cr</span>`;
        document.getElementById('proposal-input').value = '';
        approveBtn.innerText = "✅ Implemented";

        checkWinCondition(); 
    }, 800); 
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
                iconSize: [120, 50],
                iconAnchor: [60, 25]
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

    if (happinessEl) {
        happinessEl.textContent = h + '%';
        happinessEl.style.color = color;
    }
    if (fill) {
        fill.style.width = h + '%';
        fill.style.background = color;
    }
    if (stars) {
        const filled = Math.round(h / 20);
        stars.textContent = '★'.repeat(filled) + '☆'.repeat(5 - filled);
    }
}

// =============================================================
// MAP TRANSFORMATIONS (DIGITAL TWIN)
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
        const metroCoords = [ [13.0503, 80.2121], [13.0450, 80.2200], [13.0400, 80.2350], [13.0350, 80.2500] ];
        const metroLine = L.polyline(metroCoords, {
            color: '#3b82f6', weight: 6, opacity: 0.9, dashArray: '10, 10', lineCap: 'round', className: 'metro-line-anim'
        }).addTo(infrastructureLayer);
        L.circleMarker([13.0503, 80.2121], { radius: 6, color: '#fff', weight: 2, fillColor: '#3b82f6', fillOpacity: 1 }).addTo(infrastructureLayer);
        metroLine.bindTooltip("🚇 New Metro Extension", { permanent: true, direction: "right", className: 'map-tooltip' });
    }

    if (cityState.areas['Velachery'].solved) {
        const parkCoords = [ [12.9800, 80.2150], [12.9780, 80.2210], [12.9720, 80.2220], [12.9710, 80.2160], [12.9750, 80.2130] ];
        L.polygon(parkCoords, {
            color: '#10b981', weight: 2, fillColor: '#10b981', fillOpacity: 0.4, className: 'park-fade-in'
        }).addTo(infrastructureLayer).bindTooltip("🌳 Flood Absorption Park", { permanent: true, direction: "center", className: 'map-tooltip' });
    }

    if (cityState.areas['Porur'].solved) {
        const ringRoadCoords = [ [13.0358, 80.1568], [13.0450, 80.1400], [13.0600, 80.1450], [13.0700, 80.1600], [13.0600, 80.1800], [13.0400, 80.1800], [13.0358, 80.1568] ];
        L.polyline(ringRoadCoords, {
            color: '#f59e0b', weight: 8, opacity: 0.8, lineCap: 'round', lineJoin: 'round'
        }).addTo(infrastructureLayer).bindTooltip("🛣️ New Porur Bypass", { permanent: true, direction: "center", className: 'map-tooltip' });
    }
}

// =============================================================
// STREET VIEW EXPLORATION (STREETQUEST)
// =============================================================
function startExploration() {
    const container = document.getElementById('street-view-container');
    const bg = document.getElementById('street-view-bg');
    container.style.display = 'block';
    bg.style.transform = 'translate(0px, 0px) scale(1.1)';

    container.onmousemove = (e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = (e.clientY / window.innerHeight) * 2 - 1;
        bg.style.transform = `translate(${x * -60}px, ${y * -30}px) scale(1.1)`;
    };
}

function stopExploration() {
    document.getElementById('street-view-container').style.display = 'none';
    document.getElementById('street-view-container').onmousemove = null;
}

function discoverProblem(areaName) {
    stopExploration();
    handleAreaCardClick(areaName);
    
    const panel = document.getElementById('problem-panel');
    if(panel) {
        panel.style.boxShadow = "0 0 20px rgba(239, 68, 68, 0.8)";
        setTimeout(() => { panel.style.boxShadow = "none"; }, 3000);
    }
    document.getElementById('proposal-input').value = "Investigate and fix ";
    document.getElementById('proposal-input').focus();
}

// =============================================================
// INITIALIZATION & HELPERS
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
    setTimeout(() => { 
        map.invalidateSize(); 
        renderAreaCards(); 
    }, 250);
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
        marker.on('click', function() { 
            selectArea(loc.name); 
            renderAreaCards();
        });
    });
}
