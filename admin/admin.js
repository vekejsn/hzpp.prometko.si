var map = L.map('map', { zoomControl: false }).setView([44.4110628,16.5184112], 8);
L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
      maxZoom: 19,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery ÂŠ <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox/streets-v9',
      tileSize: 512, detectRetina: true,
      zoomOffset: -1
    }).addTo(map);

let polylineLayer = L.layerGroup().addTo(map);
let helperPolylineLayer = L.layerGroup().addTo(polylineLayer);

window.onload = async () => {
    // fetch localhost:4242/geometry/list
    let data = await fetch('http://localhost:4242/geometry/list').then(res => res.json()).then(res => res.data);
    let stops = await fetch('http://localhost:4242/stops').then(res => res.json()).then(res => res.data);
    for (let h of data) {
        // find names of from and to stops in data
        let from = stops.find(s => s.stop_id == h.from);
        let to = stops.find(s => s.stop_id == h.to);
        // add selection to dropdown
        let option = document.createElement('option');
        option.value = `${from.stop_id}-${to.stop_id}`;
        option.geometry = h.geometry;
        option.from = from;
        option.to = to;
        option.innerText = `${from.stop_name} - ${to.stop_name}`;
        console.log(option.value)
        document.getElementById('segment').appendChild(option);
        // when selected, show the segment on the map
    }
    // read from cookie whatt option was selected
    // add event listener to dropdown
    segment.addEventListener('change', async (e) => {
        // write to cookie what option was selected
        document.cookie = `segment=${e.target.value}`;
        
        let id = segment.options[segment.selectedIndex].geometry;
        console.log(id);
        polylineLayer.clearLayers();
        helperPolylineLayer.clearLayers();
        let polyline = L.polyline.antPath(id, {"delay": 4000, color: 'blue', weight: 3, opacity: 1 }).addTo(polylineLayer);
        // add markers for from and to stops
        let from = L.marker([segment.options[segment.selectedIndex].from.stop_lat, segment.options[segment.selectedIndex].from.stop_lon]).addTo(polylineLayer);
        let to = L.marker([segment.options[segment.selectedIndex].to.stop_lat, segment.options[segment.selectedIndex].to.stop_lon]).addTo(polylineLayer);
        let segmentdiv = document.getElementById('segmentdiv');
        segmentdiv.innerHTML = `<b>MERGE MULTIPLE OTHER SEGMENTS</b><hr>`
        segmentdiv.innerHTML = `from: ${segment.options[segment.selectedIndex].from.stop_id} to: ${segment.options[segment.selectedIndex].to.stop_id}<br>`
        // create a dropdown with all segments
        let select = document.createElement('select');
        select.id = 'segmentseditor';
        for (let h of data) {
            let option = document.createElement('option');
            let from = stops.find(s => s.stop_id == h.from);
            let to = stops.find(s => s.stop_id == h.to);
            option.value = h.id;
            option.geometry = h.geometry;
            option.from = from;
            option.to = to;
            option.innerText = `${from.stop_name} - ${to.stop_name}`;
            select.appendChild(option);
        }
        segmentdiv.appendChild(select);
        select.addEventListener('change', async (e) => {
            let id = select.options[select.selectedIndex].geometry;
            console.log(id);
            helperPolylineLayer.clearLayers();
            let polyline = L.polyline.antPath(id, {"delay": 4000, color: 'red', weight: 3, opacity: 1 }).addTo(helperPolylineLayer);
            // add markers for from and to stops
            let from = L.marker([select.options[select.selectedIndex].from.stop_lat, select.options[select.selectedIndex].from.stop_lon]).addTo(helperPolylineLayer);
            let to = L.marker([select.options[select.selectedIndex].to.stop_lat, select.options[select.selectedIndex].to.stop_lon]).addTo(helperPolylineLayer);
            helperPolylineLayer.addTo(polylineLayer);
        });
        // add button to reverse section
        let reverse = document.createElement('button');
        reverse.innerText = 'reverse';
        segmentdiv.appendChild(reverse);
        // add a button to merge the selected segments
        let button = document.createElement('button');
        button.innerText = 'Merge';
        let mergedDiv = document.createElement('div');
        mergedDiv.id = 'mergeddiv';
        mergedDiv.style = 'background-color: white';
        segmentdiv.appendChild(button);
        segmentdiv.appendChild(mergedDiv);
        let codeArea = document.createElement('textarea');
        codeArea.id = 'codearea';
        codeArea.style = 'width: 100%; height: 100px';
        segmentdiv.appendChild(codeArea);
        let coordinates = [];
        button.addEventListener('click', async (e) => {
            // get the selected segment name
            let selected = select.options[select.selectedIndex].value;
            // add to mergedDiv
            let mergedDiv = document.getElementById('mergeddiv');
            mergedDiv.innerHTML += `<b>${select.options[select.selectedIndex].innerText}</b><br>`;
            // show the polyline as green and add to polylineLayer
            let id = select.options[select.selectedIndex].geometry;
            let polyline = L.polyline.antPath(id, {"delay": 4000, color: 'green', weight: 3, opacity: 1 }).addTo(polylineLayer);
            coordinates = coordinates.concat(id); 
            // write json to codeArea
            let codeArea = document.getElementById('codearea');
            codeArea.value = JSON.stringify(coordinates);

        });
        reverse.addEventListener('click', async (e) => {
            let id = document.getElementById('segment').options[select.selectedIndex].geometry;
            console.log(id);
            helperPolylineLayer.clearLayers();
            // reverse id
            id = id.reverse();
            let polyline = L.polyline.antPath(id, {"delay": 4000, color: 'red', weight: 3, opacity: 1 }).addTo(helperPolylineLayer);
            // write to codeArea
            let codeArea = document.getElementById('codearea');
            codeArea.value = JSON.stringify(id);
        });
        // center map on polyline
    });
    let cookie = document.cookie.split(';').find(c => c.startsWith('segment='));
    console.log(cookie);
    if (cookie) {
        let id = cookie.split('=')[1];
        // find option with from.stop_id = id.split('-')[0] and to.stop_id = id.split('-')[1]
        let option = document.getElementById('segment').querySelector(`option[value="${id}"]`);
        // select option
        option.selected = true;
        segment.dispatchEvent(new Event('change'));
    }
}