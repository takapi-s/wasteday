// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Serialize, Deserialize};
use log::{info, warn, error, debug};
use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId};
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::Input::KeyboardAndMouse::GetLastInputInfo;
use windows::Win32::System::SystemInformation::GetTickCount;
use windows::Win32::Foundation::BOOL;
use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
use windows::Win32::System::ProcessStatus::K32GetModuleFileNameExW;
use windows::Win32::Foundation::CloseHandle;
use std::path::Path;
use tauri::{AppHandle, Manager, State, tray::{TrayIconBuilder, TrayIconEvent, TrayIcon}};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_updater::UpdaterExt;
use rusqlite::{Connection, params};
use std::sync::Mutex;
use std::fs;

#[derive(Serialize, Debug, Default)]
pub struct ForegroundInfo {
    pub process_id: u32,
    pub exe: String,
    pub window_title: String,
}

#[tauri::command]
fn get_foreground_info() -> ForegroundInfo {
    unsafe {
        let hwnd: HWND = GetForegroundWindow();
        let mut pid: u32 = 0;
        let _tid = GetWindowThreadProcessId(hwnd, Some(&mut pid));

        let mut title_buf: [u16; 512] = [0; 512];
        let len = GetWindowTextW(hwnd, &mut title_buf);
        let title = String::from_utf16_lossy(&title_buf[..len as usize]);

        // exe 解決
        let mut exe_name = String::from("unknown.exe");
        if pid != 0 {
            if let Ok(hproc) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
                if !hproc.is_invalid() {
                    let mut buf: [u16; 260] = [0; 260];
                    let len = K32GetModuleFileNameExW(hproc, None, &mut buf);
                    if len > 0 {
                        let full = String::from_utf16_lossy(&buf[..len as usize]);
                        if let Some(name) = Path::new(&full).file_name().and_then(|s| s.to_str()) {
                            exe_name = name.to_string();
                        } else {
                            exe_name = full;
                        }
                    }
                    let _ = CloseHandle(hproc);
                }
            }
        }

        ForegroundInfo { process_id: pid, exe: exe_name, window_title: title }
    }
}

