import json
from enum import Enum

from ..utils.common import base64_image, debug_print, prepare_prompt
from ..utils.conf import (
    DEFAULT_TEMPERATURE,
    DEFAULT_MAX_CHAT_MESSAGES,
    DEFAULT_IMAGE_MODEL,
    DEFAULT_TIMEOUT,
)
from ..utils.http import TimeoutSession


class Backend(Enum):
    OpenAI = 1
    Ollama = 2


class LLM(object):
    def __init__(self, base_url, key, model, **kwargs):
        self.base_url = base_url
        self.model = model
        self.prompts = kwargs.get('prompts')
        if self.prompts is None:
            raise Exception('prompts is required for LLM')
        role = kwargs.get('role')
        if role is None:
            raise Exception('role is required for LLM')
        self.role = role
        self.temperature = kwargs.get('temperature', DEFAULT_TEMPERATURE)
        self.max_messages = kwargs.get('max_messages', DEFAULT_MAX_CHAT_MESSAGES)
        self.image_model = kwargs.get('image_model', DEFAULT_IMAGE_MODEL)

        timeout = kwargs.get('timeout', DEFAULT_TIMEOUT)
        session = TimeoutSession(timeout=timeout)
        if key is not None and key != '':
            session.headers = {'Authorization': f'Bearer {key}'}
            self.backend = Backend.OpenAI
        else:
            self.backend = Backend.Ollama

        self.http_session = session
        self.messages = []

    def get_role_content(self, sc):
        if sc not in self.prompts:
            raise Exception(f"Role '{sc}' not found in prompts.")
        return self.prompts.get(sc).strip()

    def chat(self, prompt, stream=True, add_system_message=True):
        if self.backend == Backend.OpenAI:
            return self.chat_openai(prompt, stream, add_system_message)
        elif self.backend == Backend.Ollama:
            return self.chat_ollama(prompt, stream, add_system_message)

        raise Exception(
            f'Unsupported backend: {self.backend}, please check your configuration.'
        )

    def chat_openai(self, prompt, stream, add_system_message):
        url = self.get_infer_url()
        self.messages.append({'role': 'user', 'content': prompt})
        messages, model = self.make_messages(
            prompt,
            False,
            add_system_message,
        )
        debug_print(
            f'chat: {prompt[:50]!r}... to {url} with model {self.model}-{self.backend} role {self.role} and stream {stream}, messages: \n{str(messages)[:50]!r}...'
        )
        payload = {
            'messages': messages,
            'model': model,
            'stream': stream,
            'temperature': self.temperature,
        }
        r = self.http_session.post(url, json=payload, stream=stream)
        if r.status_code != 200:
            raise Exception('Error: ' + r.text)

        answer = ''
        if not stream:
            resp = r.json()
            answer = resp['choices'][0]['message']['content']
            self.messages.append({'role': 'assistant', 'content': answer})
            yield answer
            return

        current = b''
        # https://github.com/openai/openai-python#streaming-responses
        # The response is SSE, so we need to parse the response line by line.
        for item in r.iter_content(chunk_size=None):
            # debug_print(f'\nitem: {item}\ncurrent: {current}')
            for msg in item.split(b'\n\n'):
                msg = msg.removeprefix(b'data: ')
                if len(msg) == 0:
                    continue

                current += msg

                # when current end with '}', it maybe the end of the message
                if current[-1] == 125:
                    # msg is a complete JSON message
                    # `data:` may appear in the middle of the message, so we need to remove it again.
                    msg = current.removeprefix(b'data: ')
                    current = b''
                else:
                    continue

                s = msg.decode('utf-8')
                if s == '[DONE]':
                    break
                else:
                    try:
                        resp = json.loads(s)
                        for item in resp['choices']:
                            if 'content' not in item['delta']:
                                continue

                            msg = item['delta']['content']
                            answer += msg
                            yield msg
                    except json.JSONDecodeError:
                        # this means the message is not a JSON message, so we need to continue searching next }.
                        current = msg
                        continue

        if answer:
            self.messages.append({'role': 'assistant', 'content': answer})

    def get_infer_url(self):
        base_url = self.base_url if self.base_url.endswith('/') else self.base_url + '/'
        if self.backend == Backend.OpenAI:
            return base_url + 'chat/completions'
        elif self.backend == Backend.Ollama:
            return base_url + 'api/chat'
        else:
            raise Exception(
                f'Unsupported backend: {self.backend}, please check your configuration.'
            )

    def make_messages(self, prompt, support_image, add_system_message):
        model = self.model
        if add_system_message is False:
            return [{'role': 'user', 'content': prompt}], model

        after, imgs = prepare_prompt(prompt) if support_image else (prompt, [])
        if len(imgs) > 0:
            # update last message which is the user message just added
            self.messages[-1]['content'] = after
            self.messages[-1]['images'] = [base64_image(img) for img in imgs]
            model = self.image_model

        if len(self.messages) > self.max_messages:
            self.messages = self.messages[-self.max_messages :]

        role_content = self.get_role_content(self.role)
        msgs = (
            []
            if role_content is None
            else [
                {
                    'role': 'system',
                    'content': role_content,
                }
            ]
        )
        for m in self.messages:
            msgs.append(m)

        return msgs, model

    # https://github.com/ollama/ollama/blob/main/docs/api.md#generate-a-completion
    def chat_ollama(self, prompt, stream, add_system_message):
        model = self.model
        url = self.get_infer_url()
        self.messages.append({'role': 'user', 'content': prompt})
        messages, model = self.make_messages(prompt, True, add_system_message)
        debug_print(
            f'chat: {prompt[:50]!r}... to {url} with model {self.model} role {self.role} and stream {stream}, messages: \n{str(messages)[:50]!r}...'
        )

        payload = {
            'messages': messages,
            'model': model,
            'stream': stream,
            'options': {'temperature': self.temperature},
        }

        r = self.http_session.post(url, json=payload, stream=stream)
        if r.status_code != 200:
            raise Exception('Error: ' + r.text)

        answer = ''
        if not stream:
            resp = r.json()
            answer = resp['message']['content']
            self.messages.append({'role': 'assistant', 'content': answer})
            yield answer
            return

        for item in r.iter_content(chunk_size=None):
            resp = json.loads(item)
            if resp['done']:
                break
            else:
                content = resp['message']['content']
                answer += content
                yield content

        if answer:
            self.messages.append({'role': 'assistant', 'content': answer})
