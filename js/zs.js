let zsMarkers = [];


async function returnZsMarker(number, delay) {
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

async function zs() {
    while (true) {
        try {
            let vehicles = await fetch('https://api.hzpp.prometko.si/RS/zs/trips/active').then(res => res.json()).then(res => res.data);
            vehicles.forEach(async vehicle => {
                let marker = zsMarkers.find(m => m.id == vehicle.train_data.train_id);
                if (!marker) {
                    marker = new maplibregl.Marker({
                        color: '#ff0000',
                        element: await returnZsMarker(vehicle.train_data.train_number, vehicle.train_cache.delay)
                    });
                    zsMarkers.push(marker);
                    marker.id = vehicle.train_data.train_id;
                    marker.setLngLat([vehicle.coordinates.lng, vehicle.coordinates.lat]);
                    marker.addTo(map);
                } else {
                    let k = await returnZsMarker(vehicle.train_data.train_number, vehicle.train_cache.delay);
                    marker.setLngLat([vehicle.coordinates.lng, vehicle.coordinates.lat]);
                    marker.getElement().innerHTML = k.innerHTML;
                }
                marker.data = vehicle;
                marker.getElement().addEventListener('click', async () => {
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
                            let arrival_time = luxon.DateTime.fromFormat(stopTime.arrival_time, 'HH:mm:ss').setZone('Europe/Ljubljana');
                            let arrival_time_copy = arrival_time;
                            if (marker.data.train_cache.delay > 0 && stopTime.stop_sequence > marker.data.train_data.current_stop_sequence) {
                                arrival_time = arrival_time.plus({ minutes: marker.data.train_cache.delay });
                            }
                            arrival_time_copy = arrival_time_copy.plus({ minutes: marker.data.train_cache.delay });
                            let departure_time = luxon.DateTime.fromFormat(stopTime.departure_time, 'HH:mm:ss').setZone('Europe/Ljubljana');
                            let departure_time_copy = departure_time;
                            if (marker.data.train_cache.delay > 0 && stopTime.stop_sequence > marker.data.train_data.current_stop_sequence) {
                                departure_time = departure_time.plus({ minutes: marker.data.train_cache.delay });
                            }
                            departure_time_copy = departure_time_copy.plus({ minutes: marker.data.train_cache.delay });
                            let is_in_stop = false;
                            console.log(arrival_time, departure_time);
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
                            // convert to HH:mm format both arrival and departure time
                            arrival_time = arrival_time.toFormat('HH:mm');
                            departure_time = departure_time.toFormat('HH:mm');
                            td1.innerHTML = `${i != 0 ? `<i class="bi bi-box-arrow-in-right"></i> ${marker.data.train_cache.delay > 0 && stopTime.stop_sequence > marker.data.train_data.current_stop_sequence ? `<span class="delayText">${arrival_time}</span>` : arrival_time}<br>` : ''}
                                         ${i != marker.data.train_data.train_times.length - 1 ? `<i class="bi bi-box-arrow-left"></i> ${marker.data.train_cache.delay > 0 && stopTime.stop_sequence > marker.data.train_data.current_stop_sequence ? `<span class="delayText">${departure_time}</span>` : departure_time}` : ''}`
                            td2.innerHTML = `${stopTime.stop_name} ${is_in_stop ? `<br><small>(${ACTIVE_VOCABULARY.in_stop})</small>` : ""}`;
                            row.appendChild(td1);
                            row.appendChild(td2);
                            scheduleTable.appendChild(row);
                        }
                        let compositionText = marker.data.train_cache.composition;
                        let sidebar = document.querySelector('[sidebarjs-container]');
                        sidebar.innerHTML = `<div class="card" style="border-radius:0; border: 0px solid white;" id="sidebar-zs-${marker.data.train_data.train_number}">
                        <div class="card-header bg-warning" style="display:flex; flex-direction:column; border-radius:0; border: 0px solid white; background-color:#0869B6 !important; color:white;">
                            <h5 class="card-title">${marker.data.train_data.train_number}</h5>
                            <span>${marker.data.train_data.train_name}</span>
                            </div>
                            <div class="card-body">
                            <span><b>${ACTIVE_VOCABULARY.operator}</b>: <img src="img/logos/SrbijaVoz.svg" style="height:1rem"/></span>
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
                        await delay(5000);
                        if (!document.querySelector(`#sidebar-zs-${marker.data.train_data.train_number}`)) {
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