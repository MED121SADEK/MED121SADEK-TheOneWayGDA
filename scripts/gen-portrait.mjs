import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

const imageBuffer = fs.readFileSync('/home/z/my-project/download/linkedin_ref.jpg');
const base64 = imageBuffer.toString('base64');
const dataUrl = `data:image/jpeg;base64,${base64}`;

const zai = await ZAI.create();
const response = await zai.images.generations.edit({
  prompt: "Professional founder portrait from this LinkedIn photo, keeping the person's face and identity exactly consistent, modern business look, clean neutral gray background, soft natural lighting, premium corporate style, head-and-shoulders framing, photorealistic, professionally retouched, direct eye contact, crisp business attire, slight confident smile, square format, startup technology leader",
  images: [{ url: dataUrl }],
  size: '1024x1024'
});

const imgBase64 = response.data[0].base64;
const buffer = Buffer.from(imgBase64, 'base64');
fs.writeFileSync('/home/z/my-project/download/founder_portrait.png', buffer);
console.log('Done! Size:', buffer.length, 'bytes');
