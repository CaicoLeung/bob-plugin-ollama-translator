import sys
import hashlib
import json
from pathlib import Path


def update_appcast(version, desc):
    release_file = Path(
        f'dist/bob-plugin-ollama-translator-v{version}.bobplugin')
    assert release_file.is_file(), 'Release file not exist'
    with open(release_file, 'rb') as f:
        c = f.read()
        file_hash = hashlib.sha256(c).hexdigest()
    version_info = {
        'version': version,
        'desc': desc,
        'sha256': file_hash,
        'url': f'https://github.com/CaicoLeung/bob-plugin-ollama-translator/releases/download/{version}/{release_file.name}',
        'minBobVersion': '1.8.0'
    }
    appcast_file = Path('appcast.json')
    if appcast_file.is_file():
        with open(appcast_file, 'r') as f:
            appcast = json.load(f)
    else:
        appcast = dict(identifier='bob-plugin-ollama-translator', versions=[])
    appcast['versions'].insert(0, version_info)
    with open(appcast_file, 'w') as f:
        json.dump(appcast, f, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    version = sys.argv[1]
    desc = sys.argv[2]
    update_appcast(version, desc)
