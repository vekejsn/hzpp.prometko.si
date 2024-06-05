let ZcgMarkers = [];


async function returnZcgMarker(number, delay) {
    let div = document.createElement("div");
    div.className = 'icon';
    let divicon = document.createElement("div");
    divicon.className = "zcgIcon";
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

async function zcg() {
    while (true) {
        try {
            let vehicles = await fetch('https://api.map.vlak.si/ME/zcg/trips/active', {
                credentials: 'include'
            }).then(res => res.json()).then(res => res.data);
            vehicles.forEach(async vehicle => {
                let marker = ZcgMarkers.find(m => m.id == vehicle.train_data.train_id);
                if (!marker) {
                    marker = new maplibregl.Marker({
                        color: '#ff0000',
                        element: await returnZcgMarker(vehicle.train_data.train_number, 0)
                    });
                    ZcgMarkers.push(marker);
                    marker.setLngLat([vehicle.coordinates.lng, vehicle.coordinates.lat]);
                    marker.addTo(map);
                } else {
                    let k = await returnZcgMarker(vehicle.train_data.train_number, 0);
                    marker.getElement().innerHTML = k.innerHTML;
                    marker.setLngLat([vehicle.coordinates.lng, vehicle.coordinates.lat]);
                }
                marker.id = vehicle.train_data.train_id;
                marker.data = vehicle;
                marker.getElement().addEventListener('click', async () => {
                    while (true) {
                        console.log(marker.data);
                        const $scheduleTable = zcg_makeScheduleTable(marker);
                        
                        showSidebar({
                            content: /*html*/`
                            <div class="sidebar-inner" id="sidebar-Zcg-${marker.data.train_data.train_number}">
                                <div class="sidebar-header">
                                    <h5>${marker.data.train_data.train_number}</h5>
                                    <span>${marker.data.train_data.train_name}</span>
                                </div>
                                <div class="sidebar-body">
                                    <span><b>${ACTIVE_VOCABULARY.operator}</b>: <img src="img/logos/zcg.svg" style="height:1rem"/> ZCG Prevoz</span>
                                    <hr class="no-padding no-margin">
                                    <span><b>${ACTIVE_VOCABULARY.schedule}</b></span><br>
                                    ${$scheduleTable.outerHTML}
                                    ${ACTIVE_VOCABULARY.static_data}
                                    <small class="really-small"><hr>${ACTIVE_VOCABULARY.disclaimers.not_accurate}</small>
                                </div>
                            </div>`
                        });
                        
                        await delay(5000);
                        if (!document.querySelector(`#sidebar-Zcg-${marker.data.train_data.train_number}`)) {
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

function zcg_makeScheduleTable(marker) {
    let scheduleTable = document.createElement('table');
    scheduleTable.className = 'table table-sm';
    scheduleTable.style.width = '100%';
    for (let i = 0; i < marker.data.train_data.train_times.length; i++) {
        let stopTime = marker.data.train_data.train_times[i];
        let row = document.createElement('tr');
        let td1 = document.createElement('td');
        let td2 = document.createElement('td');
        let arrival_time = luxon.DateTime.fromFormat(stopTime.arrival_time ? stopTime.arrival_time : "00:00", 'H:m:s').setZone('Europe/Ljubljana');
        let departure_time = luxon.DateTime.fromFormat(stopTime.departure_time ? stopTime.departure_time : "00:00", 'H:m:s').setZone('Europe/Ljubljana');
        let is_in_stop = false;
        console.log(arrival_time, departure_time);
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
                                         ${i != marker.data.train_data.train_times.length - 1 ? `${i != 0 ? "<br>" : ""}<i class="bi bi-box-arrow-left"></i> ${departure_time}` : ''}`;
        td2.innerHTML = `${stopTime.stop_name} ${is_in_stop ? `<br><small>(${ACTIVE_VOCABULARY.in_stop})</small>` : ""}`;
        row.appendChild(td1);
        row.appendChild(td2);
        scheduleTable.appendChild(row);
    }
    return scheduleTable;
}
