#include <pebble.h>

#include "app_message.h"
#include "ui_eventsmenu.h"
#include "ui_replymenu.h"
#include "ui_messagebox.h"
#include "client_secret.h"
#include "wakeup.h"

void send_client_secret(void){
    DictionaryIterator *iter;

    app_message_outbox_begin(&iter);
    Tuplet tuplet1 = TupletCString(KEY_CLIENT_SECRET, CLIENT_SECRET);
    dict_write_tuplet(iter, &tuplet1);
    Tuplet tuplet2 = TupletInteger(KEY_BUFFER_SIZE, APP_MESSAGE_INBOX_SIZE_MINIMUM);
    dict_write_tuplet(iter, &tuplet2);
    dict_write_end(iter);
    app_message_outbox_send();
 
}

static void in_received_handler(DictionaryIterator *received, void *context) {
    
    Tuple *tuple;

    tuple = dict_find(received, KEY_INIT);
    if(tuple) {
        send_client_secret();
    }

    tuple = dict_find(received, KEY_SHOW_ERROR);
    if(tuple) {
        ui_messagebox_show("Error", tuple->value->cstring);
    }

    process_eventsmenu_message(received);
    process_wakeup_message(received);
    process_replymenu_message(received);
}

static char *get_reason_string(AppMessageResult reason) {

    switch (reason) {
        case APP_MSG_OK: return "APP_MSG_OK";
        case APP_MSG_SEND_TIMEOUT: return "APP_MSG_SEND_TIMEOUT";
        case APP_MSG_SEND_REJECTED: return "APP_MSG_SEND_REJECTED";
        case APP_MSG_BUSY: return "APP_MSG_BUSY";
        case APP_MSG_CLOSED: return "APP_MSG_CLOSED";
        case APP_MSG_INVALID_ARGS: return "APP_MSG_INVALID_ARGS";
        case APP_MSG_NOT_CONNECTED: return "APP_MSG_NOT_CONNECTED";
        case APP_MSG_INTERNAL_ERROR: return "APP_MSG_INTERNAL_ERROR";
        case APP_MSG_BUFFER_OVERFLOW: return "APP_MSG_BUFFER_OVERFLOW";
        case APP_MSG_ALREADY_RELEASED: return "APP_MSG_ALREADY_RELEASED";
        case APP_MSG_OUT_OF_MEMORY: return "APP_MSG_OUT_OF_MEMORY";
        case APP_MSG_APP_NOT_RUNNING: return "APP_MSG_APP_NOT_RUNNING";
        case APP_MSG_CALLBACK_NOT_REGISTERED: return "APP_MSG_CALLBACK_NOT_REGISTERED";
        case APP_MSG_CALLBACK_ALREADY_REGISTERED: return "APP_MSG_CALLBACK_NOT_REGISTERED";
        default: return "UNKNOWN";
    }
}

static void in_dropped_handler(AppMessageResult reason, void *context) {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "App Message Dropped! Reason: %s", get_reason_string(reason));
}

static void out_failed_handler(DictionaryIterator *failed, AppMessageResult reason, void *context) {
    if (reason == APP_MSG_NOT_CONNECTED)
        eventsmenu_set_offline_mode();
    APP_LOG(APP_LOG_LEVEL_DEBUG, "App Message Failed to Send! Reason: %s", get_reason_string(reason));
}


void app_message_init()
{
    app_message_register_inbox_received(in_received_handler); 
    app_message_register_inbox_dropped(in_dropped_handler); 
    app_message_register_outbox_failed(out_failed_handler);

    app_message_open(APP_MESSAGE_INBOX_SIZE_MINIMUM, APP_MESSAGE_OUTBOX_SIZE_MINIMUM);
}

void app_message_deinit()
{
    app_message_deregister_callbacks();
}