var map = L.map('mapid', { zoomControl: false }).setView([44.4110628,16.5184112], 8);
let vehicleMarkers = {};
var vehicleLayer = L.markerClusterGroup({
    showCoverageOnHover: true,
    removeOutsideVisibleBounds: true,
    maxClusterRadius: 20,
    spiderfyDistanceMultiplier: 3
});
var szLayer = L.markerClusterGroup({
    showCoverageOnHover: true,
    removeOutsideVisibleBounds: true,
    maxClusterRadius: 20,
    spiderfyDistanceMultiplier: 3
});
var zsLayer = L.markerClusterGroup({
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

LAYER_CONTROL.addOverlay(vehicleLayer, "HŽPP");
LAYER_CONTROL.addOverlay(szLayer, "SŽ");
LAYER_CONTROL.addOverlay(zsLayer, "ZŠ");

L.control.zoom({
    position: 'topright'
}).addTo(map);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let stops = [];

async function main() {
    mainSz();
    mainZs();
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
    szLayer.addTo(map);
    while (true) {
        // fetch localhost:4242/trips/active
        let vehicles = await fetch('https://api.hzpp.prometko.si/HR/hz/trips/active').then(res => res.json()).then(res => res.data);
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
        await delay(15000);
    }
}

const PROXY_URL = "https://cors.proxy.prometko.si/";

let szMarkers = {}
let zsMarkers = {}

async function mainSz() {
    let grouped = await fetch(`./szdata.json`).then(r => r.json());
    for (let g in grouped) {
        // make a polyline for each group
        await L.polyline(grouped[g], {color: '#005B7D'}).addTo(map);
    }
    // check if szLayer is visible
    if (map.hasLayer(szLayer)) {
        console.log("SŽ layer is visible");
    } else {
        console.log("SŽ layer is not visible");
        szLayer.addTo(map);
    }
    while (true) {
        try {
            // fetch https://mestnipromet.cyou/api/v1/resources/sz/locations with proxy
            let vehicles = await fetch(`${PROXY_URL}https://mestnipromet.cyou/api/v1/resources/sz/locations`).then(res => res.json());
            for (let vehicle of vehicles.data) {
                if (!szMarkers[vehicle.train_no]) {
                    szMarkers[vehicle.train_no] = await L.marker([vehicle.latitude, vehicle.latitude]);
                    szMarkers[vehicle.train_no].addTo(szLayer);
                } else {
                    await szMarkers[vehicle.train_no].setLatLng([vehicle.latitude, vehicle.longitude]);
                }
                szMarkers[vehicle.train_no].setIcon(L.divIcon({
                    iconSize: [80, 20],
                    iconAnchor: [40, 10],
                    popupAnchor: [0, 0],
                    className: "icon",
                    html: `<div class="szIcon"><b>${vehicle.train_no}</b></div>${vehicle.delay > 0 ? `<b class="delay">+${vehicle.delay}min</b>` : ""}`
                }));
                szMarkers[vehicle.train_no].bindPopup(`<b>${vehicle.train_type} ${vehicle.train_no}</b><br>
                ${vehicle.delay > 0 ? `<b>Delay: </b><b style="color:red">+${vehicle.delay}min</b>` : ""}<hr class="no-padding no-margin">
                <b>Train unit:</b> ${vehicle.train_model.length > 0 ? vehicle.train_model : "Unknown"}<br>`);
            }
            // if layer_control doesnt have szLayer, add it
            await delay(10000);
        } catch (e) {
            console.log(e);
            await delay(5000);
        }
    }
}

async function mainZs() {
    // fetch https://api.hzpp.prometko.si/RS/zs/geometry/list
    let grouped = await fetch(`https://api.hzpp.prometko.si/RS/zs/geometry/list`).then(r => r.json()).then(r => r.data);
    let passed = [];
    for (let g in grouped) {
        // if we already have this combo of from and to, skip it
        if (passed.includes(`${grouped[g].from}-${grouped[g].to}`) || passed.includes(`${grouped[g].to}-${grouped[g].from}`)) continue;
        // make a polyline for each group
        await L.polyline(grouped[g].geometry, {color: '#006DDD'}).addTo(map);
        passed.push(`${grouped[g].from}-${grouped[g].to}`);
    }

    zsLayer.addTo(map);
    while (true) {
        try {
            let vehicles = await fetch(`https://api.hzpp.prometko.si/RS/zs/trips/active`).then(res => res.json()).then(res => res.data);
            for (let vehicle of vehicles) {
                try {
                                    //console.log(vehicle);
                if (!zsMarkers[vehicle.train_data.train_id]) {
                    zsMarkers[vehicle.train_data.train_id] = await L.marker([vehicle.coordinates.lat, vehicle.coordinates.lng]);
                    zsMarkers[vehicle.train_data.train_id].addTo(zsLayer);
                } else {
                    await zsMarkers[vehicle.train_data.train_id].setLatLng([vehicle.coordinates.lat, vehicle.coordinates.lng]);
                }
                zsMarkers[vehicle.train_data.train_id].setIcon(L.divIcon({
                    iconSize: [80, 20],
                    iconAnchor: [40, 10],
                    popupAnchor: [0, 0],
                    className: "icon",
                    html: `<div class="zsIcon"><b>${vehicle.train_data.train_number}</b></div>${vehicle.train_cache.delay > 0 ? `<b class="delay">+${vehicle.train_cache.delay}min</b>` : ""}`
                }))
                .bindPopup(`<b>${vehicle.train_data.train_number}</b> ${vehicle.train_data.train_name}<br>
                <b>Current stop:</b> ${vehicle.train_data.train_times.find(t => t.stop_sequence == vehicle.train_data.current_stop_sequence).stop_name} (${vehicle.train_data.train_times.find(t => t.stop_sequence == vehicle.train_data.current_stop_sequence).departure_time})<br>
                <b>Next stop:</b> ${vehicle.train_data.train_times.find(t => t.stop_sequence == vehicle.train_data.next_stop_sequence).stop_name} (${vehicle.train_data.train_times.find(t => t.stop_sequence == vehicle.train_data.next_stop_sequence).arrival_time})<br>
                ${vehicle.train_cache && vehicle.train_cache.delay > 0 ? `<b>Delay: </b><b style="color:red">+${vehicle.train_cache.delay}min</b>` : ""}
                <hr class="no-padding no-margin">
                <b>Vehicle composition:</b><br>${vehicle.train_cache ? vehicle.train_cache.composition : "Unknown"}<br>`);
                } catch (e) {
                    console.log(vehicle)
                    console.log(e);
                }
            }
            await delay(10000);
        } catch (e) {
            console.log(e);
            await delay(5000);
        }
    }
}

main();

mainSz();

mainZs();