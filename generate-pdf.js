const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromePath = '/usr/bin/google-chrome';
const port = 8765;

// 简单的静态文件服务器
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = req.url === '/' ? '/index.html' : req.url;
      filePath = path.join(__dirname, filePath);
      const ext = path.extname(filePath);
      const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml'
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      });
    });
    server.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

async function generatePDF(server, pageName, outputName) {
  console.log(`Generating PDF for ${pageName}...`);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const url = `http://localhost:${port}/${pageName}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

  // 等待图表渲染完成
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 7000)));

  // 生成PDF
  await page.pdf({
    path: outputName,
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
  });

  console.log(`PDF saved: ${outputName}`);
  await browser.close();
}

(async () => {
  const server = await startServer();
  try {
    await generatePDF(server, 'index.html', '/workspace/ai-policy-report/国内AI政策分析报告_2026-07-29.pdf');
    await generatePDF(server, 'international.html', '/workspace/ai-policy-report/国外AI政策分析报告_2026-07-29.pdf');
    console.log('All PDFs generated successfully!');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    server.close();
    process.exit(0);
  }
})();
