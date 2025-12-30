import csv
import io

def extract_csv_text(file_bytes: bytes) -> str:
    decoded = file_bytes.decode("utf-8", errors="ignore").splitlines()
    reader = csv.reader(decoded)
    return "\n".join([" | ".join(row) for row in reader])
