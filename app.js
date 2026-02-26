// 1) Inițializăm harta
const map = L.map('map').setView([45.9, 24.9], 7);

// 2) Grup pentru UAT-uri (ușor de golit la fiecare click)
const layerUAT = L.featureGroup().addTo(map);

// 3) Ținem datele în memorie
let judeteData = null;
let uatData = null;

// 4) Setează aici numele câmpurilor DUPĂ ce te uiți în console.log
const JUDET_FIELD_JUDETE = 'Judet'; // ex: 'Judet'
const JUDET_FIELD_UAT    = 'Judet'; // ex: 'Judet' sau altceva
const URL_FIELD_UAT      = 'url';   // ex: 'url' (dacă nu există, vezi mai jos)

function normalize(v) {
  return (v ?? '').toString().trim().toUpperCase();
}

// 5) Încarcă ambele GeoJSON-uri
Promise.all([
  fetch('./judete.geojson').then(r => r.json()),
  fetch('./uat.geojson').then(r => r.json())
]).then(([jData, uData]) => {
  judeteData = jData;
  uatData = uData;

  // PAS IMPORTANT: vezi ce câmpuri ai în proprietăți
  console.log('Judete keys:', Object.keys(judeteData.features[0].properties));
  console.log('UAT keys:', Object.keys(uatData.features[0].properties));

  // 6) Desenăm județele
  L.geoJSON(judeteData, {
    style: {
      color: '#444',
      weight: 1,
      fillColor: '#9ecae1',
      fillOpacity: 0.7
    },
    onEachFeature: (feature, layer) => {
      layer.on('click', () => {
        const judet = normalize(feature.properties[JUDET_FIELD_JUDETE]);
        showUATForJudet(judet);
      });
    }
  }).addTo(map);
});

function showUATForJudet(judetNormalized) {
  // 7) Ștergem UAT-urile vechi
  layerUAT.clearLayers();

  // 8) Adăugăm doar UAT-urile din județul selectat (filtru)
  const uatLayer = L.geoJSON(uatData, {
    filter: (f) => normalize(f.properties[JUDET_FIELD_UAT]) === judetNormalized,
    style: {
      color: '#d94801',
      weight: 1,
      fillColor: '#fd8d3c',
      fillOpacity: 0.6
    },
    onEachFeature: (f, l) => {
      l.on('click', () => {
        const url = f.properties?.[URL_FIELD_UAT];

        if (url) {
          window.open(url, '_blank');
        } else {
          alert(`Nu am URL în câmpul "${URL_FIELD_UAT}". Verifică proprietățile UAT în console.`);
        }
      });
    }
  });

  layerUAT.addLayer(uatLayer);

  // 9) Zoom pe UAT-urile filtrate (dacă există)
  if (layerUAT.getLayers().length > 0) {
    map.fitBounds(layerUAT.getBounds(), { padding: [10, 10] });
  } else {
    alert('Nu am găsit UAT-uri pentru județul selectat (verifică numele câmpului de județ în uat.geojson).');
  }
}
