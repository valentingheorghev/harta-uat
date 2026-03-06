// ================== INIT WRAPPER ==================
if (document.getElementById('apysis-map')) {
var BASE_ROOT;
if (window.location.hostname === 'gis-geolabs.github.io') {
  BASE_ROOT = '/harta-uat/';
} else {
  BASE_ROOT = (document.getElementById('apysis-map').getAttribute('data-base-root') || '').replace(/\/$/, '') + '/';
}
 
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

var MAP_COLORS = [
  '#004494', '#193662', '#2E5AAC', '#DEE1E8',
  'rgb(236,241,247)', 'rgb(230,237,245)', 'rgb(174,196,221)',
  'rgb(224,232,242)', 'rgb(93,136,187)', 'rgb(56,109,171)'
];

function getColorFromName(name) {
  var hash = stringToHash(norm(name));
  return MAP_COLORS[hash % MAP_COLORS.length];
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

  var bounds = layer.getBounds();
  var bx = (bounds.getWest() + bounds.getEast()) / 2;
  var by = (bounds.getNorth() + bounds.getSouth()) / 2;
  if (pointInRing([bx, by], ring)) return L.latLng(by, bx);

  var cx = bx;
  var ys = [];
  for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    var x1 = ring[j][0], y1 = ring[j][1];
    var x2 = ring[i][0], y2 = ring[i][1];
    if ((x1 <= cx && cx < x2) || (x2 <= cx && cx < x1)) {
      var yint = y1 + (cx - x1) * (y2 - y1) / (x2 - x1);
      ys.push(yint);
    }
  }
  ys.sort(function(a, b) { return a - b; });
  var bestLen = -1, bestY = by;
  for (var k = 0; k + 1 < ys.length; k += 2) {
    var len = ys[k + 1] - ys[k];
    if (len > bestLen) { bestLen = len; bestY = (ys[k] + ys[k + 1]) / 2; }
  }
  if (bestLen > 0) return L.latLng(bestY, cx);

  var mx = 0, my = 0, n = ring.length - 1;
  for (var v = 0; v < n; v++) { mx += ring[v][0]; my += ring[v][1]; }
  return L.latLng(my / n, mx / n);
}

// ================== MAP ==================
var romaniaBounds = L.latLngBounds([43.5, 19.0], [48.5, 30.5]);
var isMobile = window.innerWidth < 768;

var map = L.map('apysis-map', {
  minZoom: 5,
  maxZoom: 18,
  maxBounds: romaniaBounds,
  maxBoundsViscosity: 1.0
});

if (isMobile) {
  map.setView([45.9, 24.9], 5, { animate: false });  // zoom mai mare pe mobil
} else {
  map.setView([45.9, 24.9], 7, { animate: false });  // cum era pe desktop
}

// ================== BASE LAYERS ==================
var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap',
  maxZoom: 19,
  updateWhenIdle: true,
  updateWhenZooming: false,
  keepBuffer: 2
});

var satelliteLayer = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { attribution: 'Tiles © Esri', maxZoom: 19 }
);

var blankLayer = L.tileLayer('', { attribution: '' }).addTo(map);
  var activeBaseLayer = blankLayer;  // ← retine stratul activ curent

map.on('baselayerchange', function(e) {
  activeBaseLayer = e.layer;

  var chk = document.getElementById('toggle-transparent');
  if (!chk) return;

  var transparent = (e.layer !== blankLayer);  // OSM sau Satelit -> true, Fără fundal -> false
  chk.checked = transparent;

  if (layerJudete) {
    layerJudete.eachLayer(function(l) {
      l.setStyle({ fillOpacity: transparent ? 0 : 0.9 });
    });
  }
  if (layerUAT) {
    layerUAT.eachLayer(function(l) {
      l.setStyle({ fillOpacity: transparent ? 0 : 0.9 });
    });
  }
});


// ================== LAYER CONTROL ==================
var layerControl = L.control.layers(
  { 'OpenStreetMap': osmLayer, 'Satelit': satelliteLayer, 'Fără fundal': blankLayer },
  {},
  { position: 'topright', collapsed: isMobile }
).addTo(map);

// ================== SCALE ==================
L.control.scale({ imperial: false }).addTo(map);

var MIN_UAT_LABEL_ZOOM = 9;
var uatActive = false;

