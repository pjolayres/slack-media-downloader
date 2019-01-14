/* eslint-disable func-names, no-console */

import dotenv from 'dotenv';
import klaw from 'klaw';
import through2 from 'through2';
import fs from 'fs-extra';
import path from 'path';
import download from 'download';

dotenv.config();

const basePath = (process.env.BASE_PATH || '').trim();
const match = (process.env.MATCH || '').trim();
const outputPath = (process.env.OUTPUT_PATH || '').trim();
const items = [];
const mediaItems = [];

const filter = through2.obj(function (item, enc, next) {
  if (
    !item.stats.isDirectory()
    && (!match || new RegExp(match, 'i').test(item.path))
  ) {
    this.push(item);
  }

  next();
});

const processAttachment = file => {
  if (!file
    || !file.mimetype
    || !file.url_private_download
    || (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/'))) {
    return;
  }

  mediaItems.push(file);

  const date = new Date(file.created * 1000);
  const fileName = `${date.toISOString().substring(0, 10)} ${file.name}`;
  const outputFilePath = path.join(outputPath, fileName);

  try {
    const url = file.url_private_download;
    download(file.url_private_download, outputPath, {
      filename: fileName
    })
      .then(() => {
        console.log('Finished: ', outputFilePath);
      })
      .catch(reason => {
        console.error(`Error (${url}): `, reason);
      });
  }
  catch (ex) {
    console.log('outputFilePath = ', outputFilePath);
    console.log('file.url_private_download = ', file.url_private_download);
    console.error(ex);
  }
};

const processMessage = message => {
  if (!message || !message.files) {
    return;
  }

  message.files.forEach(attachment => {
    processAttachment(attachment);
  });

  console.log('mediaItems.length = ', mediaItems.length);
};

const processFiles = () => {
  items.forEach(filePath => {
    fs.readJson(filePath)
      .then(messages => {
        (messages || []).forEach(message => {
          processMessage(message);
        });
      });
  });
};

klaw(basePath)
  .pipe(filter)
  .on('data', item => items.push(item.path))
  .on('end', () => processFiles());
