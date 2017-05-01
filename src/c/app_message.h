#pragma once

enum {
    KEY_INIT = 0,
    KEY_FETCH_EVENTS = 1,
    KEY_REFRESH_TOKEN = 2,
    KEY_SHOW_ERROR = 3,
    KEY_BUFFER_SIZE = 4,
    KEY_SEND_REPLY = 5,
    KEY_MINUTES_LATE = 6,
    KEY_REFRESH_UI = 7,
    KEY_SHOW_LOADING = 8,
    KEY_REPLY_SENT = 9,

    KEY_EVENT_ID = 10,
    KEY_EVENT_TITLE = 11,
    KEY_EVENT_START_DATE = 12,
    KEY_EVENT_END_DATE = 13,
    KEY_EVENT_LOCATION = 14,
    KEY_EVENT_ATTENDEES = 15,
    KEY_EVENT_BODY = 16,
    
    KEY_ENABLE_REMINDERS = 20,
    KEY_SYNC_INTERVAL = 21,
    
    KEY_SILENT_ERROR = 22
};

void send_client_secret();

void app_message_init();
void app_message_deinit();