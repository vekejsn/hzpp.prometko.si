var map = L.map('map', { zoomControl: false }).setView([46.4110628,14.5184112], 9);
let szMarkers = [];

const delay = (ms) => new Promise(res => setTimeout(res, ms));

var VOCABULARY = {};
var SIDEBAR = {};
var ACTIVE_VOCABULARY = {};
var TRAIN_COMPOSITIONS = [];
var TRAIN_UIC_IMAGES = [];

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

async function returnszMarker(number, prefix, delay) {
    let div = document.createElement("div");
    div.className = 'icon';
    let divicon = document.createElement("div");
    divicon.className = "zsIcon";
    let b = document.createElement("b");
    b.innerText = prefix + number;
    divicon.appendChild(b);
    div.appendChild(divicon);
    if (delay > 0) {
        let b1 = document.createElement("b");
        b1.classList.add("delay");
        b1.innerText = `+${delay}min`;
        div.appendChild(b1);
    }
    return div.outerHTML;
}

async function main() {
    let height = $(document).height();
    $('#map').height(height);
    VOCABULARY = await fetch('json/vocabulary.json').then(response => response.json());
    ACTIVE_VOCABULARY = VOCABULARY.hr;
    TRAIN_COMPOSITIONS = await fetch('json/trains.json').then(response => response.json());
    TRAIN_UIC_IMAGES = await fetch('https://api.map.vlak.si/tools/units/units').then(response => response.json()).then(data => data.data);
    SIDEBAR = new SidebarJS.SidebarElement({
        position: 'left',
        open: true,
        backdropOpacity: 0,
        maxWidth: 400,
        backdrop: false,
        nativeSwipe: false,
        scrollable: true,
        onClose: () => {
            document.querySelector('[sidebarjs-container]').innerHTML = '';
        }
    });
    sz();
}


