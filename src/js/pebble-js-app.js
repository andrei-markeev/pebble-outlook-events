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
    Pebble.sendAppMessage({show_loading: 1});
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
                    Pebble.sendAppMessage({refresh_ui: 1});
                    console.log("All events are saved to the phone. Sending the Refresh UI message...");
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

                Pebble.sendAppMessage({
                    event_id: i,
                    event_title: events[i].Subject,
                    event_start_date: parseInt(new Date(events[i].Start).getTime()/1000),
                    event_end_date: parseInt(new Date(events[i].End).getTime()/1000),
                    event_location: events[i].Location.DisplayName
                }, function() {
                    console.log("Event " + i + " saved to the phone.");
                    i++;
                    saveEvents(i);
                }, errorCallback);

                localStorage.setItem("event" + i + "Subject", events[i].Subject);
                localStorage.setItem("event" + i + "Attendees", attendeesList.join(", "));
                localStorage.setItem("event" + i + "AttendeeEmails", attendeesEmailList.join(";"));
                localStorage.setItem("event" + i + "BodyPreview", events[i].BodyPreview);
                localStorage.setItem("event" + i + "Response", events[i].ResponseStatus.Response);
                    
            }

            saveEvents(0);

        }, errorCallback);

    }, errorCallback);

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
            Pebble.sendAppMessage({ reply_sent: message });
        },
        errorCallback
    );
}


function sendBuffered(key, value, successCallback, errorCallback)
{
    var bufferSize = localStorage.getItem('bufferSize');
    var dataSize = getDataSize(1, value.length);
    var data = {};
    if (dataSize < bufferSize)
    {
        console.log('sendBuffered END: ' + value);
        data[key] = value;
        Pebble.sendAppMessage(data, successCallback, errorCallback);
        return;
    }

    var metadataSize = dataSize - value.length;
    var maxLength = bufferSize - metadataSize;
    var valueToSend = value.substr(0, maxLength);
    var restOfValue = value.substr(maxLength);
    data[key] = valueToSend;

    console.log('sendBuffered: ' + valueToSend);

    Pebble.sendAppMessage(data, function() {
        sendBuffered(key, restOfValue, successCallback, errorCallback);
    }, errorCallback);
}

function getDataSize(n, size)
{
    return 1 + (n * 7) + size;
}

function errorCallback(err)
{
    console.log('error occured: ' + JSON.stringify(err));
}
