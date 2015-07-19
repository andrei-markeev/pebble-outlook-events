#pragma once

enum {
    KEY_INIT = 0,
    KEY_CLIENT_SECRET = 1,
    KEY_REFRESH_TOKEN = 2,
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
};

void app_message_init();
void app_message_deinit();