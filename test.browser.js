(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var doc = require('doc-js'),
    EventEmitter = require('events').EventEmitter,
    interact = require('interact-js'),
    pythagoreanEquation = require('math-js/geometry/pythagoreanEquation'),
    crel = require('crel'),
    venfix = require('venfix'),
    unitr = require('unitr'),
    schedule = require('schedule-frame'),
    laidout = require('laidout');

var LEFT = 'left',
    RIGHT = 'right',
    BOTTOM = 'bottom',
    TOP = 'top',
    CLOSED = 'closed',
    OPEN = 'open',
    CLOSE = 'close',
    HORIZONTAL = 'horizontal',
    VERTICAL = 'vertical',
    CLOSE = 'close',
    NE = 45,
    NW = -45,
    SE = 135,
    SW = -135,
    opposites = {};

opposites[LEFT] = RIGHT;
opposites[RIGHT] = LEFT;
opposites[TOP] = BOTTOM;
opposites[BOTTOM] = TOP;

var allFlaps = [];

function getSideForAngle(angle){
    return angle > SW ?
        angle > NW ?
            angle > NE ?
                angle > SE ? BOTTOM : RIGHT :
            TOP :
        LEFT :
    BOTTOM;
}

function getPlane(angle){
    return ((angle > NE && angle < SE) || (angle < NW && angle > SW)) ? HORIZONTAL : VERTICAL;
}

function getPlaneForSide(side){
    return (side === LEFT || side === RIGHT) ? HORIZONTAL : VERTICAL;
}

function getFlapBoxInfo(flap){
    var boundingRect = flap.getBoundingRect(),
        gutter = flap.gutter,
        box = {
            left: boundingRect.left,
            marginLeft: boundingRect.left,
            top: boundingRect.top,
            marginTop: boundingRect.top,
            right: boundingRect.right,
            marginRight: boundingRect.right,
            bottom: boundingRect.bottom,
            marginBottom: boundingRect.bottom,
            width: boundingRect.width,
            marginWidth: boundingRect.width,
            height: boundingRect.height,
            marginHeight: boundingRect.height
        };

    if(flap.side === LEFT){
        box.marginWidth += gutter;
        box.marginRight += gutter;
    }else if(flap.side === RIGHT){
        box.marginWidth += gutter;
        box.marginLeft -= gutter;
    }else if(flap.side === BOTTOM){
        box.marginHeight += gutter;
        box.marginTop -= gutter;
    }else if(flap.side === TOP){
        box.marginHeight += gutter;
        box.marginBottom += gutter;
    }

    return box;
}

function bound(min, max, value){
    return Math.min(Math.max(value, min), max);
}

function getDistanceFromInteraction(interaction, flapInfo){
    var horizontalBound = bound.bind(null, window.scrollX, window.innerWidth + window.scrollX),
        verticalBound = bound.bind(null, window.scrollY, window.innerHeight + window.scrollY);

    return pythagoreanEquation(
        interaction.pageX - horizontalBound(flapInfo.box.marginLeft + flapInfo.box.marginWidth) - horizontalBound(flapInfo.box.marginWidth) / 2,
        interaction.pageY - verticalBound(flapInfo.box.marginTop + flapInfo.box.marginHeight) - verticalBound(flapInfo.box.marginHeight) / 2
    );
}

function getWorthyness(interaction, flapInfo1, flapInfo2){
    var interactionProximity = getDistanceFromInteraction(interaction, flapInfo2) - getDistanceFromInteraction(interaction, flapInfo1);

    return interactionProximity;
}

function getCandidatesForInteraction(interaction,flaps){
    return flaps.reduce(function(results, flap) {
        var box = getFlapBoxInfo(flap),
            angle = interaction.getCurrentAngle(true);

        if(
            flap.isValidInteraction(interaction) &&
            !flap.beingDragged &&
            getPlaneForSide(flap.side) === getPlane(angle) &&
            interaction.pageX - window.scrollX > box.marginLeft &&
            interaction.pageX - window.scrollX < box.marginRight &&
            interaction.pageY - window.scrollY > box.marginTop &&
            interaction.pageY - window.scrollY < box.marginBottom
        ){
            results.push({
                box: box,
                flap: flap
            });
        }


        return results;

    }, []);
}

function moveableCandidates(interaction, candidate){
    var angle = interaction.getCurrentAngle(true),
        flap = candidate.flap,
        side = flap.side,
        distance = flap.distance,
        maxPosition = flap.renderedWidth(),
        minPosition = 0;

    if(distance > minPosition && distance < maxPosition){
        return true;
    }

    var canMoveDirection = distance === minPosition ? opposites[side] : side;

    return canMoveDirection === getSideForAngle(angle);
}

function setLastInList(array, item){
    var index = array.indexOf(item);

    if(index>=0){
        array.splice(index, 1);
        array.push(item);
    }
}

function setFirstInList(array, item){
    var index = array.indexOf(item);

    if(index>=0){
        array.splice(index, 1);
        array.unshift(item);
    }
}

function forEachOpenFlap(fn){
    var i = allFlaps.length;
    while (i) {
        i--;
        var flap = allFlaps[i];
        if(flap.state === OPEN){
            fn(flap);
        }else{
            break;
        }
    }
}

function delegateInteraction(interaction){
    if(interaction._flap){
        interaction._flap._drag(interaction);
    }

    if(interaction._delegated){
        return;
    }

    var candidates = getCandidatesForInteraction(interaction, allFlaps),
        moveable = candidates.filter(moveableCandidates.bind(null, interaction));

    if(moveable.length){
        candidates = moveable;
    }

    var flapCandidate = candidates
        .sort(getWorthyness.bind(null, interaction))
        .pop();

    if(!flapCandidate){
        return;
    }

    interaction._delegated = true;

    interaction.preventDefault();

    interaction._flap = flapCandidate.flap;
    flapCandidate.flap._start(interaction);

    forEachOpenFlap(function(flap){
        if(
            flap !== flapCandidate.flap &&
            !doc(flapCandidate.flap.element).closest(flap.element) &&
            flap.isValidInteraction(interaction)
        ){
            flap.close();
        }
    });
}

function endInteraction(interaction){
    if(interaction._flap){
        interaction._flap._end(interaction);
        interaction._flap = null;
    }else{
        forEachOpenFlap(function(flap){
            flap._activate(interaction);
        });
    }
}

function bindEvents(){
    interact.on('drag', document, delegateInteraction);
    interact.on('end', document, endInteraction);
    interact.on('cancel', document, endInteraction);
}

if(typeof window !== 'undefined'){
    bindEvents();
}

function Flap(element){
    this.render(element);
    this.init();
    allFlaps.push(this);
}
Flap.prototype = Object.create(EventEmitter.prototype);

Flap.prototype.constructor = Flap;
Flap.prototype.distance = 0;
Flap.prototype.state = CLOSED;
Flap.prototype.width = 280;
Flap.prototype.side = LEFT;
Flap.prototype.gutter = 50;

Flap.prototype.destroy = function(){
    var index = allFlaps.indexOf(this);

    if(index >= 0){
        allFlaps.splice(index, 1);
    }
};
Flap.prototype.render = function(element){
    this.element = element || crel('div',
        crel('div')
    );
    this.element.style.opacity = '0';

    this.content = this.element.childNodes[0];
    this.element.flap = this;
};
Flap.prototype.init = function(){
    var flap = this;
    laidout(this.element, function(){
        if(flap.enabled !== false){
            flap.enable();
        }else{
            flap.disable();
        }
        flap.update();
        flap.element.style.opacity = null;
        flap._ready = true;
        flap.emit('ready');
    });
};
Flap.prototype.enable = function(){
    this.enabled = true;

    this.element.style.position = 'fixed';
    this.element.style.top = unitr(0);
    this.element.style.bottom = unitr(0);
    this.element.style.left = unitr(0);
    this.element.style.right = unitr(0);
    this.close();

    this.content.style[venfix('boxSizing')] = 'border-box';
    this.content.style.position = 'absolute';
    this.content.style['overflow-x'] = 'hidden';
    this.content.style['overflow-y'] = 'auto';

    if(getPlaneForSide(this.side) === HORIZONTAL){
        this.content.style.top = unitr(0);
        this.content.style.bottom = unitr(0);
        this.content.style.width = unitr(this.width);
    }else{
        this.content.style.left = unitr(0);
        this.content.style.right = unitr(0);
        this.content.style.height = unitr(this.width);
    }

    if(this.side === LEFT){
        this.content.style.left = unitr(0);
    }else if(this.side === RIGHT){
        this.content.style.left = unitr(100, '%');
    }else if(this.side === BOTTOM){
        this.content.style.top = unitr(100, '%');
    }else if(this.side === TOP){
        this.content.style.top = unitr(0);
    }
    this.hide();
    this.update();
};
Flap.prototype.disable = function(){
    this.enabled = false;
    this.distance = 0;

    this.element.style.position = null;
    this.element.style.top = null;
    this.element.style.bottom = null;
    this.element.style.width = null;
    this.element.style[venfix('pointerEvents')] = null;

    this.content.style[venfix('boxSizing')] = null;
    this.content.style[venfix('transform')] = null;
    this.content.style.width = null;
    this.content.style.position = null;
    this.content.style.top = null;
    this.content.style.bottom = null;
    this.content.style.width = null;
    this.content.style['overflow-x'] = null;
    this.content.style['overflow-y'] = null;

    this.element.style.left = null;
    this.content.style.left = null;
    this.element.style.right = null;
    this.content.style.left = null;

    cancelAnimationFrame(this.settleFrame);

    this.show();
    this.update();
};
Flap.prototype._start = function(interaction){
    if(!this.enabled){
        return;
    }

    this._interaction = interaction;
    this._startPosition = { pageX: interaction.pageX, pageY: interaction.pageY };
};
Flap.prototype._drag = function(interaction){
    if(!this.enabled){
        this._startPosition = null;
        return;
    }

    interaction.preventDefault();

    var flap = this;
    interaction.preventDefault();

    flap.beingDragged = true;
    flap.startDistance = flap.startDistance || flap.distance;
    if(flap.side === LEFT){
        flap.distance = flap.startDistance + interaction.pageX - flap._startPosition.pageX;
    }else if(flap.side === RIGHT){
        flap.distance = flap.startDistance - interaction.pageX + flap._startPosition.pageX;
    }else if(flap.side === BOTTOM){
        flap.distance = flap.startDistance - interaction.pageY + flap._startPosition.pageY;
    }else if(flap.side === TOP){
        flap.distance = flap.startDistance + interaction.pageY - flap._startPosition.pageY;
    }
    flap.distance = Math.max(Math.min(flap.distance, flap.renderedWidth()), 0);
    flap.update();
    flap.speed = flap.distance - flap.oldDistance;
    flap.oldDistance = flap.distance;

};
Flap.prototype._end = function(){
    if(!this.enabled){
        return;
    }

    this._interaction = null;

    this.startDistance = null;
    this.beingDragged = false;

    var direction = CLOSE;

    if(Math.abs(this.speed) >= 3){
        direction = this.speed < 0 ? CLOSE : OPEN;
    }else if(this.distance < this.renderedWidth() / 2){
        direction = CLOSE;
    }else{
        direction = OPEN;
    }

    this.settle(direction);
};
Flap.prototype._activate = function(event){
    if(!this.enabled || !this.isValidInteraction(event)){
        return;
    }

    if(
        !this.beingDragged &&
        !doc(event.target).closest(this.content)
    ){
        event.preventDefault();
        this.beingDragged = false;
        this.settle(CLOSE);
    }
};
Flap.prototype._setOpen = function(){
    var flap = this;

    if(this.state === OPEN){
        return;
    }

    this.show();
    this.state = OPEN;
    setLastInList(allFlaps, this);
    this.emit(OPEN);

    // This prevents the flap from screwing up
    // events on elements that may be under the swipe zone
    clearTimeout(this._pointerEventTimeout);
    this._pointerEventTimeout = setTimeout(function(){
        flap.element.style[venfix('pointerEvents')] = 'all';
    },100);
};
Flap.prototype.hide = function(){
    if(this.element.style.visibility !== 'hidden'){
        this.element.style.visibility = 'hidden';
    }
};
Flap.prototype.show = function(){
    if(this.element.style.visibility !== ''){
        this.element.style.visibility = '';
    }
};
Flap.prototype._setClosed = function(){
    clearTimeout(this._pointerEventTimeout);
    this.element.style[venfix('pointerEvents')] = 'none';
    this.hide();
    this.state = CLOSED;
    this.emit(CLOSE);
    setFirstInList(allFlaps, this);
};
Flap.prototype.update = function(){
    var flap = this,
        lastDisplayPosition = this.displayPosition;

    if(this.side === LEFT || this.side === TOP){
        this.displayPosition = this.distance - this.renderedWidth();
    }else{
        this.displayPosition = -this.distance;
    }

    if(this.displayPosition !== lastDisplayPosition){
        flap.emit('move');

        schedule(function(){
            if(flap.distance > 0){
                flap._setOpen();
            }
            flap.updateStyle(flap.displayPosition);
        }, this);
    }
};
Flap.prototype.updateStyle = function(displayPosition){
    if(this.enabled){
        if(getPlaneForSide(this.side) === HORIZONTAL){
            this.content.style[venfix('transform')] = 'translate3d(' + unitr(displayPosition) + ',0,0)';
        }else{
            this.content.style[venfix('transform')] = 'translate3d(0,' + unitr(displayPosition) + ',0)';
        }
    }
};
Flap.prototype.settle = function(direction){
    var flap = this;

    cancelAnimationFrame(this.settleFrame);

    if(this.beingDragged){
        return;
    }

    flap.distance += direction === CLOSE ? -1 : 1;

    if(this.distance <= 0){
        this.distance = 0;
        this._setClosed();
        this.update();
        this.emit('settle');
        return;
    }else if(this.distance >= this.renderedWidth()){
        this.distance = this.renderedWidth();
        this.update();
        this.emit('settle');
        return;
    }

    this.settleFrame = requestAnimationFrame(function(){
        var step = flap.tween(direction);
        flap.distance += direction === CLOSE ? -step : step;
        flap.update();
        flap.settle(direction);
    });
};
Flap.prototype.tween = function(direction){
    return direction === OPEN ?
        (this.renderedWidth() - this.distance) / 3 + 1:
        this.distance / 3 + 1;
};
Flap.prototype.percentOpen = function(){
    return parseFloat(100 / this.renderedWidth() * this.distance) || 0;
};
Flap.prototype.open = function(){
    if(!this.enabled || this._interaction){
        return;
    }
    this.settle(OPEN);
};
Flap.prototype.close = function(){
    if(!this.enabled || this._interaction){
        return;
    }
    this.settle(CLOSE);
};

Flap.prototype.renderedWidth = function(){
    var now = Date.now();

    if(!this._ready || !this._widthFrame || now - this._lastWidthTime > 16){
        this._lastWidthTime = now;
        if(getPlaneForSide(this.side) === HORIZONTAL){
            return this._widthFrame = this.content.clientWidth;
        }else{
            return this._widthFrame = this.content.clientHeight;
        }
    }

    return this._widthFrame;
};
Flap.prototype.getBoundingRect = function() {
    var targetElement = this.distance ? this.element : this.content;

    return targetElement.getBoundingClientRect();
};
Flap.prototype.isValidInteraction = function(interaction) {
    return true;
};

module.exports = Flap;

},{"crel":2,"doc-js":4,"events":8,"interact-js":9,"laidout":10,"math-js/geometry/pythagoreanEquation":11,"schedule-frame":12,"unitr":13,"venfix":14}],2:[function(require,module,exports){
//Copyright (C) 2012 Kory Nunn

//Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

//The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

/*

    This code is not formatted for readability, but rather run-speed and to assist compilers.

    However, the code's intention should be transparent.

    *** IE SUPPORT ***

    If you require this library to work in IE7, add the following after declaring crel.

    var testDiv = document.createElement('div'),
        testLabel = document.createElement('label');

    testDiv.setAttribute('class', 'a');
    testDiv['className'] !== 'a' ? crel.attrMap['class'] = 'className':undefined;
    testDiv.setAttribute('name','a');
    testDiv['name'] !== 'a' ? crel.attrMap['name'] = function(element, value){
        element.id = value;
    }:undefined;


    testLabel.setAttribute('for', 'a');
    testLabel['htmlFor'] !== 'a' ? crel.attrMap['for'] = 'htmlFor':undefined;



*/

(function (root, factory) {
    if (typeof exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root.crel = factory();
    }
}(this, function () {
    var fn = 'function',
        obj = 'object',
        nodeType = 'nodeType',
        textContent = 'textContent',
        setAttribute = 'setAttribute',
        attrMapString = 'attrMap',
        isNodeString = 'isNode',
        isElementString = 'isElement',
        d = typeof document === obj ? document : {},
        isType = function(a, type){
            return typeof a === type;
        },
        isNode = typeof Node === fn ? function (object) {
            return object instanceof Node;
        } :
        // in IE <= 8 Node is an object, obviously..
        function(object){
            return object &&
                isType(object, obj) &&
                (nodeType in object) &&
                isType(object.ownerDocument,obj);
        },
        isElement = function (object) {
            return crel[isNodeString](object) && object[nodeType] === 1;
        },
        isArray = function(a){
            return a instanceof Array;
        },
        appendChild = function(element, child) {
          if(!crel[isNodeString](child)){
              child = d.createTextNode(child);
          }
          element.appendChild(child);
        };


    function crel(){
        var args = arguments, //Note: assigned to a variable to assist compilers. Saves about 40 bytes in closure compiler. Has negligable effect on performance.
            element = args[0],
            child,
            settings = args[1],
            childIndex = 2,
            argumentsLength = args.length,
            attributeMap = crel[attrMapString];

        element = crel[isElementString](element) ? element : d.createElement(element);
        // shortcut
        if(argumentsLength === 1){
            return element;
        }

        if(!isType(settings,obj) || crel[isNodeString](settings) || isArray(settings)) {
            --childIndex;
            settings = null;
        }

        // shortcut if there is only one child that is a string
        if((argumentsLength - childIndex) === 1 && isType(args[childIndex], 'string') && element[textContent] !== undefined){
            element[textContent] = args[childIndex];
        }else{
            for(; childIndex < argumentsLength; ++childIndex){
                child = args[childIndex];

                if(child == null){
                    continue;
                }

                if (isArray(child)) {
                  for (var i=0; i < child.length; ++i) {
                    appendChild(element, child[i]);
                  }
                } else {
                  appendChild(element, child);
                }
            }
        }

        for(var key in settings){
            if(!attributeMap[key]){
                element[setAttribute](key, settings[key]);
            }else{
                var attr = attributeMap[key];
                if(typeof attr === fn){
                    attr(element, settings[key]);
                }else{
                    element[setAttribute](attr, settings[key]);
                }
            }
        }

        return element;
    }

    // Used for mapping one kind of attribute to the supported version of that in bad browsers.
    crel[attrMapString] = {};

    crel[isElementString] = isElement;

    crel[isNodeString] = isNode;

    return crel;
}));

},{}],3:[function(require,module,exports){
var doc = {
    document: typeof document !== 'undefined' ? document : null,
    setDocument: function(d){
        this.document = d;
    }
};

var arrayProto = [],
    isList = require('./isList');
    getTargets = require('./getTargets')(doc.document),
    getTarget = require('./getTarget')(doc.document),
    space = ' ';


///[README.md]

function isIn(array, item){
    for(var i = 0; i < array.length; i++) {
        if(item === array[i]){
            return true;
        }
    }
}

/**

    ## .find

    finds elements that match the query within the scope of target

        //fluent
        doc(target).find(query);

        //legacy
        doc.find(target, query);
*/

function find(target, query){
    target = getTargets(target);
    if(query == null){
        return target;
    }

    if(isList(target)){
        var results = [];
        for (var i = 0; i < target.length; i++) {
            var subResults = doc.find(target[i], query);
            for(var j = 0; j < subResults.length; j++) {
                if(!isIn(results, subResults[j])){
                    results.push(subResults[j]);
                }
            }
        }
        return results;
    }

    return target ? target.querySelectorAll(query) : [];
};

/**

    ## .findOne

    finds the first element that matches the query within the scope of target

        //fluent
        doc(target).findOne(query);

        //legacy
        doc.findOne(target, query);
*/

function findOne(target, query){
    target = getTarget(target);
    if(query == null){
        return target;
    }

    if(isList(target)){
        var result;
        for (var i = 0; i < target.length; i++) {
            result = findOne(target[i], query);
            if(result){
                break;
            }
        }
        return result;
    }

    return target ? target.querySelector(query) : null;
};

/**

    ## .closest

    recurses up the DOM from the target node, checking if the current element matches the query

        //fluent
        doc(target).closest(query);

        //legacy
        doc.closest(target, query);
*/

function closest(target, query){
    target = getTarget(target);

    if(isList(target)){
        target = target[0];
    }

    while(
        target &&
        target.ownerDocument &&
        !is(target, query)
    ){
        target = target.parentNode;
    }

    return target === doc.document && target !== query ? null : target;
};

/**

    ## .is

    returns true if the target element matches the query

        //fluent
        doc(target).is(query);

        //legacy
        doc.is(target, query);
*/

function is(target, query){
    target = getTarget(target);

    if(isList(target)){
        target = target[0];
    }

    if(!target.ownerDocument || typeof query !== 'string'){
        return target === query;
    }
    return target === query || arrayProto.indexOf.call(find(target.parentNode, query), target) >= 0;
};

/**

    ## .addClass

    adds classes to the target

        //fluent
        doc(target).addClass(query);

        //legacy
        doc.addClass(target, query);
*/

function addClass(target, classes){
    target = getTargets(target);

    if(isList(target)){
        for (var i = 0; i < target.length; i++) {
            addClass(target[i], classes);
        }
        return this;
    }
    if(!classes){
        return this;
    }

    var classes = classes.split(space),
        currentClasses = target.classList ? null : target.className.split(space);

    for(var i = 0; i < classes.length; i++){
        var classToAdd = classes[i];
        if(!classToAdd || classToAdd === space){
            continue;
        }
        if(target.classList){
            target.classList.add(classToAdd);
        } else if(!currentClasses.indexOf(classToAdd)>=0){
            currentClasses.push(classToAdd);
        }
    }
    if(!target.classList){
        target.className = currentClasses.join(space);
    }
    return this;
};

/**

    ## .removeClass

    removes classes from the target

        //fluent
        doc(target).removeClass(query);

        //legacy
        doc.removeClass(target, query);
*/

function removeClass(target, classes){
    target = getTargets(target);

    if(isList(target)){
        for (var i = 0; i < target.length; i++) {
            removeClass(target[i], classes);
        }
        return this;
    }

    if(!classes){
        return this;
    }

    var classes = classes.split(space),
        currentClasses = target.classList ? null : target.className.split(space);

    for(var i = 0; i < classes.length; i++){
        var classToRemove = classes[i];
        if(!classToRemove || classToRemove === space){
            continue;
        }
        if(target.classList){
            target.classList.remove(classToRemove);
            continue;
        }
        var removeIndex = currentClasses.indexOf(classToRemove);
        if(removeIndex >= 0){
            currentClasses.splice(removeIndex, 1);
        }
    }
    if(!target.classList){
        target.className = currentClasses.join(space);
    }
    return this;
};

function addEvent(settings){
    var target = getTarget(settings.target);
    if(target){
        target.addEventListener(settings.event, settings.callback, false);
    }else{
        console.warn('No elements matched the selector, so no events were bound.');
    }
}

/**

    ## .on

    binds a callback to a target when a DOM event is raised.

        //fluent
        doc(target/proxy).on(events, target[optional], callback);

    note: if a target is passed to the .on function, doc's target will be used as the proxy.

        //legacy
        doc.on(events, target, query, proxy[optional]);
*/

function on(events, target, callback, proxy){

    proxy = getTargets(proxy);

    if(!proxy){
        target = getTargets(target);
        // handles multiple targets
        if(isList(target)){
            var multiRemoveCallbacks = [];
            for (var i = 0; i < target.length; i++) {
                multiRemoveCallbacks.push(on(events, target[i], callback, proxy));
            }
            return function(){
                while(multiRemoveCallbacks.length){
                    multiRemoveCallbacks.pop();
                }
            };
        }
    }

    // handles multiple proxies
    // Already handles multiple proxies and targets,
    // because the target loop calls this loop.
    if(isList(proxy)){
        var multiRemoveCallbacks = [];
        for (var i = 0; i < proxy.length; i++) {
            multiRemoveCallbacks.push(on(events, target, callback, proxy[i]));
        }
        return function(){
            while(multiRemoveCallbacks.length){
                multiRemoveCallbacks.pop();
            }
        };
    }

    var removeCallbacks = [];

    if(typeof events === 'string'){
        events = events.split(space);
    }

    for(var i = 0; i < events.length; i++){
        var eventSettings = {};
        if(proxy){
            if(proxy === true){
                proxy = doc.document;
            }
            eventSettings.target = proxy;
            eventSettings.callback = function(event){
                var closestTarget = closest(event.target, target);
                if(closestTarget){
                    callback(event, closestTarget);
                }
            };
        }else{
            eventSettings.target = target;
            eventSettings.callback = callback;
        }

        eventSettings.event = events[i];

        addEvent(eventSettings);

        removeCallbacks.push(eventSettings);
    }

    return function(){
        while(removeCallbacks.length){
            var removeCallback = removeCallbacks.pop();
            getTarget(removeCallback.target).removeEventListener(removeCallback.event, removeCallback.callback);
        }
    }
};

/**

    ## .off

    removes events assigned to a target.

        //fluent
        doc(target/proxy).off(events, target[optional], callback);

    note: if a target is passed to the .on function, doc's target will be used as the proxy.

        //legacy
        doc.off(events, target, callback, proxy);
*/

function off(events, target, callback, proxy){
    if(isList(target)){
        for (var i = 0; i < target.length; i++) {
            off(events, target[i], callback, proxy);
        }
        return this;
    }
    if(proxy instanceof Array){
        for (var i = 0; i < proxy.length; i++) {
            off(events, target, callback, proxy[i]);
        }
        return this;
    }

    if(typeof events === 'string'){
        events = events.split(space);
    }

    if(typeof callback !== 'function'){
        proxy = callback;
        callback = null;
    }

    proxy = proxy ? getTarget(proxy) : doc.document;

    var targets = typeof target === 'string' ? find(target, proxy) : [target];

    for(var targetIndex = 0; targetIndex < targets.length; targetIndex++){
        var currentTarget = targets[targetIndex];

        for(var i = 0; i < events.length; i++){
            currentTarget.removeEventListener(events[i], callback);
        }
    }
    return this;
};

/**

    ## .append

    adds elements to a target

        //fluent
        doc(target).append(children);

        //legacy
        doc.append(target, children);
*/

function append(target, children){
    var target = getTarget(target),
        children = getTarget(children);

    if(isList(target)){
        target = target[0];
    }

    if(isList(children)){
        for (var i = 0; i < children.length; i++) {
            append(target, children[i]);
        }
        return;
    }

    target.appendChild(children);
};

/**

    ## .prepend

    adds elements to the front of a target

        //fluent
        doc(target).prepend(children);

        //legacy
        doc.prepend(target, children);
*/

function prepend(target, children){
    var target = getTarget(target),
        children = getTarget(children);

    if(isList(target)){
        target = target[0];
    }

    if(isList(children)){
        //reversed because otherwise the would get put in in the wrong order.
        for (var i = children.length -1; i; i--) {
            prepend(target, children[i]);
        }
        return;
    }

    target.insertBefore(children, target.firstChild);
};

/**

    ## .isVisible

    checks if an element or any of its parents display properties are set to 'none'

        //fluent
        doc(target).isVisible();

        //legacy
        doc.isVisible(target);
*/

function isVisible(target){
    var target = getTarget(target);
    if(!target){
        return;
    }
    if(isList(target)){
        var i = -1;

        while (target[i++] && isVisible(target[i])) {}
        return target.length >= i;
    }
    while(target.parentNode && target.style.display !== 'none'){
        target = target.parentNode;
    }

    return target === doc.document;
};



/**

    ## .ready

    call a callback when the document is ready.

        //fluent
        doc().ready(callback);

        //legacy
        doc.ready(callback);
*/

function ready(target, callback){
    if(typeof target === 'function' && !callback){
        callback = target;
    }
    if(doc.document.body){
        callback();
    }else{
        doc.on('load', window, function(){
            callback();
        });
    }
};

doc.find = find;
doc.findOne = findOne;
doc.closest = closest;
doc.is = is;
doc.addClass = addClass;
doc.removeClass = removeClass;
doc.off = off;
doc.on = on;
doc.append = append;
doc.prepend = prepend;
doc.isVisible = isVisible;
doc.ready = ready;

module.exports = doc;
},{"./getTarget":5,"./getTargets":6,"./isList":7}],4:[function(require,module,exports){
var doc = require('./doc'),
    isList = require('./isList'),
    getTargets = require('./getTargets')(doc.document),
    flocProto = [];

function Floc(items){
    this.push.apply(this, items);
}
Floc.prototype = flocProto;
flocProto.constructor = Floc;

function floc(target){
    var instance = getTargets(target);

    if(!isList(instance)){
        if(instance){
            instance = [instance];
        }else{
            instance = [];
        }
    }
    return new Floc(instance);
}

var returnsSelf = 'addClass removeClass append prepend'.split(' ');

for(var key in doc){
    if(typeof doc[key] === 'function'){
        floc[key] = doc[key];
        flocProto[key] = (function(key){
            var instance = this;
            // This is also extremely dodgy and fast
            return function(a,b,c,d,e,f){
                var result = doc[key](this, a,b,c,d,e,f);

                if(result !== doc && isList(result)){
                    return floc(result);
                }
                if(returnsSelf.indexOf(key) >=0){
                    return instance;
                }
                return result;
            };
        }(key));
    }
}
flocProto.on = function(events, target, callback){
    var proxy = this;
    if(typeof target === 'function'){
        callback = target;
        target = this;
        proxy = null;
    }
    doc.on(events, target, callback, proxy);
    return this;
};

flocProto.off = function(events, target, callback){
    var reference = this;
    if(typeof target === 'function'){
        callback = target;
        target = this;
        reference = null;
    }
    doc.off(events, target, callback, reference);
    return this;
};

flocProto.addClass = function(className){
    doc.addClass(this, className);
    return this;
};

flocProto.removeClass = function(className){
    doc.removeClass(this, className);
    return this;
};

module.exports = floc;
},{"./doc":3,"./getTargets":6,"./isList":7}],5:[function(require,module,exports){
var singleId = /^#\w+$/;

module.exports = function(document){
    return function getTarget(target){
        if(typeof target === 'string'){
            if(singleId.exec(target)){
                return document.getElementById(target.slice(1));
            }
            return document.querySelector(target);
        }

        return target;
    };
};
},{}],6:[function(require,module,exports){

var singleClass = /^\.\w+$/,
    singleId = /^#\w+$/,
    singleTag = /^\w+$/;

module.exports = function(document){
    return function getTargets(target){
        if(typeof target === 'string'){
            if(singleId.exec(target)){
                // If you have more than 1 of the same id in your page,
                // thats your own stupid fault.
                return [document.getElementById(target.slice(1))];
            }
            if(singleTag.exec(target)){
                return document.getElementsByTagName(target);
            }
            if(singleClass.exec(target)){
                return document.getElementsByClassName(target.slice(1));
            }
            return document.querySelectorAll(target);
        }

        return target;
    };
};
},{}],7:[function(require,module,exports){
module.exports = function isList(object){
    return object !== window && (
        object instanceof Array ||
        (typeof HTMLCollection !== 'undefined' && object instanceof HTMLCollection) ||
        (typeof NodeList !== 'undefined' && object instanceof NodeList) ||
        Array.isArray(object)
    );
}

},{}],8:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],9:[function(require,module,exports){
var interactions = [],
    minMoveDistance = 5,
    interact,
    maximumMovesToPersist = 1000, // Should be plenty..
    propertiesToCopy = 'target,pageX,pageY,clientX,clientY,offsetX,offsetY,screenX,screenY,shiftKey,x,y'.split(','), // Stuff that will be on every interaction.
    d = typeof document !== 'undefined' ? document : null;

function Interact(){
    this._elements = [];
}
Interact.prototype.on = function(eventName, target, callback){
    if(!target){
        return;
    }
    target._interactEvents = target._interactEvents || {};
    target._interactEvents[eventName] = target._interactEvents[eventName] || []
    target._interactEvents[eventName].push({
        callback: callback,
        interact: this
    });

    return this;
};
Interact.prototype.emit = function(eventName, target, event, interaction){
    if(!target){
        return;
    }

    var interact = this,
        currentTarget = target;

    interaction.originalEvent = event;
    interaction.preventDefault = function(){
        event.preventDefault();
    }
    interaction.stopPropagation = function(){
        event.stopPropagation();
    }

    while(currentTarget){
        currentTarget._interactEvents &&
        currentTarget._interactEvents[eventName] &&
        currentTarget._interactEvents[eventName].forEach(function(listenerInfo){
            if(listenerInfo.interact === interact){
                listenerInfo.callback.call(interaction, interaction);
            }
        });
        currentTarget = currentTarget.parentNode;
    }

    return this;
};
Interact.prototype.off =
Interact.prototype.removeListener = function(eventName, target, callback){
    if(!target || !target._interactEvents || !target._interactEvents[eventName]){
        return;
    }
    var interactListeners = target._interactEvents[eventName],
        listenerInfo;
    for(var i = 0; i < interactListeners.length; i++) {
        listenerInfo = interactListeners[i];
        if(listenerInfo.interact === interact && listenerInfo.callback === callback){
            interactListeners.splice(i,1);
            i--;
        }
    }

    return this;
};
interact = new Interact();

    // For some reason touch browsers never change the event target during a touch.
    // This is, lets face it, fucking stupid.
function getActualTarget() {
    var scrollX = window.scrollX,
        scrollY = window.scrollY;

    // IE is stupid and doesn't support scrollX/Y
    if(scrollX === undefined){
        scrollX = d.body.scrollLeft;
        scrollY = d.body.scrollTop;
    }

    return d.elementFromPoint(this.pageX - window.scrollX, this.pageY - window.scrollY);
}

function getMoveDistance(x1,y1,x2,y2){
    var adj = Math.abs(x1 - x2),
        opp = Math.abs(y1 - y2);

    return Math.sqrt(Math.pow(adj,2) + Math.pow(opp,2));
}

function destroyInteraction(interaction){
    for(var i = 0; i < interactions.length; i++){
        if(interactions[i].identifier === interaction.identifier){
            interactions.splice(i,1);
        }
    }
}

function getInteraction(identifier){
    for(var i = 0; i < interactions.length; i++){
        if(interactions[i].identifier === identifier){
            return interactions[i];
        }
    }
}

function setInheritedData(interaction, data){
    for(var i = 0; i < propertiesToCopy.length; i++) {
        interaction[propertiesToCopy[i]] = data[propertiesToCopy[i]]
    }
}

function getAngle(deltaPoint){
    return Math.atan2(deltaPoint.x, -deltaPoint.y) * 180 / Math.PI;
}

function Interaction(event, interactionInfo){
    // If there is no event (eg: desktop) just make the identifier undefined
    if(!event){
        event = {};
    }
    // If there is no extra info about the interaction (eg: desktop) just use the event itself
    if(!interactionInfo){
        interactionInfo = event;
    }

    // If there is another interaction with the same ID, something went wrong.
    // KILL IT WITH FIRE!
    var oldInteraction = getInteraction(interactionInfo.identifier);
    oldInteraction && oldInteraction.destroy();

    this.identifier = interactionInfo.identifier;

    this.moves = [];

    interactions.push(this);
}

Interaction.prototype = {
    constructor: Interaction,
    getActualTarget: getActualTarget,
    destroy: function(){
        interact.on('destroy', this.target, this, this);
        destroyInteraction(this);
    },
    start: function(event, interactionInfo){
        // If there is no extra info about the interaction (eg: desktop) just use the event itself
        if(!interactionInfo){
            interactionInfo = event;
        }

        var lastStart = {
                time: new Date(),
                phase: 'start'
            };
        setInheritedData(lastStart, interactionInfo);
        this.lastStart = lastStart;

        setInheritedData(this, interactionInfo);

        this.phase = 'start';
        interact.emit('start', event.target, event, this);
        return this;
    },
    move: function(event, interactionInfo){
        // If there is no extra info about the interaction (eg: desktop) just use the event itself
        if(!interactionInfo){
            interactionInfo = event;
        }

        var currentTouch = {
                time: new Date(),
                phase: 'move'
            };

        setInheritedData(currentTouch, interactionInfo);

        // Update the interaction
        setInheritedData(this, interactionInfo);

        this.moves.push(currentTouch);

        // Memory saver, culls any moves that are over the maximum to keep.
        this.moves = this.moves.slice(-maximumMovesToPersist);

        var moveDelta = this.getMoveDelta(),
            angle = 0;
        if(moveDelta){
            angle = getAngle(moveDelta);
        }

        this.angle = currentTouch.angle = angle;

        this.phase = 'move';
        interact.emit('move', event.target, event, this);
        return this;
    },
    drag: function(event, interactionInfo){
        // If there is no extra info about the interaction (eg: desktop) just use the event itself
        if(!interactionInfo){
            interactionInfo = event;
        }

        var currentTouch = {
                time: new Date(),
                phase: 'drag'
            };

        setInheritedData(currentTouch, interactionInfo);

        // Update the interaction
        setInheritedData(this, interactionInfo);

        if(!this.moves){
            this.moves = [];
        }

        this.moves.push(currentTouch);

        // Memory saver, culls any moves that are over the maximum to keep.
        this.moves = this.moves.slice(-maximumMovesToPersist);

        if(!this.dragStarted && getMoveDistance(this.lastStart.pageX, this.lastStart.pageY, currentTouch.pageX, currentTouch.pageY) > minMoveDistance){
            this.dragStarted = true;
        }

        var moveDelta = this.getMoveDelta(),
            angle = 0;
        if(moveDelta){
            angle = getAngle(moveDelta);
        }

        this.angle = currentTouch.angle = angle;

        if(this.dragStarted){
            this.phase = 'drag';
            interact.emit('drag', event.target, event, this);
        }
        return this;
    },
    end: function(event, interactionInfo){
        if(!interactionInfo){
            interactionInfo = event;
        }

        // Update the interaction
        setInheritedData(this, interactionInfo);

        if(!this.moves){
            this.moves = [];
        }

        // Update the interaction
        setInheritedData(this, interactionInfo);

        this.phase = 'end';
        interact.emit('end', event.target, event, this);

        return this;
    },
    cancel: function(event, interactionInfo){
        if(!interactionInfo){
            interactionInfo = event;
        }

        // Update the interaction
        setInheritedData(this, interactionInfo);

        this.phase = 'cancel';
        interact.emit('cancel', event.target, event, this);

        return this;
    },
    getMoveDistance: function(){
        if(this.moves.length > 1){
            var current = this.moves[this.moves.length-1],
                previous = this.moves[this.moves.length-2];

            return getMoveDistance(current.pageX, current.pageY, previous.pageX, previous.pageY);
        }
    },
    getMoveDelta: function(){
        var current = this.moves[this.moves.length-1],
            previous = this.moves[this.moves.length-2] || this.lastStart;

        if(!current || !previous){
            return;
        }

        return {
            x: current.pageX - previous.pageX,
            y: current.pageY - previous.pageY
        };
    },
    getSpeed: function(){
        if(this.moves.length > 1){
            var current = this.moves[this.moves.length-1],
                previous = this.moves[this.moves.length-2];

            return this.getMoveDistance() / (current.time - previous.time);
        }
        return 0;
    },
    getCurrentAngle: function(blend){
        var phase = this.phase,
            currentPosition,
            lastAngle,
            i = this.moves.length-1,
            angle,
            firstAngle,
            angles = [],
            blendSteps = 20/(this.getSpeed()*2+1),
            stepsUsed = 1;

        if(this.moves && this.moves.length){

            currentPosition = this.moves[i];
            angle = firstAngle = currentPosition.angle;

            if(blend && this.moves.length > 1){
                while(
                    --i > 0 &&
                    this.moves.length - i < blendSteps &&
                    this.moves[i].phase === phase
                ){
                    lastAngle = this.moves[i].angle;
                    if(Math.abs(lastAngle - firstAngle) > 180){
                        angle -= lastAngle;
                    }else{
                        angle += lastAngle;
                    }
                    stepsUsed++;
                }
                angle = angle/stepsUsed;
            }
        }
        if(angle === Infinity){
            return firstAngle;
        }
        return angle;
    },
    getAllInteractions: function(){
        return interactions.slice();
    }
};

function start(event){
    var touch;

    for(var i = 0; i < event.changedTouches.length; i++){
        touch = event.changedTouches[i];
        new Interaction(event, event.changedTouches[i]).start(event, touch);
    }
}
function drag(event){
    var touch;

    for(var i = 0; i < event.changedTouches.length; i++){
        touch = event.changedTouches[i];
        getInteraction(touch.identifier).drag(event, touch);
    }
}
function end(event){
    var touch;

    for(var i = 0; i < event.changedTouches.length; i++){
        touch = event.changedTouches[i];
        getInteraction(touch.identifier).end(event, touch).destroy();
    }
}
function cancel(event){
    var touch;

    for(var i = 0; i < event.changedTouches.length; i++){
        touch = event.changedTouches[i];
        getInteraction(touch.identifier).cancel(event, touch).destroy();
    }
}

addEvent(d, 'touchstart', start);
addEvent(d, 'touchmove', drag);
addEvent(d, 'touchend', end);
addEvent(d, 'touchcancel', cancel);

var mouseIsDown = false;
addEvent(d, 'mousedown', function(event){
    mouseIsDown = true;

    if(!interactions.length){
        new Interaction(event);
    }

    var interaction = getInteraction();

    if(!interaction){
        return;
    }

    getInteraction().start(event);
});
addEvent(d, 'mousemove', function(event){
    if(!interactions.length){
        new Interaction(event);
    }

    var interaction = getInteraction();

    if(!interaction){
        return;
    }

    if(mouseIsDown){
        interaction.drag(event);
    }else{
        interaction.move(event);
    }
});
addEvent(d, 'mouseup', function(event){
    mouseIsDown = false;

    var interaction = getInteraction();

    if(!interaction){
        return;
    }

    interaction.end(event, null);
    interaction.destroy();
});

function addEvent(element, type, callback) {
    if(element == null){
        return;
    }

    if(element.addEventListener){
        element.addEventListener(type, callback, { passive: false });
    }
    else if(d.attachEvent){
        element.attachEvent("on"+ type, callback, { passive: false });
    }
}

module.exports = interact;
},{}],10:[function(require,module,exports){
function checkElement(element){
    if(!element){
        return false;
    }
    var parentNode = element.parentNode;
    while(parentNode){
        if(parentNode === element.ownerDocument){
            return true;
        }
        parentNode = parentNode.parentNode;
    }
    return false;
}

module.exports = function laidout(element, callback){
    if(checkElement(element)){
        return callback();
    }

    var recheckElement = function(){
            if(checkElement(element)){
                document.removeEventListener('DOMNodeInserted', recheckElement);
                callback();
            }
        };

    document.addEventListener('DOMNodeInserted', recheckElement);
};
},{}],11:[function(require,module,exports){
module.exports = function(sideA, sideB){
    return Math.sqrt(Math.pow(sideA, 2) + Math.pow(sideB, 2));
}
},{}],12:[function(require,module,exports){
var todo = [],
    todoKeys = [];

function run(){
    var startTime = Date.now();

    while(todo.length){
        todoKeys.shift();
        todo.shift()();
    }
}

function schedule(fn, key){
    if(arguments.length < 2){
        key = fn;
    }

    if(typeof fn !== 'function'){
        throw 'schedule must be passed a function as the first parameter';
    }

    var keyIndex = todoKeys.indexOf(key)

    if(~keyIndex){ 
        // Replace task for key
        todo.splice(keyIndex, 1, fn);
        return;
    }

    if(todo.length === 0){
        requestAnimationFrame(run);
    }

    todo.push(fn);
    todoKeys.push(key);
}

module.exports = schedule;
},{}],13:[function(require,module,exports){
var parseRegex = /^(-?(?:\d+|\d+\.\d+|\.\d+))([^\.]*?)$/;

function parse(input){
    var valueParts = parseRegex.exec(input);

    if(!valueParts){
        return;
    }

    return {
        value: parseFloat(valueParts[1]),
        unit: valueParts[2]
    };
}

function addUnit(input, unit){
    var parsedInput = parse(input),
        parsedUnit = parse(unit);

    if(!parsedInput && parsedUnit){
        unit = input;
        parsedInput = parsedUnit;
    }

    if(!isNaN(unit)){
        unit = null;
    }

    if(!parsedInput){
        return input;
    }

    if(parsedInput.unit == null || parsedInput.unit == ''){
        parsedInput.unit = unit || 'px';
    }

    return parsedInput.value + parsedInput.unit;
};

module.exports = addUnit;
module.exports.parse = parse;
},{}],14:[function(require,module,exports){
var cache = {},
    bodyStyle = {};

if(typeof window !== 'undefined'){
    if(window.document.body){
        getBodyStyleProperties();
    }else{
        window.addEventListener('load', getBodyStyleProperties);
    }
}

function getBodyStyleProperties(){
    var shortcuts = {},
        items = document.defaultView.getComputedStyle(document.body);

    for(var i = 0; i < items.length; i++){
        bodyStyle[items[i]] = null;

        // This is kinda dodgy but it works.
        baseName = items[i].match(/^(\w+)-.*$/);
        if(baseName){
            if(shortcuts[baseName[1]]){
                bodyStyle[baseName[1]] = null;
            }else{
                shortcuts[baseName[1]] = true;
            }
        }
    }
}

function venfix(property, target){
    if(!target && cache[property]){
        return cache[property];
    }

    target = target || bodyStyle;

    var props = [];

    for(var key in target){
        cache[key] = key;
        props.push(key);
    }

    if(property in target){
        return property;
    }

    var propertyRegex = new RegExp('^-(' + venfix.prefixes.join('|') + ')-' + property + '$', 'i');

    for(var i = 0; i < props.length; i++) {
        if(props[i].match(propertyRegex)){
            if(target === bodyStyle){
                cache[property] = props[i]
            }
            return props[i];
        }
    }
}

// Add extensibility
venfix.prefixes = ['webkit', 'moz', 'ms', 'o'];

module.exports = venfix;
},{}],15:[function(require,module,exports){
var Flap = require('./flaps'),
    doc = require('doc-js'),
    crel = require('crel'),
    venfix = require('venfix');

var leftFlap = new Flap(crel('div', {'class':'wat'},
        crel('div',
            crel('h1', 'Hey look! A menu!'),
            crel('button', {'class':'closeFlap'}, 'Close'),
            crel('p',
                'UPDATE! The below is no longer the case, look at the right side flap.',
                crel('br'), crel('br'),
                'This flap has some special stuff going on to cause the background darkening when it is open. ',
                'You would think the background\'s opacity is just being tweened, but no, ',
                'this is apparently quite demanding on a mobile device. ',
                'Instead there is a second ".mask" element that is 400% as wide as the page, ',
                'with a gradient from rgba(0,0,0,0.5) to rgba(0,0,0,0) who\'s offset left is ',
                'tweened with that of the flap, which performs MUCH better than an opacity tween. ',
                'Check out the flap on the right, which does use background color opacity, and performs much worse on a mobile.'
            )
        ),
        crel('div', {'class':'mask'})
    )),
    rightFlap = new Flap(),
    topFlap = new Flap(),
    bottomFlap = new Flap();

leftFlap.mask = leftFlap.element.lastChild;

rightFlap.side = 'right';

crel(rightFlap.content,
    crel('h1', 'And a right-side one'),
    crel('p',
        'UPDATE! The below is no longer the case, this flap is now faster.',
        crel('br'), crel('br'),
        'This flap isn\'t as well set up as the left one, and instead uses only tweening of ',
        'it\'s background rgba() color to achieve the darkened effect.',
        'You will noticed it is a bit choppy on mobile devies. '
    )
);

bottomFlap.side = 'bottom';
bottomFlap.gutter = window.innerHeight;
doc(window).on('resize', function(){
    bottomFlap.gutter = window.innerHeight;
});

crel(bottomFlap.content,
    crel('h1', 'A bottom one'),
    crel('p',
        'Woah fancy!'
    )
);

topFlap.side = 'top';
topFlap.gutter = window.innerHeight;
doc(window).on('resize', function(){
    topFlap.gutter = window.innerHeight;
});

crel(topFlap.content,
    crel('h1', 'A full-height top one'),
    crel('p',
        'stuff'
    )
);

leftFlap.on('move', function(){
    this.mask.style[venfix('transform')] = 'translate3d(' + -(100 - this.percentOpen()) + '%,0,0)';
});
leftFlap.on('close', function(){
    if(this.mask.parentNode === this.element){
        this.element.removeChild(this.mask);
    }
});
leftFlap.on('open', function(){
    this.element.appendChild(this.mask);
});

function fadeBackground(){
    this.element.style.background = 'rgba(0,0,0,' + this.percentOpen() / 200 + ')';
}

rightFlap.on('move', fadeBackground);
topFlap.on('move', fadeBackground);
bottomFlap.on('move', function(){
    // Let's go nuts..
    var openness = this.percentOpen() / 100;
    this.element.style.background = 'rgba(0,0,0,' + openness / 10 + ')';
    this.content.style['box-shadow'] = '0px 0px ' + (50 * openness) + 'px rgba(0,0,0,' + openness / 3 + ')';

    var main = doc('.main')[0];
    main.style[venfix('transform')] = 'translate3d(0,' + (-100 * openness) + 'px,' + (-150 * openness) + 'px) rotate3d(1,0,0,'+ (45 * openness) +'deg)';
    main.style['text-shadow'] = '0px ' + (100 * openness) + 'px 3px rgba(0,0,0,' + openness / 3 + ')';
    main.style[venfix('maskImage')] = 'linear-gradient(to top, black, rgba(0,0,0,' + (1-openness) + ')';
    console.log('move');
});
bottomFlap.on('settle', function(){
    console.log('settle');
});

window.onload = function(){
    leftFlap.element.classList.add('flap');
    rightFlap.element.classList.add('flap');
    bottomFlap.element.classList.add('flap');
    topFlap.element.classList.add('flap');
    document.body.appendChild(leftFlap.element);
    document.body.appendChild(rightFlap.element);
    document.body.appendChild(bottomFlap.element);
    document.body.appendChild(topFlap.element);

    doc('.openFlap').on('click', function(event){
        if(doc(event.target).is('.left')){
            leftFlap.open();
        }else{
            rightFlap.open();
        }
    });
    doc('.closeFlap').on('click', function(event){
        doc(event.target).closest('.flap').flap.close();
    });
};
},{"./flaps":1,"crel":2,"doc-js":4,"venfix":14}]},{},[15]);
