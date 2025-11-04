const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path = require('path')

// 尝试以兼容方式加载 uiohook-napi
let uiohookModule = null;
try {
    uiohookModule = require('uiohook-napi');
} catch (e) {
    console.warn('uiohook-napi require failed:', e.message);
}
console.log('[diag] Electron', process.versions.electron, 'Node', process.versions.node, 'Chrome', process.versions.chrome);
console.log('[diag] uiohook-napi typeof', typeof uiohookModule, 'keys', uiohookModule && Object.keys(uiohookModule));
console.log('[diag] uiohook-napi default keys', uiohookModule?.default && Object.keys(uiohookModule.default));
const uIOHook = uiohookModule?.uIOHook || uiohookModule?.uIOhook || uiohookModule?.default?.uIOHook || uiohookModule?.default?.uIOhook || null;
const UiohookKey = uiohookModule?.UiohookKey || uiohookModule?.default?.UiohookKey || {};

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 700,
        minWidth: 700,
        minHeight: 400,
        frame: true,
        transparent: false,
        alwaysOnTop: true,
        resizable: true,
        skipTaskbar: false,
        hasShadow: true,
        focusable: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    })



    mainWindow.loadFile(path.join(__dirname, 'src', 'main.html'))

    // 默认不打开 DevTools；如需调试，可设置环境变量 ELECTRON_DEVTOOLS=1
    if (process.env.ELECTRON_DEVTOOLS === '1') {
        try { mainWindow.webContents.openDevTools({ mode: 'detach' }); } catch {}
    }

    // 当渲染层加载完成，发送测试事件
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('[diag] renderer did-finish-load, sending test key A');
        mainWindow.webContents.send('global-keydown', { key: 'A' });
    });


    return mainWindow
}

// 在主进程接收渲染层调试日志
ipcMain.on('renderer-log', (event, msg) => {
    console.log('[renderer-log]', msg);
});

// 新增：注册置顶开关的 IPC 通道（使用 fromWebContents 更稳健）



function keycodeToLabel(code) {
    // 构建反向映射：从数值 keycode 到枚举名称
    if (!keycodeToLabel._rev) {
        keycodeToLabel._rev = {};
        try {
            for (const [k, v] of Object.entries(UiohookKey)) {
                keycodeToLabel._rev[v] = k;
            }
        } catch {}
    }
    const name = keycodeToLabel._rev?.[code];
    if (!name) {
        console.warn('[key] unknown keycode:', code);
        return '';
    }
    const map = {
        SPACE: 'Space',
        ENTER: 'Enter',
        BACKSPACE: 'Backspace',
        TAB: 'Tab',
        ESC: 'Esc',
        ESCAPE: 'Esc',
        CAPS_LOCK: 'CapsLock',
        SHIFT: 'Shift', SHIFT_LEFT: 'Shift', SHIFT_RIGHT: 'Shift', LEFT_SHIFT: 'Shift', RIGHT_SHIFT: 'Shift',
        CTRL: 'Ctrl', CTRL_LEFT: 'Ctrl', CTRL_RIGHT: 'Ctrl', CONTROL: 'Ctrl', LEFT_CTRL: 'Ctrl', RIGHT_CTRL: 'Ctrl',
        ALT: 'Alt', ALT_LEFT: 'Alt', ALT_RIGHT: 'Alt', LEFT_ALT: 'Alt', RIGHT_ALT: 'Alt',
        META: 'Win', META_LEFT: 'Win', META_RIGHT: 'Win', SUPER: 'Win', LEFT_META: 'Win', RIGHT_META: 'Win',
        CONTEXT_MENU: 'Menu',
        BRACKET_LEFT: '[', BRACKET_RIGHT: ']',
        BACKSLASH: '\\',
        SEMICOLON: ';',
        APOSTROPHE: '\'', QUOTE: '\'',
        COMMA: ',', PERIOD: '.', SLASH: '/',
        MINUS: '-', EQUALS: '=', EQUAL: '=',
        GRAVE: '`', GRAVE_ACCENT: '`', BACKQUOTE: '`',
        // camelCase variants seen in some builds of uiohook
        Minus: '-', Equal: '=', Backquote: '`', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
        Semicolon: ';', Quote: '\'', Comma: ',', Period: '.', Slash: '/',
        // Keypad/Numpad mappings to base characters for highlighting
        KP_ADD: '+', KP_SUBTRACT: '-', KP_MULTIPLY: '*', KP_DIVIDE: '/', KP_EQUAL: '=', KP_DECIMAL: '.',
        NUMPAD_ADD: '+', NUMPAD_SUBTRACT: '-', NUMPAD_MULTIPLY: '*', NUMPAD_DIVIDE: '/', NUMPAD_EQUAL: '=', NUMPAD_DECIMAL: '.',
        ADD: '+', SUBTRACT: '-', MULTIPLY: '*', DIVIDE: '/', DECIMAL: '.'
    };
    if (map[name]) return map[name];
    const nameUpper = typeof name === 'string' ? name.toUpperCase() : name;
    if (map[nameUpper]) return map[nameUpper];
    // F 功能键
    if (/^F\d+$/.test(name)) return name;
    // 数字键（兼容多种命名，如 DIGIT1、NUMBER_1、NUM_1、KP_1）
    const digitMatch = name.match(/^(?:DIGIT|NUMBER|NUM_)[_]?(\d)$/) || name.match(/^KP[_]?(\d)$/);
    if (digitMatch) return digitMatch[1];
    // 字母键（兼容 KEY_A、VK_A、VC_A 或直接 A）
    const letterMatch = name.match(/^(?:KEY_|VK_|VC_)?([A-Z])$/);
    if (letterMatch) return letterMatch[1];
    // 其他未覆盖的直接返回名称（渲染层可能无对应键位，不会高亮）
    return name;
}

function startGlobalListener(mainWindow) {
    if (!uIOHook) {
        console.error('uIOHook not available. Global key capture disabled.');
        return;
    }
    console.log('[diag] uIOHook methods', Object.keys(uIOHook));
    uIOHook.on('keydown', (event) => {
        const label = keycodeToLabel(event.keycode);
        console.log(`[key] keydown code:${event.keycode} label:${label}`);
        if (label) {
            mainWindow.webContents.send('global-keydown', { key: label });
        }
    });
    try {
        uIOHook.start();
        console.log('[diag] uIOHook started');
    } catch (e) {
        console.error('Failed to start uIOHook:', e.message);
    }
}

app.whenReady().then(() => {
    const mainWindow = createWindow()
    try { Menu.setApplicationMenu(null); } catch {}
    startGlobalListener(mainWindow)
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
    try { uIOHook?.stop(); } catch (e) {}
});