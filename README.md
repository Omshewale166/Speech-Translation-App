# Speech-Translation-App

A simple Flask web application that converts speech → text → translated text → translated audio using:

Flask

SpeechRecognition

Google Translate API

gTTS

JavaScript (frontend)

🚀 Features

Record live audio from browser

Convert speech to text

Translate text to any language

Convert translated text to speech

Download audio output

Fast & easy to use

📦 Installation Guide
1️⃣ Clone the Repository
git clone https://github.com/<your-username>/Speech-Translation-App.git
cd Speech-Translation-App
🧰 2️⃣ Create & Activate Virtual Environment
➤ Windows (PowerShell)
python -m venv env
env\Scripts\activate
If PowerShell blocks activation

Run this once:

Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

Then activate again:

env\Scripts\activate
➤ Mac / Linux
python3 -m venv env
source env/bin/activate
📦 3️⃣ Install Dependencies
pip install -r requirements.txt

If PyAudio fails for Windows:

pip install pipwin
pipwin install pyaudio
▶️ 4️⃣ Run the Flask App
python app.py

Your app will run on:

http://127.0.0.1:5000
📁 Project Structure
Speech-Translation-App/
│── app.py
│── requirements.txt
│── templates/
│     └── index.html
│── static/
│     ├── style.css
│     └── script.js
│── README.md
🛑 Stop the Server

Press:

CTRL + C

inside the terminal.

📝 Notes

Keep all HTML files inside the templates/ folder

Keep JS, CSS, audio files inside the static/ folder

Activate the virtual environment every time before running the project
