import { getTrip, getStopTimes } from './api.js';

// Global state tracking for sidebar updates
let sidebarState = {
    type: null, // 'trip' or 'stop'
    id: null,   // tripId or stopId
    data: null, // cached data for current view
    mode: 'departures', // 'departures' or 'arrivals' for stop view
    updateTimer: null
};

const SIDEBAR = new SidebarJS.SidebarElement({
    position: 'left',
    open: false,
    backdropOpacity: 0,
    maxWidth: 375,
    backdrop: false,
    nativeSwipe: true,
    scrollable: true,
    onClose: () => {
        document.querySelector('[sidebarjs-container]').innerHTML = '';
        clearSidebarUpdateTimer();
    }
});

function clearSidebarUpdateTimer() {
    if (sidebarState.updateTimer) {
        clearInterval(sidebarState.updateTimer);
        sidebarState.updateTimer = null;
    }
}

function startSidebarUpdateTimer() {
    clearSidebarUpdateTimer();
    sidebarState.updateTimer = setInterval(async () => {
        if (sidebarState.type && sidebarState.id) {
            try {
                if (sidebarState.type === 'trip') {
                    const tripDetails = await getTrip(sidebarState.id);
                    displayTripInfo(tripDetails, window.map, false); // false = don't restart timer
                } else if (sidebarState.type === 'stop') {
                    const stopDetails = await getStopTimes(sidebarState.id);
                    displayStopInfo(sidebarState.data, stopDetails, false, sidebarState.mode); // false = don't restart timer, pass current mode
                }
            } catch (error) {
                console.error('Error updating sidebar content:', error);
            }
        }
    }, 20000); // 20 seconds
}

export function initializeUi(map) {
    map.on('click', 'stops-layer', async (e) => {
        const stop = e.features[0].properties;
        const stopDetails = await getStopTimes(stop.id);
        displayStopInfo(stop, stopDetails);
    });

    map.on('click', 'realtime-vehicles-fg', async (e) => {
        const tripId = e.features[0].properties.tripId;
        const tripDetails = await getTrip(tripId);
        displayTripInfo(tripDetails, map);
    });

    map.on('mouseenter', 'stops-layer', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'stops-layer', () => map.getCanvas().style.cursor = '');
    map.on('mouseenter', 'realtime-vehicles-fg', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'realtime-vehicles-fg', () => map.getCanvas().style.cursor = '');
}

function createSidebarContent(title, body) {
    const container = document.querySelector('[sidebarjs-container]');
    container.innerHTML = `
    <div class="sidebar-inner">
        <div class="sidebar-header">
            <div class="sidebar-header-content">
                ${title}
            </div>
            <button class="sidebar-close-btn" onclick="closeSidebar()" title="Close sidebar">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
        <div class="sidebar-body">
            ${body}
        </div>
    </div>
    `;
    SIDEBAR.open();
}

