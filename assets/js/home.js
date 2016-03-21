
// IDEA: Split functions into another javascript files
// IDEA: angular.js for the library

var fs = require('fs');
var Path = require('path');
var mm = require('musicmetadata');
var remote = require('remote');
var uuidGen = require('uuid');
var debug = true;
var howler = require('howler');

Array.prototype.extend = function(other_array) {
  if (other_array.constructor !== Array) return;
  other_array.forEach(function(v) {
    this.push(v);
  }, this);
};

var enumTypeUpdate = {
  NEW_ARTIST: 0,
  NEW_ALBUM: 1,
  NEW_MUSIC: 2
};

var enumMusicState = {
  PLAYING:0,
  PAUSED:1,
  STOPPED:2
};

var data = [];
var playing = {music:null , state:enumMusicState.STOPPED};

var conf = remote.getGlobal('sharedObj').conf;

$('#volume-gen').slider();
$('#timeline-gen').slider();

$('#music-timeline').css('width', '100%');
$('#music-volume').css('width', '100%');

$(window).resize(function() {
  $('#library').height($(document).height() - $('#header').height());
  console.log($('#header').height());
  console.log($(document).height());

  if (Modernizr.mq('only screen and (max-width: 644px)')) {
    console.log('modernizer');
    $('#basic-controls').removeClass('col-xs-4');
    $('#basic-controls').addClass('col-xs-12');

    $('#realtime-info').removeClass('col-xs-8');
    $('#realtime-info').addClass('col-xs-12');

    $('#music-volume').css('width', '50%');
  }
  if (Modernizr.mq('only screen and (min-width: 644px)')) {
    console.log('modernizer');

    $('#basic-controls').removeClass('col-xs-12');
    $('#basic-controls').addClass('col-xs-4');

    $('#realtime-info').removeClass('col-xs-12');
    $('#realtime-info').addClass('col-xs-8');
    $('#music-volume').css('width', '100%');
  }

});

$('#library').on('dragover', function(event) {
  event.stopPropagation();
  event.preventDefault();
});

$('#library').on('drop', function(event) {
  event.stopPropagation();
  event.preventDefault();
  var dt = event.dataTransfer || (event.originalEvent && event.originalEvent.dataTransfer);
  var files = event.target.files || (dt && dt.files);

  console.log('Dropped files: ' + files.length);
  var pack = [];

  for (var i = 0; i < files.length; i++) {
    console.log(files[i].path);
    var checkedFiles = checkFile(files[i].path);
    if (checkedFiles !== null) pack.extend(checkedFiles);
  }
  console.log('Pack length: ' + pack.length);

  for (var j = 0; j < pack.length; j++) {
    organizeMediaFiles(pack[j]);
  }
});

$('#play-btn').on('click', function(event){
  if(playing.music !== null && playing.state == enumMusicState.PAUSED){
    playing.music.play();
    playing.state = enumMusicState.PLAYING;
  }
});
$('#pause-btn').on('click', function(event){
  if(playing.music !== null && playing.state == enumMusicState.PLAYING){
    playing.music.pause();
    playing.state = enumMusicState.PAUSED;
  }
});
$('#stop-btn').on('click', function(event){
  if(playing.music !== null) playing.music.stop();
  playing.music = null;
  playing.state = enumMusicState.STOPPED;
});

function checkFile(path) {
  var pack = [];
  if (debug) console.log('Checking file at path: ' + path);

  var stat = fs.statSync(path);

  if (stat.isDirectory()) {
    if (debug) console.log('Path is a directory');
    var mediaFilePack = getMediaFiles(path);
    if (mediaFilePack !== null) pack = mediaFilePack;
  } else if (stat.isFile()) {
    if (debug) console.log('Path is a file');
    if (checkMediaFile(path)) pack.push(path);
  }

  if (debug) console.log('Returning: ' + pack.length);
  return (pack.length !== 0) ? pack : null;
}

function getMediaFiles(path) {
  var pack = [];

  if (debug) console.log('Getting media files');

  var files = fs.readdirSync(path);

  if (debug) console.log('Reading dir');

  for (var i = 0; i < files.length; i++) {
    var subPath = path + '/' + files[i];
    if (debug) console.log('Checking: ' + subPath);
    if (checkMediaFile(subPath)) pack.push(subPath);
  }

  if (debug) console.log('Returning: ' + pack.length);
  return (pack.length !== 0) ? pack : null;
}

