import argparse
import sys
import readline
from .api.llm import LLM
from .init import init_app
from .utils.conf import (
    IS_TTY,
    load_config,
    DEFAULT_IMAGE_DIR_VALUE,
)
from .utils.common import (
    is_verbose,
    execute_cmd,
    copy_text,
    read_stdin,
    extract_code,
    set_verbose,
    AppMode,
)
from .history import History


def list_roles(roles):
    for name, content in roles.items():
        print(f'[{name}]')
        print(content.strip())
        print('-' * 20)


# List of commands for autocompletion
commands = ['exit', 'clear', 'editor', 'set', 'copy', 'explain', 'run', 'clear']


def completer(text, state):
    options = [cmd for cmd in commands if cmd.startswith(text)]
    if state < len(options):
        return options[state]
    else:
        return None


def repl_setup():
    readline.set_completer(completer)
    # Use Tab for completion
    if sys.platform == 'darwin':
        readline.parse_and_bind('bind ^I rl_complete')
    else:
        readline.parse_and_bind('tab: complete')

    # Enable case-insensitive completion
    readline.set_completer_delims(r' \t\n;')


class ShellGPT(object):
    def __init__(self, url, key, model, role, history, **kwargs):
        self.is_shell = role == 'shell'
        self.answers = []
        self.history = history
        self.num_prompt = 0
        self.stream = kwargs.get('stream', True)
        self.image_dir = kwargs.get('image_dir', DEFAULT_IMAGE_DIR_VALUE)
        self.llm = LLM(url, key, model, role=role, **kwargs)

    def tui(self, history, initial_prompt):
        try:
            from .tui.app import ShellGPTApp

            app = ShellGPTApp(self.llm, history, initial_prompt, self.stream)
            app.run()
        except ImportError:
            print(
                'TUI dependencies are NOT installed. Please install them with: pip install shgpt[tui]'
            )
            sys.exit(1)

    def editor(self):
        print('// Entering editor mode (Ctrl+D to finish, Ctrl+C to cancel)')
        prompt = None
        while True:
            try:
                if prompt is None:
                    prompt = input('')
                else:
                    prompt += input('')
            except KeyboardInterrupt:  # Ctrl+C to cancel
                return None
            except EOFError:  # Ctrl+D to finish
                return prompt

    # return true when prompt is a builtin command
    def repl_action(self, prompt):
        if 'exit' == prompt:
            self.history.remove_last()
            raise EOFError
        elif prompt == 'clear':
            self.llm.messages.clear()
            return True
        elif prompt in ['ed', 'editor']:
            new_prompt = self.editor()
            if new_prompt is not None:
                self.infer(new_prompt)
            return True

        if self.is_shell:
            if prompt in ['e', 'explain']:
                if len(self.answers) == 0:
                    print('No command to explain!')
                else:
                    self.explain_cmd(self.answers[-1])
                return True
            elif prompt in ['r', 'run']:
                if len(self.answers) == 0:
                    print('No command to execute!')
                else:
                    print(execute_cmd(self.answers[-1], ask=True))
                return True

        if prompt.startswith('copy') or prompt.startswith('c'):
            if not self.answers:
                print('No answer to copy!')
                return True

            args = prompt.strip().split(' ')
            if len(args) == 1:
                copy_text(self.answers[-1])
                return True
            elif len(args) == 2:
                try:
                    count = int(args[1])
                    if count > 0:
                        limit = -count
                        copy_text('\n'.join(self.answers[limit:]))
                    else:
                        print('Number of entries to copy must be a positive integer.')
                except ValueError:
                    print(f'Invalid number: {args[1]}')
                return True

        # Following parse set command
        if prompt.startswith('set') is False:
            return False

        args = prompt.split(' ')
        if len(args) != 3:
            return False

        sub_cmd = args[1]
        if sub_cmd == 'model':
            self.llm.model = args[2]
            return True
        elif sub_cmd == 'role':
            sc = args[2]
            self.is_shell = sc == 'shell'
            self.llm.role = sc
            return True

        return False

    def repl(self, initial_prompt):
        print(
            r"""
__      __   _                    _         ___ _        _ _  ___ ___ _____
\ \    / /__| |__ ___ _ __  ___  | |_ ___  / __| |_  ___| | |/ __| _ \_   _|
 \ \/\/ / -_) / _/ _ \ '  \/ -_) |  _/ _ \ \__ \ ' \/ -_) | | (_ |  _/ | |
  \_/\_/\___|_\__\___/_|_|_\___|  \__\___/ |___/_||_\___|_|_|\___|_|   |_|

Type "exit" or ctrl-d to exit; ctrl-c to stop response; "c" to copy last answer;
     "clear" to reset history messages; "ed" to enter editor mode.
When system content is shell, type "e" to explain, "r" to run last command.
""",
            end='',
        )

        repl_setup()
        try:
            self.repl_inner(initial_prompt)
        except EOFError:
            print(f'\n{self.num_prompt} questions asked this time, bye...')
            sys.exit(0)

    def repl_inner(self, initial_prompt):
        prompt = initial_prompt
        while True:
            try:
                self.infer(prompt)
                prompt = input(f'{self.llm.role}@{self.llm.model}> ')
                if IS_TTY and self.repl_action(prompt):
                    self.history.remove_last()
                    prompt = ''  # Reset prompt after action
                    continue
            except KeyboardInterrupt:
                print()
                prompt = ''

    def infer(self, prompt):
        if prompt == '':
            return

        self.num_prompt += 1
        resp = ''
        try:
            for r in self.llm.chat(prompt, stream=self.stream):
                resp += r
                if self.is_shell is False:
                    print(r, end='', flush=True)

            if self.is_shell:
                code = extract_code(resp)
                if code is not None:
                    resp = code
                print(resp)
            else:
                print()
        except Exception as e:
            print(f'Error when infer: ${e}')
            if is_verbose():
                raise e
        finally:
            self.answers.append(resp)

    def explain_cmd(self, cmd):
        resp = ''
        for r in self.llm.chat(
            f'Explain this command: {cmd}',
            add_system_message=False,
            stream=self.stream,
        ):
            resp += r
            print(r, end='', flush=True)
        print()
        self.answers.append(resp)