export function displayTripInfo(trip, map, startTimer = true) {
    const leg = trip.legs[0];
    
    // Update sidebar state
    if (startTimer) {
        sidebarState.type = 'trip';
        sidebarState.id = leg.tripId;
        sidebarState.data = null;
    }
    
    const title = `<h5>${leg.routeShortName}</h5>
                   <span>${leg.from.name} - ${leg.to.name}</span>`;
    
    let body = `
    ${leg.realTime ? '<i class="fas fa-broadcast-tower blinker"></i> This trip has real time information.' : '<i class="fas fa-broadcast-tower"></i> This trip does not have real time information.'}
    <b>Schedule:</b>
    <table class="table table-sm" style="width:100%">`;
    
    const allStops = [leg.from, ...leg.intermediateStops, leg.to];

    allStops.forEach(stop => {
        // prepare in format of 'HH:MM'
        const timeNow = luxon.DateTime.now().toFormat('HH:mm');
        const arrivalTime = stop.arrival ? luxon.DateTime.fromISO(stop.arrival).toFormat('HH:mm') : '';
        const departureTime = stop.departure ? luxon.DateTime.fromISO(stop.departure).toFormat('HH:mm') : '';
        const scheduledArrivalTime = stop.scheduledArrival ? luxon.DateTime.fromISO(stop.scheduledArrival).toFormat('HH:mm') : '';
        const scheduledDepartureTime = stop.scheduledDeparture ? luxon.DateTime.fromISO(stop.scheduledDeparture).toFormat('HH:mm') : '';
        const times = []
        // Determine if the stop is passed or current
        let rowClass = '';
        let extraText = '';
        let passed = false;
        if (arrivalTime && departureTime) {
            if (arrivalTime < timeNow && departureTime <= timeNow) {
            rowClass = 'style="color: #aaa; font-size: smaller; !important"'; // greyed out
            passed = true;
            } else if (arrivalTime <= timeNow && departureTime >= timeNow) {
            rowClass = 'style="background: #ffeeba; font-weight: bold; font-size: smaller; !important"'; // highlighted
            extraText = '<br/>(in station)';
            passed = false;
            } else {
            rowClass = 'style="font-size: smaller; !important"'; // default style for stops with both times
            passed = false;
            }
        } else if (arrivalTime) {
            if (arrivalTime <= timeNow) {
            rowClass = 'style="color: #aaa; font-size: smaller; !important"';
            extraText = '<br/>(in station)';
            passed = true;
            } else {
            rowClass = 'style="font-size: smaller; !important"'; // default style for stops with both times
            passed = false;
            }
        } else if (departureTime) {
            if (departureTime <= timeNow) {
            rowClass = 'style="color: #aaa; font-size: smaller; !important"';
            passed = true;
            } else if (departureTime >= timeNow) {
            rowClass = 'style="background: #ffeeba; font-weight: bold; font-size: smaller; !important"';
            extraText = '<br/>(in station)';
            passed = false;
            } else {
            rowClass = 'style="font-size: smaller; !important"'; // default style for stops with both times
            passed = false;
            }
        } else {
            rowClass = 'style="font-size: smaller; !important"'; // default style for stops without times
            passed = false;
        }
        if (arrivalTime && arrivalTime != scheduledArrivalTime && !passed) {
            times.push(`<i class="bi bi-box-arrow-in-right"></i>&nbsp;
            <s>${scheduledArrivalTime}</s> <span class="text-danger">${arrivalTime}</span>`);
        } else if (arrivalTime) {
            times.push(`<i class="bi bi-box-arrow-in-right"></i>&nbsp;${scheduledArrivalTime} ${leg.realTime && !passed ? `<span class="text-success">${arrivalTime}</span>` : ''}`);
        }
        if (departureTime && departureTime != scheduledDepartureTime && !passed) {
            times.push(`<i class="bi bi-box-arrow-right"></i>&nbsp;
            <s>${scheduledDepartureTime}</s> <span class="text-danger">${departureTime}</span>`);
        } else if (departureTime) {
            times.push(`<i class="bi bi-box-arrow-right"></i>&nbsp;${scheduledDepartureTime} ${leg.realTime && !passed ? `<span class="text-success">${departureTime}</span>` : ''}`); // add departure time
        }
        const timeTd = `
        <td style="width: 120px; word-break: break-all;">
            ${times.join('<br/>')}
        </td>`;
        // Handle first/last stop which may only have arrival or departure time
        body += `
            <tr onclick='displayStopInfoById("${stop.stopId}", "${stop.lat}", "${stop.lon}")' ${rowClass}>
            ${timeTd}
            <td>${stop.name}${extraText}</td>
            </tr>
        `;
    });
    body += `</table>`;

    createSidebarContent(title, body);
    
    // Start update timer if this is initial display
    if (startTimer) {
        startSidebarUpdateTimer();
    }
}

