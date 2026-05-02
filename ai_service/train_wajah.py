import cv2
import os
import numpy as np

path = 'dataset/Alit'
recognizer = cv2.face.LBPHFaceRecognizer_create()
detector = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

def getImagesAndLabels(path):
    imagePaths = [os.path.join(path, f) for f in os.listdir(path)]     
    faceSamples=[]
    ids = []
    for imagePath in imagePaths:
        img = cv2.imread(imagePath, cv2.IMREAD_GRAYSCALE)
        img_numpy = np.array(img, 'uint8')
        faces = detector.detectMultiScale(img_numpy)
        for (x,y,w,h) in faces:
            faceSamples.append(img_numpy[y:y+h,x:x+w])
            ids.append(1) # 
    return faceSamples, ids

print("Sedang melatih data wajah... Mohon tunggu...")
faces, ids = getImagesAndLabels(path)
recognizer.train(faces, np.array(ids))


recognizer.write('trainer.yml') 
print(f"Selesai! {len(np.unique(ids))} wajah dilatih.")