// ================== UTILS ==================
function norm(txt) {
  return txt.toString().trim().toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function formatUATName(name) {
  if (!name) return '';
  if (name.length <= 10) return name;
  var mid = Math.floor(name.length / 2);
  var left = name.lastIndexOf(' ', mid);
  var right = name.indexOf(' ', mid);
  var splitAt = -1;
  if (left === -1 && right === -1) return name;
  if (left === -1) splitAt = right;
  else if (right === -1) splitAt = left;
  else splitAt = (mid - left <= right - mid) ? left : right;
  return name.substring(0, splitAt) + '<br>' + name.substring(splitAt + 1);
}

function getLargestPolygonRings(coords) {
  var best = null;
  var maxArea = -1;
  for (var i = 0; i < coords.length; i++) {
    var ring = coords[i][0];
    var area = 0;
    for (var j = 0; j < ring.length - 1; j++) {
      area += ring[j][0] * ring[j + 1][1];
      area -= ring[j + 1][0] * ring[j][1];
    }
    area = Math.abs(area / 2);
    if (area > maxArea) {
      maxArea = area;
      best = coords[i];
    }
  }
  return best;
}

function getLabelLatLng(feature, layer) {
  try {
    var rings = null;
    if (feature.geometry.type === 'Polygon') {
      rings = feature.geometry.coordinates;
    } else if (feature.geometry.type === 'MultiPolygon') {
      rings = getLargestPolygonRings(feature.geometry.coordinates);
    }

    if (rings) {
      var pt = polylabel(rings, 0.0001);

      // dacă raza e prea mică = poligon îngust/alungit → nu folosi polylabel
      if (pt.distance && pt.distance > 0.005) {
        return L.latLng(pt[1], pt[0]);
      }
    }
  } catch (e) {
    console.warn('polylabel error:', feature.properties.UAT);
  }

  // fallback pentru poligoane înguste: centrul bbox-ului
  // bbox center e mai stabil vizual pe forme alungite decât centroidul aritmetic
  try {
    var bounds = layer.getBounds();
    var latMid = (bounds.getNorth() + bounds.getSouth()) / 2;
    var lngMid = (bounds.getEast() + bounds.getWest()) / 2;

    // verifică dacă punctul bbox e în interiorul poligonului
    // dacă nu, ia polylabel oricum (mai bun decât nimic)
    var rings2 = null;
    if (feature.geometry.type === 'Polygon') {
      rings2 = feature.geometry.coordinates;
    } else if (feature.geometry.type === 'MultiPolygon') {
      rings2 = getLargestPolygonRings(feature.geometry.coordinates);
    }

    if (rings2 && pointInRing([lngMid, latMid], rings2[0])) {
      return L.latLng(latMid, lngMid);
    }

    // bbox nu e în poligon → forțează polylabel indiferent de distanță
    if (rings2) {
      var pt2 = polylabel(rings2, 0.0001);
      return L.latLng(pt2[1], pt2[0]);
    }
  } catch (e2) {}

  return layer.getBounds().getCenter();
}

// helper: punct în inel exterior
function pointInRing(pt, ring) {
  var x = pt[0], y = pt[1];
  var inside = false;
  for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    var xi = ring[i][0], yi = ring[i][1];
    var xj = ring[j][0], yj = ring[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// ================== MAP ==================
var map = L.map('map').setView([45.9, 24.9], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap',
  maxZoom: 19,
  updateWhenIdle: true,
  updateWhenZooming: false,
  keepBuffer: 2
}).addTo(map);

// ascunde labeluri UAT sub zoom 10
var MIN_UAT_LABEL_ZOOM = 10;
map.on('zoomend', function() {
  var container = map.getContainer();
  if (map.getZoom() >= MIN_UAT_LABEL_ZOOM) {
    container.classList.remove('labels-hidden');
  } else {
    container.classList.add('labels-hidden');
  }
});

var layerJudete = null;
var layerUAT = null;
var uatLabels = [];
var backBtn = document.getElementById('backBtn');

// ================== RESET ==================
backBtn.onclick = function() {
  if (layerUAT) map.removeLayer(layerUAT);
  for (var i = 0; i < uatLabels.length; i++) {
    map.removeLayer(uatLabels[i]);
  }
  uatLabels = [];
  if (layerJudete) layerJudete.addTo(map);
  map.setView([45.9, 24.9], 7);
  backBtn.style.display = 'none';
};

// ================== JUDEȚE ==================
fetch('judete.geojson')
  .then(function(r) { return r.json(); })
  .then(function(data) {
    layerJudete = L.geoJSON(data, {
      style: {
        color: '#ffffff',
        weight: 1.3,
        fillColor: '#6fa8dc',
        fillOpacity: 0.9
      },
      onEachFeature: function(feature, layer) {
        layer.bindTooltip(feature.properties.Judet, {
          permanent: true,
          direction: 'center',
          className: 'label-judet'
        });
        layer.on('mouseover', function() {
          layer.setStyle({ fillColor: '#3d85c6' });
        });
        layer.on('mouseout', function() {
          layer.setStyle({ fillColor: '#6fa8dc' });
        });
        layer.on('click', function() {
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
  for (var i = 0; i < uatLabels.length; i++) {
    map.removeLayer(uatLabels[i]);
  }
  uatLabels = [];

  fetch('uat.geojson')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var canvasRenderer = L.canvas({ padding: 0.5 });

      layerUAT = L.geoJSON(data, {
        renderer: canvasRenderer,
        filter: function(f) {
          return norm(f.properties.Judet) === norm(judetSelectat);
        },
        style: {
          color: '#000',
          weight: 0.8,
          fillColor: '#ffe599',
          fillOpacity: 0.9
        },
        onEachFeature: function(feature, layer) {
          var labelLatLng = getLabelLatLng(feature, layer);

          var label = L.marker(labelLatLng, {
            icon: L.divIcon({
              className: 'label-uat',
              html: formatUATName(feature.properties.UAT),
              iconSize: [0, 0],
              iconAnchor: [0, 0]
            }),
            interactive: false,
            keyboard: false
          }).addTo(map);

          uatLabels.push(label);

          layer.on('mouseover', function() {
            layer.setStyle({ fillColor: '#f1c232' });
            if (label.getElement()) {
              label.getElement().classList.add('label-hover');
            }
          });
          layer.on('mouseout', function() {
            layer.setStyle({ fillColor: '#ffe599' });
            if (label.getElement()) {
              label.getElement().classList.remove('label-hover');
            }
          });
          layer.on('click', function() {
            if (feature.properties.URL) {
              window.open(feature.properties.URL, '_blank');
            }
          });
        }
      }).addTo(map);

      backBtn.style.display = 'block';
    });
}

