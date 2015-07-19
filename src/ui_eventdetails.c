#include <pebble.h>
#include "event.h"
#include "date_format.h"
#include "ui_eventdetails.h"
#include "ui_replymenu.h"

static Window *s_details_window = NULL;
static ScrollLayer *s_scroll_layer = NULL;
static TextLayer *s_title_layer = NULL;
static TextLayer *s_date_layer = NULL;
static TextLayer *s_location_layer = NULL;
static BitmapLayer *s_locationicon_layer = NULL;
static GBitmap *s_locationicon_bitmap;
static int current_event_no = -1;
static char event_title[PERSIST_STRING_MAX_LENGTH] = "";
static char event_location[PERSIST_STRING_MAX_LENGTH] = "";
static char date_string[50];
#define EVENT_TITLE_FONT_KEY FONT_KEY_GOTHIC_24_BOLD
#define EVENT_DATE_FONT_KEY FONT_KEY_GOTHIC_14
#define EVENT_LOCATION_FONT_KEY FONT_KEY_GOTHIC_24

static void adjust_text_layer_rect(char *text, const char *font_key, TextLayer *text_layer, int *offset_y) {
    GRect frame = layer_get_frame(text_layer_get_layer(text_layer));
    GSize size = graphics_text_layout_get_content_size(text, fonts_get_system_font(font_key), GRect(0, 0, frame.size.w, 32767), GTextOverflowModeWordWrap, GTextAlignmentLeft);
    size.h += 4;
    layer_set_frame(text_layer_get_layer(text_layer), GRect(frame.origin.x, (*offset_y), frame.size.w, size.h));
    text_layer_set_text(text_layer, text);
    *offset_y += size.h;
}

static void adjust_locationicon(int y) {
    GRect frame = layer_get_frame(bitmap_layer_get_layer(s_locationicon_layer));
    frame.origin.y = y + 4;
    layer_set_frame(bitmap_layer_get_layer(s_locationicon_layer), frame);
}

void select_button_clicked(ClickRecognizerRef recognizer, void *context) {
    ui_replymenu_show(current_event_no);
}

void click_config_provider(void *context) {
    window_single_click_subscribe(BUTTON_ID_SELECT, select_button_clicked);
}


static void window_load(Window *window) {
    Layer *window_layer = window_get_root_layer(window);
    GRect bounds = layer_get_bounds(window_layer);
    
    s_scroll_layer = scroll_layer_create(bounds);
    layer_add_child(window_layer, scroll_layer_get_layer(s_scroll_layer));
    scroll_layer_set_click_config_onto_window(s_scroll_layer, window);
    scroll_layer_set_callbacks(s_scroll_layer, (ScrollLayerCallbacks){
        .click_config_provider = click_config_provider
    });
    
    s_title_layer = text_layer_create(GRect(3, 0, bounds.size.w - 6, 10));
    text_layer_set_font(s_title_layer, fonts_get_system_font(EVENT_TITLE_FONT_KEY));
    text_layer_set_overflow_mode(s_title_layer, GTextOverflowModeWordWrap);
    scroll_layer_add_child(s_scroll_layer, text_layer_get_layer(s_title_layer));

    s_date_layer = text_layer_create(GRect(5, 0, bounds.size.w - 8, 10));
    text_layer_set_font(s_date_layer, fonts_get_system_font(EVENT_DATE_FONT_KEY));
    text_layer_set_overflow_mode(s_date_layer, GTextOverflowModeWordWrap);
    scroll_layer_add_child(s_scroll_layer, text_layer_get_layer(s_date_layer));
    
    s_location_layer = text_layer_create(GRect(26, 0, bounds.size.w - 29, 10));
    text_layer_set_font(s_location_layer, fonts_get_system_font(EVENT_LOCATION_FONT_KEY));
    text_layer_set_overflow_mode(s_location_layer, GTextOverflowModeWordWrap);
    scroll_layer_add_child(s_scroll_layer, text_layer_get_layer(s_location_layer));
    
    s_locationicon_bitmap = gbitmap_create_with_resource(RESOURCE_ID_IMAGE_LOCATION);
    
    s_locationicon_layer = bitmap_layer_create(GRect(0, 0, 21, 21));
    bitmap_layer_set_bitmap(s_locationicon_layer, s_locationicon_bitmap);
    scroll_layer_add_child(s_scroll_layer, bitmap_layer_get_layer(s_locationicon_layer));
}

