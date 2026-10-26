"""Decode a canvas data URL returned by CDP Runtime.evaluate into a PNG.

Usage: python3 save_canvas.py <cdp-response.json> <out.png>
The JSON is the file the browser tool writes when a response is too large to inline.
"""

import base64
import json
import sys


def find_data_url(node):
    if isinstance(node, str) and node.startswith("data:image/"):
        return node
    if isinstance(node, dict):
        for value in node.values():
            found = find_data_url(value)
            if found:
                return found
    if isinstance(node, list):
        for value in node:
            found = find_data_url(value)
            if found:
                return found
    return None


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit("usage: save_canvas.py <cdp-response.json> <out.png>")
    with open(sys.argv[1]) as f:
        data_url = find_data_url(json.load(f))
    if not data_url:
        sys.exit("no data:image URL found in response (did the evaluate return __sim.shot()?)")
    with open(sys.argv[2], "wb") as f:
        f.write(base64.b64decode(data_url.split(",", 1)[1]))
    print(f"saved {sys.argv[2]}")


if __name__ == "__main__":
    main()
