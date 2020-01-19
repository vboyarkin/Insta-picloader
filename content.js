"use strict";

class InstaPicloader {
    _instaObserver = new InstaObserver(
        this._targetNodeCallback.bind(this),
        this._newPostCallback.bind(this)
    );
    _pathType;
    _downloadButtonClass = "insta-picloader-download-button";

    constructor() {
        this.observe();
    }

    observe() {
        this._instaObserver.observe();
    }

    disconnect() {
        this._instaObserver.disconnect();
    }

    /**
     * Calls when document's load or after following links.
     * Calls _newPostCallback(post) on every post.
     */
    _targetNodeCallback(targetNode, pathType) {
        this._pathType = pathType;

        for (let post of targetNode.children) {
            this._newPostCallback(post);
        }
    }

    /**
     * Calls proper process method for the post.
     */
    _newPostCallback(post) {
        switch (this._pathType) {
            case "feed":
            case "profile post":
                this._processFeedOrProfilePost(post);
                break;

            case "stories":
                this._processStorie(post);
                break;

            case "profile":
                this._processProfileContainer(post);
                break;
        }
    }

class Post {
    _downloadHandler;
    _downloadButtonClass = "insta-picloader-download-button";

    /**
     * Adds downloadHandler to download buttons
     * @param {function} downloadHandler
     */
    constructor(downloadHandler) {
        this._downloadHandler = downloadHandler;
    }

    //#region  post processing

    /** 
     * Checks if the post:
     * 1. is an article,
     * 2. already has download button (why this happens?).
 
     * If ok, gets button container and adds download button. 
    */
    _processFeedOrProfilePost(post) {
        // The post should be an article
        if (post.tagName != "ARTICLE" || this._hasDownloadButton(post)) return;

        this._getButtonContainer(post).appendChild(
            this._getDownloadButton(post)
        );
    }

    /**
     * Checks if the post already has download button (why this happens?).
     *
     * If ok, gets button container and adds download button.
     */
    processPost(post) {
        if (this._hasDownloadButton(post)) return;

        this._getButtonContainer(post).appendChild(
            this._getDownloadButton(post)
        );
    }

    /**
     * Returns true if post has download button
     *
     * TODO: "profile" cases.
     */
    _hasDownloadButton(post) {
        for (const elem of this._getButtonContainer(post).children) {
            if (elem.classList.contains(this._downloadButtonClass)) return true;
        }

        return false;
    }

    /**
     * Returns:
     * 1. Url of the image,
     * 2. Profile name,
     * 3. Time of the post,
     * 4. Link to profile.
     * @param {Object}              meta
     * @param {HTMLLinkElement}     post
     * @param {HTMLTimeElement}     meta.time
     * @param {HTMLImageElement}    meta.img
     * @param {HTMLLinkElement}     meta.headerlink
     * @param {string}              meta.postLink
     */
    _getMetadata({ post, time, img, headerlink, postLink }) {
        if (!time) time = post.querySelector("time");
        if (!img) img = post.querySelectorAll("img")[1];
        if (!headerlink) {
            let headerlinks = post.querySelectorAll("header a");
            //find link with title
            headerlink = [].filter.call(headerlinks, a => a.title)[0];
        }

        return {
            imgUrl: img.currentSrc,
            profileName: headerlink.title,
            profileLink: headerlink.href,
            time: formatTime(time),
            postLink: postLink,
            alt: img.alt,
        };

        /** Local function.
         * Extracts time from <time> and make it valid for filename.
         */
        function formatTime(time) {
            return time
                .getAttribute("datetime")
                .substring(0, 19)
                .replace("T", "_")
                .split(":")
                .join("-");
        }
    }

    /**
     * Returns button for downloading
     */
    _getDownloadButton(post) {
        let innerSpan = document.createElement("span");
        innerSpan.setAttribute("aria-label", "Download image");

        innerSpan.style.cssText += `
            background-image:       url(${browser.runtime.getURL(
                "img/download-icon.png"
            )});
            background-size:        24px 24px;
            background-repeat:      no-repeat;
            background-position:    center center;
            display:                inline-block;
            cursor:                 pointer;
        `;

        let button = document.createElement("button");
        button.appendChild(innerSpan);

        // to check if there is a download button in post
        button.classList.add(this._downloadButtonClass);
        button.addEventListener("click", () =>
            this._downloadHandler(this._getMetadata(post))
        );

        // Makes button white if theme's dark
        if (this._isThemeDark())
            button.style.cssText += `
                opacity:    0.87;
                filter:     invert(100%);
            `;

        for (const elem of [button, innerSpan]) {
            elem.style.cssText += `
                background-color:   transparent;
                border:             0;
                min-width:          40px;
                min-height:         40px;
                padding:            0;
                margin:             0;
            `;
        }

        return button;
    }

    /**
     * Returns true if body's background-color is dark
     */
    _isThemeDark() {
        let rgb = getComputedStyle(document.body).backgroundColor.substring(
            4,
            14
        );

        let sumOfColors = rgb.split(", ").reduce((a, b) => +a + +b);

        return sumOfColors <= 65 * 3;
    }
}

class FeedOrProfilePost extends Post {
    constructor(downloadHandler) {
        super(downloadHandler);
    }

    /**
     * Checks if the post is an article and calls super's process post method
     * @param {HTMLElement} post article
     */
    processPost(post) {
        // The post should be an article
        if (post.tagName != "ARTICLE") return;

        super.processPost(post);
    }

    _getMetadata(post) {
        let time = post.querySelector("time");

        return super._getMetadata({
            post,
            postLink: time.parentElement.href,
        });
    }

