from os import makedirs, path
from .utils.conf import (
    MODEL,
    CONF_PATH,
    DEFAULT_STREAM,
    CONFIG_FILE,
    DEFAULT_TIMEOUT,
    MAX_CHAT_MESSAGES,
    DEFAULT_IMAGE_DIR_VALUE,
    IMAGE_MODEL,
    OS_NAME,
    SHELL,
)


def init_app():
    print(f'Create {CONF_PATH}...')
    makedirs(CONF_PATH, exist_ok=True)
    if path.exists(CONFIG_FILE):
        print(f'{CONFIG_FILE} already exists, skip.')
    else:
        print(f'Create {CONFIG_FILE}...')
        default_config = f"""# ShellGPT Configuration

# The default profile to use when no -p is provided
default_profile = "ollama"

# Global defaults (uncomment to override)
# stream = {str(DEFAULT_STREAM).lower()}
# timeout = {DEFAULT_TIMEOUT}
# temperature = 0.8
# max_messages = {MAX_CHAT_MESSAGES}
# max_history = 1000
# image_model = "{IMAGE_MODEL}"
# image_dir = "{DEFAULT_IMAGE_DIR_VALUE}"

[profiles.ollama]
base_url = "http://127.0.0.1:11434/v1"
model = "{MODEL}"

[profiles.openai]
base_url = "https://api.openai.com/v1"
api_key = "YOUR_API_KEY"
# api_key_env = "OPENAI_API_KEY"
model = "gpt-4o"

[roles]
shell = '''
You are a shell script assistant on {OS_NAME} running {SHELL}.
Output the best matching shell commands without any other information, or any quotes.
Make sure it's valid shell command.
'''
typo = '''
You are now an article correction assistant. You need to find out the input text in the spelling errors, incoherent places, can only return the corrected text, without any explanation. 
The output keeps the original format and language output, don't modify the style, and keep the code blocks unchanged.
'''
code = '''
Provide only code as output without any description.
Provide only code in plain text format without Markdown formatting.
Do not include symbols such as ``` or ```python.
If there is a lack of details, provide most logical solution.
You are not allowed to ask for more details.
For example if the prompt is "Hello world Python", you should return "print('Hello world')".
'''
commit = '''
You are now a git commit message writer. I'll give you a list of changes, and you'll reply with a commit message that summarizes these changes in a clear and concise way, keeping the original formatting.
'''
slug = '''
You are now a slug generator. I will give you some sentences, and you will reply with a slug version of those sentences. A slug is a URL-friendly version of a title, where spaces are replaced with hyphens, and all characters are lowercased. Do not include any special characters, and keep the output in English.
'''
summary = '''
Summarize the following text in a clear and concise way, using bullet points if appropriate, and maintain the original language. Output in Markdown format.
'''
polish = '''
You are a writing assistant. Polish the input text to make it more professional, clear, and engaging. Improve the flow and word choice while maintaining the original meaning and language.
'''
"""
        with open(CONFIG_FILE, 'w') as f:
            f.write(default_config)
