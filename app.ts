'use strict';

function pad2(s: number) : string {return s < 10 ? '0' + s : s.toString();}
function pad3(s: number) : string {return s < 100 ? '0' + pad2(s) : s.toString();}
function secondsToTime(s: number) {
    return pad2((s / 3600) | 0) + ':' + pad2((s % 3600 / 60) | 0) + ':' + pad2((s % 60) | 0) + '.' + pad3(((s % 1)*1000) | 0);
}
function padRight(s: string, n : number) : string {
    let length : number = s.length;
    while (length < n) {
        s = s + ' ';
        length = length + 1;
    }
    return s;
}

function generateID() : string {
    return Math.random().toString(36).substring(2, 15);
}

const bullet : string = '●';
const triangle : string = '►';

function getDefaultText(sel: string)
{
    if (sel != 'None')
        return bullet+bullet+' 00\n00';
    return '';
}

function getOptionText(sel: string,align: string,size: number,top: number,left: number,bot: number,right: number) : string {
    if (sel=='TL')
        return ' align:'+align+' size:'+size+'% position:'+left+'% line:'+top+'%';
    if (sel=='TR')
        return ' align:'+align+' size:'+size+'% position:'+right+'% line:'+top+'%';
    if (sel=='BL')
        return ' align:'+align+' size:'+size+'% position:'+left+'% line:'+bot+'%';
    if (sel=='BR')
        return ' align:'+align+' size:'+size+'% position:'+right+'% line:'+bot+'%';
    return '';
}

/// test for bullet or triangle character
function isSymbol(ch: string) : boolean
{    
    return ((ch == bullet) || (ch== triangle))
}

/// count leading symbols in string
function countSymbols(s: string) : number
{
    let count : number = 0;
    let i : number = 0;
    while (s.length > i && isSymbol(s[i])) {
        count = count + 1;
        i = i + 1;
    }
    return count;
}

