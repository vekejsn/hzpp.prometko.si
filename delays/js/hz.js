DEBUG = true;
let BASE_URL = DEBUG ? 'https://api.hzpp.prometko.si' : 'https://api.hzpp.prometko.si';

let doStuff = async () => {
    // fetch the data
    let response = await fetch(`${BASE_URL}/v1/delays`).then(response => response.json());
    let div = document.getElementById("data");
    response.data = response.data.sort((a, b) => a.train_number - b.train_number);
    for (let delay of response.data) {
        // check if we can find this item already
        let item = document.getElementById(`${delay.train_number}`);
        if (item) {
            // update the delay
            item.children[0].children[1].innerHTML = `+${delay.delay}min`;
            // update the details
            item.children[1].innerHTML = `🇭🇷 ${delay.text_hr}<br><br>🇬🇧 ${delay.text_en}<hr>Ažurirano | Updated ${new Date(delay.action_timestamp).toLocaleString('hr-HR')}`;
        } else {
            let details = document.createElement("details");
            let summary = document.createElement("summary");
            details.id = delay.train_number;
            summary.className = "summary-senca"
            summary.innerHTML = `<div><b>${delay.train_number}</b> ${delay.train_name}</div> <div class="delay">+${delay.delay}min</div>`;
            details.appendChild(summary);
            let p = document.createElement("p");
            p.innerHTML = `🇭🇷 ${delay.text_hr}<br><br>🇬🇧 ${delay.text_en}<hr>Ažurirano | Updated ${new Date(delay.action_timestamp).toLocaleString('hr-HR')}`;
            p.className = "details-senca";
            let info_div = document.createElement("div");
            info_div.className = 'details-senca';
            details.appendChild(p);
            div.appendChild(details);
            details.appendChild(info_div);
            details.addEventListener('click', async () => {
                if (!details.open) {
                    console.log('hhh')
                    info_div.innerHTML = "Učitavam... | Loading...";
                    let route = await fetch(`${BASE_URL}/v1/routes/${delay.train_number}/stops`).then(response => response.json());
                    let delays = await fetch(`${BASE_URL}/v1/routes/${delay.train_number}/delays/${delay.train_timestamp.split('T')[0]}`).then(response => response.json());
                    let stops = route.data;
                    delays = delays.data;
                    let html = "";
                    let table = document.createElement("table");
                    let thr = document.createElement("tr");
                    let th1 = document.createElement("th");
                    let th2 = document.createElement("th");
                    let th3 = document.createElement("th");
                    th1.innerHTML = "Stanica | Station";
                    th2.innerHTML = "Vrijeme | Time";
                    th3.innerHTML = "Kašnjenje | Delay";
                    thr.appendChild(th1);
                    thr.appendChild(th2);
                    thr.appendChild(th3);
                    table.appendChild(thr);
                    table.className = "table-senca";
                    console.log(delays);
                    for (let stop of stops) {
                        let tr = document.createElement("tr");
                        let td1 = document.createElement("td");
                        let td2 = document.createElement("td");
                        let td3 = document.createElement("td");
                        td1.innerHTML = `<b>${stop.station_name}</b>`;
                        td2.innerHTML = `${stop.arrival_time ? 'D: ' + stop.arrival_time : ''}${stop.arrival_time && stop.departure_time ? '<br>' : ''}${stop.departure_time ? 'O: ' + stop.departure_time : ''}`;
                        let delay = await delays.find(d => d.station_code == stop.station_code);
                        if (delay) {
                            td3.innerHTML = `${delay.status}: +${delay.delay}min`;
                            td3.className = "delay";
                        }
                        if (stop.is_stop == 0) tr.className = "not-stop";
                        tr.appendChild(td1);
                        tr.appendChild(td2);
                        tr.appendChild(td3);
                        table.appendChild(tr);
                    }
                    info_div.innerHTML = table.outerHTML;
                } else {
                    info_div.innerHTML = "";
                }
            })
        }
        // reorganize the items
        let items = document.getElementById("data").children;
        let itemsArr = [];
        for (let i in items) {
            if (items[i].nodeType == 1) { // get rid of the whitespace text nodes
                itemsArr.push(items[i]);
            }
        }
        itemsArr.sort((a, b) => a.id - b.id);
        for (let i of itemsArr) {
            div.appendChild(i);
        }
        
    }
    // update the update in time every second
    let update = document.getElementById("time");
    let next_update = new Date(response.updates.next_update).getTime();
    let update_time = async () => {
        while (true) {
            let now = new Date().getTime();
            let diff = parseInt((next_update - now) / 1000);
            update.innerHTML = `${diff}`;
            if (diff < 0) {
                doStuff();
                break;
            } else {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
    update_time();
}

window.onload = doStuff;
