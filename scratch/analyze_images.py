import cv2
import numpy as np

img1 = cv2.imread('C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc/.user_uploaded/media_1794628162464_fd50e9aa.png')
img3 = cv2.imread('C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc/.user_uploaded/media_1794628136379_611d27cf.png')

# Save crops of interest
# In img1: top-left region
h, w, _ = img1.shape
crop1 = img1[0:int(h*0.45), 0:int(w*0.5)]
cv2.imwrite('scratch/crop1.png', crop1)

# In img3: top-center region
h3, w3, _ = img3.shape
crop3 = img3[0:int(h3*0.5), int(w3*0.35):int(w3*0.9)]
cv2.imwrite('scratch/crop3.png', crop3)

print('Saved crops')

