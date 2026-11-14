import cv2
import numpy as np

for fname, p in [('img1', 'C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc/.user_uploaded/media_1794628162464_fd50e9aa.png'),
                 ('img3', 'C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc/.user_uploaded/media_1794628136379_611d27cf.png')]:
    img = cv2.imread(p)
    # The user drew with a black brush tool on the white background!
    # Let's find pure black or very dark drawn pixels:
    # Notice background is (255, 255, 255).
    # Normal text is gray or dark gray, but brush strokes are thick black lines!
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mask = (gray < 40).astype(np.uint8) * 255
    # Remove single letters/thin lines by morphological opening or looking at thick regions
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    thick = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    contours, _ = cv2.findContours(thick, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    print(fname, 'drawn thick contours:')
    for c in contours:
        x, y, w, h = cv2.boundingRect(c)
        if w > 20 and h > 20:
            print(f'  bbox: x={x}, y={y}, w={w}, h={h}')