function checkMediaFile(path) {
  var check = false;
  var stat = fs.statSync(path);

  check = (stat.isFile() && checkMediaFileExtension(path)) ? true : false;

  console.log(check);
  return check;
}

function checkMediaFileExtension(path) {
  return (Path.extname(Path.basename(path)) == ".mp3") ? true : false;
}

function organizeMediaFiles(filePath) {
  var parser = mm(fs.createReadStream(filePath), {
    duration: true
  }, function(err, metadata) {
    if (err) throw err;
    console.log(metadata);
    addToLibrary(metadata, filePath);
  });
}

function addToLibrary(metadata, path) {

  var holder = null;

  console.log(data);
  var i, j, k;
  for (i = 0; i < data.length; i++) {
    if (data[i].artist === metadata.artist[0]) {
      for (j = 0; j < data[i].album.length; j++) {
        console.log(data[i].album.length);
        console.log(j);
        console.log('Stored album name: ' + data[i].album[j].name + ' Delivered: ' + metadata.album);
        if (data[i].album[j].name === metadata.album) {
          for (k = 0; k < data[i].album[j].music.length; k++) {
            if (data[i].album[j].music[k].title === metadata.title) {
              return;
            }
          }
          console.log('new music');
          holder = {
            uuid: 'music_' + uuidGen.v1(),
            path: path,
            title: metadata.title,
            track: metadata.track.no,
            duration: metadata.duration
          };
          data[i].album[j].music.push(holder);
          console.log(data[i].album[j].uuid);
          displayToLibrary(enumTypeUpdate.NEW_MUSIC, holder, data[i].album[j].uuid);
          //conf.set('data', data);
          return;
        }
      }
      console.log('new album');
      holder = {
        uuid: 'album_' + uuidGen.v1(),
        name: metadata.album,
        picture: {
          format: metadata.picture[0].format,
          data: metadata.picture[0].data
        },
        music: [{
          uuid: 'music_' + uuidGen.v1(),
          path: path,
          title: metadata.title,
          track: metadata.track.no,
          duration: metadata.duration
        }]
      };
      data[i].album.push(holder);
      displayToLibrary(enumTypeUpdate.NEW_ALBUM, holder, data[i].uuid);
      //conf.set('data', data);
      return;
    }
  }
  console.log('new artist');
  holder = {
    uuid: 'band_' + uuidGen.v1(),
    artist: metadata.artist[0],
    album: [{
      uuid: 'album_' + uuidGen.v1(),
      name: metadata.album,
      picture: {
        format: metadata.picture[0].format,
        data: metadata.picture[0].data
      },
      music: [{
        uuid: 'music_' + uuidGen.v1(),
        path: path,
        title: metadata.title,
        track: metadata.track.no,
        duration: metadata.duration
      }]
    }]
  };
  data.push(holder);
  displayToLibrary(enumTypeUpdate.NEW_ARTIST, holder);
  //conf.set('data', data);
  return;
}

