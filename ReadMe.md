# Slack Media Downloader

A script fo automatically downloading images and videos (excludes everything else) from a slack export.

## Quick Start

Create a `.env` file in the root directory with the following values:
```
BASE_PATH='/path/to/slack/export/directory'
MATCH='.*.json'
OUTPUT_PATH='/path/to/download/folder'
```

Note that the script searches through `BASE_PATH` recursively. Then run the following scripts in the terminal:

```shell
npm install
npm start
```

The script will then automatically download the media files into `OUTPUT_PATH` in the following format: `YYYY-MM-DD filename.ext`.

Progress will show in CLI output whenever an image finishes downloading. Any errors are logged in `./logs`.

## Visual Studio Debugging
Press `F5`. Easy as breathing.
