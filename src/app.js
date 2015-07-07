var UI = require('ui');
var Settings = require('settings');
var OAuth = require('oauth');
var ajax = require('ajax');

Settings.config({url: "http://markeev.com/pebble/outlookCalendar.html"});

var eventsMenu = new UI.Menu({ sections: [{ title: "offline", items: [] }] });
eventsMenu.on('select', eventSelected);
showEvents("offline");
eventsMenu.show();

var infoCard = null;

OAuth.login(function(access_token)
{
    ajax(
      {
        url: 'https://outlook.office365.com/api/v1.0/me/calendarview?startdatetime='+new Date(Date.now()).toISOString()+'&enddatetime=3015-10-11T01:00:00Z&$top=10&$select=Subject,Start,IsAllDay,End,Attendees,Organizer,BodyPreview,ResponseStatus',
        headers: { 
          "Authorization": "Bearer " + access_token
        }
      },
      calendarDataRequestCallback,
      ajaxErrorCallback
    );
  
},
ajaxErrorCallback);

function ajaxErrorCallback(error, status, request) {
    showText('Error', error ? JSON.parse(error).error_description : 'Unknown error occured!');
    console.log('Ajax request failed: ' + JSON.stringify(error) + ', status: ' + status + ', request: ' + JSON.stringify(request));
}

function calendarDataRequestCallback(data, status, request) {
  console.log('Returned calendar data: ' + data);
  var events = JSON.parse(data).value;
  for (var i=0;i<events.length;i++)
  {
    var k = i + 1;
    Settings.data("event" + k + "Id", events[i].Id);
    Settings.data("event" + k + "Subject", events[i].Subject);
    Settings.data("event" + k + "Start", events[i].Start);
    Settings.data("event" + k + "BodyPreview", events[i].BodyPreview);
    Settings.data("event" + k + "IsAllDay", events[i].IsAllDay);
    Settings.data("event" + k + "End", events[i].End);
    Settings.data("event" + k + "Response", events[i].ResponseStatus.Response);
    var attendeesList = [];
    for (var a=0;a<events[i].Attendees.length;a++)
      attendeesList.push(events[i].Attendees[a].EmailAddress.Name);
    Settings.data("event" + k + "Attendees", attendeesList.join(", "));
  }
  showEvents("online");
}


function leadingZero(n)
{
  if (n < 10)
    return "0" + n;
  else
    return "" + n;
}

function formatDate(date)
{
  var today = new Date();
  var tomorrow = today;
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString()==today.toDateString())
    return "Today " + date.getHours() + ":" + leadingZero(date.getMinutes());
  else if (date.toDateString()==tomorrow.toDateString())
    return "Tomorrow " + date.getHours() + ":" + leadingZero(date.getMinutes());
  else
    return date.toDateString().replace(date.getFullYear(),'') + date.getHours() + ":" + leadingZero(date.getMinutes());
}

function showEvents(title)
{
  var items = [];
  var i = 1;
  while (Settings.data('event' + i + 'Id'))
  {
    var date = new Date(Settings.data('event' + i + 'Start'));
    var dateEnd = new Date(Settings.data('event' + i + 'End'));
    var duration = "";
    if (Settings.data('event' + i + 'IsAllDay'))
      duration = "all day";
    else
      duration = ((dateEnd-date) / 3600000) + "h";
    
    items.push({
      title: Settings.data('event' + i + 'Subject'),
      subtitle: formatDate(date) + ", " + duration
    });
    i++;
  }
  
  eventsMenu.section(0, { title: title, items: items });
}

function eventSelected(e){
  hideText();
  
  var eventNo = e.itemIndex + 1;
  var title = Settings.data('event' + eventNo + 'Subject');
  var body = 'Start: ' + formatDate(new Date(Settings.data('event' + eventNo + 'Start'))) + '\n';
  body += 'End: ' + formatDate(new Date(Settings.data('event' + eventNo + 'End'))) + '\n';
  body += 'Attendees: ' + Settings.data('event' + eventNo + 'Attendees') + '\n';
  body += 'Status: ' + Settings.data('event' + eventNo + 'Response') + '\n';
  body += Settings.data('event' + eventNo + 'BodyPreview');
  
  showText(title, body);
}

function hideText()
{
  if (!infoCard)
    return;
  infoCard.hide();
  infoCard = null;
}

function showText(title,text)
{
  infoCard = new UI.Card({ scrollable: true });
  infoCard.title(title);
  infoCard.body(text);
  infoCard.show();
}

