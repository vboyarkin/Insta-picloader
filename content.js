'use strict'

function downloadImg(url, filename, metadata) {
    browser.runtime.sendMessage({
        url: url,
        filename: filename,
        metadata: metadata,
    });
}