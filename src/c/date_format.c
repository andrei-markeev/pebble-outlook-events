#include <pebble.h>
#include "date_format.h"

void format_date_time(char *buffer, int buf_size, time_t t, bool add_time) {
    time_t now = time(0);
    int now_days = now / (3600 * 24);
    int t_days = t / (3600 * 24);
    struct tm *time = localtime(&t);
    char format[20] = "";
    if (now_days == t_days) {
        strcat(format, "Today");
    } else if (now_days == t_days - 1) {
        strcat(format, "Tomorrow");
    } else {
        strcat(format, "%a ");

        if (!strcmp(i18n_get_system_locale(), "en-US"))
            strcat(format, "%m/%d");
        else
            strcat(format, "%d.%m");
    }

    if (add_time)
    {
        if (clock_is_24h_style())
            strcat(format, " %H:%M");
        else
            strcat(format, " %I:%M%p");
    }

    strftime(buffer, buf_size, format, time);
}

void format_time(char *buffer, int buf_size, time_t t) {
    struct tm *time = localtime(&t);
    char format[10] = "";
    if (clock_is_24h_style())
        strcpy(format, "%H:%M");
    else
        strcpy(format, "%I:%M%p");

    strftime(buffer, buf_size, format, time);
}