let hzMarkers = [];
let rotatable = ["7121", "7123"]
let TYPES = [];

async function returnHzMarker(number, delay, gps) {
    // <div class="szIcon-test"><b>2020</b></div>
    let div = document.createElement("div");
    div.className = 'icon';
    let divicon = document.createElement("div");
    divicon.className = "szIcon-test";
    let b = document.createElement("b");
    b.innerText = number;
    divicon.appendChild(b);
    div.appendChild(divicon);
    if (delay > 0) {
        let b1 = document.createElement("b");
        b1.classList.add("delay");
        b1.innerText = `+${delay}min`;
        div.appendChild(b1);
    }
    return div;
}

function formatUICNumber(uic) {
    if (uic.length < 12) return uic;
    return `${uic.substr(0, 2)} ${uic.substr(2, 2)} <u>${uic.substr(0, 2) > 90 ? uic.substr(4, 4) : `${uic.substr(4, 2)}-${uic.substr(6, 2)}`}-${uic.substr(8, 3)}</u> ${uic.substr(11, 1)}`;
}

function findImages(uicNumbers) {
    let res = [];
        // TRAIN_COMPOSITIONS = trains.json
        // TRAIN_UIC_IMAGES = units/units
        // TYPES - kind matching
    for (let i = 0; i < uicNumbers.length; i++) {
        let uic = uicNumbers[i];
        let train = TRAIN_UIC_IMAGES.find(train => train.uicNumber == uic);
        if (train) {
            res.push(train.image);
            continue;
        }
        train = TRAIN_COMPOSITIONS.find(train => uic.startsWith(train.uic));
        if (train) {
            res.push(train.image);
            continue;
        }
        train = TYPES.find(train => (uic.substring(4,8) + '-' + uic.substring(8,9)).includes(train.type));
        if (train) {
            res.push('./img/' + train.img + '.gif');
            continue;
        }
        if (uic.startsWith('9')) {
            res.push('./img/generic-loco.gif');
            continue;
        } else {
            res.push('./img/generic.gif');
            continue;
        }
    }
    return res;
}

async function hz() {
    TYPES = await fetch('json/types.json').then(res => res.json());
    let stops = await fetch('json/stops.json').then(res => res.json());
    while (true) {
        try {
            let vehicles = await fetch('https://api.map.vlak.si/HR/hz/trips/active', {
                credentials: 'include'
            }).then(res => res.json()).then(res => res.data);
            vehicles.forEach(async vehicle => {
                try {
                    let marker = hzMarkers.find(m => m.id == vehicle.train_data.train_id);
                    if (!marker) {
                        marker = new maplibregl.Marker({
                            color: '#ff0000',
                            element: await returnHzMarker(vehicle.train_data.train_number, vehicle.train_cache.delay, vehicle.coordinates.is_gps)
                        });
                        marker.getElement().addEventListener('click', async () => {
                            while (true) {
                                console.log(marker.data);
                                const $scheduleTable = hz_makeScheduleTable(marker);
                                const $_compositionDisplay = hz_makeCompositionDisplay(marker);
                                
                                showSidebar({
                                    content: /*html*/`
                                    <div class="sidebar-inner" id="sidebar-sz-${marker.data.train_data.train_number}">
                                        <div class="sidebar-header">
                                            <h5>${marker.data.train_data.train_number}</h5>
                                            <span>${marker.data.train_data.train_name}</span>
                                            ${marker.data.train_data.train_common_name ? `<span style="font-style: italic">${marker.data.train_data.train_common_name}</span>` : ""}
                                        </div>
                                        <div class="sidebar-body">
                                            <span><b>${ACTIVE_VOCABULARY.operator}</b>: <img src="img/logos/hzpp.svg" style="height:1rem"/></span>
                                            ${marker.data.train_cache.delay > 0 ? `<br><span><b>${ACTIVE_VOCABULARY.delay}</b>: <span class="delayText">${marker.data.train_cache.delay} min</span></span>` : ''}
                                            <hr class="no-padding no-margin">
                                            
                                            <span><b>${ACTIVE_VOCABULARY.schedule}</b></span><br>
                                            ${$scheduleTable.outerHTML}

                                            <span><b>${ACTIVE_VOCABULARY.composition}</b></span><br>
                                            ${$_compositionDisplay}
                                            <small class="really-small"><hr>${ACTIVE_VOCABULARY.disclaimers.vagonweb}</small>
                                            <small class="really-small"><hr>${ACTIVE_VOCABULARY.disclaimers.not_accurate}</small>
                                        </div>
                                    </div>`
                                })
                                
                                await delay(10000);
                                if (!document.querySelector(`#sidebar-sz-${marker.data.train_data.train_number}`)) {
                                    break;
                                }
                            }
                        });
                        marker.id = vehicle.train_data.train_id;
                        marker.setLngLat([vehicle.coordinates.lng, vehicle.coordinates.lat]);
                        marker.addTo(map);
                        hzMarkers.push(marker);
                    } else {
                        marker.setLngLat([vehicle.coordinates.lng, vehicle.coordinates.lat]);
                        marker.getElement().innerHTML = (await returnHzMarker(vehicle.train_data.train_number, vehicle.train_cache.delay, vehicle.coordinates.is_gps)).innerHTML;
                    }
                    marker.data = vehicle;
                } catch (e) {
                    console.log(e, vehicle);
                }
            });

            await delay(10000);
        } catch (e) {
            await delay(5000);
        }
    }
}

