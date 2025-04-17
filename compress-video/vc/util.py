import os


def is_video(file_ext):
    return file_ext.lstrip('.') in [
        'mp4',
        'avi',
        'wmv',
        'mov',
        'mkv',
        'flv',
        'm4v',
        'webm',
        'mpeg',
        '3gp',
        'ogv',
        'ts',
        'm2ts',
        'vob',
        'divx',
        'f4v',
    ]


def make_cmd(input, output, crf):
    return [
        'ffmpeg',
        '-i',
        input,
        '-n',  # Do not overwrite output files
        '-c:v',
        'libx264',  # Sets the video codec to H.264 (libx264).
        '-tag:v',
        'avc1',  # Tags the video as AVC1, which helps with compatibility for certain players.
        '-movflags',
        'faststart',  # Moves the video's metadata to the beginning of the file, allowing the video to start playing before it's fully downloaded.
        '-crf',
        crf,
        '-preset',
        'superfast',  # Sets the encoding speed preset. "superfast" means the encoding will be very quick, but it may impact compression efficiency.
        output,
    ]


def file_size(path):
    s = os.stat(path, follow_symlinks=False)
    return s.st_size


def humanize_bytes(bytes, precision=2):
    abbreviation = ['B', 'KB', 'MB', 'GB', 'TB']
    bytes = float(bytes)
    unit = 1024
    if bytes < unit:
        return f'{bytes} {abbreviation[0]}'
    for i in range(len(abbreviation) - 1):
        if bytes < unit ** (i + 2):
            return f'{bytes / unit ** (i + 1):.{precision}f} {abbreviation[i + 1]}'
    return f'{bytes / unit ** (len(abbreviation) - 1):.{precision}f} {abbreviation[-1]}'
