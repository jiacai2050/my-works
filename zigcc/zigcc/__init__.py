#!/usr/bin/env python3

# A util script that aims to ease use `zig cc` to compile C/C++/Rust/Go programs.
#
# How it works:
# This script will infer which command to run based on `sys.argv[0]`, which is
# the program name, currently it supports:
# 1. zigcc, invoke `zig cc`
# 2. zigcxx, invoke `zig c++`
# 3. zigcargo, invoke `cargo` with `CC`, `CXX`, and rustc linker set to zig.
#
# Supported env vars:
# 1. `ZIGCC_VERBOSE`, enable verbose log
# 2. `ZIGCC_FLAGS`, extra flags passed to zig

import sys
import os
import logging
import subprocess

__VERSION__ = '1.0.1'

UNKNOWN = 0
RUST = 1
GO = 2
ENABLE_LOG = os.getenv('ZIGCC_VERBOSE', '0') == '1'
ENABLE_SANITIZE = os.getenv('ZIGCC_ENABLE_SANITIZE', '0') == '1'
APPEND_SYSROOT = os.getenv('ZIGCC_APPEND_SYSROOT', '0') == '1'
FLAGS = os.getenv(
    'ZIGCC_FLAGS', '' if ENABLE_SANITIZE else '-fno-sanitize=undefined'
).split(' ')
FLAGS = [f for f in FLAGS if f != '']

# Blacklist flags, wild match
BLACKLIST_WILD_FLAGS = os.getenv('ZIGCC_BLACKLIST_FLAGS', '').split(' ') + [
    '--target',
    '-exported_symbols_list',
    '-no_pie',
    '-Wl,-dylib',
    # https://github.com/ziglang/zig/issues/5320
    'self-contained/rcrt1.o',
    'self-contained/crti.o',
    '-x',
]
BLACKLIST_WILD_FLAGS = [f for f in BLACKLIST_WILD_FLAGS if f != '']


def log(msg, *args, **kwargs):
    if ENABLE_LOG:
        logging.info(msg, *args, **kwargs)


def zig_target_from(target, lang):
    if lang == RUST:
        # Zig target has no vendor field
        # i686-pc-windows-msvc --> x86-windows-msvc
        triple = target.split('-')
        if len(triple) == 4:
            [arch, vendor, os, abi] = triple
        # aarch64-apple-darwin
        elif len(triple) == 3:
            [arch, vendor, os] = triple
            abi = 'none'
        else:
            return target

        zig_arch = {
            'i686': 'x86',
        }.get(arch, arch)
        zig_os = {'darwin': 'macos'}.get(os, os)
        return '-'.join([zig_arch, zig_os, abi])
    elif lang == GO:
        [arch, os] = target.split('-', 2)
        zig_arch = {
            '386': 'x86',
            'amd64': 'x86_64',
            'arm64': 'aarch64',
        }.get(arch, arch)
        zig_os = {'darwin': 'macos'}.get(os, os)
        return '-'.join([zig_arch, zig_os])
    else:
        return target


# Detect zig target from language specific vars.
def detect_zig_target():
    target = os.getenv('CARGO_BUILD_TARGET')
    if target is not None:
        return zig_target_from(target, RUST)

    goos = os.getenv('GOOS')
    if goos is not None:
        goarch = os.getenv('GOARCH')
        guess = zig_target_from('{}-{}'.format(goarch, goos), GO)
        host = zig_target_from(
            '{}-{}'.format(os.getenv('GOHOSTARCH'), os.getenv('GOHOSTOS')), GO
        )
        # Ignore target when it's the same as the host
        return None if guess == host else guess

    return None


def cargo_linker_var_name(target):
    return 'CARGO_TARGET_{}_LINKER'.format(target.replace('-', '_').upper())


def guess_rust_target(args):
    found_target = False
    for arg in args:
        if arg == '--target':
            found_target = True
            continue
        if found_target:
            return arg

    target = os.getenv('CARGO_BUILD_TARGET')
    if target is not None:
        return target

    try:
        stdout = subprocess.check_output(['rustc', '-Vv']).decode('utf8')
        for line in stdout.split('\n'):
            kv = line.split(':', 2)
            if len(kv) > 1:
                [key, value] = kv
                if key == 'host':
                    return value.strip()
    except Exception as e:
        log('Get rustc triple failed, err:{}', e)
        raise e


def run_subprocess(args, env):
    log('Begin run command\nArgs:%s\nEnv:%s', args, env)
    try:
        subprocess.run(args, check=True, env=env)
    except subprocess.CalledProcessError as e:
        log(f'Command {e.cmd} failed with error {e.returncode}')
        sys.exit(e.returncode)


def run_as_cargo(args):
    target = guess_rust_target(args)
    env = os.environ.copy()
    env[cargo_linker_var_name(target)] = 'zigcc'
    env['CC'] = 'zigcc'
    env['CXX'] = 'zigcxx'
    run_subprocess(['cargo'] + args, env)


def main():
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
    program = os.path.basename(sys.argv[0])
    args = sys.argv[1:]
    if program == 'zigcargo':
        run_as_cargo(args)
        sys.exit(0)

    run_args = {
        'zigcc': ['zig', 'cc'],
        'zigcxx': ['zig', 'c++'],
    }.get(program)
    if run_args is None:
        print(f'Unknown program, {program}')
        sys.exit(1)

    target = detect_zig_target()
    if target is not None:
        run_args += ['-target', target]

    for flag in FLAGS:
        run_args.append(flag)

    for arg in args:
        found = False
        for wild_args in BLACKLIST_WILD_FLAGS:
            if wild_args in arg:
                found = True
                break

        if found:
            continue

        run_args.append(arg)

    if APPEND_SYSROOT:
        root_path = subprocess.getoutput('xcrun --show-sdk-path')
        # https://github.com/ziglang/zig/issues/10299#issuecomment-989736808
        # https://github.com/ziglang/zig/issues/10790#issuecomment-1030712395
        run_args += [
            f'--sysroot={root_path}',
            f'-F{root_path}/System/Library/Frameworks',
            '-I/usr/include',
            '-L/usr/lib',
        ]

    run_subprocess(run_args, os.environ)


if __name__ == '__main__':
    main()
