const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(fileUpload());
app.use(express.json());

const MC_DIR = path.join(__dirname, 'mc_server');
if (!fs.existsSync(MC_DIR)) {
    fs.mkdirSync(MC_DIR, { recursive: true });
}

app.get('/', (req, res) => {
    res.send('마인크래프트 호스팅 백엔드 서버 작동 중!');
});

app.post('/upload', (req, res) => {
    if (!req.files || !req.files.mcFile) {
        return res.status(400).json({ success: false, message: '업로드할 파일이 없습니다.' });
    }

    const file = req.files.mcFile;
    const savePath = path.join(MC_DIR, file.name);

    file.mv(savePath, (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: `${file.name} 업로드 완료!` });
    });
});

app.get('/files', (req, res) => {
    fs.readdir(MC_DIR, (err, files) => {
        if (err) return res.status(500).json({ success: false, message: '파일 읽기 실패' });
        res.json({ success: true, files });
    });
});

wss.on('connection', (ws) => {
    ws.send('[SYSTEM] 마인크래프트 웹 콘솔에 연결되었습니다.\r\n');

    ws.on('message', (message) => {
        const cmd = message.toString();
        ws.send(`[CONSOLE LOG] 명령어 실행: ${cmd}\r\n`);
    });
});

server.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});