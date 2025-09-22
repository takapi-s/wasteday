#!/usr/bin/env python3
import json
from http.server import HTTPServer, BaseHTTPRequestHandler


PORT = 5606
PATH = "/api/ingest/browsing"


class Handler(BaseHTTPRequestHandler):
    def _set_cors_headers(self, status=200):
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        if self.path == PATH:
            self._set_cors_headers(204)
        else:
            self._set_cors_headers(404)

    def do_POST(self):
        if self.path != PATH:
            self._set_cors_headers(404)
            self.wfile.write(b"not found")
            return

        length = int(self.headers.get('Content-Length', '0'))
        raw = self.rfile.read(length) if length > 0 else b""
        try:
            data = json.loads(raw.decode('utf-8')) if raw else {}
        except Exception as e:
            print(f"[ERROR] invalid json: {e}")
            self._set_cors_headers(400)
            self.wfile.write(b"bad request")
            return

        # ログ出力
        print("[RECV] /api/ingest/browsing:", json.dumps(data, ensure_ascii=False))

        # 200 OK
        self._set_cors_headers(200)
        self.wfile.write(b"ok")


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=PORT)
    parser.add_argument("--host", type=str, default="127.0.0.1")
    args = parser.parse_args()

    server = HTTPServer((args.host, args.port), Handler)
    print(f"Test ingest server running on http://{args.host}:{args.port}{PATH}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        print("Server stopped")


if __name__ == "__main__":
    main()


