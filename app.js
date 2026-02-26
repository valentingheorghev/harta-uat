// 1. Inițializăm harta
const map = L.map('map').setView([45.9, 24.9], 7);

// Variabile layer
let layerJudete;
let layerUAT;

const backBtn = document.getElementById('backBtn');

// Reset la județe
backBtn.onclick = () => {
  if (layerUAT) map.removeLayer(layerUAT);
  if (layerJudete) layerJudete.addTo(map);
  map.setView([45.9, 24.9], 7);
  backBtn.style.display = 'none';
};

// 2. Încărcăm GeoJSON județe
fetch('judete.geojson')
  .then(r => r.json())
  .then(data => {

    layerJudete = L.geoJSON(data, {

      style: {
        color: '#333',
        weight: 1,
        fillColor: '#7fbfff',
        fillOpacity: 0.7
      },

      onEachFeature: (feature, layer) => {

        // tooltip discret
        layer.bindTooltip(feature.properties.Judet, { sticky: true });

        // hover highlight
        layer.on('mouseover', () => {
          layer.setStyle({ fillOpacity: 0.9 });
        });

        layer.on('mouseout', () => {
          layer.setStyle({ fillOpacity: 0.7 });
        });

        // click județ
        layer.on('click', () => {
          map.fitBounds(layer.getBounds());
          afiseazaUAT(feature.properties.Judet);
        });

      }

    }).addTo(map);

  });

function afiseazaUAT(judetSelectat) {

  if (layerJudete) map.removeLayer(layerJudete);
  if (layerUAT) map.removeLayer(layerUAT);

  fetch('uat.geojson')
    .then(r => r.json())
    .then(data => {

      layerUAT = L.geoJSON(data, {

        filter: f => f.properties.Judet === judetSelectat,

        style: {
          color: '#666',
          weight: 0.6,
          fillColor: '#ffd699',
          fillOpacity: 0.75
        },

        onEachFeature: (feature, layer) => {

          // tooltip UAT
          layer.bindTooltip(feature.properties.UAT, { sticky: true });

          // hover
          layer.on('mouseover', () => {
            layer.setStyle({ fillOpacity: 0.95 });
          });

          layer.on('mouseout', () => {
            layer.setStyle({ fillOpacity: 0.75 });
          });

          // click UAT → redirect
          layer.on('click', () => {
            window.location.href = feature.properties.URL;
          });

        }

      }).addTo(map);

      backBtn.style.display = 'block';

    });

}
