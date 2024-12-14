var ready = false;
var loadingEvents = false;
var clientCode = '';

Pebble.addEventListener("ready", function(e) {
    console.log('ready fires 25');
    if (ready)
        return;
    ready = true;
    var has_code = 0;
    if (localStorage.getItem('code'))
        has_code = 1;
    
    console.log('sending Init message');
    Pebble.sendAppMessage({ init: has_code }, function() {}, silentErrorCallback);
});


Pebble.addEventListener("showConfiguration", function(e) {
    console.log("Configuration opened");
    var params = "";
    if (localStorage.getItem('code'))
        params += "&hasCode=1";
    if (localStorage.getItem('enable_reminders'))
        params += "&enable_reminders=" + localStorage.getItem('enable_reminders');
    if (localStorage.getItem('sync_interval'))
        params += "&sync_interval=" + localStorage.getItem('sync_interval');
    if (localStorage.getItem('message'))
        params += "&message=" + encodeURIComponent(localStorage.getItem('message'));
    if (localStorage.getItem('enable_timeline'))
        params += "&enable_timeline=" + localStorage.getItem('enable_timeline');
    
    if (params[0] == "&")
        params = params.substring(1);
    console.log('params:' + params);
    Pebble.openURL('http://markeev.com/pebble/events365.html?' + params);
});

Pebble.addEventListener("webviewclosed", function(e) {

    var settings = JSON.parse(decodeURIComponent(e.response));
    console.log("Settings response: " + JSON.stringify(settings));
    
    if (settings.code) {
        localStorage.setItem('code', settings.code);
        localStorage.removeItem('refresh_token');
    }
    
    localStorage.setItem('message', settings.message);
    localStorage.setItem('enable_reminders', parseInt(settings.enable_reminders));
    var sync_interval = parseInt(settings.sync_interval);
    if (sync_interval < 0)
        sync_interval = 0;
    localStorage.setItem('sync_interval', sync_interval);
    localStorage.setItem('enable_timeline', parseInt(settings.enable_timeline));
    
    if (localStorage.getItem('code') || localStorage.getItem('refresh_token')) {
    
        enqueueMessage({ show_loading: 1, enable_reminders: parseInt(settings.enable_reminders), sync_interval: sync_interval }, function() {
            getEvents();
        }, silentErrorCallback);
        
    }

});


Pebble.addEventListener("appmessage", function(e) {
    if ('fetch_events' in e.payload) {
        clientCode = e.payload.fetch_events;
        localStorage.setItem('bufferSize', e.payload.buffer_size);
        
        if (localStorage.getItem('code'))
            getEvents();
    }
    else if ('send_reply' in e.payload) {
        sendReply(e.payload.send_reply, e.payload.minutes_late);
    }

});


var connector;

function getEvents()
{
    if (loadingEvents)
    {
        setTimeout(getEvents, 500);
        return;
    }
    
    loadingEvents = true;
    
    o365_oauth.login(clientCode, function(access_token) {
        connector = new o365_api(access_token);

        connector.getNextTenEvents(function(events) {

            var timelineEnabled = localStorage.getItem('enable_timeline') == 1;
            function saveEvents(i) {
                if (!i)
                    i = 0;
                if (i == events.length)
                {
                    console.log("All events are saved to the phone. Sending the Refresh UI message...");
                    enqueueMessage({refresh_ui: 1});
                    loadingEvents = false;
                    return;
                }

                var attendeesList = [];
                var attendeesNameList = [];
                var attendeesEmailList = [];
                var n = 0;
                for (var a=0;a<events[i].attendees.length;a++)
                {
                    if (events[i].attendees[a].Type=='Resource')
                        continue;
                    if (a <= 2 || events[i].attendees.length == 4)
                        attendeesList.push(events[i].attendees[a].emailAddress.name);
                    else
                        n++;
                    attendeesNameList.push(events[i].attendees[a].emailAddress.name);
                    attendeesEmailList.push(events[i].attendees[a].emailAddress.address);
                }

                var timeZoneOffset = new Date().getTimezoneOffset() * 60;
                if (getWatchInfo().platform == "basalt")
                    timeZoneOffset = 0;

                var startAsDate = new Date(events[i].start.dateTime);
                var endAsDate = new Date(events[i].end.dateTime);

                var startTS = parseInt(startAsDate.getTime()/1000) - timeZoneOffset;
                var endTS = parseInt(endAsDate.getTime()/1000) - timeZoneOffset;

                var eventData = {
                    event_id: i,
                    event_title: events[i].subject,
                    event_start_date: startTS,
                    event_end_date: endTS,
                    event_location: events[i].location.displayName,
                    event_body: events[i].bodyPreview,
                    event_attendees: attendeesList.join(", ") + (n > 0 ? ", and " + n + " others." : "")
                };

                if (timelineEnabled) {
                    var pin = {
                        id: "event-" + startTS + '-' + checksum(events[i].id),
                        time: startAsDate.toISOString(),
                        duration: Math.floor((endTS - startTS)/60),
                        layout: {
                            title: events[i].subject,
                            type: "genericPin",
                            tinyIcon: "system://images/SCHEDULED_EVENT"
                        }
                    };

                    console.log('Pin:', JSON.stringify(pin));
                    timeline_utils.addPin(pin, function() {
                        console.log("Pin added: " + i + " at " + pin.time);
                    }, silentErrorCallback);
                }
    
                enqueueMessage(eventData, function() {
                    console.log("Event " + i + " '" + events[i].subject + "' saved to the phone.");
                    i++;
                    saveEvents(i);
                }, silentErrorCallback);

                localStorage.setItem("event" + i + "Subject", events[i].subject);
                localStorage.setItem("event" + i + "Attendees", attendeesNameList.join(", "));
                localStorage.setItem("event" + i + "AttendeeEmails", attendeesEmailList.join(";"));
                    
            }

            saveEvents(0);

        }, silentErrorCallback);

    }, silentErrorCallback);

}

