import os
import logging
import shutil
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig

DOMAIN = "power_flow_card"
VERSION = "1.0.0"
_LOGGER = logging.getLogger(__name__)

async def async_setup(hass, config):
    src = os.path.join(os.path.dirname(__file__), "frontend", "power-flow-card.js")
    www_dir = hass.config.path("www", "community", "power-flow-card")
    dst = os.path.join(www_dir, "power-flow-card.js")

    os.makedirs(www_dir, exist_ok=True)

    try:
        shutil.copy2(src, dst)
        _LOGGER.info("Power Flow Card: copied JS to %s", dst)
    except Exception as e:
        _LOGGER.error("Power Flow Card: failed to copy JS — %s", e)

    url = f"/local/community/power-flow-card/power-flow-card.js?v={VERSION}"
    await hass.http.async_register_static_paths([
        StaticPathConfig(
            f"/local/community/power-flow-card",
            www_dir,
            cache_headers=False,
        )
    ])

    add_extra_js_url(hass, url)
    _LOGGER.info("Power Flow Card v%s geladen", VERSION)
    return True
