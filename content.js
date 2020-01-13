'use strict'

/* 
TODO: Adds buttons to posts
 */
class InstaPicloader {
    _instaObserver = new InstaObserver(this._targetNodeCallback.bind(this), this._newPostCallback.bind(this));
    _pathType;

    /* 
    Calls when document's load or after following links.

    Calls _newPostCallback(post) on every post.
     */
    _targetNodeCallback(targetNode, pathType) {
        this._pathType = pathType;

        for (let post of targetNode.children) {
            this._newPostCallback(post);
    }
    }

    /* 
    Calls proper process method for the post.
     */
    _newPostCallback(post) {
        switch(this._pathType){
            case "feed":
                this._processFeedPost(post); 
                break;

            case "stories":
                this._processStorie(post);
                break;
                
            case "profile":
                this._processProfilePost(post);
                break;
        }
    }
    _processFeedPost(post) {
        if (post.tagName != "ARTICLE")
            return;

        let buttonBar = post.querySelector("div.eo2As > section > span.wmtNn");

        buttonBar.appendChild(this._getFeedDownloadButton(post))
    }

    _getFeedDownloadButton(post) {
        let innerSpan = document.createElement('span');
        innerSpan.style.backgroundImage = 'url(img/download-icon.png)';
        innerSpan.setAttribute('aria-label', 'Download image');

        let button = document.createElement('button');
        button.appendChild(innerSpan);

        let spanWrapper = document.createElement('span');

        button.addEventListener('click', () => this._downloadImg(post));
        return button
    }
        
        return spanWrapper;
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
    targetNodeCallback(targetNode, pathType);
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

        this._targetNodeCallback(targetNode, this._getPathType());

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
                return document.querySelector(".yS4wN");
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

function wait() {
    return new Promise((resolve) => {
       setTimeout(() => resolve(), 300); 
    });
}

let picLoader = new InstaPicloader();