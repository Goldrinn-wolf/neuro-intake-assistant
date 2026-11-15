from pathlib import Path
from PIL import Image, ImageDraw
image=Image.new('RGBA',(256,256),(0,0,0,0));draw=ImageDraw.Draw(image)
draw.rounded_rectangle((6,6,250,250),radius=58,fill='#08695d')
draw.rounded_rectangle((45,45,211,187),radius=37,fill='white')
draw.polygon([(156,171),(190,171),(183,218)],fill='white')
points=[(86,127),(127,86),(170,125),(128,154)]
for a,b in [(0,1),(1,2),(2,3),(3,0),(1,3)]:draw.line([points[a],points[b]],fill='#08695d',width=9)
for x,y in points:draw.ellipse((x-12,y-12,x+12,y+12),fill='#08695d')
image.save(Path(__file__).with_name('app.ico'),sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
