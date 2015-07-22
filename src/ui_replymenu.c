#include <pebble.h>
#include "ui_replymenu.h"
#include "ui_messagebox.h"
#include "app_message.h"

static int current_event_id = 0;
static Window *s_replymenu_window;
static SimpleMenuLayer *s_replymenu_layer;
static SimpleMenuSection replymenu_section;
static SimpleMenuItem replymenu_items[5];

void process_replymenu_message(DictionaryIterator *received) {
    Tuple *tuple = dict_find(received, KEY_REPLY_SENT);
    if(tuple) {
        ui_messagebox_show("Reply sent", tuple->value->cstring);
    } 
}

void click_callback(int index, void *context) {
    int minutes_late = (index + 1) * 5;
    if (index == 4)
        minutes_late = 30;
    
    DictionaryIterator *iter;

    app_message_outbox_begin(&iter);
    Tuplet tuplet1 = TupletInteger(KEY_SEND_REPLY, current_event_id);
    dict_write_tuplet(iter, &tuplet1);
    Tuplet tuplet2 = TupletInteger(KEY_MINUTES_LATE, minutes_late);
    dict_write_tuplet(iter, &tuplet2);
    dict_write_end(iter);
    app_message_outbox_send();
}

void window_load(Window *window) {
    Layer *window_layer = window_get_root_layer(window);
    GRect bounds = layer_get_bounds(window_layer);
    
    replymenu_items[0].title = "5 minutes late";
    replymenu_items[1].title = "10 minutes late";
    replymenu_items[2].title = "15 minutes late";
    replymenu_items[3].title = "20 minutes late";
    replymenu_items[4].title = "30 minutes late";
    
    for (int i=0; i<5; i++)
        replymenu_items[i].callback = click_callback;
    
    replymenu_section.title = "Reply being late";
    replymenu_section.items = replymenu_items;
    replymenu_section.num_items = 5;
    
    s_replymenu_layer = simple_menu_layer_create(bounds, window, &replymenu_section, 1, NULL);
    layer_add_child(window_layer, simple_menu_layer_get_layer(s_replymenu_layer));
}

void window_unload(Window *window) {
    simple_menu_layer_destroy(s_replymenu_layer);
}

void ui_replymenu_show(int event_no) {
    current_event_id = event_no;
    window_stack_push(s_replymenu_window, true);
}
void ui_replymenu_init() {
    s_replymenu_window = window_create();
    window_set_window_handlers(s_replymenu_window, (WindowHandlers){
        .load = window_load,
        .unload = window_unload,
    });
}
void ui_replymenu_deinit() {
    window_destroy(s_replymenu_window);
}
