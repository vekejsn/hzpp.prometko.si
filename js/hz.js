let hzMarkers = [];

async function returnHzMarker(number, delay) {
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

async function hz() {
    let types = await fetch('json/types.json').then(res => res.json());
    let stops = await fetch('json/stops.json').then(res => res.json());
    while (true) {
        try {
            let vehicles = await fetch('https://api.hzpp.prometko.si/HR/hz/trips/active').then(res => res.json()).then(res => res.data);

            vehicles.forEach(async vehicle => {
                let marker = hzMarkers.find(m => m.id == vehicle.trip_id);
                if (!marker) {
                    marker = new maplibregl.Marker({
                        color: '#ff0000',
                        element: await returnHzMarker(vehicle.trip_short_name, vehicle.delay)
                    });
                    hzMarkers.push(marker);
                    marker.setLngLat([vehicle.train_lon, vehicle.train_lat]);
                    marker.addTo(map);
                    marker.id = vehicle.trip_id;
                } else {
                    let k = await returnHzMarker(vehicle.trip_short_name, vehicle.delay);
                    marker.getElement().innerHTML = k.innerHTML;
                    marker.setLngLat([vehicle.train_lon, vehicle.train_lat]);
                }
                marker.data = vehicle;
                marker.getElement().addEventListener('click', async () => {
                    while (true) {
                        let scheduleTable = document.createElement('table');
                        scheduleTable.className = 'table table-sm';
                        scheduleTable.style.width = '100%';
                        for (let i = 0; i < marker.data.stop_times.length; i++) {
                            let stopTime = marker.data.stop_times[i];
                            let row = document.createElement('tr');
                            let td1 = document.createElement('td');
                            let td2 = document.createElement('td');
                            let arrival_time = luxon.DateTime.fromFormat(stopTime.arrival_time, 'h:mm:ss').setZone('Europe/Ljubljana');
                            let arrival_time_copy = arrival_time;
                            if (marker.data.delay > 0 && i > marker.data.current_stop_index) {
                                arrival_time = arrival_time.plus({ minutes: marker.data.delay });
                            }
                            arrival_time_copy = arrival_time_copy.plus({ minutes: marker.data.delay });
                            let departure_time = luxon.DateTime.fromFormat(stopTime.departure_time, 'h:mm:ss').setZone('Europe/Ljubljana');
                            let departure_time_copy = departure_time;
                            if (marker.data.delay > 0 && i > marker.data.current_stop_index) {
                                departure_time = departure_time.plus({ minutes: marker.data.delay });
                            }
                            departure_time_copy = departure_time_copy.plus({ minutes: marker.data.delay });
                            let is_in_stop = false;
                            if (new Date() > arrival_time_copy.toJSDate() && new Date() < departure_time_copy.toJSDate()) {
                                row.style.backgroundColor = '#0B3968';
                                row.style.color = '#fff';
                                is_in_stop = true;
                                arrival_time = arrival_time_copy;
                                departure_time = departure_time_copy;
                            }
                            if (new Date() > departure_time.toJSDate()) {
                                row.style.color = '#aaaaaa';
                            }
                            row.style.fontSize = 'smaller';
                            // convert to h:mm format both arrival and departure time
                            arrival_time = arrival_time.toFormat('HH:mm');
                            departure_time = departure_time.toFormat('HH:mm');
                            td1.innerHTML = `${i != 0 ? `<i class="bi bi-box-arrow-in-right"></i> ${marker.data.delay > 0 && i > marker.data.current_stop_index ? `<span class="delayText">${arrival_time}</span>` : arrival_time}<br>` : ''}
                                         ${i != marker.data.stop_times.length - 1 ? `<i class="bi bi-box-arrow-left"></i> ${marker.data.delay > 0 && i > marker.data.current_stop_index ? `<span class="delayText">${departure_time}</span>` : departure_time}` : ''}`
                            td2.innerHTML = `${stops.find(s => s.stop_id == stopTime.stop_id).stop_name} ${is_in_stop ? `<br><small>(${ACTIVE_VOCABULARY.in_stop})</small>` : ""}`;
                            row.appendChild(td1);
                            row.appendChild(td2);
                            scheduleTable.appendChild(row);
                        }
                        let compositionText = "";
                        let composition_img = "";
                        if (marker.data.composition) {
                            let unitCounter = {};
                            let has_loco = false;
                            for (let i = 0; i < marker.data.composition.length; i++) {
                                let unit = marker.data.composition[i];
                                compositionText += `<span>${unit.kind}</span> <small>(${unit.uicNumber})</small><br>`;
                                if (marker.data.composition[i + 2] != null && (vehicle.composition[i].kind.includes("5111") && vehicle.composition[i + 2].kind.includes("4111"))) {
                                    let temp = vehicle.composition[i];
                                    vehicle.composition[i] = vehicle.composition[i + 2];
                                    vehicle.composition[i + 2] = temp;
                                }
                                // if 4121 is ahead of 7121, replace their positions
                                if (vehicle.composition[i + 1] != null && (vehicle.composition[i].kind.includes("4121") && vehicle.composition[i + 1].kind.includes("7121"))) {
                                    let temp = vehicle.composition[i];
                                    vehicle.composition[i] = vehicle.composition[i + 1];
                                    vehicle.composition[i + 1] = temp;
                                }
                                let component = vehicle.composition[i];
                                let type = types.find(t => component.kind.includes(t.type));
                                if (component.kind == 'VOZNA' || component.kind == 'ZAPR.') {
                                    type = types.find(t => component.uicNumber.startsWith(t.type));
                                }
                                if (type) {
                                    // if it's the 2nd in a row of the classes 7121-1 or 7123, flip the image to the other side
                                    // console.log('uc',vehicle.trip_short_name, unitCounter[type.type])
                                    if (unitCounter[type.type] && (unitCounter[type.type] + 1) % 2 == 0 && (type.type == "7121" || type.type == "7123")) {
                                        // console.log('went in')
                                        composition_img += `<img src="./img/${type.img}.gif" style="height: 30px; transform: scaleX(-1); margin-top: auto;">`;
                                    } else if (false) {

                                    } else {
                                        composition_img += `<img src="./img/${type.img}.gif" style="height: ${has_loco && (component.kind != 'TFZ' && component.kind != 'VOZNA' && component.kind != 'ZAPREŽNA') ? 21 : 30}px; margin-top: auto;">`;
                                        if (component.kind == 'TFZ' || component.kind == 'VOZNA' || component.kind == 'ZAPREŽNA') {
                                            has_loco = true;
                                            console.log('1')
                                        }
                                    }
                                    unitCounter[type.type] = unitCounter[type.type] ? unitCounter[type.type] + 1 : 1;
                                } else {
                                    let uicNumber = TRAIN_UIC_IMAGES.find(x => x.uicNumber == component.uicNumber);
                                    !uicNumber || uicNumber.operator == '???' ? uicNumber = TRAIN_COMPOSITIONS.find(u => component.uicNumber.startsWith(u.uic)) : uicNumber;
                                    if (uicNumber) {
                                        composition_img += `<img src="${uicNumber.image}" style="height: ${has_loco && (component.kind != 'TFZ' && component.kind != 'VOZNA' && component.kind != 'ZAPREŽNA') ? 21 : 30}px; margin-top: auto;">`;
                                        if (component.kind == 'TFZ' || component.kind == 'VOZNA' || component.kind == 'ZAPREŽNA') {
                                            has_loco = true;
                                            console.log('2')
                                        }
                                    } else {
                                        composition_img += `<img src="./img/generic.gif" style="height: ${has_loco && (component.kind != 'TFZ' && component.kind != 'VOZNA' && component.kind != 'ZAPREŽNA') ? 21 : 30}px; margin-top: auto;">`;
                                        if (component.kind == 'TFZ' || component.kind == 'VOZNA' || component.kind == 'ZAPREŽNA') {
                                            has_loco = true;
                                            console.log('3')
                                        }
                                    }
                                }
                            }
                        } else {
                            compositionText = `${ACTIVE_VOCABULARY.unknown}`;
                        }
                        let sidebar = document.querySelector('[sidebarjs-container]');
                        sidebar.innerHTML = `<div class="card" style="border-radius:0; border: 0px solid white;" id="sidebar-hz-${marker.data.trip_short_name}">
                        <div class="card-header bg-warning" style="display:flex; flex-direction:column; border-radius:0; border: 0px solid white; background-color:#0B3968 !important; color:white;">
                            <h5 class="card-title">${marker.data.trip_short_name}</h5>
                            <span>${marker.data.route.route_long_name}</span>
                            </div>
                            <div class="card-body">
                            <span><b>${ACTIVE_VOCABULARY.operator}</b>: <img src="img/logos/hzpp.svg" style="height:1rem"/></span>
                            ${marker.data.delay > 0 ? `<br><span><b>${ACTIVE_VOCABULARY.delay}</b>: <span class="delayText">${marker.data.delay} min</span></span>` : ''}
                            <hr class="no-padding no-margin">
                            <span><b>${ACTIVE_VOCABULARY.schedule}</b></span><br>
                            ${scheduleTable.outerHTML}
                            <span><b>${ACTIVE_VOCABULARY.composition}</b></span><br>
                            ${compositionText}
                            ${composition_img.length > 0 ? `<div class="composition">${composition_img}</div>` : ""}
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
                        await delay(5000);
                        if (!document.querySelector(`#sidebar-hz-${marker.data.trip_short_name}`)) {
                            break;
                        }
                    }
                });
            });

            await delay(10000);
        } catch (e) {
            await delay(5000);
        }
    }
}