static void window_appear(Window *window) {
   
    if (current_event_no == -1)
        return;
    
    event_title[0] = '\0';
    event_location[0] = '\0';
    char end_time_string[10];
    int start_date = 0;
    int end_date = 0;
    if (persist_exists(current_event_no * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_TITLE))
        persist_read_string(current_event_no * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_TITLE, event_title, PERSIST_STRING_MAX_LENGTH);
    if (persist_exists(current_event_no * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_LOCATION))
        persist_read_string(current_event_no * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_LOCATION, event_location, PERSIST_STRING_MAX_LENGTH);
    if (persist_exists(current_event_no * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_START_DATE))
        start_date = persist_read_int(current_event_no * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_START_DATE);
    if (persist_exists(current_event_no * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_END_DATE))
        end_date = persist_read_int(current_event_no * PERSIST_EVENT_FIELDCOUNT + PERSIST_EVENT_END_DATE);

    int offset_y = 0;
    
    adjust_text_layer_rect(event_title, EVENT_TITLE_FONT_KEY, s_title_layer, &offset_y);
    
    if (start_date != 0 && end_date != 0) {
        if (end_date - start_date == 24 * 3600) {
            format_date_time(date_string, 40, (time_t)start_date, false);
            strcat(date_string, " (all day)");
        } else {
            format_date_time(date_string, 40, (time_t)start_date, true);
            format_time(end_time_string, 10, (time_t)end_date);
            strcat(date_string, " - ");
            strcat(date_string, end_time_string);
        }
            
        adjust_text_layer_rect(date_string, EVENT_DATE_FONT_KEY, s_date_layer, &offset_y);
        layer_set_hidden(text_layer_get_layer(s_date_layer), false);
        
    } else {
        layer_set_hidden(text_layer_get_layer(s_date_layer), true);
    }
    
    if (strlen(event_location) > 0) {
        offset_y += 2;
        adjust_locationicon(offset_y);
        adjust_text_layer_rect(event_location, EVENT_LOCATION_FONT_KEY, s_location_layer, &offset_y);
        layer_set_hidden(bitmap_layer_get_layer(s_locationicon_layer), false);
        layer_set_hidden(text_layer_get_layer(s_location_layer), false);
    } else {
        layer_set_hidden(bitmap_layer_get_layer(s_locationicon_layer), true);
        layer_set_hidden(text_layer_get_layer(s_location_layer), true);
    }
    
    
    Layer *window_layer = window_get_root_layer(window);
    GRect bounds = layer_get_bounds(window_layer);
    scroll_layer_set_content_size(s_scroll_layer, GSize(bounds.size.w, offset_y));
    
}

static void window_unload(Window *window) {
    scroll_layer_destroy(s_scroll_layer);
    text_layer_destroy(s_title_layer);
    text_layer_destroy(s_location_layer);
    gbitmap_destroy(s_locationicon_bitmap);
    bitmap_layer_destroy(s_locationicon_layer);
}

void ui_eventdetails_show(int event_no) {
    current_event_no = event_no;
    window_stack_push(s_details_window, true);
}

void ui_eventdetails_init() {
    s_details_window = window_create();
    window_set_window_handlers(s_details_window, (WindowHandlers){
        .load = window_load,
        .appear = window_appear,
        .unload = window_unload,
    });
}

void ui_eventdetails_deinit() {
    window_destroy(s_details_window);
}