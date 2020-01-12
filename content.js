'use strict'

/* 
TODO: Adds buttons to posts
 */
class InstaPicloader {
    _instaObserver = new InstaObserver(this._targetNodeCallback, this._newPostCallback);

    _targetNodeCallback(targetNode) {
        console.log('target node!')
    }

    _newPostCallback(post) {
        console.log('new post!')
    }
}

/* 
Observes posts container node's childs,
calls _targetNodeCallback() on following link
      _newPostCallback()    on new post in container
 */
class InstaObserver {
    _mutationObserver = new MutationObserver(this._observerCallback.bind(this));
    _urlChangeObserver = new UrlChangeObserver(this._urlObserverCallback.bind(this));
    _targetNodeCallback;
    _newPostCallback;

    /* 
    targetNodeCallback(targetNode);
    Calls when document's load or after following links.

    newPostCallback(post)
    Calls on target node mutation.
     */
    constructor(targetNodeCallback, newPostCallback) {
        this._targetNodeCallback = targetNodeCallback;
        this._newPostCallback = newPostCallback;

        this.observe();
    }

    /* 
    Starts observing childs of target node.
     */ 
    observe() {
        let targetNode = this._getTargetNode();

        this._targetNodeCallback(targetNode);

        this._mutationObserver.observe(targetNode, {childList: true});
        this._urlChangeObserver.observe();
    }

    /* 
    Stops observing.
     */
    disconnect() {
        this._mutationObserver.disconnect();
        this._urlChangeObserver.disconnect();
    }
    
    /* 
    Restarts observing (with new target node). */
    restart() {
        this.disconnect();
        this.observe();
    }

    /* 
    Calls on mutation in target node (posts container node).
     */
    _observerCallback(mutations) {
        for (let mutation of mutations) {
            for (let post of mutation.addedNodes){
                this._newPostCallback(post);
            }
        }
    }

    /* 
    UrlChangeObserver callback.
    Restarts observing.
     */
    _urlObserverCallback() {
        this.restart();
    }

    /* 
    FIXME

    Returns posts container node.
     */
    _getTargetNode() {
        switch (this._getPathType()) {
            case "feed":
                return document.querySelector("div.cGcGK > div > div");

            case "profile":
                return document.querySelectorAll("article.ySN3v")[1].querySelector("div > div");

            // FIXME
            case "stories":
                return;
        }
    }

    /* 
    Current path type.
    Returns "feed" or "stories" or "profile" .
     */
    _getPathType() {
        let path = window.location.pathname.slice(1);

        if (path.length == 0)
            return "feed";

        else if (path.startsWith('stories/'))
            return "stories";

        else if (path.startsWith('accounts/') ||
                path == 'emails/settings/' || 
                path == 'session/login_activity/' || 
                path == 'emails/emails_sent/'
            ) return "settings";

        else 
            return "profile";
    }
}

/* 
Checks href every second, 
calls callback if href has changed
 */
class UrlChangeObserver {
    _timer = null;
    _callback;
    _prevUrl;

    constructor(callback) {
        this._callback = callback;
    }

    /* 
    Starts observing ulr change
     */
    observe() {
        this._timer = setInterval(this._intervalCallback.bind(this), 1000);
    }

    /* 
    Stops observing url change
     */
    disconnect() {
        if (this._timer != null)
            clearInterval(this._timer);
    }

    /* 
    Calls every second
     */
    _intervalCallback() {
        if (this._prevUrl != window.location.href){
            this._prevUrl = window.location.href;
            this._callback();
        }
    }
}

/* 
Sends message to background-script.js
 */
function downloadImg(url, filename, metadata) {
    browser.runtime.sendMessage({
        url: url,
        filename: filename,
        metadata: metadata,
    });
}

let picLoader = new InstaPicloader();