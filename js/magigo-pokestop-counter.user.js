// ==UserScript==
// @name        magigo-pokestop-counter
// @namespace   magigo-plugin
// @include     https://magicalgo.com/*
// @version     0.0.1
// @grant       none
// ==/UserScript==
wrapper = function(info) {
  class Pokestop {
    constructor(json) {
      var v = json.key.split(',');
      this.key = json.key;
      this.lat = v[0];
      this.lng = v[1];
      this.gym = v[3] == '0';
      this.latLng = L.latLng(this.lat, this.lng);
      this.date = (json.date == null) ? Date.now() : json.date;
      this.name = (json.name != null) ? json.name : ((pokemon_list[this.key] != null) ? pokemon_list[this.key]['name'] : null);
      this.sponsored = (json.sponsored) ? json.sponsored :
        ((pokemon_list[this.key] != null) ? (this.sponsored = pokemon_list[this.key]['sp'] || Pokestop.isSponsored(this.name)) : null);
    }
    static isSponsored(name) {
      var sponsoreds = ['セブン−イレブン', 'ソフトバンク', 'ワイモバイル', 'ジョイフル', 'ITO EN', 'タリーズコーヒー', 'TOHOシネマズ', 'マクドナルド', 'イオン', 'マックスバリュ', 'ザ・ビッグ'];
      for (var v in sponsoreds) {
        if (name.indexOf(sponsoreds[v]) != -1) {
          return true;
        }
      }
      return false;
    }

    toLatLngString() {
      return this.lat + ',' + this.lng;
    }

    draw(layer) {
      if (map.getZoom() >= 15 && map.getBounds().contains(this.latLng)) {
        var className = 'ex-pokestop';
        if (this.gym) {
          className = 'ex-gym';
        }
        if (this.sponsored) {
          className += ' ex-sponsored';
        }
        if (Date.now() - this.date < (1000 * 60 * 60 * 24 * 1)) {
          className += ' ex-new';
        }
        layer.addLayer(L.marker(this.latLng, {
          iconSize:[5,5],
          icon: L.divIcon({className: className})}));
        
        // level18セル
        if (map.getZoom() >= 17) {
          var cell = S2.S2Cell.FromLatLng(this.latLng, 18);
          layer.addLayer(L.polygon (cell.getCornerLatLngs(),
                                    {color: 'green', weight: 3, opacity: 0.1, clickable: false, fill:true }));
        }
      }
    }

    update(p) {
      this.key = p.key;
      this.gym = p.gym;
      this.name = (p.name == null) ? this.name : p.name;
      this.sponsored = (p.sponsored == null) ? this.sponsored : p.sponsored;
    }
  }
  var strageKey = 'cache';

  window.onload = function () {
    if (typeof(map) != "undefined") {
      var moved = [];
      var cells = {};
      var data = {};

      var cache = localStorage.getItem(strageKey) == null ? {} : JSON.parse(localStorage.getItem(strageKey));
      for (var cKey in cache) {
        data[cKey] = new Pokestop(cache[cKey]);
      }
      var layer = L.layerGroup();
      layer.addTo(map);
      var refreshTimer = setTimeout(refreshLayer, 500);

      function refreshLayer() {
        // キャッシュ書き出し
        localStorage.setItem(strageKey, JSON.stringify(data));
        layer.clearLayers();
        var bounds = map.getBounds();
        for (var key in data) {
          var p = data[key];
          data[key].draw(layer);
          var cell = S2.S2Cell.FromLatLng(p.latLng, 14);
          var cellKey = cell.toString();
          if (cells[cellKey] == null) {
            cells[cellKey] = {};
            cells[cellKey].pokestops = [];
            cells[cellKey].cell = cell;
            cells[cellKey].corner = cell.getCornerLatLngs();
          }
          var includes = false;
          for (var i in cells[cellKey].pokestops) {
            if (cells[cellKey].pokestops[i].toLatLngString() == p.toLatLngString()) {
              cells[cellKey].pokestops[i].update(p);
              includes = true;
              break;
            }
          }
          if (!includes) {
            cells[cellKey].pokestops.push(p);
          }
        }
        var cellOptionsKey = [1,5,19];
        var cellOptions = [];
        cellOptions[-1] = {color: 'blue', weight: 3, opacity: 0.1, clickable: false, fill:true };
        cellOptions[0] = cellOptions[1] = cellOptions[2] = {color: 'yellow', weight: 3, opacity: 0.5, clickable: false, fill:true };
        for (var key in cells) {
          if (bounds.contains(cells[key].pokestops[0])) {
            var nonsponsers = 0;
            for (var p in cells[key].pokestops) {
              if (!cells[key].pokestops[p].sponsored) {
                nonsponsers++;
              }
            }
            var polygon = L.polygon (cells[key].corner , cellOptions[cellOptionsKey.indexOf(nonsponsers)]);
            layer.addLayer(polygon);
            var center = polygon.getBounds().getCenter();
            var label = L.marker(center, {
              icon: L.divIcon({
                clickable: true,
                className: 'portalLocations-icon',
                iconSize: [50,50],
                html: nonsponsers
              })
            });
            layer.addLayer(label);      
          }
        }
        if (false) {// 自動で動かして探索
          for (var key in data) {
            if (moved.indexOf(data[key].toLatLngString()) == -1) {
              moved.push(data[key].toLatLngString());
              map.setView(data[key].latLng, map.getZoom(), {});
              break;
            }
          }
        }
      }

      pokemon_list = new Proxy(pokemon_list, {set: function(obj, prop, value) {
        obj[prop] = value;
        var v = prop.split(',');
        if (value != null && v[2] == 'fort') {
          //ポケストップまたはジム
          if (data[prop] == null) {
            var p = new Pokestop({key: prop})
            data[prop] = p;
          }
          clearTimeout(refreshTimer);
          refreshTimer = setTimeout(refreshLayer, 500);
        }
      }});

      map.on('moveend', function() {
        refreshLayer();
      });

      // ポケストップ数のCSS
      $("<style>").prop("type", "text/css").html('.ex-pokestop{background-color:#2ECCFA;width:100%;height:100%;}' +
                                                 '.ex-gym{background-color:red;width:100%;height:100%;}' +
                                                 '.ex-sponsored{opacity:0.3}' +
                                                 '.ex-new{animation: rotation;animation-duration:500ms;animation-iteration-count: infinite;animation-direction: alternate;}' +
                                                 '@keyframes rotation {0%{opacity:0}, 100% {opacity:1}}' +
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
    }
  };
}
var script = document.createElement('script');
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify({})+');'));
(document.body || document.head || document.documentElement).appendChild(script);