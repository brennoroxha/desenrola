const fs = require('fs');
const https = require('https');
const path = require('path');

const dir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const download = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, function(response) {
            response.pipe(file);
            file.on('finish', function() {
                file.close(resolve);
            });
        }).on('error', function(err) {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
};

Promise.all([
    download('https://www.desenrolebrasil.online/images/hero.png', path.join(dir, 'hero.png')),
    download('https://www.desenrolebrasil.online/images/logo-icon.png', path.join(dir, 'logo-icon.png')),
    download('https://www.desenrolebrasil.online/images/logo-text.png', path.join(dir, 'logo-text.png'))
]).then(() => {
    console.log('Images downloaded successfully');
}).catch(err => {
    console.error('Error downloading images:', err);
});