function displayToLibrary(type, obj, info) {
  var library = document.getElementById('library');
  var artist,
    row,
    colFour,
    canvas,
    colEight,
    table,
    tr,
    tdTrack,
    tdTitle,
    line,
    albumNameHolder,
    albumName;

  switch (type) {
    case enumTypeUpdate.NEW_ARTIST:
      artist = document.createElement('div');
      artist.id = obj.uuid;

      var artistNameHolder = document.createElement('div');

      var artistName = document.createElement('h4');
      artistName.innerHTML = obj.artist;
      artistNameHolder.appendChild(artistName);

      line = document.createElement('hr');
      artistNameHolder.appendChild(line);

      artist.appendChild(artistNameHolder);

      row = document.createElement('div');
      row.className = 'row';
      row.id = obj.album[0].uuid;

      albumNameHolder = document.createElement('div');
      albumNameHolder.className = 'col-xs-12';

      albumName = document.createElement('h5');
      albumName.innerHTML = obj.album[0].name;

      line = document.createElement('hr');

      albumNameHolder.appendChild(albumName);
      albumNameHolder.appendChild(line);

      row.appendChild(albumNameHolder);

      colFour = document.createElement('div');
      colFour.className = 'col-xs-4';

      canvas = document.createElement('canvas');
      canvas.width = '100';
      canvas.height = '100';

      setImage(obj.album[0].picture.data , obj.album[0].picture.format , canvas);

      colEight = document.createElement('div');
      colEight.className = 'col-xs-8';

      table = document.createElement('table');
      table.className = 'table';

      tr = table.insertRow();
      tr.id = obj.album[0].music[0].uuid;

      tr.addEventListener('dblclick' , play , false);

      tdTrack = tr.insertCell(0);
      tdTrack.innerHTML = obj.album[0].music[0].track;

      tdTitle = tr.insertCell(1);
      tdTitle.innerHTML = obj.album[0].music[0].title;

      artist.appendChild(row);
      row.appendChild(colFour);
      colFour.appendChild(canvas);
      row.appendChild(colEight);
      colEight.appendChild(table);
      library.appendChild(artist);
      break;
    case enumTypeUpdate.NEW_ALBUM:
      artist = document.getElementById(info);

      row = document.createElement('div');
      row.className = 'row';
      row.id = obj.uuid;

      albumNameHolder = document.createElement('div');
      albumNameHolder.className = 'col-xs-12';

      albumName = document.createElement('h5');
      albumName.innerHTML = obj.name;

      line = document.createElement('hr');

      albumNameHolder.appendChild(albumName);
      albumNameHolder.appendChild(line);

      row.appendChild(albumNameHolder);

      colFour = document.createElement('div');
      colFour.className = 'col-xs-4';

      canvas = document.createElement('canvas');
      canvas.width = '100';
      canvas.height = '100';
      canvas.setAttribute('style', 'border:1px solid #000000;');

      colEight = document.createElement('div');
      colEight.className = 'col-xs-8';

      table = document.createElement('table');
      table.className = 'table';

      tr = table.insertRow();
      tr.id = obj.music[0].uuid;
      tr.addEventListener('dblclick' , play , false);

      tdTrack = tr.insertCell(0);
      tdTrack.innerHTML = obj.music[0].track;

      tdTitle = tr.insertCell(1);
      tdTitle.innerHTML = obj.music[0].title;

      row.appendChild(colFour);
      colFour.appendChild(canvas);
      row.appendChild(colEight);
      colEight.appendChild(table);
      artist.appendChild(row);
      break;
    case enumTypeUpdate.NEW_MUSIC:
      table = document.getElementById(info).getElementsByClassName('col-xs-8')[0].getElementsByTagName('table')[0];

      tr = table.insertRow();
      tr.id = obj.uuid;
      tr.addEventListener('dblclick' , play , false);

      tdTrack = tr.insertCell(0);
      tdTrack.innerHTML = obj.track;

      tdTitle = tr.insertCell(1);
      tdTitle.innerHTML = obj.title;
      break;
  }
}

function setImage(unitArray, format, canvas) {
  var u8 = new Uint8Array(unitArray);
  var b64encoded = btoa(Uint8ToString(u8));

  var ctx = canvas.getContext("2d");

  var image = new Image();

  image.onload = function() {
    ctx.drawImage(image, 0, 0 , 100 , 100);
  };
  image.src = 'data:image/' + format + ';base64,' + b64encoded;
}

function Uint8ToString(u8a){
  var CHUNK_SZ = 0x10000;
  var c = [];
  for (var i=0; i < u8a.length; i+=CHUNK_SZ) {
    c.push(String.fromCharCode.apply(null, u8a.subarray(i, i+CHUNK_SZ)));
  }
  return c.join("");
}

function play(){
  console.log('play active' + this.id);
  var music = getObjects(data , 'uuid' , this.id);
  console.log(music);
  console.log(music[0].path);
  if(playing.music === null){
    playing.music = new howler.Howl({urls: [music[0].path] , html5:true}).play();
    playing.state = enumMusicState.PLAYING;
    }
  else{
    playing.music.stop();
    playing.state = enumMusicState.STOPPED;
    playing.music = null;
    playing.music = new howler.Howl({urls: [music[0].path]}).play();
    playing.state = enumMusicState.PLAYING;
  }
}

function getObjects(obj, key, val) {
    var objects = [];
    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        if (typeof obj[i] == 'object') {
            objects = objects.concat(getObjects(obj[i], key, val));
        } else if (i == key && obj[key] == val) {
            objects.push(obj);
        }
    }
    return objects;
}