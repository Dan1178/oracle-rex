const planetElements = [
        document.getElementById('fleet-mgmt-planet-one'),
        document.getElementById('fleet-mgmt-planet-two'),
        document.getElementById('fleet-mgmt-planet-three')
];

function positionFleetManagementWindow(hexTile, fleetManagementWindow, event) {
    const mouseX = event.pageX - 250;
    const mouseY = event.pageY - 300;

    fleetManagementWindow.style.display = 'block';
    fleetManagementWindow.style.position = 'relative';
    fleetManagementWindow.style.left = `${mouseX}px`;
    fleetManagementWindow.style.top = `${mouseY}px`;
}

function updateShipCount(unit, isUp, activeSystem) {
    if (!activeSystem) return;

    let fleetData = activeSystem.fleet;
    if (!fleetData) {
        const ownerSelect = document.getElementById('fleet-management-fleet-owner');
        fleetData = {
            ships: {},
            owner: ownerSelect.value
        };
        activeSystem.fleet = fleetData;
    }

    let ships = fleetData.ships
    let currentCount = ships[unit] || 0;
    let newCount = isUp ? currentCount + 1 : Math.max(0, currentCount - 1);

    if (newCount === 0) {
        delete ships[unit];
    } else {
        ships[unit] = newCount;
    }

    fleetData.ships = ships;
    activeSystem.fleet = fleetData;
}

function updateUnitCount(unit, isUp, activePlanet, planetIndex) {
    if (!activePlanet) return;

    let isUnit = (unit == 'infantry' || unit == 'mech');
    let groundForcesData = activePlanet.ground_forces;
    if (!groundForcesData) {
        const ownerSelect = document.getElementById(planetElements[planetIndex].id + '-owner');
        groundForcesData = {
            structures: {},
            units: {},
            owner: ownerSelect.value
        };
        activePlanet.ground_forces = groundForcesData;
    }

    let units = groundForcesData.units
    let structures = groundForcesData.structures
    let currentCount = 0;
    if (isUnit) {
        currentCount = units[unit] || 0;
    } else {
        currentCount = structures[unit] || 0;
    }
    let newCount = isUp ? currentCount + 1 : Math.max(0, currentCount - 1);

    if (newCount === 0) {
        if (isUnit) {
            delete units[unit];
        } else {
            delete structures[unit];
        }
    } else {
        if (isUnit) {
            units[unit] = newCount;
        } else {
            structures[unit] = newCount;
        }
    }

    groundForcesData.structures = structures;
    groundForcesData.units = units;
    activePlanet.ground_forces = groundForcesData;
}

function loadFleetData(activeSystem) {
    const fleetData = activeSystem.fleet;
    const shipTypes = ['fighter', 'destroyer', 'cruiser', 'carrier', 'dreadnought', 'war_sun', 'flagship'];
    const ownerSelect = document.getElementById('fleet-management-fleet-owner');
    ownerSelect.value = "Player 1";
    shipTypes.forEach(unit => {
        document.getElementById(`fleet-${unit}-count`).textContent = '0';
    });
    if (!fleetData) return;

    const ships = fleetData.ships || {};
    for (const [shipType, count] of Object.entries(ships)) {
        const countElement = document.getElementById(`fleet-${shipType}-count`);
        if (countElement) {
            countElement.textContent = count || 0;
        }
    }


    ownerSelect.value = fleetData.owner || "Player 1";
}

