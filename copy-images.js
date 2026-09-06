const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\bn7\\.gemini\\antigravity-ide\\brain\\697a2ed6-5c60-4d85-b02a-8e8b65050f83\\.user_uploaded';
const destDir = path.join(__dirname, 'public', 'assets');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(path.join(srcDir, 'media_1788687047090.png'), path.join(destDir, 'leticia.png'));
fs.copyFileSync(path.join(srcDir, 'media_1788687047129.png'), path.join(destDir, 'lula.png'));
fs.copyFileSync(path.join(srcDir, 'media_1788687047165.png'), path.join(destDir, 'marcas.png'));
fs.copyFileSync(path.join(srcDir, 'media_1788687047171.png'), path.join(destDir, 'limpenome.png'));

console.log('Arquivos copiados com sucesso!');
