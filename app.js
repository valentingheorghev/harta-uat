function norm(txt) {
  return txt
    .toString()
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// === HARTĂ ===
const map = L.map('map').setView([45.9, 24.9], 7);

let layerJudete;
let layerUAT;

const backBtn = document.getElementById('backBtn');

// === RESET ===
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
        color: '#000',
        weight: 1,
        fillColor: '#6fa8dc',
        fillOpacity: 0.85
      },

      onEachFeature: (feature, layer) => {

        // LABEL JUDEȚ (POATE IEȘI DIN POLIGON)
        layer.bindTooltip(feature.properties.UAT, {
  permanent: true,
  direction: 'top',     // NU center
  offset: [0, -8],      // MUTĂ UȘOR ÎN SUS
  className: 'label-uat',
  opacity: 1
});

        // HOVER
        layer.on('mouseover', () => {
          layer.setStyle({
            fillColor: '#3d85c6',
            weight: 2
          });
        });

        layer.on('mouseout', () => {
          layer.setStyle({
            fillColor: '#6fa8dc',
            weight: 1
          });
        });

        // CLICK
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

        // 🔴 FILTRARE STRICTĂ
        filter: f => norm(f.properties.Judet) === norm(judetSelectat),

        style: {
          color: '#000',
          weight: 0.7,
          fillColor: '#ffe599',
          fillOpacity: 0.85
        },

        onEachFeature: (feature, layer) => {

          // LABEL UAT – PERMANENT, POATE IEȘI DIN POLIGON
          layer.bindTooltip(feature.properties.UAT, {
            permanent: true,
            className: 'label-uat',
            opacity: 1
          });

          // HOVER
          layer.on('mouseover', () => {
            layer.setStyle({
              fillColor: '#f1c232',
              weight: 1.2
            });
          });

          layer.on('mouseout', () => {
            layer.setStyle({
              fillColor: '#ffe599',
              weight: 0.7
            });
          });

          // CLICK → URL
          layer.on('click', () => {
            if (feature.properties.URL) {
              window.open(feature.properties.URL, '_blank');
            }
          });
        }
      }).addTo(map);

      backBtn.style.display = 'block';
    });
}

