// ================== UTILS ==================
function norm(txt) {
  return txt
    .toString()
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ================== HARTĂ ==================
const map = L.map('map').setView([45.9, 24.9], 7);

let layerJudete = null;
let layerUAT = null;
let uatLabels = [];

const backBtn = document.getElementById('backBtn');

// ================== RESET ==================
backBtn.onclick = () => {
  if (layerUAT) map.removeLayer(layerUAT);
  uatLabels.forEach(l => map.removeLayer(l));
  uatLabels = [];

  if (layerJudete) layerJudete.addTo(map);

  map.setView([45.9, 24.9], 7);
  backBtn.style.display = 'none';
};

// ================== JUDEȚE ==================
fetch('judete.geojson')
  .then(r => r.json())
  .then(data => {

    layerJudete = L.geoJSON(data, {
      style: {
        color: '#ffffff',
        weight: 1.2,
        fillColor: '#6fa8dc',
        fillOpacity: 0.9
      },

      onEachFeature: (feature, layer) => {

        // LABEL JUDEȚ (CENTRU REAL)
        layer.bindTooltip(feature.properties.Judet, {
          permanent: true,
          direction: 'center',
          className: 'label-judet'
        });

        // HOVER
        layer.on('mouseover', () => {
          layer.setStyle({ fillColor: '#3d85c6', weight: 2 });
        });

        layer.on('mouseout', () => {
          layer.setStyle({ fillColor: '#6fa8dc', weight: 1.2 });
        });

        // CLICK
        layer.on('click', () => {
          map.fitBounds(layer.getBounds(), { padding: [20, 20] });
          afiseazaUAT(feature.properties.Judet);
        });
      }
    }).addTo(map);
  });

// ================== UAT ==================
function afiseazaUAT(judetSelectat) {

  if (layerJudete) map.removeLayer(layerJudete);
  if (layerUAT) map.removeLayer(layerUAT);

  fetch('uat.geojson')
    .then(r => r.json())
    .then(data => {

      layerUAT = L.geoJSON(data, {
        filter: f => norm(f.properties.Judet) === norm(judetSelectat),

        style: {
          color: '#000',
          weight: 0.8,
          fillColor: '#ffe599',
          fillOpacity: 0.9
        },

        onEachFeature: (feature, layer) => {

          // ============================
          // POLYLABEL – punct interior
          // ============================
          let coords = feature.geometry.coordinates;

          // normalizare GeoJSON → polylabel
          if (feature.geometry.type === 'MultiPolygon') {
            coords = coords[0];
          }

          const [x, y] = polylabel(coords, 1.0);
          const labelLatLng = L.latLng(y, x);

          const label = L.tooltip({
            permanent: true,
            direction: 'center',
            className: 'label-uat'
          })
          .setContent(feature.properties.UAT)
          .setLatLng(labelLatLng)
          .addTo(map);

          // ============================
          // HOVER
          // ============================
          layer.on('mouseover', () => {
            layer.setStyle({
              fillColor: '#f1c232',
              weight: 1.2
            });
            label.getElement()?.classList.add('label-hover');
          });

          layer.on('mouseout', () => {
            layer.setStyle({
              fillColor: '#ffe599',
              weight: 0.8
            });
            label.getElement()?.classList.remove('label-hover');
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

// ================== LOGICĂ LABEL UAT ==================
function updateUATLabels() {
  const zoom = map.getZoom();

  uatLabels.forEach(label => {
    const px = map.latLngToContainerPoint(label.getLatLng());

    // criteriu simplu: zoom + poziție în ecran
    if (zoom >= 9 && px.x > 0 && px.y > 0) {
      if (!map.hasLayer(label)) label.addTo(map);
    } else {
      if (map.hasLayer(label)) map.removeLayer(label);
    }
  });
}

