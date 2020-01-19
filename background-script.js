/**
 * TODO:
 * insert metadata in image,
 * put proper filename extension.
 */
function downloadPic(metadata) {
    let filename = `${metadata.profileName} ${metadata.time}.jpg`;

    browser.downloads.download({
        url: metadata.imgUrl,
        filename,
    });
}

/**
 * TODO: remove tab & port from tabPorts on tab close
 */
class CSConnector {
    /**
     * Map contains pairs tab - port
     */
    tabPortsMap = new Map();

    constructor() {
        browser.runtime.onConnect.addListener(this.onConnect.bind(this));
    }

    /**
     * Called on opening new instagram tab
     */
    onConnect(port) {
        let tabId = port.sender.tab.id;
        this.tabPortsMap.set(tabId, port);

        port.onMessage.addListener(this._onMessage.bind(this));

        browser.tabs.onActivated.addListener(this._onTabActivated.bind(this));
    }

    _onMessage(message) {
        switch (message.type) {
            case "download":
                downloadPic(message.metadata);
                break;
        }
    }

    /**
     * Called on active tab change.
     * 
     * If tab is instagram, observe it.
     * If instagram tab is inactive, stop observing.
     */
    _onTabActivated(activeInfo) {
        let activeTabId = activeInfo.tabId;

        for (const tabPort of this.tabPortsMap.entries()) {
            const tab = tabPort[0];
            const port = tabPort[1];

            if (tab != activeTabId) {
                port.postMessage({
                    action: "disconnect",
                });
            } else
                port.postMessage({
                    action: "observe",
                });
        }
    }
}

connector = new CSConnector();
