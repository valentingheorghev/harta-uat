// 1. Inițializăm harta
const map = L.map('map').setView([45.9, 24.9], 7);

// 2. Variabilă pentru layer
let layerJudete;

// 3. Încărcăm GeoJSON-ul cu județe
fetch('judete.geojson')
  .then(r => r.json())
  .then(data => {

    layerJudete = L.geoJSON(data, {
      style: {
        color: '#444',
        weight: 1,
        fillColor: '#9ecae1',
        fillOpacity: 0.7
      },
      onEachFeature: (feature, layer) => {

        // La click pe județ (DOAR afișăm numele)
        layer.on('click', () => {
          alert(feature.properties.Judet);
        });

      }
    }).addTo(map);

  });
