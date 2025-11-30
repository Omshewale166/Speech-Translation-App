from flask import Flask, request, jsonify, render_template, send_file
from flask_cors import CORS  # Add for cross-origin requests
import speech_recognition as sr
from googletrans import Translator
from gtts import gTTS
import os
import uuid
import tempfile  # Better for temporary files
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)  # Enable CORS if needed
translator = Translator()

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'ogg'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/speech-to-text", methods=["POST"])
def speech_to_text():
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files["audio"]
        
        if audio_file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        
        if not allowed_file(audio_file.filename):
            return jsonify({"error": "File type not allowed"}), 400

        # Create temporary file
        temp_dir = tempfile.gettempdir()
        filename = os.path.join(temp_dir, f"audio_{uuid.uuid4()}.wav")
        audio_file.save(filename)

        recog = sr.Recognizer()
        with sr.AudioFile(filename) as source:
            # Adjust for ambient noise
            recog.adjust_for_ambient_noise(source)
            audio = recog.record(source)
        
        text = recog.recognize_google(audio)
        
        # Clean up file
        os.remove(filename)
        
        return jsonify({"text": text})
        
    except sr.UnknownValueError:
        return jsonify({"error": "Could not understand audio"}), 400
    except sr.RequestError as e:
        return jsonify({"error": f"Speech recognition error: {e}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/translate", methods=["POST"])
def translate():
    try:
        data = request.get_json()
        
        if not data or 'text' not in data or 'target' not in data:
            return jsonify({"error": "Missing text or target language"}), 400
        
        text = data["text"]
        target = data["target"]
        
        # Validate input
        if not text.strip():
            return jsonify({"error": "Text cannot be empty"}), 400
        
        translated = translator.translate(text, dest=target)
        
        return jsonify({
            "translated": translated.text,
            "source_lang": translated.src,
            "original_text": text
        })
        
    except Exception as e:
        return jsonify({"error": f"Translation failed: {str(e)}"}), 500

@app.route("/text-to-speech", methods=["POST"])
def text_to_speech():
    try:
        data = request.get_json()
        
        if not data or 'text' not in data or 'lang' not in data:
            return jsonify({"error": "Missing text or language"}), 400
        
        text = data["text"]
        lang = data["lang"]
        
        if not text.strip():
            return jsonify({"error": "Text cannot be empty"}), 400

        # Create temporary file in system temp directory
        temp_dir = tempfile.gettempdir()
        filename = os.path.join(temp_dir, f"tts_{uuid.uuid4()}.mp3")
        
        tts = gTTS(text=text, lang=lang)
        tts.save(filename)
        
        response = send_file(
            filename, 
            mimetype="audio/mp3",
            as_attachment=True,
            download_name="speech.mp3"
        )
        
        # Clean up file after sending
        @response.call_on_close
        def cleanup():
            try:
                os.remove(filename)
            except:
                pass
                
        return response
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Method not allowed"}), 405

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)