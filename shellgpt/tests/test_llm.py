import unittest

from shellgpt.api.llm import LLM
from shellgpt.utils.conf import SYSTEM_CONTENT


class TestLLM(unittest.TestCase):
    def test_make_message_default(self):
        llm = LLM('url', 'key', 'llama3', 'default', 0.8, 10, 2)
        for prompt, expected_msg in [
            ('111', [{'content': '111', 'role': 'user'}]),
            (
                '222',
                [
                    {'content': '111', 'role': 'user'},
                    {'content': '222', 'role': 'user'},
                ],
            ),
            (
                '333',
                [
                    {'content': '222', 'role': 'user'},
                    {'content': '333', 'role': 'user'},
                ],
            ),
        ]:
            actual = llm.make_messages(prompt, True, True)
            self.assertEqual(actual[0], expected_msg)
            self.assertEqual(actual[1], 'llama3')

        # with add_system_message being False
        actual = llm.make_messages('444', True, False)
        self.assertEqual(actual[0], [{'content': '444', 'role': 'user'}])

        # with add_system_message being True again
        actual = llm.make_messages('555', True, True)
        self.assertEqual(
            actual[0],
            [{'content': '333', 'role': 'user'}, {'content': '555', 'role': 'user'}],
        )

    def test_make_message_typo(self):
        llm = LLM('url', 'key', 'llama3', 'typo', 0.8, 10, 2)

        actual = llm.make_messages('hi', True, True)
        self.assertEqual(
            actual[0],
            [
                {'content': SYSTEM_CONTENT.get('typo'), 'role': 'system'},
                {'content': 'hi', 'role': 'user'},
            ],
        )

    def test_make_message_dynamic(self):
        llm = LLM('url', 'key', 'llama3', 'dynamic system body', 0.8, 10, 2)

        actual = llm.make_messages('hi', True, True)
        self.assertEqual(
            actual[0],
            [
                {'content': 'dynamic system body', 'role': 'system'},
                {'content': 'hi', 'role': 'user'},
            ],
        )

    def test_get_infer_url(self):
        def mock_llm(base_url):
            return LLM(base_url, 'key', 'llama3', 'default', 0.8, 10, 2)

        for base_url in ['https://api.openai.com', 'https://api.openai.com/']:
            llm = mock_llm(base_url)
            self.assertEqual(
                llm.get_infer_url(), 'https://api.openai.com/v1/chat/completions'
            )

        for base_url in ['https://models.github.ai', 'https://models.github.ai/']:
            llm = mock_llm(base_url)
            self.assertEqual(
                llm.get_infer_url(),
                'https://models.github.ai/inference/chat/completions',
            )

        for base_url in [
            'https://api.cloudflare.com/client/v4/accounts/xx/ai/',
            'https://api.cloudflare.com/client/v4/accounts/xx/ai',
        ]:
            llm = mock_llm(base_url)
            self.assertEqual(
                llm.get_infer_url(),
                'https://api.cloudflare.com/client/v4/accounts/xx/ai/v1/chat/completions',
            )

        for base_url in ['http://localhost:11434', 'http://localhost:11434/']:
            llm = LLM(base_url, '', 'llama3', 'default', 0.8, 10, 2)
            self.assertEqual(llm.get_infer_url(), 'http://localhost:11434/api/chat')