// zoomend gestioneaza labelurile bazat pe zoom si starea uatActive
map.on('zoomend', function() {
  var c = map.getContainer();
  var z = map.getZoom();
  if (uatActive) {
    // in modul UAT: arata labeluri doar la zoom >= MIN_UAT_LABEL_ZOOM
    if (z >= MIN_UAT_LABEL_ZOOM) {
      c.classList.remove('labels-hidden');
    } else {
      c.classList.add('labels-hidden');
    }
  } else {
    // in modul judete: ascunde intotdeauna labelurile UAT
    c.classList.add('labels-hidden');
  }
});

// ================== LEGENDA ==================
var legend = L.control({ position: 'bottomright' });
legend.onAdd = function() {
  var div = L.DomUtil.create('div', 'info legend');
  div.style.cssText =
    'background:white;border:none;border-radius:8px;' +
    'box-shadow:0 2px 12px rgba(0,0,0,0.18);font-family:Arial,sans-serif;' +
    'font-size:12px;min-width:130px;overflow:hidden;padding:0;line-height:normal;';

  var sq = 'display:inline-block;width:16px;height:16px;box-sizing:border-box;' +
           'border:1px solid rgba(0,0,0,0.3);margin-right:8px;flex-shrink:0;border-radius:2px;';

  div.innerHTML =
    '<div style="background:#193662;color:white;font-weight:700;font-size:12px;' +
    'padding:8px 12px;letter-spacing:0.4px;">Legend\u0103</div>' +
    '<div style="padding:8px 12px 10px 12px;">' +
      '<div style="display:flex;align-items:center;padding:3px 0;">' +
        '<span style="' + sq + 'background:#004494;"></span>' +
        '<span style="' + sq + 'background:#193662;"></span>' +
        '<span style="' + sq + 'background:#2E5AAC;"></span>' +
        '<span style="' + sq + 'background:#DEE1E8;"></span>Jude\u021be / UAT' +
      '</div>' +
    '</div>';
  return div;
}
// legend.addTo(map);

// ================== STATE ==================
var layerJudete = null, layerUAT = null;
var uatLabels = [], uatLabelsGroup = L.layerGroup();
var selectedJudetLayer = null;
var backBtn = document.getElementById('backBtn');

function resetUATLayers() {
  uatLabelsGroup.clearLayers();
  if (map.hasLayer(uatLabelsGroup)) map.removeLayer(uatLabelsGroup);
  uatLabels = [];
  if (layerUAT) {
    layerControl.removeLayer(layerUAT);
    map.removeLayer(layerUAT);
    layerUAT = null;
  }
}

// ================== TRANSPARENT TOGGLE ==================
var toggleTransparent = document.getElementById('toggle-transparent');
if (toggleTransparent) {
  toggleTransparent.addEventListener('click', function(e) {
    e.stopPropagation();
  });
  toggleTransparent.addEventListener('change', function() {
    var transparent = this.checked;
    if (layerUAT) {
      layerUAT.eachLayer(function(layer) {
        layer.setStyle({ fillOpacity: transparent ? 0 : 0.9 });
      });
    }
    if (layerJudete) {
      layerJudete.eachLayer(function(layer) {
        layer.setStyle({ fillOpacity: transparent ? 0 : 0.9 });
      });
    }
  });
}
// ================== BACK BUTTON ==================
backBtn.onclick = function() {
  uatActive = false;
  resetUATLayers();

  if (selectedJudetLayer) {
    layerJudete.resetStyle(selectedJudetLayer);
    selectedJudetLayer = null;
  }

  if (layerJudete && !map.hasLayer(layerJudete)) layerJudete.addTo(map);

  // reset transparenta
  document.getElementById('toggle-transparent').checked = false;
  if (layerJudete) {
    layerJudete.eachLayer(function(l) { l.setStyle({ fillOpacity: 0.9 }); });
  }

  // reset fundal la blank
  map.removeLayer(osmLayer);
  map.removeLayer(satelliteLayer);
  map.removeLayer(blankLayer);
  blankLayer.addTo(map);
  activeBaseLayer = blankLayer;

  // reset pozitie
  if (isMobile) {
    map.fitBounds([[43.5, 19.0], [48.5, 30.5]], { padding: [20, 20], animate: false });
  } else {
    map.setView([45.9, 24.9], 7, { animate: false });
  }

  backBtn.style.display = 'none';
  history.pushState('', document.title, window.location.pathname);
  map.getContainer().classList.add('labels-hidden');
};

