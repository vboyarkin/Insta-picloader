browser.runtime.onMessage.addListener(downloadPic)

/*
TODO: 
insert metadata in image,
put proper filename extension.
 */
function downloadPic(metadata) {
    let filename = `${metadata.profileName}_${metadata.time}.jpg`;

    browser.downloads.download({
        url: metadata.imgUrl,
        filename: filename,
    })
}