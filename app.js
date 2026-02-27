// Inițializare hartă
const map = L.map('map').setView([45.9, 24.9], 7);

let layerJudete;
let layerUAT;

const backBtn = document.getElementById('backBtn');

// === RESET LA JUDEȚE ===
backBtn.onclick = () => {
  if (layerUAT) map.removeLayer(layerUAT);
  if (layerJudete) layerJudete.addTo(map);
  map.setView([45.9, 24.9], 7);
  backBtn.style.display = 'none';
};

// === JUDEȚE ===
fetch('judete.geojson')
  .then(r => r.json())
  .then(data => {

    layerJudete = L.geoJSON(data, {
      style: {
        color: '#fff',          // CONTUR ALB
        weight: 1.2,
        fillColor: '#6fa8dc',
        fillOpacity: 0.85
      },

      onEachFeature: (feature, layer) => {

        // LABEL JUDEȚ
        layer.bindTooltip(feature.properties.Judet, {
          permanent: true,
          direction: 'center',
          className: 'label-judet'
        });

        // HOVER ANIMAT
        layer.on('mouseover', () => {
          layer.setStyle({
            fillOpacity: 1,
            weight: 2
          });
        });

        layer.on('mouseout', () => {
          layer.setStyle({
            fillOpacity: 0.85,
            weight: 1.2
          });
        });

        // CLICK JUDEȚ
        layer.on('click', () => {
          map.fitBounds(layer.getBounds(), { padding: [20, 20] });
          afiseazaUAT(feature.properties.Judet);
        });
      }
    }).addTo(map);
  });

// === UAT ===
function afiseazaUAT(judetSelectat) {

  if (layerJudete) map.removeLayer(layerJudete);
  if (layerUAT) map.removeLayer(layerUAT);

  fetch('uat.geojson')
    .then(r => r.json())
    .then(data => {

      layerUAT = L.geoJSON(data, {
        filter: f => f.properties.Judet === judetSelectat,

        style: {
          color: '#fff',       // CONTUR ALB
          weight: 0.7,
          fillColor: '#ffe599',
          fillOpacity: 0.85
        },

        onEachFeature: (feature, layer) => {

          // LABEL UAT (inițial ascuns)
          const tooltip = layer.bindTooltip(feature.properties.UAT, {
            permanent: true,
            direction: 'center',
            className: 'label-uat'
          });

          tooltip.remove(); // ASCUNS LA ZOOM MIC

          // HOVER
          layer.on('mouseover', () => {
            layer.setStyle({
              fillOpacity: 1,
              weight: 1.2
            });
          });

          layer.on('mouseout', () => {
            layer.setStyle({
              fillOpacity: 0.85,
              weight: 0.7
            });
          });

          // CLICK → URL
          layer.on('click', () => {
            window.location.href = feature.properties.URL;
          });

          // ZOOMEND → afișăm label doar la zoom mare
          map.on('zoomend', () => {
            if (map.getZoom() >= 9) {
              tooltip.addTo(map);
            } else {
              tooltip.remove();
            }
          });
        }
      }).addTo(map);

      backBtn.style.display = 'block';
    });
}
