import cv2
import os

video_path = r"C:\Users\deves\.gemini\antigravity\brain\2de691e0-6755-4ad6-9db3-7953879536fc\.user_uploaded\media_1794564273886_f06378e5.mp4"
out_dir = r"C:\Users\deves\.gemini\antigravity\brain\2de691e0-6755-4ad6-9db3-7953879536fc\scratch\kinetic_frames"
os.makedirs(out_dir, exist_ok=True)

cap = cv2.VideoCapture(video_path)
fps = cap.get(cv2.CAP_PROP_FPS)
count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
duration = count / fps if fps > 0 else 0

print(f"Video: {w}x{h}, {count} frames @ {fps} fps, duration: {duration:.2f}s")

# Extract 10 evenly spaced frames
for i in range(10):
    frame_idx = int(i * (count - 1) / 9)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
    ret, frame = cap.read()
    if ret:
        fn = os.path.join(out_dir, f"frame_{i:02d}_{frame_idx:04d}.jpg")
        cv2.imwrite(fn, frame)
        print(f"Saved {fn}")

cap.release()

