import cv2
import requests
from ultralytics import YOLO

# 1. Load Model (Gunakan yolov8n-face.pt jika ada untuk akurasi wajah lebih baik)
model = YOLO('yolov8n.pt') 

# 2. Konfigurasi URL
url_esp32 = "http://192.168.0.226:81/stream" 
api_url = "http://localhost/Smart-Garage-main/simpan_ai.php?access=granted"

cap = cv2.VideoCapture(url_esp32)

print("Sistem Smart Garage Aktif...")

while cap.isOpened():
    success, frame = cap.read()
    if not success:
        break

    # 3. Deteksi Objek
    results = model(frame, conf=0.6) 

    for r in results:
        # Check if 'person' is detected (Class 0 di YOLOv8 default adalah person)
        if len(r.boxes) > 0:
            for box in r.boxes:
                cls = int(box.cls[0])
                if cls == 0: # 0 adalah ID untuk 'person'
                    print("Pemilik Terdeteksi! Mengirim perintah buka pintu...")
                    
                    # 4. Trigger ke PHP
                    try:
                        response = requests.get(api_url, timeout=2)
                        if response.status_code == 200:
                            print("Pintu Berhasil Dibuka!")
                        
                        # Tambahkan jeda agar tidak mengirim request terus menerus
                        cv2.putText(frame, "ACCESS GRANTED", (50, 50), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                    except Exception as e:
                        print(f"Gagal menghubungkan ke server web: {e}")

    # Tampilkan hasil di monitor
    cv2.imshow("Smart Garage - Face Control", results[0].plot())

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()