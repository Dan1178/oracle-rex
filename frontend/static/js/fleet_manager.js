function positionFleetManagementWindow(hexTile, fleetManagementWindow, event) {
    const mouseX = event.pageX - 250;
    const mouseY = event.pageY - 300;

    fleetManagementWindow.style.display = 'block';
    fleetManagementWindow.style.position = 'relative';
    fleetManagementWindow.style.left = `${mouseX}px`;
    fleetManagementWindow.style.top = `${mouseY}px`;
}

function updateUnitCount(unit, isUp, activeSystem) {
    if (!activeSystem) return;

    let fleetData = activeSystem.fleet;
    if (!fleetData) {
        fleetData = {
            ships: []
        };
        activeSystem.fleet = fleetData;
    }

    let ships = fleetData.ships || [];
    let shipEntry = ships.find(ship => ship.type === unit);
    if (!shipEntry) {
        shipEntry = { type: unit, count: 0 };
        ships.push(shipEntry);
    }

    shipEntry.count = isUp ? (shipEntry.count || 0) + 1 : Math.max(0, (shipEntry.count || 0) - 1);
    if (shipEntry.count === 0) {
        ships = ships.filter(ship => ship.type !== unit);
    }

    fleetData.ships = ships;
    activeSystem.fleet = fleetData;
}

function loadFleetData(activeSystem) {
    const fleetData = activeSystem.fleet;
    const shipTypes = ['fighter', 'destroyer', 'cruiser', 'carrier', 'dreadnought', 'war_sun', 'flagship'];
    shipTypes.forEach(unit => {
        document.getElementById(`fleet-${unit}-count`).textContent = '0';
    });
    if (!fleetData) return;

    const ships = fleetData.ships || [];
    ships.forEach(ship => {
        const countElement = document.getElementById(`fleet-${ship.type}-count`);
        if (countElement) {
            countElement.textContent = ship.count || 0;
        }
    });
}

function initializeFleetManager() {
    const fleetBoard = document.getElementById('board-preview fleet');
    const fleetManagementWindow = document.getElementById('fleet-management-window');

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
        positionFleetManagementWindow(hexTile, fleetManagementWindow, event);
    });

    fleetManagementWindow.querySelectorAll('.arrow').forEach(button => {
        button.addEventListener('click', () => {
            const activeHex = fleetBoard.querySelector('.hex.active').getAttribute('data-position');
            const activeSystem = window.fleetGameData.board.find(system => system['designation'] === activeHex).system
            const unit = button.getAttribute('data-unit');
            const isUp = button.classList.contains('up');

            updateUnitCount(unit, isUp, activeSystem);

            const countElement = document.getElementById(`fleet-${unit}-count`);
            const currentCount = parseInt(countElement.textContent, 10);
            const newCount = isUp ? currentCount + 1 : Math.max(0, currentCount - 1);
            countElement.textContent = newCount;
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