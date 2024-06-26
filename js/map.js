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
        style: 'https://tiles.derp.si/maps/streets-v2/style.json',
        center: [18,44.4110628],
        zoom: 7,
        minZoom: 5,
        maxZoom: 18,
        maxBounds: [
            [12, 40], // Southwest LngLat
            [24, 47]  // Northeast LngLat
        ],
        //        renderWorldCopies: false,
        maxPitch: 60,
        hash: true,
        trackResize: true,
    });

    map.addControl(new maplibregl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true
    }));

    map.addControl(new maplibregl.NavigationControl());

    map.on('load', function () {
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
        // get user language
        let language = navigator.language || navigator.userLanguage;
        console.log('jezik: ', language);
        if (language.split('-')[0] in VOCABULARY) {
            ACTIVE_VOCABULARY = VOCABULARY[language.split('-')[0]];
            document.cookie = `new_mapper_language_preference=${language.split('-')[0]}`;
        } else {
            ACTIVE_VOCABULARY = VOCABULARY.en;
            document.cookie = `new_mapper_language_preference=en`;
        }
    }

    SIDEBAR.open();

    // check if we have a cookie named 'new_mapper_disclaimer_shown'
    cookie = document.cookie.split(';').find(row => row.trim().startsWith('new_mapper_disclaimer_shown='));
    if (!cookie) {
        // show disclaimer
        document.cookie = `new_mapper_disclaimer_shown=${true}`;
        showDisclaimers();
    }
    
    // iterate over the VOCABULARY and create buttons for language selection, as div cards
    let language_divs = [];
    for (let language in VOCABULARY) {
        if (language == 'bs') continue; // skip english
        const $btn = document.createElement('button');
        $btn.classList.add('btn', 'btn-outline-primary', 'w-100');
        $btn.style = 'margin: 0.2rem';
        $btn.innerHTML = `<img src="${VOCABULARY[language].language_image}"/> ${VOCABULARY[language].language_name}`;
        $btn.addEventListener('click', () => {
            document.cookie = `new_mapper_language_preference=${language}`;
            ACTIVE_VOCABULARY = VOCABULARY[language];
            // refresh the sidebar
            SIDEBAR.close();
        });
        language_divs.push($btn);
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
    card_body.innerHTML = /*html*/`
        <p>${ACTIVE_VOCABULARY.hello_and_welcome}</p>
        <hr>
        <h6>${ACTIVE_VOCABULARY.select_language}</h6>
    `;
    
    for (let div of language_divs) {
        card_body.appendChild(div);
    }
    
    let text_div = document.createElement('div');
    text_div.innerHTML += /*html*/`<hr>
        <h6>${ACTIVE_VOCABULARY.other_services}</h6>
        <button class="btn btn-outline-primary w-100" style="margin: 0.2rem;" onclick="window.location.href = './hzArchive.html'">
            HŽ Archive
        </button>
        <hr>
        
        <h6>${ACTIVE_VOCABULARY.disclaimer}</h6>
        <button class="btn btn-outline-primary w-100" style="margin: 0.2rem;" onclick="showDisclaimers()">
            ${ACTIVE_VOCABULARY.read_more}
        </button>
        <hr>
        
        <button class="btn btn-outline-primary w-100" style="margin: 0.2rem;" onclick='window.location.href="mailto:info@vlak.si"'>
            ${ACTIVE_VOCABULARY.contact_us}
        </button>
        <hr>
        
        <h6>${ACTIVE_VOCABULARY.changelog}</h6>
        <code>${VOCABULARY['en'].changelog_details}</code>
    `;
        
    card_body.appendChild(text_div);
    
    card.appendChild(card_header);
    card.appendChild(card_body);
    sidebar.appendChild(card);


    hz();
    zs();
    zcg();
    sz();
    mk();
}

async function showDisclaimers() {
    // close sidebar
    SIDEBAR.close();
    // generate a modal, which will be shown immediately to the user
    let modal = document.createElement('div');
    modal.innerHTML = /*html*/`
        <div class="modal fade" id="disclaimerModal" tabindex="100" role="dialog" aria-labelledby="disclaimerModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="disclaimerModalLabel">${ACTIVE_VOCABULARY.disclaimer}</h5>
                        <button type="button" class="close btn" data-dismiss="modal" aria-label="Close" onclick="SIDEBAR.open()">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p>${ACTIVE_VOCABULARY.disclaimers.explanation}</p>
                        <hr>
                        <p>${ACTIVE_VOCABULARY.disclaimers.not_accurate_contact}</p>
                        <hr>
                        <p>${ACTIVE_VOCABULARY.disclaimers.cookies}</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" data-dismiss="modal" onclick="SIDEBAR.open()">${ACTIVE_VOCABULARY.close}</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    $('#disclaimerModal').modal('show');



}


// when window changes size
$(window).resize(function () {
    let height = $(document).height();
    $('#map').height(height);
});


function vagonweb_proxy(url) {
    return url.replace("https://www.vagonweb.cz/", "https://api.map.vlak.si/");
}

function showSidebar(options) {
    let sidebar = document.querySelector('[sidebarjs-container]');
    sidebar.innerHTML = options.content;

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

    return options;
}

// Common functions

function formatUICNumber(uic) {
    if (uic.length < 12) return uic;
    return `${uic.substr(0, 2)} ${uic.substr(2, 2)} <u>${uic.substr(0, 2) > 90 ? uic.substr(4, 4) : `${uic.substr(4, 2)}-${uic.substr(6, 2)}`}-${uic.substr(8, 3)}</u> ${uic.substr(11, 1)}`;
}
