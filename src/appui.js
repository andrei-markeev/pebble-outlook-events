var UI = require('ui');
var Settings = require('settings');
var Vector2 = require('vector2');


var appUI = function(replyCallback) {

  var eventsMenu = null;
  var eventDetailsWindow = null;
  var infoCard = null;
  var replyMenu = null;
  
  this.showEventsMenu = function(title)
  {
    if (!eventsMenu)
    {
      eventsMenu = new UI.Menu({ sections: [{ title: title, items: [] }] });
      eventsMenu.on('select', function(e) { showEventDetails(e.itemIndex + 1); });
      eventsMenu.show();
    }
  
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
    
  };
  
  this.showText = function(title,text)
  {
    if (!infoCard)
      infoCard = new UI.Card({ scrollable: true });
    infoCard.title(title || "");
    infoCard.body(text || "");
    infoCard.show();
  };
  
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
  
  function strTruncate(string, width) {
    string = string.replace(/[\s\r\n]+/, ' ');
    if (string.length >= width) {
      var result = string[width - 1] === ' ' ? string.substr(0, width - 1) : string.substr(0, string.substr(0, width).lastIndexOf(' '));
      if (result.length === 0)
        result = string.substr(0, width - 1);
      return result;
    }
    return string;
  }
  
  function strTruncateWhole(string, width) {
    var arr = [];
    string = string.replace(/[\s\r\n]+/, ' ');
    var b = 0;
    while (b < string.length) {
      arr.push(strTruncate(string.substring(b), width));
      b += arr[arr.length - 1].length;
    }
    return arr;
  }
  
  function sizeVector(string, fontSize) {
    var charsPerLine;
    if (fontSize==14)
      charsPerLine = 26;
    else if (fontSize==18)
      charsPerLine = 22;
    var split = strTruncateWhole(string, charsPerLine);
    var height = split.length * fontSize;
    return new Vector2(136, height);
  }
  
  function showEventDetails(eventNo)
  {
    var title = Settings.data('event' + eventNo + 'Subject');
    var time = 'Start: ' + formatDate(new Date(Settings.data('event' + eventNo + 'Start'))) + '\n';
    time += 'End: ' + formatDate(new Date(Settings.data('event' + eventNo + 'End')));
    var body = '';
    if (Settings.data('event' + eventNo + 'Location'))
      body += 'Location: ' + Settings.data('event' + eventNo + 'Location') + '\n';
    if (Settings.data('event' + eventNo + 'Attendees'))
      body += 'Attendees: ' + Settings.data('event' + eventNo + 'Attendees') + '\n';
    body += 'Status: ' + Settings.data('event' + eventNo + 'Response') + '\n';
    body += Settings.data('event' + eventNo + 'BodyPreview');
    
    if (eventDetailsWindow)
      eventDetailsWindow.hide();
    eventDetailsWindow = new UI.Window({ backgroundColor: 'white', scrollable: true });
  
    var yPos = 0;
    var titleSize = sizeVector(title, 18);
    var titleText = new UI.Text({ position: new Vector2(0, yPos), size: titleSize, text: title, textAlign: 'center', textOverflow: 'wrap', color: 'black', font: 'gothic-18-bold' });
    eventDetailsWindow.add(titleText);
    yPos += titleSize.y + 5;
    var timeSize = sizeVector(time, 14);
    var timeText = new UI.Text({ position: new Vector2(4, yPos), size: timeSize, text: time, textAlign: 'left', textOverflow: 'wrap', color: 'black', font: 'gothic-14' });
    eventDetailsWindow.add(timeText);
    yPos += timeSize.y;
    var bodyText = new UI.Text({ position: new Vector2(4, yPos), size: sizeVector(body, 18), text: body, textAlign: 'left', textOverflow: 'wrap', color: 'black', font: 'gothic-18' });
    eventDetailsWindow.add(bodyText);
    eventDetailsWindow.show();
    
    eventDetailsWindow.on('click', 'select', function() {
      showReplyMenu(eventNo);
    });
  }
  
  function showReplyMenu(eventNo)
  {
    if (replyMenu)
    {
      replyMenu.hide();
      replyMenu = null;
    }
    
    replyMenu = new UI.Menu({
      sections: [{
        title: 'reply',
        items: [
          { title: "5 minutes late" },
          { title: "10 minutes late" },
          { title: "15 minutes late" },
          { title: "20 minutes late" },
          { title: "25 minutes late" },
          { title: "30 minutes late" }
        ]
      }]
    });
    
    replyMenu.on('select', function(e) {
      var minutes = (e.itemIndex + 1) * 5;
      replyCallback(
        eventNo,
        minutes
      );
      replyMenu.hide();
      replyMenu = null;
      
    });
    
    replyMenu.show();
  }
};

module.exports = appUI;