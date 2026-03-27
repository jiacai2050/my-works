import json

from ..utils.common import (
    base64_image,
    debug_print,
    get_version,
    is_verbose,
    prepare_prompt,
)
from ..utils.conf import (
    DEFAULT_IMAGE_MODEL,
    DEFAULT_MAX_CHAT_MESSAGES,
    DEFAULT_TIMEOUT,
)
from ..utils.http import TimeoutSession


class LLM(object):
    def __init__(
        self,
        base_url,
        key,
        model,
        role,
        prompts,
        temperature=None,
        max_messages=DEFAULT_MAX_CHAT_MESSAGES,
        image_model=DEFAULT_IMAGE_MODEL,
        timeout=DEFAULT_TIMEOUT,
        headers=None,
    ):
        self.base_url = base_url
        self.model = model
        self.prompts = prompts
        if self.prompts is None:
            raise Exception('prompts is required for LLM')
        if role is None:
            raise Exception('role is required for LLM')
        self.role = role
        self.temperature = temperature
        self.max_messages = max_messages
        self.image_model = image_model

        session = TimeoutSession(timeout=timeout)
        session.headers.update(
            {
                'User-Agent': f'shellgpt/{get_version()}; (https://pypi.org/project/shgpt)'
            }
        )
        if headers:
            session.headers.update(headers)

        if key is not None and key != '':
            session.headers.update({'Authorization': f'Bearer {key}'})

        self.http_session = session
        self.messages = []

    def get_role_content(self, sc):
        if sc not in self.prompts:
            raise Exception(f"Role '{sc}' not found in prompts.")
        return self.prompts.get(sc).strip()

    def chat(self, prompt, stream=True, add_system_message=True):
        url = self.get_infer_url()
        self.messages.append({'role': 'user', 'content': prompt})
        messages, model = self.make_messages(
            prompt,
            False,
            add_system_message,
        )
        debug_print(
            f'chat: {prompt[:50]!r}... to {url} with model {self.model} role {self.role} and stream {stream}'
        )
        if is_verbose():
            safe_headers = {
                k: ('<hidden>' if 'authorization' in k.lower() else v)
                for k, v in self.http_session.headers.items()
            }
            debug_print(f'DEBUG: HTTP Headers: {safe_headers}')
            debug_print(f'DEBUG: Messages: {str(messages)[:100]!r}...')

        payload = {
            'messages': messages,
            'model': model,
            'stream': stream,
        }
        if stream:
            payload['stream_options'] = {'include_usage': True}
        if self.temperature is not None:
            payload['temperature'] = self.temperature

        r = self.http_session.post(url, json=payload, stream=stream)
        if r.status_code != 200:
            raise Exception('Error: ' + r.text)

        answer = ''
        if not stream:
            resp = r.json()
            if 'usage' in resp and resp['usage']:
                debug_print(f'Usage: {resp["usage"]}')
            choices = resp.get('choices', [])
            if not choices:
                raise Exception(f'No choices in response: {resp}')
            answer = choices[0].get('message', {}).get('content', '')
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
                        if 'usage' in resp and resp['usage']:
                            debug_print(f'Usage: {resp["usage"]}')
                        for item in resp['choices']:
                            if 'content' not in item['delta']:
                                continue

                            msg = item['delta']['content']
                            if msg is None:
                                debug_print(
                                    f'WARN: Received None content in delta: {resp}'
                                )
                                continue

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
        return base_url + 'chat/completions'

    def make_messages(self, prompt, support_image, add_system_message):
        model = self.model
        if add_system_message is False:
            return [{'role': 'user', 'content': prompt}], model

        # handle image if supported
        after, imgs = prepare_prompt(prompt) if support_image else (prompt, [])
        if len(imgs) > 0:
            # update last message with images
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
