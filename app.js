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
}

// === EVALUATE PROPOSAL ===
function evaluateProposal() {
    const text = document.getElementById('proposal-input').value.toLowerCase();
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
        alert("Insufficient budget!");
        return;
    }

    cityState.budget -= currentProposal.cost;
    area.flood = Math.max(0, area.flood - currentProposal.impact);
    area.solved = true;
    cityState.happiness = Math.min(100, cityState.happiness + 5);

    updateDashboard();
    saveGame();
    document.getElementById('approve-btn').disabled = true;
    document.getElementById('advisor-response').innerHTML +=
        `<br><br><span style="color:#4ade80">✔ Implemented! Budget: ₹${cityState.budget} Cr</span>`;
}

// === UPDATE UI ===
function updateDashboard() {
    document.getElementById('budget').textContent = `₹${cityState.budget} Cr`;
    document.getElementById('happiness').textContent = `${cityState.happiness}%`;
    if (cityState.selectedArea) selectArea(cityState.selectedArea);
}

// Initialize on load// Initialize on load
window.onload = function() {
    const savedState = localStorage.getItem('twinCityState');
    if (savedState) {
        // Load saved game
        Object.assign(cityState, JSON.parse(savedState));
    }
    updateDashboard();
};

// Save game after every decision
function saveGame() {
    localStorage.setItem('twinCityState', JSON.stringify(cityState));
}
