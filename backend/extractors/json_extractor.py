import json

def extract_json_text(file_bytes: bytes) -> str:
    data = json.loads(file_bytes.decode("utf-8", errors="ignore"))
    return json.dumps(data, indent=2)