window.addEventListener('load', function() {
    const on = EventTarget.prototype.addEventListener;
    var _dropTarget = document.documentElement;
    var _body = document.body;
    var _cueList = [];
    var _cueRows = new WeakMap();
    var _track : TextTrack = null;
    var $ = document.querySelector.bind(document);
    const _video = $('#video') as unknown as HTMLVideoElement;
    const _timer = $('#timer') as unknown as HTMLTextAreaElement;
    const _progress = $('#progress') as unknown as HTMLProgressElement;
    const _cues = $('#cues') as unknown as HTMLTableRowElement;
    const _playPause = $('#playPause') as unknown as HTMLButtonElement;
    const _addCueButton = $('#addCue') as unknown as HTMLButtonElement;
    const _sortCuesButton = $('#sortCues') as unknown as HTMLButtonElement;
    const _exportVTTButton = $('#exportVTT') as unknown as HTMLButtonElement;
    const _posSelect = $('#pos') as unknown as HTMLSelectElement;
    const _minusButton = $('#minus') as unknown as HTMLButtonElement;
    const _sideButton = $('#side') as unknown as HTMLButtonElement;
    const _plusButton = $('#plus') as unknown as HTMLButtonElement;
    const _previewButton = $('#previewButton') as unknown as HTMLButtonElement;
    const _importVideoButton = $('#importVideo') as unknown as HTMLButtonElement;
    const _importVideoFile = $('#importVideoFile') as unknown as HTMLInputElement;
    var _importVTTButton = $('#importVTT') as unknown as HTMLButtonElement;
    var _importVTTFile = $('#importVTTFile') as unknown as HTMLInputElement;
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
        _video.addEventListener('click', function() {
            togglePlayPause();
        });
        _video.addEventListener('timeupdate', function() {
            _timer.textContent = secondsToTime(_video.currentTime);
            if (isFinite(_video.duration)) {
                _progress.value = Math.round((_video.currentTime / _video.duration) * 100);
            } else {
                _progress.value = 0;
            }
        });
    }
    function addCueAtEnd(text: string) {
        let id = _cueList.length as number;
        _cues.insertAdjacentHTML('beforeend', '<tr class="incomplete"><td class="id">' + (id + 1) + '</td><td><button type="button" class="jumpCue" title="Jump to cue">&#8677;</button><td><span class="timestamp"><button type="button" class="insertTime start" title="Set current time">Set time</button></span></td><td><span class="timestamp"><button type="button" class="insertTime end" title="Set current time">Set time</button></span></td><td class="textinput"><textarea>'+text+'</textarea><button type="button" class="apply-text" title="Apply text">&#10003;</button></td><td><button type="button" class="delete-cue" title="Delete cue">&times;</button></td></tr>');
        let row = _cues.querySelector('tr:last-child');
        let entry = {'start': null, 'end': null, 'text': text, 'row' :id };
        _cueList.push(entry);
        _cueRows.set(row, entry);
    }
    function handleScore(delta: number) : void {
        let end : number = _cueList.length;
        if (end > 0) {
            let str: string = _cueList[end - 1].text;
            let scores: string [] = str.split('\n', 2);
            let s1 : string = scores[0];
            let k1 : number = countSymbols(s1);
            let v1 : number = parseInt(s1.substring(k1));
            let s2 : string = scores[1];
            let k2 : number = countSymbols(s2);
            let v2 : number = parseInt(s2.substring(k2));
            if (delta != 0) {
                // increase or decrease score
                if (k1 > 0) {
                    s1 = s1.substring(0, k1 + 1) + pad2(v1 + delta);
                } else if (k2 > 0) {
                    s2 = s2.substring(0, k2 + 1) + pad2(v2 + delta);
                }
            } else {
                // handle side out
                if (k1 > 0) {
                    // sideout team #1
                    if (k1 == 1) {
                        s1 = s1[0] + s1;
                    } else {
                        s2 = s1[0] + ' ' + s2;
                        s1 = s1.substring(k1 + 1);
                    }

                } else if (k2 > 0) {
                    // sideout team #2
                    if (k2 == 1) {
                        s2 = s2[0] + s2;
                    } else {
                        s1 = s2[0] + ' ' + s1;
                        s2 = s2.substring(k2 + 1);
                    }
                }
            }
            // Add new cue at end of cueList
            let text = s1 + '\n' + s2;
            addCueAtEnd(text);
        }

    }
    _playPause.addEventListener('click', function() {
        togglePlayPause();
    });
    initVideo();
    function insertNewVTTCue(cue) {
        var vtt_cue = new VTTCue(cue.start, cue.end, cue.text);
        vtt_cue.id = generateID();
        _track.addCue(vtt_cue);
        cue.cue_id = vtt_cue.id;
    }
    function getCueEntryByCueID(cue_id: string) {
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
        _track.addEventListener('cuechange', function() {
            _cues.querySelectorAll('tr.active').forEach(function(row) {
                row.classList.remove('active');
            });
            if (_track.activeCues.length === 0) return;
            Array.from(_track.activeCues).forEach(function(entry: { 'id': string }) {
                var activeID = entry.id;
                var cue = getCueEntryByCueID(activeID);
                cue.row.classList.add('active');
            });
        });
    }
    _addCueButton.addEventListener('click', function() {
        let sel : string = _posSelect.value;
        let score : string = getDefaultText(sel);
        addCueAtEnd(score);
    });
    _exportVTTButton.addEventListener('click', function() {
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
            let posOption : string = _posSelect.value;
            let text : string = cue.text;
            let lines : string [] = text.split('\n', 2);
            if (posOption != 'None' && (index == 0) && lines.length == 2) {
                lines[0] = padRight(lines[0], 30);
                lines[1] = padRight(lines[1], 30);
                text = lines[0] + '\n' + lines[1];
            }

            content += '\n\n' + secondsToTime(cue.start) + ' --> ' + secondsToTime(cue.end);
            content += (index == 0) && (posOption != 'None')
                        ? getOptionText(posOption,'start',25,10,0,90,70)
                        : getOptionText(posOption,'end',5,10,30,90,100);
            content += '\n' + text;
        });
        blob = new Blob([content], {'type': 'text/vtt'});
        url = URL.createObjectURL(blob);
        link = document.createElement('a');
        link.download = _vttFilename || 'subtitles.vtt';
        link.href = url;
        link.click();
    });
    _minusButton.addEventListener('click', function() {
        handleScore(-1);
    });
    _sideButton.addEventListener('click', function() {
        handleScore(0);
    });
    _plusButton.addEventListener('click', function() {
        handleScore(+1);
    });

    _progress.addEventListener('click', function(event) {
        var x = event.pageX - this.offsetLeft;
        var y = event.pageY - this.offsetTop;
        var clickedValue = x * this.max / this.offsetWidth;
        if (_video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        if (isFinite(_video.duration)) {
            _video.currentTime = _video.duration / 100 * clickedValue;
        }
    });
    _previewButton.addEventListener('click', function() {
        document.body.classList.toggle('preview');
    });
    function sortCueList(a: { start: number; }, b: { start: number; }) {
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
    _sortCuesButton.addEventListener('click', function() {
        _cueList.sort(sortCueList);
        _cueList.forEach(function(cue, i) {
            _cues.appendChild(cue.row);
            cue.row.querySelector('td.id').textContent = (i + 1);
        });
    });
    function updateRowNumbers() {
        _cues.querySelectorAll('tr').forEach(function(row, i: number) {
            row.querySelector('td.id').textContent = (i + 1).toString();
        });
    }
    document.addEventListener('click', function(event: Event) {
        var id, cue, cue2, row, time, timestamp, temp, was_incomplete, is_incomplete;
        const element = event.target as Element;
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
    document.addEventListener('keyup', function(event: KeyboardEvent) {
        const element = event.target as Element;
        if (element.nodeName === 'TEXTAREA' && !_video.paused) {
            _video.pause();
        }
    });
    document.addEventListener('keydown', function(event: KeyboardEvent) {
        const code = event.code;
        const element = event.target as Element;
        const node = element.nodeName;
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
    document.addEventListener('change', function(event) {
        var content, row, cue;
        const element = event.target as Element;
        if (element.nodeName === 'TEXTAREA') {
            const cell = element as HTMLTextAreaElement;
            content = cell.value;
            row = element.closest('tr');
            cue = _cueRows.get(row);
            cue.text = content;
            if (cue.cue_id !== undefined) {
                const vttcue = _track.cues.getCueById(cue.cue_id) as VTTCue;
                vttcue.text = content;
                reinitCues();
            }
            element.closest('td').classList.remove('changed');
        }
    });
    document.addEventListener('input', function(event: Event) {
        var row, cue;
        const element = event.target as Element;
        if (element.nodeName !== 'TEXTAREA')
            return;
        const cell = element as HTMLTextAreaElement;
        row = element.closest('tr');
        cue = _cueRows.get(row);
        element.parentElement.classList.toggle('changed', cue.text !== cell.value);
    });
    _importVideoButton.addEventListener('click', () => {
        _importVideoFile.click();
    });
    _importVideoFile.addEventListener('change', function(event: InputEvent) {
        var file, url;
        const input = event.target as undefined as DataTransfer;
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
    _importVTTButton.addEventListener('click', function() {
        _importVTTFile.click();
    });
    _importVTTFile.addEventListener('change', function(event: Event) : void {
        var file, video, url, track;
        const input = event.target as undefined as DataTransfer;
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
            const track = document.createElement('track') as HTMLTrackElement;
            track.kind = 'subtitles';
            track.label = 'English';
            track.srclang = 'en';
            track.addEventListener('error', function() {
                alert('Invalid VTT file.');
            });
            track.addEventListener('load', function() {
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
                list = Array.from(this.track.cues).map(function(cue: VTTCue) {
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
    _dropTarget.addEventListener('drop', onDrop);
    _dropTarget.addEventListener('dragover', onDragOver);
    _dropTarget.addEventListener('dragleave', onDragEnd);
    _dropTarget.addEventListener('dragend', onDragEnd);

    function onDragOver(event) {
        event.preventDefault();
        _body.classList.add('drop-target');
    }
    function onDragEnd() {
        _body.classList.remove('drop-target');
    }
    function onDrop(event: InputEvent) {
        event.preventDefault();
        onDragEnd();
        var input : HTMLInputElement;
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
        var myevent = new Event('change');
        input.dispatchEvent(myevent);
    }
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js', {'scope': '/webvtt-editor/'});
    }
});
