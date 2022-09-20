const PROXY_URL = "https://cors.proxy.prometko.si/";

let szMarkers = {}

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
                    szMarkers[vehicle.train_no].addTo(map);
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
                szMarkers[vehicle.train_no].bindPopup(`<b>${vehicle.train_no}</b><br>
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


mainSz();