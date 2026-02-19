from os import path, environ, pathsep
import sys
import platform
import os

# Configuration
CONF_PATH = os.path.expanduser(os.environ.get('SHELLGPT_CONF_DIR', '~/.shellgpt'))
CONFIG_FILE = os.path.join(CONF_PATH, 'config.toml')


def _load_toml():
    if not os.path.exists(CONFIG_FILE):
        return {}
    try:
        # tomllib is available since Python 3.11+
        if sys.version_info >= (3, 11):
            import tomllib
        else:
            try:
                import tomli as tomllib
            except ImportError:
                return {}
        with open(CONFIG_FILE, 'rb') as f:
            return tomllib.load(f)
    except Exception:
        return {}


_config = _load_toml()


def get_conf(profile_name, profile_key, default_val):
    # 优先级: 1. Profile 特定配置 2. 全局默认配置 (TOML 根层级) 3. 代码硬编码默认值
    profile_conf = _config.get('profiles', {}).get(profile_name, {})
    val = profile_conf.get(profile_key)
    if val is not None:
        return val
    return _config.get(profile_key, default_val)


# Configuration Defaults
DEFAULT_API_URL = 'http://127.0.0.1:11434'
DEFAULT_MODEL = 'llama3'
DEFAULT_IMAGE_MODEL = 'llava'
DEFAULT_TEMPERATURE = 0.8
DEFAULT_TIMEOUT = 60
DEFAULT_MAX_HISTORY = 1000
DEFAULT_MAX_CHAT_MESSAGES = 5
DEFAULT_STREAM_VALUE = True
DEFAULT_IMAGE_DIR_VALUE = '~/Pictures'

# Auto determined configs
OS_NAME = platform.system()
IS_TTY = sys.stdin.isatty()


def get_shell_type():
    if OS_NAME in ('Windows', 'nt'):
        is_powershell = len(environ.get('PSModulePath', '').split(pathsep)) >= 3
        return 'powershell.exe' if is_powershell else 'cmd.exe'
    return path.basename(environ.get('SHELL', '/bin/sh'))


SHELL = get_shell_type()


def load_config(profile_name=None):
    if profile_name is None:
        profile_name = _config.get('default_profile', 'default')

    # default 角色永远存在
    roles = {'default': 'You are a helpful assistant.', **_config.get('roles', {})}

    return {
        'api_url': get_conf(profile_name, 'url', DEFAULT_API_URL),
        'api_key': get_conf(profile_name, 'key', ''),
        'model': get_conf(profile_name, 'model', DEFAULT_MODEL),
        'temperature': float(
            get_conf(profile_name, 'temperature', DEFAULT_TEMPERATURE)
        ),
        'timeout': int(get_conf(profile_name, 'timeout', DEFAULT_TIMEOUT)),
        'max_history': int(get_conf(profile_name, 'max_history', DEFAULT_MAX_HISTORY)),
        'max_messages': int(
            get_conf(profile_name, 'max_messages', DEFAULT_MAX_CHAT_MESSAGES)
        ),
        'stream': str(
            get_conf(profile_name, 'stream', str(DEFAULT_STREAM_VALUE))
        ).lower()
        in ('true', '1', 'yes'),
        'image_model': get_conf(profile_name, 'image_model', DEFAULT_IMAGE_MODEL),
        'image_dir': os.path.expanduser(
            get_conf(profile_name, 'image_dir', DEFAULT_IMAGE_DIR_VALUE)
        ),
        'roles': roles,
    }


# 初始化默认配置
_default_params = load_config()
API_URL = _default_params['api_url']
API_KEY = _default_params['api_key']
MODEL = _default_params['model']
TEMPERATURE = _default_params['temperature']
INFER_TIMEOUT = _default_params['timeout']
MAX_HISTORY = _default_params['max_history']
MAX_CHAT_MESSAGES = _default_params['max_messages']
DEFAULT_STREAM = _default_params['stream']
IMAGE_MODEL = _default_params['image_model']
DEFAULT_IMAGE_DIR = _default_params['image_dir']
ROLES = _default_params['roles']
