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
        const stopTime = marker.data.train_data.train_times[i];
        
        const $row = document.createElement('tr');
        $row.style.fontSize = 'smaller';

        const $td1 = document.createElement('td');
        const $td2 = document.createElement('td');

        const isUpcomingStop = stopTime.stop_sequence > marker.data.train_data.current_stop_sequence;

        const originalDepartureTime = luxon.DateTime.fromFormat(marker.data.train_data.train_times[0].departure_time, 'H:m:s').setZone('Europe/Zagreb');

        let arrival_time_disp = hz_parseTime(stopTime.arrival_time);
        let departure_time_disp = hz_parseTime(stopTime.departure_time);
        if (!arrival_time_disp)
            arrival_time_disp = departure_time_disp;
        else if (!departure_time_disp)
            departure_time_disp = arrival_time_disp


        // We want to display scheduled time for passed stops but estimated time (incl. delay) for upcoming stops
        let arrival_time_est = arrival_time_disp;
        let departure_time_est = departure_time_disp;

        arrival_time_est = arrival_time_est.plus({ minutes: marker.data.train_cache.delay });
        departure_time_est = departure_time_est.plus({ minutes: marker.data.train_cache.delay });

        if (isUpcomingStop && marker.data.train_cache.delay > 0) {
            arrival_time_disp = arrival_time_disp.plus({ minutes: marker.data.train_cache.delay });
            departure_time_disp = departure_time_disp.plus({ minutes: marker.data.train_cache.delay });
        }

        // TODO: explain this -- probably a midnight edge case?
        if (arrival_time_disp < originalDepartureTime) {
            arrival_time_disp = arrival_time_disp.plus({ days: 1 });
            arrival_time_est = arrival_time_est.plus({ days: 1 });
        }
        if (departure_time_disp < originalDepartureTime) {
            departure_time_disp = departure_time_disp.plus({ days: 1 });
            departure_time_est = departure_time_est.plus({ days: 1 });
        }

        const isInStop = new Date() >= arrival_time_est.toJSDate() && new Date() <= departure_time_est.toJSDate();

        if (isInStop) {
            $row.style.backgroundColor = '#0B3968';
            $row.style.color = '#fff';
            arrival_time_disp = arrival_time_est;
            departure_time_disp = departure_time_est;
        }
        if (new Date() > departure_time_est.toJSDate()) {
            $row.style.color = '#aaaaaa';
        }
        
        // console.log(stopTime.stop_sequence, marker.data.train_data.current_stop_sequence, stopTime.stop_name);

        // convert to HH:mm format both arrival and departure time
        const arrival_fmt = arrival_time_disp.toFormat('HH:mm');
        const departure_fmt = departure_time_disp.toFormat('HH:mm');

        const isUpcomingOrCurrentStop = isUpcomingStop || (isInStop && stopTime.stop_sequence >= marker.data.train_data.current_stop_sequence);

        // Arrival time (non-first stop)
        if (i != 0) 
            $td1.innerHTML += /*html*/`
                <i class="bi bi-box-arrow-in-right"></i> 
                <span class="${marker.data.train_cache.delay > 0 && isUpcomingOrCurrentStop ? 'delayText' : ''}">
                    ${arrival_fmt}
                </span>
                <br>`;
        
        // Departure time (non-last stop)
        if (i != marker.data.train_data.train_times.length - 1)
            $td1.innerHTML += /*html*/`
                <i class="bi bi-box-arrow-left"></i> 
                <span class="${marker.data.train_cache.delay > 0 && isUpcomingOrCurrentStop ? 'delayText' : ''}">
                    ${departure_fmt}
                </span>`;

        $td2.innerHTML = `${stopTime.stop_name} ${isInStop ? `<br><small>(${ACTIVE_VOCABULARY.in_stop})</small>` : ""}`;
        $row.appendChild($td1);
        $row.appendChild($td2);
        scheduleTable.appendChild($row);
    }
    return scheduleTable;
}

function hz_parseTime(timeString) {
    if (!timeString)
        return null;

    const parts = timeString.split(":");
    let hrs = parseInt(parts.pop(0));

    if (hrs > 23) {
        hrs = hrs - 24;
        timeString = hrs + ":" + parts.join(":");
        return luxon.DateTime.fromFormat(formatted, 'H:m:s').setZone('Europe/Zagreb').plus({ days: 1 });
    } else {
        return luxon.DateTime.fromFormat(timeString, 'H:m:s').setZone('Europe/Zagreb');
    }
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
