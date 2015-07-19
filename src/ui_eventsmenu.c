#include <pebble.h>
#include "app_message.h"
#include "event.h"
#include "date_format.h"
#include "ui_eventsmenu.h"
#include "ui_eventdetails.h"

static Window *s_menu_window = NULL;
static TextLayer *s_title_layer = NULL;
static TextLayer *s_message_layer = NULL;
static Layer *s_line_layer = NULL;
static MenuLayer *s_menu_layer = NULL;
static int current_event_id = 0;

void eventsmenu_set_offline_mode() {
    text_layer_set_text(s_title_layer, "Events (offline)");
}

static void eventsmenu_firstload() {
    text_layer_set_text(s_title_layer, "Events");
    text_layer_set_text(s_message_layer, "Please visit the configuration page and setup events source");
    text_layer_set_text_alignment(s_message_layer, GTextAlignmentLeft);
    layer_set_hidden(text_layer_get_layer(s_message_layer), false);
    layer_set_hidden(menu_layer_get_layer(s_menu_layer), true);
}

static void eventsmenu_loading() {
    text_layer_set_text(s_title_layer, "Events");
    text_layer_set_text(s_message_layer, "\nLoading...");
    text_layer_set_text_alignment(s_message_layer, GTextAlignmentCenter);
    layer_set_hidden(text_layer_get_layer(s_message_layer), false);
    layer_set_hidden(menu_layer_get_layer(s_menu_layer), true);
}

void process_eventsmenu_message(DictionaryIterator *received) {
    Tuple *tuple;

    tuple = dict_find(received, KEY_INIT);
    if(tuple && tuple->value->int8 == 0) {
        eventsmenu_firstload();
    }
    
    tuple = dict_find(received, KEY_SHOW_LOADING);
    if(tuple) {
        eventsmenu_loading();
    }
    
    tuple = dict_find(received, KEY_EVENT_ID);
    if(tuple) {
        current_event_id = tuple->value->uint8;
        if (persist_exists((current_event_id + 1) * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_TITLE))
            persist_delete((current_event_id + 1) * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_TITLE);
    }
    tuple = dict_find(received, KEY_EVENT_TITLE);
    if(tuple) {
        persist_write_string(PERSIST_EVENT_TITLE + current_event_id*PERSIST_EVENT_FIELDCOUNT, tuple->value->cstring);
    }
    tuple = dict_find(received, KEY_EVENT_START_DATE);
    if(tuple) {
        persist_write_int(PERSIST_EVENT_START_DATE + current_event_id*PERSIST_EVENT_FIELDCOUNT, tuple->value->uint32);
    }
    tuple = dict_find(received, KEY_EVENT_END_DATE);
    if(tuple) {
        persist_write_int(PERSIST_EVENT_END_DATE + current_event_id*PERSIST_EVENT_FIELDCOUNT, tuple->value->uint32);
    }
    tuple = dict_find(received, KEY_EVENT_LOCATION);
    if(tuple) {
        persist_write_string(PERSIST_EVENT_LOCATION + current_event_id*PERSIST_EVENT_FIELDCOUNT, tuple->value->cstring);
    }
    tuple = dict_find(received, KEY_REFRESH_UI);
    if(tuple) {
        APP_LOG(APP_LOG_LEVEL_DEBUG, "Refreshing events menu");
        menu_layer_reload_data(s_menu_layer);
        text_layer_set_text(s_title_layer, "Events (online)");
        
        if (layer_get_hidden(menu_layer_get_layer(s_menu_layer))) {
            layer_set_hidden(text_layer_get_layer(s_message_layer), true);
            layer_set_hidden(menu_layer_get_layer(s_menu_layer), false);
        }
    } 
}

char* float_to_string(char* buffer, int bufferSize, double number)
{
    char decimalBuffer[5];

    snprintf(buffer, bufferSize, "%d", (int)number);

    int decimals = (int)((double)(number - (int)number) * (double)10);
    if (decimals > 0) {
        strcat(buffer, ".");
        snprintf(decimalBuffer, 5, "%d", decimals);
        strcat(buffer, decimalBuffer);
    }

    return buffer;
}

static uint16_t get_events_count_callback(struct MenuLayer *menu_layer, uint16_t section_index, void *callback_context) {
    int i = 0;
    int past_events = 0;
    time_t now = time(0);
    while (persist_exists(i*PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_TITLE)) {
        if (persist_exists(i*PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_END_DATE)) {
            int end_date = persist_read_int(i * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_END_DATE);
            if (end_date < now)
                past_events++;
        }
        i++;
    }
    return i - past_events;
}
         

