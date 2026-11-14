import struct, json, os

models_dir = 'public/models'
for f in os.listdir(models_dir):
    if not f.endswith('.glb'): continue
    path = os.path.join(models_dir, f)
    with open(path, 'rb') as fp:
        header = fp.read(12)
        if len(header) < 12: continue
        magic, version, length = struct.unpack('<4sII', header)
        if magic != b'glTF': continue
        chunk_len, chunk_type = struct.unpack('<II', fp.read(8))
        if chunk_type == 0x4E4F534A: # JSON
            json_bytes = fp.read(chunk_len)
            data = json.loads(json_bytes.decode('utf-8', errors='ignore'))
            asset = data.get('asset', {})
            print(f"=== {f} ===")
            print("  generator:", asset.get('generator'))
            print("  copyright:", asset.get('copyright'))
            print("  extras:   ", asset.get('extras'))

