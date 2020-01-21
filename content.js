/* eslint-disable default-case */
/* eslint-disable no-useless-return */
/* eslint-disable comma-dangle */
/* eslint-disable arrow-parens */
/* eslint-disable no-param-reassign */
/* eslint-disable object-curly-newline */
/* eslint-disable indent */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-use-before-define */
/* eslint-disable quotes */
/* eslint-disable max-classes-per-file */
/* eslint-disable strict */

"use strict";

class InstaPicloader {
    constructor() {
        this._instaObserver = new InstaObserver(
            this._targetNodeCallback.bind(this),
            this._newPostCallback.bind(this),
        );

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
        this._postProcesser = Post.getPostProcessor(
            pathType,
            this._instaObserver.downloadImg.bind(this._instaObserver),
        );

        for (const post of targetNode.children) {
            this._newPostCallback(post);
        }
    }

    /**
     * Calls proper process method for the post.
     */
    _newPostCallback(post) {
        this._postProcesser.processPost.call(this._postProcesser, post);
    }
}

class Post {
    /**
     * Adds downloadHandler to download buttons
     * @param {function} downloadHandler
     */
    constructor(downloadHandler) {
        this._downloadButtonClass = "insta-picloader-download-button";
        this._downloadHandler = downloadHandler;
    }

    /**
     * Get proper post processor for pathType
     * @param {('feed'|'profile post'|'stories'|'profile')} pathType
     * @param {function} downloadHandler
     * @returns {FeedOrProfilePost|StoriePost} post processor
     */
    static getPostProcessor(pathType, downloadHandler) {
        switch (pathType) {
            case "feed":
            case "profile post":
                return new FeedOrProfilePost(downloadHandler);
            case "stories":
                return new StoriePost(downloadHandler);
            case "profile":
                return;
        }
    }

    /**
     * Checks if the post already has download button (why this happens?).
     *
     * If ok, gets button container and adds download button.
     */
    processPost(post) {
        if (this._hasDownloadButton(post)) return;

        this._getButtonContainer(post).appendChild(
            this._getDownloadButton(post),
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
    _getMetadata({ post, time, img, video, videoUrl, headerlink, postLink }) {
        if (!time) time = post.querySelector("time");
        if (!img) img = post.querySelectorAll("img")[1];
        if (!video) video = post.querySelector("video");
        if (!headerlink) {
            const headerlinks = post.querySelectorAll("header a");
            // find link with title
            headerlink = [].filter.call(headerlinks, a => a.title)[0];
        }

        // find video url if there's any
        if (video && !videoUrl) {
            let videoSrcs = video.querySelectorAll("source");

            if (videoSrcs) {
                videoSrcs = [].map.call(
                    videoSrcs,
                    sourceElem => sourceElem.src
                );
                videoSrcs = [].filter.call(videoSrcs, src => src);

                videoUrl = videoSrcs[0];
            }
        }

        return {
            imgUrl: img.currentSrc,
            videoUrl,
            profileName: headerlink.title,
            profileLink: headerlink.href,
            time: formatTime(time),
            postLink,
            alt: img.alt,
        };

        /** Local function.
         * Extracts time from <time> and make it valid for filename.
         */
        function formatTime(timeElem) {
            return timeElem
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
        const innerSpan = document.createElement("span");
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

        const button = document.createElement("button");
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
    constructor(downloadHandler) {
        super(downloadHandler);
    }

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
    /**
     * targetNodeCallback(targetNode, pathType);
     * Calls when document's load or after following links.
     *
     * newPostCallback(post)
     * Calls on target node mutation.
     */
    constructor(targetNodeCallback, newPostCallback) {
        this._mutationObserver = new MutationObserver(this._observerCallback.bind(this));
        this._urlChangeObserver = new UrlChangeObserver(
            this._urlObserverCallback.bind(this)
        );
        this._bGConnector = new BGConnector(this);

        this._targetNodeCallback = targetNodeCallback;
        this._newPostCallback = newPostCallback;
    }

    /**
     * Starts observing childs of target node.
     */

    async observe() {
        const targetNode = await this._getTargetNode();

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
        } catch (e){
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
    constructor(callback) {
        this._timer = null;
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

    constructor(observer) {
        this._observer = observer;
        this._connectToBGScript();
    }

    _connectToBGScript() {
        this.port = browser.runtime.connect();
        this.port.onMessage.addListener(this._onPortMessage.bind(this));
    }

    /**
     * Listens to commands from background-script
     */
    _onPortMessage(message) {
        if (message.observerAction) this._observer[message.observerAction]();
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
