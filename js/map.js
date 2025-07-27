import { fetchStops, fetchTrips, getTrip, getStopTimes, getConfig } from './api.js';

let map;
const vehicleSourceId = 'realtime-vehicles';
const stopsSourceId = 'stops';
let tripsWithTiming = [];

export function initializeMap() {
    map = window.map = new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [18.3, 44.5],
        zoom: 7
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true
    }));

    map.on('load', async () => {
        map.addSource(vehicleSourceId, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });

        map.addSource(stopsSourceId, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });

        await loadStops();

        map.addLayer({
            id: 'stops-layer',
            type: 'circle',
            source: stopsSourceId,
            paint: {
                'circle-radius': 5,
                'circle-color': '#007cbf',
                'circle-stroke-width': 1,
                'circle-stroke-color': '#ffffff'
            }
        });

        map.addLayer({
            id: 'realtime-vehicles-fg',
            type: 'symbol',
            source: vehicleSourceId,
            layout: {
                'icon-image': [
                    'concat',
                    ['get', 'routeShortName'], ';',
                    ['get', 'tripId'], ';',
                    ['get', 'delay'], ';',
                    ['to-string', ['get', 'realTime']], ';fg'
                ],
                'icon-size': 0.65,
                'icon-allow-overlap': true,
                'text-allow-overlap': true,
                'symbol-sort-key': ['*', ['get', 'id'], 2],
                'symbol-z-order': 'source'
            }
        });

        map.on('styleimagemissing', handleStyleImageMissing);

        fetchTripsAndUpdate();
        setInterval(fetchTripsAndUpdate, 10000);
        animate();
    });

    return map;
}

export async function loadStops() {
    const stopsData = await fetchStops();
    const stopsGeoJSON = {
        type: 'FeatureCollection',
        features: stopsData.map(stop => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [stop.lon, stop.lat]
            },
            properties: {
                id: stop.stopId,
                name: stop.name,
                parentId: null
            }
        }))
    };
    if (map.getSource(stopsSourceId)) {
        map.getSource(stopsSourceId).setData(stopsGeoJSON);
    }
}

async function fetchTripsAndUpdate() {
    const data = await fetchTrips();
    tripsWithTiming = []; // Clear old trip data
    tripsWithTiming = data
        .filter(item => item.trips?.[0]?.tripId) // Ensure tripId exists
        .map(item => {
            const coords = decodePolyline(item.polyline);
            const tripId = item.trips[0].tripId;
            const route = item.trips[0].routeShortName.split(' ').join('') || '?';
            const departure = new Date(item.departure).getTime();
            const arrival = new Date(item.arrival).getTime();
            const departureDelay = new Date(item.departure).getTime() - new Date(item.scheduledDeparture).getTime();
            const arrivalDelay = new Date(item.arrival).getTime() - new Date(item.scheduledArrival).getTime();
            const delay = departureDelay > arrivalDelay ? departureDelay : arrivalDelay;
            const path = buildTimedPath(coords, departure, arrival, delay);
            return { tripId, route, path, delay };
        });
}

function animate() {
    const now = Date.now();
    const features = tripsWithTiming.map(({ tripId, route, path, delay }) => {
        const { coord, bearing } = getInterpolatedPosition(path, now);
        return {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: coord },
            properties: {
                id: tripId,
                tripId,
                routeShortName: route,
                realTime: true,
                bearing,
                delay,
            }
        };
    });

    const geojson = { type: 'FeatureCollection', features };
    if (map.getSource(vehicleSourceId)) {
        map.getSource(vehicleSourceId).setData(geojson);
    }
    setTimeout(() => requestAnimationFrame(animate), 1000);
}

