import Cocoa
import WebKit
import UniformTypeIdentifiers

class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKUIDelegate, WKNavigationDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var backendProcess: Process?

    func applicationDidFinishLaunching(_ notification: Notification) {
        // 0. Setup macOS Standard Main Menu (Enables Cmd+V Paste, Cmd+C Copy, Cmd+A Select All, Cmd+Z Undo, etc.)
        setupMainMenu()

        // 1. Load Native App Icon
        let bundleRes = Bundle.main.resourcePath ?? ""
        let iconPath = (bundleRes as NSString).appendingPathComponent("AppIcon.icns")
        if FileManager.default.fileExists(atPath: iconPath), let img = NSImage(contentsOfFile: iconPath) {
            NSApp.applicationIconImage = img
        }

        // 2. Clean previous lingering server process & start backend
        startBackend()

        // 3. Setup Native macOS Window (1280x860, Slate-950 dark background)
        let rect = NSRect(x: 0, y: 0, width: 1280, height: 860)
        window = NSWindow(
            contentRect: rect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "ResonaDesk 声纹工作台"
        window.backgroundColor = NSColor(red: 2/255.0, green: 6/255.0, blue: 23/255.0, alpha: 1.0)
        window.isReleasedWhenClosed = false
        window.minSize = NSSize(width: 1024, height: 720)
        window.center()
        window.delegate = self

        // 4. WebKit WebView configuration with UIDelegate & NavigationDelegate
        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        
        webView = WKWebView(frame: window.contentView!.bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.uiDelegate = self
        webView.navigationDelegate = self
        webView.setValue(false, forKey: "drawsBackground") // dark transparent background
        
        window.contentView?.addSubview(webView)
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)

        // 5. Poll & load backend
        loadWhenReady()
    }

    func setupMainMenu() {
        let mainMenu = NSMenu()
        
        // 1. App Menu (ResonaDesk)
        let appMenuItem = NSMenuItem()
        mainMenu.addItem(appMenuItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "关于 ResonaDesk", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "隐藏 ResonaDesk", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        let hideOthersItem = NSMenuItem(title: "隐藏其他", action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
        hideOthersItem.keyEquivalentModifierMask = [.command, .option]
        appMenu.addItem(hideOthersItem)
        appMenu.addItem(withTitle: "显示全部", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: "")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "退出 ResonaDesk", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appMenuItem.submenu = appMenu

        // 2. Edit Menu (编辑 - 核心: 激活 Cmd+C, Cmd+V, Cmd+X, Cmd+A, Cmd+Z)
        let editMenuItem = NSMenuItem()
        mainMenu.addItem(editMenuItem)
        let editMenu = NSMenu(title: "编辑")
        editMenu.addItem(withTitle: "撤销", action: Selector(("undo:")), keyEquivalent: "z")
        let redoItem = NSMenuItem(title: "重做", action: Selector(("redo:")), keyEquivalent: "Z")
        redoItem.keyEquivalentModifierMask = [.command, .shift]
        editMenu.addItem(redoItem)
        editMenu.addItem(NSMenuItem.separator())
        editMenu.addItem(withTitle: "剪切", action: Selector(("cut:")), keyEquivalent: "x")
        editMenu.addItem(withTitle: "复制", action: Selector(("copy:")), keyEquivalent: "c")
        editMenu.addItem(withTitle: "粘贴", action: Selector(("paste:")), keyEquivalent: "v")
        editMenu.addItem(withTitle: "全选", action: Selector(("selectAll:")), keyEquivalent: "a")
        editMenuItem.submenu = editMenu

        // 3. Window Menu (窗口)
        let windowMenuItem = NSMenuItem()
        mainMenu.addItem(windowMenuItem)
        let windowMenu = NSMenu(title: "窗口")
        windowMenu.addItem(withTitle: "最小化", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        windowMenu.addItem(withTitle: "缩放", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
        windowMenu.addItem(withTitle: "关闭窗口", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        windowMenuItem.submenu = windowMenu

        NSApp.mainMenu = mainMenu
    }

    func startBackend() {
        let bundleRes = Bundle.main.resourcePath ?? ""
        let serverScript = (bundleRes as NSString).appendingPathComponent("server.mjs")
        
        if FileManager.default.fileExists(atPath: serverScript) {
            let killProc = Process()
            killProc.executableURL = URL(fileURLWithPath: "/usr/bin/pkill")
            killProc.arguments = ["-f", "server.mjs"]
            try? killProc.run()
            killProc.waitUntilExit()

            let proc = Process()
            let nodePaths = [
                "/opt/homebrew/bin/node",
                "/usr/local/bin/node",
                "/usr/bin/node",
                "/bin/node"
            ]
            var nodeExec = "/opt/homebrew/bin/node"
            for p in nodePaths {
                if FileManager.default.fileExists(atPath: p) {
                    nodeExec = p
                    break
                }
            }
            
            proc.executableURL = URL(fileURLWithPath: nodeExec)
            proc.arguments = [serverScript]
            
            var env = ProcessInfo.processInfo.environment
            env["PORT"] = "3188"
            env["PATH"] = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:" + (env["PATH"] ?? "")
            proc.environment = env
            proc.currentDirectoryURL = URL(fileURLWithPath: bundleRes)
            
            try? proc.run()
            self.backendProcess = proc
        }
    }

    func loadWhenReady() {
        DispatchQueue.global().async {
            for _ in 0..<50 {
                if let url = URL(string: "http://127.0.0.1:3188/api/health"),
                   let data = try? Data(contentsOf: url),
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   json["status"] as? String == "ok" {
                    DispatchQueue.main.async {
                        self.webView.load(URLRequest(url: URL(string: "http://127.0.0.1:3188")!))
                    }
                    return
                }
                Thread.sleep(forTimeInterval: 0.15)
            }
            DispatchQueue.main.async {
                self.webView.load(URLRequest(url: URL(string: "http://127.0.0.1:3188")!))
            }
        }
    }

    // MARK: - Handle External Links via default browser (Safari/Chrome)
    func webView(_ webView: WKWebView,
                 decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = navigationAction.request.url {
            let scheme = url.scheme?.lowercased() ?? ""
            // Block any in-window navigation to blob/data to prevent breaking the SPA UI
            if scheme == "blob" || scheme == "data" {
                decisionHandler(.cancel)
                return
            }
            let host = url.host ?? ""
            if host != "127.0.0.1" && host != "localhost" && (scheme == "http" || scheme == "https") {
                NSWorkspace.shared.open(url)
                decisionHandler(.cancel)
                return
            }
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView,
                 createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url {
            NSWorkspace.shared.open(url)
        }
        return nil
    }

    // MARK: - WKUIDelegate: Handle Native File Open Dialog (<input type="file">)
    func webView(_ webView: WKWebView,
                 runOpenPanelWith parameters: WKOpenPanelParameters,
                 initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping ([URL]?) -> Void) {
        let openPanel = NSOpenPanel()
        openPanel.canChooseFiles = true
        openPanel.canChooseDirectories = false
        openPanel.allowsMultipleSelection = parameters.allowsMultipleSelection
        openPanel.title = "选择要转录与声纹分离的音视频文件"
        openPanel.prompt = "打开"
        openPanel.level = .floating
        
        let extensions = ["mp4", "mov", "mkv", "avi", "mp3", "wav", "m4a", "flac", "aac", "ogg", "wma"]
        openPanel.allowedContentTypes = extensions.compactMap { UTType(filenameExtension: $0) }
        
        openPanel.begin { result in
            if result == .OK {
                completionHandler(openPanel.urls)
            } else {
                completionHandler(nil)
            }
        }
    }

    func windowWillClose(_ notification: Notification) {
        backendProcess?.terminate()
        NSApp.terminate(nil)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
