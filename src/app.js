var Settings = require('settings');

var OAuth = require('oauth');
var Office365API = require('office365api');
var AppUI = require('appui');

Settings.config({ url: "http://markeev.com/pebble/outlookCalendar.html" });

var connector;
var appUi = new AppUI(replyCallback);
appUi.showEventsMenu("offline");

OAuth.login(function(access_token)
{
    connector = new Office365API(access_token);

    connector.getNextTenEvents(function(events) {
      for (var i=0;i<events.length;i++)
      {
        var k = i + 1;
        Settings.data("event" + k + "Id", k);
        Settings.data("event" + k + "Subject", events[i].Subject);
        Settings.data("event" + k + "Start", events[i].Start);
        Settings.data("event" + k + "BodyPreview", events[i].BodyPreview);
        Settings.data("event" + k + "IsAllDay", events[i].IsAllDay);
        Settings.data("event" + k + "End", events[i].End);
        Settings.data("event" + k + "Location", events[i].Location.DisplayName);
        Settings.data("event" + k + "Response", events[i].ResponseStatus.Response);
        var attendeesList = [];
        var attendeesEmailList = [];
        for (var a=0;a<events[i].Attendees.length;a++)
        {
          if (events[i].Attendees[a].Type=='Resource')
            continue;
          attendeesList.push(events[i].Attendees[a].EmailAddress.Name);
          attendeesEmailList.push(events[i].Attendees[a].EmailAddress.Address);
        }
        Settings.data("event" + k + "Attendees", attendeesList.join(", "));
        Settings.data("event" + k + "AttendeeEmails", attendeesEmailList.join(";"));
      }
      appUi.showEventsMenu("online");
    }, ajaxErrorCallback);
  
},
ajaxErrorCallback);

function replyCallback(eventNo, minutes)
{
  var signature = Settings.option('signature') || "";
  var message = "Hi,\nI'll be approximately " + minutes + " minutes late. See you soon!\n\n" + signature;
  var attendeeNames = Settings.data("event" + eventNo + "Attendees").split(', ');
  var attendeeEmails = Settings.data("event" + eventNo + "AttendeeEmails").split(';');
  var recipients = [];
  for (var i=0;i<attendeeEmails.length;i++)
    recipients.push({ EmailAddress: { Address: attendeeEmails[i], Name: attendeeNames[i] }});
  
  connector.sendMail(
    "RE: " + Settings.data("event" + eventNo + "Subject"),
    message,
    recipients,
    function(data, status, response) {
      console.log('reply sent: ' + data);
      appUi.showText('Reply sent', message);
    },
    ajaxErrorCallback
  );
}

function ajaxErrorCallback(error, status, request) {
    console.log('Ajax request failed: ' + JSON.stringify(error) + ', status: ' + status + ', request: ' + JSON.stringify(request));
    if (error && typeof error == 'string')
      error = JSON.parse(error);
    if (error && error.error_description)
      appUi.showText('Error', error.error_description);
    else if (error && error.error && error.error.message)
      appUi.showText('Error', error.error.message);
    else
      appUi.showText('Error', 'Unknown error occured!');
}
