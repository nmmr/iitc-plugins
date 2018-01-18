// ==UserScript==
// @id             iitc-plugin-portal-location
// @name           IITC-ja plugin: Portal Location
// @category       Layer
// @version        0.0.1
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
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
// @require        https://sites.google.com/site/stocksite123456/s2geometry.js
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
// use own namespace for plugin
window.plugin.portalLocations = function() {};
window.plugin.portalLocations.submissions = {};
window.plugin.portalLocations.portalLayer = null;
window.plugin.portalLocations.s2CellLayer = null;
window.plugin.portalLocations.cells = {};
window.plugin.portalLocations.portalGIO = [];
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
window.plugin.portalLocations.updatePortalLocations = function() {
  window.plugin.portalLocations.portalLayer.clearLayers();
  window.plugin.portalLocations.s2CellLayer.clearLayers();

  var guid,point;
  //TODO portalsはそのまま使えるのでは？
  console.log("portal:"+Object.keys(window.portals).length);
  for (guid in window.portals) {
    var p = window.portals[guid];
    var latLng = p.getLatLng();
    if (window.plugin.portalLocations.portalGIO.indexOf(latLng.toString()) == -1) {
      window.plugin.portalLocations.portalGIO.push(latLng.toString());
      var cell = S2.S2Cell.FromLatLng(latLng, 14);
      var key = cell.toString();
      if (window.plugin.portalLocations.cells[key] == null) {
 				window.plugin.portalLocations.cells[key] = {};
				window.plugin.portalLocations.cells[key].portals = [];
				window.plugin.portalLocations.cells[key].cell = cell;
        window.plugin.portalLocations.cells[key].corner = cell.getCornerLatLngs();
      }
      window.plugin.portalLocations.cells[key].portals.push(latLng);
    }
  }

  var bounds = map.getBounds();
  var portalOptions = {color: 'orange', weight: 7, opacity: 0.5, clickable: false, fill:true };
  var cellOptionsKey = [1,5];
  var cellOptions = [];
  cellOptions[-1] = {color: 'blue', weight: 3, opacity: 0.1, clickable: false, fill:true };
  cellOptions[0] = cellOptions[1] = {color: 'yellow', weight: 3, opacity: 0.5, clickable: false, fill:true };
  console.log("zoom"+map.getZoom());
  for (key in window.plugin.portalLocations.cells) {
    var corner = window.plugin.portalLocations.cells[key].corner;
    if (bounds.contains(new L.LatLng(corner[0].lat,corner[0].lng)) ||
        bounds.contains(new L.LatLng(corner[1].lat,corner[1].lng)) ||
        bounds.contains(new L.LatLng(corner[2].lat,corner[2].lng)) ||
        bounds.contains(new L.LatLng(corner[3].lat,corner[3].lng))) {
      for (p in window.plugin.portalLocations.cells[key].portals) {
        var c = L.circle (window.plugin.portalLocations.cells[key].portals[p], 5, portalOptions);
        window.plugin.portalLocations.portalLayer.addLayer(c);
      }

      var polygon = L.polygon (corner , cellOptions[cellOptionsKey.indexOf(window.plugin.portalLocations.cells[key].portals.length)] );
      window.plugin.portalLocations.s2CellLayer.addLayer(polygon);
      var center = polygon.getBounds().getCenter();
      var label = L.marker(center, {
        icon: L.divIcon({
          clickable: true,
          className: 'portalLocations-icon',
          iconSize: [50,50],
          html: window.plugin.portalLocations.cells[key].portals.length
        })
      });
      label.addTo(window.plugin.portalLocations.s2CellLayer);      
    }
    var mincellOptions = {color: 'green', weight: 3, opacity: 0.1, clickable: false, fill:true };
    if (map.getZoom() > 15) {
      for (pKey in window.plugin.portalLocations.cells[key].portals) {
        var gio = window.plugin.portalLocations.cells[key].portals[pKey];
        if (bounds.contains(gio)) {
          var polygon = L.polygon (S2.S2Cell.FromLatLng(gio, 17).getCornerLatLngs() , mincellOptions );
          window.plugin.portalLocations.s2CellLayer.addLayer(polygon);
        }
      }
    }
  }
};

var setup = function() {
  window.plugin.portalLocations.setupCSS();

  window.plugin.portalLocations.portalLayer = L.layerGroup();
  window.plugin.portalLocations.s2CellLayer = L.layerGroup();

  addLayerGroup('PortalLocations', window.plugin.portalLocations.portalLayer, true);
  addLayerGroup('Level14S2Cell', window.plugin.portalLocations.s2CellLayer, true);

  window.addHook('mapDataRefreshEnd', function() { window.plugin.portalLocations.updatePortalLocations(); });
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


