var map = L.map('mapid', { zoomControl: false }).setView([44.4110628,16.5184112], 8);
let vehicleMarkers = {};

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

map.addControl(L.languageSelector({
    languages: new Array(
      L.langObject('en', 'English', 'https://flagcdn.com/16x12/gb.png'),
      L.langObject('hr', 'Hrvatski', 'https://flagcdn.com/16x12/hr.png'),
      L.langObject('sl', 'Slovenski', 'https://flagcdn.com/16x12/si.png'),
      L.langObject('hrArchive', 'Arhiv', '')
    ),
    callback: changeLanguage,
    position: 'topleft',
  }));

var LAYER_CONTROL = L.control.layers().addTo(map);

var vehicleLayer = L.markerClusterGroup({
    showCoverageOnHover: true,
    removeOutsideVisibleBounds: true,
    maxClusterRadius: 20,
    spiderfyDistanceMultiplier: 3
}).addTo(map);
var szLayer = L.markerClusterGroup({
    showCoverageOnHover: true,
    removeOutsideVisibleBounds: true,
    maxClusterRadius: 20,
    spiderfyDistanceMultiplier: 3
}).addTo(map);
var zsLayer = L.markerClusterGroup({
    showCoverageOnHover: true,
    removeOutsideVisibleBounds: true,
    maxClusterRadius: 20,
    spiderfyDistanceMultiplier: 3
}).addTo(map);
var zcgLayer = L.markerClusterGroup({
    showCoverageOnHover: true,
    removeOutsideVisibleBounds: true,
    maxClusterRadius: 20,
    spiderfyDistanceMultiplier: 3
}).addTo(map);

var railwayLayer = L.layerGroup().addTo(map);

LAYER_CONTROL.addOverlay(vehicleLayer, "HŽPP");
LAYER_CONTROL.addOverlay(szLayer, "SŽ");
LAYER_CONTROL.addOverlay(zsLayer, "ZŠ");
LAYER_CONTROL.addOverlay(zcgLayer, "ZCG");

L.control.zoom({
    position: 'topright'
}).addTo(map);

L.control.locate({ position: `bottomright` }).addTo(map);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let stops = [];
let vocabulary = {};
let active_lang = {};

function changeLanguage(selectedLanguage) {
        if (selectedLanguage == 'hrArchive') {
            location.href = "hzArchive.html";
            return;
        }
        active_lang = vocabulary[selectedLanguage];
        console.log(active_lang);
        document.cookie = `mapper_lang=${selectedLanguage}; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/`;
        // reload the page
        location.reload();
}

async function getCookie(name) {
    let value = "; " + document.cookie;
    let parts = value.split("; " + name + "=");
    if (parts.length == 2) return parts.pop().split(";").shift();
}

