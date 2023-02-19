let MkMarkers = [];


async function returnMkMarker(number, delay) {
    let div = document.createElement("div");
    div.className = 'icon';
    let divicon = document.createElement("div");
    divicon.className = "mkIcon";
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

async function mk() {
    while (true) {
        try {
            let vehicles = await fetch('http://127.0.0.1:4242/MK/mzt/trips/active').then(res => res.json()).then(res => res.data);
            vehicles.forEach(async vehicle => {
                let marker = MkMarkers.find(m => m.id == vehicle.train_data.train_id);
                if (!marker) {
                    marker = new maplibregl.Marker({
                        color: '#ff0000',
                        element: await returnMkMarker(vehicle.train_data.train_number, 0)
                    });
                    MkMarkers.push(marker);
                    marker.setLngLat([vehicle.coordinates.lng, vehicle.coordinates.lat]);
                    marker.addTo(map);
                } else {
                    let k = await returnMkMarker(vehicle.train_data.train_number, 0);
                    marker.getElement().innerHTML = k.innerHTML;
                    marker.setLngLat([vehicle.coordinates.lng, vehicle.coordinates.lat]);
                }
                marker.id = vehicle.train_data.train_id;
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
                            let arrival_time = luxon.DateTime.fromFormat(stopTime.arrival_time ? stopTime.arrival_time : "00:00", 'HH:mm:ss').setZone('Europe/Ljubljana');
                            let departure_time = luxon.DateTime.fromFormat(stopTime.departure_time ? stopTime.departure_time : "00:00", 'HH:mm:ss').setZone('Europe/Ljubljana');
                            let is_in_stop = false;
                            if (new Date() > arrival_time.toJSDate() && new Date() < departure_time.toJSDate()) {
                                row.style.backgroundColor = '#0B3968';
                                row.style.color = '#fff';
                                is_in_stop = true;
                            }
                            if (new Date() > departure_time.toJSDate()) {
                                row.style.color = '#aaaaaa';
                            }
                            row.style.fontSize = 'smaller';
                            // convert to HH:mm format both arrival and departure time
                            arrival_time = arrival_time.toFormat('HH:mm');
                            departure_time = departure_time.toFormat('HH:mm');
                            td1.innerHTML = `${i != 0 ? `<i class="bi bi-box-arrow-in-right"></i> ${arrival_time}` : ""}
                                         ${i != marker.data.train_data.train_times.length - 1 ? `${i!=0 ? "<br>" : ""}<i class="bi bi-box-arrow-left"></i> ${departure_time}` : ''}`
                            td2.innerHTML = `${stopTime.stop_name} ${is_in_stop ? `<br><small>(${ACTIVE_VOCABULARY.in_stop})</small>` : ""}`;
                            row.appendChild(td1);
                            row.appendChild(td2);
                            scheduleTable.appendChild(row);
                        }
                        let sidebar = document.querySelector('[sidebarjs-container]');
                        sidebar.innerHTML = `<div class="card" style="border-radius:0; border: 0px solid white;" id="sidebar-mk-${marker.data.train_data.train_number.replaceAll(' ','')}">
                        <div class="card-header bg-warning" style="display:flex; flex-direction:column; border-radius:0; border: 0px solid white; background-color:#255173 !important; color:white;">
                            <h5 class="card-title">${marker.data.train_data.train_number}</h5>
                            <span>${marker.data.train_data.train_name}</span>
                            </div>
                            <div class="card-body">
                            <span><b>${ACTIVE_VOCABULARY.operator}</b>: <img src="img/logos/mk.jpg" style="height:1rem"/> MŽ Transport AD</span>
                            <hr class="no-padding no-margin">
                            <span><b>${ACTIVE_VOCABULARY.schedule}</b></span><br>
                            ${scheduleTable.outerHTML}
                            ${ACTIVE_VOCABULARY.static_data}
                            <small class="really-small"><hr>${ACTIVE_VOCABULARY.disclaimers.not_accurate}</small>
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
                        if (!document.querySelector(`#sidebar-mk-${marker.data.train_data.train_number.replaceAll(' ','')}`)) {
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