// ================== JUDETE ==================
fetch(BASE_ROOT + 'judete.geojson')
  .then(function(r) { return r.json(); })
  .then(function(data) {
    layerJudete = L.geoJSON(data, {
      style: function(feature) {
        var color = getColorFromName(feature.properties.Judet);
        feature.properties._color = color;
        return { color: '#eeeeee', weight: 4, fillColor: color, fillOpacity: 0.9 };
      },
      onEachFeature: function(feature, layer) {
        layer.bindTooltip(feature.properties.Judet, {
          permanent: true, direction: 'center', className: 'label-judet'
        });
layer.on('mouseover', function() {
  var transp = document.getElementById('toggle-transparent').checked;
  layer.setStyle({ weight: 5, fillOpacity: transp ? 0 : 1 });
  layer.bringToFront();
});
layer.on('mouseout', function() {
  var transp = document.getElementById('toggle-transparent').checked;
  layer.setStyle({ weight: 4, fillOpacity: transp ? 0 : 0.9 });
});

layer.on('click', function() {
  if (selectedJudetLayer) layerJudete.resetStyle(selectedJudetLayer);
  selectedJudetLayer = layer;
layer.setStyle({ weight: 5, color: '#000', fillOpacity: document.getElementById('toggle-transparent').checked ? 0 : 1 });

  var p = feature.properties;
  if (p.CenterLat && p.CenterLng && p.ZoomLevel) {
    map.setView([p.CenterLat, p.CenterLng], p.ZoomLevel, { animate: false });
  } else {
    map.fitBounds(layer.getBounds(), {
      paddingTopLeft: [220, 20],
      paddingBottomRight: [40, 40],
      animate: false
    });
    // forteaza zoom minim 9 dupa fitBounds
    if (map.getZoom() < 9) map.setZoom(9, { animate: false });
  }
  afiseazaUAT(feature.properties.Judet);
  window.location.hash = norm(feature.properties.Judet);
});


      }
    }).addTo(map);
    layerControl.addOverlay(layerJudete, 'Județe');
  });

// ================== UAT ==================
function afiseazaUAT(judetSelectat) {
  uatActive = true;
  if (layerJudete) map.removeLayer(layerJudete);
  resetUATLayers();

  var fileName = BASE_ROOT + 'uat_judete/uat_' + norm(judetSelectat) + '.geojson';

  fetch(fileName)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var canvasRenderer = L.canvas({ padding: 0.5 });

      layerUAT = L.geoJSON(data, {
        renderer: canvasRenderer,
        style: function(feature) {
          var color = getColorFromName(feature.properties.UAT || '');
          feature.properties._color = color;
          return { color: '#eeeeee', weight: 4, fillColor: color, fillOpacity: 0.9 };
        },
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
          });
          uatLabelsGroup.addLayer(label);
          uatLabels.push(label);

layer.on('mouseover', function() {
  var transp = document.getElementById('toggle-transparent').checked;
  layer.setStyle({ fillOpacity: transp ? 0 : 1, weight: 5 });
  layer.bringToFront();
  var el = label.getElement();
  if (el) el.querySelector('.label-uat').classList.add('label-hover');
});
layer.on('mouseout', function() {
  var transp = document.getElementById('toggle-transparent').checked;
  layer.setStyle({ fillColor: feature.properties._color, fillOpacity: transp ? 0 : 0.9, weight: 4 });
  var el = label.getElement();
  if (el) el.querySelector('.label-uat').classList.remove('label-hover');
});
          layer.on('click', function() {
            var siruta = String(feature.properties.SIRUTA || '').trim();
            if (siruta !== '') {
              window.location.href = '/apysis/siruta/' + siruta;
            }
          });
        }
      }).addTo(map);
// sincronizeaza transparenta la incarcarea UAT
var isTransparent = document.getElementById('toggle-transparent').checked;
if (isTransparent) {
  layerUAT.eachLayer(function(layer) {
    layer.setStyle({ fillOpacity: 0 });
  });
}
      uatLabelsGroup.addTo(map);
      layerControl.addOverlay(layerUAT, 'UAT-uri');
      backBtn.style.display = 'block';
      map.getContainer().classList.remove('labels-hidden');
    })
    .catch(function(e) {
      console.error('Eroare la încărcarea UAT pentru: ' + judetSelectat, e);
    });
}
// ================== RESIZE HANDLER ==================
window.addEventListener('resize', function() {
  map.invalidateSize();
});

if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(function() {
    map.invalidateSize();
  }).observe(document.getElementById('apysis-map'));
}
window.addEventListener('hashchange', function() {
  var hash = window.location.hash.replace('#', '');
  if (hash === '') {
    backBtn.onclick();  // ← apelează același reset complet
  }
});

window.addEventListener('load', function() {
  var hash = window.location.hash.replace('#', '');
  if (hash !== '') {
    afiseazaUAT(hash);
  }
});

} // END init wrapper




















