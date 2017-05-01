#pragma once
#include <pebble.h>

void process_eventsmenu_message(DictionaryIterator *received);
void eventsmenu_set_offline_mode();
void eventsmenu_sync();

void ui_eventsmenu_init();
void ui_eventsmenu_deinit();
