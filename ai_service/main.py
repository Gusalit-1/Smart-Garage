import cv2
import requests


url_esp32 = "http://192.168.0.227:81/stream"
# Endpoint untuk update status ke database
api_url = "http://localhost/Smart-Garage-main/simpan_ai.php?access=granted"

# Load detektor wajah standar
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

cap = cv2.VideoCapture(url_esp32)

while True:
    ret, frame = cap.read()
    if not ret: break

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    for (x, y, w, h) in faces:
        # Jika ada wajah terdeteksi, kita anggap akses diberikan
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
        cv2.putText(frame, "OWNER", (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        # Kirim sinyal ke dashboard/database
        try:
            requests.get(api_url, timeout=0.1)
            print("Sinyal terkirim ke Dashboard: Pintu Terbuka")
        except:
            pass

    cv2.imshow('AI Monitoring', frame)
    if cv2.waitKey(1) & 0xFF == ord('q'): break

cap.release()
cv2.destroyAllWindows()