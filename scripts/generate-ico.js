const fs = require('fs');
const path = require('path');
const toIco = require('to-ico');

const inputPath = path.join(__dirname, '../resources/icons/icon.png');
const outputPath = path.join(__dirname, '../resources/icons/icon.ico');

console.log(`Reading ${inputPath}...`);
const fileBuffer = fs.readFileSync(inputPath);

console.log(`Converting to ICO...`);
toIco([fileBuffer], {
    resize: true,
    sizes: [16, 24, 32, 48, 64, 128, 256]
})
    .then(buf => {
        fs.writeFileSync(outputPath, buf);
        console.log(`Successfully generated ${outputPath}`);
    })
    .catch(err => {
        console.error('Error generating icon.ico:', err);
        process.exit(1);
    });
