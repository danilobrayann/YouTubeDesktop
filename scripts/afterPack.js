exports.default = async function(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName === 'win32') {
    const fs = require('fs');
    const path = require('path');
    
    const sourceBin = path.join(__dirname, '..', 'bin');
    const targetBin = path.join(appOutDir, 'resources', 'bin');
    
    // Criar pasta bin no resources se não existir
    if (!fs.existsSync(targetBin)) {
      fs.mkdirSync(targetBin, { recursive: true });
    }
    
    // Copiar binários
    const files = ['yt-dlp.exe', 'ffmpeg.exe', 'ffprobe.exe'];
    for (const file of files) {
      const src = path.join(sourceBin, file);
      const dest = path.join(targetBin, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`Copied ${file} to ${targetBin}`);
      }
    }
  }
};
