import cv2

img = cv2.imread('C:/Users/deves/.gemini/antigravity/brain/2de691e0-6755-4ad6-9db3-7953879536fc/.user_uploaded/media_1794628162464_fd50e9aa.png')
# The text is on the right side of the header
# In img, size is 516 x 1024
crop = img[50:110, 600:950]
cv2.imwrite('scratch/text_crop.png', crop)
print('Saved text crop')

