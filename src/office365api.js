var ajax = require('ajax');
var office365api = function(access_token) {

  this.getNextTenEvents = function(successCallback, errorCallback)
  {
  
      ajax(
        {
          url: 'https://outlook.office365.com/api/v1.0/me/calendarview?startdatetime='+new Date(Date.now()).toISOString()+'&enddatetime=3015-10-11T01:00:00Z&$top=10&$select=Subject,Start,IsAllDay,End,Location,Attendees,Organizer,BodyPreview,ResponseStatus',
          headers: { 
            "Authorization": "Bearer " + access_token
          }
        },
        function(data, status, request) {
          console.log('Returned calendar data: ' + data);
          var events = JSON.parse(data).value;
          successCallback(events);
        },
        errorCallback
      );

  };
  
  this.sendMail = function(subject, message, recipients, successCallback, errorCallback)
  {
  
      ajax(
        {
          url: 'https://outlook.office365.com/api/v1.0/me/sendmail',
          headers: { 
            "Authorization": "Bearer " + access_token
          },
          method: 'POST',
          type: 'json',
          data: {
            "Message": {
              "Subject": subject,
              "Body": {
                "ContentType": "Text",
                "Content": message
              },
              "ToRecipients": recipients
            },
            "SaveToSentItems": "true"
          }
        },
        successCallback,
        function(error, status, request) { if (status == 202) successCallback(error, status, request); else errorCallback(error, status, request); }
      );

  };
  
};

module.exports = office365api;