async function sz() {
    let types = await fetch('json/types.json').then(res => res.json());
    while (true) {
        try {
            let vehicles = await fetch('https://api.map.vlak.si/SI/sz/trips/active').then(res => res.json()).then(res => res.data);
            vehicles.forEach(async vehicle => {
                let marker = await szMarkers.find(m => m.id == vehicle.train_data.train_number);
                if (!marker) {
                    console.log(vehicle.train_data.train_number);
                    marker = new L.marker([vehicle.coordinates.lat, vehicle.coordinates.lng], { icon: L.divIcon({ html: await returnszMarker(vehicle.train_data.train_number, vehicle.train_data.train_type, vehicle.train_cache.delay), className: 'szMarker' }) });
                    marker.on('click', async () => {
                        while (true) {
                            console.log(marker.data);
                            let scheduleTable = document.createElement('table');
                            scheduleTable.className = 'table table-sm';
                            scheduleTable.style.width = '100%';
                            for (let i = 0; i < marker.data.train_data.train_times.length; i++) {
                                let stopTime = marker.data.train_data.train_times[i];
                                let row = document.createElement('tr');
                                let td1 = document.createElement('td');
                                let td2 = document.createElement('td');
                                let arrival_time = 0;
                                if (stopTime.arrival_time) {
                                    arrival_time = luxon.DateTime.fromFormat(stopTime.arrival_time, 'HH:mm:ss').setZone('Europe/Ljubljana');
                                } else {
                                    arrival_time = luxon.DateTime.fromFormat(stopTime.departure_time, 'HH:mm:ss').setZone('Europe/Ljubljana');
                                }
                                let arrival_time_copy = arrival_time;
                                if (marker.data.train_cache.delay > 0 && stopTime.stop_sequence > marker.data.train_data.current_stop_sequence) {
                                    arrival_time = arrival_time.plus({ minutes: marker.data.train_cache.delay });
                                }
                                arrival_time_copy = arrival_time_copy.plus({ minutes: marker.data.train_cache.delay });
                                if (arrival_time < luxon.DateTime.fromFormat(marker.data.train_data.train_times[0].departure_time, 'HH:mm:ss').setZone('Europe/Ljubljana')) {
                                    arrival_time = arrival_time.plus({ days: 1 });
                                    arrival_time_copy = arrival_time_copy.plus({ days: 1 });
                                }
                                let departure_time = 0;
                                if (stopTime.departure_time) {
                                    departure_time = luxon.DateTime.fromFormat(stopTime.departure_time, 'HH:mm:ss').setZone('Europe/Ljubljana');
                                } else {
                                    departure_time = luxon.DateTime.fromFormat(stopTime.arrival_time, 'HH:mm:ss').setZone('Europe/Ljubljana');
                                }
                                let departure_time_copy = departure_time;
                                if (departure_time < luxon.DateTime.fromFormat(marker.data.train_data.train_times[0].departure_time, 'HH:mm:ss').setZone('Europe/Ljubljana')) {
                                    departure_time = departure_time.plus({ days: 1 });
                                    departure_time_copy = departure_time_copy.plus({ days: 1 });
                                }
                                if (marker.data.train_cache.delay > 0 && stopTime.stop_sequence > marker.data.train_data.current_stop_sequence) {
                                    departure_time = departure_time.plus({ minutes: marker.data.train_cache.delay });
                                }
                                departure_time_copy = departure_time_copy.plus({ minutes: marker.data.train_cache.delay });
                                let is_in_stop = false;
                                if (new Date() >= arrival_time_copy.toJSDate() && new Date() <= departure_time_copy.toJSDate()) {
                                    row.style.backgroundColor = '#0B3968';
                                    row.style.color = '#fff';
                                    is_in_stop = true;
                                    arrival_time = arrival_time_copy;
                                    departure_time = departure_time_copy;
                                }
                                console.log(stopTime.stop_sequence, marker.data.train_data.current_stop_sequence, stopTime.stop_name);
                                if (new Date() > departure_time_copy.toJSDate()) {
                                    row.style.color = '#aaaaaa';
                                }
                                row.style.fontSize = 'smaller';
                                // convert to HH:mm format both arrival and departure time
                                arrival_time = arrival_time.toFormat('HH:mm');
                                departure_time = departure_time.toFormat('HH:mm');
                                td1.innerHTML = `${i != 0 ? `<i class="bi bi-box-arrow-in-right"></i> ${marker.data.train_cache.delay > 0 && (stopTime.stop_sequence > marker.data.train_data.current_stop_sequence || (is_in_stop && stopTime.stop_sequence >= marker.data.train_data.current_stop_sequence)) ? `<span class="delayText">${arrival_time}</span>` : arrival_time}<br>` : ''}
                                             ${i != marker.data.train_data.train_times.length - 1 ? `<i class="bi bi-box-arrow-left"></i> ${marker.data.train_cache.delay > 0 && (stopTime.stop_sequence > marker.data.train_data.current_stop_sequence || (is_in_stop && stopTime.stop_sequence >= marker.data.train_data.current_stop_sequence)) ? `<span class="delayText">${departure_time}</span>` : departure_time}` : ''}`
                                td2.innerHTML = `${stopTime.stop_name} ${is_in_stop ? `<br><small>(${ACTIVE_VOCABULARY.in_stop})</small>` : ""}`;
                                row.appendChild(td1);
                                row.appendChild(td2);
                                scheduleTable.appendChild(row);
                            }
                            let sourceLogos = {
                                "SŽ": "sz.svg",
                                "HŽPP": "hzpp.svg",
                                "OeBB": "obb.svg",
                                "MAV": "mav.svg",
                            }
                            let compositionText = marker.data.train_cache.composition.length > 0 ? `` : `<small>${marker.data.train_cache.is_bus ? 'AVTOBUS' : `(${ACTIVE_VOCABULARY.unknown})`}</small>`;
                            for (let info of marker.data.train_cache.composition) {
                                if (info == null) continue;
                                compositionText += `${ACTIVE_VOCABULARY.source}: <img src="img/logos/${sourceLogos[info.source]}" style="height:1rem"/></span> <small>(${new Date(info.timestamp).toLocaleString('hr-HR')})</small><hr class="no-padding no-margin">`;
                                let imgs = "";
                                let has_loco = false;
                                for (let composition of info.composition) {
                                    compositionText += `${composition.kind ? composition.kind : ""} ${composition.uicNumber ? `<small>(${composition.uicNumber})</small>`: ""}<br>`;
                                    if (info.source == 'SŽ') {
                                        let b = await (types.find(x => composition.kind.substring(0,4).includes(x.type)));
                                        imgs += `<img src="img/${b.img}.gif" style="height:30px"\>`
                                    } else {
                                        let uicNumber = TRAIN_UIC_IMAGES.find(x => x.uicNumber == composition.uicNumber);
                                        !uicNumber || uicNumber.operator == '???' ? uicNumber = TRAIN_COMPOSITIONS.find(u => composition.uicNumber.startsWith(u.uic)) : uicNumber;
                                        if (uicNumber) {
                                            imgs += `<img src="${uicNumber.image}" style="height: ${has_loco ? 21 : 30}px; margin-top: auto; ">`;
                                            if (composition.kind == 'TFZ') {
                                                has_loco = true;
                                            }
                                        } else {
                                            imgs += `<img src="./img/generic.gif" style="height: ${has_loco ? 21 : 30}px; margin-top: auto; ">`;
                                        }
                                    }
                                }
                                compositionText += `${imgs.length > 0 ? `<div class="composition">${imgs}</div>`: ""}<hr>`
                            }
                            let sidebar = document.querySelector('[sidebarjs-container]');
                            sidebar.innerHTML = `<div class="card" style="border-radius:0; border: 0px solid white;" id="sidebar-sz-${marker.data.train_data.train_number}">
                            <div class="card-header bg-warning" style="display:flex; flex-direction:column; border-radius:0; border: 0px solid white; background-color:#004B87 !important; color:white;">
                                <h5 class="card-title">${marker.data.train_data.train_type} ${marker.data.train_data.train_number}</h5>
                                <span>${marker.data.train_data.train_name}</span>
                                ${marker.data.train_data.train_common_name ? `<span style="font-style: italic">${marker.data.train_data.train_common_name}</span>` : ""}
                                </div>
                                <div class="card-body">
                                <span><b>${ACTIVE_VOCABULARY.operator}</b>: <img src="img/logos/sz.svg" style="height:1rem"/></span>
                                ${marker.data.train_cache.delay > 0 ? `<br><span><b>${ACTIVE_VOCABULARY.delay}</b>: <span class="delayText">${marker.data.train_cache.delay} min</span></span>` : ''}
                                <hr class="no-padding no-margin">
                                <span><b>${ACTIVE_VOCABULARY.schedule}</b></span><br>
                                ${scheduleTable.outerHTML}
                                <span><b>${ACTIVE_VOCABULARY.composition}</b></span><br>
                                ${compositionText}
                                </div>
                            </div>`;
                            // add exit button
                            let exitButton = document.createElement('span');
                            exitButton.style = "position: absolute; top: 0; right: 0; padding: 0.5rem; cursor: pointer; color:white;";
                            exitButton.innerHTML = `<i class="bi bi-x"></i>`;
                            exitButton.addEventListener('click', () => {
                                SIDEBAR.close();
                            });
                            sidebar.appendChild(exitButton);
                            sidebar.style.width = '100%';
                            SIDEBAR.open();
                            await delay(10000);
                            if (!document.querySelector(`#sidebar-sz-${marker.data.train_data.train_number}`)) {
                                break;
                            }
                        }
                    });
                    szMarkers.push(marker);
                    marker.addTo(map);
                } else {
                    marker.setIcon( L.divIcon({ html: await returnszMarker(vehicle.train_data.train_number, vehicle.train_data.train_type, vehicle.delay), className: 'szMarker' }) )
                    marker.setLatLng([vehicle.coordinates.lat, vehicle.coordinates.lng]);
                }
                
                marker.id = vehicle.train_data.train_id;
                if (vehicle.train_cache.composition.find(x => x.source == 'HŽPP')) {
                    vehicle.train_cache.composition.find(x => x.source == 'HŽPP').composition = vehicle.train_cache.composition.find(x => x.source == 'HŽPP').composition.reverse()
                }
                marker.data = vehicle;
            });

            await delay(1000);
        } catch (e) {
            await delay(5000);
        }
    }
}

main();

$(window).resize(function () {
    let height = $(document).height();
    $('#map').height(height);
});