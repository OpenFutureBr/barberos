import sharp from 'sharp'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#c9a84c"/>
  <text x="256" y="340" font-size="300" font-weight="bold" font-family="Arial" text-anchor="middle" fill="#0c0c0e">B</text>
</svg>`

const buf = Buffer.from(svg)

await sharp(buf).resize(192, 192).png().toFile('public/icon-192.png')
console.log('✅ icon-192.png criado')

await sharp(buf).resize(512, 512).png().toFile('public/icon-512.png')
console.log('✅ icon-512.png criado')