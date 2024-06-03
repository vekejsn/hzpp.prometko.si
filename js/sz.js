let szMarkers = [];


async function returnszMarker(number, delay) {
    let div = document.createElement("div");
    div.className = 'icon';
    let divicon = document.createElement("div");
    divicon.className = "zsIcon";
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

async function sz() {
    let types = await fetch('json/types.json').then(res => res.json());
    while (true) {
        try {
            let vehicles = await fetch('https://api.map.vlak.si/SI/sz/trips/active', {
                credentials: 'include'
            }).then(res => res.json()).then(res => res.data);
            vehicles.forEach(async vehicle => {
                let marker = await szMarkers.find(m => m.data.train_data.train_number == vehicle.train_data.train_number);
                if (!marker) {
                    marker = new maplibregl.Marker({
                        color: '#ff0000',
                        element: await returnszMarker(vehicle.train_data.train_type + vehicle.train_data.train_number, vehicle.train_cache.delay)
                    });
                    marker.getElement().addEventListener('click', async () => {
                        while (true) {
                            console.log(marker.data);
                            let scheduleTable = sz_makeScheduleTable(marker);
                            let compositionText = sz_makeCompositionDisplay(marker, types);
                            showSidebar({
                                content: /*html*/`
                                <div class="sidebar-inner" id="sidebar-sz-${marker.data.train_data.train_number}">
                                    <div class="sidebar-header">
                                        <h5>${marker.data.train_data.train_type} ${marker.data.train_data.train_number}</h5>
                                        <span>${marker.data.train_data.train_name}</span>
                                        ${marker.data.train_data.train_common_name ? `<span style="font-style: italic">${marker.data.train_data.train_common_name}</span>` : ""}
                                    </div>
                                    <div class="sidebar-body">
                                        <span><b>${ACTIVE_VOCABULARY.operator}</b>: <img src="img/logos/sz.svg" style="height:1rem"/></span>
                                        ${marker.data.train_cache.delay > 0 ? `<br><span><b>${ACTIVE_VOCABULARY.delay}</b>: <span class="delayText">${marker.data.train_cache.delay} min</span></span>` : ''}
                                        <hr class="no-padding no-margin">
                                        <span><b>${ACTIVE_VOCABULARY.schedule}</b></span><br>
                                        ${scheduleTable.outerHTML}
                                        <span><b>${ACTIVE_VOCABULARY.composition}</b></span><br>
                                        ${compositionText}
                                        <small class="really-small"><hr>${ACTIVE_VOCABULARY.disclaimers.vagonweb}</small>
                                        <small class="really-small"><hr>${ACTIVE_VOCABULARY.disclaimers.not_accurate}</small>
                                    </div>
                                </div>`
                            });
                            
                            await delay(10000);
                            if (!document.querySelector(`#sidebar-sz-${marker.data.train_data.train_number}`)) {
                                break;
                            }
                        }
                    });
                    marker.id = await vehicle.train_data.train_number;
                    marker.setLngLat([vehicle.coordinates.lng, vehicle.coordinates.lat]);
                    marker.addTo(map);
                    szMarkers.push(marker);
                } else {
                    let k = await returnszMarker(vehicle.train_data.train_type + vehicle.train_data.train_number, vehicle.train_cache.delay);
                    marker.getElement().innerHTML = k.innerHTML;
                    marker.setLngLat([vehicle.coordinates.lng, vehicle.coordinates.lat]);
                }
                
                marker.id = vehicle.train_data.train_id;
                marker.data = vehicle;
                marker.setLngLat([vehicle.coordinates.lng, vehicle.coordinates.lat]);
            });

            await delay(10000);
        } catch (e) {
            await delay(5000);
        }
    }
}

function sz_makeScheduleTable(marker) {
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
                                             ${i != marker.data.train_data.train_times.length - 1 ? `<i class="bi bi-box-arrow-left"></i> ${marker.data.train_cache.delay > 0 && (stopTime.stop_sequence > marker.data.train_data.current_stop_sequence || (is_in_stop && stopTime.stop_sequence >= marker.data.train_data.current_stop_sequence)) ? `<span class="delayText">${departure_time}</span>` : departure_time}` : ''}`;
        td2.innerHTML = `${stopTime.stop_name} ${is_in_stop ? `<br><small>(${ACTIVE_VOCABULARY.in_stop})</small>` : ""}`;
        row.appendChild(td1);
        row.appendChild(td2);
        scheduleTable.appendChild(row);
    }
    return scheduleTable;
}

function sz_makeCompositionDisplay(marker, types) {
    let sourceLogos = {
        "SŽ": "sz.svg",
        "HŽPP": "hzpp.svg",
        "OeBB": "obb.svg",
        "MAV": "mav.svg",
    };
    let compositionText = marker.data.train_cache.composition.length > 0 ? `` : `<small>${marker.data.train_cache.is_bus ? 'AVTOBUS' : `(${ACTIVE_VOCABULARY.unknown})`}</small>`;
    for (let info of marker.data.train_cache.composition) {
        if (info == null) continue;
        compositionText += `${ACTIVE_VOCABULARY.source}: <img src="img/logos/${sourceLogos[info.source]}" style="height:1rem"/></span> <small>(${new Date(info.timestamp).toLocaleString('hr-HR')})</small><hr class="no-padding no-margin">`;
        let imgs = "";
        let has_loco = false;
        for (let composition of info.composition) {
            compositionText += `${composition.kind ? composition.kind : ""} ${composition.uicNumber ? `<small>(${formatUICNumber(composition.uicNumber)})</small>` : ""}<br>`;
            if (info.source == 'SŽ') {
                let b = types.find(x => composition.kind.substring(0, 4).includes(x.type));
                imgs += `<img src="img/${vagonweb_proxy(b.img)}.gif" style="height:30px"\>`;
            } else {
                let uicNumber = TRAIN_UIC_IMAGES.find(x => x.uicNumber == composition.uicNumber);
                !uicNumber || uicNumber.operator == '???' ? uicNumber = TRAIN_COMPOSITIONS.find(u => composition.uicNumber.startsWith(u.uic)) : uicNumber;
                if (uicNumber) {
                    imgs += `<img src="${vagonweb_proxy(uicNumber.image)}" style="height: ${has_loco && composition.kind != 'TFZ' ? 21 : 30}px; margin-top: auto; ">`;
                    if (composition.kind == 'TFZ') {
                        has_loco = true;
                    }
                } else {
                    imgs += `<img src="./img/generic.gif" style="height: ${has_loco ? 21 : 30}px; margin-top: auto; ">`;
                }
            }
        }
        compositionText += `${imgs.length > 0 ? `<div class="composition">${imgs}</div>` : ""}<hr>`;
    }
    return compositionText;
}