export function displayStopInfo(stop, stopDetails, startTimer = true, mode = 'departures') {
    // Update sidebar state
    if (startTimer) {
        sidebarState.type = 'stop';
        sidebarState.id = stop.id;
        sidebarState.data = stop;
        sidebarState.mode = mode;
    }
    
    const isArrivals = mode === 'arrivals';
    const title = `<h5>${isArrivals ? 'Arrivals at' : 'Departures from'} ${stop.name}</h5>
                   <div style="margin-bottom: 10px;">
                       <button class="btn btn-sm ${!isArrivals ? 'btn-primary' : 'btn-outline-primary'}" 
                               onclick="toggleStopView('departures')" style="margin-right: 5px;">
                           Departures
                       </button>
                       <button class="btn btn-sm ${isArrivals ? 'btn-primary' : 'btn-outline-primary'}" 
                               onclick="toggleStopView('arrivals')">
                           Arrivals
                       </button>
                   </div>`;
    
    let body = '<table class="table table-sm" style="width:100%">';
    if (stopDetails.stopTimes && stopDetails.stopTimes.length > 0) {
        // Filter stop times based on view mode
        let filteredStopTimes = stopDetails.stopTimes.filter(st => {
            if (isArrivals) {
                return st.place.arrival; // Only show trips that arrive at this stop
            } else {
                return st.place.departure; // Only show trips that depart from this stop
            }
        });

        let previous_time = filteredStopTimes.length > 0 ? 
            (isArrivals ? 
                (filteredStopTimes[0].place.arrival ? luxon.DateTime.fromISO(filteredStopTimes[0].place.arrival).toFormat('HH:mm') : luxon.DateTime.fromISO(filteredStopTimes[0].place.departure).toFormat('HH:mm')) :
                (filteredStopTimes[0].place.departure ? luxon.DateTime.fromISO(filteredStopTimes[0].place.departure).toFormat('HH:mm') : luxon.DateTime.fromISO(filteredStopTimes[0].place.arrival).toFormat('HH:mm'))
            ) : '00:00';
        
        // convert to mins from midnight
        previous_time = luxon.DateTime.fromFormat(previous_time, 'HH:mm').hour * 60 + luxon.DateTime.fromFormat(previous_time, 'HH:mm').minute;
        
        filteredStopTimes.forEach(st => {
            const realTimeIcon = st.realTime ? '<i class="fas fa-broadcast-tower blinker"></i>' : '';
            let times = [];
            let arrivalTime = st.place.arrival ? luxon.DateTime.fromISO(st.place.arrival).toFormat('HH:mm') : '';
            let departureTime = st.place.departure ? luxon.DateTime.fromISO(st.place.departure).toFormat('HH:mm') : '';
            let scheduledArrivalTime = st.place.scheduledArrival ? luxon.DateTime.fromISO(st.place.scheduledArrival).toFormat('HH:mm') : '';
            let scheduledDepartureTime = st.place.scheduledDeparture ? luxon.DateTime.fromISO(st.place.scheduledDeparture).toFormat('HH:mm') : '';
            
            if (isArrivals) {
                // Show arrival times
                if (arrivalTime && arrivalTime !== scheduledArrivalTime) {
                    times.push(`<i class="bi bi-box-arrow-in-right"></i>&nbsp;<s>${scheduledArrivalTime}</s> <span class="text-danger">${arrivalTime}</span>`);
                } else if (arrivalTime) {
                    times.push(`<i class="bi bi-box-arrow-in-right"></i>&nbsp;${scheduledArrivalTime} ${st.realTime ? `<span class="text-success">${arrivalTime}</span>` : ''}`);
                }
            } else {
                // Show departure times
                if (departureTime && departureTime !== scheduledDepartureTime) {
                    times.push(`<i class="bi bi-box-arrow-right"></i>&nbsp;<s>${scheduledDepartureTime}</s> <span class="text-danger">${departureTime}</span>`);
                } else if (departureTime) {
                    times.push(`<i class="bi bi-box-arrow-right"></i>&nbsp;${scheduledDepartureTime} ${st.realTime ? `<span class="text-success">${departureTime}</span>` : ''}`);
                }
            }
            
            let time = isArrivals ? 
                (arrivalTime ? arrivalTime.split(':').map(t => parseInt(t, 10)).reduce((a, b) => a * 60 + b) : '') :
                (departureTime ? departureTime.split(':').map(t => parseInt(t, 10)).reduce((a, b) => a * 60 + b) : '');
            
            if (time + 60 < previous_time) {
                // Add row that says next day...
                body += `
                    <tr>
                        <td colspan="2" class="text-muted" style="font-size: smaller; text-align: center;">
                            Next day...
                        </td>
                    </tr>
                `;
            }
            previous_time = time;
            body += `
                <tr onclick='displayTripInfoByTripId("${st.tripId}")' style="cursor: pointer; font-size: smaller;">
                    <td style="width: 120px; word-break: break-all;">
                    ${times.join('<br/>')}
                    </td>
                    <td>
                    <span class="text-muted">${st.routeShortName}</span> ${realTimeIcon}
                    <br/>
                    ${st.headsign}</td>
                </tr>
            `;
        });
    } else {
        body = `<p>No ${isArrivals ? 'arrivals' : 'departures'} found.</p>`;
    }
    body += '</table>';

    createSidebarContent(title, body);
    
    // Start update timer if this is initial display
    if (startTimer) {
        startSidebarUpdateTimer();
    }
}

window.displayTripInfoByTripId = async function(tripId) {
    let marker = window.map.getSource('realtime-vehicles')._data.features.find(f => f.properties.tripId === tripId);
    if (marker) {
        // Fly to trip marker
        const coords = marker.geometry.coordinates;
        window.map.flyTo({ center: coords, zoom: 15 });
    }
    const tripDetails = await getTrip(tripId);
    displayTripInfo(tripDetails, window.map, true); // true = start timer
}

window.displayStopInfoById = async function(stopId, lat, lon) {
    // fly to stop
    let stop = await window.map.getSource('stops')._data.features.find(f => f.properties.id === stopId);
    if (stop) {
        window.map.flyTo({ center: [lon, lat], zoom: 15 });
    }
    if (stop) {
        const stopDetails = await getStopTimes(stopId);
        displayStopInfo(stop.properties, stopDetails, true, 'departures'); // true = start timer, default to departures
    }
}

window.toggleStopView = async function(mode) {
    if (sidebarState.type === 'stop' && sidebarState.data && sidebarState.id) {
        sidebarState.mode = mode;
        const stopDetails = await getStopTimes(sidebarState.id);
        displayStopInfo(sidebarState.data, stopDetails, false, mode); // false = don't restart timer
    }
}

window.closeSidebar = function() {
    clearSidebarUpdateTimer();
    sidebarState = { type: null, id: null, data: null, mode: 'departures', updateTimer: null };
    SIDEBAR.close();
}

