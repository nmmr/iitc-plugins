// ==UserScript==
// @name        OPR Analyzer
// @namespace   https://sites.google.com/site/stocksite123456/magigopuraguin
// @include     https://opr.ingress.com/*
// @version     0.0.1 20180616
// @require     https://code.jquery.com/jquery-3.3.1.min.js
// @require     http://cdn.datatables.net/1.10.17/js/jquery.dataTables.min.js
// @grant       none
// ==/UserScript==
let dataKey = 'opranalyzer';
let data = localStorage.getItem(dataKey);

let elements = document.getElementsByClassName('gold pull-right');

if (elements.length > 2) {

  let total = parseInt(elements[0].innerText);
  let live = parseInt(elements[1].innerText);
  let fail = parseInt(elements[2].innerText);
  let date = new Date();
  let yester = new Date();
  yester.setHours(yester.getHours() - 33); // 昨日の日付のGMT

  if (data == null || data == 'null') {
    data = {daily:{}, pre:{live:live, fail:fail}, start: date.getTime(), locations:{}};
    data.daily[yester.toLocaleDateString()] = {total: total, live: live, fail:fail};
    localStorage.setItem(dataKey, JSON.stringify(data));
  } else {
    data = JSON.parse(data);
  }

  if (data.daily[yester.toLocaleDateString()] == null) {
    data.daily[yester.toLocaleDateString()] = {total: total, live: live, fail:fail};
  }

  let days = (date.getTime() - data.start) / (1000*60*60*24);
  let performance = document.getElementsByTagName('img')[1].getAttribute('ng-src').split('/')[2].split('.')[0];
  let percentage = parseInt((live + fail) / total * 10000) / 100;
  let todayTotal = total - data.daily[yester.toLocaleDateString()].total;
  let todayLive = live - data.daily[yester.toLocaleDateString()].live;
  let todayFail = fail - data.daily[yester.toLocaleDateString()].fail;


  if (todayLive != data.pre.live) {
    data.pre.live = todayLive;
    todayLive = '<font color="red">' + todayLive + '</font>';
  }
  if (todayFail != data.pre.fail) {
    data.pre.fail = todayFail;
    todayFail = '<font color="red">' + todayFail + '</font>';
  }

  localStorage.setItem(dataKey, JSON.stringify(data));

  switch (performance) {
      case 'poor' :
          performance = '<font color="red">' + performance.toUpperCase() + '</font>';
          break;
      case 'good' :
          performance = '<font color="orange">' + performance.toUpperCase() + '</font>';
          break;
      case 'great' :
          performance = '<font color="green">' + performance.toUpperCase() + '</font>';
          break;
  };
  let container = document.getElementsByClassName('container')[2];
  let start = new Date();
  start.setTime(data.start);
  let startValue = start.getFullYear() + '-' + ("0"+(start.getMonth()+1)).slice(-2) + '-' + ("0"+start.getDate()).slice(-2);
  let allTime = 0;
  let evalNum = {'許可':0,'却下':0,'重複':0,'修正':0};
  let resultNum = {'OK':0,'NG':0,'未確認':0};
  let avgEval = [0,0,0,0,0,0];
  for (let key in data.locations) {
    let value = data.locations[key];
    allTime += value.end - value.start;
    evalNum[value.evaluation[0]]++;
    if (value.evaluation[0] == '許可') {
      for (let i = 0; i < 6; i++) {
        avgEval[i] += value.evaluation[i+1];
      }
    }
    if (value.result == 'ライブ') {
      if (value.evaluation[0] == '許可') {
        resultNum['OK']++;
      } else {
        resultNum['NG']++;
      }
    } else if (value.result == 'リジェクト') {
      if (value.evaluation[0] == '却下') {
        resultNum['OK']++;
      } else {
        resultNum['NG']++;
      }
    } else {
      resultNum['未確認']++;
    }
  }
  for (let i = 0; i < avgEval.length; i++) {
    avgEval[i] = parseInt(avgEval[i]/evalNum['許可']*10)/10;
  }
  let locSize = Object.keys(data.locations).length;
  evalNum['許可'] = ' 許可:' + evalNum['許可'] + ' [' + (parseInt(evalNum['許可']/locSize*10000)/100) + '%]';
  evalNum['却下'] = ' 却下:' + evalNum['却下'] + ' [' + (parseInt(evalNum['却下']/locSize*10000)/100) + '%]';
  evalNum['重複'] = ' 重複:' + evalNum['重複'] + ' [' + (parseInt(evalNum['重複']/locSize*10000)/100) + '%]';
  evalNum['修正'] = ' 修正:' + evalNum['修正'] + ' [' + (parseInt(evalNum['修正']/locSize*10000)/100) + '%]';

  let avgTime = parseInt(allTime/locSize/1000);
  let status = '本日(完了:' + todayTotal + ' ライブ:' + todayLive + ' 却下:' + todayFail + ')' +
    ' 全期間(完了:' + total + ' [' + parseInt(total / days) + '/日] ライブ:' + live + ' 却下:' + fail +
    ' パフォーマンス:' + performance + ' [' + percentage +'%]) 開始日:<input type="date" value="' + startValue + '" id="startDate" size="7" /><br>' +
    '審査時間:' + parseInt(allTime/1000/60/60) + '時間' + parseInt(allTime/1000/60%60) + '分 [平均:' + avgTime + '秒' + ']' +
    ' 審査記録(合計:' + locSize + evalNum['許可'] + evalNum['却下'] + evalNum['重複'] + evalNum['修正'] + ' 平均評価:' + avgEval.join('|') + ')' +
    ' 結果差異(OK:' + resultNum['OK'] + ' NG:' + resultNum['OK'] + ' 未確認:' + resultNum['未確認'] + ')';
  let p = document.createElement('p');
  p.innerHTML = status;
  container.insertBefore(p, container.firstChild);

  let tweet = document.createElement('li');
  tweet.innerHTML = '<a href=https://twitter.com/intent/tweet?text="' + encodeURI('全期間' + status.replace(/<.+?>/g, '').replace('開始日:', "").split('全期間')[1]) + '&hashtags=opranalyzer" target="_blink">ツイート</a>';
  document.getElementsByClassName('nav navbar-nav')[0].appendChild(tweet);

  let startDate = document.getElementById('startDate');
  startDate.addEventListener('change', function(e) {
    let value = e.target.value.split('-');
    start.setFullYear(parseInt(value[0]));
    start.setMonth(parseInt(value[1])-1);
    start.setDate(parseInt(value[2]));
    data.start = start.getTime();
    localStorage.setItem(dataKey, JSON.stringify(data));
  });

  let desc = document.getElementById("descriptionDiv");
  if (desc != null) {
    window.addEventListener('beforeunload', (e) => {
      let title = decodeURI(desc.getElementsByTagName('a')[0].href.split("q=")[1]);
      let location = desc.getElementsByTagName('a')[1].href.split("@")[1];
      let address = desc.getElementsByTagName('span')[0].innerHTML;
      let evaluation = ['不明'];
      // 修正時はタイトルが取れない
      if (title != '') {
        let stars = document.getElementsByClassName('btn-group');
        evaluation = ['許可'];
        for (let i = 0; i < 9; i++) {
          if (i == 1 || i == 2 || i ==3) {
            // ダミー？なのでパス
            continue;
          }
          let star = stars[i].getElementsByTagName('button');
          let starNum = 0;
          for (; starNum < star.length; starNum++) {
            if (star[starNum].getAttribute('class').indexOf('active') != -1) {
              break;
            }
          }
          // 総合評価が★１は却下
          if (i == 0 && starNum == 0) {
            evaluation = ['却下'];
            break;
          }
          // ★０が一つでもあれば重複
          if (starNum == 5) {
            evaluation = ['重複'];
            break;
          }
          evaluation.push(starNum+1);
        }
      } else {
        title = '(修正のため取得できませんでした)';
        evaluation = ['修正'];
      }
      data.locations[location] = {title: title, address: address, evaluation: evaluation, result: '未確認', start: date.getTime(), end: new Date().getTime()};
      localStorage.setItem(dataKey, JSON.stringify(data));
    });
    let observer = new MutationObserver(function (MutationRecords, MutationObserver) {
      let location = desc.getElementsByTagName('a')[1].href.split("@")[1];
      if (location != ',') {
        let link = document.createElement('li');
        link.innerHTML = '<a href="https://www.ingress.com/intel?ll=' + location + '" target="_blink">IntelMap</a>';
        document.getElementsByClassName('nav navbar-nav')[0].appendChild(link);
      }
    });
    observer.observe(desc.getElementsByTagName('a')[1], {attributes: true});
  }

  if (window.location.href == 'https://opr.ingress.com/' || window.location.href == 'https://opr.ingress.com/?login=true' || window.location.href == 'https://opr.ingress.com/#') {  
    let link = document.createElement('link');
    link.type = 'text/css';
    link.rel  = 'stylesheet';
    link.href = 'https://cdn.datatables.net/1.10.18/css/jquery.dataTables.min.css';
    document.getElementsByTagName('head')[0].appendChild(link);

    $(function(){
      var style = '<style type="text/css">';
      style += 'tbody td{color: black;}';
      $('head').append(style);
    });

    let h1 = document.createElement('h1');
    h1.textContent = '審査箇所一覧';
    container.appendChild(h1);
    let keys = Object.keys(data.locations);
    let locDataSet = [];
    let csvData = ['"緯度,軽度","タイトル[評価]","住所","審査日"'];
    keys.forEach((e, i) => {
      let location = data.locations[e];
      let start = new Date();
      start.setTime(data.locations[e].start);
      let end = new Date();
      end.setTime(data.locations[e].end);
      let time = (end.getTime() - start.getTime()) / 1000;
      locDataSet.push([
        start.toLocaleString(),
        parseInt(time/60) + '分' + parseInt(time%60) + '秒',
        location.title,
        location.address,
        location.evaluation,
        location.evaluation,
        location.evaluation,
        location.evaluation,
        location.evaluation,
        location.evaluation,
        location.evaluation,
        location.result,
        e
        ]);
      csvData.push('"' + e + '","' + location.title + '[' + location.evaluation.join('|') + ']","' + location.address + '",' + start.toLocaleString().slice(0, -3));
    });
    let download = document.createElement('li');
    download.innerHTML = '<a href="' + URL.createObjectURL(new Blob([csvData.join('\n')], {type: "text/plain"})) + '" download="location.csv">CSVダウンロード</a>';
    document.getElementsByClassName('nav navbar-nav')[0].appendChild(download);

    let locTable = document.createElement('table');
    locTable.setAttribute('class', 'display compact');
    locTable.setAttribute('style', 'width:100%;');
    locTable.setAttribute('id', 'locations');
    container.appendChild(locTable);

    let locDataTable = $('#locations').DataTable({
      data: locDataSet,
      columns: [
        {title: '審査日', render: function(d, t, r, m){return d.slice(0, -3)}},
        {title: '審査時間'},
        {title: 'タイトル'},
        {title: '住所', targets:0},
        {title: '種類', render: function(d, t, r, m){return d[0];}},
        {title: '総合', render: function(d, t, r, m){return (d.length > 1) ? d[1] : '';}},
        {title: '名称', render: function(d, t, r, m){return (d.length > 1) ? d[2] : '';}},
        {title: '歴史', render: function(d, t, r, m){return (d.length > 1) ? d[3] : '';}},
        {title: '個性', render: function(d, t, r, m){return (d.length > 1) ? d[4] : '';}},
        {title: '位置', render: function(d, t, r, m){return (d.length > 1) ? d[5] : '';}},
        {title: '安全', render: function(d, t, r, m){return (d.length > 1) ? d[6] : '';}},
        {title: '結果'},
        {title: 'Map', render: function(d, t, r, m){return '<a href="https://www.ingress.com/intel?ll=' + d + '" target="_blink">■</a>';}}
      ],
      order: [[0, 'desc']]
    });
    $('#locations tbody').on('click', 'tr', function() {
      let rowData = locDataTable.row(this).data();
      if (rowData == null) {
        return;
      }
      data.locations[rowData[12]].result = (rowData[11] == '未確認') ? 'ライブ' : ((rowData[11] == 'ライブ') ? 'リジェクト' : '未確認');
      rowData[11] = data.locations[rowData[12]].result;
      locDataTable.row(this).node().getElementsByTagName('td')[11].innerHTML = rowData[11];
      localStorage.setItem(dataKey, JSON.stringify(data));
    });

    let h2 = document.createElement('h1');
    h2.textContent = 'デイリー進捗';
    container.appendChild(h2);
    let deleteButton = document.createElement('input');
    deleteButton.type = 'button';
    deleteButton.value = '審査記録削除';
    deleteButton.style = 'color:black';
    deleteButton.addEventListener('click', (e) => {
      if (window.confirm('保存データを削除しますがよろしいですか？')) {
        localStorage.removeItem(dataKey);
        alert('削除が完了しました');
        window.location.reload();
      }
    });
    container.appendChild(deleteButton);

    let dailyTable = document.createElement('table');
    dailyTable.setAttribute('class', 'display compact');
    dailyTable.setAttribute('style', 'width:100%');
    dailyTable.setAttribute('id', 'daily');
    container.appendChild(dailyTable);

    let dailyDataSet = [[date.toLocaleDateString(), total, live, fail, parseInt((live + fail) / total * 10000) / 100 + '%']];
    for (let dKey in data.daily) {
      dailyDataSet.push([
        dKey,
        data.daily[dKey].total,
        data.daily[dKey].live,
        data.daily[dKey].fail,
        parseInt((data.daily[dKey].live + data.daily[dKey].fail) / data.daily[dKey].total * 10000) / 100 + '%',
      ])
    }
    $('#daily').DataTable({
      data: dailyDataSet,
      columns: [
        {title: '日付'},
        {title: 'トータル'},
        {title: 'ライブ'},
        {title: '拒否'},
        {title: '(ライブ+拒否)/トータル'}
      ],
      order: [[0, 'desc']]
    });
  }
}