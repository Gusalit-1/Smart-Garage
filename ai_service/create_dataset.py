import cv2
import os
import time

# 1. Konfigurasi
url_esp32 = "http://192.168.0.227:81/stream" 
output_dir = "dataset/Alit/"
max_images = 500 

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

def connect_camera():
    print("Mencoba menghubungkan ke kamera...")
    return cv2.VideoCapture(url_esp32, cv2.CAP_FFMPEG)

cap = connect_camera()
ready = False
count = 0

while count < max_images:
    success, frame = cap.read()
    
    if not success:
        print("Stream terputus. Mencoba menyambung kembali dalam 3 detik...")
        cap.release()
        time.sleep(3)
        cap = connect_camera()
        continue # Lewati loop ini dan coba lagi

    display_frame = frame.copy()

    if not ready:
        cv2.putText(display_frame, "Tekan 'S' untuk MULAI", (50, 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        cv2.imshow("Capture Dataset", display_frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('s'):
            ready = True
    else:
        # Simpan gambar
        img_name = os.path.join(output_dir, f"owner_{count}.jpg")
        cv2.imwrite(img_name, frame)
        
        # Beri indikasi visual
        cv2.putText(display_frame, f"Capturing: {count+1}/{max_images}", (20, 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.imshow("Capture Dataset", display_frame)
        
        print(f"Tersimpan: {img_name}")
        count += 1
        time.sleep(0.3) # Dipercepat sedikit agar selesai sebelum putus lagi

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

print(f"\nSelesai! {count} foto tersimpan.")
cap.release()
cv2.destroyAllWindows()