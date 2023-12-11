# Python 3 server example
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import mimetypes

hostName = "localhost"
serverPort = 8000


class MyServer(BaseHTTPRequestHandler):
    def do_GET(self):

        filepath = Path("." + self.path)
        if self.path == "/target_file":
            filepath = Path("../data/gpg")
        elif self.path == "/config":
            filepath = Path("../gpg/gpg.probe")
        elif self.path == "/" or self.path == "":
            filepath = Path("./index.html")
        elif self.path == "/probe":
            filepath = Path("../gpg/gpg.probe")

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

    def get_mimetype(self, filepath):
        guess, encoding = mimetypes.guess_type(filepath)
        if guess:
            return guess, encoding
        return 'application/octet-stream', None
        # if filepath.suffix == ".html":
        #     return "text/html"
        # elif filepath.suffix == ".js":
        #     return "text/javascript"
        # return "text/{}".format(filepath.suffix[1:])

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
