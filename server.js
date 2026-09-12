const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(fileUpload());
app.use(express.json());

// 절대 경로로 mc_server 폴더 지정 (경로 꼬임 방지)
const MC_DIR = path.join(__dirname, 'mc_server');
if (!fs.existsSync(MC_DIR)) {
    fs.mkdirSync(MC_DIR, { recursive: true });
}

app.get('/', (req, res) => {
    res.send('마인크래프트 호스팅 백엔드 서버 작동 중!');
});

// 파일 업로드 (어떤 이름으로 올려도 자동으로 server.jar로 복사되거나 저장됨)
app.post('/upload', (req, res) => {
    if (!req.files || !req.files.mcFile) {
        return res.status(400).json({ success: false, message: '업로드할 파일이 없습니다.' });
    }

    const file = req.files.mcFile;
    const savePath = path.join(MC_DIR, 'server.jar'); // 무조건 server.jar로 저장하여 인식 오류 원천 차단

    file.mv(savePath, (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: `파일 업로드 및 server.jar 적용 완료!` });
    });
});

app.get('/files', (req, res) => {
    fs.readdir(MC_DIR, (err, files) => {
        if (err) return res.status(500).json({ success: false, message: '파일 읽기 실패' });
        res.json({ success: true, files });
    });
});

let mcProcess = null; // 마인크래프트 서버 프로세스

wss.on('connection', (ws) => {
    ws.send('[SYSTEM] 마인크래프트 웹 콘솔에 연결되었습니다.\r\n');

    if (mcProcess) {
        ws.send('[SYSTEM] 서버가 현재 구동 중입니다.\r\n');
    }

    ws.on('message', (message) => {
        const cmd = message.toString().trim();

        if (cmd === 'start') {
            if (mcProcess) {
                ws.send('[SYSTEM] 서버가 이미 실행 중입니다.\r\n');
                return;
            }

            ws.send('[SYSTEM] 마인크래프트 서버를 시작합니다...\r\n');

            const jarPath = path.join(MC_DIR, 'server.jar');
            console.log('서버 시작 시도 - jar 경로:', jarPath);

            if (!fs.existsSync(jarPath)) {
                ws.send('[SYSTEM] 에러: mc_server 폴더에 server.jar 파일이 없습니다. 파일을 먼저 업로드하세요!\r\n');
                return;
            }

            // eula.txt 자동 생성
            const eulaPath = path.join(MC_DIR, 'eula.txt');
            if (!fs.existsSync(eulaPath)) {
                fs.writeFileSync(eulaPath, 'eula=true\n');
                ws.send('[SYSTEM] eula.txt 파일이 자동으로 생성되었습니다.\r\n');
            }

            // 자바 프로세스 실행
            mcProcess = spawn('java', ['-Xmx1024M', '-Xms1024M', '-jar', 'server.jar', 'nogui'], {
                cwd: MC_DIR,
                shell: true
            });

            mcProcess.stdout.on('data', (data) => {
                ws.send(data.toString());
            });

            mcProcess.stderr.on('data', (data) => {
                ws.send(data.toString());
            });

            mcProcess.on('close', (code) => {
                ws.send(`\r\n[SYSTEM] 서버가 종료되었습니다. (종료 코드: ${code})\r\n`);
                mcProcess = null;
            });

        } else if (cmd === 'stop') {
            if (mcProcess && mcProcess.stdin) {
                ws.send('[SYSTEM] 서버에 stop 명령을 전송합니다...\r\n');
                mcProcess.stdin.write('stop\n');
            } else {
                ws.send('[SYSTEM] 실행 중인 서버가 없습니다.\r\n');
            }

        } else {
            if (mcProcess && mcProcess.stdin) {
                mcProcess.stdin.write(cmd + '\n');
            } else {
                ws.send(`[SYSTEM] 서버가 켜져 있지 않습니다. 'start'를 먼저 입력하세요.\r\n`);
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
