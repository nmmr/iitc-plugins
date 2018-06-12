// ==UserScript==
// @id             iitc-plugin-portal-location
// @name           IITC-ja plugin: Portal Location
// @category       Layer
// @version        0.0.3
// @namespace      https://sites.google.com/site/stocksite123456/
// @downloadURL    
// @description    Show portal locations on the map.
// @include        https://www.ingress.com/intel*
// @include        http://www.ingress.com/intel*
// @match          https://www.ingress.com/intel*
// @match          http://www.ingress.com/intel*
// @include        https://www.ingress.com/mission/*
// @include        http://www.ingress.com/mission/*
// @match          https://www.ingress.com/mission/*
// @match          http://www.ingress.com/mission/*
// @require        https://raw.githubusercontent.com/hunterjm/s2-geometry.js/master/src/s2geometry.js
// @grant          none
// ==/UserScript==
function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'portal-locations';
plugin_info.dateTimeVersion = '20180115';
plugin_info.pluginId = 'portal-locations';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////
  class Portal {
    constructor(json) {
      this.lat = json.lat;
      this.lng = json.lng;
      this.latLng = L.latLng(this.lat, this.lng);
      this.latLngStr = this.lat + ',' + this.lng;
      this.date = (json.date == null) ? Date.now() : json.date;
      this.name = (json.name == null) ? '' : json.name;
      this.description = (json.description == null) ? '' : json.description;
      this.candidate = (json.candidate == null) ? false : json.candidate;
      this.sponsored = this.name.search(/ローソン|Lawson/) != -1;
      this.guid = json.guid;
    }

    isNew() {
      return (Date.now() - this.date) < (1000 * 60 * 60 * 24 * 3);
    }

    draw(layer) {
      let property = {color: 'orange', weight: 7, opacity: 1, clickable: true, fill:true, fillOpacity:1};
      if (this.isNew()) {
        property = {color: 'red', weight: 10, opacity: 1, clickable: true, fill:true, fillOpacity:1};
      }
      if (map.getZoom() > 14 || this.isNew()) {
        let circle = L.circle([this.lat,this.lng], 5, property);
        let guid = this.guid;
        circle.on('click', function(){
          window.renderPortalDetails(guid);
        });
        layer.addLayer(circle);
      }
    }
  }
// use own namespace for plugin
window.plugin.portalLocations = function() {};
window.plugin.portalLocations.storageKey = 'portallocations';
window.plugin.portalLocations.apiStorageKey = 'streetviewapi';
window.plugin.portalLocations.svApiKey = '';
window.plugin.portalLocations.cache = {};
window.plugin.portalLocations.cells = {};
window.plugin.portalLocations.portalLayer = null;
window.plugin.portalLocations.s2CellLayer = null;
window.plugin.portalLocations.setupCSS = function() {
  $("<style>").prop("type", "text/css").html('' +
   '.portalLocations-icon{' +
     'color:#FFFFBB;' +
     'font-size:20px;line-height:21px;' +
     'text-align:center;padding: 2px;' + // padding needed so shadow doesn't clip
     'overflow:hidden;' +
// could try this if one-line names are used
//    +'white-space: nowrap;text-overflow:ellipsis;'
     'text-shadow:1px 1px #000,1px -1px #000,-1px 1px #000,-1px -1px #000, 0 0 5px #000;' +
     'pointer-events:none;' +
   '}'
  ).appendTo("head");
};
  var input=document.createElement("a");
  input.innerHTML = "export";
  input.target = '_blank';
  input.download = 'portalData.txt';
  input.setAttribute("style", "font-size:18px;position:absolute;top:10px;left:100px;color:white;cursor:pointer;pointer-events:all;z-index:2999;");
