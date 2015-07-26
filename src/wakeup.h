#include <pebble.h>
#pragma once
    
void wakeup_schedule_event_reminder();
void process_wakeup_message(DictionaryIterator *received);

void wakeup_init();
void wakeup_deinit();