function checksum(s)
{
    var chk = 0x12345678;
    var len = s.length;
    for (var i = 0; i < len; i++) {
        chk += (s.charCodeAt(i) * (i + 1));
    }

    return (chk & 0xffffffff).toString(16);
}

function sendReply(eventNo, minutes)
{
    var defaultMessage = "Hi,\nI'll be approximately {n} minutes late. See you soon!";
    var message = (localStorage.getItem('message') || defaultMessage).replace('{n}', minutes).replace(/\\n/g, '\n');
    var attendeeNames = localStorage.getItem("event" + eventNo + "Attendees").split(', ');
    var attendeeEmails = localStorage.getItem("event" + eventNo + "AttendeeEmails").split(';');
    var recipients = [];
    for (var i=0;i<attendeeEmails.length;i++)
        recipients.push({ emailAddress: { address: attendeeEmails[i], name: attendeeNames[i] }});

    connector.sendMail(
        localStorage.getItem("event" + eventNo + "Subject"),
        message,
        recipients,
        function(data, status, response) {
            console.log('reply sent: ' + data);
            enqueueMessage({ reply_sent: message });
        },
        loudErrorCallback
    );
}

function silentErrorCallback(err)
{
    console.log('silentErrorCallback');
    console.log('error occured: ' + JSON.stringify(err));

    loadingEvents = false;
    enqueueMessage({ silent_error: 1 }, function() { }, function() { });
}

function loudErrorCallback(error)
{
    console.log('loudErrorCallback');
    console.log('error occured: ' + JSON.stringify(error));

    loadingEvents = false;
    if (error && typeof error == 'string')
      error = JSON.parse(error);
    var message = "";
    if (error && error.error_description)
      message = error.error_description;
    else if (error && error.error && error.error.message)
      message = error.error.message;
    else if (error)
      message = JSON.stringify(error);
    else
      message = 'Unknown error occured!';
    
    enqueueMessage({show_error: message });
    
}

function toByteArray(s, maxLength) {
    
    var utf8String = unescape(encodeURIComponent(s));
    
    var arr = [];
    for (var i = 0; i < utf8String.length && i < maxLength - 1; i++) {
        arr.push(utf8String.charCodeAt(i));
    }
    arr.push(0);
    
    return arr;
}

function getDataSize(n, size)
{
    return 1 + (n * 7) + size;
}

var messageQueue = [];

function enqueueMessage(data, successCallback, errorCallback) {
    if (!successCallback)
        successCallback = function() { };
    if (!errorCallback)
        errorCallback = silentErrorCallback;

    messageQueue.push({ data:data, successCallback: successCallback, errorCallback: errorCallback });
    processMessages();
}

var sending = false;
function processMessages() {
    if (messageQueue.length > 0 && !sending) {
        sending = true;
        var messageData = messageQueue.shift();
        sendAppMessageSafely(messageData.data, function() {
            sending = false;
            messageData.successCallback.apply(null, arguments);
            processMessages();
        }, function () {
            sending = false;
            messageData.errorCallback.apply(null, arguments);
            processMessages();
        });
    }
}

function sendAppMessageSafely(data, successCallback, errorCallback) {
    var bufferSize = localStorage.getItem('bufferSize') || 124;
    
    var keysCount = 0;
    var totalLength = 0;
    var dataSize = 0;
    var maxSize = bufferSize - getDataSize(1, 1);
    var toSend = {};
    var toSendIsEmpty = true;
    var sendRecursively = function (dataToSend)
    {
        return function() { console.log('callback'); sendAppMessageSafely(dataToSend, successCallback, errorCallback); };
    };
    for (var k in data) {

        if (data[k] === null)
            continue;
        
        if (typeof data[k] === "string") {
            data[k] = toByteArray(data[k], maxSize);
            totalLength += data[k].length;
        }
        else
            totalLength += 4;
        
        keysCount++;
        dataSize = getDataSize(keysCount, totalLength);
        if (bufferSize <= dataSize) {

            if (toSendIsEmpty) {
                console.error('Cannot send appmessage because the key does not fit into the buffer size: ', k, dataSize, bufferSize);
                return;
            } else {
                console.log('send-portion');
                Pebble.sendAppMessage(toSend, sendRecursively(data), errorCallback);
                return;
            }

        } else {

            toSend[k] = data[k];
            toSendIsEmpty = false;
            data[k] = null;
            
        }
    }
    
    Pebble.sendAppMessage(toSend, successCallback, errorCallback);
    
}

function getWatchInfo()
{
    if(Pebble.getActiveWatchInfo) {
      try {
        return Pebble.getActiveWatchInfo();
      } catch(err) {
        return {
          platform: "basalt",
        };
      }
    } else {
      return {
        platform: "aplite",
      };
    }
}
