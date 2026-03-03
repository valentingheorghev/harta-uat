// ================== UTILS ==================
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
  var hue = 210; // albastru stabil
  var saturation = 60 + (hash % 20); // 60–79%
  var lightness = 45 + (hash % 15);  // 45–59%
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

// ================== MAP ==================
var map = L.map('map').setView([45.9, 24.9], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap',
  maxZoom: 19
}).addTo(map);

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
  if (layerUAT) map.removeLayer(layerUAT);
  uatLabels.forEach(function(l) { map.removeLayer(l); });
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

        return {
          color: '#ffffff',
          weight: 2.5,
          fillColor: color,
          fillOpacity: 0.9
        };
      },

      onEachFeature: function(feature, layer) {

        layer.bindTooltip(feature.properties.Judet, {
          permanent: true,
          direction: 'center',
          className: 'label-judet'
        });

        layer.on('mouseover', function() {
          layer.setStyle({
            weight: 4,
            fillOpacity: 1
          });
          layer.bringToFront();
        });

        layer.on('mouseout', function() {
          layer.setStyle({
            weight: 2.5,
            fillOpacity: 0.9
          });
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

  uatActive = true;

  if (layerJudete) map.removeLayer(layerJudete);
  if (layerUAT) map.removeLayer(layerUAT);
  uatLabels.forEach(function(l) { map.removeLayer(l); });
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
          weight: 1.5,
          fillColor: '#ffe599',
          fillOpacity: 0.9
        },

        onEachFeature: function(feature, layer) {

          layer.on('mouseover', function() {
            layer.setStyle({
              fillColor: '#f1c232',
              weight: 3
            });
            layer.bringToFront();
          });

          layer.on('mouseout', function() {
            layer.setStyle({
              fillColor: '#ffe599',
              weight: 1.5
            });
          });

          layer.on('click', function() {
            if (feature.properties.URL)
              window.open(feature.properties.URL, '_blank');
          });

        }

      }).addTo(map);

      backBtn.style.display = 'block';
      map.getContainer().classList.remove('labels-hidden');

    });
}
