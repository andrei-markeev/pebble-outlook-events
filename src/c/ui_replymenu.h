#include <pebble.h>
#pragma once

void process_replymenu_message(DictionaryIterator *received);
void ui_replymenu_show(int event_no);
void ui_replymenu_init();
void ui_replymenu_deinit();
