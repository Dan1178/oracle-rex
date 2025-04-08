const unitCounts = {
    "friendly-fighter": 0,
    "friendly-destroyer": 0,
    "friendly-cruiser": 0,
    "friendly-carrier": 0,
    "friendly-dreadnought": 0,
    "friendly-war_sun": 0,
    "friendly-flagship": 0,
    "enemy-fighter": 0,
    "enemy-destroyer": 0,
    "enemy-cruiser": 0,
    "enemy-carrier": 0,
    "enemy-dreadnought": 0,
    "enemy-war_sun": 0,
    "enemy-flagship": 0,
    "friendly-infantry": 0,
    "friendly-mech": 0,
    "enemy-infantry": 0,
    "enemy-mech": 0,
    "enemy-pds": 0,
    "enemy-space_dock": 0
};

const tacticalCalculatorTab = document.getElementById('tactical');
tacticalCalculatorTab.querySelectorAll('.arrow').forEach(button => {
    button.addEventListener('click', () => {
        const unit = button.getAttribute('data-unit');
        const isUp = button.classList.contains('up');

        if (isUp) {
            unitCounts[unit]++;
        } else {
            unitCounts[unit] = Math.max(0, unitCounts[unit] - 1);
        }

        const countElement = document.getElementById(`${unit}-count`);
        countElement.textContent = unitCounts[unit];
    });
});

function getForceCounts() {
    const battleData = {
        friendly_fleet: {},
        enemy_fleet: {},
        friendly_ground_forces: {},
        enemy_ground_forces_and_structures: {}
    };

    const friendlyFleetUnits = {
        fighter: unitCounts["friendly-fighter"],
        destroyer: unitCounts["friendly-destroyer"],
        cruiser: unitCounts["friendly-cruiser"],
        carrier: unitCounts["friendly-carrier"],
        dreadnought: unitCounts["friendly-dreadnought"],
        war_sun: unitCounts["friendly-war_sun"],
        flagship: unitCounts["friendly-flagship"]
    };
    for (const [unit, count] of Object.entries(friendlyFleetUnits)) {
        if (count > 0) {
            battleData.friendly_fleet[unit] = count;
        }
    }

    const enemyFleetUnits = {
        fighter: unitCounts["enemy-fighter"],
        destroyer: unitCounts["enemy-destroyer"],
        cruiser: unitCounts["enemy-cruiser"],
        carrier: unitCounts["enemy-carrier"],
        dreadnought: unitCounts["enemy-dreadnought"],
        war_sun: unitCounts["enemy-war_sun"],
        flagship: unitCounts["enemy-flagship"]
    };
    for (const [unit, count] of Object.entries(enemyFleetUnits)) {
        if (count > 0) {
            battleData.enemy_fleet[unit] = count;
        }
    }

    const friendlyGroundUnits = {
        infantry: unitCounts["friendly-infantry"],
        mechs: unitCounts["friendly-mech"]
    };
    for (const [unit, count] of Object.entries(friendlyGroundUnits)) {
        if (count > 0) {
            battleData.friendly_ground_forces[unit] = count;
        }
    }

    const enemyGroundUnits = {
        infantry: unitCounts["enemy-infantry"],
        mechs: unitCounts["enemy-mech"],
        pds: unitCounts["enemy-pds"],
        space_dock: unitCounts["enemy-space_dock"]
    };
    for (const [unit, count] of Object.entries(enemyGroundUnits)) {
        if (count > 0) {
            battleData.enemy_ground_forces_and_structures[unit] = count;
        }
    }

    return battleData;
}

function tacticalCalculator() {
    let forceData = getForceCounts();

    fetch('/api/tactical-calculator/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force_data: forceData })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('tactical-calculation-results').textContent = data.calc_results || data.error;
    })
    .catch(error => {
        document.getElementById('tactical-calculation-results').textContent = 'Error: ' + error;
    });
}