    /**
     * Returns button container
     */
    _getButtonContainer(post) {
        return post.querySelector("div > section");
    }
}

class StoriePost extends Post {
    constructor() {}

    /**
     * Returns button container
     */
    _getButtonContainer(post) {
        return document.querySelector("header > div").children[1];
    }

    _getMetadata(post) {
        return super._getMetadata({
            post,
            postLink: window.location.href,
        });
    }
}

/**
 * Observes posts container node's childs
 *
 * calls
 * 1. _targetNodeCallback() on following link
 * 2. _newPostCallback()    on new post in container
 */
class InstaObserver {
    _mutationObserver = new MutationObserver(this._observerCallback.bind(this));
    _urlChangeObserver = new UrlChangeObserver(
        this._urlObserverCallback.bind(this)
    );
    _bGConnector = new BGConnector(this);
    _targetNodeCallback;
    _newPostCallback;

    /**
     * targetNodeCallback(targetNode, pathType);
     * Calls when document's load or after following links.
     *
     * newPostCallback(post)
     * Calls on target node mutation.
     */
    constructor(targetNodeCallback, newPostCallback) {
        this._targetNodeCallback = targetNodeCallback;
        this._newPostCallback = newPostCallback;
    }

    /**
     * Starts observing childs of target node.
     */

    async observe() {
        let targetNode = await this._getTargetNode();

        this._targetNodeCallback(targetNode, this._getPathType());

        this._mutationObserver.observe(targetNode, { childList: true });
        this._urlChangeObserver.observe();
    }

    /**
     * Stops observing.
     */
    disconnect() {
        this._mutationObserver.disconnect();
        this._urlChangeObserver.disconnect();
    }

    /**
     * Restarts observing (with new target node). */
    restart() {
        this.disconnect();
        this.observe();
    }

    /**
     * Gets all data,
     * sends message to background-script.js
     */
    downloadImg(metadata) {
        this._bGConnector.postMessage.call(this._bGConnector, {
            type: "download",
            metadata,
        });
    }

    /**
     * Calls on mutation in target node (posts container node).
     */
    _observerCallback(mutations) {
        for (let mutation of mutations) {
            for (let post of mutation.addedNodes) {
                this._newPostCallback(post);
            }
        }
    }

    /** 
       * UrlChangeObserver callback.
       
       * Calls on URL change.
       */
    _urlObserverCallback() {
        this.restart();
    }

    /**
     * Returns promise that resolves with posts-container node.
     *
     * If there's no target node, waits 300 ms and tries again.
     */
    async _getTargetNode() {
        try {
            let targetNode;
            switch (this._getPathType()) {
                // narrow screen => main > section has 2 children
                // wide screen   => main > section has 3 children
                case "feed":
                    let mainSection = document.querySelector("main > section");

                    if (mainSection.children.length == 2)
                        targetNode = mainSection.children[1].querySelector(
                            "div > div > div"
                        );
                    else if (mainSection.children.length == 3)
                        targetNode = mainSection.querySelector(
                            "div > div > div"
                        );
                    //targetNode = document.querySelector("div.cGcGK > div > div");

                    break;

                case "profile":
                    targetNode = document
                        .querySelectorAll("article.ySN3v")[1]
                        .querySelector("div > div");
                    break;

                case "profile post":
                    targetNode = document.querySelector(".PdwC2");
                    break;

                case "stories":
                    targetNode = document.querySelector(".yS4wN");
                    break;
            }

            if (!targetNode) throw Error("target node is null");

            return targetNode;
        } catch {
            let w = await wait();

            return this._getTargetNode();
        }
    }

    /**
     * Current path type.
     * @returns {"feed" | "stories" | "profile"}
     */
    _getPathType() {
        let path = window.location.pathname.slice(1);

        if (path.length == 0) return "feed";
        else if (path.startsWith("stories/")) return "stories";
        else if (
            path.startsWith("accounts/") ||
            path == "emails/settings/" ||
            path == "session/login_activity/" ||
            path == "emails/emails_sent/"
        )
            return "settings";
        else if (path.startsWith("p/")) return "profile post";
        else return "profile";
    }
}

/**
 * Checks href every second,
 * calls callback if href has changed
 */
class UrlChangeObserver {
    _timer = null;
    _callback;
    _prevUrl;

    constructor(callback) {
        this._callback = callback;
    }

    /**
     * Starts observing ulr change
     */
    observe() {
        this._timer = setInterval(this._intervalCallback.bind(this), 1000);
    }

    /**
     * Stops observing url change
     */
    disconnect() {
        if (this._timer != null) clearInterval(this._timer);
    }

    /**
     * Calls every second
     */
    _intervalCallback() {
        if (this._prevUrl != window.location.href) {
            this._prevUrl = window.location.href;
            this._callback();
        }
    }
}

/**
 * Connection with background-script.js.
 * Calls _observer's "observe" or "disconnect"
 * on corresponding message from bg-script.
 */
class BGConnector {
    _observer;
    port;

    constructor(observer) {
        this._observer = observer;
        this._connectToBGScript();
    }

    _connectToBGScript() {
        this.port = browser.runtime.connect();
        this.port.onMessage.addListener(this._onMessage.bind(this));
    }

    /**
     * TODO: stop/start url observer
     */
    _onMessage(message) {
        // if action is provided
        if (message.action) this._observer[message.action]();
    }

    postMessage(message) {
        this.port.postMessage(message);
    }
}

function wait() {
    return new Promise(resolve => {
        setTimeout(() => resolve(), 300);
    });
}

let picLoader = new InstaPicloader();
