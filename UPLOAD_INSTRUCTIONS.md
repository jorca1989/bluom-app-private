# Bluom Exercise Uploader — Setup & Usage

## What it does
For each exercise name in the list files, it uploads:
- **Male video** → `{name}.mp4` → R2 bucket
- **Female video** → `{name}_female.mp4` → R2 bucket  
- **Male thumbnail** → first illustration image → R2 as `{name}_thumb.jpg`
- **Female thumbnail** → first female illustration → R2 as `{name}_female_thumb.jpg`

Skips any file already in R2. Saves progress to `upload_progress.json` — safe to stop/restart.

---

## One-time setup (Mac terminal)

```bash
pip3 install boto3 requests
```

---

## Run

Open Terminal, `cd` to your BluomAppNew folder, then:

```bash
python3 upload_exercises.py
```

Progress is printed live. Results (with R2 URLs) saved to `upload_progress.json`.

---

## Add missing exercises

If an exercise from Dropbox isn't in the list files, just add its name to the right `.txt` file:

- `exercises_back.txt`   — Back muscle group
- `exercises_chest.txt`  — Chest muscle group
- `exercises_legs.txt`   — Legs muscle group

One name per line. No file extension. No `_female` suffix. Lines starting with `#` are comments.

Example:
```
Band Deadlift
Barbell Bent Over Row
Cable Seated Row
```

---

## R2 URLs produced

After running, open `upload_progress.json` to get all R2 URLs:

```json
{
  "Back/Band Deadlift": {
    "done": true,
    "video_male":   "https://pub-ae1a814d0cba415f94c35df1b273c81c.r2.dev/Band%20Deadlift.mp4",
    "video_female": "https://pub-ae1a814d0cba415f94c35df1b273c81c.r2.dev/Band%20Deadlift_female.mp4",
    "thumb_male":   "https://pub-ae1a814d0cba415f94c35df1b273c81c.r2.dev/Band%20Deadlift_thumb.jpg",
    "thumb_female": "https://pub-ae1a814d0cba415f94c35df1b273c81c.r2.dev/Band%20Deadlift_female_thumb.jpg"
  }
}
```

---

## Bucket → public URL mapping

| Bucket | Public URL |
|--------|-----------|
| `backworkouts` | `https://pub-ae1a814d0cba415f94c35df1b273c81c.r2.dev` |
| `chest`        | `https://pub-75fbc9ede62e40de84e7cb45d6b96923.r2.dev` |
| `legs`         | `https://pub-75ff66c937a74772b98cb62f1512cbd2.r2.dev` |
