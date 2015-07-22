#include <pebble.h>
#include "ui_messagebox.h"

static Window *s_messagebox_window;
static ScrollLayer *s_scroll_layer;
static TextLayer *s_message_layer;
static TextLayer *s_title_layer;
static char *message_text;
static char *title_text;
    
static void window_load(Window *window) {
    Layer *window_layer = window_get_root_layer(window);
    GRect bounds = layer_get_bounds(window_layer);
    
    s_scroll_layer = scroll_layer_create(bounds);
    layer_add_child(window_layer, scroll_layer_get_layer(s_scroll_layer));
    scroll_layer_set_click_config_onto_window(s_scroll_layer, window);

    s_title_layer = text_layer_create(GRect(3, 0, bounds.size.w - 6, 32));
    text_layer_set_font(s_title_layer, fonts_get_system_font(FONT_KEY_GOTHIC_28_BOLD));
    scroll_layer_add_child(s_scroll_layer, text_layer_get_layer(s_title_layer));
    
    s_message_layer = text_layer_create(GRect(3, 33, bounds.size.w - 6, 10));
    text_layer_set_font(s_message_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24));
    text_layer_set_overflow_mode(s_message_layer, GTextOverflowModeWordWrap);
    scroll_layer_add_child(s_scroll_layer, text_layer_get_layer(s_message_layer));

}

static void window_appear(Window *window) {
    GRect frame = layer_get_frame(text_layer_get_layer(s_message_layer));
    GSize size = graphics_text_layout_get_content_size(message_text, fonts_get_system_font(FONT_KEY_GOTHIC_24), GRect(0, 0, frame.size.w, 32767), GTextOverflowModeWordWrap, GTextAlignmentLeft);
    size.h += 4;
    layer_set_frame(text_layer_get_layer(s_message_layer), GRect(frame.origin.x, frame.origin.y, frame.size.w, size.h));
    text_layer_set_text(s_message_layer, message_text);

    text_layer_set_text(s_title_layer, title_text);
    
    scroll_layer_set_content_size(s_scroll_layer, GSize(frame.size.w, size.h + frame.origin.y));
}

static void window_unload(Window *window) {
    scroll_layer_destroy(s_scroll_layer);
    text_layer_destroy(s_message_layer);
    text_layer_destroy(s_title_layer);
}

void ui_messagebox_show(char *title, char *message) {
    message_text = message;
    title_text = title;
    window_stack_push(s_messagebox_window, true);
}

void ui_messagebox_init() {
    s_messagebox_window = window_create();
    window_set_window_handlers(s_messagebox_window, (WindowHandlers){
        .load = window_load,
        .appear = window_appear,
        .unload = window_unload,
    });
}

void ui_messagebox_deinit() {
    window_destroy(s_messagebox_window);
}