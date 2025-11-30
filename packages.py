import subprocess
import sys

packages = [
    "Flask",
    "flask-cors",
    "SpeechRecognition",
    "googletrans==4.0.0-rc1",
    "gTTS",
    "Werkzeug",
    "pydub"
]

for pkg in packages:
    print(f"Installing {pkg}...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", pkg])

print("All packages installed successfully!")
