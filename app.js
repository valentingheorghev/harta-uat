// ================== UTILS ==================
if (document.getElementById('apysis-map')) {

  var map = L.map('apysis-map').setView([45.9, 24.9], 7);
function norm(txt) {
  var s = txt.toString().trim().toUpperCase().normalize("NFD");
  var result = '';
  for (var i = 0; i < s.length; i++) {
    var code = s.charCodeAt(i);
    if (code < 768 || code > 879) result += s[i];
  }
  return result;
}

function stringToHash(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getBlueFromName(name) {
  var hash = stringToHash(norm(name));
  var hue = 210;
  var saturation = 60 + (hash % 20);
  var lightness = 45 + (hash % 15);
  return 'hsl(' + hue + ',' + saturation + '%,' + lightness + '%)';
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
  var best = null, maxArea = -1;
  for (var i = 0; i < coords.length; i++) {
    var ring = coords[i][0], area = 0;
    for (var j = 0; j < ring.length - 1; j++) {
      area += ring[j][0] * ring[j + 1][1];
      area -= ring[j + 1][0] * ring[j][1];
    }
    area = Math.abs(area / 2);
    if (area > maxArea) { maxArea = area; best = coords[i]; }
  }
  return best;
}

function ringCentroid(ring) {
  var x = 0, y = 0, area = 0;
  var n = ring.length - 1;
  for (var i = 0, j = n - 1; i < n; j = i++) {
    var xi = ring[i][0], yi = ring[i][1];
    var xj = ring[j][0], yj = ring[j][1];
    var f = xi * yj - xj * yi;
    area += f;
    x += (xi + xj) * f;
    y += (yi + yj) * f;
  }
  area /= 2;
  if (Math.abs(area) < 1e-12) {
    var cx = 0, cy = 0;
    for (var k = 0; k < n; k++) { cx += ring[k][0]; cy += ring[k][1]; }
    return [cx / n, cy / n];
  }
  return [x / (6 * area), y / (6 * area)];
}

function pointInRing(pt, ring) {
  var x = pt[0], y = pt[1], inside = false;
  for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    var xi = ring[i][0], yi = ring[i][1];
    var xj = ring[j][0], yj = ring[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function getLabelLatLng(feature, layer) {
  if (feature.properties.LabelLat && feature.properties.LabelLng) {
    return L.latLng(feature.properties.LabelLat, feature.properties.LabelLng);
  }
  var rings = null;
  if (feature.geometry.type === 'Polygon') {
    rings = feature.geometry.coordinates;
  } else if (feature.geometry.type === 'MultiPolygon') {
    rings = getLargestPolygonRings(feature.geometry.coordinates);
  }
  if (!rings) return layer.getBounds().getCenter();
  var ring = rings[0];
  var c = ringCentroid(ring);
  if (pointInRing(c, ring)) return L.latLng(c[1], c[0]);
  var cx = 0, cy = 0, n = ring.length - 1;
  for (var k = 0; k < n; k++) { cx += ring[k][0]; cy += ring[k][1]; }
  return L.latLng(cy / n, cx / n);
}

// ================== MAP ==================
var map = L.map('apysis-map').setView([45.9, 24.9], 7);

var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap',
  maxZoom: 19,
  updateWhenIdle: true,
  updateWhenZooming: false,
  keepBuffer: 2
}).addTo(map);

var blankLayer = L.tileLayer('', { attribution: '' });

var layerControl = L.control.layers(
  { 'OpenStreetMap': osmLayer, 'Fără fundal': blankLayer },
  {},
  { position: 'topright', collapsed: false }
).addTo(map);

var MIN_UAT_LABEL_ZOOM = 10;
var uatActive = false;

map.on('zoomend', function() {
  if (uatActive) return;
  var c = map.getContainer();
  if (map.getZoom() >= MIN_UAT_LABEL_ZOOM) {
    c.classList.remove('labels-hidden');
  } else {
    c.classList.add('labels-hidden');
  }
});

var layerJudete = null, layerUAT = null, uatLabels = [];
var backBtn = document.getElementById('backBtn');

// ================== RESET ==================
backBtn.onclick = function() {
  uatActive = false;
  if (layerUAT) {
    layerControl.removeLayer(layerUAT);
    map.removeLayer(layerUAT);
  }
  for (var i = 0; i < uatLabels.length; i++) map.removeLayer(uatLabels[i]);
  uatLabels = [];
  if (layerJudete) layerJudete.addTo(map);
  map.setView([45.9, 24.9], 7);
  backBtn.style.display = 'none';
  map.getContainer().classList.add('labels-hidden');
};

// ================== JUDEȚE ==================
fetch('judete.geojson')
  .then(function(r) { return r.json(); })
  .then(function(data) {
    layerJudete = L.geoJSON(data, {
      style: function(feature) {
        var color = getBlueFromName(feature.properties.Judet);
        feature.properties._color = color;
        return { color: '#ffffff', weight: 2.5, fillColor: color, fillOpacity: 0.9 };
      },
      onEachFeature: function(feature, layer) {
        layer.bindTooltip(feature.properties.Judet, {
          permanent: true, direction: 'center', className: 'label-judet'
        });
        layer.on('mouseover', function() {
          layer.setStyle({ weight: 4, fillOpacity: 1 });
          layer.bringToFront();
        });
        layer.on('mouseout', function() {
          layer.setStyle({ weight: 2.5, fillOpacity: 0.9 });
        });
        layer.on('click', function() {
          map.fitBounds(layer.getBounds(), { padding: [20, 20] });
          afiseazaUAT(feature.properties.Judet);
        });
      }
    }).addTo(map);

    layerControl.addOverlay(layerJudete, 'Județe');
  });

// ================== UAT ==================
function afiseazaUAT(judetSelectat) {
  uatActive = true;
  if (layerJudete) map.removeLayer(layerJudete);
  if (layerUAT) {
    layerControl.removeLayer(layerUAT);
    map.removeLayer(layerUAT);
  }
  for (var i = 0; i < uatLabels.length; i++) map.removeLayer(uatLabels[i]);
  uatLabels = [];

  var fileName = 'uat_judete/uat_' + norm(judetSelectat) + '.geojson'; // ← fișier per județ

  fetch(fileName)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var canvasRenderer = L.canvas({ padding: 0.5 });

      layerUAT = L.geoJSON(data, {
        renderer: canvasRenderer,
        // filter dispare — fișierul conține deja doar UAT-urile județului
        style: { color: '#000', weight: 1.5, fillColor: '#ffe599', fillOpacity: 0.9 },
        onEachFeature: function(feature, layer) {
          var labelLatLng = getLabelLatLng(feature, layer);

          var label = L.marker(labelLatLng, {
            icon: L.divIcon({
              className: 'uat-label-wrap',
              html: '<div class="label-uat">' + formatUATName(feature.properties.UAT) + '</div>',
              iconSize: [0, 0],
              iconAnchor: [0, 0]
            }),
            interactive: false,
            keyboard: false
          }).addTo(map);

          uatLabels.push(label);

          layer.on('mouseover', function() {
            layer.setStyle({ fillColor: '#f1c232', weight: 3 });
            layer.bringToFront();
            var el = label.getElement();
            if (el) el.querySelector('.label-uat').classList.add('label-hover');
          });
          layer.on('mouseout', function() {
            layer.setStyle({ fillColor: '#ffe599', weight: 1.5 });
            var el = label.getElement();
            if (el) el.querySelector('.label-uat').classList.remove('label-hover');
          });
          layer.on('click', function() {
  var siruta = String(feature.properties.SIRUTA || '').trim();

  if (siruta !== '') {
    window.location.href = '/apysis/siruta=' + siruta;
  }
});
        }
      }).addTo(map);

      layerControl.addOverlay(layerUAT, 'UAT-uri');
      backBtn.style.display = 'block';
      map.getContainer().classList.remove('labels-hidden');
    })
    .catch(function(e) {
      console.error('Eroare la încărcarea UAT pentru: ' + judetSelectat, e);
    });
}





