import cv2
import requests
from ultralytics import YOLO
import time


model = YOLO('yolov8s.pt') 

# 2. Konfigurasi Endpoint
url_esp32 = "http://192.168.1.18:81/stream"
api_node_url = "http://localhost:8000/api/detection" 

cap = cv2.VideoCapture(url_esp32)


last_sent_time = 0
request_delay = 2 

print("AI Service Smart Garage Aktif...")

while cap.isOpened():
    ret, frame = cap.read()
    if not ret: 
        print("Gagal mengambil stream kamera.")
        break

    
    results = model.predict(frame, conf=0.6, imgsz=640, verbose=False, stream=False)
    
    current_time = time.time()

    for r in results:
        # Jika ada objek yang terdeteksi
        if len(r.boxes) > 0:
            # Ambil label dari objek pertama (indeks 0)
            cls_id = int(r.boxes[0].cls[0])
            label = model.names[cls_id]
            
            # Tampilkan informasi di terminal untuk debugging
            print(f"Terdeteksi: {label}")

            # 4. Logika Pengiriman ke Dashboard
            if current_time - last_sent_time > request_delay:
                try:
                    # Mengirim nama objek yang terdeteksi ke server Node.js
                    requests.post(api_node_url, json={"object": label}, timeout=0.5)
                    last_sent_time = current_time
                except Exception as e:
                    print(f"Gagal mengirim data ke API: {e}")

    # 5. Visualisasi pada Monitor
    # results[0].plot() akan otomatis menggambar box dan label objek
    cv2.imshow('AI Scanner - Smart Garage', results[0].plot())
    
    # Tekan 'q' untuk berhenti
    if cv2.waitKey(1) & 0xFF == ord('q'): 
        break

cap.release()
cv2.destroyAllWindows()