async function handleStyleImageMissing(e) {
    const id = e.id;
    if (!id.endsWith(';fg')) return;

    const [routeShortName, tripIdStr, departureDelay, realTimeStr, loc] = id.split(';');
    const tripIdent = tripIdStr.split('_');
    const config = await getConfig();
    const color = config.colors[tripIdent[2]] || '#1264AB';
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    const ctx = canvas.getContext('2d');
    const center = canvas.width / 2;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px SUSE';
    if (document.fonts && !document.fonts.check('bold 20px SUSE')) {
        await document.fonts.load('bold 20px SUSE');
        ctx.font = 'bold 20px SUSE';
    }

    let mainText = `${routeShortName}`;
    let delayText = '';
    if (departureDelay > 0) {
        const delayMinutes = Math.ceil(departureDelay / 60000);
        delayText = `+${delayMinutes}m`;
    }

    // Measure main text and delay text separately
    const mainMetrics = ctx.measureText(mainText);
    const mainWidth = mainMetrics.width;
    const mainHeight = (mainMetrics.actualBoundingBoxAscent || 12) + (mainMetrics.actualBoundingBoxDescent || 4);

    ctx.font = 'bold 14px SUSE';
    const delayMetrics = ctx.measureText(delayText);
    const delayWidth = delayMetrics.width;
    const delayHeight = (delayMetrics.actualBoundingBoxAscent || 8) + (delayMetrics.actualBoundingBoxDescent || 3);

    // Restore font for pill size calculation
    ctx.font = 'bold 20px SUSE';

    const horizontalPadding = 12;
    const verticalPadding = 6;
    // If delay, add a little gap between texts
    const gap = delayText ? 6 : 0;
    const pillWidth = Math.max(mainWidth + (delayText ? delayWidth + gap : 0) + 2 * horizontalPadding, 48);
    const pillHeight = Math.max(mainHeight, delayHeight) + 2 * verticalPadding;
    const pillX = center - pillWidth / 2;
    const pillY = center - pillHeight / 2;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(pillX + pillHeight / 2, pillY);
    ctx.lineTo(pillX + pillWidth - pillHeight / 2, pillY);
    ctx.arc(pillX + pillWidth - pillHeight / 2, pillY + pillHeight / 2, pillHeight / 2, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(pillX + pillHeight / 2, pillY + pillHeight);
    ctx.arc(pillX + pillHeight / 2, pillY + pillHeight / 2, pillHeight / 2, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = darkenColor(color, 0.8);
    ctx.stroke();

    // Draw main text (white)
    ctx.font = 'bold 20px SUSE';
    ctx.fillStyle = 'white';
    let textX = center;
    if (delayText) {
        // Shift main text left to make room for delay
        textX = center - (delayWidth + gap) / 2;
    }
    ctx.fillText(mainText, textX, pillY + pillHeight / 2);

    // Draw delay text (red, smaller font)
    if (delayText) {
        ctx.font = 'bold 14px SUSE';
        // Draw red rounded rectangle background for delay text
        const bgPaddingX = 6;
        const bgPaddingY = 2;
        const bgWidth = delayWidth + 2 * bgPaddingX;
        const bgHeight = delayHeight + 2 * bgPaddingY;
        const bgX = textX + mainWidth / 2 + gap;
        const bgY = pillY + pillHeight / 2 - bgHeight / 2 + 1;

        ctx.save();
        ctx.beginPath();
        const radius = bgHeight / 2;
        ctx.moveTo(bgX + radius, bgY);
        ctx.lineTo(bgX + bgWidth - radius, bgY);
        ctx.arc(bgX + bgWidth - radius, bgY + radius, radius, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(bgX + radius, bgY + bgHeight);
        ctx.arc(bgX + radius, bgY + radius, radius, Math.PI / 2, -Math.PI / 2);
        ctx.closePath();
        ctx.fillStyle = '#e53935';
        ctx.fill();
        ctx.restore();

        // Draw delay text in white, centered in the red background
        ctx.fillStyle = 'white';
        ctx.fillText(delayText, bgX + bgWidth / 2, pillY + pillHeight / 2 + 1);
    }

    map.addImage(id, {
        width: canvas.width,
        height: canvas.height,
        data: ctx.getImageData(0, 0, canvas.width, canvas.height).data
    });
}

function darkenColor(hex, factor = 0.8) {
    const r = Math.floor(parseInt(hex.slice(1, 3), 16) * factor);
    const g = Math.floor(parseInt(hex.slice(3, 5), 16) * factor);
    const b = Math.floor(parseInt(hex.slice(5, 7), 16) * factor);
    return `rgb(${r},${g},${b})`;
}

function decodePolyline(str) {
    let index = 0, lat = 0, lng = 0, coordinates = [], shift, result, byte;
    const factor = 1e5;
    while (index < str.length) {
        shift = result = 0;
        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = result = 0;
        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);
        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        coordinates.push([lng / factor, lat / factor]);
    }
    return coordinates;
}

function buildTimedPath(coords, departure, arrival, delay = 0) {
    // The delay is already included in the departure and arrival times passed to this function.
    // So, this function will reflect the delay if the caller provides delayed times.
    const totalDuration = arrival - departure;
    let totalDistance = 0;
    const distances = [];

    for (let i = 0; i < coords.length - 1; i++) {
        const dx = coords[i + 1][0] - coords[i][0];
        const dy = coords[i + 1][1] - coords[i][1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        distances.push(dist);
        totalDistance += dist;
    }

    const times = [departure];
    let accTime = 0;
    for (let d of distances) {
        accTime += (d / totalDistance) * totalDuration;
        times.push(departure + accTime);
    }

    return coords.map((point, i) => ({ point, time: times[i] }));
}

function calculateBearing(from, to) {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    return (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
}

function getInterpolatedPosition(timedPath, now) {
    if (!timedPath || timedPath.length === 0) return { coord: [0, 0], bearing: 0 };
    if (now <= timedPath[0].time) return { coord: timedPath[0].point, bearing: 0 };
    if (now >= timedPath[timedPath.length - 1].time) {
        // Over the last time, keep at the last point
        if (timedPath.length > 1) {
            const last = timedPath[timedPath.length - 1];
            const prev = timedPath[timedPath.length - 2];
            const bearing = calculateBearing(prev.point, last.point);
            return { coord: last.point, bearing };
        } else {
            return { coord: timedPath[timedPath.length - 1].point, bearing: 0 };
        }
    }

    const i = timedPath.findIndex(p => p.time > now);
    const p1 = timedPath[i - 1];
    const p2 = timedPath[i];
    const t = (now - p1.time) / (p2.time - p1.time);

    const lon = p1.point[0] + (p2.point[0] - p1.point[0]) * t;
    const lat = p1.point[1] + (p2.point[1] - p1.point[1]) * t;
    const bearing = calculateBearing(p1.point, p2.point);

    return { coord: [lon, lat], bearing };
}
