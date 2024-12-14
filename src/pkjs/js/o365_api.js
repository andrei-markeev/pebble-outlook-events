var o365_api = function(access_token) {

  this.getNextTenEvents = function(successCallback, errorCallback)
  {
      var now = new Date().toISOString();
      var inOneYear = new Date();
      inOneYear.setFullYear(inOneYear.getFullYear()+1);
      inOneYear = inOneYear.toISOString();
  
      ajax(
        {
          url: 'https://graph.microsoft.com/v1.0/me/calendarView?startDateTime='+now+'&endDateTime='+inOneYear+'&$top=10&$select=id,subject,start,isAllDay,end,location,attendees,organizer,bodyPreview,responseStatus',
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
          url: 'https://graph.microsoft.com/v1.0/me/sendMail',
          headers: { 
            "Authorization": "Bearer " + access_token
          },
          method: 'POST',
          type: 'json',
          data: {
            "message": {
              "subject": subject,
              "body": {
                "contentType": "Text",
                "content": message
              },
              "toRecipients": recipients
            },
            "saveToSentItems": "true"
          }
        },
        successCallback,
        function(error, status, request) { if (status == 202) successCallback(error, status, request); else errorCallback(error, status, request); }
      );

  };
  
};
