var ready = false;
Pebble.addEventListener("ready", function(e) {
    console.log('ready fires');
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
    localStorage.setItem('sync_interval', parseInt(settings.sync_interval));
    
    if (localStorage.getItem('code') || localStorage.getItem('refresh_token')) {
    
        sendAppMessageSafely({ show_loading: 1, enable_reminders: parseInt(settings.enable_reminders), sync_interval: parseInt(settings.sync_interval) }, function() {
            getEvents();
        }, silentErrorCallback);
        
    }

});


Pebble.addEventListener("appmessage", function(e) {
    if ('client_secret' in e.payload) {
        localStorage.setItem('clientSecret', e.payload.client_secret);
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
    o365_oauth.login(function(access_token) {
        connector = new o365_api(access_token);

        connector.getNextTenEvents(function(events) {

            function saveEvents(i) {
                if (!i)
                    i = 0;
                if (i == events.length)
                {
                    console.log("All events are saved to the phone. Sending the Refresh UI message...");
                    sendAppMessageSafely({refresh_ui: 1});
                    return;
                }

                var attendeesList = [];
                var attendeesEmailList = [];
                var n = 0;
                for (var a=0;a<events[i].Attendees.length;a++)
                {
                    if (events[i].Attendees[a].Type=='Resource')
                        continue;
                    if (a <= 2 || events[i].Attendees.length == 4)
                        attendeesList.push(events[i].Attendees[a].EmailAddress.Name);
                    else
                        n++;
                    attendeesEmailList.push(events[i].Attendees[a].EmailAddress.Address);
                }
                
                var timeZoneOffset = new Date().getTimezoneOffset() * 60;
                if (getWatchInfo().platform == "basalt")
                    timeZoneOffset = 0;
                
                sendAppMessageSafely({
                    event_id: i,
                    event_title: events[i].Subject,
                    event_start_date: parseInt(new Date(events[i].Start).getTime()/1000) - timeZoneOffset,
                    event_end_date: parseInt(new Date(events[i].End).getTime()/1000) - timeZoneOffset,
                    event_location: events[i].Location.DisplayName,
                    event_body: events[i].BodyPreview,
                    event_attendees: attendeesList.join(", ") + (n > 0 ? ", and " + n + " others." : "")
                }, function() {
                    console.log("Event " + i + " saved to the phone.");
                    i++;
                    saveEvents(i);
                }, silentErrorCallback);

                localStorage.setItem("event" + i + "Subject", events[i].Subject);
                localStorage.setItem("event" + i + "Attendees", attendeesList.join(", "));
                localStorage.setItem("event" + i + "AttendeeEmails", attendeesEmailList.join(";"));
                    
            }

            saveEvents(0);

        }, silentErrorCallback);

    }, silentErrorCallback);

}

function sendReply(eventNo, minutes)
{
    var defaultMessage = "Hi,\nI'll be approximately {n} minutes late. See you soon!";
    var message = (localStorage.getItem('message') || defaultMessage).replace('{n}', minutes).replace(/\\n/g, '\n');
    var attendeeNames = localStorage.getItem("event" + eventNo + "Attendees").split(', ');
    var attendeeEmails = localStorage.getItem("event" + eventNo + "AttendeeEmails").split(';');
    var recipients = [];
    for (var i=0;i<attendeeEmails.length;i++)
        recipients.push({ EmailAddress: { Address: attendeeEmails[i], Name: attendeeNames[i] }});

    connector.sendMail(
        localStorage.getItem("event" + eventNo + "Subject"),
        message,
        recipients,
        function(data, status, response) {
            console.log('reply sent: ' + data);
            sendAppMessageSafely({ reply_sent: message });
        },
        loudErrorCallback
    );
}

function silentErrorCallback(err)
{
    console.log('silentErrorCallback');
    console.log('error occured: ' + JSON.stringify(err));
}

function loudErrorCallback(error)
{
    console.log('loudErrorCallback');
    console.log('error occured: ' + JSON.stringify(error));
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
    
    sendAppMessageSafely({show_error: message });
    
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

function sendAppMessageSafely(data, successCallback, errorCallback) {
    var bufferSize = localStorage.getItem('bufferSize');
    
    var keysCount = 0;
    var totalLength = 0;
    var dataSize = 0;
    var maxSize = bufferSize - getDataSize(1, 1);
    var toSend = {};
    var sendRecursively = function (dataToSend)
    {
        return function() { console.log('callback'); sendAppMessageSafely(dataToSend, successCallback, errorCallback); };
    };
    for (var k in data) {

        if (data[k] === null)
            continue;
        
        if (typeof data[k] == "string") {
            data[k] = toByteArray(data[k], maxSize);
            totalLength += data[k].length;
        }
        else
            totalLength += 4;
        
        keysCount++;
        dataSize = getDataSize(keysCount, totalLength);
        if (bufferSize <= dataSize) {
            
            console.log('send-portion');
            Pebble.sendAppMessage(toSend, sendRecursively(data), errorCallback);
            return;
            
        } else {

            toSend[k] = data[k];
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
