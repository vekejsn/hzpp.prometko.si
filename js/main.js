import { initializeMap, loadStops } from './map.js';
import { initializeUi } from './ui.js';
import { initializeRouter } from './router.js';

document.addEventListener('DOMContentLoaded', async () => {
    const map = initializeMap();
    window.map = map; // Make map instance globally available
    initializeUi(map);
    
    const stops = await loadStops(map);
    initializeRouter(map, stops);
});
