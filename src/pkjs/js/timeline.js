
var timeline_utils = {}

timeline_utils.addPin = function(pin, callback, errorCallback) {
    Pebble.getTimelineToken(function(token) {
        console.log('Timeline token received');
        var xhr = new XMLHttpRequest();
        xhr.open('PUT', 'https://timeline-api.rebble.io/v1/user/pins/' + pin.id);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-User-Token', token);
        xhr.onload = callback;
        xhr.onerror = errorCallback;
        xhr.send(JSON.stringify(pin));
    }, errorCallback);
};