#[tauri::command]
fn get_idle_seconds() -> u64 {
    unsafe {
        #[repr(C)]
        struct LASTINPUTINFO {
            cbSize: u32,
            dwTime: u32,
        }

        let mut li = LASTINPUTINFO { cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32, dwTime: 0 };
        let ok: BOOL = std::mem::transmute(GetLastInputInfo(std::mem::transmute(&mut li)));
        if ok.as_bool() {
            let now = unsafe { GetTickCount() } as u64;
            let last = li.dwTime as u64;
            let diff = if now >= last { now - last } else { 0 };
            diff / 1000
        } else {
            0
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 既存インスタンスがある場合に呼ばれる: ウィンドウを前面化
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .invoke_handler(tauri::generate_handler![
            get_foreground_info,
            get_idle_seconds,
            db_get_user_setting,
            db_set_user_setting,
            db_upsert_session,
            db_get_sessions,
            db_delete_session,
            db_list_waste_categories,
            db_upsert_waste_category,
            db_delete_waste_category,
            check_for_updates,
            install_update,
            exit_app
        ])
        .setup(|app| {
            info!("Setting up WasteDay application...");
            // トレイハンドルを保持するための状態を登録（ドロップによる消滅を防ぐ）
            struct TrayHolder(std::sync::Mutex<Option<TrayIcon>>);
            app.manage(TrayHolder(std::sync::Mutex::new(None)));
            // クリック多重発火対策のクールダウン
            struct TrayClickCooldown(std::sync::Mutex<Option<std::time::Instant>>);
            app.manage(TrayClickCooldown(std::sync::Mutex::new(None)));
            
            // Initialize autostart plugin
            #[cfg(desktop)]
            {
                // Windows: レジストリ方式で自動起動を有効化し、--autostart を付与
                #[cfg(target_os = "windows")]
                {
                    match app.handle().plugin(tauri_plugin_autostart::init(
                        MacosLauncher::LaunchAgent,
                        Some(vec!["--autostart"]),
                    )) {
                        Ok(_) => info!("Autostart plugin initialized successfully (Windows)"),
                        Err(e) => {
                            error!("Failed to initialize autostart plugin on Windows: {}", e);
                            return Err(e.into());
                        }
                    }
                }
                #[cfg(target_os = "macos")]
                {
                    match app.handle().plugin(tauri_plugin_autostart::init(
                        MacosLauncher::LaunchAgent,
                        Some(vec!["--autostart"]),
                    )) {
                        Ok(_) => info!("Autostart plugin initialized successfully"),
                        Err(e) => {
                            error!("Failed to initialize autostart plugin: {}", e);
                            return Err(e.into());
                        }
                    }
                }
                #[cfg(target_os = "linux")]
                {
                    match app.handle().plugin(tauri_plugin_autostart::init(
                        tauri_plugin_autostart::LinuxLauncher::Systemd,
                        Some(vec!["--autostart"]),
                    )) {
                        Ok(_) => info!("Autostart plugin initialized successfully"),
                        Err(e) => {
                            error!("Failed to initialize autostart plugin: {}", e);
                            return Err(e.into());
                        }
                    }
                }
            }
            
            // Initialize SQLite database under AppData/wasteday.db
            let app_dir = match app.path().app_data_dir() {
                Ok(dir) => {
                    info!("App data directory: {:?}", dir);
                    dir
                }
                Err(e) => {
                    error!("Failed to get app data directory: {}", e);
                    return Err(e.into());
                }
            };
            
            if let Err(e) = fs::create_dir_all(&app_dir) {
                error!("Failed to create app data directory: {}", e);
                return Err(e.into());
            }
            
            let db_path = app_dir.join("wasteday.db");
            info!("Database path: {:?}", db_path);
            
            let mut conn = match Connection::open(&db_path) {
                Ok(conn) => {
                    info!("Database connection opened successfully");
                    conn
                }
                Err(e) => {
                    error!("Failed to open database: {}", e);
                    return Err(e.into());
                }
            };
            
            if let Err(e) = apply_schema(&mut conn) {
                error!("Failed to apply database schema: {}", e);
                return Err(e.into());
            }
            info!("Database initialized successfully");
            
            // 初回起動かどうかを判定（connを使用する前に）
            let is_first_run = match conn.query_row(
                "SELECT COUNT(*) FROM user_settings WHERE key = 'has_run_before'",
                [],
                |row| {
                    let count: i64 = row.get(0)?;
                    Ok(count == 0)
                }
            ) {
                Ok(result) => {
                    info!("First run check query executed successfully, is_first_run: {}", result);
                    result
                }
                Err(e) => {
                    error!("Failed to check first run status: {}", e);
                    return Err(e.into());
                }
            };
            info!("Is first run: {}", is_first_run);
            
            // 初回起動フラグを設定
            if is_first_run {
                match conn.execute(
                    "INSERT INTO user_settings(key, value) VALUES('has_run_before', 'true')",
                    [],
                ) {
                    Ok(_) => info!("First run flag set successfully"),
                    Err(e) => {
                        error!("Failed to set first run flag: {}", e);
                        return Err(e.into());
                    }
                }
            }
            
            app.manage(Db(Mutex::new(conn)));
            
            // 自動起動かどうかを判定
            // 1. コマンドライン引数で判定
            let args: Vec<String> = std::env::args().collect();
            info!("Command line arguments: {:?}", args);
            let is_auto_start_by_args = args.iter().any(|arg| arg.contains("--autostart") || arg.contains("--hidden"));
            info!("Auto start by args: {}", is_auto_start_by_args);
            
            // 2. 環境変数で判定（Tauriの自動起動プラグインが設定する可能性）
            let is_auto_start_by_env = std::env::var("TAURI_AUTOSTART").is_ok();
            info!("Auto start by env: {}", is_auto_start_by_env);
            
            // システム起動時間による判定は削除（通常起動でも誤判定されるため）
            let is_auto_start = is_auto_start_by_args || is_auto_start_by_env;
            info!("Is auto start: {}", is_auto_start);
            
            if let Some(window) = app.get_webview_window("main") {
                info!("Main window found");
                
                if is_first_run {
                    // 初回起動時は必ずウィンドウを表示
                    info!("First run - showing window");
                    if let Err(e) = window.show() {
                        error!("Failed to show window on first run: {}", e);
                    }
                    if let Err(e) = window.set_focus() {
                        error!("Failed to set focus on first run: {}", e);
                    }
                } else if !is_auto_start {
                    // 2回目以降でも、自動起動でない場合はウィンドウを表示
                    info!("Normal startup - showing window");
                    if let Err(e) = window.show() {
                        error!("Failed to show window on normal startup: {}", e);
                    }
                    if let Err(e) = window.set_focus() {
                        error!("Failed to set focus on normal startup: {}", e);
                    }
                } else {
                    // 自動起動の場合はウィンドウを表示しない（トレイ常駐のみ）
                    info!("Auto start - hiding window, running in tray only");
                }
                
                // ウィンドウを閉じてもアプリを終了させない
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    match event {
                        tauri::WindowEvent::CloseRequested { api, .. } => {
                            // 実際にウィンドウを閉じない（アプリ終了を防ぐ）
                            api.prevent_close();
                            // ウィンドウを閉じる代わりに隠す
                            let _ = window_clone.hide();
                        }
                        _ => {}
                    }
                });
            }
            // トレイアイコン（クリックで表示/非表示切り替え）
            info!("Setting up tray icon");
            let mut tray_builder = TrayIconBuilder::new()
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        info!("Tray icon clicked");
                        // クリック多重発火のクールダウン（300ms）
                        if let Some(cd) = tray.app_handle().try_state::<TrayClickCooldown>() {
                            if let Ok(mut guard) = cd.0.lock() {
                                if let Some(t) = *guard {
                                    if t.elapsed() < std::time::Duration::from_millis(300) {
                                        info!("Ignore tray click due to cooldown");
                                        return;
                                    }
                                }
                                *guard = Some(std::time::Instant::now());
                            }
                        }
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let visible = window.is_visible().unwrap_or(false);
                            let minimized = window.is_minimized().unwrap_or(false);
                            if visible && !minimized {
                                // 表示中なら隠す（トグル）
                                info!("Hiding window from tray click");
                                if let Err(e) = window.hide() {
                                    error!("Failed to hide window from tray click: {}", e);
                                }
                                return;
                            }

                            // 非表示または最小化の場合は確実に前面表示
                            info!("Restoring and focusing window from tray click");
                            let _ = window.show();
                            let _ = window.unminimize();
                            // Windows で前面化が弱い場合の対策: 一時的に常に前面に
                            let _ = window.set_always_on_top(true);
                            let _ = window.set_focus();
                            // 少し遅延させて戻すと安定
                            let app_handle = tray.app_handle().clone();
                            tauri::async_runtime::spawn_blocking(move || {
                                std::thread::sleep(std::time::Duration::from_millis(50));
                                if let Some(w) = app_handle.get_webview_window("main") {
                                    let _ = w.set_always_on_top(false);
                                }
                            });
                        }
                    }
                });
            // 既定のウィンドウアイコンをトレイに設定（Windowsでアイコン未設定だと非表示になる場合の対策）
            if let Some(icon) = app.default_window_icon().cloned() {
                tray_builder = tray_builder.icon(icon);
            }
            tray_builder = tray_builder.tooltip("WasteDay");
            let _tray = match tray_builder.build(app.handle()) {
                Ok(tray) => {
                    info!("Tray icon setup complete");
                    // トレイハンドルを保持
                    if let Some(holder) = app.try_state::<TrayHolder>() {
                        if let Ok(mut guard) = holder.0.lock() {
                            *guard = Some(tray.clone());
                        }
                    }
                    tray
                }
                Err(e) => {
                    error!("Failed to setup tray icon: {}", e);
                    return Err(e.into());
                }
            };
            info!("Application setup completed successfully");
            Ok(())
        })
        .run(tauri::generate_context!())
        .map_err(|e| {
            error!("Failed to run Tauri application: {}", e);
            e
        })
        .expect("error while running tauri application");
}

