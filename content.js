'use strict'


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
adds download buttons.
 */
class InstaObserver {
    _mutationObserver = new MutationObserver(this._observerCallback.bind(this));
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
    }

    /* 
    Stops observing.
     */
    disconnect() {
        this._mutationObserver.disconnect();
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