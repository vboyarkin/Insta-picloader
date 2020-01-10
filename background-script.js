browser.runtime.onMessage.addListener(downloadListener)

function downloadListener(message) {
    downloadPic(message.url, message.filename, message.metadata);
}


// TODO: insert metadata in image
function downloadPic(url_source, filename, metadata) {
    browser.downloads.download({
        url: url_source,
        filename: `${filename}.jpg`
    })
}