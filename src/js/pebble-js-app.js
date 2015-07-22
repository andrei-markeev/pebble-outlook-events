Pebble.addEventListener("ready", function(e) {
    console.log('js ready');
    if (localStorage.getItem('code'))
        Pebble.sendAppMessage({ init: 1 });
    else
        Pebble.sendAppMessage({ init: 0 });
});


Pebble.addEventListener("showConfiguration", function(e) {
    console.log("Configuration opened");
    Pebble.openURL('http://markeev.com/pebble/outlookCalendar.html');
});

Pebble.addEventListener("webviewclosed", function(e) {

    var settings = JSON.parse(decodeURIComponent(e.response));
    console.log("Settings response: " + JSON.stringify(settings));
    localStorage.setItem('code', settings.code);
    localStorage.setItem('message', settings.message);
    localStorage.removeItem('refresh_token');
    sendAppMessageSafely({show_loading: 1});
    getEvents();

});


Pebble.addEventListener("appmessage", function(e) {
    console.log('App message received:' + JSON.stringify(e.payload));

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
                for (var a=0;a<events[i].Attendees.length;a++)
                {
                    if (events[i].Attendees[a].Type=='Resource')
                        continue;
                    attendeesList.push(events[i].Attendees[a].EmailAddress.Name);
                    attendeesEmailList.push(events[i].Attendees[a].EmailAddress.Address);
                }
                sendAppMessageSafely({
                    event_id: i,
                    event_title: events[i].Subject,
                    event_start_date: parseInt(new Date(events[i].Start).getTime()/1000),
                    event_end_date: parseInt(new Date(events[i].End).getTime()/1000),
                    event_location: events[i].Location.DisplayName,
                    event_body: events[i].BodyPreview,
                    event_attendees: attendeesList.join(", ")
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
    console.log('error occured: ' + JSON.stringify(err));
}

function loudErrorCallback(error)
{
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

function getDataSize(n, size)
{
    return 1 + (n * 7) + size;
}

function sendAppMessageSafely(data, successCallback, errorCallback) {
    console.log('sendAppMessageSafely ENTER');
    var bufferSize = localStorage.getItem('bufferSize');
    
    var keysCount = 0;
    var totalLength = 0;
    var dataSize = 0;
    var toSend = {};
    var sendRecursively = function (dataToSend)
    {
        return function() { sendAppMessageSafely(dataToSend, successCallback, errorCallback); };
    };
    for (var k in data) {

        if (data[k] === null)
            continue;
        
        if (typeof data[k] == "string")
            totalLength += data[k].length;
        else
            totalLength += 4;
        
        keysCount++;
        
        dataSize = getDataSize(keysCount, totalLength);
        console.log(k + ': ' + dataSize + 'B, ' + keysCount + ' keys,' + totalLength + ' length');
        if (bufferSize < dataSize) {
            
            if (keysCount === 1) {
                var metadataSize = dataSize - data[k].length;
                var maxLength = bufferSize - metadataSize;
                var valueToSend = data[k].substr(0, maxLength - 4) + '...';
                
                toSend[k] = valueToSend;
                data[k] = null;
            }
            console.log('Sending: ' + Object.keys(toSend).join(', '));
            //console.log('Sending: ' + JSON.stringify(toSend));
            Pebble.sendAppMessage(toSend, sendRecursively(data), errorCallback);
            return;
            
        } else {

            toSend[k] = data[k];
            data[k] = null;
            
        }
    }
    
    console.log('Sending ' + dataSize + 'B: ' + Object.keys(toSend).join(', '));
    Pebble.sendAppMessage(toSend, successCallback, errorCallback);
    
}

