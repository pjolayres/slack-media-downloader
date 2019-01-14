/* eslint-disable func-names, no-console */

import _ from 'lodash';
import dotenv from 'dotenv';
import klawSync from 'klaw-sync';
import fs from 'fs-extra';
import path from 'path';
import download from 'download';
import logger from './logger';

dotenv.config();

(async () => {
  const basePath = (process.env.BASE_PATH || '').trim();
  const match = (process.env.MATCH || '').trim();
  const outputPath = (process.env.OUTPUT_PATH || '').trim();
  const attachments = [];
  const minDate = parseInt('2017-07-24'.replace(/-/g, ''), 10);
  const batchSize = 10;
  let downloadCount = 0;

  try {
    // Get list of file paths
    const filePaths = klawSync(basePath)
      .filter(file => !match || new RegExp(match, 'i').test(file.path))
      .map(file => file.path);

    // Parse files and get list of all valid attachments
    await Promise.all(filePaths.map(async (filePath) => {
      const messages = await fs.readJson(filePath);

      (messages || []).forEach(message => {
        if (!message || !message.files) {
          return;
        }

        message.files.forEach(attachment => {
          if (
            !attachment
            || !attachment.mimetype
            || !attachment.url_private_download
            || (!attachment.mimetype.startsWith('image/') && !attachment.mimetype.startsWith('video/'))
          ) {
            return; // Ignore any non-image or non-video attachments
          }

          attachments.push(attachment);
        });
      });
    }));

    const sortedAttachments = attachments.sort((obj1, obj2) => obj1.timestamp - obj2.timestamp);
    // const attachmentsGroups = _.chunk(sortedAttachments, 100);
    const attachmentsGroups = _.groupBy(sortedAttachments, attachment => {
      const date = new Date(attachment.created * 1000);
      const groupKey = date.toISOString().substring(0, 10);

      return groupKey;
    });

    // Download the media files in batches
    let batchCount = 0;
    const attachmentsGroupKeys = Object.keys(attachmentsGroups);
    for (let i = 0; i < attachmentsGroupKeys.length; i++) {
      const groupKey = attachmentsGroupKeys[i];
      const attachmentsGroup = attachmentsGroups[groupKey];

      const dateKey = parseInt(groupKey.replace(/-/g, ''), 10);
      if (dateKey <= minDate) {
        downloadCount += attachmentsGroup.length;
        console.log(`Skipping batch ${i + 1} of ${attachmentsGroupKeys.length} [${groupKey}]: ${dateKey} <= ${minDate}`);
        continue; // eslint-disable-line
      }

      console.log(`Downloading batch ${i + 1} of ${attachmentsGroupKeys.length} [${groupKey}]`);

      // eslint-disable-next-line
      await Promise.all(attachmentsGroup.map(async (attachment) => {
        const date = new Date(attachment.created * 1000);
        const fileName = `${date.toISOString().substring(0, 10)} ${attachment.id}-${attachment.name}`;
        const outputFilePath = path.join(outputPath, fileName);

        try {
          await download(attachment.url_private_download, outputPath, {
            filename: fileName
          });

          batchCount += 1;
          downloadCount += 1;
          console.log(`${downloadCount} of ${attachments.length}: Finished downloading ${outputFilePath}`);
        }
        catch (ex) {
          downloadCount += 1;
          console.log(`${downloadCount} of ${attachments.length}: Failed to download ${attachment.url_private_download}`);
          logger.error(`${downloadCount} of ${attachments.length}: Failed to download file due to ${ex.statusCode} - ${ex.statusMessage}. %j`, attachment);
        }
      })).then(() => { // eslint-disable-line
        if (batchCount >= batchSize) {
          return new Promise(resolve => {
            batchCount = 0;
            console.log('Sleeping for 1 minute');
            setTimeout(resolve, 65 * 1000);
          });
        }

        return Promise.resolve();
      });
    }
  }
  catch (ex) {
    console.error(ex);
  }
})();
