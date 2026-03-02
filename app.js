// ================== UTILS ==================
function norm(txt) {
  return txt
    .toString()
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ================== MAP ==================
const map = L.map('map').setView([45.9, 24.9], 7);

// TILE LAYER – OBLIGATORIU (dacă lipsește, ai hartă „moartă”)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

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
        weight: 1.3,
        fillColor: '#6fa8dc',
        fillOpacity: 0.9
      },

      onEachFeature: (feature, layer) => {

        layer.bindTooltip(feature.properties.Judet, {
          permanent: true,
          direction: 'center',
          className: 'label-judet'
        });

        layer.on('mouseover', () => {
          layer.setStyle({ fillColor: '#3d85c6' });
        });

        layer.on('mouseout', () => {
          layer.setStyle({ fillColor: '#6fa8dc' });
        });

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

  uatLabels.forEach(l => map.removeLayer(l));
  uatLabels = [];

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

          let labelLatLng;

          // ================== POLYLABEL (SAFE) ==================
          try {
            let rings = null;

            if (feature.geometry.type === 'Polygon') {
              rings = feature.geometry.coordinates;
            } else if (feature.geometry.type === 'MultiPolygon') {
              rings = feature.geometry.coordinates[0];
            }

            if (rings) {
              const [x, y] = polylabel(rings, 1.0);
              labelLatLng = L.latLng(y, x);
            }
          } catch (e) {
            console.warn('polylabel failed:', feature.properties.UAT);
          }

          // ================== FALLBACK SIGUR ==================
          if (!labelLatLng) {
            labelLatLng = layer.getBounds().getCenter();
          }

          const label = L.tooltip({
            permanent: true,
            direction: 'center',
            className: 'label-uat'
          })
            .setContent(feature.properties.UAT)
            .setLatLng(labelLatLng)
            .addTo(map);

          uatLabels.push(label);

          // ================== HOVER ==================
          layer.on('mouseover', () => {
            layer.setStyle({ fillColor: '#f1c232' });
            label.getElement()?.classList.add('label-hover');
          });

          layer.on('mouseout', () => {
            layer.setStyle({ fillColor: '#ffe599' });
            label.getElement()?.classList.remove('label-hover');
          });

          // ================== CLICK ==================
          layer.on('click', () => {
            if (feature.properties.URL) {
              window.open(feature.properties.URL, '_blank');
            }
          });
        }
      }).addTo(map);

      // 🔴 ASTA ACUM SE EXECUTĂ SIGUR
      backBtn.style.display = 'block';
    });
}
