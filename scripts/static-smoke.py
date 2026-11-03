"""Verify that the production build works beneath a GitHub Pages-style subpath."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.request import urlopen
from urllib.parse import urljoin
from tempfile import TemporaryDirectory
import shutil
import re
import json

root = Path(__file__).resolve().parents[1]
with TemporaryDirectory() as temp:
    target = Path(temp) / "sample-repository"
    shutil.copytree(root / "dist", target)

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=temp, **kwargs)

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_address[1]}/sample-repository/"

    def fetch(path):
        with urlopen(urljoin(base, path)) as response:
            body = response.read()
            assert response.status == 200, path
            return body

    try:
        html = fetch("").decode()
        scripts = re.findall(r'<script[^>]+src="([^"]+)"', html)
        links = re.findall(r'<link[^>]+href="([^"]+)"', html)
        for path in scripts + links:
            fetch(path)
        manifest = json.loads(fetch("manifest.webmanifest"))
        for icon in manifest["icons"]:
            fetch(icon["src"])
        sw = fetch("sw.js").decode()
        items = json.loads(re.search(r"const ASSETS=(\[.*?\]);", sw).group(1))
        for path in items:
            fetch(path)
        assert len(items) > 10
        assert any(path.endswith("stockfish-19-lite-single.wasm") for path in items)
        print(
            "STATIC HTTP SMOKE: PASS at /sample-repository/; "
            f"{len(items)} precached assets, Stockfish WASM, and manifest icons served"
        )
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
