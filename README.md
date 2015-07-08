# Pebble Outlook Calendar

This is an app for Pebble smartwatch, created with Pebble.js.

It retrieves Outlook events using Office365 APIs, caches them and displays them as a list, which you can then browse and see details of each event.

![A screenshot](https://raw.githubusercontent.com/andrei-markeev/pebble-outlook-calendar/master/screenshot.png)

Every time when you enter the app, it tries to update the list. Even if update is not successful, for example you don't have internet connection, you will still be able to browse the cached list of events offline.

## TODO

 - add ability to respond to upcoming events e.g. "Hi, I'm a bit late, but I'm on my way. See you soon!".
 - when responding in such way, it should be possible to define approximate minutes late, e.g. 5/10/15/20 minutes late, etc.
 - you should be able to choose responding either to organizer only or to all attendees
 - probably need to gradually move to C API since PebbleJs doesn't run separately from the phone
