# Python 3 server example
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import mimetypes
import subprocess

hostName = "0.0.0.0"
serverPort = 8000


class MyServer(BaseHTTPRequestHandler):
    def do_POST(self):
        self.send_response(200)
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.end_headers()
        self.encrypt()

    def do_GET(self):

        filepath = Path("." + self.path)
        if self.path == "/target_file":
            filepath = Path("../data/gpg")
        elif self.path == "/config":
            filepath = Path("../gpg/gpg-web.probe")
        elif self.path == "/" or self.path == "":
            filepath = Path("./index.html")

        if filepath.exists():
            self.send_response(200)
            mimetype = mimetypes.guess_type(filepath)
            self.send_header("Content-type", mimetype[0])
            self.send_header("Cross-Origin-Opener-Policy", "same-origin")
            self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
            self.end_headers()
            self.send_file(filepath)
            return
        else:
            self.send_response(404)
            self.end_headers()

    def encrypt(self):
        subprocess.getoutput("${GPG} --yes -e hello.txt")

    def send_file(self, filepath):
        with open(filepath, "rb") as f:
            self.wfile.write(f.read())


if __name__ == "__main__":
    webServer = HTTPServer((hostName, serverPort), MyServer)
    print("Server started http://%s:%s" % (hostName, serverPort))

    try:
        webServer.serve_forever()
    except KeyboardInterrupt:
        pass

    webServer.server_close()
    print("Server stopped.")
