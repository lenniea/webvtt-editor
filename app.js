'use strict';

// min.js
window.log = console.log;
window.$ = document.querySelector.bind(document);
EventTarget.prototype.on = EventTarget.prototype.addEventListener;
EventTarget.prototype.off = EventTarget.prototype.removeEventListener;
if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
}

function pad2(s) {return s < 10 ? '0' + s : s;}
function pad3(s) {return s < 100 ? '0' + pad2(s) : s;}
function secondsToTime(secs) {
    return pad2((secs / 3600) | 0) + ':' + pad2((secs % 3600 / 60) | 0) + ':' + pad2((secs % 60) | 0) + '.' + pad3(((secs % 1)*1000) | 0);
}
function generateID() {
    return Math.random().toString(36).substring(2, 15);
}
function getOptionText(s,align,size,top,left,bot,right) {
    if (s=='TL') return ' align:'+align+' size:'+size+'% position:'+left+'% line:'+top+'%';
    if (s=='TR') return ' align:'+align+' size:'+size+'% position:'+right+'% line:'+top+'%';
    if (s=='BL') return ' align:'+align+' size:'+size+'% position:'+left+'% line:'+bot+'%';
    if (s=='BR') return ' align:'+align+' size:'+size+'% position:'+right+'% line:'+bot+'%';
    return '';
}
window.on('load', function() {
    var _dropTarget = document.documentElement;
    var _body = document.body;
    var _cueList = [];
    var _cueRows = new WeakMap();
    var _track = null;
    var _video = $('#video');
    var _timer = $('#timer');
    var _progress = $('#progress');
    var _cues = $('#cues');
    var _playPause = $('#playPause');
    var _addCueButton = $('#addCue');
    var _sortCuesButton = $('#sortCues');
    var _exportVTTButton = $('#exportVTT');
    var _posSelect = $('#pos');
    var _previewButton = $('#previewButton');
    var _importVideoButton = $('#importVideo');
    var _importVideoFile = $('#importVideoFile');
    var _importVTTButton = $('#importVTT');
    var _importVTTFile = $('#importVTTFile');
    var _vttFilename = '';
    function skipTime(seconds) {
        _video.currentTime += seconds;
    }
    function togglePlayPause() {
        if (_video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        if (_video.paused) {
            _video.play();
            _playPause.classList.remove('paused');
        } else {
            _video.pause();
            _playPause.classList.add('paused');
        }
    }
    function initVideo() {
        _video.on('click', function() {
            togglePlayPause();
        });
        _video.on('timeupdate', function() {
            _timer.textContent = secondsToTime(_video.currentTime);
            if (isFinite(_video.duration)) {
                _progress.value = Math.round((_video.currentTime / _video.duration) * 100);
            } else {
                _progress.value = 0;
            }
        });
    }
    _playPause.on('click', function() {
        togglePlayPause();
    });
    initVideo();
    function insertNewVTTCue(cue) {
        var vtt_cue = new VTTCue(cue.start, cue.end, cue.text);
        vtt_cue.id = generateID();
        _track.addCue(vtt_cue);
        cue.cue_id = vtt_cue.id;
    }
    function getCueEntryByCueID(cue_id) {
        return _cueList.find(function(cue) {
            return cue.cue_id === cue_id;
        });
    }
    function writeCueList(cues) {
        _cueList = cues;
        _track = _video.addTextTrack('subtitles', 'English', 'en');
        var list = '';
        cues.forEach(function(cue, i) {
            if (cue.start !== null && cue.end !== null) {
                insertNewVTTCue(cue);
            }
            list += '<tr><td class="id">' + (i + 1) + '</td><td><button type="button" class="jumpCue" title="Jump to cue">&#8677;</button><td><span class="timestamp">' + (cue.start === null ? '<button type="button" class="insertTime start" title="Set current time">Set time</button></span>' : secondsToTime(cue.start) + '</span> <button type="button" class="insertTime update start" title="Set current time">&#128336;</button>') + '</td><td><span class="timestamp">' + (cue.end === null ? '<button type="button" class="insertTime end" title="Set current time">Set time</button></span>' : secondsToTime(cue.end) + '</span> <button type="button" class="insertTime update end" title="Set current time">&#128336;</button>') + '</td><td class="textinput"><textarea>' + cue.text + '</textarea><button type="button" class="apply-text" title="Apply text">&#10003;</button></td><td><button type="button" class="delete-cue" title="Delete cue">&times;</button></td></tr>';
        });
        _cues.innerHTML = list;
        _cues.querySelectorAll('tr').forEach(function(row, i) {
            var cue = _cueList[i];
            _cueRows.set(row, cue);
            cue.row = row;
        });
        _track.mode = 'showing';
        _track.on('cuechange', function() {
            _cues.querySelectorAll('tr.active').forEach(function(row) {
                row.classList.remove('active');
            });
            if (_track.activeCues.length === 0) return;
            Array.from(_track.activeCues).forEach(function(entry) {
                var activeID = entry.id;
                var cue = getCueEntryByCueID(activeID);
                cue.row.classList.add('active');
            });
        });
    }
    _addCueButton.on('click', function() {
        var row;
        var id = _cueList.length;
        var entry = {'start': null, 'end': null, 'text': ''};
        _cueList.push(entry);
        _cues.insertAdjacentHTML('beforeend', '<tr class="incomplete"><td class="id">' + (id + 1) + '</td><td><button type="button" class="jumpCue" title="Jump to cue">&#8677;</button><td><span class="timestamp"><button type="button" class="insertTime start" title="Set current time">Set time</button></span></td><td><span class="timestamp"><button type="button" class="insertTime end" title="Set current time">Set time</button></span></td><td class="textinput"><textarea></textarea><button type="button" class="apply-text" title="Apply text">&#10003;</button></td><td><button type="button" class="delete-cue" title="Delete cue">&times;</button></td></tr>');
        row = _cues.querySelector('tr:last-child');
        entry.row = row;
        _cueRows.set(row, entry);
    });
    _exportVTTButton.on('click', function() {
        var blob, url, link;
        var content = 'WEBVTT' +'\nLanguage: en\n';
        _sortCuesButton.click();
        _cueList.filter(function(cue) {
            return (cue.start !== null && cue.end !== null);
        }).sort(function(a, b) {
            var startDiff = a.start - b.start;
            if (startDiff == 0)
                return 1;
            return startDiff;
        }).forEach(function(cue,index) {
            content += '\n\n' + secondsToTime(cue.start, true) + ' --> ' + secondsToTime(cue.end, true);
            var posOption = _posSelect.value;
            content += (index == 0) && (cue.text.length > 9)
                        ? getOptionText(posOption,'start',25,10,0,90,70)
                        : getOptionText(posOption,'end',5,10,30,90,100);
            content += '\n' + cue.text;
        });
        blob = new Blob([content], {'type': 'text/vtt'});
        url = URL.createObjectURL(blob);
        link = document.createElement('a');
        link.download = _vttFilename || 'subtitles.vtt';
        link.href = url;
        link.click();
    });
    _progress.on('click', function(event) {
        var x = event.pageX - this.offsetLeft;
        var y = event.pageY - this.offsetTop;
        var clickedValue = x * this.max / this.offsetWidth;
        if (_video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        if (isFinite(_video.duration)) {
            _video.currentTime = _video.duration / 100 * clickedValue;
        }
    });
    _previewButton.on('click', function() {
        document.body.classList.toggle('preview');
    });
    function sortCueList(a, b) {
        var startDiff = a.start - b.start;
        if (a.start === null) {
            return 1;
        }
        if (b.start === null) {
            return -1;
        }
        if (startDiff === 0) {
            return 1;
        }
        return startDiff;
    }
    _sortCuesButton.on('click', function() {
        _cueList.sort(sortCueList);
        _cueList.forEach(function(cue, i) {
            _cues.appendChild(cue.row);
            cue.row.querySelector('td.id').textContent = (i + 1);
        });
    });
    function updateRowNumbers() {
        _cues.querySelectorAll('tr').forEach(function(row, i) {
            row.querySelector('td.id').textContent = (i + 1);
        });
    }
    document.on('click', function(event) {
        var id, cue, cue2, row, time, timestamp, temp, was_incomplete, is_incomplete;
        var element = event.target;
        var remove = element.closest('.delete-cue');
        var jump = element.closest('.jumpCue');
        var setTime = element.closest('.insertTime');
        var button = element.closest('button');
        if (button) {
            button.blur();
        }
        if (jump) {
            row = jump.closest('tr');
            cue = _cueRows.get(row);
            if (cue.start !== null) {
                _video.currentTime = cue.start;
            }
            return;
        }
        if (remove) {
            row = remove.closest('tr');
            cue = _cueRows.get(row);
            id = _cueList.indexOf(cue);
            cue.row = null;
            _cueRows.delete(row);
            _cueList.splice(id, 1);
            if (cue.cue_id !== undefined) {
                _track.removeCue(_track.cues.getCueById(cue.cue_id));
                reinitCues();
            }
            _cues.removeChild(row);
            updateRowNumbers();
            return;
        }
        if (setTime) {
            row = element.closest('tr');
            cue = _cueRows.get(row);
            time = _video.currentTime;
            was_incomplete = (cue.start === null || cue.end === null);
            timestamp = element.closest('td').querySelector('span.timestamp');
            if (element.classList.contains('start')) {
                if (cue.end !== null && time > cue.end) {
                    alert('Der Startpunkt kann nicht nach dem Ende sein.');
                    return;
                }
                if (cue.start === null) {
                    timestamp.insertAdjacentHTML('afterend', ' <button type="button" class="insertTime update start" title="Set current time">&#128336;</button>');
                }
                cue.start = time;
                if (cue.cue_id !== undefined) {
                    _track.cues.getCueById(cue.cue_id).startTime = time;
                    reinitCues();
                }
            }
            else if (element.classList.contains('end')) {
                if (cue.start !== null && time < cue.start) {
                    alert('Der Endpunkt kann nicht vor dem Start sein.');
                    return;
                }
                if (cue.end === null) {
                    timestamp.insertAdjacentHTML('afterend', ' <button type="button" class="insertTime update end" title="Set current time">&#128336;</button>');
                }
                cue.end = time;
                if (cue.cue_id !== undefined) {
                    _track.cues.getCueById(cue.cue_id).endTime = time;
                    reinitCues();
                }
            }
            is_incomplete = (cue.start === null || cue.end === null);
            timestamp.textContent = secondsToTime(time);
            if (was_incomplete && !is_incomplete) {
                insertNewVTTCue(cue);
            }
            return;
        }
    });
    document.on('keyup', function(event) {
        if (event.target.nodeName === 'TEXTAREA' && !_video.paused) {
            _video.pause();
        }
    });
    document.on('keydown', function(event) {
        var code = event.code;
        var node = event.target.nodeName;
        if (node === 'TEXTAREA' || node === 'BUTTON') return;
        if (code === 'ArrowRight') {
            event.altKey ? skipTime(0.5) : skipTime(2);
        }
        else if (code === 'ArrowLeft') {
            event.altKey ? skipTime(-0.5) : skipTime(-2);
        }
        else if (code === 'Space') {
            togglePlayPause();
        }
        else if ((code === 'Escape' || code === 'Esc') && document.body.classList.contains('preview')) {
            document.body.classList.toggle('preview');
        }
    });
    document.on('change', function(event) {
        var content, row, cue;
        var element = event.target;
        if (element.nodeName === 'TEXTAREA') {
            content = element.value;
            row = element.closest('tr');
            cue = _cueRows.get(row);
            cue.text = content;
            if (cue.cue_id !== undefined) {
                _track.cues.getCueById(cue.cue_id).text = content;
                reinitCues();
            }
            element.closest('td').classList.remove('changed');
        }
    });
    document.on('input', function(event) {
        var row, cue;
        var element = event.target;
        if (element.nodeName !== 'TEXTAREA') return;
        row = element.closest('tr');
        cue = _cueRows.get(row);
        element.parentElement.classList.toggle('changed', cue.text !== element.value);
    });
    _importVideoButton.on('click', () => {
        _importVideoFile.click();
    });
    _importVideoFile.on('change', function(event) {
        var file, url;
        var input = event.target;
        var files = input.files;
        try {
            if (files.length < 1) throw new Error('no file');
            file = files[0];
            if (file.size === 0) throw new Error('file empty');
            if (file.type.indexOf('video/') !== 0) throw new Error('invalid file format');
            if (_vttFilename === '') {
                _vttFilename = file.name.substring(0, file.name.lastIndexOf('.'));
            }
            url = URL.createObjectURL(file);
            _video.pause();
            _video.currentTime = 0;
            _video.src = url;
            if (_cueList.length === 0) {
                writeCueList([]);
            }
        } catch(e) {
            alert(e.message);
        } finally {
            resetFileInput(input);
        }
    });
    _importVTTButton.on('click', function() {
        _importVTTFile.click();
    });
    _importVTTFile.on('change', function(event) {
        var file, video, url, track;
        var input = event.target;
        var files = input.files;
        try {
            if (files.length < 1) throw new Error('no file');
            file = files[0];
            if (file.size === 0) throw new Error('file empty');
            if (_cueList.length > 0 && confirm('Load VTT will clenaup the current cues.\nContinue?') !== true) {
                return;
            }
            video = document.createElement('video');
            url = URL.createObjectURL(file);
            track = document.createElement('track');
            track.kind = 'subtitles';
            track.label = 'English';
            track.srclang = 'en';
            track.on('error', function() {
                alert('Invalid VTT file.');
            });
            track.on('load', function() {
                var list;
                _cueList.forEach(function(cue) {
                    _cueRows.delete(cue.row);
                    cue.row = null;
                });
                if (_track) {
                    _track.mode = 'disabled';
                    _track = null;
                }
                _vttFilename = file.name;
                list = Array.from(this.track.cues).map(function(cue) {
                    return { 'start': cue.startTime, 'end': cue.endTime, 'text': cue.text };
                });
                writeCueList(list);
            });
            track.src = url;
            video.appendChild(track);
            track.track.mode = 'showing';
        } catch(e) {
            alert(e.message);
        } finally {
            resetFileInput(input);
        }
    });
    function resetFileInput(input) {
        input.value = '';
    }
    function reinitCues() {
        _track.mode = 'hidden';
        _track.mode = 'showing';
    }
    _dropTarget.on('drop', onDrop);
    _dropTarget.on('dragover', onDragOver);
    _dropTarget.on('dragleave', onDragEnd);
    _dropTarget.on('dragend', onDragEnd);

    function onDragOver(event) {
        event.preventDefault();
        _body.classList.add('drop-target');
    }
    function onDragEnd() {
        _body.classList.remove('drop-target');
    }
    function onDrop(event) {
        event.preventDefault();
        onDragEnd();
        var input;
        var files = event.dataTransfer.files;
        if (files.length === 0) {
            return;
        }
        if (files.length > 1) {
            alert('Multiple files are not supported.');
            return;
        }
        var file = files[0];
        if (file.type.indexOf('text/') === 0) {
            input = _importVTTFile;
        } else if (file.type.indexOf('video/') === 0) {
            input = _importVideoFile;
        } else {
            return;
        }
        input.files = files;
        var event = new Event('change');
        input.dispatchEvent(event);
    }
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js', {'scope': '/webvtt-editor/'});
    }
});
