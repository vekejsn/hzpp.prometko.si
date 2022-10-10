const delay = ms => new Promise(res => setTimeout(res, ms));

var map = {};

window.onload = async () => {
    await delay(1000);
    let height = await $(document).height();
    await $('#map').height(height);

    map = new maplibregl.Map({
        container: 'map',
        style: 'https://api.maptiler.com/maps/pastel/style.json?key=8tDQz5wMQ3NjP4jqmQSN',
        center: [18,44.4110628],
        zoom: 7,
        //        minZoom: 6,
        //        renderWorldCopies: false,
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

    }); // end: load


    fetchLppMarkers();
}

// when window changes size
$(window).resize(function () {
    let height = $(document).height();
    $('#map').height(height);
});