function loadPlanetData(activePlanet, planetSection) {
    const groundForcesData = activePlanet.ground_forces;
    const planetHeader = planetSection.querySelector("h2");
    planetHeader.textContent = activePlanet.name;
    const ownerSelect = document.getElementById(planetSection.id + '-owner');
    ownerSelect.value = "None";

    const unitTypes = ['infantry', 'mech'];
    const structureTypes = ['pds', 'space_dock'];
    unitTypes.forEach(unit => {
        planetSection.querySelector(`#` + planetSection.id + `-${unit}-count`).textContent = '0';
    });

    structureTypes.forEach(unit => {
        planetSection.querySelector(`#` + planetSection.id + `-${unit}-count`).textContent = '0';
    });

    if (!groundForcesData) return;

    const units = groundForcesData.units || {};
    for (const [unitType, count] of Object.entries(units)) {
        const countElement = planetSection.querySelector(`#` + planetSection.id + `-${unitType}-count`);
        if (countElement) {
            countElement.textContent = count || 0;
        }
    }
    const structures = groundForcesData.structures || {};
    for (const [structureType, count] of Object.entries(structures)) {
        const countElement = planetSection.querySelector(`#` + planetSection.id + `-${structureType}-count`);
        if (countElement) {
            countElement.textContent = count || 0;
        }
    }

    ownerSelect.value = groundForcesData.owner || "None";
}

function loadSystemPlanetsData(activeSystem) {
    const planets = activeSystem.planets;
    const planetsDisplaySection = document.getElementById('planets-section');

    planetsDisplaySection.classList.toggle('active', planets.length > 0);
    if (planets.length === 0) return;

    for (let i = 0; i < planetElements.length; i++) {
        const planetEl = planetElements[i];
        const planet = planets[i];

        const shouldBeActive = planet !== undefined;
        planetEl.classList.toggle('active', shouldBeActive);

        if (shouldBeActive) {
            loadPlanetData(planet, planetEl);
        }
    }
}

function initializeFleetManager() {
    const fleetBoard = document.getElementById('board-preview fleet');
    const fleetManagementWindow = document.getElementById('fleet-management-window');
    const fleetManagementSection = document.getElementById('fleet-section');
    const fleetOwnerSelect = document.getElementById('fleet-management-fleet-owner');
    const planetSection = document.getElementById('planets-section');

    fleetBoard.addEventListener('click', (event) => {
        const hexTile = event.target.closest('.hex');
        if (!hexTile) return;

        const hasImage = hexTile.style.backgroundImage !== '';
        if (!hasImage) return;

        const previousActive = fleetBoard.querySelector('.hex.active');
        if (previousActive) {
            previousActive.classList.remove('active');
            fleetManagementWindow.style.display = 'none';
        }

        hexTile.classList.add('active');
        activeDesignation = hexTile.getAttribute('data-position');
        const activeSystem = window.fleetGameData.board.find(system => system['designation'] === activeDesignation).system
        loadFleetData(activeSystem);
        loadSystemPlanetsData(activeSystem);
        positionFleetManagementWindow(hexTile, fleetManagementWindow, event);
    });

    fleetManagementSection.querySelectorAll('.arrow').forEach(button => {
        button.addEventListener('click', () => {
            const activeHex = fleetBoard.querySelector('.hex.active').getAttribute('data-position');
            const activeSystem = window.fleetGameData.board.find(system => system['designation'] === activeHex).system
            const unit = button.getAttribute('data-unit');
            const isUp = button.classList.contains('up');

            updateShipCount(unit, isUp, activeSystem);

            const countElement = document.getElementById(`fleet-${unit}-count`);
            const currentCount = parseInt(countElement.textContent, 10);
            const newCount = isUp ? currentCount + 1 : Math.max(0, currentCount - 1);
            countElement.textContent = newCount;
        });
    });

    planetSection.querySelectorAll('.arrow').forEach(button => {
        button.addEventListener('click', () => {
            const activeHex = fleetBoard.querySelector('.hex.active').getAttribute('data-position');
            const planetIndex = button.parentElement.getAttribute('data-planet-index');
            const activePlanet = window.fleetGameData.board.find(system => system['designation'] === activeHex).system.planets[planetIndex]
            const unit = button.getAttribute('data-unit');
            const isUp = button.classList.contains('up');

            updateUnitCount(unit, isUp, activePlanet, planetIndex);

            const countElement = button.parentElement.parentElement.querySelector(`.unit-count`);
            const currentCount = parseInt(countElement.textContent, 10);
            const newCount = isUp ? currentCount + 1 : Math.max(0, currentCount - 1);
            countElement.textContent = newCount;
        });
    });

    fleetOwnerSelect.addEventListener('change', () => {
        if (!activeDesignation) return;

        const activeHex = fleetBoard.querySelector('.hex.active').getAttribute('data-position');
        const activeSystem = window.fleetGameData.board.find(system => system['designation'] === activeHex).system
        let fleetData = activeSystem.fleet;
        if (!fleetData) {
            fleetData = {
                ships: {},
                owner: ''
            };
            activeSystem.fleet = fleetData;
        }
        fleetData.owner = fleetOwnerSelect.value;
        activeSystem.fleet = fleetData;
    });

    planetSection.querySelectorAll('.planet-owner-selector').forEach(planetOwnerSelect => {
        planetOwnerSelect.addEventListener('change', () => {
            if (!activeDesignation) return;

            const activeHex = fleetBoard.querySelector('.hex.active').getAttribute('data-position');
            const planetIndex = planetOwnerSelect.getAttribute('data-planet-index');
            const activePlanet = window.fleetGameData.board.find(system => system['designation'] === activeHex).system.planets[planetIndex]
            let groundForcesData = activePlanet.ground_forces;
            if (!groundForcesData) {
                groundForcesData = {
                    structures: {},
                    units: {},
                    owner: ''
                };
                activePlanet.ground_forces = groundForcesData;
            }
            groundForcesData.owner = planetOwnerSelect.value;
            activePlanet.ground_forces = groundForcesData;
        });
    });
}


