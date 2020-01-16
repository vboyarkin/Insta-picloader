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

    /* 
    Gets all data, 
    sends message to background-script.js
     */
    _downloadImg(post) {
        let metadata = this._getMetadata(post);
        console.log(metadata);

        browser.runtime.sendMessage(metadata);
    }


    //#region  post processing

    /* 
    Checks if the post:
    1) is an article,
    2) already has download button (why this happens?).

    If ok, gets button container and adds download button. 
     */
    _processFeedOrProfilePost(post) {
        // The post should be an article
        if (post.tagName != "ARTICLE" || this._hasDownloadButton(post))
            return;

        this._getButtonContainer(post).appendChild(this._getDownloadButton(post));
    }

    /* 
    Checks if the storie already has download button
    and adds download button.
     */
    _processStorie(post) {
        if (this._hasDownloadButton(post))
            return;
            
        this._getButtonContainer(post).appendChild(this._getDownloadButton(post));
    }

    /* 
    TODO: Processes every post in container
     */
    _processProfileContainer(container) {
        // contaner has 3 posts
        /*for (const post of container) {
            
        }*/
    }

    /* 
    Returns button container for this _pathType

    TODO: and "profile" cases.
     */
    _getButtonContainer(post) {
        switch(this._pathType){
            case "feed":
            case "profile post":
                return post.querySelector("div.eo2As > section > span.wmtNn");

            case "stories":
                return document.querySelector('header > div').children[1];
                
            case "profile":
                return;
        }
    }

    /* 
    Returns true if post has download button

    TODO: "profile" cases.
     */
    _hasDownloadButton(post) {
        switch(this._pathType){
            case "feed":
            case "profile post":
            case "stories":
                return this._getButtonContainer(post).children.length > 1;
                
            case "profile":
                return;
        }
    }

    /* 
    Returns:
    1. Url of the image,
    2. Profile name,
    3. Time of the post,
    4. Link to profile.

    TODO: make it work with and "profile"
     */
    _getMetadata(post) {
        let time;
        let img;
        let headerlink;
        let postLink;

        switch(this._pathType){
            case "feed":     
            case "profile post":
                time        = post.querySelector('time');            
                img         = post.querySelectorAll('img')[1];
                headerlink  = post.querySelector('header a');
                postLink    = time.parentElement.href;

                break;

            case "stories":
                time        = post.querySelector('time');   
                img         = post.querySelectorAll('img')[1];
                headerlink  = post.querySelectorAll('header a')[1];
                postLink    = window.location.href;
                break;
                
            case "profile":
                return;
        }

                return {
                    imgUrl:         img.currentSrc,
                    profileName:    headerlink.title,
                    profileLink:    headerlink.href,
                    time:           formatTime(time),
            postLink:       postLink,
            alt:            img.alt,
                };
                
        /* Local function.
        Extracts time from <time> and make it valid for filename.
         */
        function formatTime(time) {
            return time
                .getAttribute('datetime')
                .substring(0,19)
                .replace('T', '_')
                .split(':').join('-');
        }
    }
        
    /* 
    Returns button for downloading

    TODO: fix button style, background image
     */
    _getDownloadButton(post) {
        let innerSpan = document.createElement('span');
        innerSpan.style.backgroundImage = 'url(img/download-icon.png)';
        innerSpan.setAttribute('aria-label', 'Download image');

        let button = document.createElement('button');
        button.style.minWidth = '40px';
        button.style.minHeight = '40px';
        
        button.appendChild(innerSpan);

        button.addEventListener('click', () => this._downloadImg(post));
        return button
    }

    //#endregion
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
    async observe() {
        let targetNode = await this._getTargetNode();

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
    Returns promise that resolves with posts-container node.

    If there's no target node, waits 300 ms and tries again.
     */
    async _getTargetNode() {
        try {
            let targetNode;
            switch (this._getPathType()) {
                
                // narrow screen => main > section has 2 children
                // wide screen   => main > section has 3 children
                case "feed":
                    let mainSection = document.querySelector('main > section');
                    
                    if (mainSection.children.length == 2)
                        targetNode = mainSection.children[1].querySelector('div > div > div')
                    
                    else if (mainSection.children.length == 3)
                        targetNode = mainSection.querySelector('div > div > div')
                        //targetNode = document.querySelector("div.cGcGK > div > div");

                    break;
    
                case "profile":
                    targetNode = document.querySelectorAll("article.ySN3v")[1].querySelector("div > div");
                    break;
    
                case "profile post":
                    targetNode = document.querySelector('.PdwC2');
                    break;

                case "stories":
                    targetNode = document.querySelector(".yS4wN");
                    break;
            }

            if (!targetNode)
                throw Error('target node is null');

            return targetNode;
        } 
        catch { 
            let w = await wait();

            return this._getTargetNode();
        }
    }

    /* 
    Current path type.
    Returns "feed" or "stories" or "profile".
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

        else if (path.startsWith('p/'))
            return "profile post";

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

function wait() {
    return new Promise((resolve) => {
       setTimeout(() => resolve(), 300); 
    });
}

let picLoader = new InstaPicloader();