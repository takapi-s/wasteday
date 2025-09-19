// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use log::{info, error};
use std::fs;

fn main() {
    // ログファイルの設定（より確実な場所に保存）
    let log_dir = std::env::temp_dir().join("wasteday");
    fs::create_dir_all(&log_dir).ok();
    let log_file = log_dir.join("wasteday.log");
    
    // ログファイルに出力する設定
    if let Ok(file) = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file) {
        env_logger::Builder::from_default_env()
            .target(env_logger::Target::Pipe(Box::new(file)))
            .init();
    } else {
        // ログファイルが開けない場合は標準出力に出力
        env_logger::init();
    }
    
    info!("WasteDay application starting...");
    info!("Log file location: {:?}", log_file);
    
    // エラーハンドリングを追加
    match std::panic::catch_unwind(|| {
        wasteday_lib::run()
    }) {
        Ok(_) => {
            info!("Application exited normally");
        }
        Err(e) => {
            error!("Application crashed: {:?}", e);
            // より詳細なクラッシュ情報をファイルに書き込む
            let crash_info = format!(
                "Application crashed at: {}\nError: {:?}\nBacktrace: {:?}",
                chrono::Utc::now().to_rfc3339(),
                e,
                std::backtrace::Backtrace::capture()
            );
            let _ = fs::write(log_dir.join("crash.log"), crash_info);
            error!("Crash details written to: {:?}", log_dir.join("crash.log"));
        }
    }
}
