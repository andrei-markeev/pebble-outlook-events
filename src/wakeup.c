#include <pebble.h>
#include "event.h"
#include "wakeup.h"
#include "app_message.h"
#include "ui_messagebox.h"

static WakeupId s_wakeup_id;

void process_wakeup_message(DictionaryIterator *received) {
    Tuple *tuple;

    tuple = dict_find(received, KEY_ENABLE_REMINDERS);
    if(tuple) {
        if (tuple->value->int8 == 0 && persist_exists(PERSIST_KEY_WAKEUP_ENABLED)) {
            persist_delete(PERSIST_KEY_WAKEUP_ENABLED);
            APP_LOG(APP_LOG_LEVEL_DEBUG, "Reminders disabled.");
        } else if (tuple->value->int8 == 1 && !persist_exists(PERSIST_KEY_WAKEUP_ENABLED)) {
            persist_write_int(PERSIST_KEY_WAKEUP_ENABLED, 1);
            APP_LOG(APP_LOG_LEVEL_DEBUG, "Reminders enabled.");
        }
    }
    
}

void wakeup_schedule_event_reminder() {
    
    if (!persist_exists(PERSIST_KEY_WAKEUP_ENABLED)) {
        APP_LOG(APP_LOG_LEVEL_DEBUG, "wakeup_schedule_event_reminder: Reminders disabled, quitting.");
        return;
    }
    
    int event_no = 0;
    
    do {
    
        if (!persist_exists(event_no * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_TITLE))
            return;
        if (!persist_exists(event_no * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_START_DATE))
            return;
        
        if (persist_exists(PERSIST_KEY_WAKEUP_ID))
        {
            s_wakeup_id = persist_read_int(PERSIST_KEY_WAKEUP_ID);
            wakeup_cancel(s_wakeup_id);
        }
        
        time_t reminder_time = persist_read_int(event_no * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_START_DATE);
        reminder_time -=  15 * 60;
        
        do {
        
            s_wakeup_id = wakeup_schedule(reminder_time, event_no, true);
            reminder_time--;
            
        } while (s_wakeup_id == E_RANGE);

        event_no++;
            
    } while (s_wakeup_id == E_INVALID_ARGUMENT);
        
    persist_write_int(PERSIST_KEY_WAKEUP_ID, s_wakeup_id); 
    APP_LOG(APP_LOG_LEVEL_DEBUG, "Reminder for event %d scheduled, wakeup id = %d.", event_no, (int)s_wakeup_id);
}

static char event_title[PERSIST_STRING_MAX_LENGTH];
static void wakeup_handler(WakeupId id, int32_t reason) {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "--- WOKE UP: %d, %d ---", (int)id, (int)reason);
    if (!persist_exists(reason * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_TITLE))
        return;

    persist_read_string(reason * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_TITLE, event_title, PERSIST_STRING_MAX_LENGTH);
    ui_messagebox_show("15 minutes!", event_title);
    vibes_short_pulse();

    persist_delete(PERSIST_KEY_WAKEUP_ID);
    wakeup_schedule_event_reminder();
}

void wakeup_init(void) {

    wakeup_service_subscribe(wakeup_handler);

    if (launch_reason() == APP_LAUNCH_WAKEUP) {
        // The app was started by a wakeup
        WakeupId id = 0;
        int32_t reason = 0;

        // Get details and handle the wakeup
        wakeup_get_launch_event(&id, &reason);
        wakeup_handler(id, reason);
    }
    
}

void wakeup_deinit(void) {
}