struct Db(Mutex<Connection>);

#[tauri::command]
async fn check_for_updates(app: AppHandle) -> Result<Option<String>, String> {
    // 開発モードではアップデートチェックを無効化
    if cfg!(debug_assertions) {
        return Ok(None);
    }
    
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await {
        Ok(Some(update)) => {
            Ok(Some(update.version.to_string()))
        }
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn install_update(app: AppHandle) -> Result<(), String> {
    // 開発モードではアップデートインストールを無効化
    if cfg!(debug_assertions) {
        return Err("Updates are disabled in development mode".to_string());
    }
    
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await {
        Ok(Some(update)) => {
            update.download_and_install(|_, _| {}, || {}).await.map_err(|e| e.to_string())?;
            app.exit(0);
            Ok(())
        }
        Ok(None) => Err("No update available".to_string()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn exit_app(app: AppHandle) -> Result<(), String> {
    app.exit(0);
    Ok(())
}

fn apply_schema(conn: &mut Connection) -> rusqlite::Result<()> {
    // Minimal schema (sessions, waste_categories, user_settings)
    let sql = r#"
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      start_time TEXT NOT NULL,
      duration_seconds INTEGER NOT NULL,
      session_key TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
    CREATE TABLE IF NOT EXISTS waste_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      identifier TEXT NOT NULL,
      label TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      UNIQUE(type, identifier)
    );
    CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    "#;
    conn.execute_batch(sql)?;
    Ok(())
}

// ====== Data models (serde) ======
#[derive(Serialize, Deserialize, Debug, Clone)]
struct Session {
    id: String,
    start_time: String,
    duration_seconds: i64,
    session_key: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct WasteCategory {
    id: Option<i64>,
    r#type: String,
    identifier: String,
    label: String,       // "waste" | "productive"
    is_active: bool,
}

// ====== sessions commands ======
#[tauri::command]
fn db_upsert_session(state: State<Db>, session: Session) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "db lock poisoned".to_string())?;
    conn.execute(
        "INSERT INTO sessions(id, start_time, duration_seconds, session_key) VALUES(?1, ?2, ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET start_time=excluded.start_time, duration_seconds=excluded.duration_seconds, session_key=excluded.session_key, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')",
        params![session.id, session.start_time, session.duration_seconds, session.session_key],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Deserialize)]
struct SessionsQuery { since: Option<String>, until: Option<String> }

#[tauri::command]
fn db_get_sessions(state: State<Db>, query: SessionsQuery) -> Result<Vec<Session>, String> {
    let conn = state.0.lock().map_err(|_| "db lock poisoned".to_string())?;
    let mut sql = String::from("SELECT id, start_time, duration_seconds, session_key FROM sessions");
    let mut clauses: Vec<&str> = Vec::new();
    let mut binds: Vec<String> = Vec::new();
    if let Some(s) = query.since.as_ref() { clauses.push("start_time >= ?"); binds.push(s.clone()); }
    if let Some(u) = query.until.as_ref() { clauses.push("start_time < ?"); binds.push(u.clone()); }
    if !clauses.is_empty() { sql.push_str(" WHERE "); sql.push_str(&clauses.join(" AND ")); }
    sql.push_str(" ORDER BY start_time ASC");
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(rusqlite::params_from_iter(binds.iter()), |row| {
        Ok(Session {
            id: row.get(0)?,
            start_time: row.get(1)?,
            duration_seconds: row.get(2)?,
            session_key: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
fn db_delete_session(state: State<Db>, id: String) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "db lock poisoned".to_string())?;
    conn.execute("DELETE FROM sessions WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ====== waste_categories commands ======
#[tauri::command]
fn db_list_waste_categories(state: State<Db>) -> Result<Vec<WasteCategory>, String> {
    let conn = state.0.lock().map_err(|_| "db lock poisoned".to_string())?;
    let mut stmt = conn.prepare("SELECT id, type, identifier, label, is_active FROM waste_categories WHERE is_active IN (0,1) ORDER BY type, identifier")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(WasteCategory {
            id: row.get(0)?,
            r#type: row.get(1)?,
            identifier: row.get(2)?,
            label: row.get(3)?,
            is_active: {
                let v: i64 = row.get(4)?; v != 0
            },
        })
    }).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for r in rows { out.push(r.map_err(|e| e.to_string())?); }
    Ok(out)
}

#[tauri::command]
fn db_upsert_waste_category(state: State<Db>, cat: WasteCategory) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "db lock poisoned".to_string())?;
    conn.execute(
        "INSERT INTO waste_categories(type, identifier, label, is_active) VALUES(?1, ?2, ?3, ?4)
         ON CONFLICT(type, identifier) DO UPDATE SET label=excluded.label, is_active=excluded.is_active, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')",
        params![cat.r#type, cat.identifier, cat.label, if cat.is_active {1} else {0}],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn db_delete_waste_category(state: State<Db>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|_| "db lock poisoned".to_string())?;
    conn.execute("DELETE FROM waste_categories WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn db_get_user_setting(state: State<Db>, key: String) -> Result<Option<String>, String> {
    let conn_guard = state.0.lock().map_err(|_| "db lock poisoned".to_string())?;
    let mut stmt = conn_guard.prepare("SELECT value FROM user_settings WHERE key = ?1").map_err(|e| e.to_string())?;
    let mut rows = stmt.query(params![key]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let value: String = row.get(0).map_err(|e| e.to_string())?;
        Ok(Some(value))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn db_set_user_setting(state: State<Db>, key: String, value: String) -> Result<(), String> {
    let conn_guard = state.0.lock().map_err(|_| "db lock poisoned".to_string())?;
    conn_guard
        .execute(
            "INSERT INTO user_settings(key, value, updated_at) VALUES(?1, ?2, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            params![key, value],
        )
        .map_err(|e| e.to_string())?;
    Ok(())
}
