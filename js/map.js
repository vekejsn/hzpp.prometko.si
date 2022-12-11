const delay = ms => new Promise(res => setTimeout(res, ms));

var map = {};
var VOCABULARY = {};
var SIDEBAR = {};
var ACTIVE_VOCABULARY = {};
var TRAIN_COMPOSITIONS = [];
var TRAIN_UIC_IMAGES = [];

window.onload = async () => {
    let height = await $(document).height();
    await $('#map').height(height);

    map = new maplibregl.Map({
        container: 'map',
        style: 'https://api.maptiler.com/maps/streets/style.json?key=PtSBTvQseHPGGgEr1awG',
        center: [18,44.4110628],
        zoom: 7,
        minZoom: 5,
        maxZoom: 18,
        maxBounds: [
            [12, 42], // Southwest LngLat
            [24, 47]  // Northeast LngLat
        ],
        //        renderWorldCopies: false,
        maxPitch: 60,
        hash: true,
        trackResize: true,
    });

    /*for (let provider in PROVIDERS) {
        map.loadImage(`assets/marker/optimized/${provider}.png`, function (error, image) {
            if (error) throw error;
            if (!map.hasImage(provider)) map.addImage(provider, image);
        });
    }*/

    map.addControl(new maplibregl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true
    }));

    map.addControl(new maplibregl.NavigationControl());

    map.on('load', function () {
        //
        // 3D buildings
        //

        // Insert the layer beneath any symbol layer.
        var layers = map.getStyle().layers;

        var labelLayerId;
        for (var i = 0; i < layers.length; i++) {
            if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
                labelLayerId = layers[i].id;
                break;
            }
        }


        map.addLayer(
            {
                'id': '3d-buildings',
                'source': 'openmaptiles',
                'source-layer': 'building',
                'filter': ['==', 'extrude', 'true'],
                'type': 'fill-extrusion',
                'minzoom': 15,
                'paint': {
                    'fill-extrusion-color': '#aaa',
    
                    // use an 'interpolate' expression to add a smooth transition effect to the
                    // buildings as the user zooms in
                    'fill-extrusion-height': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        15,
                        0,
                        15.05,
                        ['get', 'height']
                    ],
                    'fill-extrusion-base': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        15,
                        0,
                        15.05,
                        ['get', 'min_height']
                    ],
                    'fill-extrusion-opacity': 0.6
                }
            },
            labelLayerId
        );

        // custom rail styling:
        for (var i = 0; i < layers.length; i++) {
            if (layers[i].type === 'line' && layers[i].id.endsWith('major_rail')) {
                map.setPaintProperty(layers[i].id, 'line-color', '#333333');
                map.setPaintProperty(layers[i].id, 'line-width', 3);
            }
        }

    }); // end: load
    // get vocabulary
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
    // check if we have a cookie called 'new_mapper_language_preference'
    let cookie = document.cookie.split(';').find(row => row.trim().startsWith('new_mapper_language_preference='));
    if (cookie) {
        let language = cookie.split('=')[1];
        if (language in VOCABULARY) {
            ACTIVE_VOCABULARY = VOCABULARY[language];
        }
    } else {
        // prompt user to choose language
        document.cookie = `new_mapper_language_preference=${'en'}`;
    }
    SIDEBAR.open();
    // iterate over the VOCABULARY and create buttons for language selection, as div cards
    let language_divs = [];
    for (let language in VOCABULARY) {
        if (language == 'bs') continue; // skip english
        let div = document.createElement('button');
        div.classList.add('btn', 'btn-outline-primary');
        div.style = 'cursor: pointer; text-align:center; width: 100%; margin:.2rem;';
        div.innerHTML = `<img src="${VOCABULARY[language].language_image}"/> ${VOCABULARY[language].language_name}`;
        div.addEventListener('click', () => {
            document.cookie = `new_mapper_language_preference=${language}`;
            ACTIVE_VOCABULARY = VOCABULARY[language];
            // refresh the sidebar
            SIDEBAR.close();
        });
        language_divs.push(div);
    }

    let sidebar = document.querySelector('[sidebarjs-container]');
    let card = document.createElement('div');
    card.style = "border-radius: 0; border: 0;";
    card.classList.add('card');
    let card_header = document.createElement('div');
    card_header.classList.add('card-header', 'text-center', 'font-weight-bold', 'bg-primary', 'text-white');
    card_header.style = "border-radius: 0; border: 0;";
    card_header.innerHTML = `<h5>Mapper</h5>`;
    let card_body = document.createElement('div');
    card_body.classList.add('card-body');
    card_body.innerHTML = `<p>${ACTIVE_VOCABULARY.hello_and_welcome}</p>
                            <hr>
                            <h6>${ACTIVE_VOCABULARY.select_language}</h6>`;
    for (let div of language_divs) {
        card_body.appendChild(div);
    }
    let text_div = document.createElement('div');
    text_div.innerHTML += `<hr>
    <h6>${ACTIVE_VOCABULARY.other_services}</h6>
    <button class="btn btn-outline-primary" style="cursor: pointer; text-align: center; width: 100%; margin: 0.2rem;" onclick="window.location.href = './hzArchive.html'">
    HŽ Archive
    </button>
    <hr>
    <h6>${ACTIVE_VOCABULARY.disclaimer}</h6>
    <button class="btn btn-outline-primary" style="cursor: pointer; text-align: center; width: 100%; margin: 0.2rem;" onclick="showDisclaimers()">
    ${ACTIVE_VOCABULARY.read_more}
    </button>
    <hr>
    <button class="btn btn-outline-primary" style="cursor: pointer; text-align: center; width: 100%; margin: 0.2rem;" onclick='window.location.href="mailto:info@vlak.si"'>
    ${ACTIVE_VOCABULARY.contact_us}
    </button>
    <hr>
    <h6>${ACTIVE_VOCABULARY.changelog}</h6>
    <code>${VOCABULARY['en'].changelog_details}</code>`;
    card_body.appendChild(text_div);
    
    card.appendChild(card_header);
    card.appendChild(card_body);
    sidebar.appendChild(card);


    hz();
    zs();
    zcg();
    sz();
}

async function showDisclaimers() {
    // close sidebar
    SIDEBAR.close();
    // generate a modal, which will be shown immediately to the user
    let modal = document.createElement('div');
    modal.innerHTML = `<div class="modal fade" id="disclaimerModal" tabindex="100" role="dialog" aria-labelledby="disclaimerModalLabel" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title" id="disclaimerModalLabel">${ACTIVE_VOCABULARY.disclaimer}</h5>
                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close" onclick="SIDEBAR.open()">
                                        <span aria-hidden="true">&times;</span>
                                    </button>
                                </div>
                                <div class="modal-body">
                                    <p>${ACTIVE_VOCABULARY.disclaimers.explanation}</p>
                                    <hr>
                                    <p>${ACTIVE_VOCABULARY.disclaimers.not_accurate_contact}</p>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-primary" data-dismiss="modal" onclick="SIDEBAR.open()">${ACTIVE_VOCABULARY.close}</button>
                                </div>
                            </div>
                        </div>
                    </div>`;
    document.body.appendChild(modal);
    
    $('#disclaimerModal').modal('show');



}


// when window changes size
$(window).resize(function () {
    let height = $(document).height();
    $('#map').height(height);
});