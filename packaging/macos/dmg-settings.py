# Настройки dmgbuild для окна установки Siphon. Запускается из make-dmg.sh:
#   dmgbuild -s dmg-settings.py -D app=.../Siphon.app -D background=.../dmg-background.png Siphon out.dmg
# Фон рисуется под эти координаты: при правках меняйте их вместе с dmg-background.svg.
import os.path

application = defines["app"]  # noqa: F821 — переменную подставляет dmgbuild
appname = os.path.basename(application)

format = "ULFO"  # LZFSE: меньше и быстрее UDZO, открывается на macOS 10.11+
files = [application]
symlinks = {"Applications": "/Applications"}
hide_extensions = [appname]
icon = os.path.join(application, "Contents", "Resources", "iconfile.icns")

# dmgbuild сам подхватит dmg-background@2x.png и соберёт HiDPI-TIFF.
background = defines["background"]  # noqa: F821
# Высота окна в .DS_Store считается вместе с заголовком (около 32 pt на macOS 26+),
# так что видно 660×400. Фон нарисован высотой 420: запас для более низких заголовков.
window_rect = ((200, 140), (660, 432))
default_view = "icon-view"
show_status_bar = False
show_tab_view = False
show_toolbar = False
show_pathbar = False
show_sidebar = False
show_icon_preview = False
include_icon_view_settings = True
include_list_view_settings = False

arrange_by = None
icon_size = 128
text_size = 13
label_pos = "bottom"
icon_locations = {appname: (180, 196), "Applications": (480, 196)}
