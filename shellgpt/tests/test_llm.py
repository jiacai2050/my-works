import unittest

from shellgpt.api.llm import LLM


class TestLLM(unittest.TestCase):
    def test_make_message_default(self):
        llm = LLM(
            'url',
            'key',
            'llama3',
            role='default',
            temperature=0.8,
            timeout=10,
            max_messages=2,
            prompts={'default': 'You are a helpful assistant.'},
        )
        for prompt, expected_msg in [
            (
                '111',
                [
                    {'content': 'You are a helpful assistant.', 'role': 'system'},
                    {'content': '111', 'role': 'user'},
                ],
            ),
            (
                '222',
                [
                    {'content': 'You are a helpful assistant.', 'role': 'system'},
                    {'content': '111', 'role': 'user'},
                    {'content': '222', 'role': 'user'},
                ],
            ),
            (
                '333',
                [
                    {'content': 'You are a helpful assistant.', 'role': 'system'},
                    {'content': '222', 'role': 'user'},
                    {'content': '333', 'role': 'user'},
                ],
            ),
        ]:
            llm.messages.append({'role': 'user', 'content': prompt})
            actual = llm.make_messages(prompt, True, True)
            self.assertEqual(actual[0], expected_msg)
            self.assertEqual(actual[1], 'llama3')

        # with add_system_message being False
        llm.messages.append({'role': 'user', 'content': '444'})
        actual = llm.make_messages('444', True, False)
        self.assertEqual(actual[0], [{'content': '444', 'role': 'user'}])

        # with add_system_message being True again
        llm.messages.append({'role': 'user', 'content': '555'})
        actual = llm.make_messages('555', True, True)
        self.assertEqual(
            actual[0],
            [
                {'content': 'You are a helpful assistant.', 'role': 'system'},
                {'content': '444', 'role': 'user'},
                {'content': '555', 'role': 'user'},
            ],
        )

    def test_make_message_typo(self):
        prompts = {'typo': 'typo prompt'}
        llm = LLM(
            'url',
            'key',
            'llama3',
            role='typo',
            temperature=0.8,
            timeout=10,
            max_messages=2,
            prompts=prompts,
        )

        llm.messages.append({'role': 'user', 'content': 'hi'})
        actual = llm.make_messages('hi', True, True)
        self.assertEqual(
            actual[0],
            [
                {'content': 'typo prompt', 'role': 'system'},
                {'content': 'hi', 'role': 'user'},
            ],
        )

    def test_make_message_dynamic(self):
        prompts = {'dynamic system body': 'dynamic body'}
        llm = LLM(
            'url',
            'key',
            'llama3',
            role='dynamic system body',
            temperature=0.8,
            timeout=10,
            max_messages=2,
            prompts=prompts,
        )

        llm.messages.append({'role': 'user', 'content': 'hi'})
        actual = llm.make_messages('hi', True, True)
        self.assertEqual(
            actual[0],
            [
                {'content': 'dynamic body', 'role': 'system'},
                {'content': 'hi', 'role': 'user'},
            ],
        )

    def test_get_infer_url(self):
        def mock_llm(base_url):
            return LLM(
                base_url,
                'key',
                'llama3',
                role='default',
                temperature=0.8,
                timeout=10,
                max_messages=2,
                prompts={'default': None},
            )

        for base_url in ['https://api.openai.com/v1', 'https://api.openai.com/v1/']:
            llm = mock_llm(base_url)
            self.assertEqual(
                llm.get_infer_url(), 'https://api.openai.com/v1/chat/completions'
            )

        for base_url in [
            'https://api.cloudflare.com/client/v4/accounts/xx/ai/v1/',
            'https://api.cloudflare.com/client/v4/accounts/xx/ai/v1',
        ]:
            llm = mock_llm(base_url)
            self.assertEqual(
                llm.get_infer_url(),
                'https://api.cloudflare.com/client/v4/accounts/xx/ai/v1/chat/completions',
            )
