

var o365_oauth = {};

o365_oauth.login = function(successCallback, errorCallback)
{

  var clientId = '93a56d1e-c5fc-4f8e-9992-047ed203455e';
  var clientSecret = (localStorage.getItem('clientSecret') || "").replace(/ /g,'+');
  var code = (localStorage.getItem('code') || "").replace(/ /g,'+');
  
  function authCodeRequestCallback(data, status, request) {
    console.log('Returned data:' + data);
    var parsedData = JSON.parse(data);
    var access_token = parsedData.access_token;
    var refresh_token = parsedData.refresh_token;
    localStorage.setItem('refresh_token', refresh_token);
    successCallback(access_token);
    
  }
  
  function tryRefreshToken()
  {
    ajax(
      {
        url: 'https://login.microsoftonline.com/common/oauth2/token?api-version=1.0',
        method: 'POST',
        data: {
          grant_type: 'refresh_token',
          refresh_token: localStorage.getItem('refresh_token') || "",
          redirect_uri: 'http://markeev.com/pebble/events365.html',
          client_id: clientId,
          client_secret: clientSecret
        }
      },
      authCodeRequestCallback,
      errorCallback
    );
      
  }
  
  function performAuthCodeRequest()
  {
    ajax({
          url: 'https://login.microsoftonline.com/common/oauth2/token?api-version=1.0',
          method: 'POST',
          data: {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: 'http://markeev.com/pebble/events365.html',
            client_id: clientId,
            client_secret: clientSecret
          }
      },
      authCodeRequestCallback,
      tryRefreshToken
    );
      
  }
  
  if (localStorage.getItem('refresh_token') !== null)
    tryRefreshToken();
  else
    performAuthCodeRequest();
   
};