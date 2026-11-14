import cv2
import os

video_path = r"C:\Users\deves\.gemini\antigravity\brain\2de691e0-6755-4ad6-9db3-7953879536fc\.user_uploaded\media_1794564273886_f06378e5.mp4"
out_dir = r"C:\Users\deves\.gemini\antigravity\brain\2de691e0-6755-4ad6-9db3-7953879536fc\scratch\kinetic_frames_detail"
os.makedirs(out_dir, exist_ok=True)

cap = cv2.VideoCapture(video_path)

# Extract frames from 10 to 70 at step of 5
for f in range(10, 75, 5):
    cap.set(cv2.CAP_PROP_POS_FRAMES, f)
    ret, frame = cap.read()
    if ret:
        fn = os.path.join(out_dir, f"frame_{f:03d}.jpg")
        cv2.imwrite(fn, frame)

cap.release()
print("Extracted detail frames.")

