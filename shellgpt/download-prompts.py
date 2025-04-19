#!/usr/bin/env python
# coding: utf-8

# pip install tomli-w

import json
import csv
import subprocess
import tomli_w

# https://github.com/f/awesome-chatgpt-prompts/
url = 'https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv'


def main():
    out = subprocess.getoutput(f'curl -s {url}')
    rdr = csv.reader(out.split('\n'))
    contents = {}
    for row in rdr:
        name = (
            row[0]
            .replace('(', '')
            .replace(')', '')
            .replace(' ', '-')
            .replace('`', '')
            .replace('/', '-')
            .lower()
        )
        if name == 'act':
            # skip first row
            continue

        content = row[1]
        contents[name] = content

    with open('prompts.toml', 'wb') as f:
        tomli_w.dump(contents, f)


if __name__ == '__main__':
    main()
