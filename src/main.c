#include <pebble.h>
#include "app_message.h"
#include "wakeup.h"
#include "ui_eventsmenu.h"
#include "ui_eventdetails.h"
#include "ui_replymenu.h"
#include "ui_messagebox.h"

void init(void) {
    ui_eventsmenu_init();
    ui_eventdetails_init();
    ui_replymenu_init();
    ui_messagebox_init();
    app_message_init();
    wakeup_init();
}

void deinit(void) {
    wakeup_deinit();
    app_message_deinit();
    ui_messagebox_deinit();
    ui_replymenu_deinit();
    ui_eventdetails_deinit();
    ui_eventsmenu_deinit();
}

int main( void ) {
    init();
    app_event_loop();
    deinit();
}
