let config;

export async function getConfig() {
    if (!config) {
        const response = await fetch('config.json');
        config = await response.json();
    }
    return config;
}

export async function fetchStops() {
    const config = await getConfig();
    const url = `${config.motis_api_base_url}/api/v1/map/stops?min=49.415360776528956%2C7.898969151846785&max=36.38523043114108%2C26.9347879737411&zoom=20`;
    const res = await fetch(url);
    return await res.json();
}

export async function fetchTrips() {
    const config = await getConfig();
    const now = new Date();
    const later = new Date(now.getTime() + 60000); // 1 minute window
    const url = `${config.motis_api_base_url}/api/v1/map/trips?min=49.415360776528956%2C7.898969151846785&max=36.38523043114108%2C26.9347879737411&startTime=${encodeURIComponent(now.toISOString())}&endTime=${encodeURIComponent(later.toISOString())}&zoom=20`;
    const res = await fetch(url);
    return await res.json();
}

export async function getTrip(tripId) {
    const config = await getConfig();
    const url = `${config.motis_api_base_url}/api/v2/trip?tripId=${encodeURIComponent(tripId)}`;
    const res = await fetch(url);
    return await res.json();
}

export async function getStopTimes(stopId) {
    const config = await getConfig();
    const url = `${config.motis_api_base_url}/api/v1/stoptimes?stopId=${encodeURIComponent(stopId)}&n=100`;
    const res = await fetch(url);
    return await res.json();
}
