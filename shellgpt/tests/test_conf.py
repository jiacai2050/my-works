import unittest
from unittest.mock import patch
import os
import shellgpt.utils.conf as conf


class TestConf(unittest.TestCase):
    @patch('shellgpt.utils.conf._config')
    @patch.dict(os.environ, {'MY_API_KEY': 'test-key-from-env'})
    def test_load_config_api_key_env(self, mock_config):
        # Mocking the _config in shellgpt.utils.conf
        mock_config.get.side_effect = lambda key, default=None: {
            'default_profile': 'test_profile',
            'profiles': {
                'test_profile': {
                    'base_url': 'http://localhost',
                    'api_key_env': 'MY_API_KEY',
                }
            },
            'roles': {},
        }.get(key, default)

        config = conf.load_config('test_profile')
        self.assertEqual(config['api_key'], 'test-key-from-env')

    @patch('shellgpt.utils.conf._config')
    @patch.dict(os.environ, {'MY_API_KEY': 'test-key-from-env'})
    def test_load_config_api_key_precedence(self, mock_config):
        # api_key should take precedence over api_key_env
        mock_config.get.side_effect = lambda key, default=None: {
            'default_profile': 'test_profile',
            'profiles': {
                'test_profile': {
                    'base_url': 'http://localhost',
                    'api_key': 'key-from-config',
                    'api_key_env': 'MY_API_KEY',
                }
            },
            'roles': {},
        }.get(key, default)

        config = conf.load_config('test_profile')
        self.assertEqual(config['api_key'], 'key-from-config')

    @patch('shellgpt.utils.conf._config')
    @patch.dict(os.environ, {'CF_AIG_TOKEN': 'secret-token'})
    def test_load_config_headers_env(self, mock_config):
        mock_config.get.side_effect = lambda key, default=None: {
            'default_profile': 'test_profile',
            'profiles': {
                'test_profile': {
                    'base_url': 'http://localhost',
                    'headers': {
                        'cf-aig-authorization': 'Bearer $CF_AIG_TOKEN',
                        'simple-var': '${CF_AIG_TOKEN}',
                        'static': 'normal-value',
                    },
                }
            },
            'roles': {},
        }.get(key, default)

        config = conf.load_config('test_profile')
        self.assertEqual(
            config['headers']['cf-aig-authorization'], 'Bearer secret-token'
        )
        self.assertEqual(config['headers']['simple-var'], 'secret-token')
        self.assertEqual(config['headers']['static'], 'normal-value')


if __name__ == '__main__':
    unittest.main()
