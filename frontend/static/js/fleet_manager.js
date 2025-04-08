function positionFleetManagementWindow(hexTile, fleetManagementWindow, event) {
    const mouseX = event.pageX - 250;
    const mouseY = event.pageY - 300;

    fleetManagementWindow.style.display = 'block';
    fleetManagementWindow.style.position = 'relative';
    fleetManagementWindow.style.left = `${mouseX}px`;
    fleetManagementWindow.style.top = `${mouseY}px`;
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
        positionFleetManagementWindow(hexTile, fleetManagementWindow, event);
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