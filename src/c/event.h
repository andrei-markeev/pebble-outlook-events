#include <pebble.h>

enum {
    PERSIST_EVENT_TITLE = 0,
    PERSIST_EVENT_START_DATE = 1,
    PERSIST_EVENT_END_DATE = 2,
    PERSIST_EVENT_LOCATION = 3,
    PERSIST_EVENT_ATTENDEES = 4,
    PERSIST_EVENT_BODY = 5
};
#define PERSIST_EVENT_FIELDCOUNT 10
    
#define PERSIST_KEY_WAKEUP_ID 101
#define PERSIST_KEY_WAKEUP_ENABLED 102
#define PERSIST_KEY_SYNC_WAKEUP_ID 103
#define PERSIST_KEY_SYNC_INTERVAL 104

#define PERSIST_KEY_VERSION 110