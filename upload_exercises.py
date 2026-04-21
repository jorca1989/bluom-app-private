#!/usr/bin/env python3
"""
Bluom Exercise Uploader
========================
Downloads workout videos & illustrations from Dropbox, uploads to Cloudflare R2.

Per exercise it uploads:
  - Male video   → {name}.mp4
  - Female video → {name}_female.mp4
  - Male thumb   → {name}_thumb.jpg   (first illustration image)
  - Female thumb → {name}_female_thumb.jpg (first female illustration image)

Setup (run once):
    pip3 install boto3 requests

Usage:
    python3 upload_exercises.py

Add exercise names (no extension, no _female suffix) to:
    exercises_back.txt   — one per line
    exercises_chest.txt  — one per line
    exercises_legs.txt   — one per line

The script skips any exercise already in R2 and saves progress to
upload_progress.json so it can be safely stopped and resumed.
"""

import boto3
import requests
import json
import time
import sys
import urllib.parse
from pathlib import Path
from botocore.exceptions import ClientError

# ── R2 Credentials (jwfcarvalho1989@gmail.com account) ───────────────────────
ACCOUNT_ID  = '716440396590dd2816ba60c8495f6cbd'
R2_ENDPOINT = f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com'
R2_ACCESS   = '379a0004d5daf96551afb415ecb6d65e'
R2_SECRET   = '9ec69ae08d1cacf90efc6359ff92b3f63e50e539c5f31a3f007a61f61a0ee5ff'

# ── Dropbox shared folder base ────────────────────────────────────────────────
DROPBOX_BASE = 'https://www.dropbox.com/scl/fo/zir9qux9o6ptdcboq2ubm/h'

# ── R2 public CDN URLs ────────────────────────────────────────────────────────
R2_PUBLIC = {
    'backworkouts': 'https://pub-ae1a814d0cba415f94c35df1b273c81c.r2.dev',
    'chest':        'https://pub-75fbc9ede62e40de84e7cb45d6b96923.r2.dev',
    'legs':         'https://pub-75ff66c937a74772b98cb62f1512cbd2.r2.dev',
}

# ── Muscle group config ───────────────────────────────────────────────────────
MUSCLE = {
    'Back':  {'bucket': 'backworkouts', 'video': 'VERTICAL VIDEOS/Back',  'illus': 'ILLUSTRATIONS/Back'},
    'Chest': {'bucket': 'chest',        'video': 'VERTICAL VIDEOS/Chest', 'illus': 'ILLUSTRATIONS/Chest'},
    'Legs':  {'bucket': 'legs',         'video': 'VERTICAL VIDEOS/Legs',  'illus': 'ILLUSTRATIONS/Legs'},
}

PROGRESS_FILE = Path('upload_progress.json')
HEADERS = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}

# ── S3 client ─────────────────────────────────────────────────────────────────
s3 = boto3.client(
    's3',
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS,
    aws_secret_access_key=R2_SECRET,
    region_name='auto',
)


def load_progress():
    if PROGRESS_FILE.exists():
        return json.loads(PROGRESS_FILE.read_text())
    return {}


def save_progress(p):
    PROGRESS_FILE.write_text(json.dumps(p, indent=2))


def in_r2(bucket, key):
    try:
        s3.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError:
        return False


def r2_url(bucket, key):
    return f"{R2_PUBLIC[bucket]}/{urllib.parse.quote(key)}"


def dropbox_download(folder, filename):
    """Download a file from Dropbox. Returns (bytes, content_type) or (None, None)."""
    encoded = urllib.parse.quote(filename)
    folder_enc = urllib.parse.quote(folder)
    url = f'{DROPBOX_BASE}/{folder_enc}/{encoded}?dl=1'
    try:
        r = requests.get(url, headers=HEADERS, timeout=300, allow_redirects=True)
        ct = r.headers.get('Content-Type', '')
        # If Dropbox returns HTML it's a 404/error page
        if r.status_code == 200 and 'text/html' not in ct:
            size_kb = len(r.content) // 1024
            print(f'        ↓  {filename}  ({size_kb:,} KB)')
            return r.content, ct.split(';')[0].strip()
        elif r.status_code != 200:
            print(f'        –  {filename} → {r.status_code} (not found)')
        return None, None
    except Exception as e:
        print(f'        ✗  Download error for {filename}: {e}')
        return None, None


def r2_upload(bucket, key, data, content_type):
    """Upload bytes to R2. Returns True on success."""
    try:
        s3.put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)
        print(f'        ✓  → {r2_url(bucket, key)}')
        return True
    except Exception as e:
        print(f'        ✗  R2 upload error for {key}: {e}')
        return False


