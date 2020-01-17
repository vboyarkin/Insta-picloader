//browser.runtime.onMessage.addListener(downloadPic)

/*
TODO: 
insert metadata in image,
put proper filename extension.
 */
function downloadPic(metadata) {
    let filename = `${metadata.profileName} ${metadata.time}.jpg`;

    browser.downloads.download({
        url: metadata.imgUrl,
        filename: filename,
    })
}
class CSConnector {
    ports = [];

    constructor() {
        browser.runtime.onConnect.addListener(this.onConnect.bind(this));
    }

    onConnect(port) {
        this.ports.push(port)

        port.onMessage.addListener(this._onMessage)

        console.log(port);
    }

    _onMessage(message) {
        console.log(message);

        switch (message.type) {
            case "download":
                downloadPic(message.metadata);
                break;
    
            case "tabId":
                instagramTabs.push(tabId);
        }
    
    
        //console.log("Tab " + activeInfo.tabId + " was activated");
    }
}

connector = new CSConnector();