function hz_makeScheduleTable(marker) {
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
            if (stopTime.arrival_time.length == 7) stopTime.arrival_time = '0' + stopTime.arrival_time;
            if (parseInt(stopTime.arrival_time.split(':')[0]) > 23) {
                arrival_time = parseInt(stopTime.arrival_time.split(':')[0]) - 24;
                arrival_time = arrival_time.toString() + ':' + stopTime.arrival_time.split(':')[1] + ':' + stopTime.arrival_time.split(':')[2];
                if (arrival_time.length == 7) arrival_time = '0' + arrival_time;
                arrival_time = luxon.DateTime.fromFormat(arrival_time, 'HH:mm:ss', {
                    zone: 'Europe/Zagreb'
                }).plus({ days: 1 });
                console.log(arrival_time);
            } else {
                arrival_time = luxon.DateTime.fromFormat(stopTime.arrival_time, 'HH:mm:ss').setZone('Europe/Zagreb');
            }
        } else {
            if (stopTime.departure_time.length == 7) stopTime.departure_time = '0' + stopTime.departure_time;
            if (parseInt(stopTime.departure_time.split(':')[0]) > 23) {
                arrival_time = parseInt(stopTime.departure_time.split(':')[0]) - 24;
                arrival_time = arrival_time.toString() + ':' + stopTime.departure_time.split(':')[1] + stopTime.departure_time.split(':')[2];
                if (arrival_time.length == 7) arrival_time = '0' + arrival_time;
                arrival_time = luxon.DateTime.fromFormat(arrival_time, 'HH:mm:ss', {
                    zone: 'Europe/Zagreb'
                }).plus({ days: 1 });
            } else {
                arrival_time = luxon.DateTime.fromFormat(stopTime.departure_time, 'HH:mm:ss').setZone('Europe/Zagreb');
            }
        }
        let arrival_time_copy = arrival_time;
        if (marker.data.train_cache.delay > 0 && stopTime.stop_sequence > marker.data.train_data.current_stop_sequence) {
            arrival_time = arrival_time.plus({ minutes: marker.data.train_cache.delay });
        }
        arrival_time_copy = arrival_time_copy.plus({ minutes: marker.data.train_cache.delay });
        if (arrival_time < luxon.DateTime.fromFormat(marker.data.train_data.train_times[0].departure_time, 'HH:mm:ss').setZone('Europe/Zagreb')) {
            arrival_time = arrival_time.plus({ days: 1 });
            arrival_time_copy = arrival_time_copy.plus({ days: 1 });
        }
        let departure_time = 0;
        if (stopTime.departure_time) {
            if (stopTime.departure_time.length == 7) stopTime.departure_time = '0' + stopTime.departure_time;
            if (parseInt(stopTime.departure_time.split(':')[0]) > 23) {
                departure_time = parseInt(stopTime.departure_time.split(':')[0]) - 24;
                departure_time = departure_time.toString() + ':' + stopTime.departure_time.split(':')[1] + ':' + stopTime.departure_time.split(':')[2];
                if (departure_time.length == 7) departure_time = '0' + departure_time;
                departure_time = luxon.DateTime.fromFormat(departure_time, 'HH:mm:ss', {
                    zone: 'Europe/Zagreb'
                }).plus({ days: 1 });
            } else {
                departure_time = luxon.DateTime.fromFormat(stopTime.departure_time, 'HH:mm:ss').setZone('Europe/Zagreb');
            }
        } else {
            if (stopTime.arrival_time.length == 7) stopTime.arrival_time = '0' + stopTime.arrival_time;
            if (parseInt(stopTime.arrival_time.split(':')[0]) > 23) {
                departure_time = parseInt(stopTime.arrival_time.split(':')[0]) - 24;
                departure_time = departure_time.toString() + ':' + stopTime.arrival_time.split(':')[1] + stopTime.arrival_time.split(':')[2];
                if (departure_time.length == 7) departure_time = '0' + departure_time;
                departure_time = luxon.DateTime.fromFormat(departure_time, 'HH:mm:ss', {
                    zone: 'Europe/Zagreb'
                }).plus({ days: 1 });
            } else {
                departure_time = luxon.DateTime.fromFormat(stopTime.arrival_time, 'HH:mm:ss').setZone('Europe/Zagreb');
            }
        }
        let departure_time_copy = departure_time;
        if (departure_time < luxon.DateTime.fromFormat(marker.data.train_data.train_times[0].departure_time, 'HH:mm:ss').setZone('Europe/Zagreb')) {
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
                                                 ${i != marker.data.train_data.train_times.length - 1 ? `<i class="bi bi-box-arrow-left"></i> ${marker.data.train_cache.delay > 0 && (stopTime.stop_sequence > marker.data.train_data.current_stop_sequence || (is_in_stop && stopTime.stop_sequence >= marker.data.train_data.current_stop_sequence)) ? `<span class="delayText">${departure_time}</span>` : departure_time}` : ''}`;
        td2.innerHTML = `${stopTime.stop_name} ${is_in_stop ? `<br><small>(${ACTIVE_VOCABULARY.in_stop})</small>` : ""}`;
        row.appendChild(td1);
        row.appendChild(td2);
        scheduleTable.appendChild(row);
    }
    return scheduleTable;
}

function hz_makeCompositionDisplay(marker) {
    let compositionText = "";
    let composition_img = "";
    if (marker.data.train_cache.composition.length > 0) {
        if (marker.data.train_cache.is_bus) {
            compositionText = `<small>${ACTIVE_VOCABULARY.bus}</small>`;
            composition_img = `<img src="img/autobus.gif" style="height: 30px; transform: scaleX(-1); margin-top: auto;">`;
        } else {
            let unit_counter = {};
            let has_loco = false;
            let images = findImages(marker.data.train_cache.composition.map(x => x.uicNumber.toString()));
            console.log(images);
            for (let i = 0; i < marker.data.train_cache.composition.length; i++) {
                let unit = marker.data.train_cache.composition[i];
                let is_loco = unit.kind == 'VOZNA' || unit.kind == 'ZAPREŽNA' || unit.kind == 'TFZ';
                if (is_loco) has_loco = true;
                compositionText += `<span>${unit.kind}</span> <small>(${formatUICNumber(unit.uicNumber.toString())})</small><br>`;
                // if kind 5111 is 2 places before 4111, then rotate them
                if (marker.data.train_cache.composition[i + 2] != null && marker.data.train_cache.composition[i + 2].kind.includes('4111') && unit.kind.includes('5111')) {
                    let temp = images[i + 2];
                    images[i + 2] = images[i];
                    images[i] = temp;
                }
                // if 4121 is ahead of 7121, replace their positions
                if (marker.data.train_cache.composition[i + 1] != null && marker.data.train_cache.composition[i + 1].kind.includes('7121') && unit.kind.includes('4121')) {
                    let temp = images[i + 1];
                    images[i + 1] = images[i];
                    images[i] = temp;
                }
                if (!unit_counter[images[i]]) {
                    unit_counter[images[i]] = 1;
                } else {
                    unit_counter[images[i]]++;
                }
                console.log(unit_counter);
                // create images
                composition_img += `<img src="${vagonweb_proxy(images[i])}" style="height: ${has_loco && !is_loco ? 21 : 30}px; margin-top: auto; ${unit_counter[images[i]] % 2 == 0 ? 'transform: scaleX(-1);' : ''}">`;
            }
        }
    } else {
        compositionText = `${ACTIVE_VOCABULARY.unknown}`;
    }

    return `
        ${compositionText}
        ${composition_img.length > 0 ? `<div class="composition">${composition_img}</div>` : ""}
    `;

}
