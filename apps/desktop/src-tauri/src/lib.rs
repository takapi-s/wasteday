// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Serialize, Deserialize};
use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW, GetWindowThreadProcessId};
use windows::Win32::Foundation::HWND;
use windows::Win32::UI::Input::KeyboardAndMouse::GetLastInputInfo;
use windows::Win32::System::SystemInformation::GetTickCount;
use windows::Win32::Foundation::BOOL;
use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};
use windows::Win32::System::ProcessStatus::K32GetModuleFileNameExW;
use windows::Win32::Foundation::CloseHandle;
use std::path::Path;
use tauri_plugin_autostart::{MacosLauncher, WindowsBootstrapper};
use tauri::{AppHandle, Manager, State, tray::{TrayIconBuilder, TrayIconEvent}};
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
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(WindowsBootstrapper::Service),
        ))
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
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
            // Initialize SQLite database under AppData/wasteday.db
            let app_dir = app.path().app_data_dir().expect("app data dir");
            fs::create_dir_all(&app_dir)?;
            let db_path = app_dir.join("wasteday.db");
            let mut conn = Connection::open(db_path)?;
            apply_schema(&mut conn)?;
            app.manage(Db(Mutex::new(conn)));
            
            // Single-instanceイベントを処理
            let window = app.get_webview_window("main").unwrap();
            app.listen("single-instance", move |_event| {
                // 既存のウィンドウを前面に表示
                let _ = window.show();
                let _ = window.set_focus();
            });
            // 初回起動時はウィンドウを表示、2回目以降はトレイ常駐
            if let Some(window) = app.get_webview_window("main") {
                // 初回起動かどうかを判定
                let is_first_run = conn.execute(
                    "SELECT COUNT(*) FROM user_settings WHERE key = 'has_run_before'",
                    [],
                ).map_err(|e| e.to_string())? == 0;
                
                if is_first_run {
                    // 初回起動時はウィンドウを表示
                    let _ = window.show();
                    let _ = window.set_focus();
                    
                    // 初回起動フラグを設定
                    conn.execute(
                        "INSERT INTO user_settings(key, value) VALUES('has_run_before', 'true')",
                        [],
                    ).map_err(|e| e.to_string())?;
                }
                
                // ウィンドウを閉じてもアプリを終了させない
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    match event {
                        tauri::WindowEvent::CloseRequested { .. } => {
                            // ウィンドウを閉じる代わりに隠す
                            let _ = window_clone.hide();
                        }
                        _ => {}
                    }
                });
            }
            // トレイアイコン（クリックで表示/非表示切り替え）
            let _tray = TrayIconBuilder::new()
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                // ウィンドウが表示されている場合は隠す
                                let _ = window.hide();
                            } else {
                                // ウィンドウが隠れている場合は表示
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
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
