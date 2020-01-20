/**
 * TODO:
 * insert metadata in image
 */
function downloadPic(metadata) {
    let fileUrl = metadata.videoUrl || metadata.imgUrl;

    let extension = fileUrl.match(/\....\?/)[0].substr(1, 3);

    let filename = `${metadata.profileName} ${metadata.time}.${extension}`;

    browser.downloads.download({
        url: fileUrl,
        filename,
    });
}

/**
 * Handles connection with instagram tabs.
 */
class CSConnector {
    /**
     * Map contains pairs tab - port
     */
    tabPortsMap = new Map();

    /**
     * Make onConnect listen to new content script
     */
    constructor() {
        browser.runtime.onConnect.addListener(this.onConnect.bind(this));
        browser.tabs.onRemoved.addListener(this.onRemoved.bind(this));
    }

    /**
     * Called on opening new instagram tab
     */
    onConnect(port) {
        let tabId = port.sender.tab.id;
        this.tabPortsMap.set(tabId, port);

        port.onMessage.addListener(this._onPortMessage.bind(this));

        browser.tabs.onActivated.addListener(this._onTabActivated.bind(this));
    }

    /**
     * Called on closing any tab.
     * Removes closed connections.
     * @param {number} tabId Id of closed tab
     */
    onRemoved(tabId) {
        this.tabPortsMap.delete(tabId);
    }

    /**
     *
     * @param {Object}      message
     * @param {"download"}  message.type
     * @param {Object}      message.metadata file url and meta
     */
    _onPortMessage(message) {
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
                    observerAction: "disconnect",
                });
            } else
                port.postMessage({
                    observerAction: "observe",
                });
        }
    }
}

connector = new CSConnector();
