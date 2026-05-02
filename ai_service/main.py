import cv2
from flask import Flask, Response
from flask_cors import CORS
from ultralytics import YOLO
import requests
import time

app = Flask(__name__)
CORS(app) # Mengatasi masalah akses dari dashboard browser
model = YOLO('yolov8s.pt')

# SESUAIKAN DENGAN IP DARI MQTT
url_esp32 = "http://192.168.1.8:81/stream" 
api_node_url = "http://127.0.0.1:8000/api/detection"

def generate_frames():
    print(f"Mencoba membuka stream dari {url_esp32}...")
    cap = cv2.VideoCapture(url_esp32)
    
    # Set timeout agar tidak menunggu selamanya jika kamera mati
    cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 5000)
    
    last_sent_time = 0
    request_delay = 2

    if not cap.isOpened():
        print("Gagal membuka stream! Pastikan IP benar dan ESP32-CAM menyala.")
        return

    while True:
        success, frame = cap.read()
        if not success:
            print("Koneksi ke ESP32 terputus! Mencoba reconnect...")
            time.sleep(2)
            cap = cv2.VideoCapture(url_esp32)
            continue
        
        # AI Deteksi - Gunakan imgsz lebih kecil (320) agar lebih ringan/cepat
        results = model.predict(frame, conf=0.5, imgsz=320, verbose=False)
        annotated_frame = results[0].plot()

        # Logika Pengiriman ke Dashboard
        current_time = time.time()
        if len(results[0].boxes) > 0:
            cls_id = int(results[0].boxes[0].cls[0])
            label = model.names[cls_id]
            
            if current_time - last_sent_time > request_delay:
                try:
                    requests.post(api_node_url, json={"object": label}, timeout=0.2)
                    last_sent_time = current_time
                    print(f"Deteksi: {label} (Data terkirim)")
                except:
                    print("Gagal kirim ke API Node.js")

        # Encode frame ke JPEG
        ret, buffer = cv2.imencode('.jpg', annotated_frame)
        if not ret:
            continue
            
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/')
def index():
    return "AI Service is running. Access stream at <a href='/video_feed'>/video_feed</a>"

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == "__main__":
    # Gunakan threaded=True agar Flask bisa menangani banyak request
    app.run(host='0.0.0.0', port=5000, threaded=True, debug=False)