document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('fleet').style.display !== 'none') {
        initializeFleetManager();
    }
});

function closeFleetManagerWindow() {
    const fleetBoard = document.getElementById('board-preview fleet');
    const fleetManagementWindow = document.getElementById('fleet-management-window');
    fleetManagementWindow.style.display = 'none';
    const previousActive = fleetBoard.querySelector('.hex.active');
    previousActive.classList.remove('active');
}

function saveGameData() {
  try {
    const gameData = window.fleetGameData;
    const gameDataString = JSON.stringify(gameData, null, 2);
    const blob = new Blob([gameDataString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "oracle-rex-game-data.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    document.getElementById("game-data-message").textContent = "Game state downloaded!";
  } catch (error) {
    console.error("Error saving game data:", error);
    document.getElementById("game-data-message").textContent = "Error downloading game state.";
    document.getElementById("game-data-message").style.color = "red";
  }
}

function loadGameData(event) {
  const file = event.target.files[0];
  if (!file) {
    document.getElementById("game-data-message").textContent = "No file selected.";
    document.getElementById("game-data-message").style.color = "orange";
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const loadedData = JSON.parse(e.target.result);
      window.fleetGameData = loadedData;
      setBoard(loadedData, "fleet")
      document.getElementById("game-data-message").textContent = "Game state loaded!";
    } catch (error) {
      console.error("Error loading game data:", error);
      document.getElementById("game-data-message").textContent = "Error loading game state: Invalid JSON.";
      document.getElementById("game-data-message").style.color = "red";
    }
  };
  reader.onerror = function() {
    console.error("Error reading file:", reader.error);
    document.getElementById("game-data-message").textContent = "Error reading file.";
    document.getElementById("game-data-message").style.color = "red";
  };
  reader.readAsText(file);
}

function copyGameData() {
  try {
    const gameData = window.fleetGameData;
    const gameDataString = JSON.stringify(gameData, null, 2);
    navigator.clipboard.writeText(gameDataString).then(() => {
      document.getElementById("game-data-message").textContent = "Game state copied to clipboard!";
    }).catch((error) => {
      console.error("Error copying to clipboard:", error);
      document.getElementById("game-data-message").textContent = "Error copying to clipboard.";
      document.getElementById("game-data-message").style.color = "red";
    });
  } catch (error) {
    console.error("Error preparing game data for copy:", error);
    document.getElementById("game-data-message").textContent = "Error copying game state.";
    document.getElementById("game-data-message").style.color = "red";
  }
}