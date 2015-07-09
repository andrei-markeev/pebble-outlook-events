var Settings = require('settings');
var ajax = require('ajax');
var oauth = {};

oauth.login = function(successCallback, errorCallback)
{

  var code = Settings.option('code') || "";
  var clientId = Settings.option('clientId') || "";
  var clientSecret = (Settings.option('clientSecret') || "").replace(/ /g,'+');
  
  function authCodeRequestCallback(data, status, request) {
    console.log('Returned data:' + data);
    var parsedData = JSON.parse(data);
    var access_token = parsedData.access_token;
    Settings.data('refresh_token', parsedData.refresh_token);
    successCallback(access_token);
  }
  
  function tryRefreshToken(errorCallback)
  {
    ajax(
      {
        url: 'https://login.microsoftonline.com/common/oauth2/token?api-version=1.0',
        method: 'POST',
        data: {
          grant_type: 'refresh_token',
          refresh_token: Settings.data('refresh_token') || "",
          redirect_uri: 'http://markeev.com/pebble/outlookCalendar.html',
          client_id: clientId,
          client_secret: clientSecret
        }
      },
      authCodeRequestCallback,
      errorCallback
    );
      
  }
    
  console.log('code:' + code);
  console.log('clientId:' + clientId);
  console.log('clientSecret:' + clientSecret);
  ajax({
        url: 'https://login.microsoftonline.com/common/oauth2/token?api-version=1.0',
        method: 'POST',
        data: {
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: 'http://markeev.com/pebble/outlookCalendar.html',
          client_id: clientId,
          client_secret: clientSecret
        }
    },
    authCodeRequestCallback,
    tryRefreshToken
  );
    
};

module.exports = oauth;