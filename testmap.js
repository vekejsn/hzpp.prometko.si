var map = L.map('mapid', { zoomControl: false }).setView([44.4110628,16.5184112], 8);
let vehicleMarkers = {};
let vehicleLayer = L.markerClusterGroup({
    showCoverageOnHover: true,
    removeOutsideVisibleBounds: true,
    maxClusterRadius: 20,
    spiderfyDistanceMultiplier: 3
});

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
    maxZoom: 19,
    attribution: ``,
    id: 'mapbox/light-v9',
    tileSize: 512, detectRetina: true,
    zoomOffset: -1
}).addTo(map);

var LAYER_CONTROL = L.control.layers().addTo(map);

L.control.zoom({
    position: 'topright'
}).addTo(map);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let stops = [];

async function main() {
    let data = await fetch('./data.json').then(res => res.json());
    stops = await fetch('./stops.json').then(res => res.json());
    for (let h of data) {
        L.geoJSON(h.geometry, {
            style: function (feature) {
                return {
                    color: '#1093C7',
                    weight: 3,
                    opacity: 1
                };
            }
        }).bindTooltip(`${h.properties.name} - ${h.id}`)
        .addTo(map);
    }
    /*for (let stop of stops) {
        L.marker([stop.stop_lat, stop.stop_lon]).bindTooltip(`${stop.stop_name}`).addTo(map);
    }*/
    vehicleLayer.addTo(map);
    while (true) {
        // fetch localhost:4242/trips/active
        let vehicles = await fetch('https://api.hzpp.prometko.si/trips/active').then(res => res.json()).then(res => res.data);
        let tempIds = [];
        for (let vehicle of vehicles) {
            let composition = "";
            if (vehicle.composition) {
                for (let c of vehicle.composition) {
                    composition += `${c.kind} <small>(${c.uicNumber})</small><br>`;
                }
            }
            // make a stop list
            let stops_str = "";
            /*for (let st of vehicle.stop_times) {
                stops_str += `${await stops.find(s => s.stop_id == st.stop_id).stop_name}<br>`;
            }*/
            if (vehicleMarkers[vehicle.trip_id]) {
                vehicleMarkers[vehicle.trip_id].setLatLng([vehicle.train_lat, vehicle.train_lon]);
                vehicleMarkers[vehicle.trip_id].setPopupContent(`<b>${vehicle.trip_short_name}</b> - ${vehicle.route.route_long_name}<br>
                <b>Current stop:</b> ${await stops.find(s => s.stop_id == vehicle.stop_times[vehicle.current_stop_index].stop_id).stop_name} (${vehicle.stop_times[vehicle.current_stop_index].departure_time}${vehicle.delay ? ` <b>+${vehicle.delay}min</b>` : ``})<br>
                <b>Next stop:</b> ${await stops.find(s => s.stop_id == vehicle.stop_times[vehicle.next_stop_index].stop_id).stop_name} (${vehicle.stop_times[vehicle.next_stop_index].arrival_time}${vehicle.delay ? ` <b>+${vehicle.delay}min</b>` : ``})
                ${vehicle.delay ? `<br><b>Delay:</b> ${vehicle.delay ? `<b style="color:red">${vehicle.delay}min</b>` :""}` : ""}
                <hr class="no-padding no-margin">
                <b>Vehicle composition:</b><br>
                ${composition.length > 0 ? composition : "No composition data available."}<br>
                `);
                vehicleMarkers[vehicle.trip_id].setIcon(L.divIcon({
                    iconSize: [80, 20],
                    iconAnchor: [40, 10],
                    popupAnchor: [0, 0],
                    className: "icon",
                    html: `<div class="szIcon-test"><b>${vehicle.trip_short_name}</b></div>${vehicle.delay ? `<b class="delay">+${vehicle.delay}min</b>` : ""}`
                }));
            } else {
            vehicleMarkers[vehicle.trip_id] = L.marker([vehicle.train_lat, vehicle.train_lon])
            .bindPopup(`<b>${vehicle.trip_short_name}</b> - ${vehicle.route.route_long_name}<br>
            <b>Current stop:</b> ${await stops.find(s => s.stop_id == vehicle.stop_times[vehicle.current_stop_index].stop_id).stop_name} (${vehicle.stop_times[vehicle.current_stop_index].departure_time}${vehicle.delay ? ` <b>+${vehicle.delay}min</b>` : ``})<br>
            <b>Next stop:</b> ${await stops.find(s => s.stop_id == vehicle.stop_times[vehicle.next_stop_index].stop_id).stop_name} (${vehicle.stop_times[vehicle.next_stop_index].arrival_time}${vehicle.delay ? ` <b>+${vehicle.delay}min</b>` : ``})
            ${vehicle.delay ? `<br><b>Delay:</b> ${vehicle.delay ? `<b style="color:red">${vehicle.delay}min</b>` :""}` : ""}
            <hr class="no-padding no-margin">
            <b>Vehicle composition:</b><br>
            ${composition.length > 0 ? composition : "No composition data available."}<br>`).addTo(vehicleLayer);
            vehicleMarkers[vehicle.trip_id].setIcon(L.divIcon({
                iconSize: [80, 20],
                iconAnchor: [40, 10],
                popupAnchor: [0, 0],
                className: "icon",
                html: `<div class="szIcon-test"><b>${vehicle.trip_short_name}</b></div>${vehicle.delay ? `<b class="delay">+${vehicle.delay}min</b>` : ""}`
            }));
            vehicleMarkers[vehicle.trip_id].data = {
                geometry: vehicle.geometry,
                stop_times: vehicle.stop_times,
            };
            /*vehicleMarkers[vehicle.trip_id].on('click', async (e) => {
                // iterate through geometry and add it to the map as a polyline
                let polylinedata = [];
                await e.target.data.geometry.forEach(g => {
                    // find the stops mentioned in g.from and g.to
                    let from = stops.find(s => s.stop_id == g.from);
                    let to = stops.find(s => s.stop_id == g.to);
                    L.polyline(g.geometry, {
                        color: 'red',
                        weight: 3,
                        opacity: 0.5
                    })
                    .bindTooltip(`From: ${from.stop_name}, to: ${to.stop_name}`)
                    .addTo(map);
                });

                // for each stoptime, find the stop and show a marker
                for (let st of e.target.data.stop_times) {
                    let stop = await stops.find(s => s.stop_id == st.stop_id);
                    L.marker([stop.stop_lat, stop.stop_lon]).bindTooltip(`${stop.stop_name}`).addTo(map);
                }
            })*/
            vehicleLayer.addLayer(vehicleMarkers[vehicle.trip_id]);
            }
            tempIds.push(vehicle.trip_id);
        }
        // check keys of vehicleMarkers, if its not in tempIds, remove it
        for (let key of Object.keys(vehicleMarkers)) {
            if (!tempIds.includes(key)) {
                vehicleMarkers[key].remove();
                delete vehicleMarkers[key];
            }
        }
        await delay(6000);
    }
}


main();