def process_exercise(muscle_group, exercise_name, progress):
    """
    Upload 4 files for one exercise:
      male video, female video, male thumb, female thumb
    """
    cfg = MUSCLE[muscle_group]
    bucket      = cfg['bucket']
    video_dir   = cfg['video']
    illus_dir   = cfg['illus']
    pkey        = f'{muscle_group}/{exercise_name}'

    if progress.get(pkey, {}).get('done'):
        print(f'    ⊘  Already done: {exercise_name}')
        return

    print(f'\n  ▶  [{muscle_group}]  {exercise_name}')
    result = {}

    # ── Male video ──────────────────────────────────────────────────────────
    key_vm = f'{exercise_name}.mp4'
    if in_r2(bucket, key_vm):
        print(f'      ✓  Male video already in R2')
        result['video_male'] = r2_url(bucket, key_vm)
    else:
        data, ct = dropbox_download(video_dir, key_vm)
        if data:
            if r2_upload(bucket, key_vm, data, ct or 'video/mp4'):
                result['video_male'] = r2_url(bucket, key_vm)

    # ── Female video ─────────────────────────────────────────────────────────
    # Dropbox uses either _female or _Female suffix — try both
    key_vf = f'{exercise_name}_female.mp4'
    if in_r2(bucket, key_vf):
        print(f'      ✓  Female video already in R2')
        result['video_female'] = r2_url(bucket, key_vf)
    else:
        for try_name in [f'{exercise_name}_female.mp4', f'{exercise_name}_Female.mp4']:
            data, ct = dropbox_download(video_dir, try_name)
            if data:
                if r2_upload(bucket, key_vf, data, ct or 'video/mp4'):
                    result['video_female'] = r2_url(bucket, key_vf)
                break

    # ── Male thumbnail (first/only illustration image) ───────────────────────
    key_tm = f'{exercise_name}_thumb.jpg'
    if in_r2(bucket, key_tm):
        print(f'      ✓  Male thumb already in R2')
        result['thumb_male'] = r2_url(bucket, key_tm)
    else:
        # Try common illustration naming patterns — use FIRST image only
        for try_name in [
            f'{exercise_name}_01.jpg',
            f'{exercise_name}_1.jpg',
            f'{exercise_name}_start.jpg',
            f'{exercise_name}.jpg',
        ]:
            data, ct = dropbox_download(illus_dir, try_name)
            if data:
                if r2_upload(bucket, key_tm, data, 'image/jpeg'):
                    result['thumb_male'] = r2_url(bucket, key_tm)
                break

    # ── Female thumbnail (first illustration image, female variant) ──────────
    key_tf = f'{exercise_name}_female_thumb.jpg'
    if in_r2(bucket, key_tf):
        print(f'      ✓  Female thumb already in R2')
        result['thumb_female'] = r2_url(bucket, key_tf)
    else:
        for try_name in [
            f'{exercise_name}_female_01.jpg',
            f'{exercise_name}_Female_01.jpg',
            f'{exercise_name}_female_1.jpg',
            f'{exercise_name}_female.jpg',
            f'{exercise_name}_Female.jpg',
        ]:
            data, ct = dropbox_download(illus_dir, try_name)
            if data:
                if r2_upload(bucket, key_tf, data, 'image/jpeg'):
                    result['thumb_female'] = r2_url(bucket, key_tf)
                break

    if result:
        progress[pkey] = {'done': True, **result}
        save_progress(progress)
        print(f'      ✅  Saved: {pkey}')
    else:
        print(f'      ⚠️   Nothing uploaded for: {exercise_name}')


def main():
    progress = load_progress()
    tasks = []

    for muscle in ['Back', 'Chest', 'Legs']:
        fname = f'exercises_{muscle.lower()}.txt'
        if Path(fname).exists():
            names = [l.strip() for l in Path(fname).read_text().splitlines()
                     if l.strip() and not l.startswith('#')]
            print(f'📋  {muscle}: {len(names)} exercises from {fname}')
            tasks.extend((muscle, n) for n in names)
        else:
            print(f'⚠️   {fname} not found — skipping {muscle}')

    if not tasks:
        print('\n❌  No exercise files found.')
        print('Create exercises_back.txt / exercises_chest.txt / exercises_legs.txt')
        print('One exercise name per line (no extension, no _female suffix).')
        print('\nExample exercises_back.txt:')
        print('  Band Deadlift\n  Band Pull Up\n  Barbell Bent Over Row')
        sys.exit(1)

    already_done = sum(1 for (m, n) in tasks if progress.get(f'{m}/{n}', {}).get('done'))
    print(f'\n🚀  {len(tasks)} total  |  {already_done} already done  |  '
          f'{len(tasks) - already_done} to process\n')

    for i, (muscle, name) in enumerate(tasks, 1):
        pkey = f'{muscle}/{name}'
        if not progress.get(pkey, {}).get('done'):
            print(f'  [{i}/{len(tasks)}]', end='')
        process_exercise(muscle, name, progress)
        time.sleep(0.5)  # polite delay between exercises

    done = sum(1 for (m, n) in tasks if progress.get(f'{m}/{n}', {}).get('done'))
    print(f'\n\n✅  Finished: {done}/{len(tasks)} exercises uploaded.')
    print(f'📄  Full results saved to upload_progress.json')


if __name__ == '__main__':
    main()
