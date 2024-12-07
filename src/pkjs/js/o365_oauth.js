

var o365_oauth = {};

o365_oauth.login = function(clientSecret, successCallback, errorCallback)
{

    var clientId = '1fe49065-aead-4729-94a4-dc8d6a20c32a';
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
        if (!localStorage.getItem('refresh_token')) {
            errorCallback('Cannot refresh the token. Refresh token was not saved.');
        }
        ajax(
            {
                url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
                method: 'POST',
                data: {
                    grant_type: 'refresh_token',
                    scope: 'offline_access https://graph.microsoft.com/.default',
                    refresh_token: localStorage.getItem('refresh_token') || "",
                    redirect_uri: 'https://markeev.com/pebble/events365',
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
        ajax(
            {
                url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
                method: 'POST',
                data: {
                    grant_type: 'authorization_code',
                    scope: 'offline_access https://graph.microsoft.com/.default',
                    code: code,
                    redirect_uri: 'https://markeev.com/pebble/events365',
                    client_id: clientId,
                    client_secret: clientSecret
                }
            },
            authCodeRequestCallback,
            errorCallback
        );
    }

    if (localStorage.getItem('refresh_token') !== null)
        tryRefreshToken();
    else
        performAuthCodeRequest();

};