//  document.body.appendChild(input);

  window.plugin.portalLocations.updatePortalLocations = function() {
  window.plugin.portalLocations.portalLayer.clearLayers();
  window.plugin.portalLocations.s2CellLayer.clearLayers();

  var guid,point;
  for (guid in window.portals) {
    let p = window.portals[guid];
    let latLng = p.getLatLng();
    if (window.plugin.portalLocations.cache[latLng.toString()] == null) {
      window.plugin.portalLocations.cache[latLng.toString()] =
        new Portal(Object.assign(latLng, {name:p.options.data.title, guid:guid}));
    } else if (window.plugin.portalLocations.cache[latLng.toString()].name == "") {
      window.plugin.portalLocations.cache[latLng.toString()].name = p.options.data.title;
    }
    window.plugin.portalLocations.cache[latLng.toString()].guid = guid;
  }

  // キャッシュ 書き込み
  localStorage.setItem(window.plugin.portalLocations.storageKey, JSON.stringify(window.plugin.portalLocations.cache));

  let drawCells = {};
  let drawPortal = [];
  let bounds = map.getBounds();
  let cellOptionsKey = [1,5,19,4,18];
  let cellOptions = [];
  cellOptions[-1] = {color: 'blue', weight: 3, opacity: 0.1, clickable: false, fill:true };
  cellOptions[0] = cellOptions[1] = cellOptions[2] = {color: 'red', weight: 3, opacity: 0.5, clickable: false, fill:true };
  cellOptions[3] = cellOptions[4] = {color: 'yellow', weight: 3, opacity: 0.5, clickable: false, fill:true };
  let cell17Options = {color: 'green', weight: 3, opacity: 0.1, clickable: false, fill:true, fillOpacity:0.5};
  let cell17DuplicatedOptions = {color: 'yellow', weight: 3, opacity: 0.1, clickable: false, fill:true, fillOpacity:0.5 };
//  console.log("zoom"+map.getZoom());
  for (let ckey in window.plugin.portalLocations.cache) {
    let portal = window.plugin.portalLocations.cache[ckey];
    // スポンサーは無視
    if (portal == null || portal.sponsored) {
      continue;
    }
    let cell = S2.S2Cell.FromLatLng(portal.latLng, 14);
    let key = cell.toString();
    if (window.plugin.portalLocations.cells[key] == null) {
      window.plugin.portalLocations.cells[key] = {};
      window.plugin.portalLocations.cells[key].portals = {};
      window.plugin.portalLocations.cells[key].cell = cell;
      window.plugin.portalLocations.cells[key].corner = cell.getCornerLatLngs();
      window.plugin.portalLocations.cells[key].cell17 = {};
    }
    if (window.plugin.portalLocations.cells[key].portals[portal.latLngStr] == null) {
      window.plugin.portalLocations.cells[key].portals[portal.latLngStr] = portal;
      let cell17 = S2.S2Cell.FromLatLng(portal.latLng, 17);
      if (window.plugin.portalLocations.cells[key].cell17[cell17.toString()] == null) {
        window.plugin.portalLocations.cells[key].cell17[cell17.toString()] = {cell: cell17, count: 1};
      } else {
        window.plugin.portalLocations.cells[key].cell17[cell17.toString()].count++;
      }
    }

    if (bounds.contains(portal.latLng)) {
      drawPortal.push(portal);
      if (drawCells[key] == null) {
        drawCells[key] = window.plugin.portalLocations.cells[key];
      }
    }
  }
  for (let key in drawCells) {
    let corner = drawCells[key].corner;
    let cell17Num = Object.keys(drawCells[key].cell17).length;
    let options = cellOptions[cellOptionsKey.indexOf(cell17Num)];
    let polygon = L.polygon (corner , options );
    window.plugin.portalLocations.s2CellLayer.addLayer(polygon);
    if (map.getZoom() > 13) {
    let center = polygon.getBounds().getCenter();
      let label = L.marker(center, {
        icon: L.divIcon({
          clickable: true,
          className: 'portalLocations-icon',
          iconSize: [50,50],
          html: cell17Num + "/" + Object.keys(drawCells[key].portals).length
        })
      });
      label.addTo(window.plugin.portalLocations.s2CellLayer);      
    }
    if (map.getZoom() > 14) {
      for (let pKey in drawCells[key].cell17) {
        let cell17 = drawCells[key].cell17[pKey];
        let polygon17 = L.polygon (cell17.cell.getCornerLatLngs() , (cell17.count > 1) ? cell17DuplicatedOptions : cell17Options );
        window.plugin.portalLocations.s2CellLayer.addLayer(polygon17);
      }
    }
  }
  drawPortal.forEach(function(e, i) {e.draw(window.plugin.portalLocations.portalLayer);});
  // ポータル情報書き出し
  let exPortal = {};
  for (let key in window.plugin.portalLocations.cache) {
    let p = window.plugin.portalLocations.cache[key];
    let pLatLng = p.lat + "," + p.lng;
    if (bounds.contains(p.latLng)) {
      exPortal[pLatLng] = {location: pLatLng, name: p.name, type: "ポータル"};
    }
  }
  let data = new Blob([JSON.stringify(exPortal)], {type: "text/plain"});
  input.href = URL.createObjectURL(data);
};

var setup = function() {
  // キャッシュ読み込み
  let storage = localStorage.getItem(window.plugin.portalLocations.storageKey) == null ? {} : JSON.parse(localStorage.getItem(window.plugin.portalLocations.storageKey));
  for (let key in storage) {
    window.plugin.portalLocations.cache[key] = new Portal(storage[key]);
  }
  window.plugin.portalLocations.setupCSS();

  window.plugin.portalLocations.portalLayer = L.layerGroup();
  window.plugin.portalLocations.s2CellLayer = L.layerGroup();

  addLayerGroup('PortalLocations', window.plugin.portalLocations.portalLayer, true);
  addLayerGroup('Level14S2Cell', window.plugin.portalLocations.s2CellLayer, true);

  window.addHook('mapDataRefreshEnd', function() { window.plugin.portalLocations.updatePortalLocations(); });
  window.addHook('mapDataRefreshStart', function() { window.plugin.portalLocations.updatePortalLocations(); });
};

// PLUGIN END //////////////////////////////////////////////////////////


setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);