async function main() {
    vocabulary = await fetch('./vocabulary.json').then(res => res.json());
    let types = await fetch('types.json').then(res => res.json());
    // read cookie for selected language
    let lang = await getCookie("mapper_lang");
    if (lang) {
        active_lang = vocabulary[lang];
    } else {
        active_lang = vocabulary["hr"];
        // write this cookie
        document.cookie = `mapper_lang=hr; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/`;
    }
    mainSz();

    mainZcg();

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
        .addTo(railwayLayer);
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
            let composition_img = "";
            if (composition.length > 0) {
                let unitCounter = {};
                // if the composition includes classes 4111 and 5111, replace their positions, if 5111 is before 4111
                if (vehicle.composition[0].kind.includes("5111") && vehicle.composition[2].kind.includes("4111")) {
                    let temp = vehicle.composition[0];
                    vehicle.composition[0] = vehicle.composition[2];
                    vehicle.composition[2] = temp;
                }

                for (let component of vehicle.composition) {
                    let type = types.find(t => component.kind.includes(t.type));
                    if (type) {
                        // if it's the 2nd in a row of the classes 7121-1 or 7123, flip the image to the other side
                        // console.log('uc',vehicle.trip_short_name, unitCounter[type.type])
                        if (unitCounter[type.type] && (unitCounter[type.type] + 1) % 2 == 0 && (type.type == "7121" || type.type == "7123")) {
                            // console.log('went in')
                            composition_img += `<img src="./img/${type.img}.gif" style="height: 30px; transform: scaleX(-1);">`;
                        } else if (false) {

                        } else {
                            composition_img += `<img src="./img/${type.img}.gif" style="height: 30px;">`;
                        }
                        unitCounter[type.type] = unitCounter[type.type] ? unitCounter[type.type] + 1 : 1;
                    } else {
                        composition_img += `<img src="./img/generic.gif" style="height: 30px;">`;
                    }
                }
            }
            if (vehicleMarkers[vehicle.trip_id]) {
                vehicleMarkers[vehicle.trip_id].setLatLng([vehicle.train_lat, vehicle.train_lon]);
                vehicleMarkers[vehicle.trip_id].setPopupContent(`<b>${vehicle.trip_short_name}</b> - ${vehicle.route.route_long_name}<br>
                <b>${active_lang.current_stop}:</b> ${await stops.find(s => s.stop_id == vehicle.stop_times[vehicle.current_stop_index].stop_id).stop_name} (${vehicle.stop_times[vehicle.current_stop_index].departure_time}${vehicle.delay ? ` <b>+${vehicle.delay}min</b>` : ``})<br>
                <b>${active_lang.next_stop}:</b> ${await stops.find(s => s.stop_id == vehicle.stop_times[vehicle.next_stop_index].stop_id).stop_name} (${vehicle.stop_times[vehicle.next_stop_index].arrival_time}${vehicle.delay ? ` <b>+${vehicle.delay}min</b>` : ``})
                ${vehicle.delay ? `<br><b>${active_lang.delay}:</b> ${vehicle.delay ? `<b style="color:red">${vehicle.delay}min</b>` :""}` : ""}
                <hr class="no-padding no-margin">
                <b>${active_lang.composition}:</b><br>
                ${composition.length > 0 ? composition : `${active_lang.no_composition}`}
                ${composition_img.length > 0 ? `<div class="popup-train-img">${composition_img}</div>` : ""}`, {className: "labelstyle"});
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
            <b>${active_lang.current_stop}:</b> ${await stops.find(s => s.stop_id == vehicle.stop_times[vehicle.current_stop_index].stop_id).stop_name} (${vehicle.stop_times[vehicle.current_stop_index].departure_time}${vehicle.delay ? ` <b>+${vehicle.delay}min</b>` : ``})<br>
            <b>${active_lang.next_stop}:</b> ${await stops.find(s => s.stop_id == vehicle.stop_times[vehicle.next_stop_index].stop_id).stop_name} (${vehicle.stop_times[vehicle.next_stop_index].arrival_time}${vehicle.delay ? ` <b>+${vehicle.delay}min</b>` : ``})
            ${vehicle.delay ? `<br><b>${active_lang.delay}:</b> ${vehicle.delay ? `<b style="color:red">${vehicle.delay}min</b>` :""}` : ""}
            <hr class="no-padding no-margin">
            <b>${active_lang.composition}:</b><br>
            ${composition.length > 0 ? composition : `${active_lang.no_composition}`}
            ${composition_img.length > 0 ? `<div class="popup-train-img">${composition_img}</div>` : ""}`, {className: "labelstyle"}).addTo(vehicleLayer);
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
let zcgMarkers = {};

async function mainSz() {
    let grouped = await fetch(`./szdata.json`).then(r => r.json());
    for (let g in grouped) {
        // make a polyline for each group
        await L.polyline(grouped[g], {color: '#005B7D'}).addTo(railwayLayer);
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
                    szMarkers[vehicle.train_no] = await L.marker([vehicle.latitude, vehicle.longitude]);
                    szMarkers[vehicle.train_no].addTo(szLayer);
                } else {
                    await szMarkers[vehicle.train_no].setLatLng([vehicle.latitude, vehicle.longitude]);
                }
                szMarkers[vehicle.train_no].setIcon(L.divIcon({
                    iconSize: [80, 20],
                    iconAnchor: [40, 10],
                    popupAnchor: [0, 0],
                    className: "icon",
                    html: `<div class="szIcon"><b>${vehicle.train_type}${vehicle.train_no}</b></div>${vehicle.delay > 0 ? `<b class="delay">+${vehicle.delay}min</b>` : ""}`
                }));
                szMarkers[vehicle.train_no].bindPopup(`<b>${vehicle.train_type} ${vehicle.train_no}</b> ${vehicle.route}<br>
                ${vehicle.delay > 0 ? `<b>${active_lang.delay}: </b><b style="color:red">+${vehicle.delay}min</b>` : ""}<hr class="no-padding no-margin">
                <b>${active_lang.unit}</b> ${vehicle.train_model.length > 0 ? vehicle.train_model : `${active_lang.unknown}`}`, {className: "labelstyle"});
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
        await L.polyline(grouped[g].geometry, {color: '#006DDD'}).addTo(railwayLayer);
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
                let current_stop = await vehicle.train_data.train_times.find(t => t.stop_sequence == vehicle.train_data.current_stop_sequence);
                let next_stop = await vehicle.train_data.train_times.find(t => t.stop_sequence == vehicle.train_data.next_stop_sequence);

                zsMarkers[vehicle.train_data.train_id].setIcon(L.divIcon({
                    iconSize: [80, 20],
                    iconAnchor: [40, 10],
                    popupAnchor: [0, 0],
                    className: "icon",
                    html: `<div class="zsIcon"><b>${vehicle.train_data.train_number}</b></div>${vehicle.train_cache.delay > 0 ? `<b class="delay">+${vehicle.train_cache.delay}min</b>` : ""}`
                }))
                .bindPopup(`<b>${vehicle.train_data.train_number}</b> ${vehicle.train_data.train_name}<br>
                <b>${active_lang.current_stop}:</b> ${current_stop.stop_name} (${current_stop.departure_time}${vehicle.train_cache.delay > 0 ? ` <b>+${vehicle.train_cache.delay}min</b>` : ""})<br>
                <b>${active_lang.next_stop}:</b> ${next_stop.stop_name} (${next_stop.arrival_time}${vehicle.train_cache.delay > 0 ? ` <b>+${vehicle.train_cache.delay}min</b>` : ""})<br>
                ${vehicle.train_cache && vehicle.train_cache.delay > 0 ? `<b>${active_lang.delay}: </b><b style="color:red">+${vehicle.train_cache.delay}min</b>` : ""}
                <hr class="no-padding no-margin">
                <b>${active_lang.composition}:</b><br>${vehicle.train_cache ? vehicle.train_cache.composition : `${active_lang.unknown}`}`, {className: "labelstyle"});
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

async function mainZcg() {
    // fetch https://api.hzpp.prometko.si/RS/zs/geometry/list
    let grouped = await fetch(`https://api.hzpp.prometko.si/ME/zcg/geometry/list`).then(r => r.json()).then(r => r.data);
    let passed = [];
    for (let g in grouped) {
        // if we already have this combo of from and to, skip it
        if (passed.includes(`${grouped[g].from}-${grouped[g].to}`) || passed.includes(`${grouped[g].to}-${grouped[g].from}`)) continue;
        // make a polyline for each group
        let poly = await L.polyline(grouped[g].geometry, {color: '#DA1F32'}).addTo(railwayLayer);
        // push poly to top of layer
        poly.bringToFront();
        passed.push(`${grouped[g].from}-${grouped[g].to}`);
    }
    while (true) {
        try {
            let vehicles = await fetch(`https://api.hzpp.prometko.si/ME/zcg/trips/active`).then(res => res.json()).then(res => res.data);
            for (let vehicle of vehicles) {
                try {
                console.log(vehicle.train_data.train_id);
                if (!zcgLayer[vehicle.train_data.train_id]) {
                    zcgLayer[vehicle.train_data.train_id] = await L.marker([vehicle.coordinates.lat, vehicle.coordinates.lng]);
                    zcgLayer[vehicle.train_data.train_id].addTo(zcgLayer);
                } else {
                    await zcgLayer[vehicle.train_data.train_id].setLatLng([vehicle.coordinates.lat, vehicle.coordinates.lng]);
                }
                let current_stop = await vehicle.train_data.train_times.find(t => t.stop_sequence == vehicle.train_data.current_stop_sequence);
                let next_stop = await vehicle.train_data.train_times.find(t => t.stop_sequence == vehicle.train_data.next_stop_sequence);

                zcgLayer[vehicle.train_data.train_id].setIcon(L.divIcon({
                    iconSize: [80, 20],
                    iconAnchor: [40, 10],
                    popupAnchor: [0, 0],
                    className: "icon",
                    html: `<div class="zcgIcon"><b>${vehicle.train_data.train_number}</b></div>`
                }))
                .bindPopup(`<b>${vehicle.train_data.train_number}</b> ${vehicle.train_data.train_name}<br>
                <b>${active_lang.current_stop}:</b> ${current_stop.stop_name} (${current_stop.departure_time})<br>
                <b>${active_lang.next_stop}:</b> ${next_stop.stop_name} (${next_stop.arrival_time})
                <hr class="no-padding no-margin">
                ${active_lang.static_data}`, {className: "labelstyle"});
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