static int get_event_no_from_row_index(int index) {
    int i = 0;
    int past_events = 0;
    time_t now = time(0);
    while ((i - past_events) <= index && persist_exists(i*PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_TITLE)) {
        if (persist_exists(i*PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_END_DATE)) {
            int end_date = persist_read_int(i * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_END_DATE);
            if (end_date < now)
                past_events++;
        }
        i++;
    }
    return i - 1;
}

static void draw_row_callback(GContext *ctx, const Layer *cell_layer, MenuIndex *cell_index, void *callback_context) {

    int event_no = get_event_no_from_row_index(cell_index->row);

    if (!persist_exists(event_no * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_TITLE))
        return;
    
    char event_title[PERSIST_STRING_MAX_LENGTH];
    persist_read_string(event_no * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_TITLE, event_title, PERSIST_STRING_MAX_LENGTH);
    
    char event_subtitle[55];
    char duration_string[10] = "";
    
    if (persist_exists(event_no * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_START_DATE)) {
    
        int start_date = persist_read_int(event_no * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_START_DATE);
    
        if (persist_exists(event_no * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_END_DATE)) {
        
            int end_date = persist_read_int(event_no * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_END_DATE);
        
            int duration = end_date - start_date;
            if (duration / 3600.0 != 24) {
                format_date_time(event_subtitle, 40, (time_t)start_date, 1);
                float_to_string(duration_string, 10, duration / 3600.0);
                strcat(event_subtitle, ", ");
                strcat(event_subtitle, duration_string);
                strcat(event_subtitle, "h");
            } else {
                format_date_time(event_subtitle, 40, (time_t)start_date, 0);
            }
            
        } else {
            format_date_time(event_subtitle, 40, (time_t)start_date, 1);
        }
        
    }
    
    menu_cell_basic_draw(ctx, cell_layer, event_title, event_subtitle, NULL);
    
}

static void select_callback(struct MenuLayer *menu_layer, MenuIndex *cell_index, void *callback_context) {

    int event_no = get_event_no_from_row_index(cell_index->row);
    if (!persist_exists(event_no * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_TITLE))
        return;
    
    ui_eventdetails_show(event_no);
    
}
         
static void line_layer_draw_callback(Layer *layer, GContext *ctx) {
    GRect bounds = layer_get_bounds(layer);
    graphics_draw_line(ctx, GPoint(0,0), GPoint(bounds.size.w,0));
}

static void window_load(Window *window) {
    Layer *window_layer = window_get_root_layer(window);
    GRect bounds = layer_get_bounds(window_layer);
    
    bounds.size.h -= 18;
    bounds.origin.y += 18;

    s_menu_layer = menu_layer_create(bounds);
    menu_layer_set_callbacks(s_menu_layer, NULL, (MenuLayerCallbacks){
        .get_num_rows = get_events_count_callback,
        .draw_row = draw_row_callback,
        .select_click = select_callback
    });
    menu_layer_set_click_config_onto_window(s_menu_layer, window);
    layer_add_child(window_layer, menu_layer_get_layer(s_menu_layer));

    s_message_layer = text_layer_create(GRect(bounds.origin.x + 3,bounds.origin.y,bounds.size.w - 5,bounds.size.h));
    text_layer_set_font(s_message_layer, fonts_get_system_font(FONT_KEY_GOTHIC_28));
    layer_set_hidden(text_layer_get_layer(s_message_layer), true);
    layer_add_child(window_layer, text_layer_get_layer(s_message_layer));
    
    s_title_layer = text_layer_create(GRect(2, 0, bounds.size.w - 2, 17));
    if (persist_exists(PERSIST_EVENT_TITLE))
        text_layer_set_text(s_title_layer, "Events");
    else
        text_layer_set_text(s_title_layer, "No events");
    text_layer_set_font(s_title_layer, fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD));
    layer_add_child(window_layer, text_layer_get_layer(s_title_layer));

    s_line_layer = layer_create(GRect(0, 18, bounds.size.w, 1));
    layer_set_update_proc(s_line_layer, line_layer_draw_callback);
    layer_add_child(window_layer, s_line_layer);
}

static void window_unload(Window *window) {
    menu_layer_destroy(s_menu_layer);
    text_layer_destroy(s_title_layer);
}

void ui_eventsmenu_init() {
    s_menu_window = window_create();
    window_set_window_handlers(s_menu_window, (WindowHandlers){
        .load = window_load,
        .unload = window_unload,
    });
    window_stack_push(s_menu_window, true);
}
         
void ui_eventsmenu_deinit() {
    window_destroy(s_menu_window);
}