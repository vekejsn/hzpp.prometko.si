import { getTrip, getStopTimes } from './api.js';
import { displayTripInfo, displayStopInfo } from './ui.js';

let mapInstance;
let allStops = [];

export function initializeRouter(map, stops) {
    mapInstance = map;
    allStops = stops;
    window.addEventListener('hashchange', handleRouting);
    handleRouting(); // Handle initial hash
}

async function handleRouting() {
    const hash = window.location.hash;

    if (!hash || hash === '#/') {
        // If you want to close the sidebar when the hash is empty or just a slash
        // you can add the logic here. For now, it does nothing.
        return;
    }

    const [path, param] = hash.substring(2).split('/'); // remove #/ and split

    try {
        if (path === 'trip' && param) {
            const tripDetails = await getTrip(param);
            if (tripDetails) {
                displayTripInfo(tripDetails, mapInstance);
            }
        } else if (path === 'stop' && param) {
            const stop = allStops.find(s => s.id === param);
            if (stop) {
                const stopDetails = await getStopTimes(param);
                displayStopInfo(stop, stopDetails);
            } else {
                console.error(`Stop with ID ${param} not found.`);
            }
        }
    } catch (error) {
        console.error('Routing error:', error);
    }
}
