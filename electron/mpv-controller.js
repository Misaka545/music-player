// electron/mpv-controller.js
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');

class MPVController {
    constructor() {
        this.mpvProcess = null;
        this.socket = null;
        this.ipcPath = '\\\\.\\pipe\\retrograde-mpv';
        this.messageId = 1;
        this.callbacks = new Map();
        this.eventListeners = new Map();
        this.isConnected = false;
        this.pendingSeek = 0;
        
        let basePath;
        if (__dirname.includes('app.asar')) {
            basePath = path.join(process.resourcesPath, 'bin');
        } else {
            basePath = path.join(__dirname, '..', 'bin');
        }
        this.mpvExePath = path.join(basePath, 'mpv.exe');
    }

    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(cb => cb(data));
        }
    }

    start() {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(this.mpvExePath)) {
                return reject(new Error(`mpv.exe not found at ${this.mpvExePath}. Please download mpv for Windows and place mpv.exe in the 'bin' folder.`));
            }

            if (this.mpvProcess) {
                return resolve();
            }

            this.mpvProcess = spawn(this.mpvExePath, [
                '--idle=yes',
                `--input-ipc-server=${this.ipcPath}`,
                '--ao=wasapi',
                '--audio-exclusive=yes',
                '--audio-client-name=Retrograde',
                '--no-video',
                '--keep-open=yes'
            ], {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            const logStream = fs.createWriteStream(path.join(require('os').tmpdir(), 'retrograde-mpv.log'), { flags: 'a' });
            this.mpvProcess.stdout.pipe(logStream);
            this.mpvProcess.stderr.pipe(logStream);

            setTimeout(() => {
                this.connectIPC().then(resolve).catch(reject);
            }, 1000);
        });
    }

    connectIPC() {
        return new Promise((resolve, reject) => {
            this.socket = net.connect(this.ipcPath);
            let buffer = '';

            this.socket.on('connect', () => {
                console.log('Connected to MPV IPC');
                this.isConnected = true;
                
                this.command('observe_property', [1, 'time-pos']);
                this.command('observe_property', [2, 'pause']);
                this.command('observe_property', [3, 'eof-reached']);
                this.command('observe_property', [4, 'volume']);

                resolve();
            });

            this.socket.on('data', (data) => {
                buffer += data.toString();
                const messages = buffer.split('\n');
                buffer = messages.pop();

                messages.forEach(msg => {
                    if (!msg.trim()) return;
                    try {
                        const json = JSON.parse(msg);
                        this.handleMessage(json);
                    } catch (e) {
                        console.error('Error parsing MPV message:', msg, e);
                    }
                });
            });

            this.socket.on('error', (err) => {
                console.error('MPV IPC Error:', err);
                this.isConnected = false;
                reject(err);
            });

            this.socket.on('close', () => {
                console.log('MPV IPC Connection closed');
                this.isConnected = false;
            });
        });
    }

    handleMessage(msg) {
        if (msg.event === 'property-change') {
            if (msg.name === 'time-pos' && msg.data !== null) {
                this.emit('time-pos', msg.data);
            } else if (msg.name === 'pause') {
                this.emit('pause', msg.data);
            } else if (msg.name === 'eof-reached' && msg.data === true) {
                this.emit('eof-reached', true);
            }
        } else if (msg.event === 'file-loaded') {
            if (this.pendingSeek > 0) {
                this.seek(this.pendingSeek);
                this.pendingSeek = 0;
            }
        } else if (msg.request_id) {
            const cb = this.callbacks.get(msg.request_id);
            if (cb) {
                if (msg.error !== 'success') {
                    cb.reject(new Error(msg.error));
                } else {
                    cb.resolve(msg.data);
                }
                this.callbacks.delete(msg.request_id);
            }
        }
    }

    command(command, args = []) {
        return new Promise((resolve, reject) => {
            if (!this.isConnected || !this.socket) {
                return reject(new Error('Not connected to MPV'));
            }

            const reqId = this.messageId++;
            this.callbacks.set(reqId, { resolve, reject });

            const payload = JSON.stringify({
                command: [command, ...args],
                request_id: reqId
            }) + '\n';

            this.socket.write(payload);
        });
    }

    play(filePath, startTime = 0) {
        this.pendingSeek = startTime;
        return this.command('loadfile', [filePath, 'replace']);
    }

    togglePause() {
        return this.command('cycle', ['pause']);
    }

    pause() {
        return this.command('set_property', ['pause', true]);
    }

    resume() {
        return this.command('set_property', ['pause', false]);
    }

    seek(seconds) {
        return this.command('seek', [seconds, 'absolute']);
    }

    setVolume(vol) {
        return this.command('set_property', ['volume', vol * 100]);
    }

    stop() {
        return this.command('stop');
    }

    quit() {
        if (this.isConnected) {
            this.command('quit');
            this.isConnected = false;
        }
        if (this.mpvProcess) {
            this.mpvProcess.kill();
            this.mpvProcess = null;
        }
    }
}

module.exports = new MPVController();