def get_version():
    from importlib import metadata

    try:
        version = metadata.version('shgpt')
        return version
    except metadata.PackageNotFoundError:
        return 'Version not found'


def main():
    parser = argparse.ArgumentParser(
        prog='sg',
        description='Chat with LLM in your terminal, be it shell generator, story teller, linux-terminal, etc.',
    )

    parser.add_argument('--repl', action='store_true', help='Enter interactive REPL')
    parser.add_argument('--tui', action='store_true', help='Enter TUI mode')
    parser.add_argument(
        '--init',
        action='store_true',
        help='Create required directories and default config.toml',
    )
    parser.add_argument('--list', action='store_true', help='List all available roles')

    parser.add_argument(
        '-p',
        '--profile',
        help='Profile to use (default: default_profile defined in config.toml)',
    )
    parser.add_argument(
        '-r',
        '--role',
        help='Predefined role name (see [roles] in config.toml)',
    )
    parser.add_argument(
        '-t',
        '--timeout',
        type=int,
        help='Timeout in seconds for each inference',
    )
    parser.add_argument('--api-url', help='Base API URL')
    parser.add_argument('--api-key', help='API Key')
    parser.add_argument(
        '-m',
        '--model',
        help='Model name',
    )
    parser.add_argument(
        '--stream',
        action='store_true',
        default=None,
        help='Stream response',
    )
    parser.add_argument(
        '--no-stream',
        action='store_false',
        dest='stream',
        help='Do not stream response',
    )
    parser.add_argument('--verbose', action='store_true', help='Verbose mode')
    parser.add_argument(
        '-v', '--version', action='version', version='%(prog)s ' + get_version()
    )
    parser.add_argument('prompt', metavar='<prompt>', nargs='*')
    args = parser.parse_args()
    set_verbose(args.verbose)

    # 这里的逻辑是：1. 命令行参数优先；2. 如果没传命令行参数，则看 -p 切换 profile；3. 最后使用默认配置
    params = load_config(args.profile)

    if args.init:
        init_app()
        sys.exit(0)
    elif args.list:
        list_roles(params['roles'])
        sys.exit(0)

    sin = read_stdin()
    prompt = ' '.join(args.prompt)
    if sin is not None:
        prompt = f'{sin}\n\n{prompt}'

    if args.repl:
        app_mode = AppMode.REPL
    elif args.tui:
        app_mode = AppMode.TUI
    else:
        app_mode = AppMode.REPL if len(prompt) == 0 else AppMode.Direct

    role_name = args.role or params.get('role', 'default')
    if app_mode == AppMode.TUI:
        role_name = 'shell'

    if role_name not in params['roles']:
        print(f"Error: role '{role_name}' not found.")
        sys.exit(1)

    # 准备传给 ShellGPT 的参数
    # 命令行显式传参拥有最高优先级
    conf_kwargs = {
        'temperature': params['temperature'],
        'timeout': args.timeout or params['timeout'],
        'max_messages': params['max_messages'],
        'stream': params['stream'] if args.stream is None else args.stream,
        'image_model': params['image_model'],
        'image_dir': params['image_dir'],
        'prompts': params['roles'],
    }

    history = History()
    sg = ShellGPT(
        args.api_url or params['api_url'],
        args.api_key or params['api_key'],
        args.model or params['model'],
        role_name,
        history,
        **conf_kwargs,
    )
    if prompt != '':
        history.add(prompt)

    if app_mode == AppMode.Direct:
        sg.infer(prompt)
    elif app_mode == AppMode.TUI:
        sg.tui(history, prompt)
    else:
        sg.repl(prompt)
