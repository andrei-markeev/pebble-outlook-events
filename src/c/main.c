#include <pebble.h>
#include "app_message.h"
#include "wakeup.h"
#include "ui_eventsmenu.h"
#include "ui_eventdetails.h"
#include "ui_replymenu.h"
#include "ui_messagebox.h"

void init(void) {
    app_message_init();
    ui_eventsmenu_init();
    ui_eventdetails_init();
    ui_replymenu_init();
    ui_messagebox_init();
    wakeup_init(); // should be the last one to init
}

void deinit(void) {
    wakeup_deinit();
    ui_messagebox_deinit();
    ui_replymenu_deinit();
    ui_eventdetails_deinit();
    ui_eventsmenu_deinit();
    app_message_deinit();
}

int main( void ) {
    init();
    app_event_loop();
    deinit();
}
